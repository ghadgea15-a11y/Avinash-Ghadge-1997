import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy,
  runTransaction
} from 'firebase/firestore';
import { db } from '../firebase';
import { 
  UserSession, 
  UserRole,
  EmployeeRecord, 
  RosterRecord, 
  ShiftRecord, 
  SiteRecord, 
  TransferRequest 
} from '../types';
import { 
  EnterpriseConflictCategory, 
  ConflictSeverity, 
  ConflictEntityType, 
  DetectedConflict, 
  ConflictOverrideRequest, 
  ConflictValidationResult, 
  ConflictOverrideAuditRecord,
  ConflictAuditMetrics,
  OverrideReasonCode
} from '../types/enterpriseConflict';
import { FirestoreService } from './firestoreService';

export class ConflictBlockedException extends Error {
  public validationResult: ConflictValidationResult;
  public conflicts: DetectedConflict[];

  constructor(message: string, validationResult: ConflictValidationResult) {
    super(message);
    this.name = 'ConflictBlockedException';
    this.validationResult = validationResult;
    this.conflicts = validationResult.conflicts;
  }
}

export class EnterpriseConflictEngine {
  private static OVERRIDES_COLLECTION = 'conflict_overrides';

  // --- Helper: Parse 24hr Time to Minutes from Midnight ---
  private static timeToMinutes(timeStr: string): number {
    if (!timeStr) return 0;
    const parts = timeStr.split(':').map(Number);
    const hours = parts[0] || 0;
    const minutes = parts[1] || 0;
    return hours * 60 + minutes;
  }

  // --- Helper: Check Time Window Intersection ---
  private static checkTimeOverlap(
    startA: string, 
    endA: string, 
    startB: string, 
    endB: string
  ): { overlaps: boolean; overlapMinutes: number } {
    let sA = this.timeToMinutes(startA);
    let eA = this.timeToMinutes(endA);
    let sB = this.timeToMinutes(startB);
    let eB = this.timeToMinutes(endB);

    // If overnight shift, wrap around 24h
    if (eA <= sA) eA += 24 * 60;
    if (eB <= sB) eB += 24 * 60;

    const maxStart = Math.max(sA, sB);
    const minEnd = Math.min(eA, eB);

    if (maxStart < minEnd) {
      return { overlaps: true, overlapMinutes: minEnd - maxStart };
    }
    return { overlaps: false, overlapMinutes: 0 };
  }

  /**
   * 1. VALIDATE ROSTER RECORD (Overlapping Shifts & Multi-Site Collisions)
   */
  static validateRosterAssignment(
    roster: RosterRecord,
    existingRosters: RosterRecord[],
    allShifts: ShiftRecord[],
    allSites: SiteRecord[],
    activeOverrides: ConflictOverrideRequest[] = []
  ): ConflictValidationResult {
    const conflicts: DetectedConflict[] = [];
    const targetShift = allShifts.find(s => s.id === roster.shiftId);
    const targetSite = allSites.find(s => s.id === roster.siteId);

    const shiftStart = targetShift?.startTime || '08:00';
    const shiftEnd = targetShift?.endTime || '16:00';
    const targetDate = roster.date || roster.rosterDate || new Date().toISOString().split('T')[0];

    // Filter existing rosters for the same employee on the same date (excluding itself if updating)
    const sameDayRosters = existingRosters.filter(r => 
      r.id !== roster.id && 
      r.employeeId === roster.employeeId && 
      (r.date === targetDate || r.rosterDate === targetDate) &&
      r.status !== 'CANCELLED'
    );

    for (const other of sameDayRosters) {
      const otherShift = allShifts.find(s => s.id === other.shiftId);
      const otherSite = allSites.find(s => s.id === other.siteId);
      const otherStart = otherShift?.startTime || '08:00';
      const otherEnd = otherShift?.endTime || '16:00';

      // Check 1: Overlapping Shifts Collision
      const overlapCheck = this.checkTimeOverlap(shiftStart, shiftEnd, otherStart, otherEnd);
      if (overlapCheck.overlaps) {
        const ruleCode = 'CONF-ROSTER-001';
        const hasOverride = activeOverrides.some(o => o.ruleCode === ruleCode && o.conflictId.includes(roster.employeeId));

        conflicts.push({
          id: `CONF-OVERLAP-${roster.employeeId}-${roster.shiftId}-${other.shiftId}`,
          ruleCode,
          category: 'OVERLAPPING_SHIFTS',
          severity: 'CRITICAL_BLOCKING',
          title: 'Direct Shift Time Collision Detected',
          reason: `Employee is already scheduled for overlapping shift "${otherShift?.shiftName || 'Shift'}" (${otherStart} - ${otherEnd}) at site "${otherSite?.name || 'Site'}".`,
          detailedExplanation: `Attempted to schedule shift "${targetShift?.shiftName || 'Shift'}" (${shiftStart} - ${shiftEnd}), which collides by ${overlapCheck.overlapMinutes} minutes with existing active shift. One employee cannot be in two shifts simultaneously.`,
          entityType: 'ROSTER_RECORD',
          entityId: roster.id,
          employeeId: roster.employeeId,
          employeeName: roster.employeeName || 'Employee',
          conflictingEntityId: other.id,
          conflictingEntityName: otherShift?.shiftName || 'Existing Shift',
          conflictingContext: {
            siteA: { id: roster.siteId, name: targetSite?.name || 'Site A' },
            siteB: { id: other.siteId, name: otherSite?.name || 'Site B' },
            shiftA: { id: roster.shiftId, name: targetShift?.shiftName || 'Shift A', timeWindow: `${shiftStart} - ${shiftEnd}` },
            shiftB: { id: other.shiftId, name: otherShift?.shiftName || 'Shift B', timeWindow: `${otherStart} - ${otherEnd}` },
            dateA: targetDate
          },
          resolutionSteps: [
            'De-assign the conflicting prior shift before scheduling the new shift.',
            'Assign an alternate available relief personnel without shift overlap.',
            'If emergency relief overlap is required, authorize through Controlled Manager Override.'
          ],
          isBlocker: !hasOverride,
          isOverrideAllowed: true,
          requiredOverrideRoles: ['SUPER_ADMIN', 'COMPANY_ADMIN', 'OPS_MANAGER', 'HR_ADMIN'],
          detectedAt: new Date().toISOString()
        });
      }

      // Check 2: Overlapping Physical Site Assignment with impossible transit window
      if (other.siteId !== roster.siteId) {
        const sA = this.timeToMinutes(shiftStart);
        const eA = this.timeToMinutes(shiftEnd);
        const sB = this.timeToMinutes(otherStart);
        const eB = this.timeToMinutes(otherEnd);

        // Gap between shifts
        const gapMinutes = Math.min(Math.abs(sA - eB), Math.abs(sB - eA));
        if (gapMinutes < 30) {
          const ruleCode = 'CONF-SITE-001';
          const hasOverride = activeOverrides.some(o => o.ruleCode === ruleCode && o.conflictId.includes(roster.employeeId));

          conflicts.push({
            id: `CONF-SITE-COLLISION-${roster.employeeId}-${roster.siteId}-${other.siteId}`,
            ruleCode,
            category: 'OVERLAPPING_SITE_ASSIGNMENTS',
            severity: 'CRITICAL_BLOCKING',
            title: 'Impossible Multi-Site Transit Collision',
            reason: `Employee assigned to separate locations "${targetSite?.name || 'Site A'}" and "${otherSite?.name || 'Site B'}" with only ${gapMinutes} minutes transit buffer.`,
            detailedExplanation: `Statutory and operational standards mandate a minimum transit window between separate deployment facilities. Concurrent multi-site presence violates physical feasibility and insurance coverage.`,
            entityType: 'ROSTER_RECORD',
            entityId: roster.id,
            employeeId: roster.employeeId,
            employeeName: roster.employeeName || 'Employee',
            conflictingEntityId: other.siteId,
            conflictingEntityName: otherSite?.name || 'Site B',
            conflictingContext: {
              siteA: { id: roster.siteId, name: targetSite?.name || 'Site A' },
              siteB: { id: other.siteId, name: otherSite?.name || 'Site B' }
            },
            resolutionSteps: [
              'Reassign employee to a single primary deployment zone per calendar day.',
              'Increase scheduled buffer window between separate site dispatches.'
            ],
            isBlocker: !hasOverride,
            isOverrideAllowed: true,
            requiredOverrideRoles: ['SUPER_ADMIN', 'COMPANY_ADMIN', 'OPS_MANAGER'],
            detectedAt: new Date().toISOString()
          });
        }
      }
    }

    const blockingCount = conflicts.filter(c => c.isBlocker).length;
    const overridableCount = conflicts.filter(c => c.isOverrideAllowed).length;

    return {
      isValid: conflicts.length === 0,
      hasBlockers: blockingCount > 0,
      conflicts,
      blockingCount,
      overridableCount,
      warningCount: 0,
      summary: blockingCount > 0 
        ? `Transaction blocked by ${blockingCount} critical operational conflict(s).` 
        : conflicts.length > 0 
          ? `Validated with ${conflicts.length} overridable exception(s).` 
          : 'All assignment compatibility rules satisfied.'
    };
  }

  /**
   * 2. VALIDATE EMPLOYEE RECORD (Duplicate Active Assignment, Supervisor Loops, SoD, Effective Dates)
   */
  static validateEmployeeAssignment(
    employee: EmployeeRecord,
    allEmployees: EmployeeRecord[],
    allSites: SiteRecord[],
    activeOverrides: ConflictOverrideRequest[] = []
  ): ConflictValidationResult {
    const conflicts: DetectedConflict[] = [];
    const empName = `${employee.firstName || ''} ${employee.lastName || ''}`.trim() || 'Employee';

    // 1. Check DUPLICATE_ACTIVE_ASSIGNMENT (National ID / Active Duplicate Profile)
    const empAny = employee as any;
    const duplicateAadhaar = empAny.aadhaarNumber && allEmployees.find(e => 
      e.id !== employee.id && 
      (e as any).aadhaarNumber === empAny.aadhaarNumber && 
      e.status === 'ACTIVE'
    );
    const duplicatePAN = empAny.panNumber && allEmployees.find(e => 
      e.id !== employee.id && 
      (e as any).panNumber === empAny.panNumber && 
      e.status === 'ACTIVE'
    );

    if (duplicateAadhaar || duplicatePAN) {
      const match = duplicateAadhaar || duplicatePAN;
      const ruleCode = 'CONF-EMP-001';
      const hasOverride = activeOverrides.some(o => o.ruleCode === ruleCode && o.conflictId.includes(employee.id));

      conflicts.push({
        id: `CONF-DUP-ACTIVE-${employee.id}-${match?.id}`,
        ruleCode,
        category: 'DUPLICATE_ACTIVE_ASSIGNMENT',
        severity: 'CRITICAL_BLOCKING',
        title: 'Duplicate Active Employment Record Detected',
        reason: `National identification credentials match active employee "${match?.firstName} ${match?.lastName}" (ID: ${match?.id}, Site: ${match?.assignedSiteId}).`,
        detailedExplanation: `Statutory labor rules strictly prohibit maintaining duplicate active primary personnel accounts under identical identity numbers.`,
        entityType: 'EMPLOYEE_RECORD',
        entityId: employee.id,
        employeeId: employee.id,
        employeeName: empName,
        conflictingEntityId: match?.id,
        conflictingEntityName: `${match?.firstName} ${match?.lastName}`,
        resolutionSteps: [
          'Deactivate or merge the prior existing employee profile.',
          'Verify KYC identity numbers entered for typos or duplicates.'
        ],
        isBlocker: !hasOverride,
        isOverrideAllowed: false,
        requiredOverrideRoles: ['SUPER_ADMIN'],
        detectedAt: new Date().toISOString()
      });
    }

    // 2. Check CONFLICTING_SUPERVISORS & CIRCULAR REPORTING
    const supervisorId = empAny.reportingManagerId || empAny.supervisorId || empAny.managerId;
    if (supervisorId) {
      // Direct self-reporting loop
      if (supervisorId === employee.id) {
        conflicts.push({
          id: `CONF-SUP-SELF-${employee.id}`,
          ruleCode: 'CONF-SUP-001',
          category: 'CONFLICTING_SUPERVISORS',
          severity: 'CRITICAL_BLOCKING',
          title: 'Invalid Self-Reporting Supervisor Loop',
          reason: `Employee cannot be designated as their own reporting supervisor.`,
          detailedExplanation: `Organizational governance mandates that all personnel report to a designated superior in the managerial hierarchy.`,
          entityType: 'SUPERVISOR_ASSIGNMENT',
          entityId: employee.id,
          employeeId: employee.id,
          employeeName: empName,
          resolutionSteps: ['Select a valid distinct supervisor/manager in the reporting hierarchy.'],
          isBlocker: true,
          isOverrideAllowed: false,
          requiredOverrideRoles: ['COMPANY_ADMIN', 'SUPER_ADMIN'],
          detectedAt: new Date().toISOString()
        });
      } else {
        // Multi-level Circular Dependency Check (A -> B -> A)
        let currId: string | undefined = supervisorId;
        const visited = new Set<string>([employee.id]);
        let isCircular = false;
        let loopTrail: string[] = [employee.id, supervisorId];

        while (currId && !isCircular) {
          if (visited.has(currId)) {
            isCircular = true;
            break;
          }
          visited.add(currId);
          const managerEmp = allEmployees.find(e => e.id === currId);
          currId = (managerEmp as any)?.reportingManagerId || (managerEmp as any)?.supervisorId;
          if (currId) loopTrail.push(currId);
        }

        if (isCircular) {
          conflicts.push({
            id: `CONF-SUP-CYCLE-${employee.id}-${supervisorId}`,
            ruleCode: 'CONF-SUP-002',
            category: 'CONFLICTING_SUPERVISORS',
            severity: 'CRITICAL_BLOCKING',
            title: 'Circular Hierarchy Dependency Detected',
            reason: `Reporting chain contains an infinite loop: ${loopTrail.join(' ➔ ')}.`,
            detailedExplanation: `Circular supervisor assignments paralyze muster sign-offs, leave approvals, and appraisal escalations.`,
            entityType: 'SUPERVISOR_ASSIGNMENT',
            entityId: employee.id,
            employeeId: employee.id,
            employeeName: empName,
            resolutionSteps: ['Break the reporting cycle by reassigning the root manager to an executive role.'],
            isBlocker: true,
            isOverrideAllowed: false,
            requiredOverrideRoles: ['COMPANY_ADMIN', 'SUPER_ADMIN'],
            detectedAt: new Date().toISOString()
          });
        }
      }
    }

    // 3. Check DUPLICATE_RESPONSIBILITY_SOD (Segregation of Duties)
    const userRole = employee.role;
    const additionalRoles: string[] = empAny.additionalRoles || [];
    const allAssignedRoles = [userRole, ...additionalRoles];

    // SoD Rule A: Maker-Checker Conflict (Muster creator cannot be Payroll approver)
    const isMusterMaker = allAssignedRoles.includes('SITE_IN_CHARGE') || allAssignedRoles.includes('SUPERVISOR') || allAssignedRoles.includes('ATTENDANCE_MAKER');
    const isPayrollChecker = allAssignedRoles.includes('PAYROLL_ADMIN') || allAssignedRoles.includes('FINANCE_APPROVER') || allAssignedRoles.includes('HR_ADMIN');

    if (isMusterMaker && isPayrollChecker && userRole !== 'SUPER_ADMIN' && userRole !== 'COMPANY_ADMIN') {
      const ruleCode = 'CONF-SOD-001';
      const hasOverride = activeOverrides.some(o => o.ruleCode === ruleCode && o.conflictId.includes(employee.id));

      conflicts.push({
        id: `CONF-SOD-MAKER-CHECKER-${employee.id}`,
        ruleCode,
        category: 'DUPLICATE_RESPONSIBILITY_SOD',
        severity: 'CRITICAL_BLOCKING',
        title: 'Segregation of Duties (SoD) Violation: Maker-Checker Conflict',
        reason: `Employee assigned both Field Muster Logging (${isMusterMaker ? 'Maker' : ''}) and Payroll Authorization (${isPayrollChecker ? 'Checker' : ''}) responsibilities.`,
        detailedExplanation: `Enterprise financial control frameworks forbid the same actor from generating operational muster logs and certifying payroll disbursements without dual-authorization safeguards.`,
        entityType: 'ROLE_MEMBERSHIP',
        entityId: employee.id,
        employeeId: employee.id,
        employeeName: empName,
        conflictingContext: {
          roleA: 'Muster Logger / Field Supervisor',
          roleB: 'Payroll / Finance Certifier'
        },
        resolutionSteps: [
          'Separate field attendance logging and payroll approval into distinct user accounts.',
          'If operating in a small branch with sole administrative staff, register a Controlled Executive Exception.'
        ],
        isBlocker: !hasOverride,
        isOverrideAllowed: true,
        requiredOverrideRoles: ['COMPANY_ADMIN', 'SUPER_ADMIN'],
        detectedAt: new Date().toISOString()
      });
    }

    // 4. Check INVALID_EFFECTIVE_DATES
    const joiningDateStr = empAny.joiningDate || empAny.hireDate || empAny.dateOfJoining;
    const resignationDateStr = empAny.resignationDate || empAny.terminationDate;

    if (joiningDateStr && resignationDateStr) {
      const joinTime = new Date(joiningDateStr).getTime();
      const resignTime = new Date(resignationDateStr).getTime();

      if (resignTime < joinTime) {
        conflicts.push({
          id: `CONF-DATE-INVALID-SEQUENCE-${employee.id}`,
          ruleCode: 'CONF-DATE-001',
          category: 'INVALID_EFFECTIVE_DATES',
          severity: 'CRITICAL_BLOCKING',
          title: 'Chronological Date Sequence Violation',
          reason: `Termination/Resignation date (${resignationDateStr}) cannot precede Join date (${joiningDateStr}).`,
          detailedExplanation: `Invalid date sequences corrupt service tenure, gratuity calculations, PF compliance, and historical audit logs.`,
          entityType: 'EMPLOYEE_RECORD',
          entityId: employee.id,
          employeeId: employee.id,
          employeeName: empName,
          conflictingContext: {
            joiningDate: joiningDateStr,
            effectiveDate: resignationDateStr
          },
          resolutionSteps: ['Correct the effective exit date to occur on or after the official joining date.'],
          isBlocker: true,
          isOverrideAllowed: false,
          requiredOverrideRoles: ['HR_ADMIN', 'COMPANY_ADMIN'],
          detectedAt: new Date().toISOString()
        });
      }
    }

    const blockingCount = conflicts.filter(c => c.isBlocker).length;
    const overridableCount = conflicts.filter(c => c.isOverrideAllowed).length;

    return {
      isValid: conflicts.length === 0,
      hasBlockers: blockingCount > 0,
      conflicts,
      blockingCount,
      overridableCount,
      warningCount: 0,
      summary: blockingCount > 0 
        ? `Transaction blocked by ${blockingCount} critical operational conflict(s).` 
        : conflicts.length > 0 
          ? `Validated with ${conflicts.length} overridable exception(s).` 
          : 'All organizational hierarchy and SoD rules satisfied.'
    };
  }

  /**
   * 3. VALIDATE TRANSFER REQUEST (Invalid Transfer Dates & Duplicate Transfer In-Flight)
   */
  static validateTransferRequest(
    transfer: Omit<TransferRequest, 'id' | 'status' | 'createdAt'>,
    employee: EmployeeRecord,
    existingTransfers: TransferRequest[] = [],
    activeOverrides: ConflictOverrideRequest[] = []
  ): ConflictValidationResult {
    const conflicts: DetectedConflict[] = [];
    const empName = `${employee.firstName || ''} ${employee.lastName || ''}`.trim() || 'Employee';

    // Check 1: Transfer effective date before employee joining date
    const joinDateStr = (employee as any).joiningDate || (employee as any).hireDate || (employee as any).dateOfJoining;
    if (joinDateStr && transfer.effectiveDate) {
      const joinTime = new Date(joinDateStr.split('T')[0]).getTime();
      const xferTime = new Date(transfer.effectiveDate.split('T')[0]).getTime();

      if (xferTime < joinTime) {
        conflicts.push({
          id: `CONF-XFER-PRE-HIRE-${employee.id}`,
          ruleCode: 'CONF-XFER-001',
          category: 'INVALID_TRANSFER_DATES',
          severity: 'CRITICAL_BLOCKING',
          title: 'Transfer Effective Date Precedes Joining Date',
          reason: `Transfer effective date (${transfer.effectiveDate}) cannot be earlier than employee joining date (${joinDateStr}).`,
          detailedExplanation: `Transferring an employee prior to their statutory hire date creates orphaned historical rosters and payroll discrepancies.`,
          entityType: 'TRANSFER_REQUEST',
          entityId: employee.id,
          employeeId: employee.id,
          employeeName: empName,
          conflictingContext: {
            joiningDate: joinDateStr,
            effectiveDate: transfer.effectiveDate
          },
          resolutionSteps: ['Adjust the transfer effective date to occur on or after the employee joining date.'],
          isBlocker: true,
          isOverrideAllowed: false,
          requiredOverrideRoles: ['HR_ADMIN', 'COMPANY_ADMIN'],
          detectedAt: new Date().toISOString()
        });
      }
    }

    // Check 2: Active pending transfer already in flight
    const pendingTransfer = existingTransfers.find(t => 
      t.employeeId === employee.id && 
      t.status === 'PENDING'
    );

    if (pendingTransfer) {
      const ruleCode = 'CONF-XFER-005';
      const hasOverride = activeOverrides.some(o => o.ruleCode === ruleCode && o.conflictId.includes(employee.id));

      conflicts.push({
        id: `CONF-XFER-IN-FLIGHT-${employee.id}-${pendingTransfer.id}`,
        ruleCode,
        category: 'DUPLICATE_ACTIVE_ASSIGNMENT',
        severity: 'CRITICAL_BLOCKING',
        title: 'Concurrent Transfer Request In Progress',
        reason: `Employee already has a pending transfer request (${pendingTransfer.id}) awaiting approval.`,
        detailedExplanation: `Multiple concurrent transfer requests create non-deterministic destination site assignments and conflicting billing rates.`,
        entityType: 'TRANSFER_REQUEST',
        entityId: employee.id,
        employeeId: employee.id,
        employeeName: empName,
        conflictingEntityId: pendingTransfer.id,
        resolutionSteps: [
          'Approve or cancel the existing pending transfer before initiating a new relocation request.'
        ],
        isBlocker: !hasOverride,
        isOverrideAllowed: true,
        requiredOverrideRoles: ['OPS_MANAGER', 'HR_ADMIN', 'COMPANY_ADMIN'],
        detectedAt: new Date().toISOString()
      });
    }

    const blockingCount = conflicts.filter(c => c.isBlocker).length;
    const overridableCount = conflicts.filter(c => c.isOverrideAllowed).length;

    return {
      isValid: conflicts.length === 0,
      hasBlockers: blockingCount > 0,
      conflicts,
      blockingCount,
      overridableCount,
      warningCount: 0,
      summary: blockingCount > 0 
        ? `Transfer blocked by ${blockingCount} critical operational conflict(s).` 
        : 'Transfer dates and assignment lifecycle validated successfully.'
    };
  }

  /**
   * 4. COMPREHENSIVE ORGANIZATIONAL AUDIT SWEEP
   */
  static async performHolisticAudit(companyId: string): Promise<ConflictAuditMetrics> {
    try {
      const employeesSnap = await getDocs(query(collection(db, 'companies', companyId, 'employees')));
      const employees: EmployeeRecord[] = employeesSnap.docs.map(d => ({ id: d.id, ...d.data() } as EmployeeRecord));

      const sitesSnap = await getDocs(query(collection(db, 'companies', companyId, 'sites')));
      const sites: SiteRecord[] = sitesSnap.docs.map(d => ({ id: d.id, ...d.data() } as SiteRecord));

      const shiftsSnap = await getDocs(query(collection(db, 'companies', companyId, 'shifts')));
      const shifts: ShiftRecord[] = shiftsSnap.docs.map(d => ({ id: d.id, ...d.data() } as ShiftRecord));

      const rostersSnap = await getDocs(query(collection(db, 'companies', companyId, 'rosters')));
      const rosters: RosterRecord[] = rostersSnap.docs.map(d => ({ id: d.id, ...d.data() } as RosterRecord));

      const overridesSnap = await getDocs(query(collection(db, this.OVERRIDES_COLLECTION), where('companyId', '==', companyId)));
      const overrides: ConflictOverrideRequest[] = overridesSnap.docs.map(d => (d.data() as ConflictOverrideAuditRecord).override);

      const allConflicts: DetectedConflict[] = [];

      // 1. Audit all employees
      for (const emp of employees) {
        const empResult = this.validateEmployeeAssignment(emp, employees, sites, overrides);
        allConflicts.push(...empResult.conflicts);
      }

      // 2. Audit all rosters
      for (const roster of rosters) {
        const rosterResult = this.validateRosterAssignment(roster, rosters, shifts, sites, overrides);
        allConflicts.push(...rosterResult.conflicts);
      }

      // Categorize
      const categoryBreakdown: Record<EnterpriseConflictCategory, number> = {
        DUPLICATE_ACTIVE_ASSIGNMENT: 0,
        OVERLAPPING_SHIFTS: 0,
        OVERLAPPING_SITE_ASSIGNMENTS: 0,
        CONFLICTING_SUPERVISORS: 0,
        DUPLICATE_RESPONSIBILITY_SOD: 0,
        INVALID_TRANSFER_DATES: 0,
        INVALID_EFFECTIVE_DATES: 0
      };

      const siteConflictMap = new Map<string, number>();

      allConflicts.forEach(c => {
        if (categoryBreakdown[c.category] !== undefined) {
          categoryBreakdown[c.category]++;
        }
        if (c.conflictingContext?.siteA?.id) {
          siteConflictMap.set(c.conflictingContext.siteA.id, (siteConflictMap.get(c.conflictingContext.siteA.id) || 0) + 1);
        }
      });

      const topSites = Array.from(siteConflictMap.entries()).map(([siteId, count]) => {
        const siteName = sites.find(s => s.id === siteId)?.name || 'Deployment Site';
        return { siteId, siteName, count };
      }).sort((a, b) => b.count - a.count).slice(0, 5);

      return {
        totalAuditedTransactions: employees.length + rosters.length,
        totalConflictsDetected: allConflicts.length,
        criticalBlockedCount: allConflicts.filter(c => c.isBlocker).length,
        overridesGrantedCount: overrides.length,
        categoryBreakdown,
        topConflictedSites: topSites,
        recentIncidents: allConflicts.slice(0, 25)
      };
    } catch (err) {
      console.error('[EnterpriseConflictEngine] performHolisticAudit error:', err);
      return {
        totalAuditedTransactions: 0,
        totalConflictsDetected: 0,
        criticalBlockedCount: 0,
        overridesGrantedCount: 0,
        categoryBreakdown: {
          DUPLICATE_ACTIVE_ASSIGNMENT: 0,
          OVERLAPPING_SHIFTS: 0,
          OVERLAPPING_SITE_ASSIGNMENTS: 0,
          CONFLICTING_SUPERVISORS: 0,
          DUPLICATE_RESPONSIBILITY_SOD: 0,
          INVALID_TRANSFER_DATES: 0,
          INVALID_EFFECTIVE_DATES: 0
        },
        topConflictedSites: [],
        recentIncidents: []
      };
    }
  }

  /**
   * 5. RECORD AUTHORIZED OVERRIDE WITH IMMUTABLE AUDIT LOGGING
   */
  static async recordAuthorizedOverride(
    companyId: string,
    userSession: UserSession,
    conflict: DetectedConflict,
    overrideRequest: {
      reasonCategory: OverrideReasonCode;
      justification: string;
      expirationDate?: string;
    }
  ): Promise<ConflictOverrideAuditRecord> {
    // 1. Role validation
    const allowedRoles: UserRole[] = ['SUPER_ADMIN', 'COMPANY_ADMIN', 'OPS_MANAGER', 'HR_ADMIN'];
    if (!allowedRoles.includes(userSession.role)) {
      throw new Error(`Role ${userSession.role} is not authorized to grant enterprise conflict overrides. Required: ${allowedRoles.join(', ')}`);
    }

    // 2. Justification validation
    if (!overrideRequest.justification || overrideRequest.justification.trim().length < 20) {
      throw new Error('A detailed operational justification of at least 20 characters is required for conflict overrides.');
    }

    const now = new Date().toISOString();
    const overrideId = `OVR-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;

    const fullOverride: ConflictOverrideRequest = {
      conflictId: conflict.id,
      ruleCode: conflict.ruleCode,
      reasonCategory: overrideRequest.reasonCategory,
      justification: overrideRequest.justification.trim(),
      approverId: userSession.userId,
      approverName: userSession.fullName || 'Authorizing Manager',
      approverRole: userSession.role,
      expirationDate: overrideRequest.expirationDate,
      approvedAt: now
    };

    const auditRecord: ConflictOverrideAuditRecord = {
      id: overrideId,
      companyId,
      conflict,
      override: fullOverride,
      appliedToEntityType: conflict.entityType,
      appliedToEntityId: conflict.entityId,
      status: 'ACTIVE',
      createdAt: now,
      updatedAt: now
    };

    // Save to Firestore
    const docRef = doc(db, this.OVERRIDES_COLLECTION, overrideId);
    await setDoc(docRef, auditRecord);

    // Add immutable audit log
    await FirestoreService.logAuditEvent(
      companyId,
      userSession.userId,
      userSession.fullName,
      'CONFLICT_OVERRIDE_AUTHORIZED',
      `Authorized override [${overrideRequest.reasonCategory}] for conflict "${conflict.title}" (Employee: ${conflict.employeeName}, Rule: ${conflict.ruleCode}). Justification: ${overrideRequest.justification}`
    );

    return auditRecord;
  }

  /**
   * 6. FETCH ACTIVE OVERRIDES
   */
  static async getActiveOverrides(companyId: string): Promise<ConflictOverrideAuditRecord[]> {
    try {
      const q = query(
        collection(db, this.OVERRIDES_COLLECTION),
        where('companyId', '==', companyId),
        where('status', '==', 'ACTIVE')
      );
      const snap = await getDocs(q);
      const list: ConflictOverrideAuditRecord[] = [];
      snap.forEach(d => list.push(d.data() as ConflictOverrideAuditRecord));
      return list;
    } catch (e) {
      return [];
    }
  }
}
