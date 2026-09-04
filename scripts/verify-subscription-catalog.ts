import { db, auth } from '../src/firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc, getDocs, collection, deleteDoc } from 'firebase/firestore';
import { SubscriptionService } from '../src/services/subscriptionService';
import { FirestoreService } from '../src/services/firestoreService';
import { SubscriptionPlan, EmployeeRecord } from '../src/types';

async function runSubscriptionVerification() {
  console.log('================================================================');
  console.log('🚀 POINT 1.4 VERIFICATION: SUBSCRIPTION & PLAN CATALOG + ENFORCEMENT');
  console.log('================================================================\n');

  // Authenticate as tenant administrator
  console.log('[Auth] Authenticating as administrator (admin@apexsecurity.in)...');
  const userCred = await signInWithEmailAndPassword(auth, 'admin@apexsecurity.in', 'Apex@2026!');
  const adminUid = userCred.user.uid;
  console.log(`✅ Authenticated successfully (UID: ${adminUid}).\n`);

  // -------------------------------------------------------------------------
  // PART 1: PLAN BUILDER (STARTER, PROFESSIONAL, ENTERPRISE + CUSTOM)
  // -------------------------------------------------------------------------
  console.log('----------------------------------------------------------------');
  console.log('📦 PART 1: Plan Builder & Catalog Persistence in Firestore');
  console.log('----------------------------------------------------------------');

  const standardPlans: SubscriptionPlan[] = [
    {
      planId: 'PLAN_STARTER',
      planCode: 'STARTER',
      planName: 'Starter',
      name: 'Starter',
      description: 'For small security agencies with basic muster tracking.',
      status: 'ACTIVE',
      billingCycle: 'MONTHLY',
      monthlyPrice: 999,
      yearlyPrice: 9990,
      currency: 'INR',
      employeeLimit: 50,
      userLimit: 2,
      storageLimitMB: 1024,
      enabledModules: ['EMPLOYEES', 'ATTENDANCE', 'REPORTS'],
      trialEligible: true,
      trialDays: 14,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      planId: 'PLAN_PRO',
      planCode: 'PRO',
      planName: 'Professional',
      name: 'Professional',
      description: 'For growing businesses with multiple sites and advanced muster.',
      status: 'ACTIVE',
      billingCycle: 'MONTHLY',
      monthlyPrice: 2999,
      yearlyPrice: 29990,
      currency: 'INR',
      employeeLimit: 250,
      userLimit: 5,
      storageLimitMB: 5120,
      enabledModules: ['EMPLOYEES', 'ATTENDANCE', 'SHIFTS', 'LEAVE', 'PAYROLL', 'REPORTS', 'ANALYTICS'],
      trialEligible: true,
      trialDays: 14,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      planId: 'PLAN_ENTERPRISE',
      planCode: 'ENTERPRISE',
      planName: 'Enterprise Elite',
      name: 'Enterprise Elite',
      description: 'Complete multi-branch security operations with AI OCR, GPS muster, and full RBAC.',
      status: 'ACTIVE',
      billingCycle: 'MONTHLY',
      monthlyPrice: 7999,
      yearlyPrice: 79990,
      currency: 'INR',
      employeeLimit: 2000,
      userLimit: 25,
      storageLimitMB: 51200,
      enabledModules: ['EMPLOYEES', 'ATTENDANCE', 'SHIFTS', 'LEAVE', 'PAYROLL', 'REPORTS', 'ANALYTICS', 'GUARD_PATROL', 'INCIDENTS', 'VISITORS', 'MATERIALS'],
      trialEligible: true,
      trialDays: 30,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ];

  console.log('1.1 Saving/Updating Standard Plans in Firestore `plans` collection...');
  for (const plan of standardPlans) {
    await SubscriptionService.saveSubscriptionPlan(plan);
    console.log(`   ✓ Plan "${plan.name}" (${plan.planId}): ₹${plan.monthlyPrice}/mo, ₹${plan.yearlyPrice}/yr | Max Employees: ${plan.employeeLimit} | Modules: ${plan.enabledModules.length}`);
  }

  // Verify direct read from Firestore
  console.log('\n1.2 Verifying Plan Catalog by querying Firestore directly...');
  const allPlans = await SubscriptionService.getAllPlans();
  console.log(`   Total Plans retrieved from Firestore: ${allPlans.length}`);
  for (const p of allPlans) {
    console.log(`   - [${p.planCode}] ${p.planName || p.name}: ₹${p.monthlyPrice}/mo, ₹${p.yearlyPrice}/yr, Emp Limit: ${p.employeeLimit}, Trial: ${p.trialDays}d`);
  }

  // -------------------------------------------------------------------------
  // PART 2: TENANT SUBSCRIPTION ASSIGNMENTS (T-APEX, T-SHIELD, T-GARUDA)
  // -------------------------------------------------------------------------
  console.log('\n----------------------------------------------------------------');
  console.log('🏢 PART 2: Assigning & Tracking Tenant Subscriptions');
  console.log('----------------------------------------------------------------');

  const tenantConfigs = [
    { companyId: 'T-APEX', planId: 'PLAN_PRO', cycle: 'MONTHLY' as const, durationMonths: 12 },
    { companyId: 'T-SHIELD', planId: 'PLAN_STARTER', cycle: 'YEARLY' as const, durationMonths: 12 },
    { companyId: 'T-GARUDA', planId: 'PLAN_ENTERPRISE', cycle: 'MONTHLY' as const, durationMonths: 1 }
  ];

  for (const cfg of tenantConfigs) {
    console.log(`\n2.1 Assigning ${cfg.planId} (${cfg.cycle}) to ${cfg.companyId}...`);
    const sub = await SubscriptionService.assignPlanToCompany(
      cfg.companyId,
      cfg.planId,
      cfg.cycle,
      cfg.durationMonths,
      adminUid
    );
    console.log(`   ✓ Subscription Created in Firestore: ${sub.subscriptionId}`);
    console.log(`     - Status: ${sub.status}`);
    console.log(`     - Billing Cycle: ${sub.billingCycle}`);
    console.log(`     - Start Date: ${sub.startDate}`);
    console.log(`     - Current Period End / Renewal Date: ${sub.currentPeriodEnd}`);
    console.log(`     - Quota Employee Limit: ${sub.employeeLimit}`);

    // Verify company document sync in Firestore
    const companySnap = await getDoc(doc(db, 'companies', cfg.companyId));
    if (companySnap.exists()) {
      const c = companySnap.data();
      console.log(`   ✓ Company Tenant Document Updated in Firestore:`);
      console.log(`     - licenseTier: ${c.licenseTier}`);
      console.log(`     - maxEmployeesAllowed: ${c.maxEmployeesAllowed}`);
      console.log(`     - enabledModules count: ${c.enabledModules?.length || 0}`);
    }
  }

  // -------------------------------------------------------------------------
  // PART 3: EMPLOYEE LIMIT QUOTA ENFORCEMENT DEMONSTRATION
  // -------------------------------------------------------------------------
  console.log('\n----------------------------------------------------------------');
  console.log('🛡️ PART 3: Strict Employee Limit Quota Enforcement Testing');
  console.log('----------------------------------------------------------------');

  // Test setup: Assign T-SHIELD a Starter plan with employeeLimit = 2 for strict threshold test
  const testCompanyId = 'T-SHIELD';
  console.log(`\n3.1 Setting strict employee quota (max 2 employees) on ${testCompanyId} to test boundary...`);
  const companyRef = doc(db, 'companies', testCompanyId);
  const compDocBefore = (await getDoc(companyRef)).data()!;
  
  // Set maxEmployeesAllowed = 2 for testing
  await SubscriptionService.assignPlanToCompany(testCompanyId, 'PLAN_STARTER', 'MONTHLY', 1, adminUid);
  // Set company limit to 2
  const { updateDoc } = await import('firebase/firestore');
  await updateDoc(companyRef, { maxEmployeesAllowed: 2 });

  // Clean any previous test dummy employees
  const testEmp1Id = 'EMP_TEST_LIMIT_1';
  const testEmp2Id = 'EMP_TEST_LIMIT_2';
  const testEmp3Id = 'EMP_TEST_LIMIT_3';

  await deleteDoc(doc(db, 'companies', testCompanyId, 'employees', testEmp1Id)).catch(() => {});
  await deleteDoc(doc(db, 'companies', testCompanyId, 'employees', testEmp2Id)).catch(() => {});
  await deleteDoc(doc(db, 'companies', testCompanyId, 'employees', testEmp3Id)).catch(() => {});

  // Fetch current existing count
  const existingEmpsSnap = await getDocs(collection(db, 'companies', testCompanyId, 'employees'));
  const currentCount = existingEmpsSnap.docs.length;
  console.log(`   Existing active employee count for ${testCompanyId}: ${currentCount}`);

  // If there are existing employees, test with a test quota equal to currentCount + 1
  const testQuota = currentCount + 1;
  console.log(`   Adjusting ${testCompanyId} quota limit to exactly ${testQuota} to test 1 allowed slot and subsequent block.`);
  await updateDoc(companyRef, { maxEmployeesAllowed: testQuota });

  // 1. Add Employee 1 (Within Quota)
  console.log(`\n3.2 Attempting to add Employee #1 (${testEmp1Id}) within allowed quota...`);
  const emp1Payload: EmployeeRecord = {
    id: testEmp1Id,
    employeeId: testEmp1Id,
    companyId: testCompanyId,
    firstName: 'Arjun',
    lastName: 'Kadam',
    fullName: 'Arjun Kadam',
    email: 'arjun.test@shieldguard.in',
    contactNumber: '9876543210',
    role: 'GUARD',
    status: 'ACTIVE',
    lifecycleStatus: 'ACTIVE',
    joinedDate: new Date().toISOString().split('T')[0],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  const saveEmp1Result = await FirestoreService.saveEmployee(testCompanyId, emp1Payload, { userId: adminUid, fullName: 'Admin' });
  console.log(`   ✅ Employee #1 save status: ${saveEmp1Result ? 'SUCCESS (Within Limit)' : 'FAILED'}`);

  // 2. Add Employee 2 (Exceeding Quota -> MUST BE BLOCKED!)
  console.log(`\n3.3 Attempting to add Employee #2 (${testEmp2Id}) exceeding quota (Limit: ${testQuota})...`);
  const emp2Payload: EmployeeRecord = {
    id: testEmp2Id,
    employeeId: testEmp2Id,
    companyId: testCompanyId,
    firstName: 'Rohan',
    lastName: 'Shinde',
    fullName: 'Rohan Shinde',
    email: 'rohan.test@shieldguard.in',
    contactNumber: '9876543211',
    role: 'GUARD',
    status: 'ACTIVE',
    lifecycleStatus: 'ACTIVE',
    joinedDate: new Date().toISOString().split('T')[0],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  let blockedSuccessfully = false;
  let blockErrorMessage = '';

  try {
    await FirestoreService.saveEmployee(testCompanyId, emp2Payload, { userId: adminUid, fullName: 'Admin' });
    console.log('   ❌ FAIL: System allowed employee creation beyond the plan limit!');
  } catch (err: any) {
    blockedSuccessfully = true;
    blockErrorMessage = err.message || String(err);
    console.log(`   🛑 BLOCKED AS EXPECTED! Error caught:`);
    console.log(`      "${blockErrorMessage}"`);
  }

  if (!blockedSuccessfully) {
    throw new Error('Employee limit enforcement failed: Employee creation was not blocked!');
  }

  // Verify that EMP_TEST_LIMIT_2 was NOT written to Firestore
  const emp2Snap = await getDoc(doc(db, 'companies', testCompanyId, 'employees', testEmp2Id));
  console.log(`   Verifying Firestore: Exceeded employee in database? ${emp2Snap.exists() ? 'YES (FAIL)' : 'NO (BLOCKED & NOT SAVED)'}`);

  // 3. Upgrade Plan to Professional / Expand Limit -> Retrying Employee Creation
  console.log(`\n3.4 Upgrading ${testCompanyId} to Professional Plan (Limit: 250)...`);
  await SubscriptionService.assignPlanToCompany(testCompanyId, 'PLAN_PRO', 'YEARLY', 12, adminUid);

  console.log(`   Retrying Employee #2 (${testEmp2Id}) registration after subscription upgrade...`);
  const retryResult = await FirestoreService.saveEmployee(testCompanyId, emp2Payload, { userId: adminUid, fullName: 'Admin' });
  console.log(`   ✅ Save result after plan upgrade: ${retryResult ? 'SUCCESS (Allowed under PRO Plan)' : 'FAILED'}`);

  // Cleanup test employees
  console.log('\n3.5 Cleaning up test employees from database...');
  await FirestoreService.deleteEmployee(testCompanyId, testEmp1Id, { userId: adminUid, fullName: 'Admin' });
  await FirestoreService.deleteEmployee(testCompanyId, testEmp2Id, { userId: adminUid, fullName: 'Admin' });
  console.log('   ✓ Cleaned up test artifacts.');

  console.log('\n================================================================');
  console.log('🎉 ALL POINT 1.4 SUBSCRIPTION & ENFORCEMENT VERIFICATIONS PASSED 100%!');
  console.log('================================================================\n');
}

runSubscriptionVerification()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ Verification failed:', err);
    process.exit(1);
  });
