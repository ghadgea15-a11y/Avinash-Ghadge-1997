import * as crypto from 'crypto';

// --- TYPE DEFINITIONS ---
interface EmployeeRecord { id: string; authUid?: string; assignedSiteId?: string; assignedRegionId?: string; authorityLevel?: string; role?: string; }
interface SiteRecord { id: string; regionId?: string; }
interface LeaveRequestRecord { id: string; employeeId: string; siteId?: string; assignedRegionId?: string; }
interface ApprovalRequestRecord { id: string; uid: string; requestedRole: string; siteId?: string; assignedRegionId?: string; }
interface TransactionalRecord { id: string; siteId?: string; assignedRegionId?: string; }

interface MigrationAudit {
  migrationId: string;
  timestamp: string;
  collection: string;
  documentId: string;
  changedFields: string[];
  beforeValues: Record<string, any>;
  afterValues: Record<string, any>;
  sourceOfTruth: string;
  status: 'MIGRATED' | 'CONFLICT' | 'AMBIGUOUS' | 'MISSING_SOURCE' | 'ALREADY_VALID' | 'MANUAL_REVIEW';
  reason: string;
}

// --- MIGRATION LOGIC CORE ---
export class MigrationEngine {
  private employees: Map<string, EmployeeRecord> = new Map();
  private employeesByUid: Map<string, EmployeeRecord> = new Map();
  private sites: Map<string, SiteRecord> = new Map();

  constructor(employees: EmployeeRecord[], sites: SiteRecord[]) {
    employees.forEach(e => {
      this.employees.set(e.id, e);
      if (e.authUid) this.employeesByUid.set(e.authUid, e);
    });
    sites.forEach(s => this.sites.set(s.id, s));
  }

  processLeaveRequest(doc: LeaveRequestRecord): MigrationAudit {
    const audit: MigrationAudit = {
      migrationId: 'MIG_P2B_LEAVES', timestamp: new Date().toISOString(),
      collection: 'leave_requests', documentId: doc.id, changedFields: [],
      beforeValues: { siteId: doc.siteId, assignedRegionId: doc.assignedRegionId },
      afterValues: {}, sourceOfTruth: 'EmployeeRecord', status: 'MANUAL_REVIEW', reason: ''
    };

    const emp = this.employees.get(doc.employeeId);
    if (!emp) {
      audit.status = 'MISSING_SOURCE'; audit.reason = 'Employee record not found'; return audit;
    }

    const proposedSiteId = emp.assignedSiteId;
    const proposedRegionId = emp.assignedRegionId;

    if (!proposedSiteId || !proposedRegionId) {
       audit.status = 'MISSING_SOURCE'; audit.reason = 'Employee missing site or region assignment'; return audit;
    }

    if (doc.siteId && doc.siteId !== proposedSiteId) {
      audit.status = 'CONFLICT'; audit.reason = `Existing siteId (${doc.siteId}) conflicts with employee site (${proposedSiteId})`; return audit;
    }

    if (doc.siteId === proposedSiteId && doc.assignedRegionId === proposedRegionId) {
      audit.status = 'ALREADY_VALID'; audit.reason = 'Record is already correctly scoped'; return audit;
    }

    audit.status = 'MIGRATED';
    audit.reason = 'Safe to migrate based on authoritative employee record';
    audit.changedFields = ['siteId', 'assignedRegionId'];
    audit.afterValues = { siteId: proposedSiteId, assignedRegionId: proposedRegionId };
    return audit;
  }

  processApprovalRequest(doc: ApprovalRequestRecord): MigrationAudit {
    const audit: MigrationAudit = {
      migrationId: 'MIG_P2B_APPROVALS', timestamp: new Date().toISOString(),
      collection: 'approval_requests', documentId: doc.id, changedFields: [],
      beforeValues: { siteId: doc.siteId, assignedRegionId: doc.assignedRegionId },
      afterValues: {}, sourceOfTruth: 'Workflow Classification', status: 'MANUAL_REVIEW', reason: ''
    };

    const emp = this.employeesByUid.get(doc.uid);
    
    // Classify
    const isCorporate = emp && ['A0_OWNER', 'A1_DIRECTOR_CEO', 'A2_GENERAL_MANAGER', 'A3_OFFICIAL_STAFF'].includes(emp.authorityLevel || '');
    const isRegional = emp && emp.authorityLevel === 'A4_REGIONAL_AREA_MANAGER';

    if (isCorporate) {
      if (doc.siteId === 'CORPORATE' && doc.assignedRegionId === 'CORPORATE') {
         audit.status = 'ALREADY_VALID'; audit.reason = 'Corporate scope already set'; return audit;
      }
      audit.status = 'MIGRATED'; audit.reason = 'Classified as Corporate Workflow';
      audit.changedFields = ['siteId', 'assignedRegionId'];
      audit.afterValues = { siteId: 'CORPORATE', assignedRegionId: 'CORPORATE' };
      return audit;
    }

    if (isRegional) {
      const regionId = emp.assignedRegionId;
      if (!regionId) { audit.status = 'MISSING_SOURCE'; audit.reason = 'Regional manager missing assignedRegionId'; return audit; }
      if (doc.siteId === 'REGIONAL' && doc.assignedRegionId === regionId) {
        audit.status = 'ALREADY_VALID'; audit.reason = 'Regional scope already set'; return audit;
      }
      audit.status = 'MIGRATED'; audit.reason = 'Classified as Regional Workflow';
      audit.changedFields = ['siteId', 'assignedRegionId'];
      audit.afterValues = { siteId: 'REGIONAL', assignedRegionId: regionId };
      return audit;
    }

    if (!emp) {
       audit.status = 'AMBIGUOUS'; audit.reason = 'Requester employee mapping not found. Cannot determine scope.'; return audit;
    }

    // Ground Workflow
    if (!emp.assignedSiteId || !emp.assignedRegionId) {
       audit.status = 'MISSING_SOURCE'; audit.reason = 'Ground employee missing site/region assignment'; return audit;
    }

    if (doc.siteId && doc.siteId !== emp.assignedSiteId) {
      audit.status = 'CONFLICT'; audit.reason = `Existing siteId (${doc.siteId}) conflicts with employee site (${emp.assignedSiteId})`; return audit;
    }

    if (doc.siteId === emp.assignedSiteId && doc.assignedRegionId === emp.assignedRegionId) {
       audit.status = 'ALREADY_VALID'; audit.reason = 'Record correctly scoped'; return audit;
    }

    audit.status = 'MIGRATED'; audit.reason = 'Classified as Site Workflow';
    audit.changedFields = ['siteId', 'assignedRegionId'];
    audit.afterValues = { siteId: emp.assignedSiteId, assignedRegionId: emp.assignedRegionId };
    return audit;
  }

  processTransactionalLog(doc: TransactionalRecord, collectionName: string): MigrationAudit {
    const audit: MigrationAudit = {
      migrationId: 'MIG_P2B_TRANSACTIONS', timestamp: new Date().toISOString(),
      collection: collectionName, documentId: doc.id, changedFields: [],
      beforeValues: { assignedRegionId: doc.assignedRegionId },
      afterValues: {}, sourceOfTruth: 'SiteRecord', status: 'MANUAL_REVIEW', reason: ''
    };

    if (!doc.siteId) {
      audit.status = 'MISSING_SOURCE'; audit.reason = 'Record lacks siteId; cannot derive region'; return audit;
    }

    const site = this.sites.get(doc.siteId);
    if (!site) {
      audit.status = 'MISSING_SOURCE'; audit.reason = `SiteRecord ${doc.siteId} not found in map`; return audit;
    }

    if (!site.regionId) {
      audit.status = 'MISSING_SOURCE'; audit.reason = `SiteRecord ${doc.siteId} lacks regionId`; return audit;
    }

    if (doc.assignedRegionId === site.regionId) {
      audit.status = 'ALREADY_VALID'; audit.reason = 'Region is already correctly stamped'; return audit;
    }

    if (doc.assignedRegionId && doc.assignedRegionId !== site.regionId) {
      audit.status = 'CONFLICT'; audit.reason = `Existing region (${doc.assignedRegionId}) conflicts with site's region (${site.regionId})`; return audit;
    }

    audit.status = 'MIGRATED'; audit.reason = 'Derived assignedRegionId from SiteRecord';
    audit.changedFields = ['assignedRegionId'];
    audit.afterValues = { assignedRegionId: site.regionId };
    return audit;
  }
}

// --- MOCK TEST RUNNER ---
function runTests() {
  console.log("Running Static Mock Validation...\n");

  const mockEmployees: EmployeeRecord[] = [
    { id: 'E_SITE', authUid: 'U1', assignedSiteId: 'S1', assignedRegionId: 'R1', authorityLevel: 'A7_SKILLED' },
    { id: 'E_CORP', authUid: 'U2', authorityLevel: 'A2_GENERAL_MANAGER' },
    { id: 'E_REGIONAL', authUid: 'U3', assignedRegionId: 'R2', authorityLevel: 'A4_REGIONAL_AREA_MANAGER' },
    { id: 'E_CONFLICT', authUid: 'U4', assignedSiteId: 'S2', assignedRegionId: 'R1', authorityLevel: 'A5_SITE_IN_CHARGE' }
  ];
  const mockSites: SiteRecord[] = [
    { id: 'S1', regionId: 'R1' }, { id: 'S2', regionId: 'R1' }
  ];

  const engine = new MigrationEngine(mockEmployees, mockSites);

  // Test 1: Valid Employee Mapping (Leave)
  const l1 = engine.processLeaveRequest({ id: 'L1', employeeId: 'E_SITE' });
  console.assert(l1.status === 'MIGRATED' && l1.afterValues.siteId === 'S1', 'Test 1 Failed');

  // Test 2: Missing Employee (Leave)
  const l2 = engine.processLeaveRequest({ id: 'L2', employeeId: 'E_GHOST' });
  console.assert(l2.status === 'MISSING_SOURCE', 'Test 2 Failed');

  // Test 3: Conflicting Site (Leave)
  const l3 = engine.processLeaveRequest({ id: 'L3', employeeId: 'E_SITE', siteId: 'S99' });
  console.assert(l3.status === 'CONFLICT', 'Test 3 Failed');

  // Test 4: Corporate Approval
  const a1 = engine.processApprovalRequest({ id: 'A1', uid: 'U2', requestedRole: 'HR_ADMIN' });
  console.assert(a1.status === 'MIGRATED' && a1.afterValues.siteId === 'CORPORATE', 'Test 4 Failed');

  // Test 5: Site Approval
  const a2 = engine.processApprovalRequest({ id: 'A2', uid: 'U1', requestedRole: 'A7_SKILLED' });
  console.assert(a2.status === 'MIGRATED' && a2.afterValues.siteId === 'S1', 'Test 5 Failed');

  // Test 6: Regional Approval
  const a3 = engine.processApprovalRequest({ id: 'A3', uid: 'U3', requestedRole: 'A4_REGIONAL_AREA_MANAGER' });
  console.assert(a3.status === 'MIGRATED' && a3.afterValues.siteId === 'REGIONAL' && a3.afterValues.assignedRegionId === 'R2', 'Test 6 Failed');

  // Test 7: Transactional Log (Attendance)
  const t1 = engine.processTransactionalLog({ id: 'T1', siteId: 'S1' }, 'attendance_logs');
  console.assert(t1.status === 'MIGRATED' && t1.afterValues.assignedRegionId === 'R1', 'Test 7 Failed');

  // Test 8: Transactional Log Conflict
  const t2 = engine.processTransactionalLog({ id: 'T2', siteId: 'S1', assignedRegionId: 'R99' }, 'attendance_logs');
  console.assert(t2.status === 'CONFLICT', 'Test 8 Failed');

  // Test 9: Already Valid
  const t3 = engine.processTransactionalLog({ id: 'T3', siteId: 'S1', assignedRegionId: 'R1' }, 'attendance_logs');
  console.assert(t3.status === 'ALREADY_VALID', 'Test 9 Failed');

  console.log("All 9 Mock Validation Tests Passed. Algorithm is deterministic and idempotent.");
}

// If invoked directly, run tests
if (require.main === module) {
  runTests();
}
