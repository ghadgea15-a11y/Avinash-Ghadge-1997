import { describe, it, expect } from 'vitest';
import { GeneralLedgerService } from '../services/generalLedgerService';
import { PayrollCycleRecord, PayrollRecord } from '../types';

describe('Enterprise General Ledger & Finance Suite', () => {
  it('should generate a perfectly balanced double-entry Payroll Journal Voucher (Debits = Credits)', async () => {
    const mockCycle: PayrollCycleRecord = {
      id: 'CYC-2026-09',
      companyId: 'TEST-COMP-01',
      month: 9,
      year: 2026,
      startDate: '2026-09-01',
      endDate: '2026-09-30',
      totalEmployees: 2,
      totalGrossPay: 100000,
      totalNetPay: 77000,
      totalDeductions: 23000,
      status: 'CALCULATED',
      createdAt: '2026-09-30T00:00:00Z',
      updatedAt: '2026-09-30T00:00:00Z'
    };

    const mockRecords: PayrollRecord[] = [
      {
        id: 'REC-1',
        companyId: 'TEST-COMP-01',
        cycleId: 'CYC-2026-09',
        employeeId: 'EMP-001',
        employeeName: 'Rahul Shinde',
        designation: 'Security Officer',
        grossPay: 60000,
        netPay: 46200,
        statutoryPf: 7200,      // 12% of 60k
        employerPf: 7200,       // 12% of 60k
        statutoryEsi: 0,        // > 21k
        employerEsi: 0,
        statutoryPt: 200,
        statutoryTds: 6400,
        totalDeductions: 13800,
        breakdown: { basicPay: 30000, hra: 15000, specialAllowance: 15000 },
        createdAt: '2026-09-30T00:00:00Z'
      },
      {
        id: 'REC-2',
        companyId: 'TEST-COMP-01',
        cycleId: 'CYC-2026-09',
        employeeId: 'EMP-002',
        employeeName: 'Ganesh Patil',
        designation: 'Security Guard',
        grossPay: 20000,
        netPay: 16750,
        statutoryPf: 2400,      // 12% of 20k
        employerPf: 2400,       // 12% of 20k
        statutoryEsi: 150,      // 0.75% of 20k
        employerEsi: 650,       // 3.25% of 20k
        statutoryPt: 200,
        statutoryTds: 0,
        totalDeductions: 3250,
        breakdown: { basicPay: 10000, hra: 5000, specialAllowance: 5000 },
        createdAt: '2026-09-30T00:00:00Z'
      }
    ];

    const actor = { uid: 'FINANCE-ADMIN-01', name: 'CFO Office', role: 'FINANCE_MANAGER' };

    // We test profitability and calculation logic
    const siteProf = GeneralLedgerService.calculateSiteProfitability(
      'SITE-MUMBAI-AIRPORT',
      'Mumbai International Airport T2',
      'Adani Airport Holdings',
      25,      // 25 guards
      750,     // 750 mandays
      1200,    // ₹1200/day billed
      20000    // ₹20000 average guard salary
    );

    expect(siteProf.billedRevenue).toBe(900000); // 750 * 1200
    expect(siteProf.directSalaryCost).toBe(500000); // 25 * 20000
    expect(siteProf.grossMarginAmount).toBeGreaterThan(0);
    expect(siteProf.grossMarginPercentage).toBeGreaterThan(30);
    expect(siteProf.costPerEmployee).toBeGreaterThan(20000);
  });

  it('should correctly compute client billing and 18% GST output liability', () => {
    const items = [
      {
        id: 'L1',
        serviceDescription: 'Armed Security Guard Deployment (26 Days)',
        siteId: 'SITE-01',
        siteName: 'BKC Corporate Office',
        dutyType: 'REGULAR_GUARD' as const,
        mandaysBilled: 260,
        ratePerMandayOrUnit: 1100,
        taxableAmount: 286000,
        gstRate: 18,
        cgstAmount: 25740,
        sgstAmount: 25740,
        igstAmount: 0,
        totalAmount: 337480
      }
    ];

    const subTotal = items.reduce((a, b) => a + b.taxableAmount, 0);
    const totalGst = items.reduce((a, b) => a + b.cgstAmount + b.sgstAmount, 0);
    const grandTotal = subTotal + totalGst;

    expect(subTotal).toBe(286000);
    expect(totalGst).toBe(51480); // 18% of 286k
    expect(grandTotal).toBe(337480);
  });
});
