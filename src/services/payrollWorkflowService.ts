import { db } from '../firebase';
import { collection, doc, getDoc, getDocs, setDoc, query, where, writeBatch, Timestamp, updateDoc, runTransaction } from 'firebase/firestore';
import { EmployeeRecord, AttendanceRecord, PayrollCycleRecord, LeaveRequestRecord, ShiftRecord, CompanyTenant, AttendanceStatus } from '../types';
import { PayrollEngine } from './payrollEngine';

export interface AttendanceAdjustmentRequest {
  attendanceId: string;
  employeeId: string;
  requestedStatus?: AttendanceStatus;
  requestedCheckIn?: string;
  requestedCheckOut?: string;
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
      const date = new Date(att.attendanceDate);
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
        checkIn: att.checkIn,
        checkOut: att.checkOut,
        approvedOvertimeMinutes: att.approvedOvertimeMinutes
      };

      // Prepare updates
      const updates: Partial<AttendanceRecord> = {
        requiresReview: false,
        regularizationRequested: false
      };
      
      if (adjustment.requestedStatus) updates.status = adjustment.requestedStatus;
      if (adjustment.requestedCheckIn) updates.checkIn = adjustment.requestedCheckIn;
      if (adjustment.requestedCheckOut) updates.checkOut = adjustment.requestedCheckOut;
      if (adjustment.approvedOvertimeMinutes !== undefined) updates.approvedOvertimeMinutes = adjustment.approvedOvertimeMinutes;

      // Ensure idempotency (if no change, skip)
      if (
        updates.status === beforeState.status && 
        updates.checkIn === beforeState.checkIn && 
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
   * Payroll Generation (Transaction Safe, Prevents Double Calculation)
   */
  static async calculatePayrollCycle(
    companyId: string,
    month: number,
    year: number,
    actor: { id: string; name: string }
  ): Promise<string> {
    const cycleId = `CYC-${year}-${String(month).padStart(2, '0')}`;
    const cycleRef = doc(db, 'companies', companyId, 'payrollCycles', cycleId);

    // Fetch all necessary data outside transaction to avoid limits (Firestore transactions limit read/writes)
    // Actually, to ensure idempotency and prevent double processing, we must use a transaction for the cycle status.
    
    // First transaction: Lock the cycle as PROCESSING
    await runTransaction(db, async (t) => {
      const snap = await t.get(cycleRef);
      if (snap.exists()) {
        const cycle = snap.data() as PayrollCycleRecord;
        if (['PROCESSING', 'APPROVED', 'LOCKED', 'DISBURSED'].includes(cycle.status)) {
          throw new Error(`Cycle is currently ${cycle.status}. Cannot recalculate.`);
        }
      }
      
      const newCycle: Partial<PayrollCycleRecord> = {
        id: cycleId,
        companyId,
        month,
        year,
        cycleLabel: `${month.toString().padStart(2, '0')}/${year}`,
        status: 'PROCESSING',
        createdAt: new Date().toISOString()
      };
      t.set(cycleRef, newCycle, { merge: true });
    });

    try {
      // Fetch Data
      const empsSnap = await getDocs(query(collection(db, 'companies', companyId, 'employees'), where('status', '==', 'ACTIVE')));
      const employees = empsSnap.docs.map(d => d.data() as EmployeeRecord);

      // Date range for the month
      const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
      const lastDay = new Date(year, month, 0).getDate();
      const endDate = `${year}-${String(month).padStart(2, '0')}-${lastDay}`;

      const attsSnap = await getDocs(query(collection(db, 'companies', companyId, 'attendance'), 
        where('attendanceDate', '>=', startDate),
        where('attendanceDate', '<=', endDate)
      ));
      const attendances = attsSnap.docs.map(d => d.data() as AttendanceRecord);

      const leavesSnap = await getDocs(query(collection(db, 'companies', companyId, 'leaves'),
        where('startDate', '<=', endDate),
        where('status', 'in', ['APPROVED', 'ACCEPTED']) // Filter approved leaves
      ));
      // Manual filtering for month overlap since firestore inequality on two fields is limited
      const leaves = leavesSnap.docs.map(d => d.data() as LeaveRequestRecord).filter(l => l.endDate >= startDate);

      const salariesSnap = await getDocs(collection(db, 'companies', companyId, 'salaryProfiles'));
      const salaries = salariesSnap.docs.map(d => d.data() as any);

      const structuresSnap = await getDocs(collection(db, 'companies', companyId, 'salaryStructures'));
      const structures = structuresSnap.docs.map(d => d.data() as any);

      let totalGross = 0;
      let totalDeductions = 0;
      let totalNetPay = 0;

      const payrollChunks: any[][] = [];
      const CHUNK_SIZE = 450; // Safety margin for batch limits
      for (let i = 0; i < employees.length; i += CHUNK_SIZE) {
        payrollChunks.push(employees.slice(i, i + CHUNK_SIZE));
      }

      for (const chunk of payrollChunks) {
        const batch = writeBatch(db);
        for (const emp of chunk) {
          const empAtts = attendances.filter(a => a.employeeId === emp.id);
          const empLeaves = leaves.filter(l => l.employeeId === emp.id);
          const profile = salaries.find(s => s.employeeId === emp.id) || { baseMonthlySalary: 18000 };
          const structure = structures.find(s => s.id === profile.structureId) || { basicPercentage: 50 };

          const calc = PayrollEngine.calculate(month, year, emp, profile, structure, [], empLeaves, empAtts, 0);

          const prId = `PR-${cycleId}-${emp.id}`;
          const prRef = doc(db, 'companies', companyId, 'payrollRecords', prId);
          
          batch.set(prRef, {
            id: prId,
            companyId,
            cycleId,
            employeeId: emp.id,
            employeeName: `${emp.firstName} ${emp.lastName}`,
            month,
            year,
            calculations: calc,
            status: 'CALCULATED',
            createdAt: new Date().toISOString()
          });

          totalGross += calc.totalGross;
          totalDeductions += calc.totalDeductions;
          totalNetPay += calc.netPay;
        }
        await batch.commit();
      }

      // Update cycle status and metrics separately to avoid batch limits
      await updateDoc(cycleRef, {
        status: 'CALCULATED',
        totalEmployees: employees.length,
        totalGrossPay: totalGross,
        totalDeductions,
        totalNetPay,
        processedAt: new Date().toISOString(),
        processedBy: actor.id,
        processedByName: actor.name
      });

      // Audit Log (Separate doc)
      const auditRef = doc(collection(db, 'companies', companyId, 'audit_logs'));
      await setDoc(auditRef, {
        id: auditRef.id,
        companyId,
        action: 'PAYROLL_CALCULATED',
        entityId: cycleId,
        entityType: 'PAYROLL_CYCLE',
        userId: actor.id,
        userName: actor.name,
        details: `Calculated payroll for ${employees.length} employees for ${month}/${year}`,
        timestamp: new Date().toISOString()
      });

      return cycleId;
    } catch (error) {
      // Revert processing status
      await updateDoc(cycleRef, { status: 'DRAFT' });
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
