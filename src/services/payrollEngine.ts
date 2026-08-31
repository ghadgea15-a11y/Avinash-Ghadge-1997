import { 
  EmployeeRecord, 
  SalaryProfileRecord, 
  SalaryStructureRecord, 
  LeaveRequestRecord, 
  AttendanceRecord,
  PayrollCalculation,
  StatutoryConfigRecord
} from '../types';
import { isWeekend } from 'date-fns';
import { StatutoryRulesService, DEFAULT_STATE_STATUTORY_CONFIGS } from './statutoryRulesService';

export class PayrollEngine {
  static calculate(
    month: number, 
    year: number, 
    emp: EmployeeRecord, 
    profile: SalaryProfileRecord, 
    struct: SalaryStructureRecord, 
    holidays: any[], 
    leaves: LeaveRequestRecord[], 
    attendances: AttendanceRecord[], 
    advance: number = 0,
    statutoryConfig?: StatutoryConfigRecord
  ): PayrollCalculation {
    
    const daysInMonth = new Date(year, month, 0).getDate();
    let payableDays = daysInMonth;
    let lopDays = 0;
    let approvedOvertimeMinutes = 0;

    // Process attendances and leaves for LOP
    for (let d = 1; d <= daysInMonth; d++) {
      const dateObj = new Date(year, month - 1, d);
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const isDayOff = isWeekend(dateObj); 
      
      // Filter holidays applicable to this employee's region
      const isHoliday = holidays.some(h => {
        if (h.date !== dateStr) return false;
        if (!h.applicableRegions || h.applicableRegions.length === 0) return true; // Global holiday
        return emp.assignedRegionId && h.applicableRegions.includes(emp.assignedRegionId);
      });
      
      const att = attendances.find(a => a.attendanceDate === dateStr || (a as any).date === dateStr);
      const leave = leaves.find(l => l.startDate <= dateStr && l.endDate >= dateStr);

      if (att && att.approvedOvertimeMinutes) {
        approvedOvertimeMinutes += att.approvedOvertimeMinutes;
      }

      if (!att && !isDayOff && !isHoliday) {
        // Did they have approved leave?
        if (leave && leave.status === 'APPROVED') {
          // Paid leave
        } else {
          lopDays += 1;
        }
      } else if (att && (att.status === 'ABSENT' || att.status === 'HALFDAY')) {
         // Even if an attendance record says ABSENT, if it's a Weekend or Holiday, 
         // we shouldn't penalize unless it's a specific shift requirement
         if (isDayOff || isHoliday) {
           continue; 
         }

         if (att.status === 'ABSENT' && (!leave || leave.status !== 'APPROVED')) {
           lopDays += 1;
         } else if (att.status === 'HALFDAY' && (!leave || leave.status !== 'APPROVED')) {
           lopDays += 0.5;
         }
      }
    }

    payableDays = Math.max(0, daysInMonth - lopDays);

    const baseSalary = profile.baseMonthlySalary || 0;
    
    // Pro-rate base salary based on payable days
    const proRatedSalary = (baseSalary / daysInMonth) * payableDays;
    const lopDeduction = baseSalary - proRatedSalary;

    const basicPercentage = struct.basicPercentage || 50;
    const hraPercentage = struct.hraPercentage || 40;

    const basic = proRatedSalary * (basicPercentage / 100);
    const hra = basic * (hraPercentage / 100);
    const otherAllowances = Math.max(0, proRatedSalary - basic - hra);

    // Overtime - Enterprise usually pays 1.5x or 2.0x
    const hourlyRate = baseSalary / (daysInMonth * 8); 
    const otMultiplier = 1.5; 
    const overtimePay = (approvedOvertimeMinutes / 60) * hourlyRate * otMultiplier;

    const totalGross = proRatedSalary + overtimePay;

    // Resolve or fallback statutory configuration dynamically
    const stateKey = (emp as any).state || emp.assignedRegionId || 'DEFAULT';
    const activeStatutory = statutoryConfig || DEFAULT_STATE_STATUTORY_CONFIGS[StatutoryRulesService.normalizeStateKey(stateKey)] || DEFAULT_STATE_STATUTORY_CONFIGS.DEFAULT;

    // Dynamic Deductions
    const epsCheck = StatutoryRulesService.checkEpsSeniorExemption(emp.dateOfBirth, new Date(year, month - 1, 1));
    const pf = StatutoryRulesService.calculatePf(basic, activeStatutory);
    const esic = StatutoryRulesService.calculateEsi(totalGross, activeStatutory);
    const pt = StatutoryRulesService.calculatePt(totalGross, activeStatutory, month, (emp as any).gender || 'ALL');
    const tds = StatutoryRulesService.calculateTds(totalGross, activeStatutory);
    
    const totalDeductions = pf + esic + pt + tds + advance;
    const netPay = Math.max(0, totalGross - totalDeductions);

    return {
      payableDays,
      lopDays,
      totalGross: Math.round(totalGross),
      totalDeductions: Math.round(totalDeductions),
      netPay: Math.round(netPay),
      isEpsExempt: epsCheck.isExempt,
      epsExemptionFlag: epsCheck.isExempt ? epsCheck.note : undefined,
      earnings: {
        basic: Math.round(basic),
        hra: Math.round(hra),
        overtimePay: Math.round(overtimePay),
        otherAllowances: Math.round(otherAllowances),
        totalGross: Math.round(totalGross)
      },
      deductions: {
        pf: Math.round(pf),
        esic: Math.round(esic),
        pt: Math.round(pt),
        tds: Math.round(tds),
        lopDeduction: Math.round(lopDeduction),
        advanceDeduction: Math.round(advance),
        epsExemptionApplied: epsCheck.isExempt,
        epsExemptionNote: epsCheck.note
      }
    };
  }
}
