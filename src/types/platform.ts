import { Timestamp } from 'firebase/firestore';

export type PlatformRole = 'SUPER_ADMIN' | 'SUPPORT_AUDITOR' | 'PLATFORM_OPS';

export interface SuperAdminUser {
  uid: string;
  email: string;
  role: PlatformRole;
  status: 'ACTIVE' | 'SUSPENDED';
  createdAt: Timestamp;
  lastLoginAt: Timestamp;
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
  maxEmployees: number;
  maxSites: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface PlatformAuditLog {
  id: string;
  actorUid: string;
  actorEmail: string;
  action: 'CREATE_TENANT' | 'UPDATE_STATUS' | 'UPDATE_ENTITLEMENTS' | 'SUSPEND_TENANT';
  targetTenantId?: string;
  metadata: Record<string, any>;
  timestamp: Timestamp;
  ipAddress?: string;
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
