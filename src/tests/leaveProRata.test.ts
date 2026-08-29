import { describe, it, expect } from 'vitest';
import { LeaveService } from '../services/leaveService';
import { LeavePolicyRecord } from '../types';

describe('Leave Pro-Rata Accrual & Ledger Engine', () => {
  const basePolicy: LeavePolicyRecord = {
    id: 'POL_CL',
    companyId: 'COMP_TEST',
    leaveCode: 'CL',
    leaveName: 'Casual Leave',
    description: 'Casual Leave',
    isPaid: true,
    annualEntitlement: 12,
    accrualType: 'ANNUAL',
    accrualFrequency: 'YEARLY',
    proRataForMidYearJoiners: true,
    proRataMethod: 'MONTHLY_EXACT',
    roundingRule: 'NEAREST_HALF_DAY',
    carryForwardAllowed: false,
    maxCarryForward: 0,
    encashmentAllowed: false,
    minNoticeDays: 1,
    maxConsecutiveDays: 3,
    halfDayAllowed: true,
    negativeBalanceAllowed: false,
    requiresDocument: false,
    requiresApproval: true,
    status: 'ACTIVE',
    createdAt: Date.now(),
    updatedAt: Date.now()
  };

  it('calculates full entitlement for an employee joining on Jan 1st', () => {
    const result = LeaveService.calculateProRataEntitlement(
      12,
      '2026-01-01',
      2026,
      { calculationMethod: 'MONTHLY_EXACT', roundingRule: 'NEAREST_HALF_DAY' }
    );

    expect(result).toBe(12);
  });

  it('calculates exact 6.0 days pro-rata for mid-year joiner (July 1st)', () => {
    const result = LeaveService.calculateProRataEntitlement(
      12,
      '2026-07-01',
      2026,
      { calculationMethod: 'MONTHLY_EXACT', roundingRule: 'NEAREST_HALF_DAY' }
    );

    // July 1 to Dec 31 = 6 months out of 12 = 6.0 days
    expect(result).toBe(6.0);
  });

  it('calculates pro-rata with nearest 0.5 day rounding for mid-month joiner (April 16th)', () => {
    const result = LeaveService.calculateProRataEntitlement(
      18,
      '2026-04-16',
      2026,
      { calculationMethod: 'MONTHLY_EXACT', roundingRule: 'NEAREST_HALF_DAY' }
    );

    // April 16 to Dec 31: 8 full months (May-Dec) + 15/30 in April = 8.5 months / 12 * 18 = 12.75 -> rounded to 13.0
    expect(result).toBe(13.0);
  });

  it('creates initial balance record with pro-rata applied for new joiner', () => {
    const initialBal = LeaveService.createInitialBalance(
      'COMP_TEST',
      'EMP_101',
      'Arun Kumar',
      2026,
      [basePolicy],
      '2026-07-01'
    );

    expect(initialBal.companyId).toBe('COMP_TEST');
    expect(initialBal.employeeId).toBe('EMP_101');
    expect(initialBal.employeeName).toBe('Arun Kumar');
    expect(initialBal.balances.length).toBe(1);
    expect(initialBal.balances[0].isProRataApplied).toBe(true);
    expect(initialBal.balances[0].joiningDate).toBe('2026-07-01');
    expect(initialBal.balances[0].openingBalance).toBe(6.0);
    expect(initialBal.balances[0].proRataFactor).toBe(0.5);
    expect(LeaveService.calculateAvailableBalance(initialBal.balances[0])).toBe(6.0);
  });

  it('generates auditable ledger entries for initial allocation and debits', () => {
    const initialEntries = LeaveService.generateInitialLedgerEntries(
      'COMP_TEST',
      'EMP_101',
      'Arun Kumar',
      2026,
      [basePolicy],
      '2026-07-01'
    );

    expect(initialEntries.length).toBe(1);
    expect(initialEntries[0].transactionType).toBe('PRO_RATA_OPENING');
    expect(initialEntries[0].creditDays).toBe(6.0);
    expect(initialEntries[0].balanceAfter).toBe(6.0);

    const debitEntry = LeaveService.generateDebitLedgerEntry(
      'COMP_TEST',
      'EMP_101',
      'Arun Kumar',
      'CL',
      'Casual Leave',
      2026,
      2.0,
      6.0,
      'REQ_123',
      'HR_MANAGER'
    );

    expect(debitEntry.transactionType).toBe('LEAVE_DEBIT');
    expect(debitEntry.debitDays).toBe(2.0);
    expect(debitEntry.balanceAfter).toBe(4.0);
  });
});
