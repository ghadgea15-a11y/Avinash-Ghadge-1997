import { 
  LeaveRequestRecord, 
  LeavePolicyRecord, 
  LeaveBalanceRecord, 
  HolidayRecord, 
  RosterRecord, 
  AttendanceRecord,
  LeaveBalanceDetail,
  LeaveLedgerEntry
} from '../types';

export interface ProRataCalculationOptions {
  calculationMethod?: 'MONTHLY_EXACT' | 'DAILY_EXACT' | 'MONTHLY_FULL_IF_BEFORE_15TH' | 'MONTHLY_HALF_DAY';
  roundingRule?: 'NEAREST_HALF_DAY' | 'ROUND_TWO_DECIMALS' | 'ROUND_UP' | 'ROUND_DOWN';
}

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
    policy: LeavePolicyRecord,
    employeeRegionId?: string
  ): number {
    if (isHalfDay) return 0.5;

    const start = new Date(startDate);
    const end = new Date(endDate);
    let count = 0;

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      const dayOfWeek = d.getDay();

      const isWeeklyOff = weeklyOffDays.includes(dayOfWeek);
      const isHoliday = holidays.some(h => {
        if (h.date !== dateStr) return false;
        if (!h.applicableRegions || h.applicableRegions.length === 0) return true; // Global holiday
        return employeeRegionId && h.applicableRegions.includes(employeeRegionId);
      });

      if (isWeeklyOff || isHoliday) {
        // Only count if policy explicitly says to include non-working days
        // Usually, policies don't count them unless it's a "consecutive calendar days" policy
        if (policy.includeWeeklyOffsInLeaveCount || policy.includeHolidaysInLeaveCount) {
          count++;
        }
        continue;
      }

      count++;
    }

    return count;
  }

  /**
   * Helper to check if a year is a leap year
   */
  static isLeapYear(year: number): boolean {
    return (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
  }

  /**
   * Calculates statutory pro-rata leave entitlement for mid-year joining employees
   * using authoritative HRMS mathematical formulas instead of placeholder values.
   *
   * Formula:
   * 1. If joiningDate is in a previous year -> Full annual entitlement (1.0 factor).
   * 2. If joiningDate is in a future year -> 0.
   * 3. If joiningDate is in the target year:
   *    - Monthly Exact: (Annual / 12) * (Full remaining months + (Days remaining in joining month / Days in joining month))
   *    - Daily Exact: (Annual / Total days in year) * Days remaining in year from DOJ
   *    - Standard Rounding: Nearest half-day (0.5) or exact 2 decimal places based on policy.
   */
  static calculateProRataEntitlement(
    annualEntitlement: number,
    joiningDateStr: string,
    targetYear: number = new Date().getFullYear(),
    options: ProRataCalculationOptions = {}
  ): number {
    if (!annualEntitlement || annualEntitlement <= 0) return 0;
    if (!joiningDateStr) return annualEntitlement;

    const joiningDate = new Date(joiningDateStr);
    if (isNaN(joiningDate.getTime())) return annualEntitlement;

    const joiningYear = joiningDate.getFullYear();
    const joiningMonth = joiningDate.getMonth(); // 0 = Jan, 11 = Dec
    const joiningDay = joiningDate.getDate();

    // Case 1: Employee joined before the target year -> Full Entitlement
    if (joiningYear < targetYear) {
      return annualEntitlement;
    }

    // Case 2: Employee joins in future year -> 0 Entitlement for current year
    if (joiningYear > targetYear) {
      return 0;
    }

    // Case 3: Employee joined on Jan 1st of target year -> Full Entitlement
    if (joiningMonth === 0 && joiningDay === 1) {
      return annualEntitlement;
    }

    const method = options.calculationMethod || 'MONTHLY_EXACT';
    const rounding = options.roundingRule || 'NEAREST_HALF_DAY';

    let rawCalculatedDays = 0;

    if (method === 'DAILY_EXACT') {
      const totalDaysInYear = this.isLeapYear(targetYear) ? 366 : 365;
      const endOfYear = new Date(targetYear, 11, 31, 23, 59, 59, 999);
      const diffTime = Math.max(0, endOfYear.getTime() - joiningDate.getTime());
      const remainingDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1; // inclusive of join day
      rawCalculatedDays = (annualEntitlement / totalDaysInYear) * Math.min(remainingDays, totalDaysInYear);
    } else if (method === 'MONTHLY_FULL_IF_BEFORE_15TH') {
      const fullMonthsRemaining = 11 - joiningMonth;
      const joinMonthCredit = joiningDay <= 15 ? 1.0 : 0.5;
      const effectiveMonths = fullMonthsRemaining + joinMonthCredit;
      rawCalculatedDays = (annualEntitlement / 12) * effectiveMonths;
    } else if (method === 'MONTHLY_HALF_DAY') {
      const fullMonthsRemaining = 11 - joiningMonth;
      const daysInJoinMonth = new Date(targetYear, joiningMonth + 1, 0).getDate();
      const fraction = (daysInJoinMonth - joiningDay + 1) / daysInJoinMonth;
      const joinMonthCredit = fraction >= 0.75 ? 1.0 : (fraction >= 0.25 ? 0.5 : 0);
      const effectiveMonths = fullMonthsRemaining + joinMonthCredit;
      rawCalculatedDays = (annualEntitlement / 12) * effectiveMonths;
    } else {
      // Default: 'MONTHLY_EXACT' (Statutory Indian Factories & S&E HRMS standard)
      const fullMonthsRemaining = 11 - joiningMonth;
      const daysInJoinMonth = new Date(targetYear, joiningMonth + 1, 0).getDate();
      const remainingDaysInJoinMonth = daysInJoinMonth - joiningDay + 1;
      const fractionOfJoinMonth = Math.max(0, Math.min(1, remainingDaysInJoinMonth / daysInJoinMonth));
      const effectiveMonths = fullMonthsRemaining + fractionOfJoinMonth;
      rawCalculatedDays = (annualEntitlement / 12) * effectiveMonths;
    }

    // Apply Rounding Rule
    return this.applyRounding(rawCalculatedDays, rounding);
  }

  /**
   * Applies statutory rounding rules to leave fractions
   */
  static applyRounding(value: number, rule: 'NEAREST_HALF_DAY' | 'ROUND_TWO_DECIMALS' | 'ROUND_UP' | 'ROUND_DOWN'): number {
    switch (rule) {
      case 'NEAREST_HALF_DAY':
        // Standard HRMS: Round to nearest 0.5 (e.g., 5.24 -> 5.0, 5.25 -> 5.5, 5.76 -> 6.0)
        return Math.round(value * 2) / 2;
      case 'ROUND_UP':
        // Ceil to nearest 0.5
        return Math.ceil(value * 2) / 2;
      case 'ROUND_DOWN':
        // Floor to nearest 0.5
        return Math.floor(value * 2) / 2;
      case 'ROUND_TWO_DECIMALS':
      default:
        return Number(value.toFixed(2));
    }
  }

  /**
   * Calculates monthly accrual based on annual entitlement with optional mid-month joining pro-rata
   */
  static calculateMonthlyAccrual(
    annualEntitlement: number, 
    month: number,
    joiningDateStr?: string,
    year: number = new Date().getFullYear()
  ): number {
    if (!annualEntitlement || annualEntitlement <= 0) return 0;
    const baseMonthly = annualEntitlement / 12;

    if (!joiningDateStr) {
      return Number(baseMonthly.toFixed(2));
    }

    const joiningDate = new Date(joiningDateStr);
    if (isNaN(joiningDate.getTime())) return Number(baseMonthly.toFixed(2));

    const jYear = joiningDate.getFullYear();
    const jMonth = joiningDate.getMonth() + 1; // 1-indexed

    // If joined in future month
    if (jYear > year || (jYear === year && jMonth > month)) {
      return 0;
    }

    // If joined in the current month: calculate fraction of month worked
    if (jYear === year && jMonth === month) {
      const daysInMonth = new Date(year, month, 0).getDate();
      const remainingDays = daysInMonth - joiningDate.getDate() + 1;
      const fraction = remainingDays / daysInMonth;
      return Number((baseMonthly * fraction).toFixed(2));
    }

    return Number(baseMonthly.toFixed(2));
  }

  /**
   * Server-Authoritative Leave Accruals Processing
   * Calls the centralized server API to compute and persist accruals and auditable ledger records.
   */
  static async triggerServerAccrualProcess(
    companyId: string,
    month: number = new Date().getMonth() + 1,
    year: number = new Date().getFullYear(),
    actor: { id: string; name: string } = { id: 'SYSTEM', name: 'Admin' }
  ): Promise<{ success: boolean; processedCount: number }> {
    try {
      const res = await fetch('/api/leave/process-accruals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId,
          month,
          year,
          actorId: actor.id,
          actorName: actor.name
        })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Server accrual processing failed');
      }
      return data;
    } catch (err) {
      console.error('[LeaveService] Error in triggerServerAccrualProcess:', err);
      throw err;
    }
  }

  /**
   * Processes end-of-month accruals for all employees (synchronous helper)
   */
  static processAccruals(
    balance: LeaveBalanceRecord, 
    policies: LeavePolicyRecord[],
    month: number = new Date().getMonth() + 1,
    year: number = new Date().getFullYear()
  ): LeaveBalanceRecord {
    const updatedBalances = balance.balances.map(b => {
      const policy = policies.find(p => p.leaveCode === b.leaveCode);
      if (!policy) return b;

      const monthly = this.calculateMonthlyAccrual(
        policy.annualEntitlement || policy.annualAllocation || 0, 
        month,
        b.joiningDate,
        year
      );
      const newAccrued = Number(((b.accrued || 0) + monthly).toFixed(2));
      
      return {
        ...b,
        accrued: newAccrued,
        availableBalance: this.calculateAvailableBalance({ ...b, accrued: newAccrued })
      };
    });

    return {
      ...balance,
      balances: updatedBalances,
      updatedAt: new Date().toISOString()
    };
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
  static calculateAvailableBalance(detail: any): number {
    const opening = detail.openingBalance ?? detail.allocated ?? 0;
    const accrued = detail.accrued ?? 0;
    const carried = detail.carriedForward ?? detail.carriedOver ?? 0;
    const adjusted = detail.adjusted ?? 0;
    const used = detail.used ?? 0;
    const encashed = detail.encashed ?? 0;

    return Number((opening + accrued + carried + adjusted - used - encashed).toFixed(2));
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
   * Generates a pro-rata aware initial balance record for an employee based on active policies
   * and employee's date of joining.
   */
  static createInitialBalance(
    companyId: string,
    employeeId: string,
    employeeName: string,
    year: number,
    policies: LeavePolicyRecord[],
    joiningDateStr?: string
  ): LeaveBalanceRecord {
    const balances: LeaveBalanceDetail[] = policies.map(p => {
      const annual = p.annualEntitlement || p.annualAllocation || 0;
      let effectiveAccrued = annual;
      let isProRata = false;
      let proRataFactor = 1.0;

      if (joiningDateStr) {
        const joinDate = new Date(joiningDateStr);
        if (!isNaN(joinDate.getTime()) && joinDate.getFullYear() === year) {
          isProRata = true;
          effectiveAccrued = this.calculateProRataEntitlement(annual, joiningDateStr, year, {
            calculationMethod: p.proRataMethod || 'MONTHLY_EXACT',
            roundingRule: p.roundingRule || 'NEAREST_HALF_DAY'
          });
          proRataFactor = annual > 0 ? Number((effectiveAccrued / annual).toFixed(4)) : 1.0;
        }
      }

      return {
        leaveCode: p.leaveCode || p.policyCode || 'LEAVE',
        leaveName: p.leaveName || p.policyName || 'Leave',
        openingBalance: effectiveAccrued,
        accrued: 0,
        used: 0,
        pending: 0,
        adjusted: 0,
        carriedForward: 0,
        encashed: 0,
        availableBalance: effectiveAccrued,
        isProRataApplied: isProRata,
        joiningDate: joiningDateStr,
        proRataFactor,
        proRataEntitlement: effectiveAccrued
      };
    });

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

  /**
   * Generates transactional Leave Ledger entries for initial entitlement / pro-rata allotment
   */
  static generateInitialLedgerEntries(
    companyId: string,
    employeeId: string,
    employeeName: string,
    year: number,
    policies: LeavePolicyRecord[],
    joiningDateStr?: string
  ): LeaveLedgerEntry[] {
    const now = new Date().toISOString();
    return policies.map((p, idx) => {
      const annual = p.annualEntitlement || p.annualAllocation || 0;
      let credit = annual;
      let isProRata = false;
      let proRataFactor = 1.0;

      if (joiningDateStr) {
        const joinDate = new Date(joiningDateStr);
        if (!isNaN(joinDate.getTime()) && joinDate.getFullYear() === year) {
          isProRata = true;
          credit = this.calculateProRataEntitlement(annual, joiningDateStr, year, {
            calculationMethod: p.proRataMethod || 'MONTHLY_EXACT',
            roundingRule: p.roundingRule || 'NEAREST_HALF_DAY'
          });
          proRataFactor = annual > 0 ? Number((credit / annual).toFixed(4)) : 1.0;
        }
      }

      const leaveCode = p.leaveCode || p.policyCode || `L${idx + 1}`;
      const leaveName = p.leaveName || p.policyName || 'Leave';

      return {
        id: `LEDGER-${employeeId}-${leaveCode}-${year}-INIT`,
        companyId,
        employeeId,
        employeeName,
        leaveCode,
        leaveName,
        year,
        transactionType: isProRata ? 'PRO_RATA_OPENING' : 'ANNUAL_ACCRUAL',
        transactionDate: joiningDateStr || `${year}-01-01`,
        creditDays: credit,
        debitDays: 0,
        balanceBefore: 0,
        balanceAfter: credit,
        joiningDate: joiningDateStr,
        proRataFactor,
        annualEntitlement: annual,
        reason: isProRata 
          ? `Mid-Year Joining Pro-Rata Accrual (${credit} / ${annual} days, DOJ: ${joiningDateStr})`
          : `Annual Entitlement Allocation (${annual} days for ${year})`,
        referenceId: `POL-${p.id || leaveCode}`,
        createdBy: 'SYSTEM_ACCRUAL_ENGINE',
        createdAt: now
      };
    });
  }

  /**
   * Generates a debit ledger entry when an approved leave is consumed
   */
  static generateDebitLedgerEntry(
    companyId: string,
    employeeId: string,
    employeeName: string,
    leaveCode: string,
    leaveName: string,
    year: number,
    daysDebited: number,
    balanceBefore: number,
    leaveRequestId: string,
    actor: string
  ): LeaveLedgerEntry {
    const balanceAfter = Number((balanceBefore - daysDebited).toFixed(2));
    return {
      id: `LEDGER-${employeeId}-${leaveCode}-${Date.now()}-DEBIT`,
      companyId,
      employeeId,
      employeeName,
      leaveCode,
      leaveName,
      year,
      transactionType: 'LEAVE_DEBIT',
      transactionDate: new Date().toISOString().split('T')[0],
      creditDays: 0,
      debitDays: daysDebited,
      balanceBefore,
      balanceAfter,
      reason: `Leave Consumed (${daysDebited} days) for Request #${leaveRequestId}`,
      referenceId: leaveRequestId,
      createdBy: actor,
      createdAt: new Date().toISOString()
    };
  }

  /**
   * Generates a credit reversal ledger entry when an approved leave is cancelled or withdrawn
   */
  static generateReversalLedgerEntry(
    companyId: string,
    employeeId: string,
    employeeName: string,
    leaveCode: string,
    leaveName: string,
    year: number,
    daysReversed: number,
    balanceBefore: number,
    leaveRequestId: string,
    actor: string,
    reason?: string
  ): LeaveLedgerEntry {
    const balanceAfter = Number((balanceBefore + daysReversed).toFixed(2));
    return {
      id: `LEDGER-${employeeId}-${leaveCode}-${Date.now()}-REV`,
      companyId,
      employeeId,
      employeeName,
      leaveCode,
      leaveName,
      year,
      transactionType: 'LEAVE_REVERSAL',
      transactionDate: new Date().toISOString().split('T')[0],
      creditDays: daysReversed,
      debitDays: 0,
      balanceBefore,
      balanceAfter,
      reason: reason || `Leave Reversal (+${daysReversed} days) for Request #${leaveRequestId}`,
      referenceId: leaveRequestId,
      createdBy: actor,
      createdAt: new Date().toISOString()
    };
  }
}

