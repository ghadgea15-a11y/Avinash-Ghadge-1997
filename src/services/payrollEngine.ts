import { 
  EmployeeRecord, 
  EmployeeSalaryProfileRecord, 
  SalaryStructureRecord, 
  StatutoryConfigRecord, 
  LeaveRequestRecord, 
  AttendanceRecord 
} from '../types';

export interface PayrollCalculationResult {
  payableDays: number;
  lopDays: number;
  earnings: {
    basic: number;
    hra: number;
    da: number;
    conveyance: number;
    medical: number;
    specialAllowance: number;
    overtimePay: number;
    bonus: number;
    totalGross: number;
  };
  deductions: {
    pf: number;
    esic: number;
    pt: number;
    tds: number;
    advanceDeduction: number;
    lopDeduction: number;
    otherDeductions: number;
    totalDeductions: number;
  };
  totalGross: number;
  totalDeductions: number;
  netPay: number;
  errors: string[];
}

export class PayrollEngine {
  /**
   * Authoritative calculation engine for monthly salary computation
   */
  static calculate(
    month: number,
    year: number,
    employee: EmployeeRecord,
    profile: EmployeeSalaryProfileRecord,
    structure: SalaryStructureRecord,
    statutoryConfigs: StatutoryConfigRecord[] = [],
    leaves: LeaveRequestRecord[] = [],
    attendances: AttendanceRecord[] = [],
    advanceDeduction: number = 0
  ): PayrollCalculationResult {
    const daysInMonth = new Date(year, month, 0).getDate();
    const errors: string[] = [];

    // 1. Calculate LOP (Loss of Pay) / Unpaid Leaves
    const empLeaves = leaves.filter(l => 
      l.employeeId === employee.id && 
      (l.status === 'APPROVED' || (l as any).status === 'ACCEPTED')
    );
    
    let unpaidLeaveDays = 0;
    empLeaves.forEach(l => {
      if (l.leaveType === 'UNPAID') {
        unpaidLeaveDays += l.daysCount || 0;
      }
    });

    // 2. Attendance aggregation (worked days, OT hours)
    let presentDays = 0;
    let otHours = 0;
    attendances.forEach(att => {
      if (att.status === 'PRESENT') {
        presentDays += 1;
      } else if (att.status === 'HALF_DAY') {
        presentDays += 0.5;
      }
      if (att.approvedOvertimeMinutes && att.approvedOvertimeMinutes > 0) {
        otHours += att.approvedOvertimeMinutes / 60;
      }
    });

    // If attendance records exist for the employee, use them; otherwise default to daysInMonth minus unpaid leaves
    let payableDays = daysInMonth - unpaidLeaveDays;
    if (attendances.length > 0) {
      payableDays = Math.min(daysInMonth, Math.max(0, presentDays));
    }
    const lopDays = Math.max(0, daysInMonth - payableDays);

    const baseMonthly = profile?.baseMonthlySalary || (profile?.monthlyCtc ? profile.monthlyCtc * 0.8 : 18000) || 18000;
    const prorateFactor = daysInMonth > 0 ? (payableDays / daysInMonth) : 1;

    // Component percentages from structure
    const basicPct = (structure.basicPercentage || 50) / 100;
    const hraPct = (structure.hraPercentage || 20) / 100;
    const daPct = (structure.daPercentage || 15) / 100;

    const earnedBasic = Math.round(baseMonthly * basicPct * prorateFactor);
    const earnedHra = Math.round(baseMonthly * hraPct * prorateFactor);
    const earnedDa = Math.round(baseMonthly * daPct * prorateFactor);
    const earnedConveyance = Math.round((structure.conveyanceAllowance || 0) * prorateFactor);
    const earnedMedical = Math.round((structure.medicalAllowance || 0) * prorateFactor);
    const earnedSpecial = Math.round((structure.specialAllowance || 0) * prorateFactor);

    // Overtime pay rate: (Basic + DA) / (daysInMonth * 8) * 2 * otHours
    const hourlyRate = (earnedBasic + earnedDa) / (daysInMonth * 8 || 240);
    const overtimePay = Math.round(hourlyRate * 2 * otHours);

    const totalGross = earnedBasic + earnedHra + earnedDa + earnedConveyance + earnedMedical + earnedSpecial + overtimePay;

    // Deductions
    // Provident Fund (PF): 12% of (Basic + DA), statutory cap at ₹15,000 base
    let pf = 0;
    if (structure.pfApplicable !== false) {
      const pfWage = earnedBasic + earnedDa;
      pf = Math.round(Math.min(pfWage, 15000) * 0.12);
    }

    // ESIC: 0.75% of Gross if gross <= 21,000
    let esic = 0;
    if (structure.esicApplicable !== false && baseMonthly <= 21000) {
      esic = Math.round(totalGross * 0.0075);
    }

    // Professional Tax (PT): standard Maharashtra/National slab
    let pt = 0;
    if (structure.ptApplicable !== false) {
      if (totalGross > 10000) {
        pt = (month === 2) ? 300 : 200; // February exception in Maharashtra
      } else if (totalGross > 7500) {
        pt = 175;
      }
    }

    // TDS (Tax Deducted at Source)
    let tds = 0;
    if (totalGross * 12 > 700000) {
      tds = Math.round((totalGross * 12 - 700000) * 0.05 / 12);
    }

    const lopDeduction = Math.round(baseMonthly * (lopDays / daysInMonth));
    const totalDeductions = pf + esic + pt + tds + (advanceDeduction || 0);
    const netPay = Math.max(0, totalGross - totalDeductions);

    return {
      payableDays,
      lopDays,
      earnings: {
        basic: earnedBasic,
        hra: earnedHra,
        da: earnedDa,
        conveyance: earnedConveyance,
        medical: earnedMedical,
        specialAllowance: earnedSpecial,
        overtimePay,
        bonus: 0,
        totalGross
      },
      deductions: {
        pf,
        esic,
        pt,
        tds,
        advanceDeduction: advanceDeduction || 0,
        lopDeduction,
        otherDeductions: 0,
        totalDeductions
      },
      totalGross,
      totalDeductions,
      netPay,
      errors
    };
  }
}
