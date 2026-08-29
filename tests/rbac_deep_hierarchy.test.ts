import { describe, it, expect } from 'vitest';
import { RbacService } from '../src/services/rbacService';
import { UserSession, UserRole, AppModuleKey } from '../src/types';
import { PermissionRegistry } from '../src/services/permissionRegistry';
import { PrivilegeGovernanceService } from '../src/services/privilegeGovernanceService';

const createSession = (role: UserRole, companyId: string = 'COMPANY_A'): UserSession => ({
  userId: 'test-uid',
  employeeId: 'EMP-001',
  fullName: `Test ${role}`,
  email: `test-${role}@example.com`,
  role,
  companyId,
  branchId: 'MAIN',
  token: 'mock',
  tokenExpiresAt: Date.now() + 3600000,
  isBiometricEnabled: false,
  lastActiveAt: Date.now(),
  loginMode: 'PASSWORD',
  accountStatus: 'ACTIVE',
  companyAdminApproval: 'APPROVED',
  hrApproval: 'APPROVED'
});

describe('RBAC Deep Hierarchy - Super Admin vs Company Users', () => {
  const superAdmin = createSession('SUPER_ADMIN', 'GLOBAL_ADMIN');
  const a0 = createSession('OWNER_PROMOTER', 'COMPANY_A');
  const a1 = createSession('DIRECTOR_CEO', 'COMPANY_A');
  const a2 = createSession('GENERAL_MANAGER', 'COMPANY_A');
  const a9 = createSession('SUPPORT', 'COMPANY_A');

  it('Strict Separation: Super Admin is a Platform identity, NOT A0_OWNER', () => {
    expect(superAdmin.companyId).toBe('GLOBAL_ADMIN');
    // Super Admin has NO tenant A0-A9 authority rank
    expect(RbacService.getAuthorityLevel(superAdmin)).toBeUndefined();
  });

  it('Tenant Hierarchy: A0 is highest tenant authority, Support staff is A9', () => {
    expect(RbacService.getAuthorityLevel(a0)).toBe('A0_OWNER');
    expect(RbacService.getAuthorityLevel(a1)).toBe('A1_DIRECTOR_CEO');
    expect(RbacService.getAuthorityLevel(a9)).toBe('A9_SUPPORT');
  });

  it('Domain Separation: Platform permissions are granted to Super Admin, denied to A0_OWNER', () => {
    const superAdminCheck = RbacService.can(superAdmin, 'PLATFORM:GOVERNANCE:ADMIN');
    expect(superAdminCheck).toBe(true);

    const a0Check = RbacService.can(a0, 'PLATFORM:GOVERNANCE:ADMIN');
    expect(a0Check).toBe(false);
  });

  it('Cross-Company Access is Denied for Tenant Users', () => {
    const context = { targetCompanyId: 'COMPANY_B' };
    const canAccess = RbacService.can(a0, 'HCM:EMPLOYEE:READ', context);
    expect(canAccess).toBe(false);
  });

  it('Controlled Support Access: Super Admin requires support session for tenant operations', () => {
    // 1. Without support session: Super Admin cannot read or mutate tenant employee data
    const noSupportCheck = RbacService.can(superAdmin, 'HCM:EMPLOYEE:READ', { targetCompanyId: 'COMPANY_A' });
    expect(noSupportCheck).toBe(false);

    // 2. With active support session for COMPANY_A: Super Admin is granted controlled access
    const supportSession = {
      sessionId: 'SUP-001',
      superAdminUid: superAdmin.userId,
      targetCompanyId: 'COMPANY_A',
      reason: 'Customer Support Request #1234',
      scope: 'READ_ONLY' as const,
      isActive: true,
      createdAt: Date.now(),
      expiresAt: Date.now() + 3600000,
      auditLogId: 'AUDIT-SUP-001'
    };

    const withSupportCheck = RbacService.can(superAdmin, 'HCM:EMPLOYEE:READ', {
      targetCompanyId: 'COMPANY_A',
      supportSession
    });
    expect(withSupportCheck).toBe(true);

    // 3. READ_ONLY support session blocks mutations
    const mutationCheck = RbacService.can(superAdmin, 'HCM:EMPLOYEE:DELETE', {
      targetCompanyId: 'COMPANY_A',
      supportSession
    });
    expect(mutationCheck).toBe(false);
  });

  it('Module Access: Support staff denied from Billing, A0 Owner allowed in Billing', () => {
    expect(RbacService.hasModuleAccess(a9, 'COMPANY_BILLING')).toBe(false);
    expect(RbacService.hasModuleAccess(a0, 'COMPANY_BILLING')).toBe(true);
  });
});
