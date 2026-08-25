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

  it('Strict Separation: Super Admin is not a company user', () => {
    expect(superAdmin.companyId).toBe('GLOBAL_ADMIN');
    expect(RbacService.getAuthorityLevel(superAdmin)).toBe('A0_OWNER'); 
  });

  it('No Fallback Role: Support staff must remain A9_SUPPORT', () => {
    expect(RbacService.getAuthorityLevel(a9)).toBe('A9_SUPPORT');
  });

  it('Cross-Company Access is Denied', () => {
    // Assuming context companyId != user companyId
    const context = { targetCompanyId: 'COMPANY_B' };
    const canAccess = RbacService.can(a0, 'EMPLOYEES:PROFILE:VIEW', context);
    // Since targetCompanyId is implemented in evaluatePermission, it should block it if they don't match
    expect(canAccess).toBe(false);
  });

  it('Global Admin function Denied for Company Users', () => {
    const context = { targetCompanyId: 'COMPANY_A' };
    const canAccess = RbacService.can(a0, 'SYSTEM:GLOBAL:MANAGE' as any, context);
    expect(canAccess).toBe(false);
  });
  
  it('Module Access: Support staff denied from Billing', () => {
    expect(RbacService.hasModuleAccess(a9, 'COMPANY_BILLING')).toBe(false);
  });

  it('Module Access: A0 Owner allowed in Billing', () => {
    expect(RbacService.hasModuleAccess(a0, 'COMPANY_BILLING')).toBe(true);
  });
});
