import { UserSession } from '../types';
import { RiskManagementService, _setGetDocsMockRsk, _setGetDocMockRsk, _setSetDocMockRsk, _setUpdateDocMockRsk, _setWriteBatchMockRsk } from '../services/riskManagementService';
import { ComplianceViolationRecord } from '../types/compliance';

export async function runRiskManagementVerification(): Promise<{ passed: number; failed: number; errors: string[] }> {
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

  console.log('\n🔒 RUNNING ENTERPRISE RISK MANAGEMENT & ASSESSMENT VERIFICATION SUITE...\n');

  // Mocks setup
  let memoryStore: Record<string, any> = {};

  _setGetDocsMockRsk(async (queryOrRef: any) => {
    // Return values from memory store dynamically
    const docs = Object.keys(memoryStore).filter(k => k.includes('risk')).map(k => ({
      data: () => memoryStore[k]
    }));
    return { docs, empty: docs.length === 0, forEach: (cb: any) => docs.forEach(cb) };
  });

  _setGetDocMockRsk(async (ref: any) => {
    const path = (ref.path || ref._key?.path?.segments?.join('/') || 'test/mock');
    const data = memoryStore[path];
    return {
      exists: () => !!data,
      data: () => data
    };
  });

  _setSetDocMockRsk(async (ref: any, data: any, options: any) => {
    const path = (ref.path || ref._key?.path?.segments?.join('/') || 'test/mock');
    memoryStore[path] = options?.merge && memoryStore[path] ? { ...memoryStore[path], ...data } : data;
  });

  _setUpdateDocMockRsk(async (ref: any, data: any) => {
    const path = (ref.path || ref._key?.path?.segments?.join('/') || 'test/mock');
    memoryStore[path] = { ...memoryStore[path], ...data };
  });
  
  _setWriteBatchMockRsk((db: any) => {
    return {
      set: (ref: any, data: any) => {
        const path = (ref.path || ref._key?.path?.segments?.join('/') || 'test/mock');
        memoryStore[path] = data;
      },
      update: (ref: any, data: any) => {
        const path = (ref.path || ref._key?.path?.segments?.join('/') || 'test/mock');
        memoryStore[path] = { ...memoryStore[path], ...data };
      },
      commit: async () => {}
    };
  });

  // Sessions
  const superAdminSession: UserSession = {
    userId: 'SA-1', employeeId: 'E-SA-1', fullName: 'Super Admin', email: 'sa@test.com',
    role: 'SUPER_ADMIN', companyId: 'COMP-A', branchId: 'BR-A', loginMode: 'PASSWORD',
    token: 'tk', tokenExpiresAt: 0, isBiometricEnabled: false, lastActiveAt: 0
  };

  const hrAdminSession: UserSession = {
    userId: 'HR-1', employeeId: 'E-HR-1', fullName: 'HR Admin', email: 'hr@test.com',
    role: 'HR_ADMIN', companyId: 'COMP-A', branchId: 'BR-A', loginMode: 'PASSWORD',
    token: 'tk', tokenExpiresAt: 0, isBiometricEnabled: false, lastActiveAt: 0
  };
  
  const unauthSession: UserSession = {
    userId: 'EMP-1', employeeId: 'E-EMP-1', fullName: 'Standard Employee', email: 'emp@test.com',
    role: 'EMPLOYEE', companyId: 'COMP-A', branchId: 'BR-A', loginMode: 'PASSWORD',
    token: 'tk', tokenExpiresAt: 0, isBiometricEnabled: false, lastActiveAt: 0
  };

  const managerSessionCompB: UserSession = {
    userId: 'MGR-B', employeeId: 'E-MGR-B', fullName: 'Manager B', email: 'mgr@compB.com',
    role: 'OPS_MANAGER', companyId: 'COMP-B', branchId: 'BR-B', loginMode: 'PASSWORD',
    token: 'tk', tokenExpiresAt: 0, isBiometricEnabled: false, lastActiveAt: 0
  };

  // ------------------------------------------------------------------
  // 1. Risk Scoring & Detection
  // ------------------------------------------------------------------
  try {
    const mockViol: ComplianceViolationRecord = {
      id: 'V-100',
      companyId: 'COMP-A',
      policyId: 'POL-1',
      policyName: 'Data Export Ban',
      module: 'SECURITY',
      entityType: 'USER',
      entityId: 'EMP-X',
      severity: 'CRITICAL',
      riskScore: 0,
      evidence: 'Downloaded 5000 records',
      conditionsBroken: [],
      detectedAt: new Date().toISOString(),
      status: 'DETECTED',
      correlationId: 'C-100'
    };

    const risk = await RiskManagementService.identifyRiskFromViolation(superAdminSession, mockViol);
    assert(!!risk && risk.id === 'RSK-VIOL-V-100', 'Test 1.1: Risk record derived correctly from Policy Violation');
    assert(risk!.likelihood === 5 && risk!.impact === 4, 'Test 1.2: Deterministic risk severity mathematically maps to Likelihood 5 x Impact 4');
    assert(risk!.riskScore === 20, 'Test 1.3: Risk Score exactly calculates to 20');
    assert(risk!.severity === 'CRITICAL', 'Test 1.4: Score 20 natively resolves to CRITICAL severity');
    
    // Check memory store
    const riskDoc = memoryStore['companies/COMP-A/risk_records/RSK-VIOL-V-100'];
    assert(!!riskDoc && riskDoc.status === 'IDENTIFIED', 'Test 1.5: Risk automatically persisted to Risk Register with IDENTIFIED status');

  } catch (err: any) {
    assert(false, 'Test 1: Risk Scoring & Detection', err.message);
  }

  // ------------------------------------------------------------------
  // 2. Risk Administration & RBAC
  // ------------------------------------------------------------------
  try {
    const riskId = 'RSK-VIOL-V-100';
    
    // Standard employee blocked
    let empBlocked = false;
    try {
      await RiskManagementService.assessRisk(unauthSession, 'COMP-A', riskId, 3, 3);
    } catch (e: any) {
      if (e.message.includes('Unauthorized')) empBlocked = true;
    }
    assert(empBlocked, 'Test 2.1: Unauthorized role strictly blocked from Assessing Risk');

    // Cross-tenant blocked
    let crossBlocked = false;
    try {
      await RiskManagementService.assessRisk(managerSessionCompB, 'COMP-A', riskId, 3, 3);
    } catch (e: any) {
      if (e.message.includes('Unauthorized')) crossBlocked = true;
    }
    assert(crossBlocked, 'Test 2.2: Cross-tenant manager blocked from Assessing Company A Risk');

    // HR Admin allows
    await RiskManagementService.assessRisk(hrAdminSession, 'COMP-A', riskId, 4, 3, 'HR-1');
    const updatedRisk = memoryStore[`companies/COMP-A/risk_records/${riskId}`];
    assert(updatedRisk.status === 'ASSESSED' && updatedRisk.riskScore === 12, 'Test 2.3: HR Admin successfully assessed risk, score updated to 12 (HIGH)');
    
  } catch (err: any) {
    assert(false, 'Test 2: Risk Administration RBAC', err.message);
  }

  // ------------------------------------------------------------------
  // 3. Mitigation & Lifecycle
  // ------------------------------------------------------------------
  try {
    const riskId = 'RSK-VIOL-V-100';
    
    // Add Mitigation
    const mitId = await RiskManagementService.addMitigationAction(hrAdminSession, 'COMP-A', riskId, {
      title: 'Revoke Access',
      description: 'Revoke system export rights',
      priority: 'HIGH',
      assignedToRole: 'HR_ADMIN',
      targetDate: new Date(Date.now() + 86400000).toISOString() // tomorrow
    });
    
    assert(!!mitId, 'Test 3.1: Mitigation action successfully created');
    
    let riskDoc = memoryStore[`companies/COMP-A/risk_records/${riskId}`];
    assert(riskDoc.status === 'MITIGATION_REQUIRED', 'Test 3.2: Risk status automatically transitioned to MITIGATION_REQUIRED');

    // Update Mitigation
    await RiskManagementService.updateMitigationStatus(hrAdminSession, 'COMP-A', mitId, 'IN_PROGRESS');
    let mitDoc = memoryStore[`companies/COMP-A/risk_mitigations/${mitId}`];
    riskDoc = memoryStore[`companies/COMP-A/risk_records/${riskId}`];
    
    assert(mitDoc.status === 'IN_PROGRESS', 'Test 3.3: Mitigation status updated to IN_PROGRESS');
    assert(riskDoc.status === 'MITIGATION_IN_PROGRESS', 'Test 3.4: Risk status automatically transitioned to MITIGATION_IN_PROGRESS');

    // Verify Mitigation
    await RiskManagementService.updateMitigationStatus(hrAdminSession, 'COMP-A', mitId, 'VERIFIED', 'Rights revoked confirmed');
    mitDoc = memoryStore[`companies/COMP-A/risk_mitigations/${mitId}`];
    riskDoc = memoryStore[`companies/COMP-A/risk_records/${riskId}`];

    assert(mitDoc.status === 'VERIFIED' && !!mitDoc.completedAt, 'Test 3.5: Mitigation verified and timestamped');
    assert(riskDoc.status === 'MONITORING', 'Test 3.6: Risk status safely transitioned to MONITORING');

    // Close Risk
    await RiskManagementService.closeRisk(superAdminSession, 'COMP-A', riskId, 'Issue permanently resolved');
    riskDoc = memoryStore[`companies/COMP-A/risk_records/${riskId}`];
    
    assert(riskDoc.status === 'CLOSED', 'Test 3.7: Risk formally CLOSED by Super Admin');

  } catch (err: any) {
    assert(false, 'Test 3: Mitigation & Lifecycle', err.message);
  }

  console.log(`\n======================================================`);
  console.log(`🎯 RISK MANAGEMENT RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log(`======================================================\n`);

  return { passed, failed, errors };
}

// Auto-run if executed directly
if (typeof window === 'undefined') {
  runRiskManagementVerification().catch((err) => {
    console.error(err);
    if (typeof process !== 'undefined' && process.exit) {
      process.exit(1);
    }
  });
}
