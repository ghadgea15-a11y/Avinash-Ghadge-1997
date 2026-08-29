import { UserSession, UserRole, AuthorityLevel, StandardPermission, AccessContext, PrivilegeCheckResult } from '../types';
import { PermissionRegistry } from './permissionRegistry';

/**
 * Enterprise RBAC Service
 * 
 * Provides authoritative permission evaluation based on UserRole, AuthorityLevel,
 * and Module-Specific access rules.
 * Strictly separates Platform Control Plane from Tenant Control Plane.
 */
export class RbacService {
  /**
   * Alias for checkPermission to match legacy usage (returns boolean)
   */
  public static can(
    session: UserSession | null,
    permission: StandardPermission,
    context?: AccessContext
  ): boolean {
    return this.checkPermission(session, permission, context).allowed;
  }

  /**
   * Evaluates if a user session has the required permission for an action.
   * Delegates to central PermissionRegistry for strict domain and authority evaluation.
   */
  public static checkPermission(
    session: UserSession | null,
    permission: StandardPermission,
    context?: AccessContext
  ): PrivilegeCheckResult {
    if (!session) {
      return { allowed: false, reason: 'Authentication required' };
    }

    // Delegate to central PermissionRegistry for standard rule evaluation
    return PermissionRegistry.evaluatePermission(session, permission, context);
  }

  /**
   * Helper to check multiple permissions (requires all)
   */
  public static checkAll(
    session: UserSession | null,
    permissions: StandardPermission[],
    context?: AccessContext
  ): PrivilegeCheckResult {
    for (const p of permissions) {
      const res = this.checkPermission(session, p, context);
      if (!res.allowed) return res;
    }
    return { allowed: true };
  }

  /**
   * Helper to check if user has at least one of the permissions
   */
  public static checkAny(
    session: UserSession | null,
    permissions: StandardPermission[],
    context?: AccessContext
  ): PrivilegeCheckResult {
    let lastReason = 'No permissions provided';
    for (const p of permissions) {
      const res = this.checkPermission(session, p, context);
      if (res.allowed) return res;
      lastReason = res.reason || 'Unauthorized';
    }
    return { allowed: false, reason: lastReason };
  }

  /**
   * Filters a list of items based on a permission check for each item.
   * Useful for UI-side data filtering.
   */
  public static filterByPermission<T>(
    items: T[],
    session: UserSession | null,
    permission: StandardPermission,
    getContext: (item: T) => AccessContext
  ): T[] {
    if (!session) return [];

    return items.filter(item => {
      const res = this.checkPermission(session, permission, getContext(item));
      return res.allowed;
    });
  }

  /**
   * Returns the authority level string for a tenant session.
   * Super Admin and platform roles do NOT have an A0-A9 authority rank.
   */
  public static getAuthorityLevel(session: UserSession | null): AuthorityLevel | undefined {
    if (!session) return undefined;
    // Platform identities do not have a tenant A0-A9 authority rank
    if (session.role === 'SUPER_ADMIN' || session.role === 'PLATFORM_OPS' || session.role === 'SUPPORT_AUDITOR') {
      return undefined;
    }
    if (session.authority) return session.authority;
    if (session.authorityLevel) return session.authorityLevel;
    
    return PermissionRegistry.mapRoleToDefaultAuthority(session.role) || 'A9_SUPPORT';
  }

  /**
   * Returns the numeric authority level for comparison
   */
  public static getAuthorityWeight(authority?: AuthorityLevel): number {
    if (!authority) return 9; // A9 lowest
    const map: Record<AuthorityLevel, number> = {
      'A0_OWNER': 0,
      'A1_DIRECTOR_CEO': 1,
      'A2_GENERAL_MANAGER': 2,
      'A3_OFFICIAL_STAFF': 3,
      'A4_REGIONAL_AREA_MANAGER': 4,
      'A5_SITE_IN_CHARGE': 5,
      'A6_SUPERVISOR': 6,
      'A7_SKILLED': 7,
      'A8_SEMI_SKILLED': 8,
      'A9_SUPPORT': 9
    };
    return map[authority] ?? 9;
  }

  public static canManageEscalationPolicy(session: UserSession | null): boolean {
    if (!session) return false;
    return ['OWNER_PROMOTER', 'COMPANY_ADMIN', 'ADMIN', 'HR_ADMIN', 'HR'].includes(session.role);
  }

  public static canViewAllCompanyDelegations(session: UserSession | null): boolean {
    if (!session) return false;
    return ['OWNER_PROMOTER', 'COMPANY_ADMIN', 'ADMIN', 'HR_ADMIN'].includes(session.role);
  }

  public static hasModuleAccess(session: UserSession | null, module: string): boolean {
    if (!session) return false;
    if (session.role === 'SUPER_ADMIN') return true;
    const perm = PermissionRegistry.mapLegacyActionToPermission(module as any, 'READ');
    const result = PermissionRegistry.evaluatePermission(session, perm, { targetCompanyId: session.companyId });
    return result.allowed;
  }

  public static getDataScope(session: UserSession | null, resourceType: string): string {
    if (!session) return 'NONE';
    if (session.role === 'SUPER_ADMIN') return 'PLATFORM_GOVERNANCE';
    if (['OWNER_PROMOTER', 'DIRECTOR_CEO', 'COMPANY_ADMIN', 'ADMIN'].includes(session.role)) return 'ALL';
    return 'OWN';
  }
}
