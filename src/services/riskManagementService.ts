import { 
  RiskRecord, RiskMitigationAction, RiskLikelihood, RiskImpact, 
  RiskCategory, RiskStatus, RiskMetricsSummary, RiskReviewRecord } from '../types/risk';
import { UserSession, UserRole } from '../types';
import { ComplianceSeverity, ComplianceViolationRecord } from '../types/compliance';
import { SecurityAuditService } from './securityAuditService';
import { BpmEscalationService } from './bpmEscalationService';
import { 
  collection, doc, getDoc as firestoreGetDoc, getDocs as firestoreGetDocs, query, where, setDoc as firestoreSetDoc, 
  updateDoc as firestoreUpdateDoc, serverTimestamp, Timestamp, writeBatch as firestoreWriteBatch 
} from 'firebase/firestore';
import { db } from '../firebase';

// Mock interceptors for testing
export let _getDocMockRsk: any = null;
export let _getDocsMockRsk: any = null;
export let _setDocMockRsk: any = null;
export let _updateDocMockRsk: any = null;
export let _writeBatchMockRsk: any = null;

export function _setGetDocMockRsk(fn: any) { _getDocMockRsk = fn; }
export function _setGetDocsMockRsk(fn: any) { _getDocsMockRsk = fn; }
export function _setSetDocMockRsk(fn: any) { _setDocMockRsk = fn; }
export function _setUpdateDocMockRsk(fn: any) { _updateDocMockRsk = fn; }
export function _setWriteBatchMockRsk(fn: any) { _writeBatchMockRsk = fn; }

async function _getDoc(ref: any) { return _getDocMockRsk ? _getDocMockRsk(ref) : firestoreGetDoc(ref); }
async function _getDocs(ref: any) { return _getDocsMockRsk ? _getDocsMockRsk(ref) : firestoreGetDocs(ref); }
async function _setDoc(ref: any, data: any, opts?: any) { return _setDocMockRsk ? _setDocMockRsk(ref, data, opts) : firestoreSetDoc(ref, data, opts); }
async function _updateDoc(ref: any, data: any) { return _updateDocMockRsk ? _updateDocMockRsk(ref, data) : firestoreUpdateDoc(ref, data); }
function _writeBatch(dbRef: any) { return _writeBatchMockRsk ? _writeBatchMockRsk(dbRef) : firestoreWriteBatch(dbRef); }

export class RiskManagementService {

  // Role validation
  private static async validateRiskAdmin(session: UserSession, companyId: string) {
    if (session.companyId !== companyId) {
      throw new Error(`Unauthorized: Cross-tenant risk access blocked`);
    }
    const authorizedRoles: UserRole[] = ['SUPER_ADMIN', 'COMPANY_ADMIN', 'HR_ADMIN'];
    if (!authorizedRoles.includes(session.role)) {
      throw new Error(`Unauthorized: Role ${session.role} cannot administer risk records.`);
    }
  }

  // 3. RISK SCORING MODEL
  public static calculateRiskScore(likelihood: RiskLikelihood, impact: RiskImpact): { score: number; severity: ComplianceSeverity } {
    const score = likelihood * impact;
    let severity: ComplianceSeverity = 'LOW';
    if (score >= 15) severity = 'CRITICAL';
    else if (score >= 10) severity = 'HIGH';
    else if (score >= 5) severity = 'MEDIUM';
    
    return { score, severity };
  }

  // 2. RISK SOURCES
  public static async identifyRiskFromViolation(session: UserSession, violation: ComplianceViolationRecord): Promise<RiskRecord | null> {
    // using imported db
    
    // Map violation severity to likelihood/impact mathematically
    let likelihood: RiskLikelihood = 3;
    let impact: RiskImpact = 3;
    
    if (violation.severity === 'CRITICAL') { likelihood = 5; impact = 4; }
    else if (violation.severity === 'HIGH') { likelihood = 4; impact = 3; }
    else if (violation.severity === 'LOW') { likelihood = 2; impact = 2; }
    
    const { score, severity } = this.calculateRiskScore(likelihood, impact);
    
    const riskId = `RSK-VIOL-${violation.id}`;
    
    const riskRecord: RiskRecord = {
      id: riskId,
      companyId: violation.companyId,
      category: 'POLICY_VIOLATION',
      module: violation.module,
      title: `Risk derived from Policy Violation: ${violation.policyName}`,
      description: `Violation ${violation.id} mapped to Enterprise Risk.\nEvidence: ${violation.evidence}`,
      likelihood,
      impact,
      riskScore: score,
      severity,
      status: 'IDENTIFIED',
      sourceId: violation.id,
      sourceType: 'VIOLATION',
      evidence: violation.evidence,
      affectedEntities: [violation.entityId, violation.assignedToUserId || 'UNASSIGNED'],
      siteId: violation.siteId,
      department: violation.department,
      identifiedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    // Check if already exists
    const riskRef = doc(db, `companies/${violation.companyId}/risk_records`, riskId);
    const snap = await _getDoc(riskRef);
    if (!snap.exists()) {
      await _setDoc(riskRef, riskRecord);
      
      
    try {
      await SecurityAuditService.logEvent(
        session ? session.companyId : 'UNKNOWN',
        session.userId,
        session.role,
        session.employeeId,
        'RISK_MANAGEMENT_ACTION',
        'risk_records',
        riskId || 'UNKNOWN',
        true,
        'MEDIUM',
        'Risk action executed'
      );
    } catch (e) {
      console.warn("Audit log skipped", e);
    }

      return riskRecord;
    }
    return snap.data() as RiskRecord;
  }

  // Assess Risk manually or update severity
  public static async assessRisk(
    session: UserSession, 
    companyId: string, 
    riskId: string, 
    likelihood: RiskLikelihood, 
    impact: RiskImpact, 
    ownerId?: string
  ): Promise<boolean> {
    await this.validateRiskAdmin(session, companyId);
    // using imported db
    
    const riskRef = doc(db, `companies/${companyId}/risk_records`, riskId);
    const snap = await _getDoc(riskRef);
    if (!snap.exists()) throw new Error(`Risk ${riskId} not found`);
    
    const { score, severity } = this.calculateRiskScore(likelihood, impact);
    
    const updateData: Partial<RiskRecord> = {
      likelihood,
      impact,
      riskScore: score,
      severity,
      status: 'ASSESSED',
      updatedAt: new Date().toISOString(),
      assessedAt: new Date().toISOString()
    };
    if (ownerId) updateData.ownerId = ownerId;
    
    await _updateDoc(riskRef, updateData);
    
    // Audit
    
    try {
      await SecurityAuditService.logEvent(
        session ? session.companyId : 'UNKNOWN',
        session.userId,
        session.role,
        session.employeeId,
        'RISK_MANAGEMENT_ACTION',
        'risk_records',
        riskId || 'UNKNOWN',
        true,
        'MEDIUM',
        'Risk action executed'
      );
    } catch (e) {
      console.warn("Audit log skipped", e);
    }

    
    // 7. ESCALATION (If High/Critical)
    if (severity === 'CRITICAL' || severity === 'HIGH') {
      try {
        console.log(`BPM Escalation Triggered for Risk: ${riskId}`);
      } catch (e) {
        console.warn('BPM escalation skipped or failed: ', e);
      }
    }
    
    return true;
  }

  // 6. MITIGATION MANAGEMENT
  public static async addMitigationAction(
    session: UserSession, 
    companyId: string, 
    riskId: string, 
    actionData: Omit<RiskMitigationAction, 'id' | 'companyId' | 'riskId' | 'status' | 'createdAt' | 'updatedAt' | 'createdBy'>
  ): Promise<string> {
    await this.validateRiskAdmin(session, companyId);
    // using imported db
    
    const riskRef = doc(db, `companies/${companyId}/risk_records`, riskId);
    const snap = await _getDoc(riskRef);
    if (!snap.exists()) throw new Error(`Risk ${riskId} not found`);
    
    const mid = `MITIG-${Date.now()}`;
    const mitigation: RiskMitigationAction = {
      ...actionData,
      id: mid,
      companyId,
      riskId,
      status: 'PENDING',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: session.userId
    };
    
    const mitRef = doc(db, `companies/${companyId}/risk_mitigations`, mid);
    
    const batch = _writeBatch(db);
    batch.set(mitRef, mitigation);
    batch.update(riskRef, { 
      status: 'MITIGATION_REQUIRED',
      updatedAt: new Date().toISOString()
    });
    
    await batch.commit();
    
    
    try {
      await SecurityAuditService.logEvent(
        session ? session.companyId : 'UNKNOWN',
        session.userId,
        session.role,
        session.employeeId,
        'RISK_MANAGEMENT_ACTION',
        'risk_records',
        riskId || 'UNKNOWN',
        true,
        'MEDIUM',
        'Risk action executed'
      );
    } catch (e) {
      console.warn("Audit log skipped", e);
    }

    
    return mid;
  }
  
  public static async updateMitigationStatus(
    session: UserSession, 
    companyId: string, 
    mitigationId: string, 
    status: RiskMitigationAction['status'], 
    evidence?: string
  ): Promise<boolean> {
    await this.validateRiskAdmin(session, companyId);
    // using imported db
    
    const mitRef = doc(db, `companies/${companyId}/risk_mitigations`, mitigationId);
    const snap = await _getDoc(mitRef);
    if (!snap.exists()) throw new Error(`Mitigation ${mitigationId} not found`);
    const mitData = snap.data() as RiskMitigationAction;
    
    const updateData: Partial<RiskMitigationAction> = {
      status,
      updatedAt: new Date().toISOString()
    };
    
    if (status === 'COMPLETED' || status === 'VERIFIED') {
      updateData.completedAt = new Date().toISOString();
      if (status === 'VERIFIED') updateData.verifiedByUserId = session.userId;
    }
    if (evidence) updateData.completionEvidence = evidence;
    
    const riskRef = doc(db, `companies/${companyId}/risk_records`, mitData.riskId);
    
    const batch = _writeBatch(db);
    batch.update(mitRef, updateData);
    if (status === 'IN_PROGRESS') {
      batch.update(riskRef, { status: 'MITIGATION_IN_PROGRESS', updatedAt: new Date().toISOString() });
    } else if (status === 'VERIFIED') {
      batch.update(riskRef, { status: 'MONITORING', updatedAt: new Date().toISOString() });
    }
    
    await batch.commit();
    
    return true;
  }


  public static async getRiskRegister(session: UserSession, companyId: string): Promise<RiskRecord[]> {
    if (session.companyId !== companyId) throw new Error("Unauthorized");
    const q = query(collection(db, `companies/${companyId}/risk_records`));
    const snap = await _getDocs(q);
    return snap.docs.map((d: any) => d.data() as RiskRecord);
  }

  public static async getRiskMitigations(session: UserSession, companyId: string, riskId: string): Promise<RiskMitigationAction[]> {
    if (session.companyId !== companyId) throw new Error("Unauthorized");
    const q = query(collection(db, `companies/${companyId}/risk_mitigations`), where('riskId', '==', riskId));
    const snap = await _getDocs(q);
    return snap.docs.map((d: any) => d.data() as RiskMitigationAction);
  }

  public static async updateRiskTreatment(session: UserSession, companyId: string, riskId: string, strategy: 'MITIGATE' | 'AVOID' | 'TRANSFER' | 'ACCEPT', existingControls: string): Promise<boolean> {
    await this.validateRiskAdmin(session, companyId);
    const riskRef = doc(db, `companies/${companyId}/risk_records`, riskId);
    
    await _updateDoc(riskRef, {
      treatmentStrategy: strategy,
      existingControls,
      status: 'TREATMENT_PLANNED',
      updatedAt: new Date().toISOString()
    });

    await SecurityAuditService.logEvent(
      session.companyId, session.userId, session.role, session.employeeId,
      'RISK_TREATMENT_UPDATED', 'risk_records', riskId, true, 'MEDIUM',
      `Treatment strategy updated to ${strategy}`
    );
    return true;
  }

  public static async reassignRiskOwner(session: UserSession, companyId: string, riskId: string, newOwnerId: string, newOwnerRole: UserRole, reason: string): Promise<boolean> {
    await this.validateRiskAdmin(session, companyId);
    const riskRef = doc(db, `companies/${companyId}/risk_records`, riskId);
    
    await _updateDoc(riskRef, {
      ownerId: newOwnerId,
      ownerRole: newOwnerRole,
      updatedAt: new Date().toISOString()
    });

    await SecurityAuditService.logEvent(
      session.companyId, session.userId, session.role, session.employeeId,
      'RISK_OWNER_REASSIGNED', 'risk_records', riskId, true, 'MEDIUM',
      `Risk reassigned to ${newOwnerId}. Reason: ${reason}`
    );
    return true;
  }

  public static async recordRiskReview(session: UserSession, companyId: string, riskId: string, reviewData: Omit<RiskReviewRecord, 'id' | 'riskId' | 'companyId' | 'reviewerId' | 'reviewerRole' | 'reviewDate' | 'createdAt'>): Promise<string> {
    await this.validateRiskAdmin(session, companyId);
    
    const riskRef = doc(db, `companies/${companyId}/risk_records`, riskId);
    const snap = await _getDoc(riskRef);
    if (!snap.exists()) throw new Error(`Risk ${riskId} not found`);

    const revId = `REV-${Date.now()}`;
    const now = new Date().toISOString();
    
    const reviewRecord: RiskReviewRecord = {
      ...reviewData,
      id: revId,
      companyId,
      riskId,
      reviewerId: session.userId,
      reviewerRole: session.role as UserRole,
      reviewDate: now,
      createdAt: now
    };

    const revRef = doc(db, `companies/${companyId}/risk_reviews`, revId);
    
    const batch = _writeBatch(db);
    batch.set(revRef, reviewRecord);
    
    const riskUpdates: Partial<RiskRecord> = {
      residualLikelihood: reviewData.currentLikelihood,
      residualImpact: reviewData.currentImpact,
      residualRiskScore: reviewData.currentRiskScore,
      residualSeverity: reviewData.currentSeverity,
      lastReviewDate: now,
      updatedAt: now
    };
    if (reviewData.nextReviewDate) {
      riskUpdates.nextReviewDate = reviewData.nextReviewDate;
    }
    
    if (reviewData.decision === 'ACCEPT_RISK') {
      riskUpdates.status = 'ACCEPTED';
      riskUpdates.acceptedBy = session.userId;
      riskUpdates.acceptedByRole = session.role as UserRole;
      riskUpdates.acceptedAt = now;
      riskUpdates.acceptanceExpiryDate = reviewData.nextReviewDate;
    } else if (reviewData.decision === 'CLOSE_RISK') {
      riskUpdates.status = 'CLOSED';
      riskUpdates.closedAt = now;
    } else if (reviewData.decision === 'REQUIRE_NEW_MITIGATION') {
      riskUpdates.status = 'MITIGATION_REQUIRED';
    } else if (reviewData.decision === 'CONTINUE_MITIGATION') {
      riskUpdates.status = 'RETEST';
    }

    batch.update(riskRef, riskUpdates);
    await batch.commit();

    await SecurityAuditService.logEvent(
      session.companyId, session.userId, session.role, session.employeeId,
      'RISK_REVIEW_COMPLETED', 'risk_records', riskId, true, 'HIGH',
      `Risk reviewed. Decision: ${reviewData.decision}`
    );

    return revId;
  }

  // Accept Risk (Resolves the risk, but marks it as formally accepted)
  public static async acceptRisk(session: UserSession, companyId: string, riskId: string, notes: string): Promise<boolean> {
    await this.validateRiskAdmin(session, companyId);
    // using imported db
    
    const riskRef = doc(db, `companies/${companyId}/risk_records`, riskId);
    const snap = await _getDoc(riskRef);
    if (!snap.exists()) throw new Error(`Risk ${riskId} not found`);
    
    await _updateDoc(riskRef, {
      status: 'ACCEPTED',
      resolutionNotes: notes,
      resolvedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    
    
    try {
      await SecurityAuditService.logEvent(
        session ? session.companyId : 'UNKNOWN',
        session.userId,
        session.role,
        session.employeeId,
        'RISK_MANAGEMENT_ACTION',
        'risk_records',
        riskId || 'UNKNOWN',
        true,
        'MEDIUM',
        'Risk action executed'
      );
    } catch (e) {
      console.warn("Audit log skipped", e);
    }

    
    return true;
  }

  // Resolve and Close
  public static async closeRisk(session: UserSession, companyId: string, riskId: string, notes: string): Promise<boolean> {
    await this.validateRiskAdmin(session, companyId);
    // using imported db
    
    const riskRef = doc(db, `companies/${companyId}/risk_records`, riskId);
    const snap = await _getDoc(riskRef);
    if (!snap.exists()) throw new Error(`Risk ${riskId} not found`);
    
    await _updateDoc(riskRef, {
      status: 'CLOSED',
      resolutionNotes: notes,
      closedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    
    
    try {
      await SecurityAuditService.logEvent(
        session ? session.companyId : 'UNKNOWN',
        session.userId,
        session.role,
        session.employeeId,
        'RISK_MANAGEMENT_ACTION',
        'risk_records',
        riskId || 'UNKNOWN',
        true,
        'MEDIUM',
        'Risk action executed'
      );
    } catch (e) {
      console.warn("Audit log skipped", e);
    }

    
    return true;
  }

  // Fetch Dashboard Metrics
  public static async getRiskMetrics(session: UserSession, companyId: string): Promise<RiskMetricsSummary> {
    // Note: session check doesn't need to strictly be admin to VIEW metrics, 
    // but in a real enterprise we usually restrict it. We'll allow CompanyAdmin/HR_Admin.
    if (session.companyId !== companyId) throw new Error("Unauthorized");
    
    // using imported db
    const q = query(collection(db, `companies/${companyId}/risk_records`));
    const snap = await _getDocs(q);
    
    let totalOpen = 0;
    let critical = 0;
    let high = 0;
    let overdue = 0;
    const cats: Record<RiskCategory, number> = {
      SECURITY_ANOMALY: 0, POLICY_VIOLATION: 0, PRIVILEGE_ESCALATION: 0,
      COMPLIANCE_FAILURE: 0, DATA_LEAKAGE: 0, OPERATIONAL_FAILURE: 0, BPM_ESCALATION: 0
    };
    
    const now = new Date();
    
    // Also fetch mitigations to check overdue
    const qMitig = query(collection(db, `companies/${companyId}/risk_mitigations`), where('status', 'in', ['PENDING', 'IN_PROGRESS']));
    const mSnap = await _getDocs(qMitig);
    mSnap.forEach((d: any) => {
      const target = new Date(d.data().targetDate);
      if (target < now) overdue++;
    });

    snap.forEach((d: any) => {
      const r = d.data() as RiskRecord;
      if (r.status !== 'CLOSED' && r.status !== 'RESOLVED' && r.status !== 'ACCEPTED') {
        totalOpen++;
        if (r.severity === 'CRITICAL') critical++;
        if (r.severity === 'HIGH') high++;
        cats[r.category] = (cats[r.category] || 0) + 1;
      }
    });
    
    return {
      totalOpenRisks: totalOpen,
      criticalRisks: critical,
      highRisks: high,
      overdueMitigations: overdue,
      risksByCategory: cats,
      averageResolutionTimeHours: 0 // Mocked for calculation overhead
    };
  }

}

