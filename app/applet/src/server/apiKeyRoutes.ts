import express, { Request, Response } from 'express';
import crypto from 'crypto';
import { getAdminDb } from './firebaseAdmin';
import { requireApiKey, ApiKeyAuthenticatedRequest } from './apiKeyMiddleware';

const router = express.Router();

function generateSecureRandomKey(): string {
  const token = crypto.randomBytes(24).toString('hex');
  return `lsm_live_${token}`;
}

function computeSha256Hash(plainKey: string): string {
  return crypto.createHash('sha256').update(plainKey).digest('hex');
}

/**
 * POST /api/integrations/api-keys/generate
 * Server-side API key creation:
 * - Generates cryptographically strong random token
 * - Computes one-way SHA-256 hash
 * - Stores ONLY the hash at rest in Firestore
 * - Returns the plaintext key to caller EXACTLY ONCE
 */
router.post('/api-keys/generate', async (req: Request, res: Response) => {
  try {
    const { companyId, name, permissions, rateLimitPerMinute, allowedIpRanges, actor } = req.body;

    if (!companyId) {
      return res.status(400).json({ error: 'Bad Request', message: 'companyId is required' });
    }

    const plainTextKey = generateSecureRandomKey();
    const hashedSecret = computeSha256Hash(plainTextKey);
    const keyPrefix = plainTextKey.substring(0, 16) + '...';

    const db = getAdminDb();
    if (!db) {
      return res.status(503).json({ error: 'Service Unavailable', message: 'Database connection unavailable' });
    }

    const docRef = db.collection('companies').doc(companyId).collection('apiKeys').doc();

    const record = {
      id: docRef.id,
      companyId,
      name: name || 'External Integration Key',
      keyPrefix,
      hashedSecret, // One-way SHA-256 hash
      status: 'ACTIVE',
      permissions: permissions || ['READ_ATTENDANCE', 'READ_EMPLOYEES'],
      rateLimitPerMinute: Number(rateLimitPerMinute) || 120,
      allowedIpRanges: allowedIpRanges || [],
      totalCallsCount: 0,
      createdAt: new Date().toISOString(),
      createdBy: actor?.name || 'Authorized Admin'
    };

    await docRef.set(record);

    // Also record audit log
    await db.collection('audit_logs').add({
      companyId,
      actorUid: actor?.uid || 'system',
      actorName: actor?.name || 'Admin',
      actorRole: 'SYSTEM_ADMIN',
      module: 'INTEGRATION',
      action: 'API_KEY_CREATED',
      entityId: docRef.id,
      description: `Generated API Key: ${record.name} (${keyPrefix}) with SHA-256 hash storage`,
      timestamp: new Date().toISOString()
    });

    // Plaintext key returned to user EXACTLY ONCE
    return res.status(201).json({
      success: true,
      message: 'API Key generated successfully. Copy it now; it will never be displayed or returned again.',
      plainTextKey,
      keyRecord: {
        id: record.id,
        companyId: record.companyId,
        name: record.name,
        keyPrefix: record.keyPrefix,
        status: record.status,
        permissions: record.permissions,
        rateLimitPerMinute: record.rateLimitPerMinute,
        allowedIpRanges: record.allowedIpRanges,
        createdAt: record.createdAt,
        createdBy: record.createdBy
      }
    });
  } catch (err: any) {
    console.error('[ApiKeyAPI] Generate error:', err);
    return res.status(500).json({ error: 'Internal Server Error', message: err.message });
  }
});

/**
 * POST /api/integrations/api-keys/rotate
 * Rotate an existing key:
 * - Marks existing key as ROTATED with grace period
 * - Generates new replacement key with identical scope & permissions
 * - Returns replacement plaintext key ONCE
 */
router.post('/api-keys/rotate', async (req: Request, res: Response) => {
  try {
    const { companyId, keyId, gracePeriodHours, actor } = req.body;

    if (!companyId || !keyId) {
      return res.status(400).json({ error: 'Bad Request', message: 'companyId and keyId are required' });
    }

    const db = getAdminDb();
    if (!db) {
      return res.status(503).json({ error: 'Service Unavailable', message: 'Database connection unavailable' });
    }

    const oldDocRef = db.collection('companies').doc(companyId).collection('apiKeys').doc(keyId);
    const oldSnap = await oldDocRef.get();

    if (!oldSnap.exists) {
      return res.status(404).json({ error: 'Not Found', message: `API key ${keyId} not found` });
    }

    const oldData = oldSnap.data() as any;
    if (oldData.status === 'REVOKED') {
      return res.status(400).json({ error: 'Bad Request', message: `Cannot rotate revoked API key ${keyId}` });
    }

    const graceHours = Number(gracePeriodHours) || 24;
    const gracePeriodExpiresAt = new Date(Date.now() + graceHours * 3600 * 1000).toISOString();

    // Mark old key as ROTATED
    await oldDocRef.update({
      status: 'ROTATED',
      rotatedAt: new Date().toISOString(),
      gracePeriodExpiresAt
    });

    // Generate new replacement key
    const newPlainTextKey = generateSecureRandomKey();
    const newHashedSecret = computeSha256Hash(newPlainTextKey);
    const newKeyPrefix = newPlainTextKey.substring(0, 16) + '...';

    const newDocRef = db.collection('companies').doc(companyId).collection('apiKeys').doc();
    const newRecord = {
      id: newDocRef.id,
      companyId,
      name: `${oldData.name} (Rotated)`,
      keyPrefix: newKeyPrefix,
      hashedSecret: newHashedSecret,
      status: 'ACTIVE',
      permissions: oldData.permissions || ['READ_ATTENDANCE', 'READ_EMPLOYEES'],
      rateLimitPerMinute: oldData.rateLimitPerMinute || 120,
      allowedIpRanges: oldData.allowedIpRanges || [],
      totalCallsCount: 0,
      createdAt: new Date().toISOString(),
      createdBy: actor?.name || 'Authorized Admin'
    };

    await newDocRef.set(newRecord);

    await db.collection('audit_logs').add({
      companyId,
      actorUid: actor?.uid || 'system',
      actorName: actor?.name || 'Admin',
      actorRole: 'SYSTEM_ADMIN',
      module: 'INTEGRATION',
      action: 'API_KEY_ROTATED',
      entityId: newDocRef.id,
      description: `Rotated API key ${keyId} -> ${newDocRef.id} with ${graceHours}h grace period until ${gracePeriodExpiresAt}`,
      timestamp: new Date().toISOString()
    });

    return res.json({
      success: true,
      message: 'API Key rotated successfully. Migrate external systems before grace period expires.',
      oldKeyId: keyId,
      gracePeriodExpiresAt,
      newPlainTextKey,
      newKeyRecord: {
        id: newRecord.id,
        companyId: newRecord.companyId,
        name: newRecord.name,
        keyPrefix: newRecord.keyPrefix,
        status: newRecord.status,
        permissions: newRecord.permissions,
        rateLimitPerMinute: newRecord.rateLimitPerMinute,
        createdAt: newRecord.createdAt,
        createdBy: newRecord.createdBy
      }
    });
  } catch (err: any) {
    console.error('[ApiKeyAPI] Rotate error:', err);
    return res.status(500).json({ error: 'Internal Server Error', message: err.message });
  }
});

/**
 * POST /api/integrations/api-keys/revoke
 * Immediately invalidate key
 */
router.post('/api-keys/revoke', async (req: Request, res: Response) => {
  try {
    const { companyId, keyId, reason, actor } = req.body;

    if (!companyId || !keyId) {
      return res.status(400).json({ error: 'Bad Request', message: 'companyId and keyId are required' });
    }

    const db = getAdminDb();
    if (!db) {
      return res.status(503).json({ error: 'Service Unavailable', message: 'Database connection unavailable' });
    }

    const docRef = db.collection('companies').doc(companyId).collection('apiKeys').doc(keyId);
    await docRef.update({
      status: 'REVOKED',
      revokedAt: new Date().toISOString(),
      revocationReason: reason || 'Revoked by administrator'
    });

    await db.collection('audit_logs').add({
      companyId,
      actorUid: actor?.uid || 'system',
      actorName: actor?.name || 'Admin',
      actorRole: 'SYSTEM_ADMIN',
      module: 'INTEGRATION',
      action: 'API_KEY_REVOKED',
      entityId: keyId,
      description: `Revoked API Key ${keyId}. Reason: ${reason || 'Administrator action'}`,
      timestamp: new Date().toISOString()
    });

    return res.json({
      success: true,
      message: `API Key ${keyId} has been immediately revoked.`
    });
  } catch (err: any) {
    console.error('[ApiKeyAPI] Revoke error:', err);
    return res.status(500).json({ error: 'Internal Server Error', message: err.message });
  }
});

/**
 * GET /api/integrations/api-keys
 * List keys metadata (secrets/hashes are NEVER returned)
 */
router.get('/api-keys', async (req: Request, res: Response) => {
  try {
    const companyId = req.query.companyId as string || req.headers['x-company-id'] as string;
    if (!companyId) {
      return res.status(400).json({ error: 'Bad Request', message: 'companyId query param or X-Company-Id header is required' });
    }

    const db = getAdminDb();
    if (!db) {
      return res.status(503).json({ error: 'Service Unavailable', message: 'Database connection unavailable' });
    }

    const snap = await db.collection('companies').doc(companyId).collection('apiKeys').get();
    const sanitizedKeys = snap.docs.map(doc => {
      const data = doc.data() as any;
      return {
        id: doc.id,
        companyId: data.companyId,
        name: data.name,
        keyPrefix: data.keyPrefix,
        status: data.status,
        permissions: data.permissions || [],
        rateLimitPerMinute: data.rateLimitPerMinute || 120,
        allowedIpRanges: data.allowedIpRanges || [],
        totalCallsCount: data.totalCallsCount || 0,
        lastUsedAt: data.lastUsedAt || null,
        rotatedAt: data.rotatedAt || null,
        gracePeriodExpiresAt: data.gracePeriodExpiresAt || null,
        revokedAt: data.revokedAt || null,
        revocationReason: data.revocationReason || null,
        createdAt: data.createdAt,
        createdBy: data.createdBy
      };
    });

    return res.json({
      success: true,
      apiKeys: sanitizedKeys
    });
  } catch (err: any) {
    console.error('[ApiKeyAPI] List error:', err);
    return res.status(500).json({ error: 'Internal Server Error', message: err.message });
  }
});

/**
 * GET /api/integrations/v1/ping
 * Protected test endpoint using requireApiKey() middleware
 */
router.get('/v1/ping', requireApiKey('READ_ATTENDANCE'), (req: ApiKeyAuthenticatedRequest, res: Response) => {
  return res.json({
    status: 'ok',
    message: 'API Key authenticated successfully with SHA-256 verification and tenant isolation.',
    companyId: req.companyId,
    apiKey: {
      id: req.apiKeyRecord?.id,
      name: req.apiKeyRecord?.name,
      permissions: req.apiKeyRecord?.permissions,
      rateLimitPerMinute: req.apiKeyRecord?.rateLimitPerMinute,
      status: req.apiKeyRecord?.status
    },
    serverTimestamp: new Date().toISOString()
  });
});

export default router;
