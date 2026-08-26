export class PayrollEngine {
  static calculate(month: number, year: number, emp: any, profile: any, struct: any, configs: any, leaves: any, attendances: any, advance: number) {
    return {
      netPay: 0,
      grossPay: 0,
      deductions: { pf: 0, esic: 0, pt: 0, tds: 0, advanceDeduction: 0, lopDeduction: 0 },
      allowances: 0,
      basic: 0,
      errors: [],
      payableDays: 0,
      lopDays: 0,
      earnings: {
        basic: 0,
        hra: 0,
        da: 0,
        conveyance: 0,
        medical: 0,
        specialAllowance: 0,
        otherAllowances: 0,
        overtimePay: 0
      },
      totalGross: 0,
      totalDeductions: 0
    };
  }
}
