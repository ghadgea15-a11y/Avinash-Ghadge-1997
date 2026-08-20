import { UserSession, SecurityDetectionRule, SecurityEventRecord } from '../types';
import { ContinuousMonitoringService, _setGetDocsMockCM, _setSetDocMockCM, _setUpdateDocMockCM, _setRunTransactionMockCM } from '../services/continuousMonitoringService';
import { SecurityAuditService, _setSetDocMock } from '../services/securityAuditService';

export async function runContinuousMonitoringVerification(): Promise<{ passed: number; failed: number; errors: string[] }> {
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

  console.log('\n🔒 RUNNING CONTINUOUS SECURITY MONITORING & RISK DETECTION VERIFICATION SUITE...\n');

  // Mocks setup
  const superAdminSession: UserSession = {
    userId: 'U-SUPER', employeeId: 'EMP-S', fullName: 'Super Admin', email: 'sa@test.com',
    role: 'SUPER_ADMIN', companyId: 'COMP-CM', branchId: 'BR-1', loginMode: 'PASSWORD',
    token: 'tk', tokenExpiresAt: 0, isBiometricEnabled: false, lastActiveAt: 0
  };
  const hrAdminSession: UserSession = {
    userId: 'U-HR', employeeId: 'EMP-HR', fullName: 'HR Admin', email: 'hr@test.com',
    role: 'HR_ADMIN', companyId: 'COMP-CM', branchId: 'BR-1', loginMode: 'PASSWORD',
    token: 'tk', tokenExpiresAt: 0, isBiometricEnabled: false, lastActiveAt: 0
  };
  const employeeSession: UserSession = {
    userId: 'U-EMP', employeeId: 'EMP-E', fullName: 'Employee', email: 'emp@test.com',
    role: 'EMPLOYEE', companyId: 'COMP-CM', branchId: 'BR-1', loginMode: 'PASSWORD',
    token: 'tk', tokenExpiresAt: 0, isBiometricEnabled: false, lastActiveAt: 0
  };

  const savedRules: any[] = [];
  const savedRiskEvents: any[] = [];
  let fetchedEventCount = 0;
  let hasDuplicateRiskEvent = false;

  _setSetDocMockCM(async (ref: any, data: any) => {
    if (ref.path.includes('security_detection_rules')) savedRules.push(data);
    if (ref.path.includes('detected_risk_events')) savedRiskEvents.push(data);
  });
  
  _setUpdateDocMockCM(async (ref: any, data: any) => {
    const ev = savedRiskEvents.find(e => ref.path.includes(e.id));
    if (ev) {
      Object.assign(ev, data);
    }
  });

  _setGetDocsMockCM(async (query: any) => {
    if (query._query?.path?.segments?.includes('security_detection_rules')) {
       return { docs: savedRules.map(r => ({ data: () => r })) };
    }
    if (query._query?.path?.segments?.includes('security_events')) {
       // Return fake events based on fetchedEventCount
       return { docs: Array(fetchedEventCount).fill(0).map(() => ({ data: () => ({}) })) };
    }
    if (query._query?.path?.segments?.includes('detected_risk_events')) {
       return { empty: !hasDuplicateRiskEvent };
    }
    return { docs: [] };
  });

  try {
    console.log('--- 1. DETECTION ENGINE CONFIGURATION ---');
    try {
        await ContinuousMonitoringService.createDetectionRule(employeeSession, {
            name: 'Failed Logins',
            eventType: 'AUTH_FAILED_LOGIN',
            description: 'Too many failed logins',
            condition: 'COUNT_GREATER_THAN_EQUAL',
            threshold: 5,
            timeWindowMinutes: 15,
            severity: 'HIGH',
            riskCategory: 'SECURITY_ANOMALY',
            enabled: true,
            effectiveDate: '2020-01-01T00:00:00Z'
        });
        assert(false, 'Test 1.1: Unauthorized role should be blocked from configuring rules');
    } catch (e) {
        assert(true, 'Test 1.1: Rule configuration correctly blocked for non-super-admins');
    }

    const rule1 = await ContinuousMonitoringService.createDetectionRule(superAdminSession, {
        name: 'Repeated Failed Logins',
        eventType: 'AUTH_FAILED_LOGIN',
        description: '5 failed logins in 15 mins',
        condition: 'COUNT_GREATER_THAN_EQUAL',
        threshold: 5,
        timeWindowMinutes: 15,
        severity: 'HIGH',
        riskCategory: 'SECURITY_ANOMALY',
        enabled: true,
        effectiveDate: '2020-01-01T00:00:00Z'
    });

    assert(rule1.id.startsWith('RULE-'), 'Test 1.2: Super Admin successfully created Detection Rule');
    assert(savedRules.length === 1, 'Test 1.3: Rule persisted correctly');

    console.log('--- 2. EVENT EVALUATION & THRESHOLDS ---');
    const triggerEvent: SecurityEventRecord = {
        eventId: 'EVT-1',
        companyId: 'COMP-CM',
        userId: 'U-HACKER',
        role: 'UNKNOWN',
        action: 'AUTH_FAILED_LOGIN',
        resource: 'auth',
        resourceId: 'sys',
        timestamp: new Date().toISOString(),
        severity: 'LOW',
        source: 'Web',
        success: false
    };

    // Under threshold
    fetchedEventCount = 4;
    hasDuplicateRiskEvent = false;
    await ContinuousMonitoringService.evaluateEvent('COMP-CM', triggerEvent);
    assert(savedRiskEvents.length === 0, 'Test 2.1: Evaluation below threshold does NOT trigger risk event');

    // Meets threshold
    fetchedEventCount = 5;
    await ContinuousMonitoringService.evaluateEvent('COMP-CM', triggerEvent);
    assert(savedRiskEvents.length === 1, 'Test 2.2: Evaluation meeting threshold correctly triggers CRITICAL/HIGH risk event');
    assert(savedRiskEvents[0].severity === 'HIGH', 'Test 2.3: Detected risk correctly classified by rule severity (HIGH)');
    assert(savedRiskEvents[0].status === 'DETECTED', 'Test 2.4: Detected risk initializes in DETECTED state');

    // Duplicate check
    hasDuplicateRiskEvent = true;
    fetchedEventCount = 6;
    await ContinuousMonitoringService.evaluateEvent('COMP-CM', triggerEvent);
    assert(savedRiskEvents.length === 1, 'Test 2.5: Duplicate risk events within the time window are prevented via idempotent check');

    console.log('--- 3. LIFECYCLE MANAGEMENT ---');
    const riskId = savedRiskEvents[0].id;
    
    const updateFail = await ContinuousMonitoringService.updateRiskEventStatus(employeeSession, riskId, 'INVESTIGATION').catch(() => false);
    assert(updateFail === false, 'Test 3.1: Unauthorized role blocked from updating risk event status');

    const updateSuccess = await ContinuousMonitoringService.updateRiskEventStatus(superAdminSession, riskId, 'INVESTIGATION', 'Looking into this');
    assert(updateSuccess === true, 'Test 3.2: Authorized role successfully transitions risk to INVESTIGATION');
    assert(savedRiskEvents[0].status === 'INVESTIGATION', 'Test 3.3: Risk event status updated in storage');
    assert(savedRiskEvents[0].investigationNotes === 'Looking into this', 'Test 3.4: Investigation notes appended successfully');

    await ContinuousMonitoringService.updateRiskEventStatus(superAdminSession, riskId, 'REMEDIATION', 'Password reset enforced');
    assert(savedRiskEvents[0].status === 'REMEDIATION', 'Test 3.5: Risk event transitioned to REMEDIATION');
    assert(savedRiskEvents[0].remediation === 'Password reset enforced', 'Test 3.6: Remediation notes appended successfully');

    await ContinuousMonitoringService.updateRiskEventStatus(superAdminSession, riskId, 'CLOSED', 'User verified');
    assert(savedRiskEvents[0].status === 'CLOSED', 'Test 3.7: Risk event properly CLOSED');
    assert(savedRiskEvents[0].closedAt !== undefined, 'Test 3.8: ClosedAt timestamp applied immutably');

  } catch (err: any) {
    assert(false, 'Overall Verification', err.message);
  }

  console.log(`\n======================================================`);
  console.log(`🎯 CONTINUOUS MONITORING RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log(`======================================================\n`);

  return { passed, failed, errors };
}

if (typeof window === 'undefined') {
  runContinuousMonitoringVerification().catch(err => {
    console.error(err);
    if (typeof process !== 'undefined' && process.exit) {
      process.exit(1);
    }
  });
}
