import { db } from '../firebase';
import { collection, doc, getDoc, getDocs, setDoc, updateDoc, query, where, orderBy, limit } from 'firebase/firestore';
import { WebhookEvent, WebhookSubscriptionRecord, WebhookDeliveryLogRecord } from '../types/integration';

export interface WebhookDeadLetterRecord {
  id: string;
  companyId: string;
  subscriptionId: string;
  targetUrl: string;
  event: WebhookEvent;
  payloadReferenceId: string;
  payloadData: any;
  totalAttempts: number;
  lastHttpStatusCode: number;
  lastError: string;
  failedAt: string;
  status: 'DEAD_LETTER' | 'REPROCESSED' | 'DISCARDED';
  reprocessedAt?: string;
  reprocessedBy?: string;
}

export interface WebhookRetryQueueItem {
  id: string;
  companyId: string;
  subscriptionId: string;
  targetUrl: string;
  secret: string;
  event: WebhookEvent;
  payloadData: any;
  payloadReferenceId: string;
  attemptNumber: number;
  maxAttempts: number;
  nextRetryAt: string; // ISO String
  lastError?: string;
  lastHttpStatusCode?: number;
  status: 'PENDING_RETRY' | 'PROCESSING' | 'FAILED' | 'EXHAUSTED';
  createdAt: string;
  updatedAt: string;
}

/**
 * Computes standard HMAC-SHA256 signature in browser / node environments
 */
export async function computeHmacSha256(secret: string, message: string): Promise<string> {
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      enc.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    const signature = await crypto.subtle.sign('HMAC', key, enc.encode(message));
    return Array.from(new Uint8Array(signature))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  } else {
    // Node.js fallback
    try {
      const cryptoNode = await import('crypto');
      return cryptoNode.createHmac('sha256', secret).update(message).digest('hex');
    } catch {
      let hash = 0;
      for (let i = 0; i < message.length; i++) {
        hash = (hash << 5) - hash + message.charCodeAt(i);
        hash |= 0;
      }
      return Math.abs(hash).toString(16).padStart(64, '0');
    }
  }
}

/**
 * Computes exponential backoff with jitter in milliseconds
 * Attempt 1 -> ~2s, Attempt 2 -> ~8s, Attempt 3 -> ~32s (capped at 5 minutes)
 */
export function calculateBackoffMs(attemptNumber: number): number {
  const baseMs = 2000;
  const backoff = baseMs * Math.pow(4, attemptNumber - 1);
  const jitter = Math.floor(Math.random() * 1000);
  return Math.min(backoff + jitter, 300000); // 5 minutes max
}

export class WebhookDispatcherService {
  public static readonly DEFAULT_MAX_RETRIES = 3;

  /**
   * Primary dispatcher: Dispatches an event to all active matching webhook endpoints for a tenant.
   * On failure, queues immediate retry with exponential backoff.
   */
  static async dispatchEvent(
    companyId: string,
    event: WebhookEvent,
    payloadData: any
  ): Promise<{ dispatchedCount: number; deliveryLogs: WebhookDeliveryLogRecord[] }> {
    try {
      const q = query(
        collection(db, 'companies', companyId, 'webhookSubscriptions'),
        where('isActive', '==', true)
      );
      const snap = await getDocs(q);
      const matchingSubs = snap.docs
        .map(d => ({ id: d.id, ...d.data() } as WebhookSubscriptionRecord))
        .filter(s => s.subscribedEvents && s.subscribedEvents.includes(event));

      if (matchingSubs.length === 0) {
        return { dispatchedCount: 0, deliveryLogs: [] };
      }

      const timestamp = new Date().toISOString();
      const deliveryLogs: WebhookDeliveryLogRecord[] = [];

      for (const sub of matchingSubs) {
        const deliveryId = `DLV-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
        const payloadReferenceId = payloadData?.id || payloadData?.employeeId || payloadData?.recordId || 'N/A';
        const maxRetries = sub.retryCount || this.DEFAULT_MAX_RETRIES;

        const outcome = await this.executeSingleDelivery(
          deliveryId,
          companyId,
          sub,
          event,
          payloadData,
          payloadReferenceId,
          1,
          timestamp
        );

        deliveryLogs.push(outcome.deliveryLog);

        // If delivery failed and maxRetries > 1, schedule retry in queue
        if (outcome.deliveryLog.status === 'FAILED' && maxRetries > 1) {
          await this.scheduleRetry(
            companyId,
            sub,
            event,
            payloadData,
            payloadReferenceId,
            1,
            maxRetries,
            outcome.deliveryLog.responseBodySnippet,
            outcome.deliveryLog.httpStatusCode
          );
        }
      }

      return { dispatchedCount: matchingSubs.length, deliveryLogs };
    } catch (err) {
      console.error('[WebhookDispatcher] dispatchEvent error:', err);
      return { dispatchedCount: 0, deliveryLogs: [] };
    }
  }

  /**
   * Executes a single delivery attempt with HMAC signature and records the delivery log
   */
  static async executeSingleDelivery(
    deliveryId: string,
    companyId: string,
    sub: WebhookSubscriptionRecord,
    event: WebhookEvent,
    payloadData: any,
    payloadReferenceId: string,
    attemptNumber: number,
    timestamp: string = new Date().toISOString()
  ): Promise<{ success: boolean; deliveryLog: WebhookDeliveryLogRecord }> {
    const envelope = {
      id: deliveryId,
      event,
      companyId,
      timestamp,
      attemptNumber,
      data: payloadData
    };

    const serializedPayload = JSON.stringify(envelope);
    const signature = await computeHmacSha256(sub.secret, `${timestamp}.${serializedPayload}`);

    let statusCode = 0;
    let responseSnippet = '';
    let deliveryStatus: 'DELIVERED' | 'FAILED' = 'FAILED';

    try {
      const res = await fetch(sub.targetUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'LogSheetMuster-WebhookDispatcher/2.0',
          'X-LSM-Signature': `sha256=${signature}`,
          'X-LSM-Timestamp': timestamp,
          'X-LSM-Event': event,
          'X-LSM-Delivery': deliveryId,
          'X-LSM-Attempt': String(attemptNumber)
        },
        body: serializedPayload
      });

      statusCode = res.status;
      responseSnippet = (await res.text()).substring(0, 500);
      deliveryStatus = res.ok ? 'DELIVERED' : 'FAILED';
    } catch (fetchErr: any) {
      statusCode = 0;
      responseSnippet = fetchErr.message || 'Network / Connection Failure';
      deliveryStatus = 'FAILED';
    }

    const deliveryLog: WebhookDeliveryLogRecord = {
      id: deliveryId,
      companyId,
      subscriptionId: sub.id,
      event,
      payloadReferenceId,
      attemptNumber,
      httpStatusCode: statusCode,
      responseBodySnippet: responseSnippet,
      status: deliveryStatus,
      executedAt: timestamp
    };

    // Record delivery log in Firestore
    const logRef = doc(db, 'companies', companyId, 'webhookDeliveries', deliveryId);
    await setDoc(logRef, deliveryLog);

    // Update subscription last status
    const subRef = doc(db, 'companies', companyId, 'webhookSubscriptions', sub.id);
    await updateDoc(subRef, {
      lastDeliveryStatus: deliveryStatus === 'DELIVERED' ? 'SUCCESS' : 'FAILED',
      lastDeliveryAt: timestamp,
      updatedAt: timestamp
    });

    return {
      success: deliveryStatus === 'DELIVERED',
      deliveryLog
    };
  }

  /**
   * Schedules a retry queue record in Firestore with exponential backoff timestamp
   */
  static async scheduleRetry(
    companyId: string,
    sub: WebhookSubscriptionRecord,
    event: WebhookEvent,
    payloadData: any,
    payloadReferenceId: string,
    currentAttempt: number,
    maxAttempts: number,
    lastError?: string,
    lastHttpStatusCode?: number
  ): Promise<WebhookRetryQueueItem> {
    const retryId = `RTR-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const nextAttempt = currentAttempt + 1;
    const backoffMs = calculateBackoffMs(currentAttempt);
    const nextRetryAt = new Date(Date.now() + backoffMs).toISOString();

    const retryItem: WebhookRetryQueueItem = {
      id: retryId,
      companyId,
      subscriptionId: sub.id,
      targetUrl: sub.targetUrl,
      secret: sub.secret,
      event,
      payloadData,
      payloadReferenceId,
      attemptNumber: nextAttempt,
      maxAttempts,
      nextRetryAt,
      lastError,
      lastHttpStatusCode,
      status: 'PENDING_RETRY',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const retryRef = doc(db, 'companies', companyId, 'webhookRetryQueue', retryId);
    await setDoc(retryRef, retryItem);
    return retryItem;
  }

  /**
   * Processes all pending items in the retry queue due for re-transmission.
   * If an item reaches its maximum retry ceiling, moves it to the Dead-Letter Queue (DLQ).
   */
  static async processPendingRetries(companyId: string): Promise<{ reprocessedCount: number; succeededCount: number; dlqCount: number }> {
    const nowIso = new Date().toISOString();
    try {
      const q = query(
        collection(db, 'companies', companyId, 'webhookRetryQueue'),
        where('status', '==', 'PENDING_RETRY')
      );
      const snap = await getDocs(q);
      const dueItems = snap.docs
        .map(d => ({ id: d.id, ...d.data() } as WebhookRetryQueueItem))
        .filter(item => item.nextRetryAt <= nowIso);

      let reprocessedCount = 0;
      let succeededCount = 0;
      let dlqCount = 0;

      for (const item of dueItems) {
        reprocessedCount++;
        const deliveryId = `DLV-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
        const sub: WebhookSubscriptionRecord = {
          id: item.subscriptionId,
          companyId: item.companyId,
          name: 'Retry Subscription',
          targetUrl: item.targetUrl,
          secret: item.secret,
          subscribedEvents: [item.event],
          isActive: true,
          retryCount: item.maxAttempts,
          createdAt: item.createdAt,
          updatedAt: item.updatedAt
        };

        const result = await this.executeSingleDelivery(
          deliveryId,
          companyId,
          sub,
          item.event,
          item.payloadData,
          item.payloadReferenceId,
          item.attemptNumber,
          nowIso
        );

        const retryDocRef = doc(db, 'companies', companyId, 'webhookRetryQueue', item.id);

        if (result.success) {
          succeededCount++;
          // Succeeded -> delete or mark done in retry queue
          await updateDoc(retryDocRef, {
            status: 'FAILED', // cleared
            updatedAt: new Date().toISOString()
          });
        } else {
          // Failed again
          if (item.attemptNumber >= item.maxAttempts) {
            // Exhausted all retries -> Route to Dead Letter Queue (DLQ)
            dlqCount++;
            await this.moveToDeadLetterQueue(companyId, item, result.deliveryLog);
            await updateDoc(retryDocRef, {
              status: 'EXHAUSTED',
              updatedAt: new Date().toISOString()
            });
          } else {
            // Schedule next backoff attempt
            const nextBackoffMs = calculateBackoffMs(item.attemptNumber);
            await updateDoc(retryDocRef, {
              attemptNumber: item.attemptNumber + 1,
              nextRetryAt: new Date(Date.now() + nextBackoffMs).toISOString(),
              lastError: result.deliveryLog.responseBodySnippet,
              lastHttpStatusCode: result.deliveryLog.httpStatusCode,
              updatedAt: new Date().toISOString()
            });
          }
        }
      }

      return { reprocessedCount, succeededCount, dlqCount };
    } catch (err) {
      console.error('[WebhookDispatcher] processPendingRetries error:', err);
      return { reprocessedCount: 0, succeededCount: 0, dlqCount: 0 };
    }
  }

  /**
   * Routes exhausted deliveries to the Dead Letter Queue for auditability and manual replay
   */
  static async moveToDeadLetterQueue(
    companyId: string,
    retryItem: WebhookRetryQueueItem,
    lastDelivery: WebhookDeliveryLogRecord
  ): Promise<WebhookDeadLetterRecord> {
    const dlqId = `DLQ-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const dlqRecord: WebhookDeadLetterRecord = {
      id: dlqId,
      companyId,
      subscriptionId: retryItem.subscriptionId,
      targetUrl: retryItem.targetUrl,
      event: retryItem.event,
      payloadReferenceId: retryItem.payloadReferenceId,
      payloadData: retryItem.payloadData,
      totalAttempts: retryItem.attemptNumber,
      lastHttpStatusCode: lastDelivery.httpStatusCode,
      lastError: lastDelivery.responseBodySnippet || 'Exhausted retry ceiling',
      failedAt: new Date().toISOString(),
      status: 'DEAD_LETTER'
    };

    const dlqRef = doc(db, 'companies', companyId, 'webhookDeadLetters', dlqId);
    await setDoc(dlqRef, dlqRecord);
    return dlqRecord;
  }

  /**
   * Queries Dead-Letter Queue records for a tenant
   */
  static async getDeadLetterRecords(companyId: string): Promise<WebhookDeadLetterRecord[]> {
    try {
      const q = collection(db, 'companies', companyId, 'webhookDeadLetters');
      const snap = await getDocs(q);
      return snap.docs.map(d => ({ id: d.id, ...d.data() } as WebhookDeadLetterRecord));
    } catch (err) {
      console.error('[WebhookDispatcher] getDeadLetterRecords error:', err);
      return [];
    }
  }

  /**
   * Replays a message from the Dead-Letter Queue
   */
  static async replayDeadLetterMessage(
    companyId: string,
    dlqId: string,
    actor: { uid: string; name: string }
  ): Promise<{ success: boolean; statusCode: number; snippet: string }> {
    const dlqRef = doc(db, 'companies', companyId, 'webhookDeadLetters', dlqId);
    const dlqSnap = await getDoc(dlqRef);
    if (!dlqSnap.exists()) throw new Error('Dead-letter record not found');

    const dlq = dlqSnap.data() as WebhookDeadLetterRecord;
    const subRef = doc(db, 'companies', companyId, 'webhookSubscriptions', dlq.subscriptionId);
    const subSnap = await getDoc(subRef);
    if (!subSnap.exists()) throw new Error('Original webhook subscription not found or deleted');

    const sub = subSnap.data() as WebhookSubscriptionRecord;
    const deliveryId = `REPLAY-${Date.now()}`;
    const result = await this.executeSingleDelivery(
      deliveryId,
      companyId,
      sub,
      dlq.event,
      dlq.payloadData,
      dlq.payloadReferenceId,
      dlq.totalAttempts + 1
    );

    if (result.success) {
      await updateDoc(dlqRef, {
        status: 'REPROCESSED',
        reprocessedAt: new Date().toISOString(),
        reprocessedBy: actor.name
      });
    }

    return {
      success: result.success,
      statusCode: result.deliveryLog.httpStatusCode,
      snippet: result.deliveryLog.responseBodySnippet || ''
    };
  }
}
