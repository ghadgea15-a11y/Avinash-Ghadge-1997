import { collection, doc, setDoc, getDocs, getDoc, query, orderBy, limit, where, runTransaction } from 'firebase/firestore';
import { db } from '../firebase';
import { 
  SecurityAssuranceRun, 
  SecurityFinding, 
  ReleaseGateSignOff,
  UserSession,
  SecurityFindingStatus
} from '../types';
import { SecurityAuditService } from './securityAuditService';

let _runTransactionMock: any = null;
export function _setRunTransactionMockSec(mock: any) { _runTransactionMock = mock; }
let _auditLogMock: any = null;
export function _setAuditLogMockSec(mock: any) { _auditLogMock = mock; }
let _getDocsMock: any = null;
export function _setGetDocsMockSec(mock: any) { _getDocsMock = mock; }

export class SecurityAssuranceService {
  /**
   * Evaluates the latest test results and generates a deterministic assurance run
   */
  static async executeReleaseGateRun(
    session: UserSession, 
    version: string, 
    testResults: any[],
    webBuildStatus: 'PASS' | 'FAIL' | 'UNKNOWN' = 'PASS',
    androidBuildStatus: 'PASS' | 'FAIL' | 'UNKNOWN' = 'PASS'
  ): Promise<SecurityAssuranceRun> {
    
    // Authorization Check: Must be Super Admin or System
    if (session.role !== 'SUPER_ADMIN' && (session.role as unknown as string) !== 'SYSTEM' && session.role !== 'HR_ADMIN') {
        throw new Error('Unauthorized role for executing Release Gate.');
    }

    const companyId = session.companyId;
    const runId = `RUN-${Date.now()}`;
    const now = new Date().toISOString();
    
    let totalChecks = testResults.length;
    let passed = 0;
    let failed = 0;
    const findings: SecurityFinding[] = [];
    
    // Evaluate results
    testResults.forEach((test, index) => {
      if (test.passed) {
        passed++;
      } else {
        failed++;
        findings.push({
          id: `FND-${runId}-${index}`,
          companyId,
          runId,
          checkId: test.checkId || `CHK-${index}`,
          module: test.module || 'CORE',
          testName: test.name,
          severity: test.severity || 'HIGH',
          failureReason: test.message || test.error || 'Check failed',
          affectedResource: test.affectedResource || 'System',
          status: 'DETECTED',
          timestamp: now,
          updatedAt: now
        });
      }
    });

    let status: 'PASS' | 'FAIL' | 'BLOCKED' = 'PASS';
    if (failed > 0 || webBuildStatus === 'FAIL' || androidBuildStatus === 'FAIL') {
      const hasCritical = findings.some(f => f.severity === 'CRITICAL');
      status = hasCritical ? 'BLOCKED' : 'FAIL';
    }

    const runRecord: SecurityAssuranceRun = {
      id: runId,
      companyId,
      version,
      status,
      totalChecks,
      passed,
      failed,
      blocked: status === 'BLOCKED' ? 1 : 0, 
      findings,
      executedAt: now,
      signOffStatus: 'PENDING',
      webBuildStatus,
      androidBuildStatus
    };

    // Transactionally save Run and Findings
    if (_runTransactionMock) {
        await _runTransactionMock(db, async () => { return runRecord; });
    } else {
        await runTransaction(db, async (transaction) => {
            const runRef = doc(db, 'companies', companyId, 'security_assurance_runs', runId);
            transaction.set(runRef, runRecord);
            
            for (const finding of findings) {
                const findingRef = doc(db, 'companies', companyId, 'security_findings', finding.id);
                transaction.set(findingRef, finding);
            }
        });
    }

    // Audit Log
    if (_auditLogMock) {
        await _auditLogMock(
            companyId, session.userId, session.role, session.employeeId, 'SECURITY_ASSURANCE_RUN_COMPLETED', 'AssuranceRun', runId, status !== 'BLOCKED', `Executed Security Assurance Run for version ${version}. Result: ${status}. Passed: ${passed}, Failed: ${failed}`
        );
    } else {
        await SecurityAuditService.logEvent(
            companyId,
            session.userId,
            session.role,
            session.employeeId,
            'SECURITY_ASSURANCE_RUN_COMPLETED',
            'AssuranceRun',
            runId,
            status !== 'BLOCKED',
            'HIGH',
            `Executed Security Assurance Run for version ${version}. Result: ${status}. Passed: ${passed}, Failed: ${failed}`
        );
    }

    return runRecord;
  }

  /**
   * Update Finding Status (Remediation Workflow)
   */
  static async updateFindingStatus(
    session: UserSession,
    findingId: string,
    newStatus: SecurityFindingStatus,
    notes?: string,
    assignedTo?: string
  ): Promise<boolean> {
    if (session.role !== 'SUPER_ADMIN' && session.role !== 'COMPANY_ADMIN' && session.role !== 'HR_ADMIN') {
      throw new Error('Unauthorized role for finding remediation.');
    }

    const findingRef = doc(db, 'companies', session.companyId, 'security_findings', findingId);
    
    try {
      if (_runTransactionMock) {
          await _runTransactionMock(db, async () => { return true; });
      } else {
          await runTransaction(db, async (transaction) => {
            const snap = await transaction.get(findingRef);
            if (!snap.exists()) throw new Error('Finding not found');
            
            const updates: any = {
              status: newStatus,
              updatedAt: new Date().toISOString()
            };
            if (notes) updates.remediationNotes = notes;
            if (assignedTo) updates.assignedTo = assignedTo;

            transaction.update(findingRef, updates);
          });
      }

      if (_auditLogMock) {
          await _auditLogMock(session.companyId, session.userId, session.role, session.employeeId, 'SECURITY_FINDING_UPDATED', 'SecurityFinding', findingId, true, `Updated finding ${findingId} to ${newStatus}`);
      } else {
          await SecurityAuditService.logEvent(
            session.companyId,
            session.userId,
            session.role,
            session.employeeId,
            'SECURITY_FINDING_UPDATED',
            'SecurityFinding',
            findingId,
            true,
            'MEDIUM',
            `Updated finding ${findingId} to ${newStatus}`
          );
      }
      
      return true;
    } catch (err) {
      console.error('[SecurityAssuranceService] Failed to update finding:', err);
      return false;
    }
  }

  /**
   * Formal Production Sign-Off
   */
  static async signOffRelease(
    session: UserSession,
    runId: string,
    decision: 'APPROVED' | 'REJECTED',
    comments?: string
  ): Promise<ReleaseGateSignOff> {
    if (session.role !== 'SUPER_ADMIN') {
      throw new Error('Unauthorized: Only SUPER_ADMIN can sign off on production releases.');
    }

    const runRef = doc(db, 'companies', session.companyId, 'security_assurance_runs', runId);
    
    const signOffId = `SIGNOFF-${Date.now()}`;
    const now = new Date().toISOString();

    let signOff: ReleaseGateSignOff;

    if (_runTransactionMock) {
        signOff = await _runTransactionMock(db, async () => {
            return {
                id: signOffId,
                companyId: session.companyId,
                runId,
                reviewerId: session.userId,
                reviewerRole: session.role,
                reviewerName: session.fullName,
                timestamp: now,
                version: 'vMock',
                securityResult: 'PASS',
                approvalDecision: decision,
                comments
            };
        });
    } else {
        signOff = await runTransaction(db, async (transaction) => {
            const runSnap = await transaction.get(runRef);
            if (!runSnap.exists()) throw new Error('Run not found');
            
            const run = runSnap.data() as SecurityAssuranceRun;
            
            if (run.status === 'BLOCKED' && decision === 'APPROVED') {
                throw new Error('Cannot sign off on a BLOCKED release. Critical findings must be resolved and retested.');
            }
            
            const so: ReleaseGateSignOff = {
                id: signOffId,
                companyId: session.companyId,
                runId,
                reviewerId: session.userId,
                reviewerRole: session.role,
                reviewerName: session.fullName,
                timestamp: now,
                version: run.version,
                securityResult: run.status,
                approvalDecision: decision,
                comments
            };

            const signOffRef = doc(db, 'companies', session.companyId, 'production_signoffs', signOffId);
            
            transaction.set(signOffRef, so);
            transaction.update(runRef, { 
                signOffStatus: 'SIGNED_OFF',
                signOffId
            });

            return so;
        });
    }

    if (_auditLogMock) {
        await _auditLogMock(session.companyId, session.userId, session.role, session.employeeId, 'PRODUCTION_SIGN_OFF', 'ReleaseGateSignOff', signOff.id, true, `${decision} production release ${signOff.version} for run ${runId}`);
    } else {
        await SecurityAuditService.logEvent(
            session.companyId,
            session.userId,
            session.role,
            session.employeeId,
            'PRODUCTION_SIGN_OFF',
            'ReleaseGateSignOff',
            signOff.id,
            true,
            'CRITICAL',
            `${decision} production release ${signOff.version} for run ${runId}`
        );
    }
    
    return signOff;
  }

  /**
   * Dashboard Data Retrieval
   */
  static async getLatestAssuranceRun(companyId: string): Promise<SecurityAssuranceRun | null> {
    if (_getDocsMock) {
        const docs = await _getDocsMock();
        return docs.length > 0 ? docs[0].data() : null;
    }
    
    const q = query(
      collection(db, 'companies', companyId, 'security_assurance_runs'),
      orderBy('executedAt', 'desc'),
      limit(1)
    );
    const snap = await getDocs(q);
    return snap.empty ? null : (snap.docs[0].data() as SecurityAssuranceRun);
  }

  static async getOpenFindings(companyId: string): Promise<SecurityFinding[]> {
    if (_getDocsMock) {
        const docs = await _getDocsMock();
        return docs.map((d: any) => d.data());
    }

    const q = query(
      collection(db, 'companies', companyId, 'security_findings'),
      where('status', 'in', ['DETECTED', 'ASSIGNED', 'IN_PROGRESS', 'RETEST_PENDING'])
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data() as SecurityFinding);
  }
}
