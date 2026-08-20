import { UserSession, RiskRecord, RiskMitigationAction } from '../types';
import { RiskManagementService, _setGetDocsMockRsk, _setGetDocMockRsk, _setWriteBatchMockRsk, _setUpdateDocMockRsk } from '../services/riskManagementService';
import { SecurityAuditService, _setSetDocMock } from '../services/securityAuditService';

export async function runRiskRegisterVerification(): Promise<{ passed: number; failed: number; errors: string[] }> {
  let passed = 0;
  let failed = 0;
  const errors: string[] = [];

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`  ✅ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${testName}${detail ? ` - ${detail}` : ''}`);
      failed++;
      errors.push(`${testName}${detail ? `: ${detail}` : ''}`);
    }
  }

  console.log('\n🔒 RUNNING RISK REGISTER & TREATMENT VERIFICATION SUITE...\n');

  const superAdminSession: UserSession = {
    userId: 'U-SUPER', employeeId: 'EMP-S', fullName: 'Super Admin', email: 'sa@test.com',
    role: 'SUPER_ADMIN', companyId: 'COMP-A', branchId: 'BR-1', loginMode: 'PASSWORD',
    token: 'tk', tokenExpiresAt: 0, isBiometricEnabled: false, lastActiveAt: 0
  };
  
  const hrAdminSession: UserSession = {
    userId: 'U-HR', employeeId: 'EMP-HR', fullName: 'HR Admin', email: 'hr@test.com',
    role: 'HR_ADMIN', companyId: 'COMP-A', branchId: 'BR-1', loginMode: 'PASSWORD',
    token: 'tk', tokenExpiresAt: 0, isBiometricEnabled: false, lastActiveAt: 0
  };

  const employeeSession: UserSession = {
    userId: 'U-EMP', employeeId: 'EMP-E', fullName: 'Employee', email: 'emp@test.com',
    role: 'EMPLOYEE', companyId: 'COMP-A', branchId: 'BR-1', loginMode: 'PASSWORD',
    token: 'tk', tokenExpiresAt: 0, isBiometricEnabled: false, lastActiveAt: 0
  };

  let mockRisk: any = {
    id: 'RSK-100',
    companyId: 'COMP-A',
    category: 'SECURITY_ANOMALY',
    status: 'IDENTIFIED',
    riskScore: 20,
    severity: 'CRITICAL',
    ownerId: 'U-HR',
    ownerRole: 'HR_ADMIN'
  };

  let mockMitigations: any[] = [];
  let batchOps: any[] = [];

  _setGetDocsMockRsk(async (q: any) => {
    return { docs: [ { data: () => mockRisk } ] };
  });

  _setSetDocMock(async () => {});
  _setUpdateDocMockRsk(async (ref: any, data: any) => {
    Object.assign(mockRisk, data);
  });

  _setGetDocMockRsk(async (ref: any) => {
    return { exists: () => true, data: () => mockRisk };
  });

  _setWriteBatchMockRsk(() => ({
    set: (ref: any, data: any) => batchOps.push({ type: 'set', ref, data }),
    update: (ref: any, data: any) => {
       batchOps.push({ type: 'update', ref, data });
       Object.assign(mockRisk, data);
    },
    commit: async () => {}
  }));

  try {
    console.log('--- 1. RISK TREATMENT STRATEGY ---');
    try {
        await RiskManagementService.updateRiskTreatment(employeeSession, 'COMP-A', 'RSK-100', 'MITIGATE', 'Firewall');
        assert(false, 'Test 1.1: Unauthorized role blocked from updating treatment');
    } catch(e) {
        assert(true, 'Test 1.1: Unauthorized role strictly blocked from updating treatment');
    }

    await RiskManagementService.updateRiskTreatment(superAdminSession, 'COMP-A', 'RSK-100', 'MITIGATE', 'Firewall rules');
    assert(mockRisk.treatmentStrategy === 'MITIGATE', 'Test 1.2: Treatment strategy correctly updated to MITIGATE');
    assert(mockRisk.status === 'TREATMENT_PLANNED', 'Test 1.3: Risk transitioned to TREATMENT_PLANNED state');

    console.log('--- 2. RISK OWNERSHIP REASSIGNMENT ---');
    await RiskManagementService.reassignRiskOwner(superAdminSession, 'COMP-A', 'RSK-100', 'U-NEW-HR', 'HR_ADMIN', 'Leave of absence');
    assert(mockRisk.ownerId === 'U-NEW-HR', 'Test 2.1: Risk successfully reassigned to new authorized owner');
    
    console.log('--- 3. PERIODIC REVIEW & RESIDUAL RISK ---');
    const revId = await RiskManagementService.recordRiskReview(superAdminSession, 'COMP-A', 'RSK-100', {
        currentLikelihood: 2,
        currentImpact: 4,
        currentRiskScore: 8,
        currentSeverity: 'MEDIUM',
        currentControls: 'MFA Enabled, VPN Enforced',
        evidence: 'Logs verified',
        decision: 'CONTINUE_MITIGATION'
    });
    
    assert(revId.startsWith('REV-'), 'Test 3.1: Review record created successfully');
    assert(mockRisk.residualSeverity === 'MEDIUM', 'Test 3.2: Residual severity applied to Risk record');
    assert(mockRisk.residualRiskScore === 8, 'Test 3.3: Residual score mapped properly');
    assert(mockRisk.status === 'RETEST', 'Test 3.4: CONTINUE_MITIGATION decision correctly transitions risk to RETEST status');

    console.log('--- 4. RISK ACCEPTANCE WORKFLOW ---');
    await RiskManagementService.recordRiskReview(superAdminSession, 'COMP-A', 'RSK-100', {
        currentLikelihood: 1,
        currentImpact: 4,
        currentRiskScore: 4,
        currentSeverity: 'LOW',
        currentControls: 'Accepted residual',
        evidence: 'Business sign-off',
        decision: 'ACCEPT_RISK',
        nextReviewDate: '2027-01-01T00:00:00Z'
    });
    assert(mockRisk.status === 'ACCEPTED', 'Test 4.1: ACCEPT_RISK decision correctly transitions risk to ACCEPTED');
    assert(mockRisk.acceptedBy === 'U-SUPER', 'Test 4.2: Acceptor identity is securely recorded');
    assert(mockRisk.acceptanceExpiryDate === '2027-01-01T00:00:00Z', 'Test 4.3: Acceptance expiry/review date properly established');

  } catch (err: any) {
    assert(false, 'Overall Verification', err.message);
  }

  console.log(`\n======================================================`);
  console.log(`🎯 RISK REGISTER RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log(`======================================================\n`);

  return { passed, failed, errors };
}

if (typeof window === 'undefined') {
  runRiskRegisterVerification().catch(err => {
    console.error(err);
    if (typeof process !== 'undefined' && process.exit) {
      process.exit(1);
    }
  });
}
