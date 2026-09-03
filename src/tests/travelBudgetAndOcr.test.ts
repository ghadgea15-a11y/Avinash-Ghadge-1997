import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ExpenseService } from '../services/expenseService';
import { TravelRequestRecord, ExpenseClaimRecord } from '../types/expense';

const mockFirestoreData: Record<string, any> = {};

vi.mock('../firebase', () => ({
  db: {}
}));

vi.mock('../services/auditTrailService', () => ({
  AuditTrailService: {
    recordEvent: vi.fn().mockResolvedValue(undefined)
  }
}));

vi.mock('firebase/firestore', () => {
  return {
    collection: vi.fn((_db, ...pathSegments) => pathSegments.join('/')),
    doc: vi.fn((_db, ...pathSegments) => pathSegments.join('/')),
    addDoc: vi.fn(async (col: string, data: any) => {
      const docId = 'doc_' + Math.random().toString(36).substring(7);
      mockFirestoreData[`${col}/${docId}`] = data;
      return { id: docId };
    }),
    getDoc: vi.fn(async (docPath: string) => {
      const data = mockFirestoreData[docPath];
      return {
        exists: () => !!data,
        id: docPath.split('/').pop() || '',
        data: () => data
      };
    }),
    getDocs: vi.fn(async (queryOrCol: any) => {
      const path = typeof queryOrCol === 'string' ? queryOrCol : (queryOrCol?.path || '');
      const prefix = path.endsWith('/') ? path : `${path}/`;
      const docs = Object.keys(mockFirestoreData)
        .filter(k => k.startsWith(prefix) && k.split('/').length === prefix.split('/').length)
        .map(k => ({
          id: k.split('/').pop() || '',
          data: () => mockFirestoreData[k]
        }));
      return {
        empty: docs.length === 0,
        docs
      };
    }),
    setDoc: vi.fn(async (docPath: string, data: any) => {
      mockFirestoreData[docPath] = { ...mockFirestoreData[docPath], ...data };
    }),
    updateDoc: vi.fn(async (docPath: string, data: any) => {
      if (!mockFirestoreData[docPath]) throw new Error(`Document ${docPath} does not exist`);
      mockFirestoreData[docPath] = { ...mockFirestoreData[docPath], ...data };
    }),
    deleteDoc: vi.fn(async (docPath: string) => {
      delete mockFirestoreData[docPath];
    }),
    query: vi.fn((col, ..._filters) => col),
    where: vi.fn(() => ({})),
    serverTimestamp: vi.fn(() => new Date().toISOString()),
    runTransaction: vi.fn(async (_db: any, updateFunction: (transaction: any) => Promise<any>) => {
      const transaction = {
        get: async (docPath: string) => {
          const data = mockFirestoreData[docPath];
          return {
            exists: () => !!data,
            id: docPath.split('/').pop() || '',
            data: () => (data ? JSON.parse(JSON.stringify(data)) : undefined)
          };
        },
        update: (docPath: string, data: any) => {
          if (!mockFirestoreData[docPath]) throw new Error(`Document ${docPath} does not exist`);
          mockFirestoreData[docPath] = { ...mockFirestoreData[docPath], ...data };
        },
        set: (docPath: string, data: any) => {
          mockFirestoreData[docPath] = { ...mockFirestoreData[docPath], ...data };
        }
      };
      return await updateFunction(transaction);
    })
  };
});

describe('Travel Budget Real-Time Fund Reservation & Lifecycle', () => {
  const companyId = 'COMP-CORP-01';
  const costCenterId = 'CC-OPS-01';
  const ccDocPath = `companies/${companyId}/cost_centres/${costCenterId}`;
  const actor = { uid: 'MGR-001', name: 'Finance Approver', role: 'FINANCE_ADMIN' };

  beforeEach(() => {
    for (const key in mockFirestoreData) {
      delete mockFirestoreData[key];
    }

    // Set up active Cost Center with ₹1,00,000 allocated budget
    mockFirestoreData[ccDocPath] = {
      id: costCenterId,
      code: 'CC-OPS-01',
      name: 'Operations & Facilities',
      budgetAllocated: 100000,
      budgetReserved: 10000, // already 10k reserved
      budgetConsumed: 30000  // already 30k spent -> Available unreserved = 60k
    };
  });

  it('1. reserves budget in real-time when travel request is approved', async () => {
    const trId = 'TR-2026-001';
    const trDocPath = `companies/${companyId}/travelRequests/${trId}`;
    const trRecord: TravelRequestRecord = {
      id: trId,
      companyId,
      employeeId: 'EMP-101',
      employeeName: 'Rahul Verma',
      costCenterId,
      purpose: 'Site Security Audit',
      originCity: 'Mumbai',
      destinationCity: 'Pune',
      departureDate: '2026-09-10',
      returnDate: '2026-09-12',
      estimatedBudget: 15000,
      advanceRequestedAmount: 5000,
      advanceDisbursed: false,
      status: 'SUBMITTED',
      createdAt: '2026-09-05T10:00:00Z',
      updatedAt: '2026-09-05T10:00:00Z'
    };
    mockFirestoreData[trDocPath] = trRecord;

    await ExpenseService.approveTravelRequest(companyId, trRecord, actor);

    // Verify Travel Request updated
    expect(mockFirestoreData[trDocPath].status).toBe('APPROVED');
    expect(mockFirestoreData[trDocPath].budgetReservedAmount).toBe(15000);

    // Verify Cost Center budgetReserved increased atomically by 15,000 (10k -> 25k)
    expect(mockFirestoreData[ccDocPath].budgetReserved).toBe(25000);
    expect(mockFirestoreData[ccDocPath].budgetConsumed).toBe(30000); // consumed untouched
  });

  it('2. fails closed and rejects travel authorization if cost center has insufficient unreserved budget', async () => {
    const trId = 'TR-2026-EXCESS';
    const trDocPath = `companies/${companyId}/travelRequests/${trId}`;
    const trRecord: TravelRequestRecord = {
      id: trId,
      companyId,
      employeeId: 'EMP-102',
      employeeName: 'Sunil Rao',
      costCenterId,
      purpose: 'International Security Summit',
      originCity: 'Mumbai',
      destinationCity: 'London',
      departureDate: '2026-09-20',
      returnDate: '2026-09-25',
      estimatedBudget: 75000, // Available is 100k - (10k + 30k) = 60k
      advanceRequestedAmount: 0,
      advanceDisbursed: false,
      status: 'SUBMITTED',
      createdAt: '2026-09-05T10:00:00Z',
      updatedAt: '2026-09-05T10:00:00Z'
    };
    mockFirestoreData[trDocPath] = trRecord;

    await expect(
      ExpenseService.approveTravelRequest(companyId, trRecord, actor)
    ).rejects.toThrow(/Insufficient unreserved budget/i);

    // Verify Cost Center state remained untouched
    expect(mockFirestoreData[ccDocPath].budgetReserved).toBe(10000);
    expect(mockFirestoreData[trDocPath].status).toBe('SUBMITTED');
  });

  it('3. releases reserved budget hold when travel request is cancelled or rejected', async () => {
    const trId = 'TR-2026-CANCEL';
    const trDocPath = `companies/${companyId}/travelRequests/${trId}`;
    const trRecord: TravelRequestRecord = {
      id: trId,
      companyId,
      employeeId: 'EMP-103',
      employeeName: 'Anil Roy',
      costCenterId,
      purpose: 'Cancelled Branch Visit',
      originCity: 'Delhi',
      destinationCity: 'Jaipur',
      departureDate: '2026-09-15',
      returnDate: '2026-09-16',
      estimatedBudget: 10000,
      budgetReservedAmount: 10000,
      advanceRequestedAmount: 0,
      advanceDisbursed: false,
      status: 'APPROVED',
      createdAt: '2026-09-01T10:00:00Z',
      updatedAt: '2026-09-02T10:00:00Z'
    };
    mockFirestoreData[trDocPath] = trRecord;

    // CC currently has 10,000 reserved
    await ExpenseService.cancelTravelRequest(companyId, trRecord, actor);

    // Verify reservation released
    expect(mockFirestoreData[trDocPath].status).toBe('CANCELLED');
    expect(mockFirestoreData[trDocPath].budgetReservedAmount).toBe(0);
    expect(mockFirestoreData[ccDocPath].budgetReserved).toBe(0); // 10k - 10k
  });

  it('4. converts reserved budget hold into actual spend when linked expense claim is approved', async () => {
    const trId = 'TR-2026-SETTLE';
    const trDocPath = `companies/${companyId}/travelRequests/${trId}`;
    mockFirestoreData[trDocPath] = {
      id: trId,
      companyId,
      costCenterId,
      estimatedBudget: 8000,
      budgetReservedAmount: 8000,
      status: 'APPROVED'
    };

    const claimId = 'EXP-CLAIM-TR';
    const claimDocPath = `companies/${companyId}/expenseClaims/${claimId}`;
    mockFirestoreData[claimDocPath] = {
      id: claimId,
      companyId,
      travelRequestId: trId,
      costCenterId,
      totalAmount: 7500, // Actual expense slightly less than pre-auth 8000
      status: 'SUBMITTED',
      items: []
    };

    await ExpenseService.updateClaimStatus(companyId, claimId, 'APPROVED', actor);

    // Cost Center: budgetReserved released by 8000 (10k -> 2k), budgetConsumed increased by 7500 (30k -> 37.5k)
    expect(mockFirestoreData[ccDocPath].budgetReserved).toBe(2000);
    expect(mockFirestoreData[ccDocPath].budgetConsumed).toBe(37500);

    // Travel request marked settled and completed
    expect(mockFirestoreData[trDocPath].status).toBe('COMPLETED');
    expect(mockFirestoreData[trDocPath].budgetReservedAmount).toBe(0);
    expect(mockFirestoreData[trDocPath].settledAmount).toBe(7500);
  });
});

describe('Receipt AI OCR Fail-Closed & Manual Review Enforcement', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('1. forces manual review when confidence score is below 80% threshold', async () => {
    // Mock server OCR endpoint returning confidence score 0.65 (< 0.80)
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          merchantName: 'Blurry Tea Stall',
          totalAmount: 450,
          currency: 'INR',
          expenseDate: '2026-09-02',
          category: 'MEALS_FOOD',
          confidenceScore: 0.65,
          requiresManualReview: true,
          manualReviewReason: 'Low OCR confidence score (65% < 80% threshold). Approver must cross-verify original invoice.',
          ocrExtractionStatus: 'LOW_CONFIDENCE'
        }
      })
    } as any);

    const result = await ExpenseService.processReceiptOcr('data:image/jpeg;base64,mockLowConfidence');

    expect(result.success).toBe(true);
    expect(result.requiresManualReview).toBe(true);
    expect(result.ocrExtractionStatus).toBe('LOW_CONFIDENCE');
    expect(result.confidenceScore).toBe(0.65);
    expect(result.manualReviewReason).toContain('Low OCR confidence');
  });

  it('2. fails closed with zero fake data when OCR API encounters an error or missing key', async () => {
    // Mock server returning GEMINI_API_KEY_NOT_CONFIGURED / FAILED_MANUAL_REVIEW_REQUIRED
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: false,
        error: 'GEMINI_API_KEY_NOT_CONFIGURED',
        requiresManualReview: true,
        manualReviewReason: 'AI OCR service key not configured on server. Manual verification of invoice required by Approver.',
        confidenceScore: 0,
        ocrExtractionStatus: 'FAILED_MANUAL_REVIEW_REQUIRED'
      })
    } as any);

    const result = await ExpenseService.processReceiptOcr('data:image/jpeg;base64,mockNoKey');

    expect(result.success).toBe(false);
    expect(result.data).toBeUndefined(); // Zero synthetic hallucinated data
    expect(result.requiresManualReview).toBe(true);
    expect(result.ocrExtractionStatus).toBe('FAILED_MANUAL_REVIEW_REQUIRED');
    expect(result.confidenceScore).toBe(0);
    expect(result.manualReviewReason).toContain('Manual verification of invoice required');
  });

  it('3. fails closed when network request fails completely', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Network disconnected'));

    const result = await ExpenseService.processReceiptOcr('data:image/jpeg;base64,mockNetworkFail');

    expect(result.success).toBe(false);
    expect(result.requiresManualReview).toBe(true);
    expect(result.ocrExtractionStatus).toBe('FAILED_MANUAL_REVIEW_REQUIRED');
    expect(result.error).toBe('Network disconnected');
    expect(result.manualReviewReason).toContain('OCR network dispatch failed');
  });
});

