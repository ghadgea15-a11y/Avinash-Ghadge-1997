import { AccountProtectionService, _setSetDocMockAPS, _setGetDocMockAPS, _setGetDocsMockAPS } from '../src/services/accountProtectionService';
import { SecurityAuditService } from '../src/services/securityAuditService';
import { SuperAdminService } from '../src/services/superAdminService';

async function runTest() {
  console.log('========================================================================');
  console.log('POINT 1.7: PLATFORM SECURITY & ANOMALY DETECTION TEST SUITE');
  console.log('Target: Tenant T-APEX, User emp_apex_01@apex.com (3-4 Failed Login Simulation)');
  console.log('========================================================================');

  let passed = 0;
  let failed = 0;

  const TENANT_ID = 'T-APEX';
  const TARGET_USER = 'emp_apex_01@apex.com';

  // Mock firestore stores for isolated testing
  const mockPlatformSecurityEvents: any[] = [];
  const mockTenantLocks: Record<string, any> = {};

  _setSetDocMockAPS(async (ref: any, data: any) => {
    mockTenantLocks[ref.path || 'default'] = data;
  });

  _setGetDocMockAPS(async (ref: any) => {
    const data = mockTenantLocks[ref.path];
    return {
      exists: () => Boolean(data),
      data: () => data
    };
  });

  _setGetDocsMockAPS(async (ref: any) => {
    return {
      docs: Object.values(mockTenantLocks).map(d => ({
        id: 'doc-id',
        data: () => d
      }))
    };
  });

  // Mock SuperAdminService.logSecurityEvent to capture platform alarms
  const originalLogSecurityEvent = SuperAdminService.logSecurityEvent;
  SuperAdminService.logSecurityEvent = async (event: any) => {
    const record = {
      ...event,
      id: `EVT-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString()
    };
    mockPlatformSecurityEvents.push(record);
    return record.id;
  };

  try {
    // Reset test state
    AccountProtectionService._resetMemoryStore();

    // Verify initial state: Account should NOT be locked
    const initStatus = await AccountProtectionService.isAccountLocked(TENANT_ID, TARGET_USER);
    if (!initStatus.locked && initStatus.remainingAttempts === 3) {
      console.log('✅ Initial state: Account is unlocked with 3 remaining attempts.');
      passed++;
    } else {
      console.error('❌ Initial state check failed:', initStatus);
      failed++;
    }

    // -------------------------------------------------------------
    // SCENARIO 1: Attempt #1 with wrong PIN/password
    // -------------------------------------------------------------
    console.log('\n[TEST 1] Attempt #1 with incorrect password/PIN for T-APEX user...');
    const attempt1 = await AccountProtectionService.recordFailedLogin(TENANT_ID, TARGET_USER, '192.168.1.100');
    if (!attempt1.locked && attempt1.failedCount === 1 && attempt1.remainingAttempts === 2) {
      console.log(`✅ Attempt #1 handled: Warning issued (${attempt1.remainingAttempts} attempts remaining).`);
      passed++;
    } else {
      console.error('❌ Attempt #1 failed:', attempt1);
      failed++;
    }

    // Verify security event logged
    const evt1 = mockPlatformSecurityEvents.find(e => e.eventType === 'FAILED_LOGIN' && e.actorEmail === TARGET_USER);
    if (evt1 && evt1.severity === 'WARNING') {
      console.log('✅ Platform Security Event recorded for Attempt #1 (Severity: WARNING).');
      passed++;
    } else {
      console.error('❌ Security event for Attempt #1 missing:', evt1);
      failed++;
    }

    // -------------------------------------------------------------
    // SCENARIO 2: Attempt #2 with wrong PIN/password
    // -------------------------------------------------------------
    console.log('\n[TEST 2] Attempt #2 with incorrect password/PIN...');
    const attempt2 = await AccountProtectionService.recordFailedLogin(TENANT_ID, TARGET_USER, '192.168.1.100');
    if (!attempt2.locked && attempt2.failedCount === 2 && attempt2.remainingAttempts === 1) {
      console.log(`✅ Attempt #2 handled: Strict warning issued (${attempt2.remainingAttempts} attempt remaining).`);
      passed++;
    } else {
      console.error('❌ Attempt #2 failed:', attempt2);
      failed++;
    }

    // -------------------------------------------------------------
    // SCENARIO 3: Attempt #3 with wrong PIN/password -> LOCK TRIGGERED
    // -------------------------------------------------------------
    console.log('\n[TEST 3] Attempt #3 with incorrect password/PIN (Lockout Threshold)...');
    const attempt3 = await AccountProtectionService.recordFailedLogin(TENANT_ID, TARGET_USER, '192.168.1.100');
    if (attempt3.locked && attempt3.failedCount === 3 && attempt3.remainingAttempts === 0) {
      console.log(`✅ Attempt #3 handled: Account TEMPORARILY LOCKED for 15 minutes!`);
      passed++;
    } else {
      console.error('❌ Attempt #3 did not lock the account:', attempt3);
      failed++;
    }

    // Check that isAccountLocked now reports locked
    const lockCheck = await AccountProtectionService.isAccountLocked(TENANT_ID, TARGET_USER);
    if (lockCheck.locked && (lockCheck.remainingMinutes || 0) >= 14) {
      console.log(`✅ Account status verified: Locked for ${lockCheck.remainingMinutes} minutes.`);
      passed++;
    } else {
      console.error('❌ isAccountLocked check failed:', lockCheck);
      failed++;
    }

    // Verify High-severity Security Alarm was raised on platform
    const alarmEvent = mockPlatformSecurityEvents.find(
      e => e.type === 'SUSPICIOUS_LOGIN_ATTEMPTS' && e.severity === 'HIGH' && e.companyId === TENANT_ID
    );
    if (alarmEvent) {
      console.log(`✅ Super Admin Security Alarm triggered: [${alarmEvent.type}] Severity: ${alarmEvent.severity}`);
      console.log(`   Details: "${alarmEvent.details}"`);
      passed++;
    } else {
      console.error('❌ Super Admin Security Alarm missing in mockPlatformSecurityEvents:', mockPlatformSecurityEvents);
      failed++;
    }

    // -------------------------------------------------------------
    // SCENARIO 4: Attempt #4 while account is locked -> Escalation to CRITICAL / BRUTE FORCE
    // -------------------------------------------------------------
    console.log('\n[TEST 4] Attempt #4 while account is locked (Brute-Force Attack Pattern)...');
    const attempt4 = await AccountProtectionService.recordFailedLogin(TENANT_ID, TARGET_USER, '192.168.1.100');
    if (attempt4.locked && attempt4.failedCount === 4) {
      console.log('✅ Attempt #4 intercepted: Attack count incremented while locked.');
      passed++;
    } else {
      console.error('❌ Attempt #4 failed:', attempt4);
      failed++;
    }

    const bruteForceAlarm = mockPlatformSecurityEvents.find(
      e => e.type === 'BRUTE_FORCE_SUSPECTED' && e.severity === 'CRITICAL'
    );
    if (bruteForceAlarm) {
      console.log(`✅ Escalated to CRITICAL ALARM: [${bruteForceAlarm.type}]`);
      console.log(`   Details: "${bruteForceAlarm.details}"`);
      passed++;
    } else {
      console.error('❌ Brute force critical alarm missing:', mockPlatformSecurityEvents);
      failed++;
    }

    // -------------------------------------------------------------
    // SCENARIO 5: Super Admin unlocks the account
    // -------------------------------------------------------------
    console.log('\n[TEST 5] Super Admin unlocks the account...');
    const unlockResult = await AccountProtectionService.unlockAccount(TENANT_ID, TARGET_USER, 'superadmin@platform.com');
    if (unlockResult) {
      console.log('✅ Account successfully unlocked by Super Admin.');
      passed++;
    } else {
      console.error('❌ Unlock failed');
      failed++;
    }

    const postUnlockStatus = await AccountProtectionService.isAccountLocked(TENANT_ID, TARGET_USER);
    if (!postUnlockStatus.locked && postUnlockStatus.remainingAttempts === 3) {
      console.log('✅ Post-unlock status verified: Account active, failed count reset.');
      passed++;
    } else {
      console.error('❌ Post-unlock status invalid:', postUnlockStatus);
      failed++;
    }

    // -------------------------------------------------------------
    // SCENARIO 6: Successful login resets failed attempts
    // -------------------------------------------------------------
    console.log('\n[TEST 6] Successful login clears transient counters...');
    await AccountProtectionService.recordFailedLogin(TENANT_ID, 'other_user@apex.com');
    await AccountProtectionService.recordSuccessfulLogin(TENANT_ID, 'other_user@apex.com');
    const clearedStatus = await AccountProtectionService.isAccountLocked(TENANT_ID, 'other_user@apex.com');
    if (!clearedStatus.locked && clearedStatus.failedCount === 0) {
      console.log('✅ Successful login reset counters back to 0.');
      passed++;
    } else {
      console.error('❌ Successful login did not reset counter:', clearedStatus);
      failed++;
    }

  } catch (err: any) {
    console.error('Unexpected error during test execution:', err);
    failed++;
  } finally {
    // Restore original method
    SuperAdminService.logSecurityEvent = originalLogSecurityEvent;
  }

  console.log('\n========================================================================');
  console.log(`RESULT: ${passed} PASSED, ${failed} FAILED.`);
  console.log('========================================================================');

  process.exit(failed > 0 ? 1 : 0);
}

runTest();
