import { 
  ShiftRecord, 
  AttendanceRecord, 
  AttendanceStatus, 
  OvertimePolicyRecord, 
  OvertimeRoundingRule, 
  AttendanceExceptionType, 
  AttendanceCalculationResult,
  LeaveRequestRecord,
  UserSession,
  WorkforceCategory,
  UserRole
} from '../types';

export class AttendanceCalculationEngine {
  /**
   * Default enterprise Overtime & Late Policy
   */
  static getDefaultPolicy(companyId: string): OvertimePolicyRecord {
    const now = new Date().toISOString();
    return {
      id: `DEFAULT_POLICY_${companyId}`,
      companyId,
      policyName: 'Standard Enterprise Policy',
      isDefault: true,
      gracePeriodMinutes: 10,
      lateCalculationMode: 'FROM_SHIFT_START',
      lateDeductionThresholdMinutes: 15,
      earlyDepartureGraceMinutes: 10,
      earlyDepartureThresholdMinutes: 15,
      overtimeThresholdMinutes: 30,
      overtimeRoundingRule: 'NEAREST_15',
      maxDailyOvertimeMinutes: 240, // 4 hours
      maxWeeklyOvertimeMinutes: 720, // 12 hours
      maxMonthlyOvertimeMinutes: 2880, // 48 hours
      requireApprovalForOvertime: true,
      autoApproveUnderMinutes: 0,
      includeBreakInWorkedTime: false,
      defaultBreakMinutes: 30,
      allowCrossMidnight: true,
      eligibleForOvertime: true,
      createdAt: now,
      updatedAt: now,
      createdBy: 'SYSTEM',
      updatedBy: 'SYSTEM'
    };
  }

  /**
   * Applies configurable rounding rule to raw minutes
   */
  static applyRounding(minutes: number, rule: OvertimeRoundingRule): number {
    if (minutes <= 0) return 0;
    
    switch (rule) {
      case 'EXACT':
        return minutes;
      case 'NEAREST_5':
        return Math.round(minutes / 5) * 5;
      case 'NEAREST_10':
        return Math.round(minutes / 10) * 10;
      case 'NEAREST_15':
        return Math.round(minutes / 15) * 15;
      case 'NEAREST_30':
        return Math.round(minutes / 30) * 30;
      case 'FLOOR_15':
        return Math.floor(minutes / 15) * 15;
      case 'FLOOR_30':
        return Math.floor(minutes / 30) * 30;
      case 'CEILING_15':
        return Math.ceil(minutes / 15) * 15;
      case 'CEILING_30':
        return Math.ceil(minutes / 30) * 30;
      default:
        return Math.round(minutes / 15) * 15;
    }
  }

  /**
   * Formats minutes into human readable "Xh Ym"
   */
  static formatDuration(minutes: number): string {
    if (minutes === 0) return '0m';
    const h = Math.floor(minutes / 60);
    const m = Math.abs(minutes % 60);
    if (h === 0) return `${m}m`;
    if (m === 0) return `${h}h`;
    return `${h}h ${m}m`;
  }

  /**
   * Evaluates eligibility for overtime based on policy and employee demographics
   */
  static isEmployeeEligibleForOvertime(
    policy: OvertimePolicyRecord,
    employeeCategory?: WorkforceCategory,
    employeeRole?: UserRole,
    departmentId?: string,
    siteId?: string
  ): boolean {
    if (!policy.eligibleForOvertime) return false;

    // Managerial / Top executives are typically exempt from OT
    if (employeeRole && ['SUPER_ADMIN', 'OWNER_PROMOTER', 'DIRECTOR_CEO', 'GENERAL_MANAGER', 'COMPANY_ADMIN'].includes(employeeRole)) {
      return false;
    }

    if (policy.applicableRoles && policy.applicableRoles.length > 0 && employeeRole) {
      if (!policy.applicableRoles.includes(employeeRole)) return false;
    }

    if (policy.applicableWorkforceCategories && policy.applicableWorkforceCategories.length > 0 && employeeCategory) {
      if (!policy.applicableWorkforceCategories.includes(employeeCategory)) return false;
    }

    if (policy.applicableDepartmentIds && policy.applicableDepartmentIds.length > 0 && departmentId) {
      if (!policy.applicableDepartmentIds.includes(departmentId)) return false;
    }

    if (policy.applicableSiteIds && policy.applicableSiteIds.length > 0 && siteId) {
      if (!policy.applicableSiteIds.includes(siteId)) return false;
    }

    return true;
  }

  /**
   * Deterministic core calculation engine for Attendance, Late, Early, Breaks and Overtime
   */
  static calculate(params: {
    workDate: string; // YYYY-MM-DD
    shift?: ShiftRecord;
    checkInIso?: string;
    checkOutIso?: string;
    policy?: OvertimePolicyRecord;
    approvedLeave?: LeaveRequestRecord;
    weeklyCumulativeOT?: number;
    monthlyCumulativeOT?: number;
    employeeCategory?: WorkforceCategory;
    employeeRole?: UserRole;
    departmentId?: string;
    siteId?: string;
  }): AttendanceCalculationResult {
    const {
      workDate,
      shift,
      checkInIso,
      checkOutIso,
      approvedLeave,
      weeklyCumulativeOT = 0,
      monthlyCumulativeOT = 0,
      employeeCategory,
      employeeRole,
      departmentId,
      siteId
    } = params;

    const policy = params.policy || this.getDefaultPolicy(shift?.companyId || 'DEFAULT');
    const exceptions: AttendanceExceptionType[] = [];
    const breakdownSteps: string[] = [];

    let scheduledMinutes = 0;
    let workedMinutes = 0;
    let breakMinutes = shift?.breakDurationMinutes ?? policy.defaultBreakMinutes ?? 0;
    let netWorkedMinutes = 0;
    let lateMinutes = 0;
    let earlyDepartureMinutes = 0;
    let shortfallMinutes = 0;
    let rawOvertimeMinutes = 0;
    let calculatedOvertimeMinutes = 0;
    let approvedOvertimeMinutes = 0;
    let unapprovedOvertimeMinutes = 0;
    let status: AttendanceStatus = 'SCHEDULED';
    let requiresReview = false;

    // 1. LEAVE INTEGRATION
    if (approvedLeave && approvedLeave.status === 'APPROVED') {
      if (approvedLeave.leaveType === 'CASUAL' || approvedLeave.leaveType === 'SICK' || approvedLeave.leaveType === 'EARNED' || approvedLeave.leaveType === 'UNPAID') {
        breakdownSteps.push(`[Leave Policy] Approved ${approvedLeave.leaveType} leave active on ${workDate}.`);
        return {
          attendanceId: `ATT-${workDate}`,
          workDate,
          scheduledMinutes: 0,
          workedMinutes: 0,
          breakMinutes: 0,
          netWorkedMinutes: 0,
          lateMinutes: 0,
          earlyDepartureMinutes: 0,
          shortfallMinutes: 0,
          rawOvertimeMinutes: 0,
          calculatedOvertimeMinutes: 0,
          approvedOvertimeMinutes: 0,
          unapprovedOvertimeMinutes: 0,
          status: 'ON_LEAVE',
          isEligibleForOvertime: false,
          exceptions: [],
          requiresReview: false,
          humanExplanation: `Employee on approved ${approvedLeave.leaveType} leave. Scheduled work waived.`,
          breakdownSteps
        };
      }
    }

    // 2. UNROSTERED / MISSING SHIFT HANDLING
    if (!shift) {
      exceptions.push('UNROSTERED_ATTENDANCE');
      requiresReview = true;
      breakdownSteps.push(`[Shift Warning] No valid shift found for date ${workDate}. Flagged as unrostered.`);

      if (checkInIso && checkOutIso) {
        const checkIn = new Date(checkInIso);
        const checkOut = new Date(checkOutIso);
        if (checkOut > checkIn) {
          workedMinutes = Math.floor((checkOut.getTime() - checkIn.getTime()) / (1000 * 60));
          netWorkedMinutes = Math.max(0, workedMinutes - breakMinutes);
        }
        status = 'PRESENT';
      } else if (checkInIso) {
        status = 'PRESENT';
        exceptions.push('MISSING_CHECK_OUT');
      } else {
        status = 'ABSENT';
      }

      return {
        attendanceId: `ATT-${workDate}`,
        workDate,
        scheduledMinutes: 0,
        workedMinutes,
        breakMinutes,
        netWorkedMinutes,
        lateMinutes: 0,
        earlyDepartureMinutes: 0,
        shortfallMinutes: 0,
        rawOvertimeMinutes: 0,
        calculatedOvertimeMinutes: 0,
        approvedOvertimeMinutes: 0,
        unapprovedOvertimeMinutes: 0,
        status,
        isEligibleForOvertime: false,
        exceptions,
        requiresReview: true,
        humanExplanation: `Unrostered Attendance: Logged ${this.formatDuration(workedMinutes)} without an assigned roster. Requires manager review.`,
        breakdownSteps
      };
    }

    // 3. SHIFT TIMING & CROSS-MIDNIGHT RESOLUTION
    const shiftStart = new Date(`${workDate}T${shift.startTime}:00`);
    let shiftEnd = new Date(`${workDate}T${shift.endTime}:00`);

    const isCrossMidnight = shift.isCrossMidnight || shift.endTime <= shift.startTime;
    if (isCrossMidnight) {
      shiftEnd = new Date(shiftEnd.getTime() + 24 * 60 * 60 * 1000);
      breakdownSteps.push(`[Shift Info] Cross-midnight shift: ${shift.startTime} to ${shift.endTime} (+1 day).`);
    } else {
      breakdownSteps.push(`[Shift Info] Shift: ${shift.startTime} to ${shift.endTime}.`);
    }

    scheduledMinutes = shift.shiftDurationMinutes || Math.floor((shiftEnd.getTime() - shiftStart.getTime()) / (1000 * 60));
    breakdownSteps.push(`[Scheduled] ${scheduledMinutes} min (${this.formatDuration(scheduledMinutes)}), Break: ${breakMinutes} min.`);

    // 4. CHECK-IN ANALYSIS & LATE CALCULATION
    if (!checkInIso) {
      if (checkOutIso) {
        exceptions.push('MISSING_CHECK_IN');
        requiresReview = true;
        breakdownSteps.push(`[Exception] Missing Check-In record. Check-out was recorded.`);
      } else {
        status = 'ABSENT';
        shortfallMinutes = scheduledMinutes;
        breakdownSteps.push(`[Attendance] No punches recorded. Marked as ABSENT.`);
        return {
          attendanceId: `ATT-${workDate}`,
          workDate,
          scheduledMinutes,
          workedMinutes: 0,
          breakMinutes,
          netWorkedMinutes: 0,
          lateMinutes: 0,
          earlyDepartureMinutes: 0,
          shortfallMinutes,
          rawOvertimeMinutes: 0,
          calculatedOvertimeMinutes: 0,
          approvedOvertimeMinutes: 0,
          unapprovedOvertimeMinutes: 0,
          status,
          isEligibleForOvertime: false,
          exceptions,
          requiresReview: false,
          humanExplanation: `Scheduled ${shift.shiftName} (${this.formatDuration(scheduledMinutes)}). No punches found -> ABSENT.`,
          breakdownSteps
        };
      }
    } else {
      const checkIn = new Date(checkInIso);
      const checkInDiff = Math.floor((checkIn.getTime() - shiftStart.getTime()) / (1000 * 60));
      const gracePeriod = shift.gracePeriodMinutes ?? policy.gracePeriodMinutes ?? 10;

      if (checkInDiff > gracePeriod) {
        if (policy.lateCalculationMode === 'FROM_GRACE_END') {
          lateMinutes = checkInDiff - gracePeriod;
          breakdownSteps.push(`[Late] Checked in at ${checkIn.toTimeString().substring(0, 5)} (${checkInDiff}m after start). Grace is ${gracePeriod}m. Late penalty calculated from grace end = ${lateMinutes} min.`);
        } else {
          lateMinutes = checkInDiff;
          breakdownSteps.push(`[Late] Checked in at ${checkIn.toTimeString().substring(0, 5)} (${checkInDiff}m after start). Grace of ${gracePeriod}m exceeded. Full late = ${lateMinutes} min.`);
        }

        if (lateMinutes >= policy.lateDeductionThresholdMinutes) {
          exceptions.push('LATE');
          status = 'LATE';
        } else {
          status = 'PRESENT';
        }
      } else {
        lateMinutes = 0;
        status = 'PRESENT';
        if (checkInDiff > 0) {
          breakdownSteps.push(`[On Time] Checked in at ${checkIn.toTimeString().substring(0, 5)} (+${checkInDiff}m within ${gracePeriod}m grace period).`);
        } else {
          breakdownSteps.push(`[On Time] Checked in at ${checkIn.toTimeString().substring(0, 5)} (${Math.abs(checkInDiff)}m early).`);
        }
      }
    }

    // 5. CHECK-OUT ANALYSIS & EARLY DEPARTURE
    if (checkInIso && !checkOutIso) {
      exceptions.push('MISSING_CHECK_OUT');
      requiresReview = true;
      breakdownSteps.push(`[Exception] Missing Check-Out punch.`);
    } else if (checkInIso && checkOutIso) {
      const checkIn = new Date(checkInIso);
      const checkOut = new Date(checkOutIso);

      if (checkOut <= checkIn) {
        exceptions.push('INVALID_PUNCH_ORDER');
        requiresReview = true;
        breakdownSteps.push(`[Exception] Invalid Punch Order: Check-out time is earlier than or equal to Check-in time.`);
      } else {
        workedMinutes = Math.floor((checkOut.getTime() - checkIn.getTime()) / (1000 * 60));
        
        // Break deduction
        if (!policy.includeBreakInWorkedTime && workedMinutes > breakMinutes) {
          netWorkedMinutes = workedMinutes - breakMinutes;
          breakdownSteps.push(`[Duration] Total elapsed: ${workedMinutes}m, Break deduction: -${breakMinutes}m -> Net Worked: ${netWorkedMinutes}m (${this.formatDuration(netWorkedMinutes)}).`);
        } else {
          netWorkedMinutes = workedMinutes;
          breakdownSteps.push(`[Duration] Total worked: ${workedMinutes}m (${this.formatDuration(workedMinutes)}).`);
        }

        // Early Departure Calculation
        const earlyDiff = Math.floor((shiftEnd.getTime() - checkOut.getTime()) / (1000 * 60));
        const earlyGrace = shift.earlyDepartureThresholdMinutes ?? policy.earlyDepartureGraceMinutes ?? 10;

        if (earlyDiff > earlyGrace) {
          earlyDepartureMinutes = earlyDiff;
          exceptions.push('EARLY_DEPARTURE');
          if (status === 'LATE') {
            exceptions.push('LATE_AND_EARLY');
          } else {
            status = 'EARLY_DEPARTURE';
          }
          breakdownSteps.push(`[Early Departure] Checked out at ${checkOut.toTimeString().substring(0, 5)} (${earlyDiff}m before scheduled shift end ${shift.endTime}). Exceeds ${earlyGrace}m grace.`);
        } else {
          earlyDepartureMinutes = 0;
          breakdownSteps.push(`[Check-Out] Checked out at ${checkOut.toTimeString().substring(0, 5)} (Normal).`);
        }

        // Shortfall Calculation
        if (netWorkedMinutes < scheduledMinutes) {
          shortfallMinutes = scheduledMinutes - netWorkedMinutes;
          if (shortfallMinutes > 30) {
            exceptions.push('SHORTFALL');
            breakdownSteps.push(`[Shortfall] Net worked is ${this.formatDuration(netWorkedMinutes)}, falling short of scheduled by ${this.formatDuration(shortfallMinutes)}.`);
          }
        }
      }
    }

    // 6. OVERTIME CALCULATION & POLICIES
    const isEligible = this.isEmployeeEligibleForOvertime(policy, employeeCategory, employeeRole, departmentId, siteId);

    if (netWorkedMinutes > scheduledMinutes) {
      const rawExcess = netWorkedMinutes - scheduledMinutes;
      breakdownSteps.push(`[Excess Time] Net worked ${netWorkedMinutes}m vs Scheduled ${scheduledMinutes}m = +${rawExcess}m excess.`);

      if (rawExcess >= policy.overtimeThresholdMinutes) {
        rawOvertimeMinutes = rawExcess;
        const rounded = this.applyRounding(rawOvertimeMinutes, policy.overtimeRoundingRule);
        breakdownSteps.push(`[OT Rounding] ${rawOvertimeMinutes}m excess rounded via '${policy.overtimeRoundingRule}' -> ${rounded}m.`);

        if (!isEligible) {
          exceptions.push('INELIGIBLE_OVERTIME');
          calculatedOvertimeMinutes = 0;
          approvedOvertimeMinutes = 0;
          unapprovedOvertimeMinutes = 0;
          breakdownSteps.push(`[OT Ineligible] Employee category/role is not eligible for paid Overtime. Stored excess for audit.`);
        } else {
          // Check Daily Cap
          let capped = rounded;
          if (rounded > policy.maxDailyOvertimeMinutes) {
            capped = policy.maxDailyOvertimeMinutes;
            exceptions.push('MAX_DAILY_OT_EXCEEDED');
            requiresReview = true;
            breakdownSteps.push(`[OT Cap Alert] Calculated ${rounded}m exceeds Max Daily Limit of ${policy.maxDailyOvertimeMinutes}m. Capped at ${capped}m.`);
          }

          // Check Weekly Cap
          if (weeklyCumulativeOT + capped > policy.maxWeeklyOvertimeMinutes) {
            exceptions.push('MAX_WEEKLY_OT_EXCEEDED');
            requiresReview = true;
            breakdownSteps.push(`[OT Cap Alert] Weekly cumulative OT (${weeklyCumulativeOT + capped}m) exceeds weekly cap (${policy.maxWeeklyOvertimeMinutes}m).`);
          }

          // Check Monthly Cap
          if (monthlyCumulativeOT + capped > policy.maxMonthlyOvertimeMinutes) {
            exceptions.push('MAX_MONTHLY_OT_EXCEEDED');
            requiresReview = true;
            breakdownSteps.push(`[OT Cap Alert] Monthly cumulative OT (${monthlyCumulativeOT + capped}m) exceeds monthly cap (${policy.maxMonthlyOvertimeMinutes}m).`);
          }

          calculatedOvertimeMinutes = capped;

          // Approval Requirements
          if (policy.requireApprovalForOvertime) {
            if (policy.autoApproveUnderMinutes && capped <= policy.autoApproveUnderMinutes) {
              approvedOvertimeMinutes = capped;
              unapprovedOvertimeMinutes = 0;
              breakdownSteps.push(`[OT Approval] Auto-approved ${capped}m (under ${policy.autoApproveUnderMinutes}m threshold).`);
            } else {
              unapprovedOvertimeMinutes = capped;
              approvedOvertimeMinutes = 0;
              breakdownSteps.push(`[OT Approval] ${capped}m Overtime created as PENDING manager approval.`);
            }
          } else {
            approvedOvertimeMinutes = capped;
            unapprovedOvertimeMinutes = 0;
            breakdownSteps.push(`[OT Approval] Overtime auto-approved by company policy.`);
          }
        }
      } else {
        breakdownSteps.push(`[OT Threshold] Excess ${rawExcess}m is below Overtime threshold of ${policy.overtimeThresholdMinutes}m -> 0 OT.`);
      }
    }

    // 7. HUMAN-READABLE EXPLANATION COMPILATION
    let humanExplanation = `Shift ${shift.startTime}–${shift.endTime} (${this.formatDuration(scheduledMinutes)}). `;
    if (lateMinutes > 0) humanExplanation += `Late: ${this.formatDuration(lateMinutes)}. `;
    if (earlyDepartureMinutes > 0) humanExplanation += `Early Departure: ${this.formatDuration(earlyDepartureMinutes)}. `;
    humanExplanation += `Worked: ${this.formatDuration(netWorkedMinutes)}. `;
    if (calculatedOvertimeMinutes > 0) {
      humanExplanation += `OT: ${this.formatDuration(calculatedOvertimeMinutes)} (${approvedOvertimeMinutes > 0 ? 'Approved' : 'Pending Approval'}).`;
    } else {
      humanExplanation += `OT: 0m.`;
    }

    return {
      attendanceId: `ATT-${workDate}`,
      workDate,
      scheduledMinutes,
      workedMinutes,
      breakMinutes,
      netWorkedMinutes,
      lateMinutes,
      earlyDepartureMinutes,
      shortfallMinutes,
      rawOvertimeMinutes,
      calculatedOvertimeMinutes,
      approvedOvertimeMinutes,
      unapprovedOvertimeMinutes,
      status,
      isEligibleForOvertime: isEligible,
      exceptions,
      requiresReview,
      humanExplanation,
      breakdownSteps
    };
  }
}
