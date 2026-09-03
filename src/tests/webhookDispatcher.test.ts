import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WebhookDispatcherService, computeHmacSha256, calculateBackoffMs } from '../services/webhookDispatcherService';
import { WebhookSubscriptionRecord, WebhookEvent } from '../types/integration';

const mockFirestoreData: Record<string, any> = {};

vi.mock('../firebase', () => ({
  db: {}
}));

vi.mock('firebase/firestore', () => {
  return {
    collection: vi.fn((_db, ...pathSegments) => pathSegments.join('/')),
    doc: vi.fn((_db, ...pathSegments) => pathSegments.join('/')),
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
    orderBy: vi.fn(() => ({})),
    limit: vi.fn(() => ({}))
  };
});

describe('Webhook Dispatcher, HMAC Signing, Retries & Dead-Letter Queue (DLQ)', () => {
  const companyId = 'COMP-CORP-01';
  const subId = 'SUB-HRMS-01';
  const secret = 'whsec_test_secret_key_84920';
  const targetUrl = 'https://hrms.enterprise.internal/webhooks/lsm';

  beforeEach(() => {
    vi.restoreAllMocks();
    for (const key in mockFirestoreData) {
      delete mockFirestoreData[key];
    }

    const subRecord: WebhookSubscriptionRecord = {
      id: subId,
      companyId,
      name: 'HRMS Ingestion Webhook',
      targetUrl,
      secret,
      subscribedEvents: ['attendance.marked', 'employee.created'],
      isActive: true,
      retryCount: 3,
      createdAt: '2026-09-01T10:00:00Z',
      updatedAt: '2026-09-01T10:00:00Z'
    };
    mockFirestoreData[`companies/${companyId}/webhookSubscriptions/${subId}`] = subRecord;
  });

  it('1. computes standard HMAC-SHA256 signature and delivers payload with required security headers', async () => {
    let capturedHeaders: any = null;
    let capturedBody: any = null;

    global.fetch = vi.fn().mockImplementation(async (url: string, opts: any) => {
      capturedHeaders = opts.headers;
      capturedBody = JSON.parse(opts.body);
      return {
        ok: true,
        status: 200,
        text: async () => '{"received": true}'
      };
    });

    const event: WebhookEvent = 'attendance.marked';
    const payloadData = {
      employeeId: 'EMP-101',
      punchTime: '2026-09-02T09:00:00Z',
      siteId: 'SITE-MUM-01'
    };

    const result = await WebhookDispatcherService.dispatchEvent(companyId, event, payloadData);

    expect(result.dispatchedCount).toBe(1);
    expect(result.deliveryLogs).toHaveLength(1);
    expect(result.deliveryLogs[0].status).toBe('DELIVERED');
    expect(result.deliveryLogs[0].httpStatusCode).toBe(200);

    // Verify security headers
    expect(capturedHeaders['Content-Type']).toBe('application/json');
    expect(capturedHeaders['X-LSM-Event']).toBe('attendance.marked');
    expect(capturedHeaders['X-LSM-Signature']).toMatch(/^sha256=[a-f0-9]{64}$/);
    expect(capturedHeaders['X-LSM-Timestamp']).toBeDefined();
    expect(capturedHeaders['X-LSM-Delivery']).toBeDefined();

    // Verify payload envelope
    expect(capturedBody.event).toBe('attendance.marked');
    expect(capturedBody.companyId).toBe(companyId);
    expect(capturedBody.data).toEqual(payloadData);
  });

  it('2. queues retry with exponential backoff when endpoint returns HTTP 500 error', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      text: async () => 'Internal Server Error'
    });

    const event: WebhookEvent = 'employee.created';
    const payloadData = { employeeId: 'EMP-102', firstName: 'Anita', lastName: 'Desai' };

    const result = await WebhookDispatcherService.dispatchEvent(companyId, event, payloadData);

    expect(result.deliveryLogs[0].status).toBe('FAILED');
    expect(result.deliveryLogs[0].httpStatusCode).toBe(500);

    // Verify Retry Queue record created
    const retryKeys = Object.keys(mockFirestoreData).filter(k => k.includes('/webhookRetryQueue/'));
    expect(retryKeys).toHaveLength(1);

    const retryItem = mockFirestoreData[retryKeys[0]];
    expect(retryItem.status).toBe('PENDING_RETRY');
    expect(retryItem.attemptNumber).toBe(2);
    expect(retryItem.maxAttempts).toBe(3);
    expect(retryItem.event).toBe('employee.created');
    expect(new Date(retryItem.nextRetryAt).getTime()).toBeGreaterThan(Date.now());
  });

  it('3. routes exhausted retry failures to the Dead Letter Queue (DLQ)', async () => {
    const retryId = 'RTR-TEST-EXHAUST';
    mockFirestoreData[`companies/${companyId}/webhookRetryQueue/${retryId}`] = {
      id: retryId,
      companyId,
      subscriptionId: subId,
      targetUrl,
      secret,
      event: 'attendance.marked',
      payloadData: { employeeId: 'EMP-103' },
      payloadReferenceId: 'EMP-103',
      attemptNumber: 3, // Final attempt
      maxAttempts: 3,
      nextRetryAt: new Date(Date.now() - 1000).toISOString(), // Due now
      status: 'PENDING_RETRY',
      createdAt: '2026-09-02T08:00:00Z',
      updatedAt: '2026-09-02T08:00:00Z'
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
      text: async () => 'Service Unavailable'
    });

    const processResult = await WebhookDispatcherService.processPendingRetries(companyId);

    expect(processResult.reprocessedCount).toBe(1);
    expect(processResult.dlqCount).toBe(1);

    // Verify moved to Dead Letter Queue
    const dlqKeys = Object.keys(mockFirestoreData).filter(k => k.includes('/webhookDeadLetters/'));
    expect(dlqKeys).toHaveLength(1);

    const dlqItem = mockFirestoreData[dlqKeys[0]];
    expect(dlqItem.status).toBe('DEAD_LETTER');
    expect(dlqItem.totalAttempts).toBe(3);
    expect(dlqItem.lastHttpStatusCode).toBe(503);
    expect(dlqItem.payloadData).toEqual({ employeeId: 'EMP-103' });

    // Verify retry item marked EXHAUSTED
    expect(mockFirestoreData[`companies/${companyId}/webhookRetryQueue/${retryId}`].status).toBe('EXHAUSTED');
  });

  it('4. supports manual replay of dead-letter messages with audit logging', async () => {
    const dlqId = 'DLQ-TEST-REPLAY';
    mockFirestoreData[`companies/${companyId}/webhookDeadLetters/${dlqId}`] = {
      id: dlqId,
      companyId,
      subscriptionId: subId,
      targetUrl,
      event: 'employee.created',
      payloadReferenceId: 'EMP-104',
      payloadData: { employeeId: 'EMP-104', name: 'Replay Candidate' },
      totalAttempts: 3,
      lastHttpStatusCode: 500,
      lastError: 'Internal Server Error',
      failedAt: '2026-09-02T08:00:00Z',
      status: 'DEAD_LETTER'
    };

    // Target endpoint now recovered
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => '{"status": "ok"}'
    });

    const actor = { uid: 'ADM-001', name: 'DevOps Admin' };
    const replayResult = await WebhookDispatcherService.replayDeadLetterMessage(companyId, dlqId, actor);

    expect(replayResult.success).toBe(true);
    expect(replayResult.statusCode).toBe(200);

    // Verify DLQ record marked REPROCESSED
    expect(mockFirestoreData[`companies/${companyId}/webhookDeadLetters/${dlqId}`].status).toBe('REPROCESSED');
    expect(mockFirestoreData[`companies/${companyId}/webhookDeadLetters/${dlqId}`].reprocessedBy).toBe('DevOps Admin');
  });
});
