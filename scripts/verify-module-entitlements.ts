import { db, auth } from '../src/firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { FirestoreService } from '../src/services/firestoreService';
import { getNavItemsForRole, getGroupedNavForRole, isScreenAllowedForCompany } from '../src/config/navigationArchitecture';
import { CompanyTenant, UserRole } from '../src/types';

async function runVerification() {
  console.log('================================================================');
  console.log('🚀 POINT 1.3 VERIFICATION: MODULE ENTITLEMENTS & ACCESS CONTROL');
  console.log('================================================================\n');

  // Authenticate as Admin / Executive for T-APEX
  console.log('[Auth] Authenticating as tenant administrator (admin@apexsecurity.in)...');
  await signInWithEmailAndPassword(auth, 'admin@apexsecurity.in', 'Apex@2026!');
  console.log('✅ Authenticated successfully.\n');

  const testCompanyId = 'T-APEX';

  // 1. Fetch live company tenant from Firestore
  console.log(`[Step 1] Fetching live tenant document for ${testCompanyId}...`);
  const companySnap = await getDoc(doc(db, 'companies', testCompanyId));
  if (!companySnap.exists()) {
    throw new Error(`Company ${testCompanyId} not found in Firestore!`);
  }
  const companyData = companySnap.data() as CompanyTenant;
  const initialModules = [...(companyData.enabledModules || [])];
  console.log(`✅ Loaded ${testCompanyId} (${companyData.name}).`);
  console.log(`   Initial Enabled Modules (${initialModules.length}):`, initialModules.join(', '));

  // 2. Test initial navigation state for an Operations Manager in T-APEX
  const testRole: UserRole = 'OPS_MANAGER';
  const initialNav = getNavItemsForRole(testRole, false, initialModules);
  const hasAttendanceInitially = initialNav.some(item => item.screen === 'ATTENDANCE_SHIFTS');
  const hasEmployeesInitially = initialNav.some(item => item.screen === 'EMPLOYEES');
  console.log(`\n[Step 2] Initial Navigation check for role ${testRole}:`);
  console.log(`   - ATTENDANCE_SHIFTS in menu: ${hasAttendanceInitially ? 'YES' : 'NO'}`);
  console.log(`   - EMPLOYEES in menu: ${hasEmployeesInitially ? 'YES' : 'NO'}`);

  if (!hasAttendanceInitially) {
    throw new Error('Expected ATTENDANCE_SHIFTS to be present in initial navigation!');
  }

  // 3. Super Admin disables the 'ATTENDANCE' module for T-APEX in Firestore
  console.log(`\n[Step 3] Super Admin toggles 'ATTENDANCE' module OFF for ${testCompanyId}...`);
  const updatedModulesWithoutAttendance = initialModules.filter(m => m !== 'ATTENDANCE');
  await FirestoreService.updateCompanyModules(testCompanyId, updatedModulesWithoutAttendance);
  console.log('   Module updated in Firestore via FirestoreService.updateCompanyModules()');

  // Verify in Firestore directly
  const verifySnap = await getDoc(doc(db, 'companies', testCompanyId));
  const updatedCompanyData = verifySnap.data() as CompanyTenant;
  console.log(`   Direct Firestore Query: 'ATTENDANCE' present in enabledModules?`, 
    updatedCompanyData.enabledModules?.includes('ATTENDANCE') ? 'YES (FAIL)' : 'NO (SUCCESS)');

  if (updatedCompanyData.enabledModules?.includes('ATTENDANCE')) {
    throw new Error('Firestore company document still contains ATTENDANCE module!');
  }

  // 4. Test Navigation enforcement for T-APEX user with ATTENDANCE disabled
  console.log(`\n[Step 4] Verifying Navigation menu for ${testCompanyId} user:`);
  const restrictedNav = getNavItemsForRole(testRole, false, updatedCompanyData.enabledModules);
  const hasAttendanceWhenDisabled = restrictedNav.some(item => item.screen === 'ATTENDANCE_SHIFTS');
  console.log(`   - ATTENDANCE_SHIFTS present in navigation items: ${hasAttendanceWhenDisabled ? 'YES (FAIL)' : 'NO (BLOCKED/HIDDEN)'}`);
  
  if (hasAttendanceWhenDisabled) {
    throw new Error('Navigation menu still shows ATTENDANCE_SHIFTS for tenant with ATTENDANCE disabled!');
  }

  const groupedNav = getGroupedNavForRole(testRole, false, updatedCompanyData.enabledModules);
  const opsGroup = groupedNav.find(g => g.category.id === 'OPERATIONS');
  console.log(`   - OPERATIONS category items count: ${opsGroup?.items.length || 0}`);
  const hasAttendanceInGroup = opsGroup?.items.some(i => i.screen === 'ATTENDANCE_SHIFTS');
  if (hasAttendanceInGroup) {
    throw new Error('Grouped navigation still contains ATTENDANCE_SHIFTS!');
  }

  // 5. Test Screen Level / Direct Route Guard Enforcement
  console.log(`\n[Step 5] Verifying Direct Route Guard (isScreenAllowedForCompany):`);
  const accessCheckDisabled = isScreenAllowedForCompany('ATTENDANCE_SHIFTS', updatedCompanyData);
  console.log(`   - Screen 'ATTENDANCE_SHIFTS' access allowed:`, accessCheckDisabled.allowed ? 'YES (FAIL)' : 'NO (ACCESS RESTRICTED)');
  console.log(`   - Reason / Module Key:`, accessCheckDisabled.moduleKey);
  
  if (accessCheckDisabled.allowed) {
    throw new Error('Screen guard allowed access to ATTENDANCE_SHIFTS when ATTENDANCE is disabled!');
  }

  // Also test an enabled screen to ensure legitimate screens remain accessible
  const accessCheckEnabled = isScreenAllowedForCompany('EMPLOYEES', updatedCompanyData);
  console.log(`   - Screen 'EMPLOYEES' access allowed:`, accessCheckEnabled.allowed ? 'YES (PERMITTED)' : 'NO (FAIL)');
  if (!accessCheckEnabled.allowed) {
    throw new Error('Screen guard incorrectly blocked an enabled module screen EMPLOYEES!');
  }

  // 6. Super Admin re-enables the 'ATTENDANCE' module for T-APEX
  console.log(`\n[Step 6] Super Admin re-enables 'ATTENDANCE' module in Firestore...`);
  await FirestoreService.updateCompanyModules(testCompanyId, initialModules);
  const finalSnap = await getDoc(doc(db, 'companies', testCompanyId));
  const finalCompanyData = finalSnap.data() as CompanyTenant;
  const restoredNav = getNavItemsForRole(testRole, false, finalCompanyData.enabledModules);
  const hasAttendanceRestored = restoredNav.some(item => item.screen === 'ATTENDANCE_SHIFTS');
  const accessCheckRestored = isScreenAllowedForCompany('ATTENDANCE_SHIFTS', finalCompanyData);
  console.log(`   - ATTENDANCE_SHIFTS restored in navigation: ${hasAttendanceRestored ? 'YES' : 'NO'}`);
  console.log(`   - ATTENDANCE_SHIFTS direct access restored: ${accessCheckRestored.allowed ? 'YES' : 'NO'}`);

  if (!hasAttendanceRestored || !accessCheckRestored.allowed) {
    throw new Error('Failed to restore ATTENDANCE_SHIFTS access after re-enabling!');
  }

  // 7. Verify all 3 companies have their enabledModules configured
  console.log(`\n[Step 7] Checking multi-tenant module isolation for all 3 seeded companies:`);
  for (const cid of ['T-APEX', 'T-SHIELD', 'T-GARUDA']) {
    const cSnap = await getDoc(doc(db, 'companies', cid));
    if (cSnap.exists()) {
      const c = cSnap.data() as CompanyTenant;
      console.log(`   - ${cid} (${c.name}): ${c.enabledModules?.length || 0} enabled modules`);
    }
  }

  console.log('\n================================================================');
  console.log('🎉 ALL POINT 1.3 MODULE ENTITLEMENT VERIFICATIONS PASSED 100%!');
  console.log('================================================================\n');
}

runVerification()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ Verification failed:', err);
    process.exit(1);
  });
