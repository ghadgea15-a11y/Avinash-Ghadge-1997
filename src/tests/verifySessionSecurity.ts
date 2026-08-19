import { UserSession } from '../types';
import { SessionSecurityService, PrivilegedActionType } from '../services/sessionSecurityService';
import { AccountProtectionService } from '../services/accountProtectionService';
import { SecurityAuditService, _setSetDocMock } from '../services/securityAuditService';

export interface TestResult {
  suite: string;
  name: string;
  passed: boolean;
  error?: string;
}

export async function runSessionSecurityVerification(): Promise<{ passed: boolean; results: TestResult[] }> {
  const results: TestResult[] = [];
  const loggedSecurityEvents: any[] = [];

  // Mock SecurityAuditService _setDoc to capture audit records
  _setSetDocMock(async (ref: any, data: any) => {
    loggedSecurityEvents.push({ path: ref?.path || 'mock', data });
  });

  const createMockSession = (partial: Partial<UserSession>): UserSession => ({
    userId: 'USER-001',
    employeeId: 'EMP-001',
    fullName: 'Test User',
    email: 'test@company.com',
    role: 'SUPPORT',
    companyId: 'CORP-ALPHA',
    branchId: 'SITE-MAIN',
    token: 'mock-token-xyz',
    tokenExpiresAt: Date.now() + 3600000,
    isBiometricEnabled: false,
    lastActiveAt: Date.now(),
    loginMode: 'PASSWORD',
    authorityLevel: 'A9_SUPPORT',
    dataScope: 'SELF',
    ...partial
  });

  // Test 1: Stale / Expired Session Detection
  try {
    const expiredSession = createMockSession({
      tokenExpiresAt: Date.now() - 1000 // Expired 1 second ago
    });
    const val = await SessionSecurityService.validateSession(expiredSession);
    const passed = !val.valid && val.isStale;
    results.push({
      suite: 'Session Security',
      name: 'Detect Stale / Expired Session',
      passed,
      error: passed ? undefined : 'Failed to identify expired session token'
    });
  } catch (err: any) {
    results.push({ suite: 'Session Security', name: 'Detect Stale / Expired Session', passed: false, error: err.message });
  }

  // Test 2: Valid Session Passes Verification
  try {
    const activeSession = createMockSession({
      role: 'GUARD',
      tokenExpiresAt: Date.now() + 3600000
    });
    const val = await SessionSecurityService.validateSession(activeSession);
    const passed = val.valid && !val.isStale && !val.isTampered;
    results.push({
      suite: 'Session Security',
      name: 'Valid Session Verification',
      passed,
      error: passed ? undefined : 'Active session incorrectly rejected'
    });
  } catch (err: any) {
    results.push({ suite: 'Session Security', name: 'Valid Session Verification', passed: false, error: err.message });
  }

  // Test 3: Account Protection - Progressive Lockout on Repeated Failed Logins
  try {
    const testId = `test_lock_${Date.now()}@muster.com`;
    const companyId = 'CORP-ALPHA';

    // 1st failed attempt
    const r1 = await AccountProtectionService.recordFailedLogin(companyId, testId);
    // 2nd failed attempt
    const r2 = await AccountProtectionService.recordFailedLogin(companyId, testId);
    // 3rd failed attempt
    const r3 = await AccountProtectionService.recordFailedLogin(companyId, testId);
    // 4th failed attempt
    const r4 = await AccountProtectionService.recordFailedLogin(companyId, testId);
    // 5th failed attempt -> Triggers lockout
    const r5 = await AccountProtectionService.recordFailedLogin(companyId, testId);

    const lockStatus = await AccountProtectionService.isAccountLocked(companyId, testId);

    const passed = r5.locked && lockStatus.locked && (lockStatus.remainingMinutes || 0) > 0;
    results.push({
      suite: 'Account Protection',
      name: 'Progressive Account Lockout (5 Failed Attempts)',
      passed,
      error: passed ? undefined : 'Account was not locked after 5 failed login attempts'
    });

    // Test 4: Reset Lockout on Successful Authentication
    await AccountProtectionService.recordSuccessfulLogin(companyId, testId);
    const unlockedStatus = await AccountProtectionService.isAccountLocked(companyId, testId);
    const resetPassed = !unlockedStatus.locked;
    results.push({
      suite: 'Account Protection',
      name: 'Account Lock Reset on Successful Login',
      passed: resetPassed,
      error: resetPassed ? undefined : 'Account remained locked after successful login'
    });
  } catch (err: any) {
    results.push({ suite: 'Account Protection', name: 'Progressive Account Lockout', passed: false, error: err.message });
  }

  // Test 5: Privileged Action Protection - Unauthorized Role Blocked
  try {
    const guardSession = createMockSession({
      role: 'GUARD',
      authorityLevel: 'A9_SUPPORT',
      companyId: 'CORP-ALPHA'
    });

    const privCheck = await SessionSecurityService.verifyPrivilegedAction(
      guardSession,
      'ROLE_CHANGE' as PrivilegedActionType
    );

    const passed = !privCheck.allowed;
    results.push({
      suite: 'Privileged Action Protection',
      name: 'Guard Blocked from Role Modification',
      passed,
      error: passed ? undefined : 'Unauthorized role was permitted to modify roles'
    });
  } catch (err: any) {
    results.push({ suite: 'Privileged Action Protection', name: 'Guard Blocked from Role Modification', passed: false, error: err.message });
  }

  // Test 6: Privileged Action Protection - Super Admin Allowed
  try {
    const superAdminSession = createMockSession({
      role: 'SUPER_ADMIN',
      authorityLevel: 'A0_OWNER',
      companyId: 'GLOBAL_ADMIN'
    });

    const privCheck = await SessionSecurityService.verifyPrivilegedAction(
      superAdminSession,
      'SECURITY_SETTINGS' as PrivilegedActionType
    );

    const passed = privCheck.allowed;
    results.push({
      suite: 'Privileged Action Protection',
      name: 'Super Admin Permitted for Security Settings',
      passed,
      error: passed ? undefined : 'Super admin was blocked from security settings'
    });
  } catch (err: any) {
    results.push({ suite: 'Privileged Action Protection', name: 'Super Admin Permitted for Security Settings', passed: false, error: err.message });
  }

  // Test 7: Privileged Action Protection - BPM Administration Verification
  try {
    const employeeSession = createMockSession({
      role: 'SUPPORT',
      authorityLevel: 'A9_SUPPORT',
      companyId: 'CORP-ALPHA'
    });

    const bpmCheck = await SessionSecurityService.verifyPrivilegedAction(
      employeeSession,
      'BPM_ADMINISTRATION' as PrivilegedActionType
    );

    const passed = !bpmCheck.allowed;
    results.push({
      suite: 'Privileged Action Protection',
      name: 'Employee Blocked from BPM Routing Administration',
      passed,
      error: passed ? undefined : 'Employee was permitted to administer BPM rules'
    });
  } catch (err: any) {
    results.push({ suite: 'Privileged Action Protection', name: 'Employee Blocked from BPM Routing Administration', passed: false, error: err.message });
  }

  // Test 8: Repeated Unauthorized Actions Detection (Rate Limiting Anomaly)
  try {
    const maliciousSession = createMockSession({
      userId: `ATTACKER-${Date.now()}`,
      role: 'SUPPORT',
      companyId: 'CORP-ALPHA'
    });

    let anomalyTriggered = false;
    for (let i = 0; i < 5; i++) {
      const res = await AccountProtectionService.recordUnauthorizedAction(
        maliciousSession,
        'ESCALATE_ROLE',
        'RBAC',
        'Simulated penetration attempt'
      );
      if (res.anomalyDetected) {
        anomalyTriggered = true;
      }
    }

    results.push({
      suite: 'Account Protection',
      name: 'Repeated Failed Action Anomaly Trigger',
      passed: anomalyTriggered,
      error: anomalyTriggered ? undefined : 'Repeated violations did not trigger security anomaly'
    });
  } catch (err: any) {
    results.push({ suite: 'Account Protection', name: 'Repeated Failed Action Anomaly Trigger', passed: false, error: err.message });
  }

  // Test 9: Safe User-Facing Error Messages (No Information Leaks)
  try {
    const rawFirebaseError = { code: 'auth/user-not-found', message: 'No user found with email test@unknown.com' };
    const safeMsg = AccountProtectionService.getSafeErrorMessage(rawFirebaseError);
    const passed = safeMsg === 'Invalid email or password. Please verify your login details.' && !safeMsg.includes('No user found');
    results.push({
      suite: 'Account Protection',
      name: 'Sanitized User-Facing Error Messages',
      passed,
      error: passed ? undefined : `Error leaked internal info: "${safeMsg}"`
    });
  } catch (err: any) {
    results.push({ suite: 'Account Protection', name: 'Sanitized User-Facing Error Messages', passed: false, error: err.message });
  }

  const allPassed = results.every(r => r.passed);
  console.log(`[SessionSecurityVerification] Total: ${results.length}, Passed: ${results.filter(r => r.passed).length}, Failed: ${results.filter(r => !r.passed).length}`);
  return { passed: allPassed, results };
}
