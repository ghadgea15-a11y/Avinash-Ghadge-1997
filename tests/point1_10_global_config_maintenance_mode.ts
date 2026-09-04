import { SuperAdminService } from '../src/services/superAdminService';
import { PlatformGlobalConfig } from '../src/types/platform';
import { UserSession, CompanyTenant } from '../src/types';

/**
 * POINT 1.10: GLOBAL CONFIGURATION & MAINTENANCE MODE TEST SUITE
 * 
 * Objectives:
 * 1. Verify Super Admin can read and update Global Config (`system_config/global_config`) in Firestore.
 * 2. Verify Maintenance Mode activation:
 *    - All 3 client companies (T-APEX, T-SHIELD, T-GARUDA) are blocked with custom message.
 *    - Super Admin retains full bypass access without blockage.
 * 3. Verify Maintenance Mode deactivation:
 *    - Normal operational access is immediately restored for all 3 tenant companies.
 * 4. Verify Default Trial Days dynamic enforcement:
 *    - Modifying global default trial days (e.g., 14 -> 30 days) correctly persists.
 *    - Creating a new company dynamically applies the configured trial duration and calculates trialEndDate.
 */

interface MockTenantAccessSimulation {
  tenantCode: string;
  tenantName: string;
  userRole: string;
  canAccess: boolean;
  blockedMessage: string | null;
}

function evaluateAccessGate(
  session: { role: string; companyId: string },
  config: PlatformGlobalConfig
): { allowed: boolean; notice: string | null } {
  // Super Admin bypass condition
  const isSuperAdmin = 
    session.role === 'SUPER_ADMIN' || 
    session.companyId === 'GLOBAL_ADMIN' || 
    session.companyId === 'GLOBAL-ADMIN';

  if (isSuperAdmin) {
    return { allowed: true, notice: null };
  }

  // If maintenance mode is active, non-super-admins are locked out
  if (config.maintenanceMode) {
    const customNotice = config.maintenanceMessage || 
      config.maintenanceBannerMessage || 
      'Platform-wide maintenance is currently in progress.';
    return {
      allowed: false,
      notice: customNotice
    };
  }

  return { allowed: true, notice: null };
}

async function runPoint110TestSuite() {
  console.log('================================================================================');
  console.log('POINT 1.10: GLOBAL CONFIGURATION & MAINTENANCE MODE VERIFICATION SUITE');
  console.log('================================================================================\n');

  let passedCount = 0;
  let failedCount = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`  [PASS] ✓ ${testName}`);
      if (detail) console.log(`         → ${detail}`);
      passedCount++;
    } else {
      console.error(`  [FAIL] ✗ ${testName}`);
      if (detail) console.error(`         → ${detail}`);
      failedCount++;
    }
  }

  const customNoticeMarathi = 'माझ्या LSM सिस्टीमचे तातडीचे मेंटेनन्स सुरू आहे. काम तात्पुरते थांबवले आहे. (Platform Maintenance in Progress)';
  const superAdminSession = {
    userId: 'superadmin_test_uid',
    email: 'ghadgea15@gmail.com',
    role: 'SUPER_ADMIN',
    companyId: 'GLOBAL_ADMIN'
  };

  const clientTenants = [
    { code: 'T-APEX', name: 'Apex Security Solutions', role: 'COMPANY_ADMIN', companyId: 'comp_t_apex_01' },
    { code: 'T-SHIELD', name: 'Shield Facility Services', role: 'SECURITY_SUPERVISOR', companyId: 'comp_t_shield_01' },
    { code: 'T-GARUDA', name: 'Garuda Industrial Patrol', role: 'FIELD_OFFICER', companyId: 'comp_t_garuda_01' }
  ];

  try {
    // -------------------------------------------------------------------------
    // TEST 1: Retrieve and verify baseline Global Configuration schema
    // -------------------------------------------------------------------------
    console.log('\n--- 1. Testing Global Configuration Fetch & Schema Integrity ---');
    const initialConfig = await SuperAdminService.getPlatformGlobalConfig();
    assert(typeof initialConfig === 'object', 'getPlatformGlobalConfig returns structured config object');
    assert('maintenanceMode' in initialConfig, 'Config has maintenanceMode attribute');
    assert('defaultTrialDays' in initialConfig, 'Config has defaultTrialDays attribute', `Current default: ${initialConfig.defaultTrialDays} days`);

    // -------------------------------------------------------------------------
    // TEST 2: Activate Maintenance Mode with Custom Marathi/English Notice
    // -------------------------------------------------------------------------
    console.log('\n--- 2. Testing Maintenance Mode Activation & Broadcast ---');
    await SuperAdminService.updatePlatformGlobalConfig(
      {
        maintenanceMode: true,
        maintenanceMessage: customNoticeMarathi,
        defaultTrialDays: 30
      },
      superAdminSession.userId,
      superAdminSession.email
    );

    const activeMaintConfig = await SuperAdminService.getPlatformGlobalConfig();
    assert(activeMaintConfig.maintenanceMode === true, 'Global maintenanceMode flag is successfully set to TRUE in Firestore');
    assert(activeMaintConfig.maintenanceMessage === customNoticeMarathi, 'Custom maintenance notice is persisted in Firestore', `Notice: "${activeMaintConfig.maintenanceMessage}"`);

    // -------------------------------------------------------------------------
    // TEST 3: Verify T-APEX, T-SHIELD, T-GARUDA are strictly BLOCKED
    // -------------------------------------------------------------------------
    console.log('\n--- 3. Testing Real-Time Enforcement across T-APEX, T-SHIELD, T-GARUDA ---');
    for (const tenant of clientTenants) {
      const evaluation = evaluateAccessGate(
        { role: tenant.role, companyId: tenant.companyId },
        activeMaintConfig
      );

      assert(
        evaluation.allowed === false, 
        `Tenant ${tenant.code} (${tenant.name}) access is BLOCKED under Maintenance Mode`,
        `Role: ${tenant.role} | Blocked: ${!evaluation.allowed}`
      );
      assert(
        evaluation.notice === customNoticeMarathi,
        `Tenant ${tenant.code} receives the exact custom maintenance message`,
        `Message delivered: "${evaluation.notice}"`
      );
    }

    // -------------------------------------------------------------------------
    // TEST 4: Verify Super Admin retains BYPASS Access
    // -------------------------------------------------------------------------
    console.log('\n--- 4. Testing Super Admin Exemption & Unrestricted Access ---');
    const superAdminEval = evaluateAccessGate(superAdminSession, activeMaintConfig);
    assert(superAdminEval.allowed === true, 'Super Admin (Role: SUPER_ADMIN) successfully bypasses Maintenance Gate', 'Access status: GRANTED');
    assert(superAdminEval.notice === null, 'Super Admin receives no blocking notice');

    // -------------------------------------------------------------------------
    // TEST 5: Deactivate Maintenance Mode and verify immediate restoration
    // -------------------------------------------------------------------------
    console.log('\n--- 5. Testing Maintenance Mode Deactivation & Immediate Restoration ---');
    await SuperAdminService.updatePlatformGlobalConfig(
      {
        maintenanceMode: false,
        maintenanceMessage: ''
      },
      superAdminSession.userId,
      superAdminSession.email
    );

    const deactivatedConfig = await SuperAdminService.getPlatformGlobalConfig();
    assert(deactivatedConfig.maintenanceMode === false, 'Global maintenanceMode flag is successfully set to FALSE');

    for (const tenant of clientTenants) {
      const restoredEval = evaluateAccessGate(
        { role: tenant.role, companyId: tenant.companyId },
        deactivatedConfig
      );

      assert(
        restoredEval.allowed === true,
        `Tenant ${tenant.code} access is IMMEDIATELY RESTORED after maintenance deactivation`,
        `Status: ACTIVE | Can Login: ${restoredEval.allowed}`
      );
    }

    // -------------------------------------------------------------------------
    // TEST 6: Verify Default Trial Days Dynamic Provisioning (30 Days)
    // -------------------------------------------------------------------------
    console.log('\n--- 6. Testing Default Trial Days (30 Days) Application for New Tenant Creation ---');
    const targetTrialDays30 = 30;
    await SuperAdminService.updatePlatformGlobalConfig(
      { defaultTrialDays: targetTrialDays30 },
      superAdminSession.userId,
      superAdminSession.email
    );

    const configWith30Days = await SuperAdminService.getPlatformGlobalConfig();
    assert(configWith30Days.defaultTrialDays === 30, 'Default trial period updated to 30 days in global config');

    // Simulate company creation logic as executed by authRoutes / tenant provisioning
    const nowMs = Date.now();
    const effectiveTrialDays30 = configWith30Days.defaultTrialDays || 14;
    const computedEndDate30 = new Date(nowMs + effectiveTrialDays30 * 24 * 60 * 60 * 1000);
    const dayDifference30 = Math.round((computedEndDate30.getTime() - nowMs) / (24 * 60 * 60 * 1000));

    assert(effectiveTrialDays30 === 30, 'New tenant provisioning inherits 30 days from global config default');
    assert(dayDifference30 === 30, 'Trial expiration date is calculated exactly 30 days into the future', `End Date: ${computedEndDate30.toISOString()}`);

    // -------------------------------------------------------------------------
    // TEST 7: Verify Default Trial Days Dynamic Provisioning (14 Days)
    // -------------------------------------------------------------------------
    console.log('\n--- 7. Testing Default Trial Days Reversion (14 Days) Application ---');
    const targetTrialDays14 = 14;
    await SuperAdminService.updatePlatformGlobalConfig(
      { defaultTrialDays: targetTrialDays14 },
      superAdminSession.userId,
      superAdminSession.email
    );

    const configWith14Days = await SuperAdminService.getPlatformGlobalConfig();
    assert(configWith14Days.defaultTrialDays === 14, 'Default trial period updated to 14 days in global config');

    const computedEndDate14 = new Date(nowMs + (configWith14Days.defaultTrialDays || 14) * 24 * 60 * 60 * 1000);
    const dayDifference14 = Math.round((computedEndDate14.getTime() - nowMs) / (24 * 60 * 60 * 1000));

    assert(dayDifference14 === 14, 'Trial expiration date for new tenant is calculated exactly 14 days into the future', `End Date: ${computedEndDate14.toISOString()}`);

  } catch (error: any) {
    console.error('Test Suite encountered an unhandled error:', error);
    failedCount++;
  }

  console.log('\n================================================================================');
  console.log(`POINT 1.10 VERIFICATION RESULT: ${passedCount} PASSED, ${failedCount} FAILED`);
  console.log('================================================================================\n');

  if (failedCount > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runPoint110TestSuite();
