import { Request, Response } from 'express';
import crypto from 'crypto';
import { getAdminDb } from './firebaseAdmin';

export interface WebhookEventPayload {
  companyId: string;
  eventType: 'ATTENDANCE_PUNCH' | 'EMPLOYEE_ONBOARDED' | 'INCIDENT_REPORTED' | 'EXPENSE_APPROVED';
  referenceId: string;
  metadata?: Record<string, any>;
}

export interface WebhookDeliveryAttemptLog {
  deliveryId: string;
  companyId: string;
  subscriptionId: string;
  eventType: string;
  referenceId: string;
  targetUrl: string;
  attemptNumber: number;
  httpStatusCode: number;
  responseSnippet: string;
  status: 'DELIVERED' | 'FAILED';
  executedAt: string;
}

/**
 * Calculates exponential backoff with jitter
 * Attempt 1: 2s, Attempt 2: 8s, Attempt 3: 32s, Attempt 4: ~128s, Attempt 5: ~300s (capped)
 */
function calculateBackoffMs(attemptNumber: number): number {
  const baseMs = 2000;
  const backoff = baseMs * Math.pow(4, attemptNumber - 1);
  const jitter = Math.floor(Math.random() * 1000);
  return Math.min(backoff + jitter, 300000); // 5 minutes max
}

/**
 * Builds minimal reference payload containing NO PII / salary data
 */
export function buildMinimalWebhookEnvelope(
  deliveryId: string,
  companyId: string,
  eventType: string,
  referenceId: string,
  timestamp: string,
  attemptNumber: number,
  metadata?: Record<string, any>
) {
  return {
    id: deliveryId,
    event: eventType,
    companyId: companyId,
    timestamp: timestamp,
    attemptNumber: attemptNumber,
    data: {
      referenceId: referenceId,
      status: metadata?.status || 'TRIGGERED',
      siteId: metadata?.siteId || null,
      regionId: metadata?.regionId || null,
      occurredAt: metadata?.occurredAt || timestamp
    }
  };
}

/**
 * Signs payload using HMAC-SHA256
 */
export function signWebhookPayload(secret: string, timestamp: string, serializedPayload: string): string {
  const hmacMessage = `${timestamp}.${serializedPayload}`;
  return crypto.createHmac('sha256', secret).update(hmacMessage).digest('hex');
}

/**
 * Server-authoritative webhook dispatcher:
 * - Queries active subscriptions for the event type
 * - Sends signed HTTPS POST with X-LSM-Signature & X-LSM-Timestamp
 * - Handles retries via Firestore-backed queue with exponential backoff
 * - Moves exhausted failures to webhookDeadLetters after max attempts (5)
 */
export async function dispatchServerWebhook(payload: WebhookEventPayload): Promise<{
  dispatchedCount: number;
  deliveryLogs: WebhookDeliveryAttemptLog[];
}> {
  const db = getAdminDb();
  if (!db) {
    throw new Error('Admin Database unavailable for webhook dispatch');
  }

  const { companyId, eventType, referenceId, metadata } = payload;
  const deliveryLogs: WebhookDeliveryAttemptLog[] = [];

  const subsSnapshot = await db
    .collection('companies')
    .doc(companyId)
    .collection('webhookSubscriptions')
    .where('isActive', '==', true)
    .get();

  const matchingSubs = subsSnapshot.docs
    .map(d => ({ id: d.id, ...(d.data() as any) }))
    .filter(sub => {
      const events: string[] = sub.subscribedEvents || [];
      return events.includes(eventType) || events.includes('*') || events.includes(eventType.toLowerCase());
    });

  if (matchingSubs.length === 0) {
    return { dispatchedCount: 0, deliveryLogs: [] };
  }

  const timestamp = new Date().toISOString();

  for (const sub of matchingSubs) {
    const deliveryId = `DLV-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const maxRetries = sub.retryCount || 5;

    const envelope = buildMinimalWebhookEnvelope(
      deliveryId,
      companyId,
      eventType,
      referenceId,
      timestamp,
      1,
      metadata
    );

    const serializedPayload = JSON.stringify(envelope);
    const signature = signWebhookPayload(sub.secret, timestamp, serializedPayload);

    let statusCode = 0;
    let responseSnippet = '';
    let isSuccess = false;

    try {
      const res = await fetch(sub.targetUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'LogSheetMuster-ServerWebhookDispatcher/2.0',
          'X-LSM-Signature': `sha256=${signature}`,
          'X-LSM-Timestamp': timestamp,
          'X-LSM-Event': eventType,
          'X-LSM-Delivery': deliveryId,
          'X-LSM-Attempt': '1'
        },
        body: serializedPayload
      });

      statusCode = res.status;
      responseSnippet = (await res.text()).substring(0, 500);
      isSuccess = res.ok;
    } catch (err: any) {
      statusCode = 0;
      responseSnippet = err.message || 'Connection / Network failure';
      isSuccess = false;
    }

    const log: WebhookDeliveryAttemptLog = {
      deliveryId,
      companyId,
      subscriptionId: sub.id,
      eventType,
      referenceId,
      targetUrl: sub.targetUrl,
      attemptNumber: 1,
      httpStatusCode: statusCode,
      responseSnippet,
      status: isSuccess ? 'DELIVERED' : 'FAILED',
      executedAt: timestamp
    };

    deliveryLogs.push(log);

    // Save delivery log
    await db
      .collection('companies')
      .doc(companyId)
      .collection('webhookDeliveries')
      .doc(deliveryId)
      .set(log);

    // Update subscription last status
    await db
      .collection('companies')
      .doc(companyId)
      .collection('webhookSubscriptions')
      .doc(sub.id)
      .update({
        lastDeliveryStatus: isSuccess ? 'SUCCESS' : 'FAILED',
        lastDeliveryAt: timestamp,
        updatedAt: timestamp
      });

    // If failed and retries allowed, queue retry
    if (!isSuccess && maxRetries > 1) {
      const retryId = `RTR-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
      const nextRetryAt = new Date(Date.now() + calculateBackoffMs(1)).toISOString();

      await db
        .collection('companies')
        .doc(companyId)
        .collection('webhookRetryQueue')
        .doc(retryId)
        .set({
          id: retryId,
          companyId,
          subscriptionId: sub.id,
          targetUrl: sub.targetUrl,
          secret: sub.secret,
          eventType,
          referenceId,
          metadata: metadata || {},
          attemptNumber: 2,
          maxAttempts: maxRetries,
          nextRetryAt,
          lastError: responseSnippet,
          lastHttpStatusCode: statusCode,
          status: 'PENDING_RETRY',
          createdAt: timestamp,
          updatedAt: timestamp
        });
    }
  }

  return { dispatchedCount: matchingSubs.length, deliveryLogs };
}

/**
 * Server API Handler: Trigger a test webhook or real event
 * POST /api/integrations/webhooks/dispatch-test
 */
export async function triggerWebhookHandler(req: Request, res: Response) {
  try {
    const { companyId, subscriptionId, eventType, referenceId, metadata } = req.body;

    if (!companyId) {
      return res.status(400).json({ error: 'Bad Request', message: 'companyId is required' });
    }

    const targetEventType = eventType || 'ATTENDANCE_PUNCH';
    const targetRefId = referenceId || `TEST-${Date.now()}`;

    const result = await dispatchServerWebhook({
      companyId,
      eventType: targetEventType,
      referenceId: targetRefId,
      metadata: metadata || { note: 'Triggered from Admin / Android Integration Center' }
    });

    return res.json({
      success: true,
      message: `Webhook dispatch completed. ${result.dispatchedCount} endpoints targeted.`,
      dispatchedCount: result.dispatchedCount,
      deliveryLogs: result.deliveryLogs
    });
  } catch (err: any) {
    console.error('[WebhookHandler] Error:', err);
    return res.status(500).json({ error: 'Internal Server Error', message: err.message });
  }
}

/**
 * Server API Handler: Process Retry Queue & DLQ migration
 * POST /api/integrations/webhooks/process-retries
 */
export async function processWebhookRetriesHandler(req: Request, res: Response) {
  try {
    const { companyId } = req.body;
    if (!companyId) {
      return res.status(400).json({ error: 'Bad Request', message: 'companyId is required' });
    }

    const db = getAdminDb();
    if (!db) {
      return res.status(503).json({ error: 'Service Unavailable', message: 'Database unavailable' });
    }

    const nowIso = new Date().toISOString();
    const snap = await db
      .collection('companies')
      .doc(companyId)
      .collection('webhookRetryQueue')
      .where('status', '==', 'PENDING_RETRY')
      .get();

    const dueItems = snap.docs
      .map(d => ({ id: d.id, ...(d.data() as any) }))
      .filter(item => item.nextRetryAt <= nowIso);

    let reprocessedCount = 0;
    let succeededCount = 0;
    let dlqCount = 0;

    for (const item of dueItems) {
      reprocessedCount++;
      const deliveryId = `DLV-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
      const timestamp = new Date().toISOString();

      const envelope = buildMinimalWebhookEnvelope(
        deliveryId,
        item.companyId,
        item.eventType,
        item.referenceId,
        timestamp,
        item.attemptNumber,
        item.metadata
      );

      const serializedPayload = JSON.stringify(envelope);
      const signature = signWebhookPayload(item.secret, timestamp, serializedPayload);

      let statusCode = 0;
      let responseSnippet = '';
      let isSuccess = false;

      try {
        const res = await fetch(item.targetUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'LogSheetMuster-ServerWebhookDispatcher/2.0',
            'X-LSM-Signature': `sha256=${signature}`,
            'X-LSM-Timestamp': timestamp,
            'X-LSM-Event': item.eventType,
            'X-LSM-Delivery': deliveryId,
            'X-LSM-Attempt': String(item.attemptNumber)
          },
          body: serializedPayload
        });

        statusCode = res.status;
        responseSnippet = (await res.text()).substring(0, 500);
        isSuccess = res.ok;
      } catch (err: any) {
        statusCode = 0;
        responseSnippet = err.message || 'Connection / Network failure';
        isSuccess = false;
      }

      const retryDocRef = db
        .collection('companies')
        .doc(companyId)
        .collection('webhookRetryQueue')
        .doc(item.id);

      if (isSuccess) {
        succeededCount++;
        await retryDocRef.update({
          status: 'DELIVERED',
          updatedAt: timestamp
        });
      } else {
        if (item.attemptNumber >= item.maxAttempts) {
          // Exhausted all retries -> Route to Dead Letter Queue (DLQ)
          dlqCount++;
          const dlqId = `DLQ-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
          await db
            .collection('companies')
            .doc(companyId)
            .collection('webhookDeadLetters')
            .doc(dlqId)
            .set({
              id: dlqId,
              companyId,
              subscriptionId: item.subscriptionId,
              targetUrl: item.targetUrl,
              eventType: item.eventType,
              referenceId: item.referenceId,
              totalAttempts: item.attemptNumber,
              lastHttpStatusCode: statusCode,
              lastError: responseSnippet,
              failedAt: timestamp,
              status: 'DEAD_LETTER'
            });

          await retryDocRef.update({
            status: 'EXHAUSTED',
            updatedAt: timestamp
          });
        } else {
          // Schedule next exponential backoff attempt
          const nextBackoffMs = calculateBackoffMs(item.attemptNumber);
          await retryDocRef.update({
            attemptNumber: item.attemptNumber + 1,
            nextRetryAt: new Date(Date.now() + nextBackoffMs).toISOString(),
            lastError: responseSnippet,
            lastHttpStatusCode: statusCode,
            updatedAt: timestamp
          });
        }
      }
    }

    return res.json({
      success: true,
      reprocessedCount,
      succeededCount,
      dlqCount
    });
  } catch (err: any) {
    console.error('[WebhookRetryHandler] Error:', err);
    return res.status(500).json({ error: 'Internal Server Error', message: err.message });
  }
}
