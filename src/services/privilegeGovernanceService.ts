import { db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';
import { UserSession, UserRole, AuthorityLevel, DataScope } from '../types';
import { 
  StandardPermission, 
  AccessContext, 
  PrivilegeCheckResult, 
  EnterpriseModule, 
  PermissionAction 
} from '../types/permissions';
import { PermissionRegistry } from './permissionRegistry';
import { SecurityAuditService } from './securityAuditService';

export class PrivilegeGovernanceService {

  /**
   * Authoritative access check with automatic security event auditing when blocked.
   */
  public static async enforce(
    session: UserSession | null,
    permission: StandardPermission,
    context?: AccessContext
  ): Promise<boolean> {
    const result = PermissionRegistry.evaluatePermission(session, permission, context);

    if (!result.allowed) {
      if (session) {
        // Classify the audit event type based on the violation
        let action = 'UNAUTHORIZED_ACCESS';
        let severity: 'HIGH' | 'CRITICAL' = 'HIGH';

        if (result.violatesTenant) {
          action = 'CROSS_COMPANY_ACCESS_DENIED';
          severity = 'CRITICAL';
        } else if (result.violatesScope) {
          action = 'CROSS_SITE_ACCESS_DENIED';
          severity = 'HIGH';
        } else if (result.violatesRole) {
          action = 'PRIVILEGE_ESCALATION_BLOCKED';
          severity = 'HIGH';
        }

        await SecurityAuditService.logEvent(
          session.companyId,
          session.userId,
          session.role,
          session.employeeId,
          action,
          context?.resourceType || permission.split(':')[0] || 'SYSTEM',
          context?.resourceId || permission,
          false,
          severity,
          result.reason || `Blocked execution of permission ${permission}`
        ).catch(() => {});
      }
      return false;
    }

    return true;
  }

  /**
   * Validates role assignment to prevent unauthorized privilege escalation.
   * A user can only assign roles of lower or equal authority to their own, 
   * and cannot assign SUPER_ADMIN or OWNER_PROMOTER unless they are already at that rank.
   * SUPER_ADMIN can only be managed by Platform Administrators via the Platform Control Plane.
   */
  public static async validateRoleAssignment(
    actorSession: UserSession,
    targetRole: UserRole,
    targetCompanyId: string
  ): Promise<{ allowed: boolean; reason?: string }> {
    // 1. Tenant users can NEVER grant the Platform SUPER_ADMIN role
    if (targetRole === 'SUPER_ADMIN' && actorSession.role !== 'SUPER_ADMIN') {
      const reason = `Security Violation: Tenant roles cannot assign the Platform SUPER_ADMIN identity. Platform identities are strictly isolated to the Platform Control Plane.`;
      await SecurityAuditService.logEvent(
        actorSession.companyId,
        actorSession.userId,
        actorSession.role,
        actorSession.employeeId,
        'PRIVILEGE_ESCALATION_BLOCKED',
        'RBAC',
        targetRole,
        false,
        'CRITICAL',
        reason
      ).catch(() => {});
      return { allowed: false, reason };
    }

    // 2. Cross-company role assignment blocked
    if (actorSession.role !== 'SUPER_ADMIN' && actorSession.companyId !== targetCompanyId) {
      const reason = `Cross-tenant privilege escalation attempt: Actor from ${actorSession.companyId} cannot assign roles in ${targetCompanyId}.`;
      await SecurityAuditService.logEvent(
        actorSession.companyId,
        actorSession.userId,
        actorSession.role,
        actorSession.employeeId,
        'CROSS_COMPANY_ACCESS_DENIED',
        'USERS',
        targetCompanyId,
        false,
        'CRITICAL',
        reason
      ).catch(() => {});
      return { allowed: false, reason };
    }

    // 3. Only Owner/Promoter can assign OWNER_PROMOTER in tenant domain
    if (targetRole === 'OWNER_PROMOTER' && actorSession.role !== 'OWNER_PROMOTER' && actorSession.role !== 'SUPER_ADMIN') {
      const reason = `Unauthorized privilege escalation: Only OWNER_PROMOTER can assign the OWNER_PROMOTER role in this organization.`;
      await SecurityAuditService.logEvent(
        actorSession.companyId,
        actorSession.userId,
        actorSession.role,
        actorSession.employeeId,
        'PRIVILEGE_ESCALATION_BLOCKED',
        'RBAC',
        targetRole,
        false,
        'CRITICAL',
        reason
      ).catch(() => {});
      return { allowed: false, reason };
    }

    // 4. Check actor has privilege governance permission
    const canManagePrivileges = PermissionRegistry.evaluatePermission(actorSession, 'GRC_SECURITY:PRIVILEGE_GOVERNANCE:CREATE', { targetCompanyId });
    if (!canManagePrivileges.allowed) {
      const reason = `Actor lacks permission to assign roles: ${canManagePrivileges.reason}`;
      await SecurityAuditService.logEvent(
        actorSession.companyId,
        actorSession.userId,
        actorSession.role,
        actorSession.employeeId,
        'PRIVILEGE_ESCALATION_BLOCKED',
        'RBAC',
        targetRole,
        false,
        'HIGH',
        reason
      ).catch(() => {});
      return { allowed: false, reason };
    }

    return { allowed: true };
  }

  /**
   * Validates tenant isolation on any document or transaction request.
   * Controlled Super Admin access requires an active support session.
   */
  public static async validateTenantAccess(
    session: UserSession,
    targetCompanyId: string,
    resource: string = 'COMPANY_DATA',
    resourceId: string = 'UNKNOWN',
    context?: AccessContext
  ): Promise<boolean> {
    if (session.role === 'SUPER_ADMIN') {
      // Super admin can access tenant metadata for platform governance or if active support session exists
      if (context?.supportSession && context.supportSession.isActive && context.supportSession.targetCompanyId === targetCompanyId && context.supportSession.expiresAt > Date.now()) {
        return true;
      }
      if (resource === 'TENANT_METADATA_VIEW' || resource === 'PLATFORM_GOVERNANCE') {
        return true;
      }
      const reason = `Controlled Support Access Required: Super Admin cannot perform direct tenant operational access without an active support session for '${targetCompanyId}'.`;
      await SecurityAuditService.logEvent(
        targetCompanyId,
        session.userId,
        session.role,
        session.employeeId,
        'UNAUTHORIZED_ACCESS',
        resource,
        resourceId,
        false,
        'HIGH',
        reason
      ).catch(() => {});
      return false;
    }

    if (session.companyId !== targetCompanyId) {
      const reason = `Cross-tenant violation: User belonging to company '${session.companyId}' attempted to access resources of '${targetCompanyId}'.`;
      await SecurityAuditService.logEvent(
        session.companyId,
        session.userId,
        session.role,
        session.employeeId,
        'CROSS_COMPANY_ACCESS_DENIED',
        resource,
        resourceId,
        false,
        'CRITICAL',
        reason
      ).catch(() => {});
      return false;
    }

    return true;
  }

  /**
   * Validates site boundary isolation for site-scoped roles.
   */
  public static async validateSiteAccess(
    session: UserSession,
    targetSiteId: string,
    resource: string = 'SITE_DATA',
    resourceId: string = 'UNKNOWN'
  ): Promise<boolean> {
    if (session.role === 'SUPER_ADMIN') {
      return true;
    }

    const scope = session.dataScope || 'SELF';
    if (scope === 'GLOBAL' || scope === 'COMPANY' || scope === 'REGION' || scope === 'AREA') {
      return true;
    }

    const userSite = session.assignedSiteId || session.branchId;
    if (userSite && userSite !== targetSiteId) {
      const reason = `Cross-site violation: User assigned to site '${userSite}' attempted to access site '${targetSiteId}'.`;
      await SecurityAuditService.logEvent(
        session.companyId,
        session.userId,
        session.role,
        session.employeeId,
        'CROSS_SITE_ACCESS_DENIED',
        resource,
        resourceId,
        false,
        'HIGH',
        reason
      ).catch(() => {});
      return false;
    }

    return true;
  }

  /**
   * Validates that an employee is not impersonating another user or accessing unauthorized personal records.
   */
  public static async validatePersonalRecordAccess(
    session: UserSession,
    targetEmployeeId: string,
    resource: string = 'EMPLOYEE_RECORD'
  ): Promise<boolean> {
    if (session.role === 'SUPER_ADMIN' || session.role === 'COMPANY_ADMIN' || session.role === 'HR_ADMIN' || session.role === 'HR') {
      return true;
    }

    const userEmpId = session.employeeId || session.userId;
    if (userEmpId !== targetEmployeeId) {
      const reason = `Personal record access violation: Employee '${userEmpId}' attempted to access record of '${targetEmployeeId}'.`;
      await SecurityAuditService.logEvent(
        session.companyId,
        session.userId,
        session.role,
        session.employeeId,
        'UNAUTHORIZED_ACCESS',
        resource,
        targetEmployeeId,
        false,
        'HIGH',
        reason
      ).catch(() => {});
      return false;
    }

    return true;
  }
}
