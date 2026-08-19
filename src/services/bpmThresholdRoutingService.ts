import { 
  ThresholdRule, 
  ThresholdOperator, 
  SecondaryCondition, 
  RoutingDecision, 
  RoutingEvaluationResult,
  BpmApprovalWorkflow,
  BpmApprovalInstance 
} from '../types/bpm';
import { db } from '../firebase';
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where 
} from 'firebase/firestore';
import { FirestoreService } from './firestoreService';

export class BpmThresholdRoutingService {
  /**
   * Safely compares an actual value with a target value using standard threshold operators.
   * Completely sandboxed with zero arbitrary code execution.
   */
  static evaluateOperator(actual: any, operator: ThresholdOperator, target: any): boolean {
    if (actual === undefined || actual === null) {
      if (operator === '!=') return target !== undefined && target !== null;
      return false;
    }

    // Numerical normalization
    const actualNum = typeof actual === 'number' ? actual : parseFloat(String(actual));
    const targetNum = typeof target === 'number' ? target : parseFloat(String(target));
    const isNumericComparison = !isNaN(actualNum) && !isNaN(targetNum);

    switch (operator) {
      case '=':
        if (isNumericComparison) return actualNum === targetNum;
        return String(actual).trim().toLowerCase() === String(target).trim().toLowerCase();

      case '!=':
        if (isNumericComparison) return actualNum !== targetNum;
        return String(actual).trim().toLowerCase() !== String(target).trim().toLowerCase();

      case '>':
        if (!isNumericComparison) return false;
        return actualNum > targetNum;

      case '>=':
        if (!isNumericComparison) return false;
        return actualNum >= targetNum;

      case '<':
        if (!isNumericComparison) return false;
        return actualNum < targetNum;

      case '<=':
        if (!isNumericComparison) return false;
        return actualNum <= targetNum;

      case 'IN': {
        const list = Array.isArray(target) 
          ? target 
          : String(target).split(',').map(s => s.trim().toLowerCase());
        const actualStr = String(actual).trim().toLowerCase();
        return list.some(item => String(item).trim().toLowerCase() === actualStr);
      }

      case 'NOT_IN': {
        const list = Array.isArray(target) 
          ? target 
          : String(target).split(',').map(s => s.trim().toLowerCase());
        const actualStr = String(actual).trim().toLowerCase();
        return !list.some(item => String(item).trim().toLowerCase() === actualStr);
      }

      default:
        return false;
    }
  }

  /**
   * Evaluates a single ThresholdRule against a transaction context and reference time.
   */
  static evaluateRule(
    rule: ThresholdRule, 
    context: Record<string, any>, 
    referenceTime: Date = new Date()
  ): { matches: boolean; matchedConditions: RoutingDecision['matchedConditions']; reason?: string } {
    if (!rule.active) {
      return { matches: false, matchedConditions: [], reason: 'Rule is inactive' };
    }

    // Temporal validity check
    const refMs = referenceTime.getTime();
    const startMs = new Date(rule.effectiveFrom).getTime();
    if (refMs < startMs) {
      return { matches: false, matchedConditions: [], reason: 'Rule effective date is in the future' };
    }
    if (rule.effectiveTo) {
      const endMs = new Date(rule.effectiveTo).getTime();
      if (refMs > endMs) {
        return { matches: false, matchedConditions: [], reason: 'Rule effective date has expired' };
      }
    }

    const matchedConditions: RoutingDecision['matchedConditions'] = [];

    // 1. Primary threshold condition
    const actualPrimaryVal = context[rule.field];
    const primaryMatch = this.evaluateOperator(actualPrimaryVal, rule.operator, rule.thresholdValue);
    
    if (!primaryMatch) {
      return { matches: false, matchedConditions: [], reason: `Primary threshold condition (${rule.field} ${rule.operator} ${rule.thresholdValue}) not satisfied.` };
    }

    matchedConditions.push({
      field: rule.field,
      operator: rule.operator,
      thresholdValue: rule.thresholdValue,
      actualValue: actualPrimaryVal
    });

    // 2. Secondary conditions (AND logic)
    if (rule.secondaryConditions && rule.secondaryConditions.length > 0) {
      for (const cond of rule.secondaryConditions) {
        const actualVal = context[cond.field];
        const match = this.evaluateOperator(actualVal, cond.operator, cond.value);
        if (!match) {
          return { matches: false, matchedConditions: [], reason: `Secondary condition (${cond.field} ${cond.operator} ${cond.value}) not satisfied.` };
        }
        matchedConditions.push({
          field: cond.field,
          operator: cond.operator,
          thresholdValue: cond.value,
          actualValue: actualVal
        });
      }
    }

    return { matches: true, matchedConditions };
  }

  /**
   * Authoritatively resolves the appropriate workflow for a transaction using configured Threshold Rules.
   */
  static async resolveWorkflowForTransaction(
    companyId: string,
    module: string,
    transactionType: string,
    transactionData: Record<string, any>,
    fallbackDefaultWorkflowId?: string,
    evaluatorId: string = 'SYSTEM',
    referenceTime: Date = new Date()
  ): Promise<RoutingEvaluationResult> {
    const evaluationLogs: string[] = [];
    const nowIso = referenceTime.toISOString();

    evaluationLogs.push(`[ThresholdRouter] Evaluating transaction: module=${module}, type=${transactionType}, company=${companyId}`);

    try {
      // 1. Fetch active threshold rules for this company and module
      const rules = await this.getThresholdRules(companyId, module);
      
      // Filter by transactionType (or ALL)
      const applicableRules = rules.filter(r => 
        r.active && (r.transactionType === 'ALL' || r.transactionType === transactionType)
      );

      evaluationLogs.push(`[ThresholdRouter] Found ${applicableRules.length} applicable active threshold rules.`);

      // 2. Evaluate all applicable rules
      const matchedRules: { rule: ThresholdRule; conditions: RoutingDecision['matchedConditions'] }[] = [];

      for (const rule of applicableRules) {
        const evalResult = this.evaluateRule(rule, transactionData, referenceTime);
        if (evalResult.matches) {
          evaluationLogs.push(`[ThresholdRouter] Rule MATCHED: "${rule.ruleName}" (Priority: ${rule.priority}) -> Workflow: ${rule.workflowId}`);
          matchedRules.push({ rule, conditions: evalResult.matchedConditions });
        } else {
          evaluationLogs.push(`[ThresholdRouter] Rule skipped: "${rule.ruleName}" - ${evalResult.reason}`);
        }
      }

      // 3. Deterministic Priority Resolution
      if (matchedRules.length > 0) {
        // Sort descending by priority (highest number first)
        matchedRules.sort((a, b) => b.rule.priority - a.rule.priority);

        const topMatch = matchedRules[0];
        
        // Conflict Check: Check if two top rules have identical priority but specify different workflows
        const topPriority = topMatch.rule.priority;
        const conflictingMatches = matchedRules.filter(
          m => m.rule.priority === topPriority && m.rule.workflowId !== topMatch.rule.workflowId
        );

        if (conflictingMatches.length > 0) {
          const conflictDetails = `Conflict detected: Rule "${topMatch.rule.ruleName}" (wf: ${topMatch.rule.workflowId}) and Rule "${conflictingMatches[0].rule.ruleName}" (wf: ${conflictingMatches[0].rule.workflowId}) share identical priority (${topPriority}).`;
          evaluationLogs.push(`[ThresholdRouter] ⚠️ ${conflictDetails}`);

          // Audit the conflict
          await FirestoreService.logAuditEvent(
            companyId,
            evaluatorId,
            'Threshold Routing Engine',
            'threshold.routing_conflict',
            conflictDetails,
            topMatch.rule.id
          );

          // Controlled resolution: select higher policy version or first created to remain deterministic
          topMatch.rule.workflowVersion = topMatch.rule.workflowVersion || 1;
        }

        const decision: RoutingDecision = {
          ruleId: topMatch.rule.ruleId,
          ruleName: topMatch.rule.ruleName,
          policyVersion: topMatch.rule.policyVersion || 1,
          selectedWorkflowId: topMatch.rule.workflowId,
          selectedWorkflowVersion: topMatch.rule.workflowVersion || 1,
          matchedConditions: topMatch.conditions,
          evaluatedAt: nowIso,
          evaluatedBy: evaluatorId,
          routingReason: `Matched threshold rule "${topMatch.rule.ruleName}" with priority ${topMatch.rule.priority}.`,
          isFallbackDefault: false
        };

        // Audit evaluation
        await FirestoreService.logAuditEvent(
          companyId,
          evaluatorId,
          'Threshold Routing Engine',
          'threshold.routing_evaluated',
          `Routed ${transactionType} (${module}) to workflow ${decision.selectedWorkflowId} via rule ${decision.ruleId}`,
          decision.selectedWorkflowId
        );

        return {
          success: true,
          selectedWorkflowId: topMatch.rule.workflowId,
          selectedWorkflowVersion: topMatch.rule.workflowVersion || 1,
          matchedRule: topMatch.rule,
          routingDecision: decision,
          conflictDetected: conflictingMatches.length > 0,
          conflictDetails: conflictingMatches.length > 0 ? `Conflicting rules share priority ${topPriority}` : undefined,
          evaluationLogs
        };
      }

      // 4. Fallback to default workflow if no threshold rule matched
      evaluationLogs.push(`[ThresholdRouter] No threshold rule matched. Falling back to default workflow.`);
      
      const defaultWfId = fallbackDefaultWorkflowId || `wf_${module.toLowerCase()}_default`;
      const fallbackDecision: RoutingDecision = {
        ruleId: 'DEFAULT_FALLBACK',
        ruleName: 'Default Fallback Route',
        policyVersion: 1,
        selectedWorkflowId: defaultWfId,
        selectedWorkflowVersion: 1,
        matchedConditions: [],
        evaluatedAt: nowIso,
        evaluatedBy: evaluatorId,
        routingReason: 'No specific threshold rule matched; standard default workflow selected.',
        isFallbackDefault: true
      };

      return {
        success: true,
        selectedWorkflowId: defaultWfId,
        selectedWorkflowVersion: 1,
        routingDecision: fallbackDecision,
        evaluationLogs
      };

    } catch (err: any) {
      evaluationLogs.push(`[ThresholdRouter] Error during evaluation: ${err?.message}`);
      
      const errorDecision: RoutingDecision = {
        ruleId: 'ERROR_FALLBACK',
        policyVersion: 1,
        selectedWorkflowId: fallbackDefaultWorkflowId || `wf_${module.toLowerCase()}_default`,
        selectedWorkflowVersion: 1,
        matchedConditions: [],
        evaluatedAt: nowIso,
        evaluatedBy: evaluatorId,
        routingReason: `Evaluation fallback due to error: ${err?.message}`,
        isFallbackDefault: true
      };

      return {
        success: false,
        selectedWorkflowId: fallbackDefaultWorkflowId || `wf_${module.toLowerCase()}_default`,
        selectedWorkflowVersion: 1,
        routingDecision: errorDecision,
        evaluationLogs
      };
    }
  }

  /**
   * Pure in-memory simulation tool for the Administrator Rule Simulator UI.
   * Completely non-destructive — does not modify databases or live workflows.
   */
  static simulateRouting(
    module: string,
    transactionType: string,
    samplePayload: Record<string, any>,
    rules: ThresholdRule[],
    workflows: BpmApprovalWorkflow[],
    referenceTime: Date = new Date()
  ): {
    matched: boolean;
    matchedRule?: ThresholdRule;
    selectedWorkflow?: BpmApprovalWorkflow;
    decision: RoutingDecision;
    trace: string[];
  } {
    const trace: string[] = [];
    trace.push(`Starting simulation for Module: ${module}, Type: ${transactionType}`);
    trace.push(`Payload received: ${JSON.stringify(samplePayload)}`);

    const applicable = rules.filter(r => 
      r.active && (r.module === module || r.module === 'ALL') && (r.transactionType === 'ALL' || r.transactionType === transactionType)
    );

    trace.push(`Found ${applicable.length} active matching rules in memory.`);

    const matchedList: { rule: ThresholdRule; conditions: RoutingDecision['matchedConditions'] }[] = [];

    for (const r of applicable) {
      const res = this.evaluateRule(r, samplePayload, referenceTime);
      if (res.matches) {
        trace.push(`✓ MATCH: Rule "${r.ruleName}" (Priority: ${r.priority}) [${r.field} ${r.operator} ${r.thresholdValue}]`);
        matchedList.push({ rule: r, conditions: res.matchedConditions });
      } else {
        trace.push(`✗ SKIP: Rule "${r.ruleName}" -> ${res.reason}`);
      }
    }

    if (matchedList.length > 0) {
      matchedList.sort((a, b) => b.rule.priority - a.rule.priority);
      const top = matchedList[0];
      const targetWf = workflows.find(w => w.workflowId === top.rule.workflowId || w.id === top.rule.workflowId);

      trace.push(`Selected Highest Priority Rule: "${top.rule.ruleName}" (Priority ${top.rule.priority})`);
      trace.push(`Mapped to Workflow: "${targetWf?.workflowName || top.rule.workflowId}" with ${targetWf?.steps?.length || 0} approval tiers.`);

      const decision: RoutingDecision = {
        ruleId: top.rule.ruleId,
        ruleName: top.rule.ruleName,
        policyVersion: top.rule.policyVersion || 1,
        selectedWorkflowId: top.rule.workflowId,
        selectedWorkflowVersion: top.rule.workflowVersion || 1,
        matchedConditions: top.conditions,
        evaluatedAt: referenceTime.toISOString(),
        evaluatedBy: 'SIMULATOR',
        routingReason: `Simulation matched rule "${top.rule.ruleName}" (Priority ${top.rule.priority})`,
        isFallbackDefault: false
      };

      return {
        matched: true,
        matchedRule: top.rule,
        selectedWorkflow: targetWf,
        decision,
        trace
      };
    }

    trace.push('No threshold rule matched. Standard default route applies.');
    const defaultWf = workflows.find(w => w.module === module && w.active) || workflows[0];

    const fallbackDecision: RoutingDecision = {
      ruleId: 'DEFAULT_FALLBACK',
      ruleName: 'Default Route',
      policyVersion: 1,
      selectedWorkflowId: defaultWf?.workflowId || 'wf_default',
      selectedWorkflowVersion: 1,
      matchedConditions: [],
      evaluatedAt: referenceTime.toISOString(),
      evaluatedBy: 'SIMULATOR',
      routingReason: 'Simulation fallback: No threshold matched.',
      isFallbackDefault: true
    };

    return {
      matched: false,
      selectedWorkflow: defaultWf,
      decision: fallbackDecision,
      trace
    };
  }

  /**
   * Detects if an existing instance's routing is invalidated by transaction data changes (e.g. amount change).
   */
  static async detectRoutingMismatch(
    instance: BpmApprovalInstance,
    updatedTransactionData: Record<string, any>
  ): Promise<{ requiresRerouting: boolean; newWorkflowId?: string; reason?: string }> {
    if (instance.status !== 'PENDING_APPROVAL') {
      return { requiresRerouting: false, reason: 'Instance is already in terminal state' };
    }

    const evaluation = await this.resolveWorkflowForTransaction(
      instance.companyId,
      instance.sourceModule,
      instance.transactionType,
      updatedTransactionData,
      undefined,
      'MUTATION_CHECK'
    );

    if (evaluation.selectedWorkflowId !== instance.workflowId) {
      return {
        requiresRerouting: true,
        newWorkflowId: evaluation.selectedWorkflowId,
        reason: `Transaction values mutated: Route changes from ${instance.workflowId} to ${evaluation.selectedWorkflowId}`
      };
    }

    return { requiresRerouting: false };
  }

  // =========================================================================
  // RULE MANAGEMENT CRUD & AUDIT
  // =========================================================================

  /**
   * Saves or updates a ThresholdRule with full audit logging.
   */
  static async saveThresholdRule(
    companyId: string,
    rule: Omit<ThresholdRule, 'id' | 'companyId' | 'updatedAt' | 'ruleId' | 'createdAt'> & { id?: string; ruleId?: string; createdAt?: string; companyId?: string; updatedAt?: string },
    actorId: string,
    actorName: string
  ): Promise<ThresholdRule> {
    const now = new Date().toISOString();
    const ruleId = rule.ruleId || `rule_${Date.now()}`;
    const docId = `THR_${companyId}_${ruleId}`;

    const completeRule: ThresholdRule = {
      ...rule,
      id: docId,
      ruleId,
      companyId,
      ruleName: rule.ruleName.trim(),
      module: rule.module,
      transactionType: rule.transactionType || 'ALL',
      workflowId: rule.workflowId,
      workflowVersion: rule.workflowVersion || 1,
      field: rule.field.trim(),
      operator: rule.operator,
      thresholdValue: rule.thresholdValue,
      secondaryConditions: rule.secondaryConditions || [],
      priority: Number(rule.priority) || 0,
      active: rule.active ?? true,
      effectiveFrom: rule.effectiveFrom || now,
      effectiveTo: rule.effectiveTo || undefined,
      policyVersion: (rule.policyVersion || 0) + 1,
      createdAt: rule.createdAt || now,
      updatedAt: now,
      createdBy: rule.createdBy || actorId,
      updatedBy: actorId
    };

    const ruleRef = doc(db, 'companies', companyId, 'bpm_threshold_rules', docId);
    await setDoc(ruleRef, completeRule);

    await FirestoreService.logAuditEvent(
      companyId,
      actorId,
      actorName,
      rule.createdAt ? 'threshold.rule_updated' : 'threshold.rule_created',
      `Threshold rule "${completeRule.ruleName}" (${completeRule.field} ${completeRule.operator} ${completeRule.thresholdValue}) saved for ${completeRule.module}`,
      docId
    );

    return completeRule;
  }

  /**
   * Fetches all threshold rules for a company, optionally filtered by module.
   */
  static async getThresholdRules(companyId: string, module?: string): Promise<ThresholdRule[]> {
    try {
      const colRef = collection(db, 'companies', companyId, 'bpm_threshold_rules');
      const snap = await getDocs(colRef);

      const rules: ThresholdRule[] = [];
      snap.forEach(d => {
        const data = d.data() as ThresholdRule;
        if (!module || module === 'ALL' || data.module === 'ALL' || data.module === module) {
          rules.push(data);
        }
      });

      return rules.sort((a, b) => b.priority - a.priority);
    } catch (err) {
      console.warn('[BpmThresholdRoutingService] getThresholdRules error:', err);
      return [];
    }
  }

  /**
   * Deletes a threshold rule with audit logging.
   */
  static async deleteThresholdRule(
    companyId: string,
    ruleDocId: string,
    actorId: string,
    actorName: string
  ): Promise<void> {
    const ruleRef = doc(db, 'companies', companyId, 'bpm_threshold_rules', ruleDocId);
    await deleteDoc(ruleRef);

    await FirestoreService.logAuditEvent(
      companyId,
      actorId,
      actorName,
      'threshold.rule_deleted',
      `Deleted threshold rule ${ruleDocId}`,
      ruleDocId
    );
  }

  /**
   * Toggles active status of a rule with audit logging.
   */
  static async toggleRuleStatus(
    companyId: string,
    ruleDocId: string,
    active: boolean,
    actorId: string,
    actorName: string
  ): Promise<void> {
    const now = new Date().toISOString();
    const ruleRef = doc(db, 'companies', companyId, 'bpm_threshold_rules', ruleDocId);
    await updateDoc(ruleRef, { active, updatedAt: now, updatedBy: actorId });

    await FirestoreService.logAuditEvent(
      companyId,
      actorId,
      actorName,
      active ? 'threshold.rule_activated' : 'threshold.rule_deactivated',
      `Toggled threshold rule ${ruleDocId} active state to ${active}`,
      ruleDocId
    );
  }
}
