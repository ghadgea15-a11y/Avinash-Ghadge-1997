import { UserRole, AuthorityLevel, DataScope, AppModuleKey } from './index';

export type SecurityDomain = 'PLATFORM' | 'TENANT';

export type PermissionAction = 
  | 'READ' 
  | 'CREATE' 
  | 'UPDATE' 
  | 'DELETE' 
  | 'APPROVE' 
  | 'EXPORT' 
  | 'REPORT' 
  | 'ADMIN';

export type EnterpriseModule = 
  | 'HCM'
  | 'WFM'
  | 'ERP_FINANCE'
  | 'OPERATIONS'
  | 'EAM'
  | 'SCM'
  | 'CRM'
  | 'BI'
  | 'BPM'
  | 'GRC_SECURITY';

export type PlatformModule =
  | 'GOVERNANCE'
  | 'TENANT_LIFECYCLE'
  | 'SUBSCRIPTION'
  | 'MODULE_ENTITLEMENT'
  | 'PLATFORM_SECURITY'
  | 'MONITORING'
  | 'AUDIT'
  | 'SUPPORT_ACCESS'
  | 'GLOBAL_CONFIG';

export type PermissionSubmodule = string;

export type StandardPermission = 
  | `${EnterpriseModule}:${PermissionSubmodule}:${PermissionAction}` 
  | `PLATFORM:${PlatformModule}:${PermissionAction}`
  | string;

export interface SupportAccessSession {
  id: string;
  superAdminUid: string;
  superAdminEmail: string;
  targetCompanyId: string;
  reason: string;
  scope: 'READ_ONLY' | 'DIAGNOSTIC' | 'ADMIN_SUPPORT';
  authorizedAt: number;
  expiresAt: number;
  isActive: boolean;
  auditLogId: string;
}

export interface AccessContext {
  targetCompanyId?: string;
  targetSiteId?: string;
  targetRegionId?: string;
  targetDepartment?: string;
  targetOwnerId?: string;
  resourceType?: string;
  resourceId?: string;
  module?: string;
  securityDomain?: SecurityDomain;
  supportSession?: SupportAccessSession;
}

export interface PrivilegeCheckResult {
  allowed: boolean;
  reason?: string;
  violatesScope?: boolean;
  violatesTenant?: boolean;
  violatesRole?: boolean;
  violatesDomain?: boolean;
  requiredAuthority?: AuthorityLevel;
  userAuthority?: AuthorityLevel;
  domain?: SecurityDomain;
}

export interface PermissionDefinition {
  code: StandardPermission;
  module: EnterpriseModule | 'PLATFORM';
  submodule: PermissionSubmodule;
  action: PermissionAction;
  name: string;
  description: string;
  minimumAuthority?: AuthorityLevel;
  allowedRoles?: UserRole[];
  requiredScope?: DataScope;
  domain?: SecurityDomain;
}
