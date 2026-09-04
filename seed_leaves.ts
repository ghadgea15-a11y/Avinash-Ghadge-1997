import { getAdminDb } from './server/firebaseAdmin';

async function seed() {
  const db = getAdminDb();
  const comps = await db.collection('companies').where('companyCode', '==', 'T-APEX').get();
  let companyId = '';
  if (!comps.empty) {
    companyId = comps.docs[0].id;
  } else {
    // try to find by name
    const compByName = await db.collection('companies').where('companyName', '==', 'T-APEX').get();
    if (!compByName.empty) {
      companyId = compByName.docs[0].id;
    } else {
      console.log('T-APEX company not found, using generic COMP123 or whatever exists');
      const all = await db.collection('companies').limit(1).get();
      if (!all.empty) companyId = all.docs[0].id;
    }
  }

  if (!companyId) {
    console.log("No companies found.");
    process.exit(1);
  }

  console.log(`Using company: ${companyId}`);

  const policies = [
    { leaveCode: 'CL', leaveName: 'Casual Leave', leaveType: 'CASUAL', annualEntitlement: 12, carryForwardAllowed: false, encashmentAllowed: false, minNoticeDays: 1, status: 'ACTIVE' },
    { leaveCode: 'SL', leaveName: 'Sick Leave', leaveType: 'SICK', annualEntitlement: 12, carryForwardAllowed: true, maxCarryForward: 30, encashmentAllowed: false, minNoticeDays: 0, status: 'ACTIVE' },
    { leaveCode: 'EL', leaveName: 'Earned Leave', leaveType: 'EARNED', annualEntitlement: 15, carryForwardAllowed: true, maxCarryForward: 45, encashmentAllowed: true, minNoticeDays: 7, status: 'ACTIVE' },
    { leaveCode: 'COMP_OFF', leaveName: 'Compensatory Off', leaveType: 'COMP_OFF', annualEntitlement: 0, carryForwardAllowed: false, encashmentAllowed: false, minNoticeDays: 1, status: 'ACTIVE' },
    { leaveCode: 'ML', leaveName: 'Maternity Leave', leaveType: 'MATERNITY', annualEntitlement: 182, applicableToGenders: 'FEMALE', carryForwardAllowed: false, encashmentAllowed: false, minNoticeDays: 30, status: 'ACTIVE' }
  ];

  for (const p of policies) {
    const pId = `POL-${p.leaveCode}`;
    await db.collection('companies').doc(companyId).collection('leavePolicies').doc(pId).set({
      ...p,
      id: pId,
      companyId: companyId,
      updatedAt: new Date().toISOString()
    }, { merge: true });
    console.log(`Seeded Policy: ${p.leaveCode}`);
  }

  // Also setup a Workflow for LEAVE_REQUEST
  const wfId = 'WF-LEAVE-1';
  await db.collection('companies').doc(companyId).collection('bpm_workflows').doc(wfId).set({
    workflowId: wfId,
    name: 'Leave Approval Workflow',
    description: 'Standard 2-tier approval for leave',
    module: 'LEAVE',
    transactionType: 'LEAVE_REQUEST',
    steps: [
      { stepId: 'STEP-1', sequence: 1, name: 'Supervisor Approval', approverType: 'SUPERVISOR', requiredApprovals: 1 },
      { stepId: 'STEP-2', sequence: 2, name: 'Manager / HR Approval', approverType: 'DEPARTMENT_HEAD', requiredApprovals: 1 }
    ],
    status: 'ACTIVE',
    createdAt: new Date().toISOString()
  }, { merge: true });

  console.log('Seeded Leave Workflow');

  // Trigger Accruals to populate ledger
  console.log('Triggering accruals for testing...');
  const { ServerLeaveAccrualEngine } = await import('./src/server/leaveAccrualApi');
  await ServerLeaveAccrualEngine.processCompanyMonthlyAccruals(companyId, new Date().getMonth() + 1, new Date().getFullYear(), { id: 'SYSTEM_CRON', name: 'Server Accrual Cron' });
  console.log('Accruals generated.');
  
  process.exit(0);
}

seed().catch(console.error);
