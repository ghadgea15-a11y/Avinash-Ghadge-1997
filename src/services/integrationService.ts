import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where 
} from 'firebase/firestore';
import { db } from '../firebase';
import { 
  ApiKeyRecord, 
  WebhookSubscriptionRecord, 
  WebhookDeliveryLogRecord, 
  SsoConfigRecord, 
  IntegrationConnectorRecord,
  WebhookEvent
} from '../types/integration';
import { AuditTrailService } from './auditTrailService';

// Cryptographic HMAC-SHA256 signer for Outbound Webhooks
export async function computeHmacSha256(secret: string, message: string): Promise<string> {
  if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
    const enc = new TextEncoder();
    const key = await window.crypto.subtle.importKey(
      'raw',
      enc.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    const signature = await window.crypto.subtle.sign('HMAC', key, enc.encode(message));
    return Array.from(new Uint8Array(signature))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }
  // Node / Server environment fallback
  try {
    const nodeCrypto = await import('crypto');
    return nodeCrypto.createHmac('sha256', secret).update(message).digest('hex');
  } catch {
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
    }
    throw new Error('HMAC-SHA256 implementation not available');
  }
}
export async function computeSha256(input: string): Promise<string> {
  if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
    const encoder = new TextEncoder();
    const data = encoder.encode(input);
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }
  // Node / Server environment or crypto fallback
  try {
    const nodeCrypto = await import('crypto');
    return nodeCrypto.createHash('sha256').update(input).digest('hex');
  } catch {
    // Web Crypto global fallback
    if (typeof crypto !== 'undefined' && crypto.subtle) {
      const encoder = new TextEncoder();
      const data = encoder.encode(input);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }
    throw new Error('Cryptographic SHA-256 implementation not available');
  }
}

function generateSecureRandomToken(byteLength = 24): string {
  if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
    const array = new Uint8Array(byteLength);
    window.crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  } else if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const array = new Uint8Array(byteLength);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }
  return Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2);
}

export class IntegrationService {
  // -------------------------------------------------------------
  // API KEYS
  // -------------------------------------------------------------
  static async getApiKeys(companyId: string): Promise<ApiKeyRecord[]> {
    try {
      const q = collection(db, 'companies', companyId, 'apiKeys');
      const snap = await getDocs(q);
      return snap.docs.map(d => ({ id: d.id, ...d.data() } as ApiKeyRecord));
    } catch (err) {
      console.error('Error fetching API keys:', err);
      return [];
    }
  }

  static async generateApiKey(
    companyId: string, 
    keyData: Partial<ApiKeyRecord>, 
    actor: { uid: string; name: string }
  ): Promise<{ keyRecord: ApiKeyRecord; plainTextKey: string }> {
    const rawRandom = generateSecureRandomToken(24);
    const plainTextKey = `lsm_live_${rawRandom}`;
    const keyPrefix = plainTextKey.substring(0, 16) + '...';
    
    // Store ONLY the one-way cryptographic SHA-256 hash at rest in Firestore
    const hashedSecret = await computeSha256(plainTextKey);
    const docRef = doc(collection(db, 'companies', companyId, 'apiKeys'));

    const record: ApiKeyRecord = {
      id: docRef.id,
      companyId,
      name: keyData.name || 'External ERP Key',
      keyPrefix,
      hashedSecret,
      status: 'ACTIVE',
      permissions: keyData.permissions || ['READ_ATTENDANCE', 'READ_EMPLOYEES'],
      rateLimitPerMinute: keyData.rateLimitPerMinute || 120,
      allowedIpRanges: keyData.allowedIpRanges || [],
      totalCallsCount: 0,
      createdAt: new Date().toISOString(),
      createdBy: actor.name
    };

    await setDoc(docRef, record);
    await AuditTrailService.recordEvent({
      companyId,
      actorUid: actor.uid,
      actorName: actor.name,
      actorRole: 'SYSTEM_ADMIN',
      module: 'INTEGRATION',
      action: 'API_KEY_CREATED',
      entityId: docRef.id,
      description: `Generated API Key: ${record.name} (${keyPrefix}) with SHA-256 hash storage`
    });

    // Plaintext key is returned to the user EXACTLY ONCE at creation time
    return { keyRecord: record, plainTextKey };
  }

  static async rotateApiKey(
    companyId: string,
    keyId: string,
    actor: { uid: string; name: string },
    options: { gracePeriodHours?: number; reason?: string } = {}
  ): Promise<{ oldKeyId: string; newKeyRecord: ApiKeyRecord; newPlainTextKey: string; gracePeriodExpiresAt: string }> {
    const oldDocRef = doc(db, 'companies', companyId, 'apiKeys', keyId);
    const oldDocSnap = await getDoc(oldDocRef);
    if (!oldDocSnap.exists()) {
      throw new Error(`API key ${keyId} not found`);
    }
    const oldData = oldDocSnap.data() as ApiKeyRecord;
    if (oldData.status === 'REVOKED') {
      throw new Error(`Cannot rotate revoked API key ${keyId}`);
    }

    const graceHours = options.gracePeriodHours ?? 24;
    const gracePeriodExpiresAt = new Date(Date.now() + graceHours * 3600 * 1000).toISOString();

    // Mark old key as ROTATED with grace period
    await updateDoc(oldDocRef, {
      status: 'ROTATED',
      rotatedAt: new Date().toISOString(),
      gracePeriodExpiresAt
    });

    // Generate new replacement key with identical permissions & rate limit
    const rawRandom = generateSecureRandomToken(24);
    const newPlainTextKey = `lsm_live_${rawRandom}`;
    const keyPrefix = newPlainTextKey.substring(0, 16) + '...';
    const hashedSecret = await computeSha256(newPlainTextKey);
    const newDocRef = doc(collection(db, 'companies', companyId, 'apiKeys'));

    const newRecord: ApiKeyRecord = {
      id: newDocRef.id,
      companyId,
      name: `${oldData.name} (Rotated)`,
      keyPrefix,
      hashedSecret,
      status: 'ACTIVE',
      permissions: oldData.permissions,
      rateLimitPerMinute: oldData.rateLimitPerMinute,
      allowedIpRanges: oldData.allowedIpRanges || [],
      totalCallsCount: 0,
      createdAt: new Date().toISOString(),
      createdBy: actor.name
    };

    await setDoc(newDocRef, newRecord);

    await AuditTrailService.recordEvent({
      companyId,
      actorUid: actor.uid,
      actorName: actor.name,
      actorRole: 'SYSTEM_ADMIN',
      module: 'INTEGRATION',
      action: 'API_KEY_ROTATED',
      entityId: newDocRef.id,
      description: `Rotated API key ${keyId} -> ${newDocRef.id} (${keyPrefix}) with ${graceHours}h grace period until ${gracePeriodExpiresAt}`
    });

    return {
      oldKeyId: keyId,
      newKeyRecord: newRecord,
      newPlainTextKey,
      gracePeriodExpiresAt
    };
  }

  static async revokeApiKey(
    companyId: string, 
    keyId: string, 
    actor: { uid: string; name: string },
    reason?: string
  ): Promise<void> {
    const docRef = doc(db, 'companies', companyId, 'apiKeys', keyId);
    await updateDoc(docRef, { 
      status: 'REVOKED',
      revokedAt: new Date().toISOString(),
      revocationReason: reason || 'Revoked by administrator'
    });
    await AuditTrailService.recordEvent({
      companyId,
      actorUid: actor.uid,
      actorName: actor.name,
      actorRole: 'SYSTEM_ADMIN',
      module: 'INTEGRATION',
      action: 'API_KEY_REVOKED',
      entityId: keyId,
      description: `Revoked API Key ${keyId}. Reason: ${reason || 'Administrator action'}`
    });
  }

  static async validateAndRateLimitApiKey(
    companyId: string,
    plainTextKey: string,
    requiredPermission?: string
  ): Promise<{ valid: boolean; keyRecord: ApiKeyRecord; remainingQuota: number }> {
    const hashedSecret = await computeSha256(plainTextKey);
    const q = query(
      collection(db, 'companies', companyId, 'apiKeys'),
      where('hashedSecret', '==', hashedSecret)
    );
    const snap = await getDocs(q);
    if (snap.empty) {
      throw new Error('Unauthorized: Invalid API Key');
    }

    const keyDoc = snap.docs[0];
    const keyRecord = { id: keyDoc.id, ...keyDoc.data() } as ApiKeyRecord;

    // Check status
    if (keyRecord.status === 'REVOKED' || keyRecord.status === 'EXPIRED') {
      throw new Error(`Unauthorized: API Key is ${keyRecord.status.toLowerCase()}`);
    }

    if (keyRecord.status === 'ROTATED') {
      if (keyRecord.gracePeriodExpiresAt && new Date(keyRecord.gracePeriodExpiresAt).getTime() < Date.now()) {
        throw new Error('Unauthorized: Rotated API Key grace period has expired');
      }
    }

    // Check permissions
    if (requiredPermission && keyRecord.permissions) {
      const hasPermission = keyRecord.permissions.includes('FULL_ACCESS') || keyRecord.permissions.includes(requiredPermission as any);
      if (!hasPermission) {
        throw new Error(`Forbidden: API key lacks required permission: ${requiredPermission}`);
      }
    }

    // Rate Limiting (1-minute fixed window counter)
    const now = Date.now();
    const windowDurationMs = 60 * 1000;
    const windowStart = keyRecord.rateLimitWindowStart ? new Date(keyRecord.rateLimitWindowStart).getTime() : 0;
    const currentCount = keyRecord.rateLimitWindowCount || 0;
    const limit = keyRecord.rateLimitPerMinute || 120;

    const docRef = doc(db, 'companies', companyId, 'apiKeys', keyRecord.id);

    if (now - windowStart > windowDurationMs) {
      // New window
      await updateDoc(docRef, {
        rateLimitWindowStart: new Date(now).toISOString(),
        rateLimitWindowCount: 1,
        lastUsedAt: new Date(now).toISOString(),
        totalCallsCount: (keyRecord.totalCallsCount || 0) + 1
      });
      return { valid: true, keyRecord, remainingQuota: limit - 1 };
    } else {
      if (currentCount >= limit) {
        const retryAfterSeconds = Math.ceil((windowStart + windowDurationMs - now) / 1000);
        throw new Error(`Too Many Requests: Rate limit of ${limit} req/min exceeded. Retry in ${retryAfterSeconds}s.`);
      }
      await updateDoc(docRef, {
        rateLimitWindowCount: currentCount + 1,
        lastUsedAt: new Date(now).toISOString(),
        totalCallsCount: (keyRecord.totalCallsCount || 0) + 1
      });
      return { valid: true, keyRecord, remainingQuota: limit - (currentCount + 1) };
    }
  }

  // -------------------------------------------------------------
  // WEBHOOKS
  // -------------------------------------------------------------
  static async getWebhookSubscriptions(companyId: string): Promise<WebhookSubscriptionRecord[]> {
    try {
      const q = collection(db, 'companies', companyId, 'webhookSubscriptions');
      const snap = await getDocs(q);
      return snap.docs.map(d => ({ id: d.id, ...d.data() } as WebhookSubscriptionRecord));
    } catch (err) {
      console.error('Error fetching webhook subscriptions:', err);
      return [];
    }
  }

  static async saveWebhookSubscription(
    companyId: string,
    subData: Partial<WebhookSubscriptionRecord>,
    actor: { uid: string; name: string }
  ): Promise<WebhookSubscriptionRecord> {
    const isNew = !subData.id;
    const docRef = isNew 
      ? doc(collection(db, 'companies', companyId, 'webhookSubscriptions'))
      : doc(db, 'companies', companyId, 'webhookSubscriptions', subData.id!);

    const secret = subData.secret || `whsec_${Math.random().toString(36).substring(2, 18)}`;
    const record: WebhookSubscriptionRecord = {
      id: docRef.id,
      companyId,
      name: subData.name || 'Outbound Webhook',
      targetUrl: subData.targetUrl || 'https://api.external-partner.com/webhook',
      secret,
      subscribedEvents: subData.subscribedEvents || ['attendance.marked', 'employee.created'],
      isActive: subData.isActive !== false,
      retryCount: subData.retryCount || 3,
      createdAt: subData.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await setDoc(docRef, record, { merge: true });
    await AuditTrailService.recordEvent({
      companyId,
      actorUid: actor.uid,
      actorName: actor.name,
      actorRole: 'SYSTEM_ADMIN',
      module: 'INTEGRATION',
      action: isNew ? 'WEBHOOK_REGISTERED' : 'WEBHOOK_UPDATED',
      entityId: docRef.id,
      description: `${isNew ? 'Registered' : 'Updated'} Webhook endpoint ${record.targetUrl}`
    });

    return record;
  }

  static async getWebhookDeliveries(companyId: string): Promise<WebhookDeliveryLogRecord[]> {
    try {
      const q = collection(db, 'companies', companyId, 'webhookDeliveries');
      const snap = await getDocs(q);
      return snap.docs.map(d => ({ id: d.id, ...d.data() } as WebhookDeliveryLogRecord));
    } catch (err) {
      return [];
    }
  }

  // -------------------------------------------------------------
  // OUTBOUND WEBHOOK DISPATCHER & DELIVERY WORKER
  // -------------------------------------------------------------

  /**
   * Dispatches a real-time event to all active subscribed webhook endpoints for a company.
   * Computes an HMAC-SHA256 signature using the endpoint's private secret, logs delivery status, and queues retries on failure.
   */
  static async dispatchWebhookEvent(
    companyId: string,
    event: WebhookEvent,
    payloadData: any
  ): Promise<{ dispatchedCount: number; deliveryLogs: WebhookDeliveryLogRecord[] }> {
    const { WebhookDispatcherService } = await import('./webhookDispatcherService');
    return WebhookDispatcherService.dispatchEvent(companyId, event, payloadData);
  }

  /**
   * Tests a specific webhook subscription by sending a synthetic ping event.
   */
  static async testWebhookEndpoint(
    companyId: string,
    subscriptionId: string,
    actor: { uid: string; name: string }
  ): Promise<{ success: boolean; statusCode: number; snippet: string; signatureSample: string }> {
    const subRef = doc(db, 'companies', companyId, 'webhookSubscriptions', subscriptionId);
    const subSnap = await getDoc(subRef);
    if (!subSnap.exists()) throw new Error('Webhook subscription not found');

    const sub = subSnap.data() as WebhookSubscriptionRecord;
    const timestamp = new Date().toISOString();
    const testDeliveryId = `TEST-${Date.now()}`;
    const testEvent: WebhookEvent = sub.subscribedEvents[0] || 'attendance.marked';

    const testPayload = {
      id: testDeliveryId,
      event: testEvent,
      companyId,
      timestamp,
      isTest: true,
      data: {
        message: 'Ping verification test from Log Sheet Muster Integration Center',
        triggeredBy: actor.name,
        triggeredAt: timestamp
      }
    };

    const serialized = JSON.stringify(testPayload);
    const signature = await computeHmacSha256(sub.secret, `${timestamp}.${serialized}`);

    let statusCode = 0;
    let snippet = '';

    try {
      const res = await fetch(sub.targetUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'LogSheetMuster-WebhookTester/2.0',
          'X-LSM-Signature': `sha256=${signature}`,
          'X-LSM-Timestamp': timestamp,
          'X-LSM-Event': testEvent,
          'X-LSM-Delivery': testDeliveryId
        },
        body: serialized
      });

      statusCode = res.status;
      snippet = (await res.text()).substring(0, 500);
    } catch (err: any) {
      statusCode = 0;
      snippet = err.message || 'Connection failed';
    }

    const logRecord: WebhookDeliveryLogRecord = {
      id: testDeliveryId,
      companyId,
      subscriptionId,
      event: testEvent,
      payloadReferenceId: 'SYNTHETIC_TEST',
      attemptNumber: 1,
      httpStatusCode: statusCode,
      responseBodySnippet: snippet,
      status: statusCode >= 200 && statusCode < 300 ? 'DELIVERED' : 'FAILED',
      executedAt: timestamp
    };

    await setDoc(doc(db, 'companies', companyId, 'webhookDeliveries', testDeliveryId), logRecord);
    await updateDoc(subRef, {
      lastDeliveryStatus: logRecord.status === 'DELIVERED' ? 'SUCCESS' : 'FAILED',
      lastDeliveryAt: timestamp,
      updatedAt: timestamp
    });

    return {
      success: logRecord.status === 'DELIVERED',
      statusCode,
      snippet,
      signatureSample: `sha256=${signature.substring(0, 16)}...`
    };
  }

  // -------------------------------------------------------------
  // SSO CONFIGURATION
  // -------------------------------------------------------------
  static async getSsoConfig(companyId: string): Promise<SsoConfigRecord | null> {
    try {
      const docRef = doc(db, 'companies', companyId, 'ssoConfigs', 'primary');
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        return { id: snap.id, ...snap.data() } as SsoConfigRecord;
      }
      return null;
    } catch (err) {
      return null;
    }
  }

  static async saveSsoConfig(
    companyId: string,
    ssoData: Partial<SsoConfigRecord>,
    actor: { uid: string; name: string }
  ): Promise<SsoConfigRecord> {
    const docRef = doc(db, 'companies', companyId, 'ssoConfigs', 'primary');
    const record: SsoConfigRecord = {
      id: 'primary',
      companyId,
      protocol: ssoData.protocol || 'SAML_2_0',
      isEnabled: !!ssoData.isEnabled,
      displayName: ssoData.displayName || 'Corporate Okta / Azure AD SSO',
      samlEntityId: ssoData.samlEntityId || '',
      samlSsoUrl: ssoData.samlSsoUrl || '',
      samlCertificateFingerprint: ssoData.samlCertificateFingerprint || '',
      oidcClientId: ssoData.oidcClientId || '',
      oidcIssuerUrl: ssoData.oidcIssuerUrl || '',
      enforceSsoOnly: !!ssoData.enforceSsoOnly,
      defaultRoleLevel: ssoData.defaultRoleLevel || 'A7_SKILLED_GUARD',
      updatedAt: new Date().toISOString()
    };

    await setDoc(docRef, record, { merge: true });
    await AuditTrailService.recordEvent({
      companyId,
      actorUid: actor.uid,
      actorName: actor.name,
      actorRole: 'SYSTEM_ADMIN',
      module: 'INTEGRATION',
      action: 'SSO_CONFIG_UPDATED',
      entityId: 'primary',
      description: `Configured Enterprise SSO (${record.protocol}) - Enabled: ${record.isEnabled}`
    });

    return record;
  }

  // -------------------------------------------------------------
  // ERP CONNECTORS & EXPORTS (Tally, Banking Batch)
  // -------------------------------------------------------------
  static async getConnectors(companyId: string): Promise<IntegrationConnectorRecord[]> {
    try {
      const q = collection(db, 'companies', companyId, 'integrationConnectors');
      const snap = await getDocs(q);
      return snap.docs.map(d => ({ id: d.id, ...d.data() } as IntegrationConnectorRecord));
    } catch (err) {
      return [];
    }
  }

  /**
   * Generates a real Tally ERP 9 / TallyPrime XML Journal Voucher by querying
   * real calculated payroll records for the specified company and period.
   */
  static async exportTallyPayrollVoucher(companyId: string, monthYear: string): Promise<string> {
    const formattedDate = monthYear ? monthYear.replace(/[^0-9]/g, '') : new Date().toISOString().slice(0, 7).replace('-', '');
    const dateStr = `${formattedDate}01`;
    const cycleId = `CYC-${monthYear}`;

    const cycleRef = doc(db, 'companies', companyId, 'payrollCycles', cycleId);
    const cycleSnap = await getDoc(cycleRef);
    if (!cycleSnap.exists()) {
      throw new Error(`Payroll cycle ${cycleId} not found. Cannot export empty or non-existent payroll.`);
    }

    const cycle = cycleSnap.data() as any;
    if (cycle.status !== 'APPROVED' && cycle.status !== 'LOCKED' && cycle.status !== 'DISBURSED') {
      throw new Error(`Cannot export Tally Voucher. Payroll cycle must be APPROVED, LOCKED, or DISBURSED. Current status: ${cycle.status}`);
    }

    let basicTotal = 0;
    let hraTotal = 0;
    let overtimeTotal = 0;
    let allowancesTotal = 0;
    let reimbursementsTotal = 0;
    let pfTotal = 0;
    let esicTotal = 0;
    let ptTotal = 0;
    let tdsTotal = 0;
    let netPayTotal = 0;
    let recordCount = 0;

    const q = query(collection(db, 'companies', companyId, 'payrollRecords'), where('cycleId', '==', cycleId));
    const payrollSnap = await getDocs(q);

    if (payrollSnap.empty) {
      throw new Error(`No payroll records found for cycle ${cycleId}.`);
    }

    for (const docSnap of payrollSnap.docs) {
      const rec = docSnap.data() as any;
      const calc = rec.calculations || {};
      const earnings = calc.earnings || {};
      const deductions = calc.deductions || {};

      basicTotal += Number(earnings.basic || 0);
      hraTotal += Number(earnings.hra || 0);
      overtimeTotal += Number(earnings.overtimePay || 0);
      allowancesTotal += Number(earnings.otherAllowances || 0);
      reimbursementsTotal += Number(earnings.reimbursements || 0);
      pfTotal += Number(deductions.pf || 0);
      esicTotal += Number(deductions.esic || 0);
      ptTotal += Number(deductions.pt || 0);
      tdsTotal += Number(deductions.tds || 0);
      netPayTotal += Number(calc.netPay || 0);
      recordCount++;
    }

    // Reconciliation Check: Expected totalNetPay vs Sum of exported lines
    // Allow small floating point drift
    const expectedNet = Number(cycle.totalNetPay || 0);
    if (Math.abs(expectedNet - netPayTotal) > 1.0) {
      throw new Error(`Reconciliation Failure: Batch net pay (${expectedNet}) does not match sum of individual records (${netPayTotal}). Export aborted.`);
    }

    // Generate Tally-compliant XML Ledger Voucher format
    const xmlContent = `<?xml version="1.0" encoding="utf-8"?>
<ENVELOPE>
  <HEADER>
    <TALLYREQUEST>Import Data</TALLYREQUEST>
  </HEADER>
  <BODY>
    <IMPORTDATA>
      <REQUESTDESC>
        <REPORTNAME>Vouchers</REPORTNAME>
        <STATICVARIABLES>
          <SVCURRENTCOMPANY>${companyId}</SVCURRENTCOMPANY>
        </STATICVARIABLES>
      </REQUESTDESC>
      <REQUESTDATA>
        <TALLYMESSAGE xmlns:UDF="TallyUDF">
          <VOUCHER VCHTYPE="Journal" ACTION="Create">
            <DATE>${dateStr}</DATE>
            <NARRATION>Log Sheet Muster - Payroll & Operational Wages for ${monthYear || 'Current Month'}</NARRATION>
            <VOUCHERTYPENAME>Journal</VOUCHERTYPENAME>
            
            <!-- DEBITS: Wage & Allowance Expense Ledgers -->
            <ALLLEDGERENTRIES.LIST>
              <LEDGERNAME>Security & Operational Wages - Basic</LEDGERNAME>
              <ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>
              <AMOUNT>-${basicTotal.toFixed(2)}</AMOUNT>
            </ALLLEDGERENTRIES.LIST>
            <ALLLEDGERENTRIES.LIST>
              <LEDGERNAME>House Rent Allowance (HRA)</LEDGERNAME>
              <ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>
              <AMOUNT>-${hraTotal.toFixed(2)}</AMOUNT>
            </ALLLEDGERENTRIES.LIST>
            <ALLLEDGERENTRIES.LIST>
              <LEDGERNAME>Overtime & Special Duty Expense</LEDGERNAME>
              <ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>
              <AMOUNT>-${overtimeTotal.toFixed(2)}</AMOUNT>
            </ALLLEDGERENTRIES.LIST>
            <ALLLEDGERENTRIES.LIST>
              <LEDGERNAME>Operational & Uniform Allowances</LEDGERNAME>
              <ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>
              <AMOUNT>-${allowancesTotal.toFixed(2)}</AMOUNT>
            </ALLLEDGERENTRIES.LIST>
            <ALLLEDGERENTRIES.LIST>
              <LEDGERNAME>Expense Reimbursements</LEDGERNAME>
              <ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>
              <AMOUNT>-${reimbursementsTotal.toFixed(2)}</AMOUNT>
            </ALLLEDGERENTRIES.LIST>

            <!-- CREDITS: Statutory Liabilities & Net Salaries Payable -->
            <ALLLEDGERENTRIES.LIST>
              <LEDGERNAME>Provident Fund Payable (PF Liability)</LEDGERNAME>
              <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
              <AMOUNT>${pfTotal.toFixed(2)}</AMOUNT>
            </ALLLEDGERENTRIES.LIST>
            <ALLLEDGERENTRIES.LIST>
              <LEDGERNAME>ESIC Payable (Employee State Insurance)</LEDGERNAME>
              <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
              <AMOUNT>${esicTotal.toFixed(2)}</AMOUNT>
            </ALLLEDGERENTRIES.LIST>
            <ALLLEDGERENTRIES.LIST>
              <LEDGERNAME>Professional Tax Payable (PT)</LEDGERNAME>
              <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
              <AMOUNT>${ptTotal.toFixed(2)}</AMOUNT>
            </ALLLEDGERENTRIES.LIST>
            <ALLLEDGERENTRIES.LIST>
              <LEDGERNAME>TDS on Salaries Payable</LEDGERNAME>
              <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
              <AMOUNT>${tdsTotal.toFixed(2)}</AMOUNT>
            </ALLLEDGERENTRIES.LIST>
            <ALLLEDGERENTRIES.LIST>
              <LEDGERNAME>Salaries Payable / Net Payout</LEDGERNAME>
              <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
              <AMOUNT>${netPayTotal.toFixed(2)}</AMOUNT>
            </ALLLEDGERENTRIES.LIST>
          </VOUCHER>
        </TALLYMESSAGE>
      </REQUESTDATA>
    </IMPORTDATA>
  </BODY>
</ENVELOPE>`;

    return xmlContent;
  }

  /**
   * Fetches finalized/approved payroll cycles for export
   */
  static async getApprovedPayrollCycles(companyId: string): Promise<Array<{ id: string; monthYear: string; totalNetPay: number; status: string; totalEmployees: number }>> {
    try {
      const q = query(
        collection(db, 'companies', companyId, 'payrollCycles'),
        where('status', 'in', ['APPROVED', 'LOCKED', 'DISBURSED'])
      );
      const snap = await getDocs(q);
      return snap.docs.map(d => {
        const data = d.data();
        return {
          id: d.id,
          monthYear: data.monthYear || data.period || d.id.replace('CYC-', ''),
          totalNetPay: Number(data.totalNetPay || 0),
          status: data.status,
          totalEmployees: Number(data.totalEmployees || data.processedCount || 0)
        };
      });
    } catch (err) {
      console.error('Failed to get approved payroll cycles:', err);
      return [];
    }
  }

  /**
   * Generates a real RBI NEFT/RTGS Batch Payout CSV conforming to specific corporate banking specifications.
   * Supported formats:
   * - HDFC_ENET: HDFC Bank Corporate ENet Bulk Payment Specification
   * - ICICI_CIB: ICICI Bank Corporate Internet Banking Bulk Payout Specification
   * - SBI_CMP: State Bank of India Corporate Cash Management Portal Specification
   * - AXIS_CORP: Axis Bank Corporate Bulk Payment Specification
   */
  static async exportBankNeftCsv(
    companyId: string, 
    monthYear: string,
    bankFormat: 'HDFC_ENET' | 'ICICI_CIB' | 'SBI_CMP' | 'AXIS_CORP' = 'HDFC_ENET'
  ): Promise<{ csvContent: string; totalExported: number; recordCount: number; bankFormat: string }> {
    const cycleId = `CYC-${monthYear}`;
    
    // 1. Check cycle status
    const cycleRef = doc(db, 'companies', companyId, 'payrollCycles', cycleId);
    const cycleSnap = await getDoc(cycleRef);
    if (!cycleSnap.exists()) {
      throw new Error(`Payroll cycle ${cycleId} not found in database.`);
    }
    const cycle = cycleSnap.data() as any;
    if (cycle.status !== 'APPROVED' && cycle.status !== 'LOCKED' && cycle.status !== 'DISBURSED') {
      throw new Error(`Cannot export NEFT batch. Payroll cycle must be in APPROVED, LOCKED, or DISBURSED state. Current status: ${cycle.status}`);
    }

    // 2. Fetch employees map for banking info
    const empSnap = await getDocs(collection(db, 'companies', companyId, 'employees'));
    const empMap = new Map<string, any>();
    empSnap.docs.forEach(d => {
      const emp = d.data();
      empMap.set(d.id, emp);
      if (emp.employeeId) empMap.set(emp.employeeId, emp);
    });

    // 3. Fetch payroll records for this batch
    const q = query(collection(db, 'companies', companyId, 'payrollRecords'), where('cycleId', '==', cycleId));
    const payrollSnap = await getDocs(q);

    if (payrollSnap.empty) {
      throw new Error(`No individual payroll line items found for cycle ${cycleId}.`);
    }

    const valueDate = new Date().toISOString().split('T')[0].split('-').reverse().join('/'); // DD/MM/YYYY
    const rows: string[] = [];
    let netPayTotal = 0;
    let missingBankDetailsCount = 0;

    payrollSnap.docs.forEach((d, idx) => {
      const rec = d.data() as any;
      const emp = empMap.get(rec.employeeId) || {};
      const name = (rec.employeeName || `${emp.firstName || ''} ${emp.lastName || ''}`.trim() || `Employee ${rec.employeeId}`).replace(/[",\n\r]/g, ' ');
      const account = (emp.bankAccount || emp.accountNumber || emp.bankAccountNo || emp.bankAccountNumber || emp.bankDetails?.accountNumber || '').trim();
      const ifsc = (emp.ifscCode || emp.ifsc || emp.bankDetails?.ifscCode || '').trim().toUpperCase();
      const netPay = Number(rec.calculations?.netPay || rec.netPay || rec.netSalary || rec.netAmount || 0);
      
      if (netPay > 0) {
        if (!account || !ifsc) {
          missingBankDetailsCount++;
          console.warn(`[BankNEFTExport] Skipping employee ${name} (${rec.employeeId}) due to missing bank account or IFSC code.`);
          return;
        }
        const refCode = `PAY-${monthYear.replace('-', '')}-${String(idx + 1).padStart(4, '0')}`;
        const amountStr = netPay.toFixed(2);
        
        switch (bankFormat) {
          case 'HDFC_ENET':
            // HDFC ENet Format: Transaction Type, Debit Account No, Beneficiary Account No, Beneficiary Name, Amount, Beneficiary IFSC, Value Date, Customer Ref No
            rows.push(`NEFT,,${account},"${name}",${amountStr},${ifsc},${valueDate},${refCode}`);
            break;
          case 'ICICI_CIB':
            // ICICI CIB Format: Payment Mode, Debit Account No, Beneficiary Account No, Beneficiary Name, Amount, Currency, Beneficiary IFSC, Remarks/Txn Ref
            rows.push(`NEFT,,${account},"${name}",${amountStr},INR,${ifsc},${refCode}`);
            break;
          case 'SBI_CMP':
            // SBI CMP Format: Transaction Type, Debit Account No, Txn Amount, Beneficiary Account No, Beneficiary IFSC, Beneficiary Name, Remarks, Value Date
            rows.push(`NEFT,,${amountStr},${account},${ifsc},"${name}",${refCode},${valueDate}`);
            break;
          case 'AXIS_CORP':
            // Axis Corporate Format: TXN_TYPE, DR_ACC_NO, CR_ACC_NO, AMOUNT, CURRENCY, IFSC_CODE, BENEFICIARY_NAME, CUSTOMER_REF_NO
            rows.push(`NEFT,,${account},${amountStr},INR,${ifsc},"${name}",${refCode}`);
            break;
          default:
            rows.push(`NEFT,,${account},"${name}",${amountStr},${ifsc},${valueDate},${refCode}`);
            break;
        }
        netPayTotal += netPay;
      }
    });

    if (rows.length === 0) {
      throw new Error(`No valid payout records generated. All employees in this batch either have 0 net pay or are missing bank accounts/IFSC codes.`);
    }

    // 4. Strict Financial Reconciliation Check
    const expectedNet = Number(cycle.totalNetPay || 0);
    if (Math.abs(expectedNet - netPayTotal) > 1.0) {
      throw new Error(
        `Financial Reconciliation Failure: Exported total (₹${netPayTotal.toLocaleString('en-IN')}) does not match approved batch total (₹${expectedNet.toLocaleString('en-IN')}). ` +
        (missingBankDetailsCount > 0 
          ? `${missingBankDetailsCount} employee(s) were excluded due to missing bank/IFSC details. Update employee master records before exporting.`
          : `Discrepancy detected between payroll ledger and individual line items. Export aborted for financial safety.`)
      );
    }

    let header = '';
    switch (bankFormat) {
      case 'HDFC_ENET':
        header = 'Transaction Type,Debit Account No,Beneficiary Account No,Beneficiary Name,Amount,Beneficiary IFSC,Value Date,Customer Ref No\n';
        break;
      case 'ICICI_CIB':
        header = 'Payment Mode,Debit Account No,Beneficiary Account No,Beneficiary Name,Amount,Currency,Beneficiary IFSC,Remarks/Txn Ref\n';
        break;
      case 'SBI_CMP':
        header = 'Transaction Type,Debit Account No,Txn Amount,Beneficiary Account No,Beneficiary IFSC,Beneficiary Name,Remarks,Value Date\n';
        break;
      case 'AXIS_CORP':
        header = 'TXN_TYPE,DR_ACC_NO,CR_ACC_NO,AMOUNT,CURRENCY,IFSC_CODE,BENEFICIARY_NAME,CUSTOMER_REF_NO\n';
        break;
    }

    return {
      csvContent: header + rows.join('\n'),
      totalExported: netPayTotal,
      recordCount: rows.length,
      bankFormat
    };
  }

  /**
   * Generates a SAP IDoc (HRMD_A / WPUUMS) Payroll Posting.
   * Explicitly marks this connector as not yet implemented per enterprise architecture guidelines.
   */
  static async exportSapIdoc(companyId: string, monthYear: string): Promise<string> {
    throw new Error('SAP IDoc connector is currently in active development and requires an on-premise SAP RFC Gateway / SAP BTP Middleware. Please use Tally ERP XML or Corporate Banking NEFT CSV exports.');
  }
}