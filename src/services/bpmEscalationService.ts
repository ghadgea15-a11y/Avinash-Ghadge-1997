import { db } from '../firebase';
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  setDoc, 
  updateDoc, 
  runTransaction, 
  onSnapshot 
} from 'firebase/firestore';
import { 
  EscalationPolicy, 
  EscalationLevelConfig, 
  BpmApprovalInstance, 
  BpmEscalationEvent, 
  BpmEscalationEventType, 
  EscalationTargetType,
  BpmApprovalWorkflow
} from '../types/bpm';
import { UserSession, AppNotification } from '../types';
import { FirestoreService } from './firestoreService';
import { RbacService } from './rbacService';
import { BpmDelegationService } from './bpmDelegationService';

export interface EscalationProcessResult {
  instanceId: string;
  evaluated: boolean;
  actionsTaken: {
    reminderSent: boolean;
    dueTriggered: boolean;
    escalatedLevel?: number;
    reassigned: boolean;
    finalEscalation: boolean;
  };
  details: string[];
}

export class BpmEscalationService {

  // =========================================================================
  // 1. POLICY MANAGEMENT
  // =========================================================================

  /**
   * Creates a new Escalation Policy for a company with version 1.
   */
  static async createPolicy(
    session: UserSession,
    policyInput: Omit<EscalationPolicy, 'id' | 'policyId' | 'companyId' | 'version' | 'createdAt' | 'updatedAt'>
  ): Promise<EscalationPolicy> {
    if (!RbacService.canManageEscalationPolicy(session)) {
      throw new Error('Unauthorized: Insufficient permissions to create escalation policy.');
    }

    const companyId = session.companyId;
    const policyId = `ESC-POL-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();

    // Validate levels
    const validatedLevels = this.validateAndSortLevels(policyInput.levels || []);

    const newPolicy: EscalationPolicy = {
      ...policyInput,
      id: policyId,
      policyId,
      companyId,
      version: 1,
      levels: validatedLevels,
      maximumEscalations: policyInput.maximumEscalations || validatedLevels.length,
      reassignmentAllowed: policyInput.reassignmentAllowed ?? false,
      active: policyInput.active ?? true,
      effectiveFrom: policyInput.effectiveFrom || now,
      createdAt: now,
      updatedAt: now,
      createdBy: session.userId,
      updatedBy: session.userId
    };

    // Save policy
    const policyDocRef = doc(db, 'companies', companyId, 'bpm_escalation_policies', policyId);
    await setDoc(policyDocRef, newPolicy);

    // Save version record to support historical immutability
    const versionDocRef = doc(db, 'companies', companyId, 'bpm_escalation_policies', `${policyId}_v1`);
    await setDoc(versionDocRef, newPolicy);

    // Audit Log
    await FirestoreService.logAuditEvent(
      companyId,
      session.userId,
      session.fullName,
      'ESCALATION_POLICY_CREATED',
      `Created BPM Escalation Policy '${newPolicy.policyName}' (ID: ${policyId}, Module: ${newPolicy.module}, V1).`,
      policyId
    );

    return newPolicy;
  }

  /**
   * Updates an existing Escalation Policy.
   * If structural escalation durations or levels change, increments policy version to preserve historical integrity.
   */
  static async updatePolicy(
    session: UserSession,
    policyId: string,
    updates: Partial<EscalationPolicy>
  ): Promise<EscalationPolicy> {
    if (!RbacService.canManageEscalationPolicy(session)) {
      throw new Error('Unauthorized: Insufficient permissions to modify escalation policy.');
    }

    const companyId = session.companyId;
    const policyDocRef = doc(db, 'companies', companyId, 'bpm_escalation_policies', policyId);
    const existingSnap = await getDoc(policyDocRef);

    if (!existingSnap.exists()) {
      throw new Error(`Escalation policy ${policyId} not found.`);
    }

    const existingPolicy = existingSnap.data() as EscalationPolicy;
    const now = new Date().toISOString();

    // Check if version increment is required (e.g. durations, levels, or reassignment altered)
    const isStructuralChange = 
      (updates.levels !== undefined && JSON.stringify(updates.levels) !== JSON.stringify(existingPolicy.levels)) ||
      (updates.reminderAfterMinutes !== undefined && updates.reminderAfterMinutes !== existingPolicy.reminderAfterMinutes) ||
      (updates.dueAfterMinutes !== undefined && updates.dueAfterMinutes !== existingPolicy.dueAfterMinutes) ||
      (updates.reassignmentAllowed !== undefined && updates.reassignmentAllowed !== existingPolicy.reassignmentAllowed);

    const newVersion = isStructuralChange ? existingPolicy.version + 1 : existingPolicy.version;

    const validatedLevels = updates.levels ? this.validateAndSortLevels(updates.levels) : existingPolicy.levels;

    const updatedPolicy: EscalationPolicy = {
      ...existingPolicy,
      ...updates,
      id: policyId,
      policyId,
      companyId,
      version: newVersion,
      levels: validatedLevels,
      updatedAt: now,
      updatedBy: session.userId
    };

    // Save current active policy document
    await setDoc(policyDocRef, updatedPolicy, { merge: true });

    // If version bumped, save immutable snapshot of this version
    if (isStructuralChange) {
      const versionDocRef = doc(db, 'companies', companyId, 'bpm_escalation_policies', `${policyId}_v${newVersion}`);
      await setDoc(versionDocRef, updatedPolicy);
    }

    // Audit Log
    await FirestoreService.logAuditEvent(
      companyId,
      session.userId,
      session.fullName,
      'ESCALATION_POLICY_UPDATED',
      `Updated BPM Escalation Policy '${updatedPolicy.policyName}' (ID: ${policyId}, Version: ${newVersion}).`,
      policyId
    );

    return updatedPolicy;
  }

  /**
   * Retrieves all escalation policies for a company.
   */
  static async getPolicies(companyId: string): Promise<EscalationPolicy[]> {
    try {
      const colRef = collection(db, 'companies', companyId, 'bpm_escalation_policies');
      const snap = await getDocs(colRef);
      // Filter out raw version archive documents if any
      return snap.docs
        .map(d => d.data() as EscalationPolicy)
        .filter(p => !p.id.includes('_v'));
    } catch (err) {
      console.error('[BpmEscalationService] getPolicies error:', err);
      return [];
    }
  }

  /**
   * Retrieves an escalation policy by ID.
   */
  static async getPolicyById(companyId: string, policyId: string): Promise<EscalationPolicy | null> {
    try {
      const docRef = doc(db, 'companies', companyId, 'bpm_escalation_policies', policyId);
      const snap = await getDoc(docRef);
      if (!snap.exists()) return null;
      return snap.data() as EscalationPolicy;
    } catch (err) {
      console.error(`[BpmEscalationService] getPolicyById error (${policyId}):`, err);
      return null;
    }
  }

  /**
   * Finds the best active policy for a transaction type and module.
   * Priority: Exact (workflowId + stepId) > Exact (module + transactionType) > Module > Global ('ALL').
   */
  static async getActivePolicy(
    companyId: string,
    module: string,
    transactionType?: string,
    workflowId?: string,
    stepId?: string
  ): Promise<EscalationPolicy | null> {
    try {
      const allPolicies = await this.getPolicies(companyId);
      const activePolicies = allPolicies.filter(p => p.active);

      if (activePolicies.length === 0) return null;

      // 1. Check exact workflow + step match
      if (workflowId && stepId) {
        const exactStepMatch = activePolicies.find(p => p.workflowId === workflowId && p.stepId === stepId);
        if (exactStepMatch) return exactStepMatch;
      }

      // 2. Check exact workflow match
      if (workflowId) {
        const wfMatch = activePolicies.find(p => p.workflowId === workflowId && (!p.stepId || p.stepId === '*'));
        if (wfMatch) return wfMatch;
      }

      // 3. Check module + transactionType match
      if (transactionType) {
        const transMatch = activePolicies.find(p => p.module === module && p.transactionType === transactionType);
        if (transMatch) return transMatch;
      }

      // 4. Check module match
      const moduleMatch = activePolicies.find(p => p.module === module && (!p.transactionType || p.transactionType === 'ALL'));
      if (moduleMatch) return moduleMatch;

      // 5. Check global policy
      const globalMatch = activePolicies.find(p => p.module === 'ALL');
      return globalMatch || null;
    } catch (err) {
      console.error('[BpmEscalationService] getActivePolicy error:', err);
      return null;
    }
  }

  // =========================================================================
  // 2. SERVER-AUTHORITATIVE TIMER & ESCALATION EVALUATION ENGINE
  // =========================================================================

  /**
   * Evaluates timers and escalations for a single BpmApprovalInstance atomically and idempotently.
   * @param authoritativeTime Optional server time override for testing or backfill
   */
  static async processInstanceTimers(
    companyId: string,
    instanceId: string,
    authoritativeTime?: Date
  ): Promise<EscalationProcessResult> {
    const now = authoritativeTime || new Date();
    const nowIso = now.toISOString();

    const result: EscalationProcessResult = {
      instanceId,
      evaluated: false,
      actionsTaken: {
        reminderSent: false,
        dueTriggered: false,
        reassigned: false,
        finalEscalation: false
      },
      details: []
    };

    const instanceRef = doc(db, 'companies', companyId, 'bpm_instances', instanceId);

    // Process in atomic Firestore transaction
    await runTransaction(db, async (transaction) => {
      const snap = await transaction.get(instanceRef);
      if (!snap.exists()) {
        result.details.push('Instance does not exist');
        return;
      }

      const instance = snap.data() as BpmApprovalInstance;

      // Rule: COMPLETION RACE CONDITION & SAFE TERMINATION
      // If instance is in a terminal state (APPROVED, REJECTED, RETURNED, CANCELLED, EXPIRED), safely no-op!
      if (['APPROVED', 'REJECTED', 'RETURNED', 'CANCELLED', 'EXPIRED'].includes(instance.status)) {
        result.details.push(`Instance in terminal state '${instance.status}'. Skipping escalation.`);
        return;
      }

      if (instance.status !== 'PENDING_APPROVAL') {
        result.details.push(`Instance not pending approval (status: ${instance.status}).`);
        return;
      }

      result.evaluated = true;

      // Load Policy
      let policy: EscalationPolicy | null = null;
      if (instance.escalationPolicyId) {
        // Try loading pinned policy
        const polRef = doc(db, 'companies', companyId, 'bpm_escalation_policies', instance.escalationPolicyId);
        const polSnap = await transaction.get(polRef);
        if (polSnap.exists()) {
          policy = polSnap.data() as EscalationPolicy;
        }
      }

      // If not pinned or not found, resolve active policy
      if (!policy) {
        policy = await this.getActivePolicy(companyId, instance.sourceModule, instance.transactionType, instance.workflowId, instance.currentStepId);
        if (policy) {
          instance.escalationPolicyId = policy.policyId;
          instance.policyVersion = policy.version;
        }
      }

      // If still no policy, we have nothing to escalate
      if (!policy || !policy.active) {
        result.details.push('No active escalation policy configured for this instance.');
        return;
      }

      const stepId = instance.currentStepId || `TIER_${instance.currentTier}`;
      const policyVersion = instance.policyVersion || policy.version || 1;
      const assignedTime = instance.assignedAt ? new Date(instance.assignedAt).getTime() : new Date(instance.submittedAt).getTime();
      const currentLevel = instance.escalationLevel || 0;
      const maxLevels = policy.maximumEscalations || policy.levels.length;

      // -------------------------------------------------------------
      // A. REMINDER EVALUATION
      // -------------------------------------------------------------
      const reminderThresholdMs = (policy.reminderAfterMinutes || 120) * 60 * 1000;
      const reminderTargetTime = assignedTime + reminderThresholdMs;

      if (now.getTime() >= reminderTargetTime && !instance.lastReminderAt) {
        // Deterministic Idempotency Key
        const reminderEventId = `ESC_${companyId}_${instanceId}_${stepId}_V${policyVersion}_L0_REMINDER`;
        const reminderEventRef = doc(db, 'companies', companyId, 'bpm_escalation_events', reminderEventId);
        const existingEventSnap = await transaction.get(reminderEventRef);

        if (!existingEventSnap.exists()) {
          // Send Reminder Notification
          const notifId = `NOTIF_${reminderEventId}`;
          const notifRef = doc(db, 'companies', companyId, 'notifications', notifId);

          const reminderNotification: AppNotification = {
            id: notifId,
            title: `Action Required: Approval Reminder (${instance.sourceModule})`,
            message: `A pending ${instance.sourceModule} approval request (${instance.sourceRecordId}) requires your review.`,
            type: 'INFO',
            timestamp: nowIso,
            isRead: false,
            actionRoute: 'APPROVAL_CENTER'
          };

          transaction.set(notifRef, reminderNotification);

          // Record Immutable Event
          const reminderEvent: BpmEscalationEvent = {
            id: reminderEventId,
            companyId,
            approvalInstanceId: instanceId,
            workflowId: instance.workflowId,
            stepId,
            policyId: policy.policyId,
            policyVersion,
            eventType: 'REMINDER',
            escalationLevel: 0,
            previousApprovers: [...instance.currentApprovers],
            escalatedTo: [...instance.currentApprovers],
            reassigned: false,
            reason: `Scheduled reminder triggered after ${policy.reminderAfterMinutes} minutes.`,
            triggeredAt: nowIso,
            notificationId: notifId,
            status: 'PROCESSED'
          };

          transaction.set(reminderEventRef, reminderEvent);

          instance.lastReminderAt = nowIso;
          instance.updatedAt = nowIso;
          result.actionsTaken.reminderSent = true;
          result.details.push('Sent reminder notification.');
        }
      }

      // -------------------------------------------------------------
      // B. DUE / OVERDUE EVALUATION
      // -------------------------------------------------------------
      const dueThresholdMs = (policy.dueAfterMinutes || 1440) * 60 * 1000;
      const dueTargetTime = assignedTime + dueThresholdMs;

      if (now.getTime() >= dueTargetTime && !instance.isOverdue) {
        const dueEventId = `ESC_${companyId}_${instanceId}_${stepId}_V${policyVersion}_L0_DUE`;
        const dueEventRef = doc(db, 'companies', companyId, 'bpm_escalation_events', dueEventId);
        const existingDueSnap = await transaction.get(dueEventRef);

        if (!existingDueSnap.exists()) {
          const notifId = `NOTIF_${dueEventId}`;
          const notifRef = doc(db, 'companies', companyId, 'notifications', notifId);

          const dueNotification: AppNotification = {
            id: notifId,
            title: `Urgent: Approval Overdue (${instance.sourceModule})`,
            message: `Approval request ${instance.sourceRecordId} is now OVERDUE. Please take immediate action.`,
            type: 'WARNING',
            timestamp: nowIso,
            isRead: false,
            actionRoute: 'APPROVAL_CENTER'
          };

          transaction.set(notifRef, dueNotification);

          const dueEvent: BpmEscalationEvent = {
            id: dueEventId,
            companyId,
            approvalInstanceId: instanceId,
            workflowId: instance.workflowId,
            stepId,
            policyId: policy.policyId,
            policyVersion,
            eventType: 'DUE',
            escalationLevel: 0,
            previousApprovers: [...instance.currentApprovers],
            escalatedTo: [...instance.currentApprovers],
            reassigned: false,
            reason: `Approval due time reached (${policy.dueAfterMinutes} minutes elapsed).`,
            triggeredAt: nowIso,
            notificationId: notifId,
            status: 'PROCESSED'
          };

          transaction.set(dueEventRef, dueEvent);

          instance.isOverdue = true;
          instance.updatedAt = nowIso;
          result.actionsTaken.dueTriggered = true;
          result.details.push('Marked instance as overdue.');
        }
      }

      // -------------------------------------------------------------
      // C. MULTI-LEVEL ESCALATION EVALUATION
      // -------------------------------------------------------------
      const sortedLevels = [...policy.levels].sort((a, b) => a.level - b.level);

      for (const levelConfig of sortedLevels) {
        // Skip levels that have already been executed
        if (currentLevel >= levelConfig.level) {
          continue;
        }

        const escalationThresholdMs = (levelConfig.escalationAfterMinutes || (policy.dueAfterMinutes + levelConfig.level * 60)) * 60 * 1000;
        const escalationTargetTime = assignedTime + escalationThresholdMs;

        if (now.getTime() >= escalationTargetTime) {
          const isFinal = levelConfig.level >= maxLevels;
          const eventType: BpmEscalationEventType = isFinal
            ? 'FINAL_ESCALATION'
            : levelConfig.level === 1 
              ? 'ESCALATION_LEVEL_1' 
              : 'ESCALATION_LEVEL_2';

          const escalationEventId = `ESC_${companyId}_${instanceId}_${stepId}_V${policyVersion}_L${levelConfig.level}_${eventType}`;
          const escalationEventRef = doc(db, 'companies', companyId, 'bpm_escalation_events', escalationEventId);
          const existingEscSnap = await transaction.get(escalationEventRef);

          if (!existingEscSnap.exists()) {
            // Resolve target approvers/supervisors according to level configuration
            const resolvedTargets = await this.resolveEscalationTargetUsers(
              companyId,
              levelConfig.escalationTargetType,
              levelConfig.targetRole,
              levelConfig.targetUserId,
              instance.currentApprovers
            );

            const previousApprovers = [...instance.currentApprovers];
            let newApprovers = [...instance.currentApprovers];
            const allowReassignment = levelConfig.reassignmentAllowed ?? policy.reassignmentAllowed ?? false;

if (allowReassignment && resolvedTargets.length > 0) {
              // Reassign approval ownership to the resolved target approvers
              let finalTargets = [...resolvedTargets];
              
              // Integrate Proxy Delegation: If the target has an active proxy, route it to the proxy
              try {
                const activeProxies = await BpmDelegationService.getActiveProxiesForApprovers(companyId, resolvedTargets, instance, now);
                if (activeProxies.length > 0) {
                  const proxyMap = new Map<string, string>();
                  activeProxies.forEach(p => proxyMap.set(p.delegatorUserId, p.delegateUserId));
                  
                  finalTargets = resolvedTargets.map(uid => proxyMap.has(uid) ? proxyMap.get(uid)! : uid);
                }
              } catch (e) {
                console.warn('[EscalationEngine] Proxy evaluation failed during escalation:', e);
              }

              newApprovers = Array.from(new Set(finalTargets));
              instance.reassignedFrom = previousApprovers;
              instance.currentApprovers = newApprovers;
              result.actionsTaken.reassigned = true;
            }

            // Send notification to escalation targets
            const notifId = `NOTIF_${escalationEventId}`;
            const notifRef = doc(db, 'companies', companyId, 'notifications', notifId);

            const escalationNotif: AppNotification = {
              id: notifId,
              title: isFinal 
                ? `CRITICAL: Final Escalation - Approval Required (${instance.sourceModule})` 
                : `Escalation Level ${levelConfig.level}: Approval Pending (${instance.sourceModule})`,
              message: levelConfig.customNotificationMessage || 
                `Approval request ${instance.sourceRecordId} has escalated to Level ${levelConfig.level}.${allowReassignment ? ' You have been assigned as the approver.' : ' You have been notified as escalation authority.'}`,
              type: isFinal ? 'ALERT' : 'WARNING',
              timestamp: nowIso,
              isRead: false,
              actionRoute: 'APPROVAL_CENTER'
            };

            transaction.set(notifRef, escalationNotif);

            // Record Immutable Event
            const escEvent: BpmEscalationEvent = {
              id: escalationEventId,
              companyId,
              approvalInstanceId: instanceId,
              workflowId: instance.workflowId,
              stepId,
              policyId: policy.policyId,
              policyVersion,
              eventType,
              escalationLevel: levelConfig.level,
              previousApprovers,
              escalatedTo: resolvedTargets,
              reassigned: allowReassignment,
              reason: `Escalated after ${levelConfig.escalationAfterMinutes} minutes elapsed. Target type: ${levelConfig.escalationTargetType}.`,
              triggeredAt: nowIso,
              notificationId: notifId,
              status: 'PROCESSED'
            };

            transaction.set(escalationEventRef, escEvent);

            instance.escalationLevel = levelConfig.level;
            instance.lastEscalationAt = nowIso;
            instance.updatedAt = nowIso;

            result.actionsTaken.escalatedLevel = levelConfig.level;
            if (isFinal) result.actionsTaken.finalEscalation = true;
            result.details.push(`Escalated to Level ${levelConfig.level} (Targets: ${resolvedTargets.join(', ') || 'N/A'}, Reassigned: ${allowReassignment}).`);

            // Break after one step level escalation per evaluation pass
            break;
          }
        }
      }

      // Update instance in Firestore transaction
      transaction.set(instanceRef, instance);
    });

    // Outside transaction, record audit log if actions were performed
    if (result.actionsTaken.reminderSent) {
      await FirestoreService.logAuditEvent(
        companyId,
        'SYSTEM_BPM_TIMER',
        'BPM Escalation Engine',
        'APPROVAL_REMINDER_SENT',
        `Sent scheduled reminder for approval ${instanceId}.`,
        instanceId
      );
    }

    if (result.actionsTaken.dueTriggered) {
      await FirestoreService.logAuditEvent(
        companyId,
        'SYSTEM_BPM_TIMER',
        'BPM Escalation Engine',
        'APPROVAL_DUE_TRIGGERED',
        `Approval ${instanceId} reached due threshold and was marked overdue.`,
        instanceId
      );
    }

    if (result.actionsTaken.escalatedLevel !== undefined) {
      await FirestoreService.logAuditEvent(
        companyId,
        'SYSTEM_BPM_TIMER',
        'BPM Escalation Engine',
        result.actionsTaken.finalEscalation ? 'APPROVAL_FINAL_ESCALATION' : `APPROVAL_ESCALATED_LEVEL_${result.actionsTaken.escalatedLevel}`,
        `Approval ${instanceId} escalated to Level ${result.actionsTaken.escalatedLevel} (Reassigned: ${result.actionsTaken.reassigned}).`,
        instanceId
      );
    }

    return result;
  }

  /**
   * Processes all pending approvals for a company in batches.
   */
  static async processAllCompanyPendingApprovals(
    companyId: string,
    authoritativeTime?: Date
  ): Promise<{ totalChecked: number; totalEscalated: number; totalReminders: number; results: EscalationProcessResult[] }> {
    try {
      const q = query(
        collection(db, 'companies', companyId, 'bpm_instances'),
        where('status', '==', 'PENDING_APPROVAL')
      );

      const snap = await getDocs(q);
      const instances = snap.docs.map(d => ({ id: d.id, ...d.data() } as BpmApprovalInstance));

      let totalReminders = 0;
      let totalEscalated = 0;
      const results: EscalationProcessResult[] = [];

      for (const instance of instances) {
        try {
          const res = await this.processInstanceTimers(companyId, instance.id, authoritativeTime);
          results.push(res);
          if (res.actionsTaken.reminderSent) totalReminders++;
          if (res.actionsTaken.escalatedLevel !== undefined) totalEscalated++;
        } catch (itemErr) {
          console.error(`[BpmEscalationService] Error processing instance ${instance.id}:`, itemErr);
        }
      }

      return {
        totalChecked: instances.length,
        totalEscalated,
        totalReminders,
        results
      };
    } catch (err) {
      console.error(`[BpmEscalationService] processAllCompanyPendingApprovals error for ${companyId}:`, err);
      return { totalChecked: 0, totalEscalated: 0, totalReminders: 0, results: [] };
    }
  }

  /**
   * Processes pending approvals across all registered companies.
   */
  static async processAllPendingApprovalsGlobally(
    authoritativeTime?: Date
  ): Promise<{ companiesProcessed: number; totalEvaluated: number; totalEscalated: number }> {
    try {
      const compSnap = await getDocs(collection(db, 'companies'));
      let companiesProcessed = 0;
      let totalEvaluated = 0;
      let totalEscalated = 0;

      for (const compDoc of compSnap.docs) {
        const companyId = compDoc.id;
        const res = await this.processAllCompanyPendingApprovals(companyId, authoritativeTime);
        companiesProcessed++;
        totalEvaluated += res.totalChecked;
        totalEscalated += res.totalEscalated;
      }

      return {
        companiesProcessed,
        totalEvaluated,
        totalEscalated
      };
    } catch (err) {
      console.error('[BpmEscalationService] processAllPendingApprovalsGlobally error:', err);
      return { companiesProcessed: 0, totalEvaluated: 0, totalEscalated: 0 };
    }
  }

  // =========================================================================
  // 3. ESCALATION HISTORY & EVENT RETRIEVAL
  // =========================================================================

  /**
   * Retrieves the immutable history of escalation events for a given approval instance.
   */
  static async getEscalationEvents(companyId: string, approvalInstanceId: string): Promise<BpmEscalationEvent[]> {
    try {
      const q = query(
        collection(db, 'companies', companyId, 'bpm_escalation_events'),
        where('approvalInstanceId', '==', approvalInstanceId)
      );
      const snap = await getDocs(q);
      const list = snap.docs.map(d => d.data() as BpmEscalationEvent);
      return list.sort((a, b) => new Date(a.triggeredAt).getTime() - new Date(b.triggeredAt).getTime());
    } catch (err) {
      console.error(`[BpmEscalationService] getEscalationEvents error (${approvalInstanceId}):`, err);
      return [];
    }
  }

  /**
   * Realtime subscription to escalation events for an approval instance.
   */
  static subscribeToEscalationEvents(
    companyId: string,
    approvalInstanceId: string,
    onUpdate: (events: BpmEscalationEvent[]) => void
  ): () => void {
    try {
      const q = query(
        collection(db, 'companies', companyId, 'bpm_escalation_events'),
        where('approvalInstanceId', '==', approvalInstanceId)
      );
      return onSnapshot(q, (snap) => {
        const list = snap.docs.map(d => d.data() as BpmEscalationEvent);
        list.sort((a, b) => new Date(a.triggeredAt).getTime() - new Date(b.triggeredAt).getTime());
        onUpdate(list);
      }, (err) => {
        console.warn('[BpmEscalationService] subscribeToEscalationEvents error:', err);
        onUpdate([]);
      });
    } catch (e) {
      console.warn('[BpmEscalationService] subscribeToEscalationEvents exception:', e);
      onUpdate([]);
      return () => {};
    }
  }

  // =========================================================================
  // 4. HELPER RESOLUTION METHODS
  // =========================================================================

  /**
   * Resolves target user IDs for a given escalation target type.
   */
  static async resolveEscalationTargetUsers(
    companyId: string,
    targetType: EscalationTargetType,
    targetRole?: string,
    targetUserId?: string,
    currentApprovers: string[] = []
  ): Promise<string[]> {
    try {
      if (targetType === 'USER' && targetUserId) {
        return [targetUserId];
      }

      if (targetType === 'ROLE' && targetRole) {
        const usersQuery = query(
          collection(db, 'companies', companyId, 'users'),
          where('role', '==', targetRole)
        );
        const snap = await getDocs(usersQuery);
        return snap.docs.map(d => d.id);
      }

      if (targetType === 'MANAGER') {
        // Look up manager for existing approver or requester
        if (currentApprovers.length > 0) {
          const empRef = doc(db, 'companies', companyId, 'employees', currentApprovers[0]);
          const empSnap = await getDoc(empRef);
          if (empSnap.exists()) {
            const empData = empSnap.data();
            if (empData.reportingManagerId) {
              return [empData.reportingManagerId];
            }
          }
        }
        // Fallback to Ops Manager or General Manager
        const opsQuery = query(
          collection(db, 'companies', companyId, 'users'),
          where('role', 'in', ['GENERAL_MANAGER', 'COMPANY_ADMIN', 'OPS_MANAGER'])
        );
        const opsSnap = await getDocs(opsQuery);
        return opsSnap.docs.map(d => d.id);
      }

      if (targetType === 'DEPARTMENT_HEAD') {
        const deptQuery = query(
          collection(db, 'companies', companyId, 'users'),
          where('role', 'in', ['HR_ADMIN', 'FINANCE_MANAGER', 'GENERAL_MANAGER', 'COMPANY_ADMIN'])
        );
        const snap = await getDocs(deptQuery);
        return snap.docs.map(d => d.id);
      }

      if (targetType === 'SUPER_ADMIN') {
        const adminQuery = query(
          collection(db, 'companies', companyId, 'users'),
          where('role', 'in', ['COMPANY_ADMIN', 'SUPER_ADMIN'])
        );
        const snap = await getDocs(adminQuery);
        return snap.docs.map(d => d.id);
      }

      return [];
    } catch (err) {
      console.error('[BpmEscalationService] resolveEscalationTargetUsers error:', err);
      return [];
    }
  }

  /**
   * Helper to ensure levels are valid, sorted by escalation level, and have non-negative durations.
   */
  private static validateAndSortLevels(levels: EscalationLevelConfig[]): EscalationLevelConfig[] {
    const sorted = [...levels].sort((a, b) => a.level - b.level);
    let prevDuration = 0;
    return sorted.map((lvl, index) => {
      const levelNum = index + 1;
      const duration = Math.max(1, lvl.escalationAfterMinutes || (prevDuration + 60));
      prevDuration = duration;
      return {
        ...lvl,
        level: levelNum,
        escalationAfterMinutes: duration,
        reassignmentAllowed: lvl.reassignmentAllowed ?? false,
        notifyTarget: lvl.notifyTarget ?? true
      };
    });
  }
}
