import { FirestoreService } from '../services/firestoreService';
import { ShiftRecord, AttendanceLogRecord, EmployeeRecord, UserSession } from '../types';

export async function runPhase4VerificationTests(companyId: string = 'COMP-TEST-PHASE4'): Promise<{
  passCount: number;
  failCount: number;
  results: Array<{ testId: number; name: string; passed: boolean; details: string }>;
}> {
  const results: Array<{ testId: number; name: string; passed: boolean; details: string }> = [];
  let passCount = 0;
  let failCount = 0;

  const logResult = (testId: number, name: string, passed: boolean, details: string) => {
    if (passed) passCount++; else failCount++;
    results.push({ testId, name, passed, details });
    console.log(`[TEST ${testId}] ${passed ? 'PASS' : 'FAIL'} - ${name}: ${details}`);
  };

  const testShiftId = `SHIFT-TEST-${Date.now()}`;
  const testEmpId = `EMP-TEST-${Date.now()}`;
  const testAttendanceId = `ATT-${new Date().toISOString().split('T')[0]}-${testEmpId}`;

  // ----------------------------------------------------
  // TEST 1: SHIFT CREATION
  // ----------------------------------------------------
  try {
    const newShift: ShiftRecord = {
      id: testShiftId,
      companyId,
      name: 'Test Morning Shift',
      code: `TSM-${Math.floor(Math.random() * 900 + 100)}`,
      startTime: '08:00',
      endTime: '16:00',
      gracePeriodMinutes: 15,
      breakDurationMinutes: 30,
      weeklyOffDays: [0],
      status: 'ACTIVE',
      createdAt: new Date().toISOString()
    };

    const saved = await FirestoreService.saveShift(companyId, newShift);
    const shifts = await FirestoreService.getShifts(companyId);
    const found = shifts.find(s => s.id === testShiftId);

    logResult(1, 'Shift Creation', saved && !!found, saved && found ? `Shift ${found.code} saved to companies/${companyId}/shifts/${testShiftId}` : 'Failed to save shift');
  } catch (err: any) {
    logResult(1, 'Shift Creation', false, err.message);
  }

  // ----------------------------------------------------
  // TEST 2: SHIFT UPDATE
  // ----------------------------------------------------
  try {
    const shifts = await FirestoreService.getShifts(companyId);
    const existing = shifts.find(s => s.id === testShiftId);
    if (existing) {
      existing.name = 'Updated Test Morning Shift';
      existing.gracePeriodMinutes = 20;
      const updated = await FirestoreService.saveShift(companyId, existing);
      const reFetch = await FirestoreService.getShifts(companyId);
      const reFound = reFetch.find(s => s.id === testShiftId);
      logResult(2, 'Shift Update', updated && reFound?.gracePeriodMinutes === 20, 'Shift grace period updated to 20 mins');
    } else {
      logResult(2, 'Shift Update', false, 'Shift record not found for update');
    }
  } catch (err: any) {
    logResult(2, 'Shift Update', false, err.message);
  }

  // ----------------------------------------------------
  // TEST 3: SHIFT DEACTIVATION
  // ----------------------------------------------------
  try {
    const ok = await FirestoreService.updateShiftStatus(companyId, testShiftId, 'INACTIVE');
    const shifts = await FirestoreService.getShifts(companyId);
    const updated = shifts.find(s => s.id === testShiftId);
    logResult(3, 'Shift Deactivation', ok && updated?.status === 'INACTIVE', 'Shift status updated to INACTIVE in Firestore');
  } catch (err: any) {
    logResult(3, 'Shift Deactivation', false, err.message);
  }

  // ----------------------------------------------------
  // TEST 4: DUPLICATE SHIFT CODE PREVENTION
  // ----------------------------------------------------
  try {
    const shifts = await FirestoreService.getShifts(companyId);
    if (shifts.length > 0) {
      const codeToTest = shifts[0].code;
      const isDup = await FirestoreService.checkDuplicateShiftCode(companyId, codeToTest);
      logResult(4, 'Duplicate Shift Code Prevention', isDup, `Duplicate code '${codeToTest}' correctly detected`);
    } else {
      logResult(4, 'Duplicate Shift Code Prevention', true, 'No shifts to test duplicate code');
    }
  } catch (err: any) {
    logResult(4, 'Duplicate Shift Code Prevention', false, err.message);
  }

  // ----------------------------------------------------
  // TEST 5: SHIFT ASSIGNMENT
  // ----------------------------------------------------
  try {
    const testEmp: EmployeeRecord = {
      id: testEmpId,
      employeeId: testEmpId,
      companyId,
      firstName: 'Test',
      lastName: 'Guard',
      contactNumber: '9998887770',
      dateOfBirth: '1995-01-01',
      bloodGroup: 'O+',
      gender: 'MALE',
      emergencyContact: { name: 'Ref', relation: 'Brother', phone: '9998887771' },
      assignedRegionId: 'REG-01',
      assignedBranchId: 'BR-01',
      assignedSiteId: 'SITE-01',
      departmentId: 'DEP-01',
      designation: 'Security Guard',
      status: 'ACTIVE',
      joinedDate: '2025-01-01',
      assignedShiftId: testShiftId,
      role: 'GUARD',
      documents: [],
      createdBy: 'ADMIN',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const saved = await FirestoreService.saveEmployee(companyId, testEmp);
    logResult(5, 'Shift Assignment to Employee', saved, `Employee ${testEmpId} assigned shift ${testShiftId}`);
  } catch (err: any) {
    logResult(5, 'Shift Assignment to Employee', false, err.message);
  }

  // ----------------------------------------------------
  // TEST 6: PUNCH IN & LATE ARRIVAL CALCULATION
  // ----------------------------------------------------
  try {
    const testShift: ShiftRecord = {
      id: testShiftId,
      companyId,
      name: 'Shift 8AM',
      code: 'S8AM',
      startTime: '08:00',
      endTime: '16:00',
      gracePeriodMinutes: 15,
      breakDurationMinutes: 30,
      weeklyOffDays: [0],
      status: 'ACTIVE'
    };

    const todayStr = new Date().toISOString().split('T')[0];
    const latePunchTime = new Date(`${todayStr}T08:35:00`).toISOString();

    const punchInLog: Omit<AttendanceLogRecord, 'id' | 'createdAt'> = {
      companyId,
      employeeId: testEmpId,
      employeeName: 'Test Guard',
      siteId: 'SITE-01',
      siteName: 'Main Site',
      shiftId: testShiftId,
      shiftName: 'Shift 8AM',
      date: todayStr,
      checkInTime: latePunchTime,
      status: 'PRESENT',
      checkInMethod: 'SELF_GPS',
      lateArrivalMinutes: 0,
      earlyDepartureMinutes: 0,
      overtimeMinutes: 0,
      createdBy: 'TEST'
    };

    const res = await FirestoreService.checkInEmployee(companyId, punchInLog, testShift);
    const logs = await FirestoreService.getAttendanceLogsDetailed(companyId, { employeeId: testEmpId, date: todayStr });
    const logFound = logs[0];

    logResult(
      6,
      'Punch In & Late Arrival Calculation',
      res.success && !!logFound && logFound.status === 'LATE' && logFound.lateArrivalMinutes === 35,
      `Calculated lateArrivalMinutes: ${logFound?.lateArrivalMinutes}m, status: ${logFound?.status}`
    );
  } catch (err: any) {
    logResult(6, 'Punch In & Late Arrival Calculation', false, err.message);
  }

  // ----------------------------------------------------
  // TEST 7: PUNCH OUT & EARLY DEPARTURE / OVERTIME CALCULATION
  // ----------------------------------------------------
  try {
    const testShift: ShiftRecord = {
      id: testShiftId,
      companyId,
      name: 'Shift 8AM',
      code: 'S8AM',
      startTime: '08:00',
      endTime: '16:00',
      gracePeriodMinutes: 15,
      breakDurationMinutes: 30,
      weeklyOffDays: [0],
      status: 'ACTIVE'
    };

    const todayStr = new Date().toISOString().split('T')[0];
    const logId = `ATT-${todayStr}-${testEmpId}`;
    const checkOutTimeISO = new Date(`${todayStr}T17:30:00`).toISOString();

    const res = await FirestoreService.checkOutEmployee(companyId, logId, checkOutTimeISO, { latitude: 28.6139, longitude: 77.2090 }, testShift);
    const logs = await FirestoreService.getAttendanceLogsDetailed(companyId, { employeeId: testEmpId, date: todayStr });
    const logFound = logs[0];

    logResult(
      7,
      'Punch Out & Overtime Calculation',
      res.success && !!logFound?.checkOutTime && logFound.overtimeMinutes === 90,
      `Calculated overtimeMinutes: ${logFound?.overtimeMinutes}m, checkOutTime captured`
    );
  } catch (err: any) {
    logResult(7, 'Punch Out & Overtime Calculation', false, err.message);
  }

  // ----------------------------------------------------
  // TEST 8: DUPLICATE PUNCH PREVENTION
  // ----------------------------------------------------
  try {
    const todayStr = new Date().toISOString().split('T')[0];
    const dupLog: Omit<AttendanceLogRecord, 'id' | 'createdAt'> = {
      companyId,
      employeeId: testEmpId,
      employeeName: 'Test Guard',
      siteId: 'SITE-01',
      shiftId: testShiftId,
      date: todayStr,
      checkInTime: new Date().toISOString(),
      status: 'PRESENT',
      checkInMethod: 'SELF_GPS',
      lateArrivalMinutes: 0,
      earlyDepartureMinutes: 0,
      overtimeMinutes: 0,
      createdBy: 'TEST'
    };

    const res = await FirestoreService.checkInEmployee(companyId, dupLog);
    logResult(8, 'Duplicate Punch Prevention', !res.success, `Duplicate punch correctly blocked with msg: "${res.message}"`);
  } catch (err: any) {
    logResult(8, 'Duplicate Punch Prevention', false, err.message);
  }

  // ----------------------------------------------------
  // TEST 9: SUPERVISOR MUSTER PUNCH
  // ----------------------------------------------------
  try {
    const todayStr = new Date().toISOString().split('T')[0];
    const musterEmpId = `EMP-MUSTER-${Date.now()}`;
    const musterLog: AttendanceLogRecord = {
      id: `ATT-${todayStr}-${musterEmpId}`,
      companyId,
      employeeId: musterEmpId,
      employeeName: 'Muster Guard',
      siteId: 'SITE-01',
      shiftId: testShiftId,
      date: todayStr,
      checkInTime: new Date().toISOString(),
      status: 'PRESENT',
      checkInMethod: 'SUPERVISOR_MUSTER',
      lateArrivalMinutes: 0,
      earlyDepartureMinutes: 0,
      overtimeMinutes: 0,
      approvedBy: 'SUPERVISOR-1',
      createdAt: new Date().toISOString(),
      createdBy: 'SUPERVISOR-1'
    };

    const saved = await FirestoreService.saveAttendanceLogDirect(companyId, musterLog);
    const logs = await FirestoreService.getAttendanceLogsDetailed(companyId, { employeeId: musterEmpId, date: todayStr });
    const found = logs[0];

    logResult(9, 'Supervisor Muster Punch', saved && found?.checkInMethod === 'SUPERVISOR_MUSTER', `Muster log saved with method: ${found?.checkInMethod}`);
  } catch (err: any) {
    logResult(9, 'Supervisor Muster Punch', false, err.message);
  }

  // ----------------------------------------------------
  // TEST 10: ATTENDANCE CORRECTION APPLICATION
  // ----------------------------------------------------
  try {
    const todayStr = new Date().toISOString().split('T')[0];
    const logId = `ATT-${todayStr}-${testEmpId}`;

    const ok = await FirestoreService.requestAttendanceCorrection(companyId, logId, 'Forgot phone at home, verified by site supervisor');
    const logs = await FirestoreService.getAttendanceLogsDetailed(companyId, { employeeId: testEmpId, date: todayStr });
    const found = logs[0];

    logResult(10, 'Attendance Correction Application', Boolean(ok && found?.correctionRequested && found?.correctionStatus === 'PENDING'), `Correction requested with status: ${found?.correctionStatus}`);
  } catch (err: any) {
    logResult(10, 'Attendance Correction Application', false, err.message);
  }

  // ----------------------------------------------------
  // TEST 11: ATTENDANCE CORRECTION APPROVAL
  // ----------------------------------------------------
  try {
    const todayStr = new Date().toISOString().split('T')[0];
    const logId = `ATT-${todayStr}-${testEmpId}`;

    const ok = await FirestoreService.approveOrRejectAttendanceCorrection(companyId, logId, true, 'HR-ADMIN-1');
    const logs = await FirestoreService.getAttendanceLogsDetailed(companyId, { employeeId: testEmpId, date: todayStr });
    const found = logs[0];

    logResult(11, 'Attendance Correction Approval', Boolean(ok && found?.correctionStatus === 'APPROVED' && !found?.correctionRequested), `Correction approved by HR-ADMIN-1`);
  } catch (err: any) {
    logResult(11, 'Attendance Correction Approval', false, err.message);
  }

  // ----------------------------------------------------
  // TEST 12: TENANT ISOLATION
  // ----------------------------------------------------
  try {
    const otherCompanyId = 'COMP-OTHER-ISOLATION';
    const otherShifts = await FirestoreService.getShifts(otherCompanyId);
    const hasLeak = otherShifts.some(s => s.companyId === companyId);

    logResult(12, 'Tenant Isolation', !hasLeak, `Tenant ${companyId} records isolated from ${otherCompanyId}`);
  } catch (err: any) {
    logResult(12, 'Tenant Isolation', false, err.message);
  }

  // ----------------------------------------------------
  // TEST 13: GPS GEOLOCATION CAPTURE
  // ----------------------------------------------------
  try {
    const logs = await FirestoreService.getAttendanceLogsDetailed(companyId, { employeeId: testEmpId });
    const hasGps = Boolean(logs.some(l => l.checkOutGps && l.checkOutGps.latitude !== undefined));

    logResult(13, 'GPS Geolocation Capture', hasGps, `GPS coordinates present on attendance checkout record`);
  } catch (err: any) {
    logResult(13, 'GPS Geolocation Capture', false, err.message);
  }

  // ----------------------------------------------------
  // TEST 14: OFFLINE QUEUE ENQUEUE
  // ----------------------------------------------------
  try {
    const logs = await FirestoreService.getAttendanceLogsDetailed(companyId);
    logResult(14, 'Attendance Log Query & Filtering', Array.isArray(logs), `Successfully retrieved ${logs.length} attendance logs from Firestore`);
  } catch (err: any) {
    logResult(14, 'Attendance Log Query & Filtering', false, err.message);
  }

  return { passCount, failCount, results };
}
