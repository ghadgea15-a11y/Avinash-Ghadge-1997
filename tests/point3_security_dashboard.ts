import { SecurityAuditService, _setGetDocsMock, _setSetDocMock, _setUpdateDocMock } from '../src/services/securityAuditService';
import { UserSession, SecurityAnomalyRecord } from '../src/types';

const MOCK_COMPANY_A = 'COMP_A';
const MOCK_COMPANY_B = 'COMP_B';

async function run() {
  console.log('========================================================================');
  console.log('MODULE 10 POINT 3: SECURITY DASHBOARD & INVESTIGATION VERIFICATION SUITE');
  console.log('========================================================================');
  
  let failed = 0;
  let passed = 0;

  const mockAdminSession: UserSession = {
    userId: 'ADMIN_1',
    companyId: MOCK_COMPANY_A,
    role: 'COMPANY_ADMIN',
    email: 'admin@company.com',
    employeeId: 'EMP_ADMIN'
  };

  const mockEmployeeSession: UserSession = {
    userId: 'EMP_1',
    companyId: MOCK_COMPANY_A,
    role: 'EMPLOYEE',
    email: 'emp@company.com',
    employeeId: 'EMP_1'
  };

  let mockFirestoreState: { [path: string]: any } = {};
  let updateDocCalls: any[] = [];
  let setDocCalls: any[] = [];

  // Mock firestore methods
  _setSetDocMock(async (ref: any, data: any, options: any) => {
    mockFirestoreState[ref.path] = data;
    setDocCalls.push({ ref, data });
  });

  _setUpdateDocMock(async (ref: any, data: any) => {
    updateDocCalls.push({ path: ref.path, data });
    mockFirestoreState[ref.path] = { ...mockFirestoreState[ref.path], ...data };
  });

  _setGetDocsMock(async (q: any) => {
    return {
      docs: Object.values(mockFirestoreState).map(data => ({
        id: data.anomalyId || 'id',
        data: () => data
      }))
    };
  });

  try {
    // TEST 1: Unauthorized status update attempt
    console.log('\n[TEST 1] Unauthorized status update attempt...');
    let threwError = false;
    try {
      await SecurityAuditService.updateAnomalyStatus(mockEmployeeSession, 'ANOMALY_1', 'RESOLVED', 'Should fail');
    } catch (e: any) {
      threwError = true;
      if (e.message.includes('Unauthorized')) {
        passed++;
        console.log('✅ Correctly blocked unauthorized update by EMPLOYEE');
      } else {
        failed++;
        console.log('❌ Failed with unexpected error:', e.message);
      }
    }
    if (!threwError) {
      failed++;
      console.log('❌ Failed to block unauthorized update');
    }

    // Verify it logged the unauthorized attempt
    const unauthorizedLog = setDocCalls.find(call => call.data.action === 'UNAUTHORIZED_ACCESS' && call.data.reason === 'Unauthorized anomaly status update attempt');
    if (unauthorizedLog && unauthorizedLog.data.userId === 'EMP_1') {
      passed++;
      console.log('✅ Logged unauthorized update attempt to Audit Trail');
    } else {
      failed++;
      console.log('❌ Failed to log unauthorized update attempt');
    }

    // TEST 2: Authorized update with resolution notes
    console.log('\n[TEST 2] Authorized status update with notes...');
    const result = await SecurityAuditService.updateAnomalyStatus(mockAdminSession, 'ANOMALY_1', 'RESOLVED', 'Fixed via proxy check');
    if (result) {
      passed++;
      console.log('✅ Status update succeeded for COMPANY_ADMIN');
    } else {
      failed++;
      console.log('❌ Status update failed for COMPANY_ADMIN');
    }

    const updateCall = updateDocCalls.find(call => call.path.includes('ANOMALY_1'));
    if (updateCall && updateCall.data.status === 'RESOLVED' && updateCall.data.resolutionNotes === 'Fixed via proxy check') {
      passed++;
      console.log('✅ Correctly saved resolutionNotes, resolvedAt, and status');
    } else {
      failed++;
      console.log('❌ Failed to save resolution info correctly');
      console.log('Update Call Data:', updateCall?.data);
    }

    const auditLog = setDocCalls.find(call => call.data.action === 'ANOMALY_STATUS_UPDATED');
    if (auditLog && auditLog.data.userId === 'ADMIN_1' && auditLog.data.reason.includes('Fixed via proxy check')) {
      passed++;
      console.log('✅ Correctly created an immutable audit event for the status update');
    } else {
      failed++;
      console.log('❌ Failed to create correct audit event');
    }

  } catch (err: any) {
    console.error('Fatal Test Error:', err);
    failed++;
  }

  console.log('\n========================================================================');
  console.log(`TEST RUN COMPLETE. PASSED: ${passed}, FAILED: ${failed}`);
  if (failed > 0) {
    process.exit(1);
  }
}

run();
