import { db } from '../firebase';
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  query, 
  where, 
  limit, 
  orderBy 
} from 'firebase/firestore';
import { 
  CompliancePolicy, 
  PolicyVersionRecord, 
  ComplianceEvaluationRecord, 
  ComplianceViolationRecord, 
  ComplianceMetricsSummary,
  PolicyModule, 
  PolicyType,
  ComplianceSeverity,
  ViolationStatus,
  ConditionEvaluationDetail,
  ComplianceEvaluationResultType
} from '../types/compliance';
import { UserSession, AppNotification } from '../types';
import { AuditTrailService } from './auditTrailService';
import { SecurityAuditService } from './securityAuditService';
import { FirestoreService } from './firestoreService';

// Allow dependency injection for testing
export let _getDocs = getDocs;
export function _setGetDocsMock(mock: any) { _getDocs = mock; }
export let _setDoc = setDoc;
export function _setSetDocMock(mock: any) { _setDoc = mock; }
export let _updateDoc = updateDoc;
export function _setUpdateDocMock(mock: any) { _updateDoc = mock; }
export let _getDoc = getDoc;
export function _setGetDocMock(mock: any) { _getDoc = mock; }

function sanitizeForFirestore<T>(data: T): T {
  if (data === null || data === undefined) {
    return null as any;
  }
  if (Array.isArray(data)) {
    return data.map(item => sanitizeForFirestore(item)) as any;
  }
  if (typeof data === 'object' && !(data instanceof Date)) {
    const cleaned: Record<string, any> = {};
    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined) {
        cleaned[key] = sanitizeForFirestore(value);
      }
    }
    return cleaned as T;
  }
  return data;
}

export class CompliancePolicyEngine {

  /**
   * Baseline policies seeded per company if not already initialized
   */
  static getDefaultPolicies(companyId: string, authorId: string = 'SYSTEM'): CompliancePolicy[] {
    const now = new Date().toISOString();
    const today = now.slice(0, 10);

    return [
      {
        id: `POL-${companyId}-WFM-01`,
        companyId,
        name: 'Statutory Monthly Overtime Cap (50h)',
        description: 'Enforces maximum permissible overtime of 50 hours per month under statutory labor regulations.',
        module: 'WFM',
        policyType: 'ATTENDANCE_OVERTIME_LIMIT',
        scope: { scopeType: 'COMPANY_WIDE' },
        conditions: [
          { field: 'monthlyOvertimeHours', operator: 'LESS_THAN_OR_EQUAL', value: 50, description: 'Monthly overtime must not exceed 50 hours' }
        ],
        thresholds: { warningThreshold: 42, violationThreshold: 50 },
        severity: 'HIGH',
        enabled: true,
        effectiveFrom: today,
        enforcementAction: 'CREATE_VIOLATION',
        responsibleRoles: ['COMPANY_ADMIN', 'HR_ADMIN', 'OPS_MANAGER'],
        createdBy: authorId,
        updatedBy: authorId,
        version: 1,
        createdAt: now,
        updatedAt: now,
        tags: ['statutory', 'overtime', 'wfm', 'labor-law']
      },
      {
        id: `POL-${companyId}-WFM-02`,
        companyId,
        name: 'Mandatory Rest Period (11h Minimum)',
        description: 'Ensures mandatory minimum rest gap of 11 hours between consecutive work shifts.',
        module: 'WFM',
        policyType: 'MANDATORY_REST_HOURS',
        scope: { scopeType: 'COMPANY_WIDE' },
        conditions: [
          { field: 'restGapHours', operator: 'GREATER_THAN_OR_EQUAL', value: 11, description: 'Rest interval must be >= 11 hours' }
        ],
        thresholds: { warningThreshold: 12, violationThreshold: 11 },
        severity: 'MEDIUM',
        enabled: true,
        effectiveFrom: today,
        enforcementAction: 'CREATE_VIOLATION',
        responsibleRoles: ['OPS_MANAGER', 'SUPERVISOR', 'HR_ADMIN'],
        createdBy: authorId,
        updatedBy: authorId,
        version: 1,
        createdAt: now,
        updatedAt: now,
        tags: ['wfm', 'shifts', 'fatigue-management']
      },
      {
        id: `POL-${companyId}-WFM-03`,
        companyId,
        name: 'Geo-Fence Boundary Adherence (<250m)',
        description: 'Restricts mobile muster punches to within 250 meters of authorized site coordinates.',
        module: 'WFM',
        policyType: 'GEOFENCE_RADIUS_STRICTNESS',
        scope: { scopeType: 'COMPANY_WIDE' },
        conditions: [
          { field: 'distanceMeters', operator: 'LESS_THAN_OR_EQUAL', value: 250, description: 'Punch location distance must be <= 250m' }
        ],
        thresholds: { warningThreshold: 200, violationThreshold: 250 },
        severity: 'HIGH',
        enabled: true,
        effectiveFrom: today,
        enforcementAction: 'CREATE_VIOLATION',
        responsibleRoles: ['COMPANY_ADMIN', 'OPS_MANAGER', 'SUPERVISOR'],
        createdBy: authorId,
        updatedBy: authorId,
        version: 1,
        createdAt: now,
        updatedAt: now,
        tags: ['geofence', 'attendance', 'muster']
      },
      {
        id: `POL-${companyId}-HCM-01`,
        companyId,
        name: 'Mandatory KYC & Identity Verification',
        description: 'Requires all active deployed employees to have verified statutory identity credentials (Aadhaar/PAN/Voter).',
        module: 'HCM',
        policyType: 'KYC_DOCUMENT_MANDATORY',
        scope: { scopeType: 'COMPANY_WIDE' },
        conditions: [
          { field: 'isKycVerified', operator: 'EQUALS', value: true, description: 'Employee KYC must be verified' },
          { field: 'hasIdentityProof', operator: 'EQUALS', value: true, description: 'Identity document must be on file' }
        ],
        thresholds: { warningThreshold: 1, violationThreshold: 1 },
        severity: 'CRITICAL',
        enabled: true,
        effectiveFrom: today,
        enforcementAction: 'CREATE_VIOLATION',
        responsibleRoles: ['COMPANY_ADMIN', 'HR_ADMIN'],
        createdBy: authorId,
        updatedBy: authorId,
        version: 1,
        createdAt: now,
        updatedAt: now,
        tags: ['hcm', 'kyc', 'statutory', 'identity']
      },
      {
        id: `POL-${companyId}-PAY-01`,
        companyId,
        name: 'Statutory Minimum Wage Floor Compliance',
        description: 'Mandates that base daily and monthly wage rates meet or exceed statutory minimum wage schedules.',
        module: 'PAYROLL',
        policyType: 'MINIMUM_WAGE_STATUTORY',
        scope: { scopeType: 'COMPANY_WIDE' },
        conditions: [
          { field: 'basicMonthlyPay', operator: 'GREATER_THAN_OR_EQUAL', value: 12000, description: 'Basic pay must meet statutory minimum floor' }
        ],
        thresholds: { warningThreshold: 12500, violationThreshold: 12000 },
        severity: 'CRITICAL',
        enabled: true,
        effectiveFrom: today,
        enforcementAction: 'TRIGGER_BPM',
        responsibleRoles: ['COMPANY_ADMIN', 'HR_ADMIN', 'FINANCE_MANAGER'],
        createdBy: authorId,
        updatedBy: authorId,
        version: 1,
        createdAt: now,
        updatedAt: now,
        tags: ['payroll', 'minimum-wage', 'compliance']
      },
      {
        id: `POL-${companyId}-SCM-01`,
        companyId,
        name: 'Purchase Order Multi-Tier Authorization (>₹50k)',
        description: 'Requires multi-level BPM authorization for procurement purchase orders exceeding ₹50,000.',
        module: 'SCM',
        policyType: 'PO_AUTHORIZATION_THRESHOLD',
        scope: { scopeType: 'COMPANY_WIDE' },
        conditions: [
          { field: 'poAmount', operator: 'LESS_THAN_OR_EQUAL', value: 50000, description: 'POs > ₹50,000 require BPM authorization' }
        ],
        thresholds: { warningThreshold: 40000, violationThreshold: 50000 },
        severity: 'MEDIUM',
        enabled: true,
        effectiveFrom: today,
        enforcementAction: 'TRIGGER_BPM',
        responsibleRoles: ['COMPANY_ADMIN', 'FINANCE_MANAGER'],
        createdBy: authorId,
        updatedBy: authorId,
        version: 1,
        createdAt: now,
        updatedAt: now,
        tags: ['scm', 'procurement', 'bpm', 'authorization']
      },
      {
        id: `POL-${companyId}-OPS-01`,
        companyId,
        name: 'Critical Incident Root Cause SLA (24h)',
        description: 'Mandates formal incident investigation and closure within 24 hours for Critical severity incidents.',
        module: 'OPERATIONS',
        policyType: 'INCIDENT_SLA_RESOLUTION',
        scope: { scopeType: 'COMPANY_WIDE' },
        conditions: [
          { field: 'resolutionTimeHours', operator: 'LESS_THAN_OR_EQUAL', value: 24, description: 'Critical incident resolution must be <= 24 hours' }
        ],
        thresholds: { warningThreshold: 18, violationThreshold: 24 },
        severity: 'HIGH',
        enabled: true,
        effectiveFrom: today,
        enforcementAction: 'CREATE_VIOLATION',
        responsibleRoles: ['COMPANY_ADMIN', 'OPS_MANAGER'],
        createdBy: authorId,
        updatedBy: authorId,
        version: 1,
        createdAt: now,
        updatedAt: now,
        tags: ['operations', 'incident', 'sla', 'safety']
      },
      {
        id: `POL-${companyId}-SEC-01`,
        companyId,
        name: 'After-Hours Data Export Surveillance',
        description: 'Flags large-scale employee, payroll or contract data exports occurring outside standard business hours.',
        module: 'SECURITY',
        policyType: 'AFTER_HOURS_DATA_DOWNLOAD',
        scope: { scopeType: 'COMPANY_WIDE' },
        conditions: [
          { field: 'isAfterHoursExport', operator: 'EQUALS', value: false, description: 'Sensitive downloads must occur within approved business hours' }
        ],
        thresholds: { warningThreshold: 50, violationThreshold: 100 },
        severity: 'HIGH',
        enabled: true,
        effectiveFrom: today,
        enforcementAction: 'NOTIFY_ADMIN',
        responsibleRoles: ['SUPER_ADMIN', 'COMPANY_ADMIN'],
        createdBy: authorId,
        updatedBy: authorId,
        version: 1,
        createdAt: now,
        updatedAt: now,
        tags: ['security', 'export', 'grc', 'data-protection']
      },
      {
        id: `POL-${companyId}-SEC-02`,
        companyId,
        name: 'Critical Security Anomaly Governance',
        description: 'Enforces strict investigation and governance workflows for all CRITICAL or HIGH severity security anomalies.',
        module: 'SECURITY',
        policyType: 'AFTER_HOURS_DATA_DOWNLOAD', // using existing type for simplicity
        scope: { scopeType: 'COMPANY_WIDE' },
        conditions: [
          { field: 'isGovernanceRequired', operator: 'EQUALS', value: true, description: 'High or Critical anomalies require strict GRC governance' }
        ],
        thresholds: { warningThreshold: 0, violationThreshold: 1 },
        severity: 'CRITICAL',
        enabled: true,
        effectiveFrom: today,
        enforcementAction: 'CREATE_VIOLATION',
        responsibleRoles: ['SUPER_ADMIN', 'COMPANY_ADMIN'],
        createdBy: authorId,
        updatedBy: authorId,
        version: 1,
        createdAt: now,
        updatedAt: now,
        tags: ['security', 'anomaly', 'grc', 'mandatory-investigation']
      }
    ];
  }

  /**
   * Fetch all policies for a company, auto-seeding baseline policies if none exist
   */
  static async getPolicies(companyId: string, module?: PolicyModule): Promise<CompliancePolicy[]> {
    if (!companyId) return [];
    try {
      const colRef = collection(db, 'companies', companyId, 'compliance_policies');
      const snap = await _getDocs(colRef);
      
      let policies = snap.docs.map(d => d.data() as CompliancePolicy);

      // Auto-seed baseline policies if empty
      if (policies.length === 0) {
        const defaults = this.getDefaultPolicies(companyId);
        for (const p of defaults) {
          const docRef = doc(db, 'companies', companyId, 'compliance_policies', p.id);
          await _setDoc(docRef, p);
        }
        policies = defaults;
      }

      if (module) {
        policies = policies.filter(p => p.module === module);
      }

      policies.sort((a, b) => a.name.localeCompare(b.name));
      return policies;
    } catch (err) {
      console.warn('[CompliancePolicyEngine] getPolicies error, falling back to default baseline policies:', err);
      let fallback = this.getDefaultPolicies(companyId);
      if (module) {
        fallback = fallback.filter(p => p.module === module);
      }
      return fallback;
    }
  }

  /**
   * Save or update a policy with automatic version incrementing, snapshotting, and audit trail
   */
  static async savePolicy(
    session: UserSession,
    companyId: string,
    policyData: Partial<CompliancePolicy> & { name: string; module: PolicyModule; policyType: PolicyType },
    changeReason: string = 'Policy configuration updated'
  ): Promise<CompliancePolicy | null> {
    if (!companyId) return null;
    
    // RBAC: Only Super Admin and Company Admin can modify policies
    if (session.role !== 'SUPER_ADMIN' && session.role !== 'COMPANY_ADMIN') {
      await SecurityAuditService.logUnauthorizedAttempt(session, 'Unauthorized: Only Super Admins and Company Admins can manage compliance policies.', 'compliance_policies');
      throw new Error('Unauthorized: Only Super Admins and Company Admins can manage compliance policies.');
    }

    try {
      const policyId = policyData.id || `POL-${companyId}-${policyData.module}-${Date.now().toString(36).toUpperCase()}`;
      const now = new Date().toISOString();
      const policyDocRef = doc(db, 'companies', companyId, 'compliance_policies', policyId);
      const existingSnap = await _getDoc(policyDocRef);

      let currentVersion = 0;
      let existingCreatedAt = now;

      if (existingSnap.exists()) {
        const existingData = existingSnap.data() as CompliancePolicy;
        currentVersion = existingData.version || 1;
        existingCreatedAt = existingData.createdAt || now;
      }

      const nextVersion = currentVersion + 1;

      const fullPolicy: CompliancePolicy = {
        id: policyId,
        companyId,
        name: policyData.name,
        description: policyData.description || '',
        module: policyData.module,
        policyType: policyData.policyType,
        scope: policyData.scope || { scopeType: 'COMPANY_WIDE' },
        conditions: policyData.conditions || [],
        thresholds: policyData.thresholds || {},
        severity: policyData.severity || 'MEDIUM',
        enabled: policyData.enabled !== undefined ? policyData.enabled : true,
        effectiveFrom: policyData.effectiveFrom || now.slice(0, 10),
        effectiveTo: policyData.effectiveTo || undefined,
        enforcementAction: policyData.enforcementAction || 'CREATE_VIOLATION',
        responsibleRoles: policyData.responsibleRoles || ['COMPANY_ADMIN', 'HR_ADMIN'],
        createdBy: existingSnap.exists() ? (existingSnap.data() as CompliancePolicy).createdBy : session.userId,
        updatedBy: session.userId,
        version: nextVersion,
        createdAt: existingCreatedAt,
        updatedAt: now,
        tags: policyData.tags || []
      };

      // 1. Save main policy record
      await _setDoc(policyDocRef, sanitizeForFirestore(fullPolicy));

      // 2. Save immutable version snapshot
      const versionId = `v${nextVersion}`;
      const versionDocRef = doc(db, 'companies', companyId, 'compliance_policies', policyId, 'versions', versionId);
      const versionRecord: PolicyVersionRecord = {
        id: `${policyId}_${versionId}`,
        policyId,
        companyId,
        version: nextVersion,
        snapshot: fullPolicy,
        changeReason,
        changedBy: session.userId,
        changedByName: session.fullName || session.email,
        changedAt: now
      };
      await _setDoc(versionDocRef, sanitizeForFirestore(versionRecord));

      // 3. Log to Immutable Audit Trail
      const actorInfo = { userId: session.userId, employeeId: session.employeeId, role: session.role, companyId };
      await AuditTrailService.logAction(
        actorInfo,
        'GRC_COMPLIANCE',
        existingSnap.exists() ? 'POLICY_UPDATE' : 'POLICY_CREATE',
        'CompliancePolicy',
        policyId,
        true,
        'MEDIUM',
        `Policy '${fullPolicy.name}' (v${nextVersion}) saved. Reason: ${changeReason}`,
        { version: nextVersion, module: fullPolicy.module, severity: fullPolicy.severity }
      );

      return fullPolicy;
    } catch (err) {
      console.error('[CompliancePolicyEngine] savePolicy error:', err);
      throw err;
    }
  }

  /**
   * Toggle policy enabled/disabled state
   */
  static async togglePolicy(session: UserSession, companyId: string, policyId: string, enabled: boolean): Promise<boolean> {
    if (!companyId || !policyId) return false;
    if (session.role !== 'SUPER_ADMIN' && session.role !== 'COMPANY_ADMIN') {
      await SecurityAuditService.logUnauthorizedAttempt(session, 'Unauthorized to toggle policy', 'compliance_policies', policyId);
      throw new Error('Unauthorized to toggle policy');
    }

    try {
      const docRef = doc(db, 'companies', companyId, 'compliance_policies', policyId);
      const snap = await _getDoc(docRef);
      if (!snap.exists()) return false;

      const now = new Date().toISOString();
      await _updateDoc(docRef, {
        enabled,
        updatedBy: session.userId,
        updatedAt: now
      });

      const actorInfo = { userId: session.userId, employeeId: session.employeeId, role: session.role, companyId };
      await AuditTrailService.logAction(
        actorInfo,
        'GRC_COMPLIANCE',
        enabled ? 'POLICY_ENABLE' : 'POLICY_DISABLE',
        'CompliancePolicy',
        policyId,
        true,
        'LOW',
        `Compliance Policy ${policyId} was ${enabled ? 'ENABLED' : 'DISABLED'}`
      );

      return true;
    } catch (err) {
      console.error('[CompliancePolicyEngine] togglePolicy error:', err);
      return false;
    }
  }

  /**
   * Fetch historical version snapshots for a policy
   */
  static async getPolicyVersions(companyId: string, policyId: string): Promise<PolicyVersionRecord[]> {
    if (!companyId || !policyId) return [];
    try {
      const colRef = collection(db, 'companies', companyId, 'compliance_policies', policyId, 'versions');
      const snap = await _getDocs(colRef);
      const versions = snap.docs.map(d => d.data() as PolicyVersionRecord);
      versions.sort((a, b) => b.version - a.version);
      return versions;
    } catch (err) {
      console.error('[CompliancePolicyEngine] getPolicyVersions error:', err);
      return [];
    }
  }

  // ==========================================================================
  // DETERMINISTIC POLICY EVALUATION ENGINE
  // ==========================================================================

  /**
   * Evaluate a transaction or entity state against all active, effective, and in-scope policies.
   */
  static async evaluateTransaction(params: {
    companyId: string;
    module: PolicyModule;
    transactionType: string;
    transactionId: string;
    subjectId: string;
    subjectName?: string;
    data: Record<string, any>;
    siteId?: string;
    department?: string;
    session?: UserSession | null;
    correlationId?: string;
    source?: string;
    activePolicies?: CompliancePolicy[];
    skipPersistence?: boolean;
  }): Promise<ComplianceEvaluationRecord[]> {
    const { 
      companyId, 
      module, 
      transactionType, 
      transactionId, 
      subjectId, 
      subjectName, 
      data, 
      siteId, 
      department, 
      session, 
      source,
      activePolicies,
      skipPersistence
    } = params;

    if (!companyId) return [];

    try {
      const now = new Date();
      const today = now.toISOString().slice(0, 10);
      const correlationId = params.correlationId || `EVAL-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

      // 1. Fetch relevant policies for module
      const allPolicies = activePolicies ? activePolicies.filter(p => !module || p.module === module) : await this.getPolicies(companyId, module);

      // 2. Filter active and in-scope policies
      const eligiblePolicies = allPolicies.filter(p => {
        if (!p.enabled) return false;
        
        // Date validity
        if (p.effectiveFrom && p.effectiveFrom > today) return false;
        if (p.effectiveTo && p.effectiveTo < today) return false;

        // Scope matching
        if (p.scope.scopeType === 'SITE' && p.scope.targetIds && siteId) {
          if (!p.scope.targetIds.includes(siteId)) return false;
        }
        if (p.scope.scopeType === 'DEPARTMENT' && p.scope.targetIds && department) {
          if (!p.scope.targetIds.includes(department)) return false;
        }

        return true;
      });

      const evaluationRecords: ComplianceEvaluationRecord[] = [];

      for (const policy of eligiblePolicies) {
        const conditionResults: ConditionEvaluationDetail[] = [];
        const brokenConditions: string[] = [];
        let hasViolation = false;
        let hasWarning = false;
        let riskScore = 0;

        // Evaluate conditions
        for (const cond of policy.conditions) {
          const actualVal = data[cond.field];
          const passed = this.evaluateSingleCondition(actualVal, cond.operator, cond.value);

          conditionResults.push({
            condition: cond.description || `${cond.field} ${cond.operator} ${cond.value}`,
            passed,
            actualValue: actualVal !== undefined ? actualVal : null,
            expectedValue: cond.value
          });

          if (!passed) {
            hasViolation = true;
            brokenConditions.push(cond.description || `Field '${cond.field}' failed condition (${cond.operator} ${cond.value}). Actual: ${actualVal}`);
          }
        }

        // Check threshold warning
        if (!hasViolation && policy.thresholds.warningThreshold !== undefined) {
          for (const key of Object.keys(data)) {
            const numVal = Number(data[key]);
            if (!isNaN(numVal) && numVal >= policy.thresholds.warningThreshold && (policy.thresholds.violationThreshold === undefined || numVal < policy.thresholds.violationThreshold)) {
              hasWarning = true;
            }
          }
        }

        // Calculate severity and risk score
        let resultType: ComplianceEvaluationResultType = 'COMPLIANT';
        if (hasViolation) {
          resultType = 'VIOLATION';
          riskScore = policy.severity === 'CRITICAL' ? 90 : policy.severity === 'HIGH' ? 65 : policy.severity === 'MEDIUM' ? 40 : 20;
        } else if (hasWarning) {
          resultType = 'WARNING';
          riskScore = 25;
        }

        const evidence = hasViolation 
          ? `Policy '${policy.name}' violation: ${brokenConditions.join('; ')}`
          : hasWarning 
            ? `Policy '${policy.name}' approaching warning threshold`
            : `All ${policy.conditions.length} conditions satisfied for ${policy.name}`;

        const evalId = `EVAL-${correlationId}-${policy.id}`;
        let violationId: string | undefined = undefined;

        // 3. Handle Violation Creation & Escalation
        if (resultType === 'VIOLATION') {
          violationId = `VIOLATION-${companyId}-${policy.id}-${transactionId || correlationId}`;
          
          const violationRecord: ComplianceViolationRecord = {
            id: violationId,
            companyId,
            policyId: policy.id,
            policyName: policy.name,
            module: policy.module,
            entityType: transactionType,
            entityId: subjectId,
            entityName: subjectName || subjectId,
            siteId,
            department,
            severity: policy.severity,
            riskScore,
            evidence,
            conditionsBroken: brokenConditions,
            detectedAt: now.toISOString(),
            status: 'DETECTED',
            correlationId,
            source: source || 'TRANSACTION_EVALUATION',
            metadata: { ...data, transactionId }
          };

          if (!skipPersistence) {
            try {
              // Save violation record (idempotent write)
              const violationRef = doc(db, 'companies', companyId, 'compliance_violations', violationId);
              await _setDoc(violationRef, sanitizeForFirestore(violationRecord), { merge: true });

              // Escalate to Security Anomaly if High/Critical
              if (policy.severity === 'HIGH' || policy.severity === 'CRITICAL') {
                await SecurityAuditService.logEvent(
                  companyId,
                  session?.userId || 'SYSTEM',
                  session?.role || 'SYSTEM',
                  session?.employeeId || 'SYSTEM_EMP_ID',
                  `COMPLIANCE_VIOLATION_${policy.policyType}`,
                  transactionType,
                  correlationId,
                  false,
                  policy.severity,
                  evidence
                );

                // Notify responsible roles
                await this.notifyResponsibleRoles(companyId, policy, violationRecord);
              }

              // Auto-trigger BPM if policy dictates
              if (policy.enforcementAction === 'TRIGGER_BPM') {
                await this.triggerBpmRemediationWorkflow(companyId, policy, violationRecord, session);
              }
            } catch (persistViolationErr) {
              console.warn('[CompliancePolicyEngine] Violation persistence warning:', persistViolationErr);
            }
          }
        }

        // 4. Save immutable evaluation record
        const evalRecord: ComplianceEvaluationRecord = {
          id: evalId,
          companyId,
          policyId: policy.id,
          policyName: policy.name,
          module: policy.module,
          subjectId,
          subjectName,
          transactionId,
          transactionType,
          conditionsEvaluated: conditionResults,
          result: resultType,
          severity: policy.severity,
          riskScore,
          violationId,
          evidence,
          correlationId,
          timestamp: now.toISOString(),
          metadata: { ...data, source }
        };

        if (!skipPersistence) {
          try {
            const evalRef = doc(db, 'companies', companyId, 'compliance_evaluations', evalId);
            await _setDoc(evalRef, sanitizeForFirestore(evalRecord));

            // 5. Immutable Audit Trail for Non-Compliant Results
            if (resultType === 'VIOLATION' || resultType === 'WARNING') {
              const actorInfo = session ? {
                userId: session.userId,
                employeeId: session.employeeId,
                role: session.role,
                companyId
              } : {
                userId: 'SYSTEM',
                companyId
              };

              await AuditTrailService.logAction(
                actorInfo,
                'GRC_COMPLIANCE',
                `COMPLIANCE_${resultType}`,
                transactionType,
                subjectId,
                resultType !== 'VIOLATION',
                policy.severity,
                evidence,
                { policyId: policy.id, riskScore, correlationId },
                undefined,
                correlationId
              );
            }
          } catch (persistEvalErr) {
            console.warn('[CompliancePolicyEngine] Evaluation persistence warning:', persistEvalErr);
          }
        }

        evaluationRecords.push(evalRecord);
      }

      return evaluationRecords;
    } catch (err) {
      console.error('[CompliancePolicyEngine] evaluateTransaction error:', err);
      return [];
    }
  }

  /**
   * Helper to evaluate single condition operators
   */
  public static evaluateSingleCondition(actual: any, operator: string, expected: any): boolean {
    if (operator === 'EXISTS') return actual !== undefined && actual !== null && actual !== '';
    if (operator === 'NOT_EXISTS') return actual === undefined || actual === null || actual === '';
    if (actual === undefined || actual === null) return false;

    switch (operator) {
      case 'EQUALS':
        return String(actual).toLowerCase() === String(expected).toLowerCase();
      case 'NOT_EQUALS':
        return String(actual).toLowerCase() !== String(expected).toLowerCase();
      case 'GREATER_THAN':
        return Number(actual) > Number(expected);
      case 'GREATER_THAN_OR_EQUAL':
        return Number(actual) >= Number(expected);
      case 'LESS_THAN':
        return Number(actual) < Number(expected);
      case 'LESS_THAN_OR_EQUAL':
        return Number(actual) <= Number(expected);
      case 'CONTAINS':
        return String(actual).toLowerCase().includes(String(expected).toLowerCase());
      case 'IN':
        return Array.isArray(expected) ? expected.map(x => String(x).toLowerCase()).includes(String(actual).toLowerCase()) : false;
      case 'NOT_IN':
        return Array.isArray(expected) ? !expected.map(x => String(x).toLowerCase()).includes(String(actual).toLowerCase()) : true;
      default:
        return true;
    }
  }

  /**
   * Dispatch deduplicated notification to responsible roles for high/critical violations
   */
  private static async notifyResponsibleRoles(
    companyId: string, 
    policy: CompliancePolicy, 
    violation: ComplianceViolationRecord
  ) {
    try {
      const notifId = `NOTIF-${violation.id}`;
      const notification: AppNotification = {
        id: notifId,
        title: `Compliance Violation: ${policy.name} (${violation.severity})`,
        message: `${violation.evidence} [Entity: ${violation.entityName || violation.entityId}]`,
        type: violation.severity === 'CRITICAL' ? 'ALERT' : 'WARNING',
        timestamp: new Date().toISOString(),
        isRead: false,
        roleScope: policy.responsibleRoles || ['SUPER_ADMIN', 'COMPANY_ADMIN', 'HR_ADMIN'],
        actionRoute: 'COMPLIANCE'
      };

      await FirestoreService.createNotification(companyId, notification);
    } catch (err) {
      console.warn('[CompliancePolicyEngine] Notification error:', err);
    }
  }

  /**
   * Trigger BPM workflow for compliance remediation
   */
  private static async triggerBpmRemediationWorkflow(
    companyId: string,
    policy: CompliancePolicy,
    violation: ComplianceViolationRecord,
    session?: UserSession | null
  ) {
    try {
      const bpmId = `BPM-COMP-${violation.id}`;
      const workflowData = {
        id: bpmId,
        companyId,
        workflowType: 'COMPLIANCE_REMEDIATION',
        sourceModule: 'COMPLIANCE',
        sourceRecordId: violation.id,
        transactionType: 'COMPLIANCE_VIOLATION',
        requesterId: session?.userId || 'SYSTEM',
        requesterName: session?.fullName || 'Compliance Engine',
        title: `Remediation Approval: ${policy.name}`,
        description: `Corrective action required for violation: ${violation.evidence}`,
        severity: violation.severity,
        status: 'PENDING',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        currentTier: 1,
        maxTiers: 1
      };

      const bpmRef = doc(db, 'companies', companyId, 'approval_requests', bpmId);
      await _setDoc(bpmRef, sanitizeForFirestore(workflowData), { merge: true });

      // Link BPM ID back to violation
      const violationRef = doc(db, 'companies', companyId, 'compliance_violations', violation.id);
      await _updateDoc(violationRef, {
        bpmWorkflowId: bpmId,
        bpmStatus: 'PENDING',
        status: 'REMEDIATION'
      });
    } catch (err) {
      console.warn('[CompliancePolicyEngine] BPM remediation trigger error:', err);
    }
  }

  // ==========================================================================
  // VIOLATION LIFECYCLE & REMEDIATION MANAGEMENT
  // ==========================================================================

  /**
   * Fetch violations with optional filtering
   */
  static async getViolations(companyId: string, filters?: {
    module?: PolicyModule;
    severity?: ComplianceSeverity;
    status?: ViolationStatus;
    siteId?: string;
  }): Promise<ComplianceViolationRecord[]> {
    if (!companyId) return [];
    try {
      const colRef = collection(db, 'companies', companyId, 'compliance_violations');
      const snap = await _getDocs(colRef);
      let list = snap.docs.map(d => d.data() as ComplianceViolationRecord);

      list.sort((a, b) => new Date(b.detectedAt).getTime() - new Date(a.detectedAt).getTime());

      if (filters) {
        if (filters.module) list = list.filter(v => v.module === filters.module);
        if (filters.severity) list = list.filter(v => v.severity === filters.severity);
        if (filters.status) list = list.filter(v => v.status === filters.status);
        if (filters.siteId) list = list.filter(v => v.siteId === filters.siteId);
      }

      return list;
    } catch (err) {
      console.error('[CompliancePolicyEngine] getViolations error:', err);
      return [];
    }
  }

  /**
   * Update violation lifecycle status with mandatory audit logging
   */
  static async updateViolationStatus(
    session: UserSession,
    companyId: string,
    violationId: string,
    status: ViolationStatus,
    resolutionNotes: string,
    remediationPlan?: string
  ): Promise<boolean> {
    if (!companyId || !violationId) return false;

    try {
      const docRef = doc(db, 'companies', companyId, 'compliance_violations', violationId);
      const snap = await _getDoc(docRef);
      if (!snap.exists()) return false;

      const current = snap.data() as ComplianceViolationRecord;
      const now = new Date().toISOString();

      const updatePayload: Partial<ComplianceViolationRecord> = {
        status,
        resolutionNotes: resolutionNotes || current.resolutionNotes,
        remediationPlan: remediationPlan || current.remediationPlan,
        resolvedBy: status === 'RESOLVED' || status === 'FALSE_POSITIVE' || status === 'EXEMPTED' 
          ? (session.fullName || session.email || session.userId) 
          : current.resolvedBy,
        resolvedAt: status === 'RESOLVED' || status === 'FALSE_POSITIVE' || status === 'EXEMPTED' 
          ? now 
          : current.resolvedAt
      };

      await _updateDoc(docRef, updatePayload);

      // Log to Immutable Audit Trail
      const actorInfo = { userId: session.userId, employeeId: session.employeeId, role: session.role, companyId };
      await AuditTrailService.logAction(
        actorInfo,
        'GRC_COMPLIANCE',
        `VIOLATION_${status}`,
        'ComplianceViolation',
        violationId,
        true,
        'MEDIUM',
        `Violation ${violationId} status changed from ${current.status} to ${status}. Notes: ${resolutionNotes}`,
        { policyId: current.policyId, previousStatus: current.status, nextStatus: status }
      );

      return true;
    } catch (err) {
      console.error('[CompliancePolicyEngine] updateViolationStatus error:', err);
      return false;
    }
  }

  /**
   * Escalate an existing violation to BPM multi-tier approval workflow
   */
  static async escalateViolationToBpm(
    session: UserSession,
    companyId: string,
    violationId: string,
    remediationPlan: string
  ): Promise<boolean> {
    if (!companyId || !violationId) return false;

    try {
      const docRef = doc(db, 'companies', companyId, 'compliance_violations', violationId);
      const snap = await _getDoc(docRef);
      if (!snap.exists()) return false;

      const current = snap.data() as ComplianceViolationRecord;
      const bpmId = `BPM-COMP-${violationId}`;
      const now = new Date().toISOString();

      const workflowData = {
        id: bpmId,
        companyId,
        workflowType: 'COMPLIANCE_REMEDIATION',
        sourceModule: 'COMPLIANCE',
        sourceRecordId: violationId,
        transactionType: 'COMPLIANCE_VIOLATION',
        requesterId: session.userId,
        requesterName: session.fullName || session.email,
        title: `Remediation Approval: ${current.policyName}`,
        description: `Plan: ${remediationPlan}. Violation Evidence: ${current.evidence}`,
        severity: current.severity,
        status: 'PENDING',
        createdAt: now,
        updatedAt: now,
        currentTier: 1,
        maxTiers: 1
      };

      const bpmRef = doc(db, 'companies', companyId, 'approval_requests', bpmId);
      await _setDoc(bpmRef, sanitizeForFirestore(workflowData), { merge: true });

      await _updateDoc(docRef, {
        status: 'REMEDIATION',
        remediationPlan,
        bpmWorkflowId: bpmId,
        bpmStatus: 'PENDING'
      });

      const actorInfo = { userId: session.userId, employeeId: session.employeeId, role: session.role, companyId };
      await AuditTrailService.logAction(
        actorInfo,
        'GRC_COMPLIANCE',
        'VIOLATION_BPM_ESCALATE',
        'ComplianceViolation',
        violationId,
        true,
        'MEDIUM',
        `Violation ${violationId} escalated to BPM remediation workflow (${bpmId})`,
        { bpmId, policyId: current.policyId }
      );

      return true;
    } catch (err) {
      console.error('[CompliancePolicyEngine] escalateViolationToBpm error:', err);
      return false;
    }
  }

  /**
   * Fetch recent evaluation audit stream
   */
  static async getEvaluations(companyId: string, limitCount: number = 100): Promise<ComplianceEvaluationRecord[]> {
    if (!companyId) return [];
    try {
      const colRef = collection(db, 'companies', companyId, 'compliance_evaluations');
      const q = query(colRef, limit(limitCount));
      const snap = await _getDocs(q);
      const items = snap.docs.map(d => d.data() as ComplianceEvaluationRecord);
      items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      return items;
    } catch (err) {
      console.error('[CompliancePolicyEngine] getEvaluations error:', err);
      return [];
    }
  }

  /**
   * Calculate real-time compliance metrics matrix
   */
  static async getComplianceMetrics(companyId: string): Promise<ComplianceMetricsSummary> {
    const modules: PolicyModule[] = ['HCM', 'WFM', 'PAYROLL', 'OPERATIONS', 'SCM', 'EAM', 'CRM', 'BPM', 'SECURITY', 'STATUTORY'];
    
    const initialModuleBreakdown: Record<PolicyModule, { totalPolicies: number; evaluations: number; violations: number; compliancePercentage: number }> = {} as any;
    for (const m of modules) {
      initialModuleBreakdown[m] = { totalPolicies: 0, evaluations: 0, violations: 0, compliancePercentage: 100 };
    }

    const defaultMetrics: ComplianceMetricsSummary = {
      overallComplianceScore: 100,
      activePoliciesCount: 0,
      totalEvaluationsCount: 0,
      openViolationsCount: 0,
      criticalViolationsCount: 0,
      highViolationsCount: 0,
      overdueRemediationCount: 0,
      moduleBreakdown: initialModuleBreakdown,
      siteBreakdown: {}
    };

    if (!companyId) return defaultMetrics;

    try {
      const [policies, violations, evaluations] = await Promise.all([
        this.getPolicies(companyId),
        this.getViolations(companyId),
        this.getEvaluations(companyId, 200)
      ]);

      const activePolicies = policies.filter(p => p.enabled);
      const openViolations = violations.filter(v => v.status !== 'RESOLVED' && v.status !== 'FALSE_POSITIVE' && v.status !== 'EXEMPTED');
      
      const criticalCount = openViolations.filter(v => v.severity === 'CRITICAL').length;
      const highCount = openViolations.filter(v => v.severity === 'HIGH').length;

      // Overdue remediation: detected > 7 days ago and still not resolved
      const sevenDaysAgo = Date.now() - 7 * 24 * 3600 * 1000;
      const overdueCount = openViolations.filter(v => new Date(v.detectedAt).getTime() < sevenDaysAgo).length;

      // Module breakdown calculation
      for (const p of activePolicies) {
        if (defaultMetrics.moduleBreakdown[p.module]) {
          defaultMetrics.moduleBreakdown[p.module].totalPolicies += 1;
        }
      }

      for (const ev of evaluations) {
        if (defaultMetrics.moduleBreakdown[ev.module]) {
          defaultMetrics.moduleBreakdown[ev.module].evaluations += 1;
          if (ev.result === 'VIOLATION') {
            defaultMetrics.moduleBreakdown[ev.module].violations += 1;
          }
        }
      }

      for (const m of modules) {
        const item = defaultMetrics.moduleBreakdown[m];
        if (item.evaluations > 0) {
          const compliantCount = item.evaluations - item.violations;
          item.compliancePercentage = Math.round(Math.max(0, (compliantCount / item.evaluations) * 100));
        } else {
          item.compliancePercentage = item.totalPolicies > 0 ? 100 : 100;
        }
      }

      // Site breakdown calculation
      const siteMap: Record<string, { siteName: string; violations: number; compliancePercentage: number }> = {};
      for (const v of openViolations) {
        const siteKey = v.siteId || 'Global / Unassigned';
        if (!siteMap[siteKey]) {
          siteMap[siteKey] = { siteName: siteKey, violations: 0, compliancePercentage: 100 };
        }
        siteMap[siteKey].violations += 1;
      }
      for (const s of Object.keys(siteMap)) {
        siteMap[s].compliancePercentage = Math.max(50, 100 - (siteMap[s].violations * 10));
      }

      // Calculate aggregate overall score
      let totalEvals = evaluations.length;
      let totalViolations = evaluations.filter(e => e.result === 'VIOLATION').length;
      let overallScore = 100;

      if (totalEvals > 0) {
        overallScore = Math.round(((totalEvals - totalViolations) / totalEvals) * 100);
      } else if (openViolations.length > 0) {
        overallScore = Math.max(60, 100 - (criticalCount * 15 + highCount * 8));
      }

      return {
        overallComplianceScore: Math.min(100, Math.max(0, overallScore)),
        activePoliciesCount: activePolicies.length,
        totalEvaluationsCount: evaluations.length,
        openViolationsCount: openViolations.length,
        criticalViolationsCount: criticalCount,
        highViolationsCount: highCount,
        overdueRemediationCount: overdueCount,
        moduleBreakdown: defaultMetrics.moduleBreakdown,
        siteBreakdown: siteMap
      };
    } catch (err) {
      console.error('[CompliancePolicyEngine] getComplianceMetrics error:', err);
      return defaultMetrics;
    }
  }
}
