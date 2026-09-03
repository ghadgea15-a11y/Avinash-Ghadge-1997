import { describe, it, expect } from 'vitest';
import { ReimbursementPayloadBuilder } from '../services/reimbursementPayloadBuilder';
import { ExpenseClaimRecord } from '../types/expense';

describe('Reimbursement-to-Payroll Handoff (Financial Integrity & Read-Only Boundary)', () => {
  const companyId = 'COMP-CORP-01';
  const cycleId = 'CYC-2026-09';
  const month = 9;
  const year = 2026;

  const mockClaims: ExpenseClaimRecord[] = [
    {
      id: 'EXP-101',
      companyId,
      employeeId: 'EMP-001',
      employeeName: 'Rajesh Kumar',
      title: 'Site Visit Travel & Fuel',
      totalAmount: 3500,
      totalTaxAmount: 350,
      currency: 'INR',
      status: 'APPROVED',
      submissionDate: '2026-09-10',
      approvedDate: '2026-09-12',
      approvedBy: 'Finance Manager',
      costCenterId: 'CC-01',
      costCenterCode: 'CC-OPS-01',
      items: [
        {
          id: 'item-1',
          category: 'FUEL_MILEAGE',
          amount: 2000,
          currency: 'INR',
          expenseDate: '2026-09-10',
          merchantName: 'Indian Oil',
          ocrExtracted: true,
          description: 'Fuel for patrol vehicle',
          isPolicyViolated: false
        },
        {
          id: 'item-2',
          category: 'MEALS_FOOD',
          amount: 1500,
          currency: 'INR',
          expenseDate: '2026-09-10',
          merchantName: 'Highway Treat',
          ocrExtracted: true,
          description: 'Supervisor meal allowance',
          isPolicyViolated: false
        }
      ],
      createdAt: '2026-09-10T08:00:00Z',
      updatedAt: '2026-09-12T10:00:00Z'
    },
    {
      id: 'EXP-102',
      companyId,
      employeeId: 'EMP-001',
      employeeName: 'Rajesh Kumar',
      title: 'Equipment Maintenance Kit',
      totalAmount: 1500,
      totalTaxAmount: 150,
      currency: 'INR',
      status: 'APPROVED',
      submissionDate: '2026-09-15',
      approvedDate: '2026-09-16',
      approvedBy: 'Operations Lead',
      items: [
        {
          id: 'item-3',
          category: 'EQUIPMENT_REPAIR',
          amount: 1500,
          currency: 'INR',
          expenseDate: '2026-09-15',
          merchantName: 'Hardware Depot',
          ocrExtracted: true,
          description: 'Radio antenna replacement',
          isPolicyViolated: false
        }
      ],
      createdAt: '2026-09-15T09:00:00Z',
      updatedAt: '2026-09-16T11:00:00Z'
    },
    {
      id: 'EXP-103',
      companyId,
      employeeId: 'EMP-002',
      employeeName: 'Sneha Patel',
      title: 'Client Meeting Lodging',
      totalAmount: 4200,
      totalTaxAmount: 400,
      currency: 'INR',
      status: 'APPROVED',
      submissionDate: '2026-09-20',
      approvedDate: '2026-09-22',
      approvedBy: 'Finance Manager',
      items: [
        {
          id: 'item-4',
          category: 'LODGING',
          amount: 4200,
          currency: 'INR',
          expenseDate: '2026-09-20',
          merchantName: 'Ginger Hotel',
          ocrExtracted: true,
          description: '1 Night stay for site audit',
          isPolicyViolated: false
        }
      ],
      createdAt: '2026-09-20T14:00:00Z',
      updatedAt: '2026-09-22T16:00:00Z'
    },
    {
      id: 'EXP-104',
      companyId,
      employeeId: 'EMP-003',
      employeeName: 'Amit Shah',
      title: 'Unapproved Claim Draft',
      totalAmount: 8000,
      totalTaxAmount: 800,
      currency: 'INR',
      status: 'SUBMITTED', // Under review, must NOT be included in payroll
      submissionDate: '2026-09-25',
      items: [
        {
          id: 'item-5',
          category: 'TRAVEL_FARE',
          amount: 8000,
          currency: 'INR',
          expenseDate: '2026-09-25',
          merchantName: 'Air India',
          ocrExtracted: true,
          description: 'Flight tickets',
          isPolicyViolated: false
        }
      ],
      createdAt: '2026-09-25T10:00:00Z',
      updatedAt: '2026-09-25T10:00:00Z'
    },
    {
      id: 'EXP-105',
      companyId,
      employeeId: 'EMP-004',
      employeeName: 'Vikram Singh',
      title: 'Previous Month Paid Claim',
      totalAmount: 2500,
      totalTaxAmount: 200,
      currency: 'INR',
      status: 'PAID',
      payrollMonthYear: 'CYC-2026-08', // Paid in previous month, must NOT be double-counted in 2026-09
      submissionDate: '2026-08-15',
      approvedDate: '2026-08-16',
      items: [],
      createdAt: '2026-08-15T10:00:00Z',
      updatedAt: '2026-08-16T10:00:00Z'
    },
    {
      id: 'EXP-106',
      companyId: 'COMP-OTHER-02', // Different company tenant, must NOT leak
      employeeId: 'EMP-999',
      employeeName: 'Other Tenant Employee',
      title: 'Cross Tenant Claim',
      totalAmount: 10000,
      totalTaxAmount: 1000,
      currency: 'INR',
      status: 'APPROVED',
      submissionDate: '2026-09-10',
      items: [],
      createdAt: '2026-09-10T10:00:00Z',
      updatedAt: '2026-09-10T10:00:00Z'
    }
  ];

  it('1. builds structured batch payload filtering only eligible approved undisbursed claims', () => {
    const payload = ReimbursementPayloadBuilder.buildBatchPayload(companyId, cycleId, month, year, mockClaims);

    expect(payload.companyId).toBe(companyId);
    expect(payload.payrollCycleId).toBe(cycleId);
    expect(payload.month).toBe(9);
    expect(payload.year).toBe(2026);
    expect(payload.totalEmployeesWithClaims).toBe(2); // EMP-001 and EMP-002
    expect(payload.totalClaimsCount).toBe(3); // EXP-101, EXP-102, EXP-103
    expect(payload.totalReimbursementAmount).toBe(3500 + 1500 + 4200); // 9200
  });

  it('2. aggregates multiple claims per employee with category breakdown', () => {
    const payload = ReimbursementPayloadBuilder.buildBatchPayload(companyId, cycleId, month, year, mockClaims);

    const emp1 = payload.employeePayloads['EMP-001'];
    expect(emp1).toBeDefined();
    expect(emp1.employeeName).toBe('Rajesh Kumar');
    expect(emp1.claimCount).toBe(2);
    expect(emp1.totalReimbursementAmount).toBe(5000);
    expect(emp1.claims).toHaveLength(2);
    expect(emp1.claims[0].categorySummary).toEqual({
      FUEL_MILEAGE: 2000,
      MEALS_FOOD: 1500
    });
    expect(emp1.claims[1].categorySummary).toEqual({
      EQUIPMENT_REPAIR: 1500
    });

    const emp2 = payload.employeePayloads['EMP-002'];
    expect(emp2).toBeDefined();
    expect(emp2.totalReimbursementAmount).toBe(4200);
  });

  it('3. enforces strict isolation by excluding unapproved claims, previous cycle payouts, and cross-tenant records', () => {
    const payload = ReimbursementPayloadBuilder.buildBatchPayload(companyId, cycleId, month, year, mockClaims);

    expect(payload.employeePayloads['EMP-003']).toBeUndefined(); // SUBMITTED claim excluded
    expect(payload.employeePayloads['EMP-004']).toBeUndefined(); // Prior cycle PAID claim excluded
    expect(payload.employeePayloads['EMP-999']).toBeUndefined(); // Cross-tenant claim excluded
  });

  it('4. guarantees read-only boundary by never mutating input claim objects', () => {
    const originalClone = JSON.parse(JSON.stringify(mockClaims));
    ReimbursementPayloadBuilder.buildBatchPayload(companyId, cycleId, month, year, mockClaims);

    expect(mockClaims).toEqual(originalClone);
  });
});
