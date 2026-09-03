export type ApiKeyStatus = 'ACTIVE' | 'REVOKED' | 'EXPIRED' | 'ROTATED';
export type ApiKeyPermission = 'READ_EMPLOYEES' | 'WRITE_EMPLOYEES' | 'READ_ATTENDANCE' | 'WRITE_ATTENDANCE' | 'READ_PAYROLL' | 'READ_INCIDENTS' | 'FULL_ACCESS';

export interface ApiKeyRecord {
  id: string;
  companyId: string;
  name: string;
  keyPrefix: string; // e.g. "lsm_live_8f3a..."
  hashedSecret: string; // SHA-256 cryptographic one-way hash
  status: ApiKeyStatus;
  permissions: ApiKeyPermission[];
  rateLimitPerMinute: number; // e.g. 120
  allowedIpRanges?: string[];
  expiresAt?: string;
  lastUsedAt?: string;
  totalCallsCount: number;
  createdAt: string;
  createdBy: string;
  rotatedAt?: string;
  gracePeriodExpiresAt?: string;
  revokedAt?: string;
  revocationReason?: string;
  rateLimitWindowStart?: string;
  rateLimitWindowCount?: number;
}

export type WebhookEvent = 
  | 'employee.created'
  | 'employee.updated'
  | 'employee.terminated'
  | 'attendance.marked'
  | 'attendance.anomaly'
  | 'leave.applied'
  | 'leave.approved'
  | 'leave.rejected'
  | 'payroll.finalized'
  | 'incident.reported'
  | 'incident.resolved'
  | 'expense.approved';

export interface WebhookSubscriptionRecord {
  id: string;
  companyId: string;
  name: string;
  targetUrl: string;
  secret: string; // Used for HMAC-SHA256 signature
  subscribedEvents: WebhookEvent[];
  isActive: boolean;
  retryCount: number;
  lastDeliveryStatus?: 'SUCCESS' | 'FAILED' | 'PENDING';
  lastDeliveryAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface WebhookDeliveryLogRecord {
  id: string;
  companyId: string;
  subscriptionId: string;
  event: WebhookEvent;
  payloadReferenceId: string; // Reference to record ID (never store full PII in delivery log)
  attemptNumber: number;
  httpStatusCode: number;
  responseBodySnippet?: string;
  status: 'DELIVERED' | 'FAILED' | 'RETRYING';
  executedAt: string;
}

export type SsoProtocol = 'SAML_2_0' | 'OIDC' | 'GOOGLE_WORKSPACE';

export interface SsoConfigRecord {
  id: string;
  companyId: string;
  protocol: SsoProtocol;
  isEnabled: boolean;
  displayName: string;
  // SAML fields
  samlEntityId?: string;
  samlSsoUrl?: string;
  samlCertificateFingerprint?: string;
  // OIDC fields
  oidcClientId?: string;
  oidcIssuerUrl?: string;
  enforceSsoOnly: boolean; // Bypass PIN/Password for employees
  defaultRoleLevel: string; // e.g., 'A7_SKILLED_GUARD'
  updatedAt: string;
}

export type ConnectorType = 'TALLY_ERP' | 'BANK_NEFT_SBI' | 'BANK_NEFT_HDFC' | 'SLACK_ALERT' | 'MS_TEAMS_ALERT';

export interface IntegrationConnectorRecord {
  id: string;
  companyId: string;
  type: ConnectorType;
  name: string;
  status: 'CONNECTED' | 'DISCONNECTED' | 'ERROR';
  config: Record<string, any>;
  lastSyncedAt?: string;
  createdAt: string;
  updatedAt: string;
}
