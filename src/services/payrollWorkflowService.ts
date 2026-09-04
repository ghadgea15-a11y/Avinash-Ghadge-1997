import { db } from '../firebase';
import { collection, doc, getDoc, getDocs, setDoc, query, where, writeBatch, Timestamp, updateDoc, runTransaction } from 'firebase/firestore';

import { EmployeeRecord, AttendanceRecord, PayrollCycleRecord, LeaveRequestRecord, ShiftRecord, CompanyTenant, AttendanceStatus, StatutoryConfigRecord } from '../types';
import { PayrollEngine } from './payrollEngine';
import { StatutoryRulesService, DEFAULT_STATE_STATUTORY_CONFIGS } from './statutoryRulesService';

export interface AttendanceAdjustmentRequest {
  attendanceId: string;
  employeeId: string;
  requestedStatus?: AttendanceStatus;
  requestedCheckInTime?: string;
  requestedCheckOutTime?: string;
  approvedOvertimeMinutes?: number;
  reason: string;
}

export class PayrollWorkflowService {
  /**
   * Safe, transactional attendance adjustment (e.g. Regularization, OT Approval)
   * Ensures financial-impacting changes are audited and cannot be done if payroll is locked.
   */
  static async adjustAttendance(
    companyId: string,
    adjustment: AttendanceAdjustmentRequest,
    actor: { id: string; name: string }
  ): Promise<void> {
    await runTransaction(db, async (transaction) => {
      const attRef = doc(db, 'companies', companyId, 'attendance', adjustment.attendanceId);
      const attSnap = await transaction.get(attRef);
      if (!attSnap.exists()) throw new Error('Attendance record not found.');
      const att = attSnap.data() as AttendanceRecord;

      // 1. Check if payroll for this month is already locked
      const date = new Date(att.date || att.attendanceDate || "");
      const cycleId = `CYC-${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const cycleRef = doc(db, 'companies', companyId, 'payrollCycles', cycleId);
      const cycleSnap = await transaction.get(cycleRef);
      
      if (cycleSnap.exists()) {
        const cycle = cycleSnap.data() as PayrollCycleRecord;
        if (['APPROVED', 'LOCKED', 'DISBURSED', 'PROCESSING'].includes(cycle.status)) {
          throw new Error(`Cannot modify attendance: Payroll cycle for ${date.getFullYear()}-${date.getMonth() + 1} is already ${cycle.status}.`);
        }
      }

      // Store before values for audit
      const beforeState = {
        status: att.status,
        checkIn: att.checkInTime,
        checkOut: att.checkOut,
        approvedOvertimeMinutes: att.approvedOvertimeMinutes
      };

      // Prepare updates
      const updates: Partial<AttendanceRecord> = {
        requiresReview: false,
        regularizationRequested: false
      };
      
      if (adjustment.requestedStatus) updates.status = adjustment.requestedStatus;
      if (adjustment.requestedCheckInTime) updates.checkInTime = adjustment.requestedCheckInTime;
      if (adjustment.requestedCheckOutTime) updates.checkOut = adjustment.requestedCheckOutTime;
      if (adjustment.approvedOvertimeMinutes !== undefined) updates.approvedOvertimeMinutes = adjustment.approvedOvertimeMinutes;

      // Ensure idempotency (if no change, skip)
      if (
        updates.status === beforeState.status && 
        updates.checkInTime === beforeState.checkInTime && 
        updates.checkOut === beforeState.checkOut && 
        updates.approvedOvertimeMinutes === beforeState.approvedOvertimeMinutes
      ) {
        return; // No-op
      }

      transaction.update(attRef, updates);

      // Audit Trail
      const auditRef = doc(collection(db, 'companies', companyId, 'audit_logs'));
      transaction.set(auditRef, {
        id: auditRef.id,
        companyId,
        action: 'ATTENDANCE_ADJUSTED',
        entityId: att.id,
        entityType: 'ATTENDANCE',
        userId: actor.id,
        userName: actor.name,
        details: `Adjusted attendance for ${att.employeeName} on ${att.attendanceDate}. Reason: ${adjustment.reason}`,
        before: beforeState,
        after: updates,
        timestamp: new Date().toISOString()
      });
    });
  }

  /**
   * Payroll Generation (Transaction Safe, Prevents Double Calculation, Dynamic State Statutory Engine)
   */
  static async calculatePayrollCycle(
    companyId: string,
    month: number,
    year: number,
    actor: { id: string; name: string }
  ): Promise<string> {
    try {
      const response = await fetch('/api/payroll/calculate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          companyId,
          month,
          year,
          actorId: actor.id,
          actorName: actor.name
        })
      });
      
      const data = await response.json();
      if (data && data.success && data.cycleId) {
        return data.cycleId;
      }
      throw new Error(data.error || 'Failed to generate payroll cycle');
    } catch (error) {
      console.error('[PayrollWorkflowService] Error calling calculateMonthlyPayroll API:', error);
      throw error;
    }
  }

  /**
   * Final Approval of Payroll
   */
  static async approvePayrollCycle(
    companyId: string,
    cycleId: string,
    actor: { id: string; name: string }
  ): Promise<void> {
    await runTransaction(db, async (t) => {
      const cycleRef = doc(db, 'companies', companyId, 'payrollCycles', cycleId);
      const cycleSnap = await t.get(cycleRef);
      if (!cycleSnap.exists()) throw new Error('Cycle not found');
      const cycle = cycleSnap.data() as PayrollCycleRecord;

      if (cycle.status !== 'CALCULATED' && cycle.status !== 'PENDING_APPROVAL') {
        throw new Error(`Cycle is ${cycle.status}. Only CALCULATED or PENDING_APPROVAL cycles can be approved.`);
      }

      t.update(cycleRef, {
        status: 'LOCKED',
        approvedAt: new Date().toISOString(),
        approvedBy: actor.id,
        approvedByName: actor.name
      });

      const auditRef = doc(collection(db, 'companies', companyId, 'audit_logs'));
      t.set(auditRef, {
        id: auditRef.id,
        companyId,
        action: 'PAYROLL_LOCKED',
        entityId: cycleId,
        entityType: 'PAYROLL_CYCLE',
        userId: actor.id,
        userName: actor.name,
        details: `Locked and approved payroll cycle ${cycleId}`,
        timestamp: new Date().toISOString()
      });
    });
  }
}
