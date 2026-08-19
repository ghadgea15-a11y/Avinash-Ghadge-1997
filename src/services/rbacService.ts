import { 
  UserSession, 
  UserRole, 
  AuthorityLevel, 
  DataScope, 
  WorkforceCategory, 
  AppModuleKey 
} from '../types';
import { 
  StandardPermission, 
  PermissionAction, 
  AccessContext, 
  PrivilegeCheckResult 
} from '../types/permissions';
import { PermissionRegistry } from './permissionRegistry';
import { PrivilegeGovernanceService } from './privilegeGovernanceService';

export type { PermissionAction };

export class RbacService {
  /**
   * Translates legacy and new roles into the canonical AuthorityLevel.
   * This bridges the gap between legacy user documents and the new RBAC engine.
   */
  static getAuthorityLevel(session: UserSession): AuthorityLevel {
    if (session.authorityLevel) return session.authorityLevel;
    
    // Mapping legacy roles and new hierarchy roles to AuthorityLevel if missing
    switch (session.role) {
      case 'SUPER_ADMIN':
      case 'OWNER_PROMOTER':
        return 'A0_OWNER';
      case 'DIRECTOR_CEO':
        return 'A1_DIRECTOR_CEO';
      case 'GENERAL_MANAGER':
      case 'COMPANY_ADMIN': // Legacy mapping: Highest operation
        return 'A2_GENERAL_MANAGER';
      case 'HR_ADMIN':
      case 'FINANCE_MANAGER':
      case 'HR':
      case 'FINANCE':
      case 'ADMIN':
      case 'PROCUREMENT':
      case 'EHS':
      case 'QUALITY':
      case 'COMMERCIAL':
      case 'MIS':
      case 'CLIENT_MANAGEMENT':
      case 'IT':
      case 'OPERATIONS_OFFICE':
        return 'A3_OFFICIAL_STAFF';
      case 'REGIONAL_MANAGER':
      case 'AREA_MANAGER':
        return 'A4_REGIONAL_AREA_MANAGER';
      case 'SITE_IN_CHARGE':
      case 'OPS_MANAGER': // Legacy
        return 'A5_SITE_IN_CHARGE';
      case 'SUPERVISOR':
      case 'FIELD_OFFICER': // Legacy
        return 'A6_SUPERVISOR';
      case 'SKILLED':
      case 'TECHNICIAN':
      case 'SAFETY_OFFICER':
        return 'A7_SKILLED';
      case 'SEMI_SKILLED':
      case 'GUARD': // Legacy
        return 'A8_SEMI_SKILLED';
      case 'SUPPORT':
      case 'EMPLOYEE': // Legacy base
        return 'A9_SUPPORT';
      default:
        return 'A9_SUPPORT';
    }
  }

  /**
   * Determines the canonical data scope based on the user's authority level.
   */
  static getDataScope(session: UserSession): DataScope {
    if (session.dataScope) return session.dataScope;

    const authority = this.getAuthorityLevel(session);
    switch (authority) {
      case 'A0_OWNER':
      case 'A1_DIRECTOR_CEO':
      case 'A3_OFFICIAL_STAFF': // Varies, but usually enterprise-wide for their domain
        return 'COMPANY';
      case 'A2_GENERAL_MANAGER':
        return 'REGION'; // Mult-region logic is complex, defaulting to broader scope, logic handles arrays
      case 'A4_REGIONAL_AREA_MANAGER':
        return 'AREA';
      case 'A5_SITE_IN_CHARGE':
        return 'SITE';
      case 'A6_SUPERVISOR':
        return 'SITE';
      case 'A7_SKILLED':
      case 'A8_SEMI_SKILLED':
      case 'A9_SUPPORT':
        return 'SELF';
      default:
        return 'SELF';
    }
  }

  /**
   * Centralized check for Standard Permission (`MODULE:SUBMODULE:ACTION`).
   */
  static can(
    session: UserSession | null,
    permission: StandardPermission,
    context?: AccessContext
  ): boolean {
    return PermissionRegistry.evaluatePermission(session, permission, context).allowed;
  }

  /**
   * Authoritative access check with automatic security event auditing when blocked.
   */
  static async enforce(
    session: UserSession | null,
    permission: StandardPermission,
    context?: AccessContext
  ): Promise<boolean> {
    return await PrivilegeGovernanceService.enforce(session, permission, context);
  }

  /**
   * Enforces module-level access.
   */
  static hasModuleAccess(session: UserSession | null, moduleKey: AppModuleKey): boolean {
    if (!session) return false;
    
    // Super Admins have full module bypass
    if (session.role === 'SUPER_ADMIN') return true;

    const authority = this.getAuthorityLevel(session);

    switch (moduleKey) {
      case 'COMPANY_MANAGEMENT':
      case 'APPROVAL_MANAGEMENT':
      case 'EMPLOYEES':
      case 'ATTENDANCE':
      case 'SHIFTS':
      case 'LEAVE':
      case 'ID_BADGES':
      case 'COMPLIANCE':
        return ['A0_OWNER', 'A1_DIRECTOR_CEO', 'A2_GENERAL_MANAGER', 'A3_OFFICIAL_STAFF', 'A4_REGIONAL_AREA_MANAGER', 'A5_SITE_IN_CHARGE', 'A6_SUPERVISOR'].includes(authority) || 
               // Everyone can see their own attendance or badge
               ['A7_SKILLED', 'A8_SEMI_SKILLED', 'A9_SUPPORT'].includes(authority);
      case 'PAYROLL':
      case 'BILLING':
      case 'COMPANY_BILLING':
        // Only Finance, HR, Owners, Directors
        if (authority === 'A3_OFFICIAL_STAFF') {
           // Refine based on specific role for Official Staff
           return ['HR', 'FINANCE', 'HR_ADMIN', 'FINANCE_MANAGER'].includes(session.role);
        }
        return ['A0_OWNER', 'A1_DIRECTOR_CEO'].includes(authority);
      case 'INVENTORY':
      case 'ASSETS':
        return ['A0_OWNER', 'A1_DIRECTOR_CEO', 'A2_GENERAL_MANAGER', 'A3_OFFICIAL_STAFF', 'A4_REGIONAL_AREA_MANAGER', 'A5_SITE_IN_CHARGE', 'A7_SKILLED'].includes(authority);
      case 'VISITORS':
      case 'GUARD_PATROL':
      case 'SITE_OPERATIONS':
      case 'SECURITY_INCIDENTS':
        return ['A0_OWNER', 'A1_DIRECTOR_CEO', 'A2_GENERAL_MANAGER', 'A4_REGIONAL_AREA_MANAGER', 'A5_SITE_IN_CHARGE', 'A6_SUPERVISOR', 'A7_SKILLED', 'A8_SEMI_SKILLED'].includes(authority);
      case 'REPORTS':
      case 'ANALYTICS':
        return ['A0_OWNER', 'A1_DIRECTOR_CEO', 'A2_GENERAL_MANAGER', 'A3_OFFICIAL_STAFF', 'A4_REGIONAL_AREA_MANAGER'].includes(authority);
      default:
        return false;
    }
  }

  /**
   * Enforces CRUD Action Permissions for a specific entity context
   */
  static hasPermission(
    session: UserSession | null, 
    action: PermissionAction, 
    context: { module: AppModuleKey, targetCompanyId?: string, targetSiteId?: string, targetOwnerId?: string }
  ): boolean {
    if (!session) return false;
    if (session.role === 'SUPER_ADMIN') return true;

    // Must be in the same company
    if (context.targetCompanyId && context.targetCompanyId !== session.companyId) {
      return false;
    }

    const standardPerm = PermissionRegistry.mapLegacyActionToPermission(context.module, action);
    const evalResult = PermissionRegistry.evaluatePermission(session, standardPerm, {
      targetCompanyId: context.targetCompanyId,
      targetSiteId: context.targetSiteId,
      targetOwnerId: context.targetOwnerId
    });

    if (!evalResult.allowed) {
      return false;
    }

    const authority = this.getAuthorityLevel(session);
    
    // Global Actions across most modules
    if (action === 'READ') {
       if (!this.hasModuleAccess(session, context.module)) return false;
       
       // Scoped Read Check
       const scope = this.getDataScope(session);
       if (scope === 'SITE' && context.targetSiteId && context.targetSiteId !== session.assignedSiteId) return false;
       if (scope === 'SELF' && context.targetOwnerId && context.targetOwnerId !== session.employeeId) return false;
       return true;
    }

    if (action === 'CREATE' || action === 'UPDATE' || action === 'DELETE') {
       // High authorities generally have write access
       if (['A0_OWNER', 'A1_DIRECTOR_CEO', 'A2_GENERAL_MANAGER'].includes(authority)) return true;

       // Official staff can only modify their domains
       if (authority === 'A3_OFFICIAL_STAFF') {
          if (context.module === 'EMPLOYEES' && ['HR', 'HR_ADMIN', 'COMPANY_ADMIN'].includes(session.role)) return true;
          if (context.module === 'ID_BADGES' && ['HR', 'HR_ADMIN', 'COMPANY_ADMIN'].includes(session.role)) return true;
          if (context.module === 'COMPLIANCE' && ['HR', 'HR_ADMIN', 'ADMIN', 'COMPANY_ADMIN'].includes(session.role)) return true;
          if (context.module === 'PAYROLL' && ['FINANCE', 'FINANCE_MANAGER', 'COMPANY_ADMIN'].includes(session.role)) return true;
          // EHS for incidents, etc...
          if (context.module === 'SECURITY_INCIDENTS' && ['EHS', 'COMPANY_ADMIN'].includes(session.role)) return true;
          return false; // Strict isolation for official staff
       }

       // Operations Managers scoped writing
       if (['A4_REGIONAL_AREA_MANAGER', 'A5_SITE_IN_CHARGE'].includes(authority)) {
          if (context.targetSiteId && context.targetSiteId !== session.assignedSiteId) return false;
          // They can update shifts, attendance, incidents for their site
          if (['SHIFTS', 'ATTENDANCE', 'SECURITY_INCIDENTS', 'VISITORS', 'ID_BADGES'].includes(context.module)) return true;
       }

       // Supervisors can only create/update operational logs
       if (authority === 'A6_SUPERVISOR') {
          if (action === 'DELETE') return false; // Supervisors cannot delete
          if (context.targetSiteId && context.targetSiteId !== session.assignedSiteId) return false;
          return ['ATTENDANCE', 'SECURITY_INCIDENTS', 'VISITORS', 'GUARD_PATROL'].includes(context.module);
       }

       // Ground workers (A7, A8) can only create logs (Patrols, Visitors)
       if (['A7_SKILLED', 'A8_SEMI_SKILLED'].includes(authority)) {
          if (action !== 'CREATE' && action !== 'UPDATE') return false; // Only create/update
          if (context.targetOwnerId && context.targetOwnerId !== session.employeeId) return false; // Only their own records
          return ['GUARD_PATROL', 'VISITORS', 'ATTENDANCE'].includes(context.module);
       }

       return false;
    }

    if (action === 'APPROVE') {
       return ['A0_OWNER', 'A1_DIRECTOR_CEO', 'A2_GENERAL_MANAGER', 'A3_OFFICIAL_STAFF', 'A4_REGIONAL_AREA_MANAGER', 'A5_SITE_IN_CHARGE'].includes(authority);
    }

    if (action === 'EXPORT' || action === 'REPORT') {
       return ['A0_OWNER', 'A1_DIRECTOR_CEO', 'A2_GENERAL_MANAGER', 'A3_OFFICIAL_STAFF', 'A4_REGIONAL_AREA_MANAGER'].includes(authority);
    }

    return false;
  }

  /**
   * Enforces BPM Escalation Policy and Execution permissions
   */
  static canManageEscalationPolicy(session: UserSession | null): boolean {
    if (!session) return false;
    if (session.role === 'SUPER_ADMIN') return true;
    const authority = this.getAuthorityLevel(session);
    // Company owners, Directors, General Managers, and Official Staff (HR/Admin) can manage policies
    return ['A0_OWNER', 'A1_DIRECTOR_CEO', 'A2_GENERAL_MANAGER'].includes(authority) || 
           (authority === 'A3_OFFICIAL_STAFF' && ['ADMIN', 'HR', 'HR_ADMIN', 'COMPANY_ADMIN'].includes(session.role));
  }

  static canExecuteEscalationCheck(session: UserSession | null): boolean {
    if (!session) return false;
    if (session.role === 'SUPER_ADMIN') return true;
    const authority = this.getAuthorityLevel(session);
    return ['A0_OWNER', 'A1_DIRECTOR_CEO', 'A2_GENERAL_MANAGER', 'A3_OFFICIAL_STAFF'].includes(authority);
  }

  static canViewEscalationHistory(session: UserSession | null): boolean {
    if (!session) return false;
    if (session.role === 'SUPER_ADMIN') return true;
    const authority = this.getAuthorityLevel(session);
    return ['A0_OWNER', 'A1_DIRECTOR_CEO', 'A2_GENERAL_MANAGER', 'A3_OFFICIAL_STAFF', 'A4_REGIONAL_AREA_MANAGER', 'A5_SITE_IN_CHARGE', 'A6_SUPERVISOR'].includes(authority);
  }

  /**
   * Enforces BPM Proxy Delegation permissions
   */
  static canCreateOwnDelegation(session: UserSession | null): boolean {
    if (!session) return false;
    if (session.role === 'SUPER_ADMIN') return true;
    const authority = this.getAuthorityLevel(session);
    // Any user with approval authority (A0 down to A5/A6) can delegate their own approvals
    return ['A0_OWNER', 'A1_DIRECTOR_CEO', 'A2_GENERAL_MANAGER', 'A3_OFFICIAL_STAFF', 'A4_REGIONAL_AREA_MANAGER', 'A5_SITE_IN_CHARGE', 'A6_SUPERVISOR'].includes(authority);
  }

  static canManageDelegations(session: UserSession | null): boolean {
    if (!session) return false;
    if (session.role === 'SUPER_ADMIN') return true;
    const authority = this.getAuthorityLevel(session);
    // Company Admins, Owners, Directors, GMs, and HR Admins can manage delegations across the organization
    return ['A0_OWNER', 'A1_DIRECTOR_CEO', 'A2_GENERAL_MANAGER'].includes(authority) ||
           (authority === 'A3_OFFICIAL_STAFF' && ['ADMIN', 'HR', 'HR_ADMIN', 'COMPANY_ADMIN'].includes(session.role));
  }

  static canViewAllCompanyDelegations(session: UserSession | null): boolean {
    return this.canManageDelegations(session);
  }
}

