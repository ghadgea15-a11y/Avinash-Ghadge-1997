import { ExpenseClaimRecord } from '../types/expense';

export interface EmployeeReimbursementItem {
  claimId: string;
  claimTitle: string;
  amount: number;
  approvedDate?: string;
  approvedBy?: string;
  costCenterId?: string;
  costCenterCode?: string;
  categorySummary: Record<string, number>;
}

export interface EmployeeReimbursementPayload {
  employeeId: string;
  employeeName: string;
  totalReimbursementAmount: number;
  claimCount: number;
  claims: EmployeeReimbursementItem[];
}

export interface PayrollReimbursementBatchPayload {
  companyId: string;
  payrollCycleId: string; // e.g. 'CYC-2026-09'
  month: number;
  year: number;
  generatedAt: string;
  totalReimbursementAmount: number;
  totalEmployeesWithClaims: number;
  totalClaimsCount: number;
  employeePayloads: Record<string, EmployeeReimbursementPayload>; // keyed by employeeId
}

export class ReimbursementPayloadBuilder {
  /**
   * Filters approved and undisbursed claims for a payroll cycle,
   * or claims already attached to this specific cycle.
   * STRICT READ-ONLY BOUNDARY: This function does not mutate claim or payroll records.
   */
  static buildBatchPayload(
    companyId: string,
    payrollCycleId: string,
    month: number,
    year: number,
    allExpenseClaims: ExpenseClaimRecord[]
  ): PayrollReimbursementBatchPayload {
    // Eligible claims: status is APPROVED and not yet tied to a cycle, or already tied to this cycle
    const eligibleClaims = (allExpenseClaims || []).filter(claim => {
      if (claim.companyId && claim.companyId !== companyId) return false;
      const isApprovedUndisbursed = claim.status === 'APPROVED' && (!claim.payrollMonthYear || claim.payrollMonthYear === payrollCycleId);
      const isPaidInThisCycle = claim.status === 'PAID' && claim.payrollMonthYear === payrollCycleId;
      return isApprovedUndisbursed || isPaidInThisCycle;
    });

    const employeeMap: Record<string, EmployeeReimbursementPayload> = {};
    let totalBatchAmount = 0;
    let totalClaimsCount = 0;

    for (const claim of eligibleClaims) {
      const empId = claim.employeeId;
      if (!empId) continue;

      if (!employeeMap[empId]) {
        employeeMap[empId] = {
          employeeId: empId,
          employeeName: claim.employeeName || 'Unknown Employee',
          totalReimbursementAmount: 0,
          claimCount: 0,
          claims: []
        };
      }

      const claimAmount = Math.round(Number(claim.totalAmount) || 0);
      const categorySummary: Record<string, number> = {};
      
      (claim.items || []).forEach(it => {
        const cat = it.category || 'MISCELLANEOUS';
        categorySummary[cat] = (categorySummary[cat] || 0) + (Number(it.amount) || 0);
      });

      employeeMap[empId].claims.push({
        claimId: claim.id,
        claimTitle: claim.title || 'Expense Reimbursement',
        amount: claimAmount,
        approvedDate: claim.approvedDate,
        approvedBy: claim.approvedBy,
        costCenterId: claim.costCenterId,
        costCenterCode: claim.costCenterCode,
        categorySummary
      });

      employeeMap[empId].totalReimbursementAmount += claimAmount;
      employeeMap[empId].claimCount += 1;

      totalBatchAmount += claimAmount;
      totalClaimsCount += 1;
    }

    return {
      companyId,
      payrollCycleId,
      month,
      year,
      generatedAt: new Date().toISOString(),
      totalReimbursementAmount: Math.round(totalBatchAmount),
      totalEmployeesWithClaims: Object.keys(employeeMap).length,
      totalClaimsCount,
      employeePayloads: employeeMap
    };
  }

  /**
   * Helper to get total reimbursement amount for a specific employee
   */
  static getEmployeeReimbursementTotal(
    payload: PayrollReimbursementBatchPayload,
    employeeId: string
  ): number {
    return payload.employeePayloads[employeeId]?.totalReimbursementAmount || 0;
  }
}
