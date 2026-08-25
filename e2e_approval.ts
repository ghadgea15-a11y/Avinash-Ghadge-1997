import { db } from './src/firebase.js';
import { collection, doc, getDoc, getDocs, query, where, setDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import { BpmService } from './src/services/bpmService.js';
import { BpmDelegationService } from './src/services/bpmDelegationService.js';

async function runTest() {
  console.log("Starting Enterprise Approval Intelligence E2E...");
  const companyId = 'C_LOG_SHEET_DEMO';

  // We need an active workflow first
  const wfId = `WF_${Date.now()}`;
  const wfRef = doc(db, 'companies', companyId, 'bpm_workflows', wfId);
  await setDoc(wfRef, {
    id: wfId,
    workflowId: wfId,
    companyId,
    module: 'SCM',
    transactionType: 'PURCHASE_ORDER',
    workflowName: 'PO Standard Approval',
    active: true,
    version: 1,
    effectiveFrom: new Date().toISOString(),
    steps: [
      {
        stepId: 'STEP_1',
        sequence: 1,
        approverType: 'USER',
        approverUserId: 'U_MANAGER',
        minimumApprovals: 1,
        required: true
      },
      {
        stepId: 'STEP_2',
        sequence: 2,
        approverType: 'ROLE',
        approverRole: 'FINANCE',
        minimumApprovals: 1,
        required: true
      }
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });

  // Setup roles/users
  await setDoc(doc(db, 'companies', companyId, 'users', 'U_MANAGER'), { role: 'MANAGER' });
  await setDoc(doc(db, 'companies', companyId, 'users', 'U_FINANCE'), { role: 'FINANCE' });
  await setDoc(doc(db, 'companies', companyId, 'users', 'U_EMPLOYEE'), { role: 'EMPLOYEE' });

  console.log("1. Submitting a new transaction for approval...");
  const instance = await BpmService.submitForApproval(
    { userId: 'U_EMPLOYEE', companyId, role: 'EMPLOYEE', email: 'emp@demo.com', fullName: 'Test Emp' } as any,
    'SCM',
    'PURCHASE_ORDER',
    `PO_${Date.now()}`,
    { amount: 5000 },
    wfId
  );
  
  console.log(`Created Instance: ${instance.id} at Tier ${instance.currentTier}`);

  console.log("2. Verifying Bypass Prevention (Employee cannot approve)...");
  try {
    await BpmService.performAction(
      { userId: 'U_EMPLOYEE', companyId, role: 'EMPLOYEE', email: 'emp@demo.com', fullName: 'Test Emp' } as any,
      instance.id,
      'APPROVE',
      'Looks good to me'
    );
    console.error("FAIL: Bypass allowed! Employee approved their own or unauthorized PO.");
    process.exit(1);
  } catch (err: any) {
    if (err.message.includes('not authorized') || err.message.includes('authorized')) {
      console.log("PASS: Bypass prevented.");
    } else {
      console.error("FAIL: Unexpected error:", err);
      process.exit(1);
    }
  }

  console.log("3. Level 1 Approval (Manager)...");
  await BpmService.performAction(
    { userId: 'U_MANAGER', companyId, role: 'MANAGER', email: 'mgr@demo.com', fullName: 'Test Mgr' } as any,
    instance.id,
    'APPROVE',
    'Manager approved'
  );
  
  const updatedInstance = (await getDoc(doc(db, 'companies', companyId, 'bpm_instances', instance.id))).data() as any;
  console.log(`Status after Tier 1: ${updatedInstance.status}, Next Tier: ${updatedInstance.currentTier}`);

  if (updatedInstance.status !== 'PENDING_APPROVAL' || updatedInstance.currentTier !== 2) {
    console.error("FAIL: Did not advance to Tier 2 properly.");
    process.exit(1);
  }

  console.log("4. Level 2 Approval (Finance)...");
  await BpmService.performAction(
    { userId: 'U_FINANCE', companyId, role: 'FINANCE', email: 'fin@demo.com', fullName: 'Test Fin' } as any,
    instance.id,
    'APPROVE',
    'Finance approved'
  );

  const finalInstance = (await getDoc(doc(db, 'companies', companyId, 'bpm_instances', instance.id))).data() as any;
  console.log(`Status after Tier 2: ${finalInstance.status}`);

  if (finalInstance.status !== 'APPROVED') {
    console.error("FAIL: Did not reach APPROVED status.");
    process.exit(1);
  }

  console.log("5. Testing Double Approval Prevention...");
  try {
    await BpmService.performAction(
      { userId: 'U_FINANCE', companyId, role: 'FINANCE', email: 'fin@demo.com', fullName: 'Test Fin' } as any,
      instance.id,
      'APPROVE',
      'Finance approved again'
    );
    console.error("FAIL: Double approval allowed!");
    process.exit(1);
  } catch (err: any) {
    if (err.message.includes('Status is APPROVED') || err.message.includes('Cannot perform action')) {
      console.log("PASS: Double approval prevented.");
    } else {
      console.error("FAIL: Unexpected error:", err);
      process.exit(1);
    }
  }

  console.log("ALL ENTERPRISE APPROVAL INTELLIGENCE E2E TESTS PASSED!");
  process.exit(0);
}

runTest().catch(err => {
  console.error("Unhandled top-level error:", err);
  process.exit(1);
});
