import { describe, it, expect, vi, beforeEach } from 'vitest';
import crypto from 'crypto';
import { computeSha256 } from '../services/integrationService';
import { requireApiKey, resetRateLimitBuckets, ApiKeyAuthenticatedRequest } from '../server/apiKeyMiddleware';

// In-memory mock for Firebase Admin SDK
const mockDbCollections: Record<string, Record<string, any>> = {};

vi.mock('../server/firebaseAdmin', () => {
  return {
    getAdminDb: () => ({
      collection: (colName: string) => ({
        doc: (docId: string) => ({
          collection: (subColName: string) => ({
            where: (field: string, op: string, val: any) => ({
              limit: (n: number) => ({
                get: async () => {
                  const companyKeys = mockDbCollections[`${colName}/${docId}/${subColName}`] || {};
                  const matches = Object.values(companyKeys).filter((item: any) => item[field] === val);
                  return {
                    empty: matches.length === 0,
                    docs: matches.slice(0, n).map(m => ({
                      id: m.id,
                      data: () => m,
                      ref: {
                        update: vi.fn(async (updateData) => {
                          Object.assign(m, updateData);
                        })
                      }
                    }))
                  };
                }
              })
            })
          })
        })
      })
    })
  };
});

describe('FIX 1.1 — Cryptographic SHA-256 API Key Storage & Rate-Limiting Engine', () => {
  beforeEach(() => {
    resetRateLimitBuckets();
    // Reset mock db
    for (const key in mockDbCollections) {
      delete mockDbCollections[key];
    }
  });

  describe('Cryptographic SHA-256 One-Way Hashing', () => {
    it('produces a standard 64-character hexadecimal SHA-256 digest', async () => {
      const sampleKey = 'lsm_live_a1b2c3d4e5f678901234567890abcdef1234567890abcdef';
      const hash = await computeSha256(sampleKey);

      expect(hash).toHaveLength(64);
      expect(hash).toMatch(/^[0-9a-f]{64}$/);

      // Verify node crypto sha256 output matches exactly
      const expected = crypto.createHash('sha256').update(sampleKey).digest('hex');
      expect(hash).toBe(expected);
    });

    it('is non-reversible and not base64 encoded (unlike vulnerable btoa)', async () => {
      const sampleKey = 'lsm_live_secret_key_12345678';
      const hash = await computeSha256(sampleKey);

      // Verify it cannot be decoded via atob/Buffer.from as plaintext
      const decodedAttempt = Buffer.from(hash, 'base64').toString('utf-8');
      expect(decodedAttempt).not.toContain(sampleKey);
      expect(decodedAttempt).not.toContain('lsm_live');
    });

    it('produces distinct hashes for different keys (avoids collisions)', async () => {
      const key1 = 'lsm_live_key_000000000000000000000001';
      const key2 = 'lsm_live_key_000000000000000000000002';

      const hash1 = await computeSha256(key1);
      const hash2 = await computeSha256(key2);

      expect(hash1).not.toBe(hash2);
    });
  });

  describe('API Key Authentication Middleware (requireApiKey)', () => {
    const companyId = 'company_enterprise_99';
    const rawPlaintextKey = 'lsm_live_99887766554433221100aabbccddeeff11223344';
    const hashedSecret = crypto.createHash('sha256').update(rawPlaintextKey).digest('hex');

    const keyRecord = {
      id: 'key_doc_101',
      companyId,
      name: 'SAP Production Connector',
      keyPrefix: rawPlaintextKey.substring(0, 16) + '...',
      hashedSecret,
      status: 'ACTIVE',
      permissions: ['READ_ATTENDANCE', 'READ_EMPLOYEES'],
      rateLimitPerMinute: 3, // Set low for rate limit test
      totalCallsCount: 0,
      createdAt: new Date().toISOString()
    };

    beforeEach(() => {
      mockDbCollections[`companies/${companyId}/apiKeys`] = {
        [keyRecord.id]: { ...keyRecord }
      };
    });

    it('authenticates valid SHA-256 API Key with proper tenant header', async () => {
      const req: any = {
        headers: {
          'x-api-key': rawPlaintextKey,
          'x-company-id': companyId
        },
        query: {},
        body: {}
      };

      const res: any = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
        setHeader: vi.fn()
      };
      const next = vi.fn();

      const middleware = requireApiKey('READ_ATTENDANCE');
      await middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.apiKeyRecord.id).toBe('key_doc_101');
      expect(req.companyId).toBe(companyId);
    });

    it('rejects calls without an API Key with 401 Unauthorized', async () => {
      const req: any = {
        headers: { 'x-company-id': companyId },
        query: {},
        body: {}
      };
      const res: any = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn()
      };
      const next = vi.fn();

      const middleware = requireApiKey();
      await middleware(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'Unauthorized' }));
    });

    it('rejects calls with missing X-Company-Id with 400 Bad Request', async () => {
      const req: any = {
        headers: { 'x-api-key': rawPlaintextKey },
        query: {},
        body: {}
      };
      const res: any = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn()
      };
      const next = vi.fn();

      const middleware = requireApiKey();
      await middleware(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'Bad Request' }));
    });

    it('enforces multi-tenant isolation (Company A key cannot be used for Company B)', async () => {
      const otherCompanyId = 'company_rogue_tenant';
      const req: any = {
        headers: {
          'x-api-key': rawPlaintextKey,
          'x-company-id': otherCompanyId
        },
        query: {},
        body: {}
      };
      const res: any = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn()
      };
      const next = vi.fn();

      const middleware = requireApiKey();
      await middleware(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        message: 'Invalid or unrecognized API Key for this company tenant.'
      }));
    });

    it('immediately denies access for REVOKED API keys', async () => {
      // Mark key as REVOKED
      mockDbCollections[`companies/${companyId}/apiKeys`][keyRecord.id].status = 'REVOKED';
      mockDbCollections[`companies/${companyId}/apiKeys`][keyRecord.id].revocationReason = 'Security leak suspected';

      const req: any = {
        headers: {
          'x-api-key': rawPlaintextKey,
          'x-company-id': companyId
        },
        query: {},
        body: {}
      };
      const res: any = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn()
      };
      const next = vi.fn();

      const middleware = requireApiKey();
      await middleware(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        message: expect.stringContaining('revoked')
      }));
    });

    it('permits ROTATED keys within grace period, and rejects once grace period expires', async () => {
      // Active grace period
      mockDbCollections[`companies/${companyId}/apiKeys`][keyRecord.id].status = 'ROTATED';
      mockDbCollections[`companies/${companyId}/apiKeys`][keyRecord.id].gracePeriodExpiresAt = new Date(Date.now() + 3600000).toISOString();

      const req1: any = {
        headers: { 'x-api-key': rawPlaintextKey, 'x-company-id': companyId },
        query: {},
        body: {}
      };
      const res1: any = { status: vi.fn().mockReturnThis(), json: vi.fn() };
      const next1 = vi.fn();

      const middleware = requireApiKey();
      await middleware(req1, res1, next1);
      expect(next1).toHaveBeenCalled();

      // Expired grace period
      mockDbCollections[`companies/${companyId}/apiKeys`][keyRecord.id].gracePeriodExpiresAt = new Date(Date.now() - 3600000).toISOString();

      const req2: any = {
        headers: { 'x-api-key': rawPlaintextKey, 'x-company-id': companyId },
        query: {},
        body: {}
      };
      const res2: any = { status: vi.fn().mockReturnThis(), json: vi.fn() };
      const next2 = vi.fn();

      await middleware(req2, res2, next2);
      expect(next2).not.toHaveBeenCalled();
      expect(res2.status).toHaveBeenCalledWith(401);
    });

    it('enforces RBAC permission check (denies when required permission is absent)', async () => {
      const req: any = {
        headers: {
          'x-api-key': rawPlaintextKey,
          'x-company-id': companyId
        },
        query: {},
        body: {}
      };
      const res: any = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn()
      };
      const next = vi.fn();

      // Key has READ_ATTENDANCE, READ_EMPLOYEES. Demanding WRITE_PAYROLL should fail with 403 Forbidden
      const middleware = requireApiKey('WRITE_PAYROLL');
      await middleware(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'Forbidden' }));
    });

    it('enforces sliding-window rate limits (returns 429 Too Many Requests when limit is exceeded)', async () => {
      const middleware = requireApiKey('READ_ATTENDANCE');

      // Rate limit is set to 3 requests per minute for this key
      for (let i = 0; i < 3; i++) {
        const req: any = {
          headers: { 'x-api-key': rawPlaintextKey, 'x-company-id': companyId },
          query: {},
          body: {}
        };
        const res: any = { status: vi.fn().mockReturnThis(), json: vi.fn(), setHeader: vi.fn() };
        const next = vi.fn();
        await middleware(req, res, next);
        expect(next).toHaveBeenCalled();
      }

      // 4th request should trigger HTTP 429
      const req4: any = {
        headers: { 'x-api-key': rawPlaintextKey, 'x-company-id': companyId },
        query: {},
        body: {}
      };
      const res4: any = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
        setHeader: vi.fn()
      };
      const next4 = vi.fn();

      await middleware(req4, res4, next4);

      expect(next4).not.toHaveBeenCalled();
      expect(res4.status).toHaveBeenCalledWith(429);
      expect(res4.setHeader).toHaveBeenCalledWith('Retry-After', expect.any(String));
      expect(res4.json).toHaveBeenCalledWith(expect.objectContaining({
        error: 'Too Many Requests'
      }));
    });

    it('enforces tenant-level aggregate rate limiting across all tenant keys', async () => {
      const middleware = requireApiKey('READ_ATTENDANCE');

      // Key has rateLimitPerMinute=1000, but tenant aggregate limit is 600
      mockDbCollections[`companies/${companyId}/apiKeys`][keyRecord.id].rateLimitPerMinute = 1000;

      // Simulate 600 requests for the tenant
      for (let i = 0; i < 600; i++) {
        const req: any = {
          headers: { 'x-api-key': rawPlaintextKey, 'x-company-id': companyId },
          query: {},
          body: {}
        };
        const res: any = { status: vi.fn().mockReturnThis(), json: vi.fn(), setHeader: vi.fn() };
        const next = vi.fn();
        await middleware(req, res, next);
        expect(next).toHaveBeenCalled();
      }

      // 601st request should breach tenant aggregate rate limit (HTTP 429)
      const req601: any = {
        headers: { 'x-api-key': rawPlaintextKey, 'x-company-id': companyId },
        query: {},
        body: {}
      };
      const res601: any = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
        setHeader: vi.fn()
      };
      const next601 = vi.fn();

      await middleware(req601, res601, next601);

      expect(next601).not.toHaveBeenCalled();
      expect(res601.status).toHaveBeenCalledWith(429);
      expect(res601.json).toHaveBeenCalledWith(expect.objectContaining({
        error: 'Too Many Requests',
        message: expect.stringContaining('Tenant aggregate rate limit')
      }));
    });
  });
});
