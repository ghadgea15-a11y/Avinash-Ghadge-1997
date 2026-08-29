import { describe, it, expect, vi, beforeEach } from 'vitest';
import { 
  OfflineAttendanceConflictEngine,
  SupervisorPunchContext
} from '../services/offlineAttendanceConflictEngine';
import { AttendanceRecord } from '../types';

describe('Offline-First Attendance Conflict Resolution Engine Tests', () => {
  const sampleEmployeeId = 'EMP-9001';
  const targetDate = '2026-08-29';

  describe('Scenario 1: Two Supervisors Punch-In Same Employee at Different Times', () => {
    it('should select EARLIEST punch-in timestamp as the winner (08:00 AM over 08:30 AM)', () => {
      // Supervisor 1 (offline at 08:00)
      const punchSupervisor1: Partial<AttendanceRecord> & { supervisorContext: SupervisorPunchContext } = {
        id: `ATT-${targetDate}-${sampleEmployeeId}`,
        employeeId: sampleEmployeeId,
        attendanceDate: targetDate,
        checkIn: '2026-08-29T08:00:00Z',
        siteId: 'SITE-MAIN-GATE',
        status: 'PRESENT',
        supervisorContext: {
          supervisorId: 'SUP-01-DESHMUKH',
          supervisorName: 'Ajay Deshmukh',
          supervisorRole: 'SUPERVISOR',
          authorityLevel: 'A6_SUPERVISOR',
          siteId: 'SITE-MAIN-GATE',
          isAssignedSiteForEmployee: true,
          geofenceVerified: true,
          punchTimestamp: '2026-08-29T08:00:00Z',
          action: 'PUNCH_IN'
        }
      };

      // Supervisor 2 (offline at 08:30)
      const punchSupervisor2: Partial<AttendanceRecord> & { supervisorContext: SupervisorPunchContext } = {
        id: `ATT-${targetDate}-${sampleEmployeeId}`,
        employeeId: sampleEmployeeId,
        attendanceDate: targetDate,
        checkIn: '2026-08-29T08:30:00Z',
        siteId: 'SITE-MAIN-GATE',
        status: 'PRESENT',
        supervisorContext: {
          supervisorId: 'SUP-02-PATIL',
          supervisorName: 'Ramesh Patil',
          supervisorRole: 'SUPERVISOR',
          authorityLevel: 'A6_SUPERVISOR',
          siteId: 'SITE-MAIN-GATE',
          isAssignedSiteForEmployee: true,
          geofenceVerified: true,
          punchTimestamp: '2026-08-29T08:30:00Z',
          action: 'PUNCH_IN'
        }
      };

      // Execute conflict resolution
      const result = OfflineAttendanceConflictEngine.resolveSupervisorAttendanceConflict(
        punchSupervisor1,
        punchSupervisor2,
        'PUNCH_IN'
      );

      // Assertions
      expect(result.conflictDetected).toBe(true);
      expect(result.resolutionRule).toBe('EARLIEST_PUNCH_IN_WINS');
      expect(result.winningRecord.checkIn).toBe('2026-08-29T08:00:00Z');
      expect(result.anomalyAuditPayload?.winnerSupervisorId).toBe('SUP-01-DESHMUKH');
      expect(result.anomalyAuditPayload?.suppressedSupervisorId).toBe('SUP-02-PATIL');
      expect(result.anomalyAuditPayload?.winnerTimestamp).toBe('2026-08-29T08:00:00Z');
      expect(result.anomalyAuditPayload?.suppressedTimestamp).toBe('2026-08-29T08:30:00Z');
      expect(result.explanation).toContain('earlier than');
    });

    it('should select earlier punch-in even if incoming record arrives in reverse sync order', () => {
      // Incoming record is 08:00, Existing on server is 08:30
      const serverRecord: Partial<AttendanceRecord> = {
        id: `ATT-${targetDate}-${sampleEmployeeId}`,
        employeeId: sampleEmployeeId,
        attendanceDate: targetDate,
        checkIn: '2026-08-29T08:30:00Z',
        siteId: 'SITE-MAIN-GATE',
        supervisorContext: {
          supervisorId: 'SUP-02-PATIL',
          siteId: 'SITE-MAIN-GATE',
          punchTimestamp: '2026-08-29T08:30:00Z',
          action: 'PUNCH_IN',
          geofenceVerified: true
        }
      };

      const syncIncomingRecord: Partial<AttendanceRecord> = {
        id: `ATT-${targetDate}-${sampleEmployeeId}`,
        employeeId: sampleEmployeeId,
        attendanceDate: targetDate,
        checkIn: '2026-08-29T08:00:00Z',
        siteId: 'SITE-MAIN-GATE',
        supervisorContext: {
          supervisorId: 'SUP-01-DESHMUKH',
          siteId: 'SITE-MAIN-GATE',
          punchTimestamp: '2026-08-29T08:00:00Z',
          action: 'PUNCH_IN',
          geofenceVerified: true
        }
      };

      const result = OfflineAttendanceConflictEngine.resolveSupervisorAttendanceConflict(
        serverRecord,
        syncIncomingRecord,
        'PUNCH_IN'
      );

      expect(result.resolutionRule).toBe('EARLIEST_PUNCH_IN_WINS');
      expect(result.winningRecord.checkIn).toBe('2026-08-29T08:00:00Z');
      expect(result.anomalyAuditPayload?.winnerSupervisorId).toBe('SUP-01-DESHMUKH');
    });
  });

  describe('Scenario 2: Two Supervisors Punch-Out Same Employee at Different Times', () => {
    it('should select LATEST punch-out timestamp as the winner (18:30 PM over 17:00 PM)', () => {
      const punchOutEarly: Partial<AttendanceRecord> = {
        id: `ATT-${targetDate}-${sampleEmployeeId}`,
        employeeId: sampleEmployeeId,
        checkOut: '2026-08-29T17:00:00Z',
        supervisorContext: {
          supervisorId: 'SUP-01-DESHMUKH',
          siteId: 'SITE-MAIN-GATE',
          punchTimestamp: '2026-08-29T17:00:00Z',
          action: 'PUNCH_OUT',
          geofenceVerified: true
        }
      };

      const punchOutLate: Partial<AttendanceRecord> = {
        id: `ATT-${targetDate}-${sampleEmployeeId}`,
        employeeId: sampleEmployeeId,
        checkOut: '2026-08-29T18:30:00Z',
        supervisorContext: {
          supervisorId: 'SUP-02-PATIL',
          siteId: 'SITE-MAIN-GATE',
          punchTimestamp: '2026-08-29T18:30:00Z',
          action: 'PUNCH_OUT',
          geofenceVerified: true
        }
      };

      const result = OfflineAttendanceConflictEngine.resolveSupervisorAttendanceConflict(
        punchOutEarly,
        punchOutLate,
        'PUNCH_OUT'
      );

      expect(result.resolutionRule).toBe('LATEST_PUNCH_OUT_WINS');
      expect(result.winningRecord.checkOut).toBe('2026-08-29T18:30:00Z');
      expect(result.anomalyAuditPayload?.winnerSupervisorId).toBe('SUP-02-PATIL');
    });
  });

  describe('Scenario 3: Geofence and Assigned Site Priority Precedence', () => {
    it('should select Geofence-Verified supervisor over unverified supervisor regardless of time', () => {
      const verifiedPunch: Partial<AttendanceRecord> = {
        id: `ATT-${targetDate}-${sampleEmployeeId}`,
        employeeId: sampleEmployeeId,
        checkIn: '2026-08-29T08:15:00Z',
        supervisorContext: {
          supervisorId: 'SUP-ON-SITE',
          siteId: 'SITE-ALPHA',
          punchTimestamp: '2026-08-29T08:15:00Z',
          action: 'PUNCH_IN',
          geofenceVerified: true
        }
      };

      const unverifiedPunch: Partial<AttendanceRecord> = {
        id: `ATT-${targetDate}-${sampleEmployeeId}`,
        employeeId: sampleEmployeeId,
        checkIn: '2026-08-29T08:00:00Z', // earlier, but outside geofence
        supervisorContext: {
          supervisorId: 'SUP-OFF-SITE',
          siteId: 'SITE-ALPHA',
          punchTimestamp: '2026-08-29T08:00:00Z',
          action: 'PUNCH_IN',
          geofenceVerified: false
        }
      };

      const result = OfflineAttendanceConflictEngine.resolveSupervisorAttendanceConflict(
        verifiedPunch,
        unverifiedPunch,
        'PUNCH_IN'
      );

      expect(result.resolutionRule).toBe('GEOFENCE_VERIFIED_PRECEDENCE');
      expect(result.anomalyAuditPayload?.winnerSupervisorId).toBe('SUP-ON-SITE');
      expect(result.explanation).toContain('verified within authorized Geofence');
    });

    it('should select Assigned Primary Site Supervisor over unassigned/roving supervisor', () => {
      const primarySitePunch: Partial<AttendanceRecord> = {
        id: `ATT-${targetDate}-${sampleEmployeeId}`,
        employeeId: sampleEmployeeId,
        checkIn: '2026-08-29T08:10:00Z',
        supervisorContext: {
          supervisorId: 'SUP-ASSIGNED-SITE',
          siteId: 'SITE-OFFICIAL-ROSTER',
          isAssignedSiteForEmployee: true,
          geofenceVerified: true,
          punchTimestamp: '2026-08-29T08:10:00Z',
          action: 'PUNCH_IN'
        }
      };

      const rovingPunch: Partial<AttendanceRecord> = {
        id: `ATT-${targetDate}-${sampleEmployeeId}`,
        employeeId: sampleEmployeeId,
        checkIn: '2026-08-29T08:10:00Z',
        supervisorContext: {
          supervisorId: 'SUP-ROVING',
          siteId: 'SITE-UNASSIGNED-BRANCH',
          isAssignedSiteForEmployee: false,
          geofenceVerified: true,
          punchTimestamp: '2026-08-29T08:10:00Z',
          action: 'PUNCH_IN'
        }
      };

      const result = OfflineAttendanceConflictEngine.resolveSupervisorAttendanceConflict(
        primarySitePunch,
        rovingPunch,
        'PUNCH_IN'
      );

      expect(result.resolutionRule).toBe('ASSIGNED_SITE_PRECEDENCE');
      expect(result.anomalyAuditPayload?.winnerSupervisorId).toBe('SUP-ASSIGNED-SITE');
    });
  });

  describe('Scenario 4: Authority Hierarchy Level Precedence', () => {
    it('should select Site In-Charge (A5) over Field Supervisor (A6) for simultaneous timestamps', () => {
      const siteInchargePunch: Partial<AttendanceRecord> = {
        id: `ATT-${targetDate}-${sampleEmployeeId}`,
        employeeId: sampleEmployeeId,
        checkIn: '2026-08-29T08:00:00Z',
        supervisorContext: {
          supervisorId: 'SITE-INCHARGE-KULKARNI',
          authorityLevel: 'A5_SITE_IN_CHARGE',
          siteId: 'SITE-ALPHA',
          geofenceVerified: true,
          punchTimestamp: '2026-08-29T08:00:00Z',
          action: 'PUNCH_IN'
        }
      };

      const supervisorPunch: Partial<AttendanceRecord> = {
        id: `ATT-${targetDate}-${sampleEmployeeId}`,
        employeeId: sampleEmployeeId,
        checkIn: '2026-08-29T08:00:00Z',
        supervisorContext: {
          supervisorId: 'SUPERVISOR-SHINDE',
          authorityLevel: 'A6_SUPERVISOR',
          siteId: 'SITE-ALPHA',
          geofenceVerified: true,
          punchTimestamp: '2026-08-29T08:00:00Z',
          action: 'PUNCH_IN'
        }
      };

      const result = OfflineAttendanceConflictEngine.resolveSupervisorAttendanceConflict(
        supervisorPunch,
        siteInchargePunch,
        'PUNCH_IN'
      );

      expect(result.resolutionRule).toBe('HIGHER_ROLE_AUTHORITY_WINS');
      expect(result.anomalyAuditPayload?.winnerSupervisorId).toBe('SITE-INCHARGE-KULKARNI');
    });
  });
});
