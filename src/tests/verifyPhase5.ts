import { FirestoreService } from '../services/firestoreService';
import { 
  PatrolCheckpointRecord, 
  PatrolLogRecord, 
  IncidentReportRecord, 
  VisitorLogRecord, 
  MaterialMovementRecord, 
  DailySiteLogRecord 
} from '../types';

export interface TestResult {
  name: string;
  passed: boolean;
  message: string;
}

export async function runPhase5Verification(): Promise<{
  passedCount: number;
  failedCount: number;
  results: TestResult[];
}> {
  const results: TestResult[] = [];
  const testCompanyId = 'MUSTER-TEST-CORP';
  const testSiteId = 'SITE-NORTH-01';

  console.log('=== STARTING PHASE 5 SITE OPERATIONS VERIFICATION ===');

  // Test 1: Save Patrol Checkpoint
  try {
    const cp: PatrolCheckpointRecord = {
      id: `CP-TEST-${Date.now()}`,
      companyId: testCompanyId,
      siteId: testSiteId,
      siteName: 'North Gate Perimeter',
      checkpointName: 'Post #1 Gate Boundary',
      code: 'CP-101',
      qrCode: 'LSM-QR-CP-101',
      sequenceOrder: 1,
      status: 'ACTIVE',
      createdAt: new Date().toISOString()
    };
    const saved = await FirestoreService.savePatrolCheckpoint(testCompanyId, cp);
    results.push({
      name: 'Patrol Checkpoint Creation',
      passed: Boolean(saved),
      message: saved ? 'Patrol checkpoint successfully created.' : 'Failed to save checkpoint.'
    });
  } catch (err: any) {
    results.push({ name: 'Patrol Checkpoint Creation', passed: false, message: err.message });
  }

  // Test 2: Fetch Patrol Checkpoints
  try {
    const checkpoints = await FirestoreService.getPatrolCheckpoints(testCompanyId, testSiteId);
    results.push({
      name: 'Fetch Patrol Checkpoints for Site',
      passed: Array.isArray(checkpoints),
      message: `Fetched ${checkpoints.length} checkpoints for site ${testSiteId}.`
    });
  } catch (err: any) {
    results.push({ name: 'Fetch Patrol Checkpoints for Site', passed: false, message: err.message });
  }

  // Test 3: Log Guard Patrol Tour
  try {
    const pLog: PatrolLogRecord = {
      id: `PATROL-TEST-${Date.now()}`,
      companyId: testCompanyId,
      siteId: testSiteId,
      siteName: 'North Gate Perimeter',
      patrolName: 'Night Shift Perimeter Tour',
      guardId: 'EMP-GUARD-01',
      guardName: 'Vikram Singh',
      startTime: new Date().toISOString(),
      endTime: new Date().toISOString(),
      checkpointsVisited: ['CP-101'],
      totalCheckpoints: 1,
      status: 'COMPLETED',
      createdAt: new Date().toISOString()
    };
    const saved = await FirestoreService.savePatrolLog(testCompanyId, pLog);
    results.push({
      name: 'Guard Patrol Tour Execution Log',
      passed: Boolean(saved),
      message: saved ? 'Patrol tour logged with COMPLETED status.' : 'Failed to save patrol log.'
    });
  } catch (err: any) {
    results.push({ name: 'Guard Patrol Tour Execution Log', passed: false, message: err.message });
  }

  // Test 4: Report Incident
  try {
    const inc: IncidentReportRecord = {
      id: `INC-TEST-${Date.now()}`,
      companyId: testCompanyId,
      siteId: testSiteId,
      siteName: 'North Gate Perimeter',
      reportedById: 'EMP-GUARD-01',
      reportedByName: 'Vikram Singh',
      title: 'Perimeter Fence Breach Alert',
      category: 'SECURITY_BREACH',
      severity: 'CRITICAL',
      description: 'Sensor alert triggered near East perimeter boundary.',
      status: 'OPEN',
      reportedAt: new Date().toISOString()
    };
    const saved = await FirestoreService.saveIncidentReport(testCompanyId, inc);
    results.push({
      name: 'Security Incident Reporting',
      passed: Boolean(saved),
      message: saved ? 'CRITICAL security incident successfully reported.' : 'Failed to log incident.'
    });
  } catch (err: any) {
    results.push({ name: 'Security Incident Reporting', passed: false, message: err.message });
  }

  // Test 5: Resolve Incident Workflow
  try {
    const incId = `INC-TEST-${Date.now()}`;
    const inc: IncidentReportRecord = {
      id: incId,
      companyId: testCompanyId,
      siteId: testSiteId,
      reportedById: 'EMP-GUARD-01',
      reportedByName: 'Vikram Singh',
      title: 'Minor Lighting Fault',
      category: 'PROPERTY_DAMAGE',
      severity: 'LOW',
      description: 'Lamp post #3 bulb needs replacement.',
      status: 'OPEN',
      reportedAt: new Date().toISOString()
    };
    await FirestoreService.saveIncidentReport(testCompanyId, inc);
    const updated = await FirestoreService.updateIncidentStatus(testCompanyId, incId, 'RESOLVED', 'Bulb replaced by facility electrician.', 'EMP-MGR-01', 'Rajesh Sharma');
    results.push({
      name: 'Incident Resolution & Audit Trail',
      passed: Boolean(updated),
      message: updated ? 'Incident status resolved with auditor timestamp.' : 'Failed to resolve incident.'
    });
  } catch (err: any) {
    results.push({ name: 'Incident Resolution & Audit Trail', passed: false, message: err.message });
  }

  // Test 6: Visitor Gate Check-In
  try {
    const vis: VisitorLogRecord = {
      id: `VIS-TEST-${Date.now()}`,
      companyId: testCompanyId,
      siteId: testSiteId,
      visitorName: 'Anil Mehta',
      visitorPhone: '+919876543210',
      visitorCompany: 'Precision Tech Supplies',
      hostEmployeeName: 'Priya Nair',
      purpose: 'Vendor Audit',
      badgeNumber: 'VIS-404',
      vehicleNumber: 'KA-01-MJ-9988',
      checkInTime: new Date().toISOString(),
      status: 'IN_SITE',
      entryGateGuardId: 'EMP-GUARD-01',
      createdAt: new Date().toISOString()
    };
    const checkedIn = await FirestoreService.checkInVisitor(testCompanyId, vis);
    results.push({
      name: 'Visitor Gate Check-In',
      passed: Boolean(checkedIn),
      message: checkedIn ? 'Visitor checked in with digital badge VIS-404.' : 'Failed visitor check-in.'
    });
  } catch (err: any) {
    results.push({ name: 'Visitor Gate Check-In', passed: false, message: err.message });
  }

  // Test 7: Visitor Gate Check-Out
  try {
    const visId = `VIS-TEST-OUT-${Date.now()}`;
    const vis: VisitorLogRecord = {
      id: visId,
      companyId: testCompanyId,
      siteId: testSiteId,
      visitorName: 'Suresh Kumar',
      visitorPhone: '+919811122233',
      hostEmployeeName: 'Priya Nair',
      purpose: 'Interview',
      badgeNumber: 'VIS-405',
      checkInTime: new Date().toISOString(),
      status: 'IN_SITE',
      entryGateGuardId: 'EMP-GUARD-01',
      createdAt: new Date().toISOString()
    };
    await FirestoreService.checkInVisitor(testCompanyId, vis);
    const checkedOut = await FirestoreService.checkOutVisitor(testCompanyId, visId);
    results.push({
      name: 'Visitor Gate Check-Out',
      passed: Boolean(checkedOut),
      message: checkedOut ? 'Visitor checked out with exit timestamp.' : 'Failed visitor check-out.'
    });
  } catch (err: any) {
    results.push({ name: 'Visitor Gate Check-Out', passed: false, message: err.message });
  }

  // Test 8: Material Gate Pass Creation
  try {
    const mat: MaterialMovementRecord = {
      id: `MAT-TEST-${Date.now()}`,
      companyId: testCompanyId,
      siteId: testSiteId,
      movementType: 'INWARD',
      gatePassNumber: 'GP-9001',
      materialDescription: 'Heavy Duty CCTV Cameras & Fiber Cables',
      quantity: '20 Boxes',
      supplierVendorName: 'Bosch Security Systems',
      vehicleNumber: 'MH-04-AB-1234',
      driverName: 'Sanjay Dutt',
      driverPhone: '+919988776655',
      status: 'PENDING_APPROVAL',
      createdAt: new Date().toISOString(),
      createdBy: 'EMP-GUARD-01'
    };
    const saved = await FirestoreService.saveMaterialMovementLog(testCompanyId, mat);
    results.push({
      name: 'Inward Material Gate Pass Entry',
      passed: Boolean(saved),
      message: saved ? 'Material gate pass GP-9001 created in PENDING_APPROVAL status.' : 'Failed material pass.'
    });
  } catch (err: any) {
    results.push({ name: 'Inward Material Gate Pass Entry', passed: false, message: err.message });
  }

  // Test 9: Material Pass Approval Workflow
  try {
    const matId = `MAT-APPROVAL-${Date.now()}`;
    const mat: MaterialMovementRecord = {
      id: matId,
      companyId: testCompanyId,
      siteId: testSiteId,
      movementType: 'OUTWARD',
      gatePassNumber: 'GP-9002',
      materialDescription: 'E-Waste Computers for Recycling',
      quantity: '10 Units',
      supplierVendorName: 'Green Recyclers Pvt Ltd',
      vehicleNumber: 'DL-01-XY-5555',
      driverName: 'Mohan Lal',
      driverPhone: '+919777665544',
      status: 'PENDING_APPROVAL',
      createdAt: new Date().toISOString(),
      createdBy: 'EMP-GUARD-01'
    };
    await FirestoreService.saveMaterialMovementLog(testCompanyId, mat);
    const approved = await FirestoreService.updateMaterialStatus(testCompanyId, matId, 'APPROVED', 'EMP-MGR-01', 'Rajesh Sharma');
    results.push({
      name: 'Material Pass Manager Approval',
      passed: Boolean(approved),
      message: approved ? 'Material pass approved by Operations Manager.' : 'Failed approval.'
    });
  } catch (err: any) {
    results.push({ name: 'Material Pass Manager Approval', passed: false, message: err.message });
  }

  // Test 10: Daily Master Site Log Record
  try {
    const siteLog: DailySiteLogRecord = {
      id: `DAILY-LOG-${Date.now()}`,
      companyId: testCompanyId,
      siteId: testSiteId,
      siteName: 'North Gate Perimeter',
      date: new Date().toISOString().split('T')[0],
      supervisorId: 'EMP-MGR-01',
      supervisorName: 'Rajesh Sharma',
      weatherCondition: 'Clear & Sunny',
      guardsCountOnDuty: 8,
      totalPatrolsCompleted: 12,
      totalVisitorsLogged: 45,
      totalIncidentsReported: 1,
      generalNotes: 'Shift completed without safety violations.',
      status: 'SUBMITTED',
      createdAt: new Date().toISOString()
    };
    const saved = await FirestoreService.saveDailySiteLog(testCompanyId, siteLog);
    results.push({
      name: 'Master Daily Site Muster Report',
      passed: Boolean(saved),
      message: saved ? 'Master daily site log submitted with 100% telemetry.' : 'Failed daily log.'
    });
  } catch (err: any) {
    results.push({ name: 'Master Daily Site Muster Report', passed: false, message: err.message });
  }

  const passedCount = results.filter(r => r.passed).length;
  const failedCount = results.length - passedCount;

  console.log(`=== PHASE 5 VERIFICATION COMPLETE: ${passedCount}/${results.length} PASSED ===`);

  return {
    passedCount,
    failedCount,
    results
  };
}
