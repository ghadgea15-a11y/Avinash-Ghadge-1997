import { 
  collection, doc, setDoc, getDoc, getDocs, query, where, writeBatch, serverTimestamp
} from 'firebase/firestore';
import { db } from '../firebase';
import { 
  ComplianceObligation, ObligationReviewRecord, ObligationMetrics, ObligationStatus
} from '../types/complianceObligation';
import { UserSession, AppNotification } from '../types';
import { SecurityAuditService } from './securityAuditService';
import { BpmEscalationService } from './bpmEscalationService';
import { FirestoreService } from './firestoreService';
import { RiskManagementService } from './riskManagementService';
import { RiskRecord } from '../types/risk';

export let _coSetDoc = setDoc;
export let _coGetDoc = getDoc;
export let _coGetDocs = getDocs;
export let _coWriteBatch = writeBatch;

export function _setCoSetDocMock(mock: any) { _coSetDoc = mock; }
export function _setCoGetDocMock(mock: any) { _coGetDoc = mock; }
export function _setCoGetDocsMock(mock: any) { _coGetDocs = mock; }
export function _setCoWriteBatchMock(mock: any) { _coWriteBatch = mock; }

export class ComplianceObligationService {
  
  static async saveObligation(session: UserSession, obligation: ComplianceObligation): Promise<void> {
    if (session.companyId !== obligation.companyId) throw new Error("Unauthorized");
    
    if (!['HR_ADMIN', 'COMPANY_ADMIN', 'SUPER_ADMIN'].includes(session.role)) {
      throw new Error("Insufficient privileges to manage obligations");
    }

    const isNew = !obligation.createdAt;
    if (isNew) {
      obligation.createdAt = new Date().toISOString();
    }
    obligation.updatedAt = new Date().toISOString();
    
    // Auto-calculate initial status if Active
    if (obligation.status !== 'DRAFT' && obligation.status !== 'CLOSED' && obligation.status !== 'RETIRED') {
      obligation.status = this.calculateStatus(obligation);
    }

    const ref = doc(db, `companies/${obligation.companyId}/compliance_obligations`, obligation.id);
    await _coSetDoc(ref, obligation, { merge: true });

    await SecurityAuditService.logEvent(
      session.companyId, session.userId, session.role, session.employeeId,
      isNew ? 'OBLIGATION_CREATED' : 'OBLIGATION_UPDATED',
      'compliance_obligations', obligation.id, true, 'MEDIUM',
      `Obligation ${obligation.id} (${obligation.name}) was ${isNew ? 'created' : 'updated'}.`
    );
  }

  static async getObligations(session: UserSession, companyId: string): Promise<ComplianceObligation[]> {
    if (session.companyId !== companyId) throw new Error("Unauthorized");
    
    const q = query(collection(db, `companies/${companyId}/compliance_obligations`));
    const snap = await _coGetDocs(q);
    return snap.docs.map((d: any) => d.data() as ComplianceObligation);
  }
  
  static async getObligation(session: UserSession, companyId: string, obligationId: string): Promise<ComplianceObligation> {
    if (session.companyId !== companyId) throw new Error("Unauthorized");
    const ref = doc(db, `companies/${companyId}/compliance_obligations`, obligationId);
    const snap = await _coGetDoc(ref);
    if (!snap.exists()) throw new Error("Obligation not found");
    return snap.data() as ComplianceObligation;
  }

  static async recordReview(session: UserSession, review: ObligationReviewRecord): Promise<void> {
    if (session.companyId !== review.companyId) throw new Error("Unauthorized");

    review.createdAt = new Date().toISOString();

    const batch = _coWriteBatch(db);
    
    const reviewRef = doc(db, `companies/${review.companyId}/obligation_reviews`, review.id);
    batch.set(reviewRef, review);

    const obligationRef = doc(db, `companies/${review.companyId}/compliance_obligations`, review.obligationId);
    const obSnap = await _coGetDoc(obligationRef);
    if (!obSnap.exists()) throw new Error("Obligation not found");
    
    const obData = obSnap.data() as ComplianceObligation;
    
    let newStatus: ObligationStatus = obData.status;
    let newDueDate = obData.dueDate;

    if (review.decision === 'APPROVED') {
      newStatus = 'VERIFIED';
      if (review.nextDueDate) {
         newDueDate = review.nextDueDate;
         newStatus = 'ACTIVE';
      }
    } else if (review.decision === 'REMEDIATION_REQUIRED') {
      newStatus = 'REMEDIATION';
      
      // Auto-create Risk for Remediation if needed
      await this.createRiskForObligation(obData, review.comments || 'Remediation required post review');
    } else if (review.decision === 'REJECTED') {
      if (!review.comments) throw new Error("Rejection requires comments");
      newStatus = 'NON_COMPLIANT';
    }
    
    batch.update(obligationRef, { 
      status: newStatus,
      dueDate: newDueDate,
      updatedAt: new Date().toISOString() 
    });

    await batch.commit();

    await SecurityAuditService.logEvent(
      session.companyId, session.userId, session.role, session.employeeId,
      'OBLIGATION_REVIEWED',
      'compliance_obligations', review.obligationId, true, 'HIGH',
      `Obligation ${review.obligationId} reviewed. Decision: ${review.decision}`
    );
  }
  
  static async evaluateExpiries(companyId: string): Promise<void> {
    const q = query(collection(db, `companies/${companyId}/compliance_obligations`));
    const snap = await _coGetDocs(q);
    const obligations = snap.docs.map((d: any) => d.data() as ComplianceObligation);
    
    const now = new Date();
    now.setHours(0,0,0,0);
    
    const batch = _coWriteBatch(db);
    let updates = 0;

    for (const ob of obligations) {
      if (['CLOSED', 'RETIRED', 'DRAFT'].includes(ob.status)) continue;
      
      const dueDate = new Date(ob.dueDate);
      dueDate.setHours(0,0,0,0);
      
      const diffTime = dueDate.getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      let newStatus = ob.status;
      let shouldAlert = false;
      let alertMsg = '';
      
      if (diffDays < 0 && ob.status !== 'EXPIRED' && ob.status !== 'NON_COMPLIANT') {
        newStatus = 'EXPIRED';
        shouldAlert = true;
        alertMsg = `Obligation ${ob.id} (${ob.name}) has expired.`;
        await this.createRiskForObligation(ob, 'Obligation expired unaddressed');
      } else if (diffDays >= 0 && diffDays <= 30 && ob.status === 'ACTIVE') {
        newStatus = 'RENEWAL_DUE';
      }
      
      // Check configurable alert thresholds (e.g., 90, 60, 30, 15, 7, 0)
      if (ob.alertThresholdsDays && ob.alertThresholdsDays.includes(diffDays)) {
         // Check lastAlertSentAt to prevent duplicates for the exact same day
         if (!ob.lastAlertSentAt || new Date(ob.lastAlertSentAt).toDateString() !== now.toDateString()) {
             shouldAlert = true;
             alertMsg = alertMsg || `Obligation ${ob.id} is due in ${diffDays} days.`;
             ob.lastAlertSentAt = new Date().toISOString();
         }
      }
      
      if (newStatus !== ob.status || shouldAlert) {
         const ref = doc(db, `companies/${companyId}/compliance_obligations`, ob.id);
         batch.update(ref, { 
             status: newStatus,
             lastAlertSentAt: ob.lastAlertSentAt,
             updatedAt: new Date().toISOString()
         });
         updates++;
         
         if (shouldAlert) {
             const notif: AppNotification = {
                id: `NOTIF-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
                title: 'Compliance Obligation Alert',
                message: alertMsg,
                type: 'WARNING',
                timestamp: new Date().toISOString(),
                isRead: false,
                roleScope: ['COMPANY_ADMIN', 'HR_ADMIN'],
                actionRoute: `/security/obligations/${ob.id}` as any
             };
             await FirestoreService.createNotification(companyId, notif).catch(e => console.warn(e));
         }
      }
    }
    
    if (updates > 0) {
      await batch.commit();
    }
  }
  
  private static calculateStatus(ob: ComplianceObligation): ObligationStatus {
      if (['CLOSED', 'RETIRED', 'DRAFT'].includes(ob.status)) return ob.status;
      
      const now = new Date();
      now.setHours(0,0,0,0);
      const dueDate = new Date(ob.dueDate);
      dueDate.setHours(0,0,0,0);
      
      if (dueDate.getTime() < now.getTime()) {
          return 'EXPIRED';
      }
      return ob.status;
  }
  
  private static async createRiskForObligation(ob: ComplianceObligation, reason: string): Promise<void> {
     // Create a risk record directly using RiskManagementService or just writing to the collection if we want to bypass complex auth session context for cron jobs
     
     const riskId = `RSK-OBL-${ob.id}-${Date.now()}`;
     const riskRecord: RiskRecord = {
         id: riskId,
         companyId: ob.companyId,
         category: 'COMPLIANCE_FAILURE',
         module: 'HCM', // using existing module type
         title: `Compliance Failure: ${ob.name}`,
         description: `Auto-generated risk for obligation ${ob.id}. Reason: ${reason}`,
         likelihood: 4, // High
         impact: ob.riskLevel === 'CRITICAL' ? 5 : ob.riskLevel === 'HIGH' ? 4 : ob.riskLevel === 'MEDIUM' ? 3 : 2,
         riskScore: 0, // Will be computed
         severity: 'HIGH',
         status: 'IDENTIFIED',
         sourceId: ob.id,
         sourceType: 'COMPLIANCE_OBLIGATION',
         evidence: 'Auto-detected by compliance engine',
         affectedEntities: [ob.id],
         identifiedAt: new Date().toISOString(),
         createdAt: new Date().toISOString(),
         updatedAt: new Date().toISOString()
     };
     
     riskRecord.riskScore = riskRecord.likelihood * riskRecord.impact;
     if (riskRecord.riskScore >= 15) riskRecord.severity = 'CRITICAL';
     else if (riskRecord.riskScore >= 10) riskRecord.severity = 'HIGH';
     else if (riskRecord.riskScore >= 5) riskRecord.severity = 'MEDIUM';
     else riskRecord.severity = 'LOW';
     
     const ref = doc(db, `companies/${ob.companyId}/risk_register`, riskId);
     await _coSetDoc(ref, riskRecord);
     
     // Trigger BPM if Critical
     if (riskRecord.severity === 'CRITICAL') {
         /* await BpmEscalationService.triggerEscalation(); */
     }
  }

  static async getMetrics(session: UserSession, companyId: string): Promise<ObligationMetrics> {
    if (session.companyId !== companyId) throw new Error("Unauthorized");
    
    const obligations = await this.getObligations(session, companyId);
    
    const metrics: ObligationMetrics = {
      totalObligations: obligations.length,
      compliant: obligations.filter(o => o.status === 'ACTIVE' || o.status === 'VERIFIED').length,
      dueSoon: obligations.filter(o => o.status === 'REVIEW_DUE' || o.status === 'RENEWAL_DUE').length,
      expired: obligations.filter(o => o.status === 'EXPIRED').length,
      nonCompliant: obligations.filter(o => o.status === 'NON_COMPLIANT').length,
      underReview: obligations.filter(o => o.status === 'REVIEW_DUE').length,
      pendingVerification: 0, // custom workflows might use this
      overdueRemediation: obligations.filter(o => o.status === 'REMEDIATION').length, // simplified
      byCategory: {} as Record<string, number>,
      upcomingExpiries: []
    };
    
    const now = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(now.getDate() + 30);
    
    obligations.forEach(o => {
      metrics.byCategory[o.category] = (metrics.byCategory[o.category] || 0) + 1;
      
      const dueDate = new Date(o.dueDate);
      if (dueDate >= now && dueDate <= thirtyDaysFromNow && !['CLOSED', 'RETIRED'].includes(o.status)) {
         metrics.upcomingExpiries.push(o);
      }
    });
    
    metrics.upcomingExpiries.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
    
    return metrics;
  }
}
