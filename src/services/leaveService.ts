import { 
  LeaveRequestRecord, 
  LeavePolicyRecord, 
  LeaveBalanceRecord, 
  HolidayRecord, 
  RosterRecord, 
  AttendanceRecord,
  LeaveBalanceDetail
} from '../types';

export class LeaveService {
  /**
   * Calculates the actual leave days count excluding holidays and weekly offs
   */
  static calculateLeaveDays(
    startDate: string,
    endDate: string,
    isHalfDay: boolean,
    weeklyOffDays: number[], // 0 = Sunday, 1 = Monday...
    holidays: HolidayRecord[],
    policy: LeavePolicyRecord
  ): number {
    if (isHalfDay) return 0.5;

    const start = new Date(startDate);
    const end = new Date(endDate);
    let count = 0;

    const holidayDates = new Set(holidays.map(h => h.date));

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      const dayOfWeek = d.getDay();

      const isWeeklyOff = weeklyOffDays.includes(dayOfWeek);
      const isHoliday = holidayDates.has(dateStr);

      if (isWeeklyOff || isHoliday) {
        // Only count if policy explicitly says to include non-working days
        // Usually, policies don't count them unless it's a "consecutive calendar days" policy
        // For simplicity here, we follow standard industry practice of excluding them
        continue;
      }

      count++;
    }

    return count;
  }

  /**
   * Checks if a new leave request overlaps with existing ones
   */
  static detectOverlaps(
    newStart: string,
    newEnd: string,
    existingRequests: LeaveRequestRecord[]
  ): LeaveRequestRecord | null {
    const start = new Date(newStart);
    const end = new Date(newEnd);

    for (const req of existingRequests) {
      if (req.status === 'REJECTED' || req.status === 'CANCELLED' || req.status === 'WITHDRAWN') continue;

      const reqStart = new Date(req.startDate);
      const reqEnd = new Date(req.endDate);

      if (start <= reqEnd && end >= reqStart) {
        return req;
      }
    }

    return null;
  }

  /**
   * Calculates available balance using the standard formula:
   * Available = Opening + Accrued + Carry Forward + Adjustments - Consumed - Encashment
   */
  static calculateAvailableBalance(detail: LeaveBalanceDetail): number {
    return (
      (detail.openingBalance ?? 0) +
      (detail.accrued ?? 0) +
      (detail.carriedForward ?? 0) +
      (detail.adjusted ?? 0) -
      (detail.used ?? 0) -
      (detail.encashed ?? 0)
    );
  }

  /**
   * Detects absences by comparing rosters with attendance and leave
   */
  static detectAbsences(
    rosters: RosterRecord[],
    attendances: AttendanceRecord[],
    leaves: LeaveRequestRecord[],
    holidays: HolidayRecord[],
    weeklyOffDays: number[]
  ): { date: string; roster: RosterRecord }[] {
    const absences: { date: string; roster: RosterRecord }[] = [];
    const attendanceDates = new Set(attendances.map(a => `${a.employeeId}_${a.attendanceDate}`));
    const holidayDates = new Set(holidays.map(h => h.date));

    // Map leaves to dates
    const leaveDates = new Set<string>();
    leaves.forEach(l => {
      if (l.status !== 'APPROVED') return;
      const start = new Date(l.startDate);
      const end = new Date(l.endDate);
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        leaveDates.add(`${l.employeeId}_${d.toISOString().split('T')[0]}`);
      }
    });

    for (const r of rosters) {
      const date = r.date || r.rosterDate || '';
      if (!date) continue;

      const key = `${r.employeeId}_${date}`;
      const d = new Date(date);
      
      const isWeeklyOff = weeklyOffDays.includes(d.getDay());
      const isHoliday = holidayDates.has(date);

      if (isWeeklyOff || isHoliday) continue;

      if (!attendanceDates.has(key) && !leaveDates.has(key)) {
        absences.push({ date, roster: r });
      }
    }

    return absences;
  }

  /**
   * Generates a default balance record based on active policies
   */
  static createInitialBalance(
    companyId: string,
    employeeId: string,
    employeeName: string,
    year: number,
    policies: LeavePolicyRecord[]
  ): LeaveBalanceRecord {
    const balances: LeaveBalanceDetail[] = policies.map(p => ({
      leaveCode: p.leaveCode,
      leaveName: p.leaveName,
      openingBalance: 0,
      accrued: p.annualEntitlement, // Simplified: fully accrued at start for annual
      used: 0,
      pending: 0,
      adjusted: 0,
      carriedForward: 0,
      encashed: 0,
      availableBalance: p.annualEntitlement
    }));

    return {
      id: `${employeeId}_${year}`,
      companyId,
      employeeId,
      employeeName,
      year,
      balances,
      updatedAt: new Date().toISOString()
    };
  }
}
