import { Timestamp } from 'firebase/firestore';

export type PlatformRole = 'SUPER_ADMIN' | 'SUPPORT_AUDITOR' | 'PLATFORM_OPS';

export interface SuperAdminUser {
  uid: string;
  id?: string;
  email: string;
  name?: string;
  displayName?: string;
  phone?: string;
  role: PlatformRole;
  status: 'ACTIVE' | 'SUSPENDED';
  mfaEnabled?: boolean;
  createdBy?: string;
  createdAt: Timestamp | string;
  lastLoginAt?: Timestamp | string;
  updatedAt?: Timestamp | string;
}

export type TenantStatus = 'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'TERMINATED';

export type SubscriptionPlan = 'STARTER' | 'PROFESSIONAL' | 'ENTERPRISE';

export interface CompanyTenant {
  id: string; // Firestore Document ID = companyId
  companyCode: string; // Unique, uppercase, indexing friendly
  name: string;
  subscriptionPlan: SubscriptionPlan;
  enabledModules: string[]; // e.g., ['HCM', 'WFM', 'FINANCE', 'BPM', ...]
  status: TenantStatus;
  adminEmail: string;
  adminName?: string;
  maxEmployees: number;
  maxSites: number;
  currentEmployeesCount?: number;
  currentSitesCount?: number;
  createdAt: Timestamp | string;
  updatedAt: Timestamp | string;
}

export interface TenantData {
  id: string;
  companyCode?: string;
  name: string;
  subscriptionPlan: string;
  enabledModules?: string[];
  status: string;
  adminEmail?: string;
  adminName?: string;
  maxEmployees?: number;
  maxSites?: number;
  currentEmployeesCount?: number;
  currentSitesCount?: number;
  createdAt: string;
  updatedAt?: string;
}

export type PlatformAuditAction = 
  | 'CREATE_TENANT' 
  | 'UPDATE_TENANT_STATUS' 
  | 'SUSPEND_TENANT' 
  | 'REACTIVATE_TENANT'
  | 'TERMINATE_TENANT'
  | 'UPDATE_MODULE_ENTITLEMENTS' 
  | 'UPDATE_SUBSCRIPTION_PLAN'
  | 'ASSIGN_PLAN'
  | 'CREATE_PLATFORM_ADMIN'
  | 'UPDATE_PLATFORM_ADMIN'
  | 'TOGGLE_ADMIN_STATUS'
  | 'CREATE_SUPPORT_SESSION'
  | 'REVOKE_SUPPORT_SESSION'
  | 'UPDATE_GLOBAL_CONFIG'
  | 'BROADCAST_NOTIFICATION'
  | 'EXPORT_PLATFORM_DATA'
  | 'SECURITY_EVENT_FLAGGED';

export interface PlatformAuditLog {
  id: string;
  actorUid: string;
  actorEmail: string;
  actorRole: PlatformRole | 'SUPER_ADMIN';
  action: PlatformAuditAction;
  target?: string;
  targetTenantId?: string;
  targetId?: string;
  reason?: string;
  before?: Record<string, any> | null;
  after?: Record<string, any> | null;
  metadata?: Record<string, any>;
  timestamp: Timestamp | string;
  correlationId?: string;
  ipAddress?: string;
}

export interface PlatformSecurityEvent {
  id: string;
  eventType: 
    | 'UNAUTHORIZED_ACCESS_ATTEMPT' 
    | 'FAILED_LOGIN' 
    | 'PRIVILEGE_ESCALATION_ATTEMPT' 
    | 'TOKEN_EXPIRED' 
    | 'MFA_CHALLENGE_FAILED'
    | 'CROSS_TENANT_BREACH_ATTEMPT'
    | 'SUSPICIOUS_IP_ACTIVITY';
  type?: string;
  severity: 'INFO' | 'WARNING' | 'HIGH' | 'CRITICAL';
  actorUid?: string;
  actorEmail?: string;
  userEmail?: string;
  companyId?: string;
  details: string;
  ipAddress?: string;
  resolved: boolean;
  resolvedAt?: string;
  resolvedBy?: string;
  timestamp: Timestamp | string;
}

export interface SupportAccessSessionRecord {
  id: string;
  sessionId: string;
  superAdminUid: string;
  superAdminEmail: string;
  targetCompanyId: string;
  targetCompanyName?: string;
  reason: string;
  scope: 'READ_ONLY' | 'MUTATION' | 'SUPPORT_MUTATION';
  status?: 'ACTIVE' | 'REVOKED' | 'EXPIRED';
  isActive: boolean;
  createdAt: number | string;
  expiresAt: number | string;
  revokedAt?: number | string | null;
  revokedBy?: string | null;
  auditLogId?: string;
}

export interface PlatformMonitoringMetrics {
  lastChecked: string;
  firestoreHealthy: boolean;
  firestoreHealth?: 'HEALTHY' | 'DEGRADED' | 'DOWN';
  firestoreLatencyMs?: number;
  authHealthy: boolean;
  authHealth?: 'HEALTHY' | 'DEGRADED' | 'DOWN';
  authLatencyMs?: number;
  storageHealthy: boolean;
  storageHealth?: 'HEALTHY' | 'DEGRADED' | 'DOWN';
  storageUsageMB: number;
  storageUsedGb?: number;
  activeTenantsCount: number;
  suspendedTenantsCount: number;
  totalUsersCount: number;
  activeSubscriptionsCount: number;
  avgLatencyMs: number;
  errorCount24h: number;
  errorRatePercentage?: number;
  syncQueuePending: number;
  activeSupportSessionsCount?: number;
}

export interface PlatformGlobalConfig {
  allowSelfRegistration: boolean;
  defaultTrialDays: number;
  maintenanceMode: boolean;
  maintenanceBannerMessage?: string;
  maintenanceMessage?: string;
  systemAnnouncement?: string;
  requireMfaForSuperAdmins: boolean;
  maxTenantsLimit: number;
  featureFlags: {
    biometricDiscovery?: boolean;
    biometricsAutoDiscovery?: boolean;
    aiAssistant: boolean;
    offlineSync?: boolean;
    offlineSyncV2?: boolean;
    betaModules: boolean;
    supportImpersonation?: boolean;
    supportSessionImpersonation?: boolean;
    statutoryExport?: boolean;
    statutoryPdfExport?: boolean;
  };
  updatedAt: string;
  updatedBy: string;
}

export interface PlatformBroadcastMessage {
  id: string;
  title: string;
  content: string;
  type: 'INFO' | 'WARNING' | 'CRITICAL' | 'MAINTENANCE';
  targetAudience: 'ALL_TENANTS' | 'SPECIFIC_TENANT' | 'SUPER_ADMINS';
  targetCompanyId?: string;
  createdAt: string;
  createdBy: string;
  expiresAt?: string;
  isActive: boolean;
}

export interface CreateTenantDTO {
  companyCode: string;
  name: string;
  adminEmail: string;
  subscriptionPlan: SubscriptionPlan;
  enabledModules: string[];
  maxEmployees: number;
  maxSites: number;
}

