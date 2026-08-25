import {
  AttendanceRecord,
  BiometricVerificationResult,
  EmployeeRecord,
  ShiftRecord,
  SiteRecord
} from '../../types';
import {
  DeviceEmployeeMapping,
  DevicePunchTransaction,
  DeviceRawPunch,
  PunchSyncResult
} from '../../types/biometric';
import { AttendanceCalculationEngine } from '../calculationEngine';
import { FirestoreService } from '../firestoreService';
import { WfmService } from '../wfmService';

export class PunchNormalizationEngine {
  /**
   * Deterministic Idempotency Key Generator
   */
  public static computeIdempotencyKey(
    companyId: string,
    deviceId: string,
    machineUserId: string,
    rawTransactionIdOrTimestamp: string
  ): string {
    const sanitizedTx = String(rawTransactionIdOrTimestamp).replace(/[^a-zA-Z0-9_-]/g, '_');
    return `TX_${companyId}_${deviceId}_${machineUserId}_${sanitizedTx}`;
  }

  /**
   * Normalize an array of raw biometric punches into Attendance records
   */
  public static async processRawPunches(
    companyId: string,
    siteId: string,
    deviceId: string,
    rawPunches: DeviceRawPunch[],
    mappings: DeviceEmployeeMapping[],
    employees: EmployeeRecord[],
    shifts: ShiftRecord[],
    existingTransactionIds: Set<string> = new Set()
  ): Promise<PunchSyncResult> {
    const startTime = Date.now();
    const processedTransactions: DevicePunchTransaction[] = [];
    let newCreated = 0;
    let updated = 0;
    let duplicates = 0;
    let unmappedCount = 0;
    let failedCount = 0;

    // Fast mapping dictionary: machineUserId -> DeviceEmployeeMapping
    const mappingMap = new Map<string, DeviceEmployeeMapping>();
    for (const m of mappings) {
      if (m.mappingStatus !== 'IGNORED') {
        mappingMap.set(m.machineUserId, m);
      }
    }

    // Fast employee dictionary: employeeId -> EmployeeRecord
    const empMap = new Map<string, EmployeeRecord>();
    for (const e of employees) {
      empMap.set(e.id, e);
    }

    // Default fallback shift (General 09:00 - 18:00) if no custom shift attached
    const defaultShift: ShiftRecord = shifts.length > 0 ? shifts[0] : {
      id: 'SHIFT_GEN_01',
      companyId,
      shiftCode: 'GEN-01',
      shiftName: 'General Day Shift',
      startTime: '09:00',
      endTime: '18:00',
      shiftDurationMinutes: 540,
      gracePeriodMinutes: 15,
      lateThresholdMinutes: 15,
      earlyDepartureThresholdMinutes: 15,
      breakDurationMinutes: 60,
      isCrossMidnight: false,
      minWorkMinutes: 480,
      weeklyOffDays: [0],
      weeklyApplicability: [0, 1, 2, 3, 4, 5, 6],
      status: 'ACTIVE',
      createdBy: 'SYSTEM',
      updatedBy: 'SYSTEM',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    for (const raw of rawPunches) {
      const txId = raw.transactionId || String(new Date(raw.timestamp).getTime());
      const idempotencyKey = this.computeIdempotencyKey(companyId, deviceId, raw.machineUserId, txId);

      // 1. Idempotency Check (Duplicate prevention)
      if (existingTransactionIds.has(idempotencyKey)) {
        duplicates++;
        processedTransactions.push({
          id: idempotencyKey,
          companyId,
          siteId,
          deviceId,
          machineUserId: raw.machineUserId,
          transactionId: txId,
          punchTimestamp: raw.timestamp,
          receivedAt: new Date().toISOString(),
          verificationMethod: raw.verificationMethod,
          punchType: raw.punchType || 'AUTO_DETECT',
          source: 'BIOMETRIC_DEVICE',
          rawReference: raw.rawPayload || JSON.stringify(raw),
          processedStatus: 'DUPLICATE',
          retryCount: 0
        });
        continue;
      }

      // 2. Machine User Mapping Lookup
      const mapping = mappingMap.get(raw.machineUserId);
      if (!mapping || !mapping.employeeId) {
        unmappedCount++;
        processedTransactions.push({
          id: idempotencyKey,
          companyId,
          siteId,
          deviceId,
          machineUserId: raw.machineUserId,
          transactionId: txId,
          punchTimestamp: raw.timestamp,
          receivedAt: new Date().toISOString(),
          verificationMethod: raw.verificationMethod,
          punchType: raw.punchType || 'AUTO_DETECT',
          source: 'BIOMETRIC_DEVICE',
          rawReference: raw.rawPayload || JSON.stringify(raw),
          processedStatus: 'UNMAPPED_EMPLOYEE',
          errorMessage: `No mapped employee found for machine user PIN ${raw.machineUserId}`,
          retryCount: 0
        });
        continue;
      }

      const employee = empMap.get(mapping.employeeId);
      const employeeName = employee ? `${employee.firstName || ''} ${employee.lastName || ''}`.trim() : (mapping.employeeName || `Employee ${mapping.employeeId}`);

      // 3. Process Attendance Record via standard LSM HCM logic
      try {
        const punchDate = new Date(raw.timestamp).toISOString().split('T')[0];
        const punchIso = new Date(raw.timestamp).toISOString();

        // 3a. Find actual roster for this employee on this date
        // Note: In a production loop, we'd pre-fetch rosters for performance.
        // For now, we'll try to resolve from a local cache or fetch.
        const rosters = await FirestoreService.getRostersByDate(companyId, punchDate);
        const employeeRoster = rosters.find((r: any) => r.employeeId === mapping.employeeId);

        if (!employeeRoster) {
          failedCount++;
          processedTransactions.push({
            id: idempotencyKey,
            companyId,
            siteId,
            deviceId,
            employeeId: mapping.employeeId,
            machineUserId: raw.machineUserId,
            transactionId: txId,
            punchTimestamp: raw.timestamp,
            receivedAt: new Date().toISOString(),
            verificationMethod: raw.verificationMethod,
            punchType: raw.punchType || 'AUTO_DETECT',
            source: 'BIOMETRIC_DEVICE',
            rawReference: raw.rawPayload || JSON.stringify(raw),
            processedStatus: 'ERROR',
            errorMessage: `No roster assigned for employee ${mapping.employeeId} on ${punchDate}. Synchronization blocked to prevent ghost attendance.`,
            retryCount: 0
          });
          continue;
        }

        const rosterId = employeeRoster.id;
        const attendanceId = `ATT-${rosterId}`;
        const shift = shifts.find(s => s.id === employeeRoster.shiftId) || defaultShift;

        // 3b. Check if attendance already exists (for punch-out detection)
        const existingAttendance = await FirestoreService.getAttendanceById(companyId, attendanceId);

        if (existingAttendance && !existingAttendance.checkOut) {
          // It's a Punch-Out
          await FirestoreService.punchOut(
            companyId,
            attendanceId,
            shift,
            { latitude: 0, longitude: 0 },
            'SUCCESS'
          );
          updated++;
        } else if (!existingAttendance) {
          // It's a Punch-In
          await FirestoreService.punchIn(
            companyId,
            mapping.employeeId,
            employeeName,
            rosterId,
            shift,
            siteId,
            `Site ${siteId}`,
            { latitude: 0, longitude: 0 },
            `Biometric Device ${deviceId} (${raw.verificationMethod})`,
            'SUCCESS'
          );
          newCreated++;
        } else {
          // Already has both check-in and check-out - possible duplicate or double punch
          duplicates++;
        }

        existingTransactionIds.add(idempotencyKey);
        processedTransactions.push({
          id: idempotencyKey,
          companyId,
          siteId,
          deviceId,
          employeeId: mapping.employeeId,
          machineUserId: raw.machineUserId,
          transactionId: txId,
          punchTimestamp: raw.timestamp,
          receivedAt: new Date().toISOString(),
          verificationMethod: raw.verificationMethod,
          punchType: raw.punchType || 'AUTO_DETECT',
          source: 'BIOMETRIC_DEVICE',
          rawReference: raw.rawPayload || JSON.stringify(raw),
          processedStatus: 'PROCESSED',
          attendanceRecordId: attendanceId,
          processedAt: new Date().toISOString(),
          retryCount: 0
        });
      } catch (err: any) {
        failedCount++;
        processedTransactions.push({
          id: idempotencyKey,
          companyId,
          siteId,
          deviceId,
          employeeId: mapping.employeeId,
          machineUserId: raw.machineUserId,
          transactionId: txId,
          punchTimestamp: raw.timestamp,
          receivedAt: new Date().toISOString(),
          verificationMethod: raw.verificationMethod,
          punchType: raw.punchType || 'AUTO_DETECT',
          source: 'BIOMETRIC_DEVICE',
          rawReference: raw.rawPayload || JSON.stringify(raw),
          processedStatus: 'ERROR',
          errorMessage: err?.message || 'Attendance write error',
          retryCount: 1
        });
      }
    }

    const executionTimeMs = Date.now() - startTime;

    return {
      success: failedCount === 0,
      deviceId,
      totalFetched: rawPunches.length,
      totalProcessed: newCreated + updated,
      totalDuplicate: duplicates,
      totalUnmapped: unmappedCount,
      totalFailed: failedCount,
      executionTimeMs,
      newAttendanceRecordsCreated: newCreated,
      attendanceRecordsUpdated: updated,
      transactions: processedTransactions,
      message: `Processed ${rawPunches.length} punches (${newCreated} new, ${duplicates} duplicates, ${unmappedCount} unmapped, ${failedCount} errors) in ${executionTimeMs}ms`
    };
  }
}
