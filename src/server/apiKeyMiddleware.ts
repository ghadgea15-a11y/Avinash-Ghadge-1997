import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { getAdminDb } from './firebaseAdmin';

// In-memory sliding-window rate limit store for fast sub-millisecond edge checks
const rateLimitBuckets = new Map<string, { count: number; resetAt: number }>();

export function resetRateLimitBuckets(): void {
  rateLimitBuckets.clear();
}

export interface ApiKeyAuthenticatedRequest extends Request {
  apiKeyRecord?: {
    id: string;
    companyId: string;
    name: string;
    permissions: string[];
    rateLimitPerMinute: number;
    status: string;
  };
  companyId?: string;
}

/**
 * Express middleware for authenticating external REST calls via SHA-256 hashed API Keys with tenant isolation and rate-limiting.
 */
export function requireApiKey(requiredPermission?: string) {
  return async (req: ApiKeyAuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const authHeader = req.headers['x-api-key'] || req.headers['authorization'];
      const companyId = (req.headers['x-company-id'] || req.query.companyId || req.body?.companyId) as string;

      if (!authHeader) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'Missing API Key in X-API-Key or Authorization header.'
        });
      }

      if (!companyId) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'Missing tenant identifier (X-Company-Id header).'
        });
      }

      let rawKey = String(authHeader);
      if (rawKey.startsWith('Bearer ')) {
        rawKey = rawKey.substring(7).trim();
      }

      if (!rawKey.startsWith('lsm_live_')) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'Invalid API key format.'
        });
      }

      // Compute one-way SHA-256 hash
      const hashedSecret = crypto.createHash('sha256').update(rawKey).digest('hex');

      const db = getAdminDb();
      if (!db) {
        return res.status(503).json({
          error: 'Service Unavailable',
          message: 'Database backend connection unavailable.'
        });
      }

      const snap = await db
        .collection('companies')
        .doc(companyId)
        .collection('apiKeys')
        .where('hashedSecret', '==', hashedSecret)
        .limit(1)
        .get();

      if (snap.empty) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'Invalid or unrecognized API Key for this company tenant.'
        });
      }

      const keyDoc = snap.docs[0];
      const keyData = keyDoc.data() as any;

      // Status check
      if (keyData.status === 'REVOKED' || keyData.status === 'EXPIRED') {
        return res.status(401).json({
          error: 'Unauthorized',
          message: `API Key is ${keyData.status.toLowerCase()}.${keyData.revocationReason ? ' Reason: ' + keyData.revocationReason : ''}`
        });
      }

      if (keyData.status === 'ROTATED') {
        if (keyData.gracePeriodExpiresAt && new Date(keyData.gracePeriodExpiresAt).getTime() < Date.now()) {
          return res.status(401).json({
            error: 'Unauthorized',
            message: 'Rotated API Key grace period has expired. Please migrate to the replacement key.'
          });
        }
      }

      // Permission check
      if (requiredPermission && keyData.permissions) {
        const hasPerm = keyData.permissions.includes('FULL_ACCESS') || keyData.permissions.includes(requiredPermission);
        if (!hasPerm) {
          return res.status(403).json({
            error: 'Forbidden',
            message: `API key lacks required permission: ${requiredPermission}`
          });
        }
      }

      // Rate limit checks (Per-Tenant and Per-Key)
      const now = Date.now();

      // 1. Per-Tenant (cId) Rate Limit Check (Aggregate 600 requests/minute per tenant)
      const tenantLimit = 600;
      const tenantBucketKey = `tenant:${companyId}`;
      const tenantBucket = rateLimitBuckets.get(tenantBucketKey);
      if (!tenantBucket || now > tenantBucket.resetAt) {
        rateLimitBuckets.set(tenantBucketKey, { count: 1, resetAt: now + 60000 });
      } else {
        if (tenantBucket.count >= tenantLimit) {
          const retryAfterSec = Math.ceil((tenantBucket.resetAt - now) / 1000);
          if (typeof res.setHeader === 'function') {
            res.setHeader('Retry-After', retryAfterSec.toString());
          }
          return res.status(429).json({
            error: 'Too Many Requests',
            message: `Tenant aggregate rate limit of ${tenantLimit} requests per minute exceeded.`,
            retryAfterSeconds: retryAfterSec
          });
        }
        tenantBucket.count += 1;
      }

      // 2. Per-Key Rate Limit Check
      const limit = Number(keyData.rateLimitPerMinute) || 120;
      const bucketKey = `key:${companyId}:${keyDoc.id}`;
      const bucket = rateLimitBuckets.get(bucketKey);

      if (!bucket || now > bucket.resetAt) {
        rateLimitBuckets.set(bucketKey, { count: 1, resetAt: now + 60000 });
      } else {
        if (bucket.count >= limit) {
          const retryAfterSec = Math.ceil((bucket.resetAt - now) / 1000);
          if (typeof res.setHeader === 'function') {
            res.setHeader('Retry-After', retryAfterSec.toString());
          }
          return res.status(429).json({
            error: 'Too Many Requests',
            message: `Rate limit of ${limit} requests per minute exceeded.`,
            retryAfterSeconds: retryAfterSec
          });
        }
        bucket.count += 1;
      }

      // Asynchronously update last used and total calls count
      keyDoc.ref.update({
        lastUsedAt: new Date(now).toISOString(),
        totalCallsCount: (keyData.totalCallsCount || 0) + 1
      }).catch(err => {
        console.warn('[ApiKeyMiddleware] Failed to update telemetry:', err);
      });

      req.apiKeyRecord = {
        id: keyDoc.id,
        companyId,
        name: keyData.name,
        permissions: keyData.permissions || [],
        rateLimitPerMinute: limit,
        status: keyData.status
      };
      req.companyId = companyId;

      next();
    } catch (err: any) {
      console.error('[ApiKeyMiddleware] Authentication error:', err);
      return res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to authenticate API Key.'
      });
    }
  };
}
