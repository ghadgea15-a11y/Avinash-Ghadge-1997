import { AttendanceRecord, UserSession } from '../types';

export type ConflictResolutionRule = 
  | 'EARLIEST_PUNCH_IN_WINS'
  | 'LATEST_PUNCH_OUT_WINS'
  | 'ASSIGNED_SITE_PRECEDENCE'
  | 'HIGHER_ROLE_AUTHORITY_WINS'
  | 'GEOFENCE_VERIFIED_PRECEDENCE'
  | 'IDEMPOTENT_NOOP';

export interface AttendanceConflictResolutionResult {
  conflictDetected: boolean;
  conflictId?: string;
  resolutionRule: ConflictResolutionRule;
  winningRecord: Partial<AttendanceRecord>;
  suppressedRecord?: Partial<AttendanceRecord>;
  explanation: string;
  anomalyAuditPayload?: {
    anomalyType: 'DUPLICATE_SUPERVISOR_PUNCH_COLLISION';
    employeeId: string;
    employeeName?: string;
    targetDate: string;
    winnerSupervisorId: string;
    winnerSupervisorRole?: string;
    winnerSiteId: string;
    winnerTimestamp: string;
    suppressedSupervisorId: string;
    suppressedSupervisorRole?: string;
    suppressedSiteId: string;
    suppressedTimestamp: string;
    ruleApplied: ConflictResolutionRule;
    justification: string;
    resolvedAt: string;
  };
}

export interface SupervisorPunchContext {
  supervisorId: string;
  supervisorName?: string;
  supervisorRole?: string;
  authorityLevel?: string; // 'A0_OWNER' | 'A5_SITE_IN_CHARGE' | 'A6_SUPERVISOR' etc.
  siteId: string;
  isAssignedSiteForEmployee?: boolean;
  geofenceVerified?: boolean;
  punchTimestamp: string; // ISO string or HH:mm
  action: 'PUNCH_IN' | 'PUNCH_OUT';
}

export class OfflineAttendanceConflictEngine {
  /**
   * Numeric rank for authority levels. Lower number = higher executive power.
   */
  private static readonly ROLE_HIERARCHY_RANK: Record<string, number> = {
    'A0_OWNER': 0,
    'PLATFORM_SUPER_ADMIN': 0,
    'A1_DIRECTOR_CEO': 1,
    'COMPANY_ADMIN': 1,
    'A2_GENERAL_MANAGER': 2,
    'A3_OFFICIAL_STAFF': 3,
    'HR_MANAGER': 3,
    'A4_REGIONAL_AREA_MANAGER': 4,
    'REGIONAL_MANAGER': 4,
    'A5_SITE_IN_CHARGE': 5,
    'SITE_INCHARGE': 5,
    'A6_SUPERVISOR': 6,
    'SUPERVISOR': 6,
    'FIELD_OFFICER': 6,
    'A7_SKILLED': 7,
    'A8_SEMI_SKILLED': 8,
    'A9_SUPPORT': 9,
    'EMPLOYEE': 9,
    'GUARD': 9
  };

  private static getAuthorityRank(roleOrLevel?: string): number {
    if (!roleOrLevel) return 99;
    return this.ROLE_HIERARCHY_RANK[roleOrLevel] ?? 50;
  }

  /**
   * Resolves a concurrent offline collision between two supervisor attendance punches
   * for the same employee on the same date/shift.
   * 
   * Deterministic Winner Selection Rules:
   * 1. If one punch is within verified geofence and the other failed geofence, geofence-verified wins.
   * 2. If one supervisor is stationed at the employee's officially assigned site and the other is unassigned, assigned site supervisor wins.
   * 3. For PUNCH_IN: The EARLIEST verified check-in timestamp wins (Duty starts when employee first arrived on site).
   * 4. For PUNCH_OUT: The LATEST verified check-out timestamp wins (Duty extends until actual verified departure).
   * 5. If timestamps are identical: Higher supervisor authority rank wins (A5 Site-In-Charge over A6 Supervisor).
   */
  static resolveSupervisorAttendanceConflict(
    recordA: Partial<AttendanceRecord> & { supervisorContext?: SupervisorPunchContext },
    recordB: Partial<AttendanceRecord> & { supervisorContext?: SupervisorPunchContext },
    action: 'PUNCH_IN' | 'PUNCH_OUT' = 'PUNCH_IN'
  ): AttendanceConflictResolutionResult {
    const employeeId = recordA.employeeId || recordB.employeeId || 'UNKNOWN';
    const targetDate = recordA.attendanceDate || recordB.attendanceDate || new Date().toISOString().split('T')[0];

    const ctxA = recordA.supervisorContext || {
      supervisorId: recordA.createdBy || 'SUPERVISOR_A',
      siteId: recordA.siteId || 'SITE_A',
      punchTimestamp: action === 'PUNCH_IN' ? (recordA.checkIn || '') : (recordA.checkOut || ''),
      action,
      authorityLevel: 'A6_SUPERVISOR'
    };

    const ctxB = recordB.supervisorContext || {
      supervisorId: recordB.createdBy || 'SUPERVISOR_B',
      siteId: recordB.siteId || 'SITE_B',
      punchTimestamp: action === 'PUNCH_IN' ? (recordB.checkIn || '') : (recordB.checkOut || ''),
      action,
      authorityLevel: 'A6_SUPERVISOR'
    };

    // Identical record check (idempotent noop)
    if (
      ctxA.supervisorId === ctxB.supervisorId &&
      ctxA.punchTimestamp === ctxB.punchTimestamp &&
      ctxA.siteId === ctxB.siteId
    ) {
      return {
        conflictDetected: false,
        resolutionRule: 'IDEMPOTENT_NOOP',
        winningRecord: recordA,
        explanation: 'Identical punch duplicate received; idempotent merge applied.'
      };
    }

    const conflictId = `CONF-ATT-${targetDate}-${employeeId}-${Date.now()}`;

    // RULE 1: Geofence Verification Precedence
    const geoA = ctxA.geofenceVerified ?? (recordA.checkInGps?.verification === 'WITHIN_GEOFENCE' || recordA.checkOutGps?.verification === 'WITHIN_GEOFENCE');
    const geoB = ctxB.geofenceVerified ?? (recordB.checkInGps?.verification === 'WITHIN_GEOFENCE' || recordB.checkOutGps?.verification === 'WITHIN_GEOFENCE');

    if (geoA && !geoB) {
      return this.formatResolution(
        recordA, recordB, ctxA, ctxB, 'GEOFENCE_VERIFIED_PRECEDENCE',
        `Supervisor ${ctxA.supervisorId}'s punch at ${ctxA.siteId} was verified within authorized Geofence, whereas Supervisor ${ctxB.supervisorId}'s punch lacked valid geofence verification.`,
        conflictId, employeeId, targetDate
      );
    }
    if (geoB && !geoA) {
      return this.formatResolution(
        recordB, recordA, ctxB, ctxA, 'GEOFENCE_VERIFIED_PRECEDENCE',
        `Supervisor ${ctxB.supervisorId}'s punch at ${ctxB.siteId} was verified within authorized Geofence, whereas Supervisor ${ctxA.supervisorId}'s punch lacked valid geofence verification.`,
        conflictId, employeeId, targetDate
      );
    }

    // RULE 2: Assigned Primary Site Precedence
    if (ctxA.isAssignedSiteForEmployee && !ctxB.isAssignedSiteForEmployee) {
      return this.formatResolution(
        recordA, recordB, ctxA, ctxB, 'ASSIGNED_SITE_PRECEDENCE',
        `Supervisor ${ctxA.supervisorId} is stationed at Employee's primary assigned site (${ctxA.siteId}), taking precedence over roving/unassigned site (${ctxB.siteId}).`,
        conflictId, employeeId, targetDate
      );
    }
    if (ctxB.isAssignedSiteForEmployee && !ctxA.isAssignedSiteForEmployee) {
      return this.formatResolution(
        recordB, recordA, ctxB, ctxA, 'ASSIGNED_SITE_PRECEDENCE',
        `Supervisor ${ctxB.supervisorId} is stationed at Employee's primary assigned site (${ctxB.siteId}), taking precedence over roving/unassigned site (${ctxA.siteId}).`,
        conflictId, employeeId, targetDate
      );
    }

    // RULE 3: Chronological Precedence
    // For PUNCH_IN: Earliest punch wins (Actual arrival)
    // For PUNCH_OUT: Latest punch wins (Actual departure)
    const timeA = new Date(ctxA.punchTimestamp).getTime();
    const timeB = new Date(ctxB.punchTimestamp).getTime();

    if (!isNaN(timeA) && !isNaN(timeB) && timeA !== timeB) {
      if (action === 'PUNCH_IN') {
        if (timeA < timeB) {
          return this.formatResolution(
            recordA, recordB, ctxA, ctxB, 'EARLIEST_PUNCH_IN_WINS',
            `Supervisor ${ctxA.supervisorId}'s Check-In at ${ctxA.punchTimestamp} is earlier than Supervisor ${ctxB.supervisorId}'s Check-In at ${ctxB.punchTimestamp}. Earliest verified arrival preserved.`,
            conflictId, employeeId, targetDate
          );
        } else {
          return this.formatResolution(
            recordB, recordA, ctxB, ctxA, 'EARLIEST_PUNCH_IN_WINS',
            `Supervisor ${ctxB.supervisorId}'s Check-In at ${ctxB.punchTimestamp} is earlier than Supervisor ${ctxA.supervisorId}'s Check-In at ${ctxA.punchTimestamp}. Earliest verified arrival preserved.`,
            conflictId, employeeId, targetDate
          );
        }
      } else {
        // PUNCH_OUT
        if (timeA > timeB) {
          return this.formatResolution(
            recordA, recordB, ctxA, ctxB, 'LATEST_PUNCH_OUT_WINS',
            `Supervisor ${ctxA.supervisorId}'s Check-Out at ${ctxA.punchTimestamp} is later than Supervisor ${ctxB.supervisorId}'s Check-Out at ${ctxB.punchTimestamp}. Latest verified departure preserved.`,
            conflictId, employeeId, targetDate
          );
        } else {
          return this.formatResolution(
            recordB, recordA, ctxB, ctxA, 'LATEST_PUNCH_OUT_WINS',
            `Supervisor ${ctxB.supervisorId}'s Check-Out at ${ctxB.punchTimestamp} is later than Supervisor ${ctxA.supervisorId}'s Check-Out at ${ctxA.punchTimestamp}. Latest verified departure preserved.`,
            conflictId, employeeId, targetDate
          );
        }
      }
    }

    // RULE 4: Role / Authority Hierarchy Precedence (A5 Site In-Charge beats A6 Supervisor)
    const rankA = this.getAuthorityRank(ctxA.authorityLevel || ctxA.supervisorRole);
    const rankB = this.getAuthorityRank(ctxB.authorityLevel || ctxB.supervisorRole);

    if (rankA < rankB) {
      return this.formatResolution(
        recordA, recordB, ctxA, ctxB, 'HIGHER_ROLE_AUTHORITY_WINS',
        `Supervisor ${ctxA.supervisorId} holds higher authority level (${ctxA.authorityLevel || 'A5'}) than Supervisor ${ctxB.supervisorId} (${ctxB.authorityLevel || 'A6'}).`,
        conflictId, employeeId, targetDate
      );
    } else if (rankB < rankA) {
      return this.formatResolution(
        recordB, recordA, ctxB, ctxA, 'HIGHER_ROLE_AUTHORITY_WINS',
        `Supervisor ${ctxB.supervisorId} holds higher authority level (${ctxB.authorityLevel || 'A5'}) than Supervisor ${ctxA.supervisorId} (${ctxA.authorityLevel || 'A6'}).`,
        conflictId, employeeId, targetDate
      );
    }

    // Fallback: Preserves record A as primary, logs full dual-record collision
    return this.formatResolution(
      recordA, recordB, ctxA, ctxB, 'EARLIEST_PUNCH_IN_WINS',
      `Simultaneous timestamp and equal authority level. Preserved primary received record with audit flag.`,
      conflictId, employeeId, targetDate
    );
  }

  private static formatResolution(
    winner: Partial<AttendanceRecord>,
    loser: Partial<AttendanceRecord>,
    winnerCtx: SupervisorPunchContext,
    loserCtx: SupervisorPunchContext,
    rule: ConflictResolutionRule,
    explanation: string,
    conflictId: string,
    employeeId: string,
    targetDate: string
  ): AttendanceConflictResolutionResult {
    return {
      conflictDetected: true,
      conflictId,
      resolutionRule: rule,
      winningRecord: {
        ...winner,
        conflictAudit: {
          conflictId,
          resolvedAt: new Date().toISOString(),
          ruleApplied: rule,
          winnerSupervisorId: winnerCtx.supervisorId,
          suppressedSupervisorId: loserCtx.supervisorId,
          explanation
        } as any
      },
      suppressedRecord: loser,
      explanation,
      anomalyAuditPayload: {
        anomalyType: 'DUPLICATE_SUPERVISOR_PUNCH_COLLISION',
        employeeId,
        employeeName: (winner as any).employeeName || (loser as any).employeeName || employeeId,
        targetDate,
        winnerSupervisorId: winnerCtx.supervisorId,
        winnerSupervisorRole: winnerCtx.supervisorRole || winnerCtx.authorityLevel,
        winnerSiteId: winnerCtx.siteId,
        winnerTimestamp: winnerCtx.punchTimestamp,
        suppressedSupervisorId: loserCtx.supervisorId,
        suppressedSupervisorRole: loserCtx.supervisorRole || loserCtx.authorityLevel,
        suppressedSiteId: loserCtx.siteId,
        suppressedTimestamp: loserCtx.punchTimestamp,
        ruleApplied: rule,
        justification: explanation,
        resolvedAt: new Date().toISOString()
      }
    };
  }
}
