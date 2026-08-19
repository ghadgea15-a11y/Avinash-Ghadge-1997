import { UserRole, AuthorityLevel, DataScope, AppModuleKey } from './index';

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

export type PermissionSubmodule = 
  // HCM (Module 1)
  | 'EMPLOYEE'
  | 'ID_BADGE'
  | 'DEPARTMENT'
  | 'ORG_CHART'
  // WFM (Module 2)
  | 'ATTENDANCE'
  | 'SHIFT'
  | 'ROSTER'
  | 'LEAVE'
  | 'OVERTIME'
  // ERP Finance (Module 3)
  | 'PAYROLL'
  | 'BILLING'
  | 'INVOICE'
  | 'COMPANY_BILLING'
  | 'STATUTORY'
  // Operations (Module 4)
  | 'SITE_OPS'
  | 'GUARD_PATROL'
  | 'VISITOR'
  | 'INCIDENT'
  | 'TASK'
  // EAM (Module 5)
  | 'ASSET'
  | 'WORK_ORDER'
  | 'MAINTENANCE'
  | 'CUSTODY'
  | 'WARRANTY'
  // SCM (Module 6)
  | 'INVENTORY'
  | 'PURCHASE_ORDER'
  | 'SUPPLIER'
  | 'STOCK_TRANSFER'
  // CRM (Module 7)
  | 'CLIENT'
  | 'CONTRACT'
  | 'SLA'
  | 'SERVICE_DESK'
  // BI (Module 8)
  | 'REPORT'
  | 'ANALYTICS'
  | 'EXECUTIVE_BI'
  | 'PREDICTIVE'
  // BPM (Module 9)
  | 'APPROVAL'
  | 'DELEGATION'
  | 'ESCALATION'
  | 'ROUTING_RULE'
  | 'THRESHOLD'
  // GRC / Security (Module 10)
  | 'SECURITY_AUDIT'
  | 'ANOMALY'
  | 'INVESTIGATION'
  | 'COMPLIANCE_POLICY'
  | 'VIOLATION'
  | 'PRIVILEGE_GOVERNANCE';

export type StandardPermission = `${EnterpriseModule}:${PermissionSubmodule}:${PermissionAction}` | string;

export interface PermissionDefinition {
  code: StandardPermission;
  module: EnterpriseModule;
  submodule: PermissionSubmodule;
  action: PermissionAction;
  name: string;
  description: string;
  minimumAuthority: AuthorityLevel;
  allowedRoles?: UserRole[];
  requiredScope?: DataScope;
}

export interface AccessContext {
  targetCompanyId?: string;
  targetSiteId?: string;
  targetRegionId?: string;
  targetDepartment?: string;
  targetOwnerId?: string;
  resourceType?: string;
  resourceId?: string;
}

export interface PrivilegeCheckResult {
  allowed: boolean;
  reason?: string;
  violatesScope?: boolean;
  violatesTenant?: boolean;
  violatesRole?: boolean;
  requiredAuthority?: AuthorityLevel;
  userAuthority?: AuthorityLevel;
}
