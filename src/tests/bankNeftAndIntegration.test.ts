import { describe, it, expect, vi, beforeEach } from 'vitest';
import { IntegrationService } from '../services/integrationService';

// Mock firestore client functions
const mockDocs: Record<string, any[]> = {};

vi.mock('../firebase', () => {
  return {
    db: {}
  };
});

vi.mock('firebase/firestore', async (importOriginal) => {
  return {
    initializeFirestore: vi.fn(),
    persistentLocalCache: vi.fn(),
    persistentMultipleTabManager: vi.fn(),
    collection: vi.fn((_db, ...pathSegments) => pathSegments.join('/')),
    doc: vi.fn((_db, ...pathSegments) => pathSegments.join('/')),
    getDocs: vi.fn(async (queryOrCol) => {
      const path = typeof queryOrCol === 'string' ? queryOrCol : (queryOrCol?.path || '');
      let docs = mockDocs[path] || [];
      if (queryOrCol?.filters && Array.isArray(queryOrCol.filters)) {
        for (const filter of queryOrCol.filters) {
          if (filter.op === 'in') {
            docs = docs.filter(d => filter.val.includes(d[filter.field]));
          } else if (filter.op === '==') {
            docs = docs.filter(d => d[filter.field] === filter.val);
          }
        }
      }
      return {
        empty: docs.length === 0,
        docs: docs.map(d => ({
          id: d.id,
          data: () => d
        }))
      };
    }),
    getDoc: vi.fn(async (docPath) => {
      const parts = docPath.split('/');
      const colPath = parts.slice(0, -1).join('/');
      const docId = parts[parts.length - 1];
      const found = (mockDocs[colPath] || []).find(d => d.id === docId);
      return {
        exists: () => !!found,
        id: docId,
        data: () => found
      };
    }),
    query: vi.fn((col, ...filters) => ({ path: typeof col === 'string' ? col : col?.path, filters: filters.filter(Boolean) })),
    where: vi.fn((field, op, val) => ({ field, op, val })),
    orderBy: vi.fn(),
    limit: vi.fn(),
    setDoc: vi.fn(),
    addDoc: vi.fn(),
    updateDoc: vi.fn(),
    deleteDoc: vi.fn(),
    serverTimestamp: () => new Date().toISOString()
  };
});

describe('Enterprise Integration — Multi-Bank NEFT & ERP Export Engine', () => {
  const companyId = 'COMP-CORP-01';

  beforeEach(() => {
    for (const key in mockDocs) {
      delete mockDocs[key];
    }
  });

  describe('1. Payroll Cycle Retrieval', () => {
    it('retrieves and filters approved/locked/disbursed payroll cycles', async () => {
      mockDocs[`companies/${companyId}/payrollCycles`] = [
        { id: 'CYC-2026-08', monthYear: '2026-08', status: 'APPROVED', totalNetPay: 450000, totalEmployees: 10 },
        { id: 'CYC-2026-07', monthYear: '2026-07', status: 'DISBURSED', totalNetPay: 440000, totalEmployees: 10 },
        { id: 'CYC-2026-09', monthYear: '2026-09', status: 'DRAFT', totalNetPay: 460000, totalEmployees: 10 }
      ];

      const cycles = await IntegrationService.getApprovedPayrollCycles(companyId);
      expect(cycles).toHaveLength(2);
      expect(cycles.map(c => c.monthYear)).toEqual(['2026-08', '2026-07']);
    });
  });

  describe('2. Multi-Bank NEFT CSV Formatting & Financial Reconciliation', () => {
    beforeEach(() => {
      mockDocs[`companies/${companyId}/payrollCycles`] = [
        { id: 'CYC-2026-09', monthYear: '2026-09', status: 'APPROVED', totalNetPay: 85000 }
      ];

      mockDocs[`companies/${companyId}/payrollRecords`] = [
        { id: 'rec-1', cycleId: 'CYC-2026-09', monthYear: '2026-09', employeeId: 'EMP-001', employeeName: 'Rajesh Kumar', netSalary: 50000 },
        { id: 'rec-2', cycleId: 'CYC-2026-09', monthYear: '2026-09', employeeId: 'EMP-002', employeeName: 'Sneha Patel', netSalary: 35000 }
      ];

      mockDocs[`companies/${companyId}/employees`] = [
        { id: 'EMP-001', bankAccountNo: '98765432101', ifscCode: 'HDFC0000123', bankName: 'HDFC Bank' },
        { id: 'EMP-002', bankAccountNo: '11223344556', ifscCode: 'ICIC0000456', bankName: 'ICICI Bank' }
      ];
    });

    it('generates compliant HDFC ENet formatted CSV and reconciles total', async () => {
      const res = await IntegrationService.exportBankNeftCsv(companyId, '2026-09', 'HDFC_ENET');
      expect(res.recordCount).toBe(2);
      expect(res.totalExported).toBe(85000);
      expect(res.csvContent).toContain('Transaction Type,Debit Account No,Beneficiary Account No,Beneficiary Name,Amount,Beneficiary IFSC');
      expect(res.csvContent).toContain('NEFT,,98765432101,"Rajesh Kumar",50000.00,HDFC0000123');
      expect(res.csvContent).toContain('NEFT,,11223344556,"Sneha Patel",35000.00,ICIC0000456');
    });

    it('generates compliant ICICI CIB formatted CSV', async () => {
      const res = await IntegrationService.exportBankNeftCsv(companyId, '2026-09', 'ICICI_CIB');
      expect(res.recordCount).toBe(2);
      expect(res.csvContent).toContain('Payment Mode,Debit Account No,Beneficiary Account No,Beneficiary Name,Amount,Currency,Beneficiary IFSC,Remarks/Txn Ref');
      expect(res.csvContent).toContain('NEFT,,98765432101,"Rajesh Kumar",50000.00,INR,HDFC0000123');
    });

    it('generates compliant SBI Corporate CMP formatted CSV', async () => {
      const res = await IntegrationService.exportBankNeftCsv(companyId, '2026-09', 'SBI_CMP');
      expect(res.recordCount).toBe(2);
      expect(res.csvContent).toContain('Transaction Type,Debit Account No,Txn Amount,Beneficiary Account No,Beneficiary IFSC,Beneficiary Name,Remarks,Value Date');
      expect(res.csvContent).toContain('NEFT,,50000.00,98765432101,HDFC0000123,"Rajesh Kumar",PAY-202609-0001');
    });

    it('generates compliant Axis Corporate formatted CSV', async () => {
      const res = await IntegrationService.exportBankNeftCsv(companyId, '2026-09', 'AXIS_CORP');
      expect(res.recordCount).toBe(2);
      expect(res.csvContent).toContain('TXN_TYPE,DR_ACC_NO,CR_ACC_NO,AMOUNT,CURRENCY,IFSC_CODE,BENEFICIARY_NAME,CUSTOMER_REF_NO');
      expect(res.csvContent).toContain('NEFT,,98765432101,50000.00,INR,HDFC0000123,"Rajesh Kumar",PAY-202609-0001');
    });

    it('throws financial reconciliation discrepancy error if record sum != cycle totalNetPay', async () => {
      // Tamper cycle totalNetPay
      mockDocs[`companies/${companyId}/payrollCycles`] = [
        { id: 'CYC-2026-09', monthYear: '2026-09', status: 'APPROVED', totalNetPay: 90000 } // records sum is 85000
      ];

      await expect(
        IntegrationService.exportBankNeftCsv(companyId, '2026-09', 'HDFC_ENET')
      ).rejects.toThrow(/Financial Reconciliation Failure/i);
    });
  });

  describe('3. SAP IDoc Connector Status', () => {
    it('throws explicit in-development message with RFC gateway explanation', async () => {
      await expect(
        IntegrationService.exportSapIdoc(companyId, '2026-09')
      ).rejects.toThrow(/in active development/);
    });
  });
});
