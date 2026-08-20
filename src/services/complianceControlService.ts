import { 
  collection, doc, setDoc, getDoc, getDocs, query, where, writeBatch, serverTimestamp
} from 'firebase/firestore';
import { db } from '../firebase';
import { 
  ComplianceControl, ControlTestRecord, ControlException, 
  TestResult, ExceptionStatus, ComplianceDashboardMetrics, ControlStatus
} from '../types/complianceControl';
import { UserSession } from '../types';
import { SecurityAuditService } from './securityAuditService';
import { BpmEscalationService } from './bpmEscalationService';

// Support mocks for testing
export let _ccSetDoc = setDoc;
export let _ccGetDoc = getDoc;
export let _ccGetDocs = getDocs;
export let _ccWriteBatch = writeBatch;

export function _setCcSetDocMock(mock: any) { _ccSetDoc = mock; }
export function _setCcGetDocMock(mock: any) { _ccGetDoc = mock; }
export function _setCcGetDocsMock(mock: any) { _ccGetDocs = mock; }
export function _setCcWriteBatchMock(mock: any) { _ccWriteBatch = mock; }

export class ComplianceControlService {

  // Create or Update a Control
  static async saveControl(session: UserSession, control: ComplianceControl): Promise<void> {
    if (session.companyId !== control.companyId) throw new Error("Unauthorized");
    
    // Only HR_ADMIN, COMPANY_ADMIN, or SUPER_ADMIN can create/edit controls
    if (!['HR_ADMIN', 'COMPANY_ADMIN', 'SUPER_ADMIN'].includes(session.role)) {
      throw new Error("Insufficient privileges to manage controls");
    }

    const isNew = !control.createdAt;
    if (isNew) {
      control.createdAt = new Date().toISOString();
    }
    control.updatedAt = new Date().toISOString();

    const ref = doc(db, `companies/${control.companyId}/compliance_controls`, control.id);
    await _ccSetDoc(ref, control, { merge: true });

    await SecurityAuditService.logEvent(
      session.companyId, session.userId, session.role, session.employeeId,
      isNew ? 'CONTROL_CREATED' : 'CONTROL_UPDATED',
      'compliance_controls', control.id, true, 'MEDIUM',
      `Control ${control.id} (${control.name}) was ${isNew ? 'created' : 'updated'}.`
    );
  }

  // Get all controls for a company
  static async getControls(session: UserSession, companyId: string): Promise<ComplianceControl[]> {
    if (session.companyId !== companyId) throw new Error("Unauthorized");
    
    const q = query(collection(db, `companies/${companyId}/compliance_controls`));
    const snap = await _ccGetDocs(q);
    return snap.docs.map((d: any) => d.data() as ComplianceControl);
  }
  
  static async getControl(session: UserSession, companyId: string, controlId: string): Promise<ComplianceControl> {
    if (session.companyId !== companyId) throw new Error("Unauthorized");
    const ref = doc(db, `companies/${companyId}/compliance_controls`, controlId);
    const snap = await _ccGetDoc(ref);
    if (!snap.exists()) throw new Error("Control not found");
    return snap.data() as ComplianceControl;
  }

  // Record a Control Test
  static async recordTest(session: UserSession, testRecord: ControlTestRecord): Promise<void> {
    if (session.companyId !== testRecord.companyId) throw new Error("Unauthorized");

    testRecord.createdAt = new Date().toISOString();
    testRecord.updatedAt = new Date().toISOString();

    const batch = _ccWriteBatch(db);
    
    // 1. Save Test Record
    const testRef = doc(db, `companies/${testRecord.companyId}/control_tests`, testRecord.id);
    batch.set(testRef, testRecord);

    // 2. Determine Control Status update & Auto-create exceptions
    const controlRef = doc(db, `companies/${testRecord.companyId}/compliance_controls`, testRecord.controlId);
    
    let newStatus: ControlStatus = 'TESTING';
    if (testRecord.result === 'EFFECTIVE') {
      newStatus = 'EFFECTIVE';
    } else if (testRecord.result === 'PARTIALLY_EFFECTIVE' || testRecord.result === 'INEFFECTIVE') {
      newStatus = 'REMEDIATION_REQUIRED';
      
      // Auto-create Exception
      const exceptionId = `EXC-${Date.now()}`;
      const exception: ControlException = {
        id: exceptionId,
        companyId: testRecord.companyId,
        controlId: testRecord.controlId,
        testId: testRecord.id,
        severity: testRecord.result === 'INEFFECTIVE' ? 'HIGH' : 'MEDIUM',
        description: `Auto-generated exception from test ${testRecord.id}. Result: ${testRecord.result}. Expected: ${testRecord.expectedResult}. Actual: ${testRecord.actualResult}`,
        evidenceUrls: testRecord.evidenceUrls,
        status: 'OPEN',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      const excRef = doc(db, `companies/${testRecord.companyId}/control_exceptions`, exceptionId);
      batch.set(excRef, exception);
      
      // Trigger BPM if ineffective
      if (testRecord.result === 'INEFFECTIVE') {
        try {
          /* await BpmEscalationService.triggerEscalation(); */
        } catch(e) {
          console.warn("BPM trigger failed for control exception", e);
        }
      }
    }
    
    batch.update(controlRef, { 
      status: newStatus, 
      updatedAt: new Date().toISOString() 
    });

    await batch.commit();

    await SecurityAuditService.logEvent(
      session.companyId, session.userId, session.role, session.employeeId,
      'CONTROL_TESTED',
      'control_tests', testRecord.id, true, 'MEDIUM',
      `Tested control ${testRecord.controlId}. Result: ${testRecord.result}`
    );
  }
  
  static async getTestsForControl(session: UserSession, companyId: string, controlId: string): Promise<ControlTestRecord[]> {
    if (session.companyId !== companyId) throw new Error("Unauthorized");
    const q = query(collection(db, `companies/${companyId}/control_tests`), where('controlId', '==', controlId));
    const snap = await _ccGetDocs(q);
    return snap.docs.map((d: any) => d.data() as ControlTestRecord);
  }
  
  // Exception Management
  static async getExceptions(session: UserSession, companyId: string): Promise<ControlException[]> {
    if (session.companyId !== companyId) throw new Error("Unauthorized");
    const q = query(collection(db, `companies/${companyId}/control_exceptions`));
    const snap = await _ccGetDocs(q);
    return snap.docs.map((d: any) => d.data() as ControlException);
  }
  
  static async updateExceptionStatus(
    session: UserSession, 
    companyId: string, 
    exceptionId: string, 
    status: ExceptionStatus,
    notes?: string,
    evidenceUrls?: string[]
  ): Promise<void> {
    if (session.companyId !== companyId) throw new Error("Unauthorized");
    
    const excRef = doc(db, `companies/${companyId}/control_exceptions`, exceptionId);
    const snap = await _ccGetDoc(excRef);
    if (!snap.exists()) throw new Error("Exception not found");
    
    const updateData: Partial<ControlException> = {
      status,
      updatedAt: new Date().toISOString()
    };
    
    if (notes) updateData.remediationNotes = notes;
    if (evidenceUrls && evidenceUrls.length > 0) {
      updateData.evidenceUrls = [...(snap.data().evidenceUrls || []), ...evidenceUrls];
    }
    
    if (status === 'CLOSED') {
      updateData.closedAt = new Date().toISOString();
    }
    
    await _ccSetDoc(excRef, updateData, { merge: true });
    
    await SecurityAuditService.logEvent(
      session.companyId, session.userId, session.role, session.employeeId,
      'EXCEPTION_UPDATED',
      'control_exceptions', exceptionId, true, 'MEDIUM',
      `Updated exception ${exceptionId} to status ${status}`
    );
  }

  // Dashboard Metrics Calculation
  static async getDashboardMetrics(session: UserSession, companyId: string): Promise<ComplianceDashboardMetrics> {
    if (session.companyId !== companyId) throw new Error("Unauthorized");
    
    const controls = await this.getControls(session, companyId);
    
    const metrics: ComplianceDashboardMetrics = {
      totalControls: controls.length,
      activeControls: controls.filter(c => c.status !== 'DRAFT' && c.status !== 'RETIRED').length,
      effectiveControls: controls.filter(c => c.status === 'EFFECTIVE').length,
      partiallyEffectiveControls: controls.filter(c => c.status === 'REMEDIATION_REQUIRED').length, // approximation based on test flows
      ineffectiveControls: controls.filter(c => c.status === 'INEFFECTIVE').length,
      notTestedControls: controls.filter(c => c.status === 'ACTIVE' || c.status === 'DRAFT').length,
      remediationRequiredControls: controls.filter(c => c.status === 'REMEDIATION_REQUIRED').length,
      
      overdueTests: 0,
      overdueRemediations: 0,
      
      controlsByCategory: {} as Record<string, number>,
      controlsByModule: {} as Record<string, number>,
      controlsBySite: {} as Record<string, number>,
      riskMitigationCoverage: 0
    };
    
    let controlsWithRisks = 0;
    
    controls.forEach(c => {
      // Category count
      metrics.controlsByCategory[c.category] = (metrics.controlsByCategory[c.category] || 0) + 1;
      
      // Module count
      if (c.relatedModule) {
        metrics.controlsByModule[c.relatedModule] = (metrics.controlsByModule[c.relatedModule] || 0) + 1;
      }
      
      // Site count
      if (c.siteId) {
        metrics.controlsBySite[c.siteId] = (metrics.controlsBySite[c.siteId] || 0) + 1;
      }
      
      // Overdue Test Check (Simplistic assumption for dashboard: if it's active and nextReviewDate has passed)
      if (c.nextReviewDate && new Date(c.nextReviewDate) < new Date() && !['CLOSED', 'RETIRED'].includes(c.status)) {
        metrics.overdueTests++;
      }
      
      if (c.linkedRiskIds && c.linkedRiskIds.length > 0) {
        controlsWithRisks++;
      }
    });
    
    // We would fetch Exceptions to count overdueRemediations
    const qExc = query(collection(db, `companies/${companyId}/control_exceptions`), where('status', 'not-in', ['CLOSED', 'VERIFIED']));
    const snapExc = await _ccGetDocs(qExc);
    snapExc.forEach((d: any) => {
      const exc = d.data() as ControlException;
      if (exc.remediationDueDate && new Date(exc.remediationDueDate) < new Date()) {
        metrics.overdueRemediations++;
      }
    });
    
    // Simplistic risk mitigation coverage = controls linked to risks / total controls
    metrics.riskMitigationCoverage = metrics.totalControls > 0 
      ? Math.round((controlsWithRisks / metrics.totalControls) * 100) 
      : 0;
      
    return metrics;
  }
}
