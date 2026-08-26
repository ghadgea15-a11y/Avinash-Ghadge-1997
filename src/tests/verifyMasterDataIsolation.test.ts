import { describe, it, expect } from 'vitest';
import { RbacService } from '../services/rbacService';
import { UserSession } from '../types';

describe('Master Data Isolation', () => {
  const companyAId = 'COMP-A';
  const companyBId = 'COMP-B';
  const regionAId = 'REG-A';
  const regionBId = 'REG-B';
  const siteAId = 'SITE-A';
  const siteBId = 'SITE-B';

  const userA: UserSession = {
    userId: 'USER-A',
    employeeId: 'EMP-A',
    fullName: 'User A',
    email: 'usera@compa.com',
    role: 'COMPANY_ADMIN',
    companyId: companyAId,
    branchId: 'MAIN',
    token: 'mock',
    tokenExpiresAt: Date.now() + 3600000,
    isBiometricEnabled: false,
    lastActiveAt: Date.now(),
    loginMode: 'PASSWORD',
    accountStatus: 'ACTIVE',
    companyAdminApproval: 'APPROVED',
    hrApproval: 'APPROVED',
    authorityLevel: 'A2_GENERAL_MANAGER',
    dataScope: 'COMPANY'
  };

  const userASite: UserSession = {
    ...userA,
    role: 'SITE_IN_CHARGE',
    authorityLevel: 'A5_SITE_IN_CHARGE',
    dataScope: 'SITE',
    assignedSiteId: siteAId
  };

  it('should isolate data by company', () => {
    const canViewCompA = RbacService.can(userA, 'HCM:EMPLOYEE:READ', { targetCompanyId: companyAId });
    const canViewCompB = RbacService.can(userA, 'HCM:EMPLOYEE:READ', { targetCompanyId: companyBId });
    
    expect(canViewCompA).toBe(true);
    expect(canViewCompB).toBe(false);
  });

  it('should isolate data by site', () => {
    const canViewSiteA = RbacService.can(userASite, 'HCM:EMPLOYEE:READ', { targetCompanyId: companyAId, targetSiteId: siteAId });
    const canViewSiteB = RbacService.can(userASite, 'HCM:EMPLOYEE:READ', { targetCompanyId: companyAId, targetSiteId: siteBId });
    
    expect(canViewSiteA).toBe(true);
    expect(canViewSiteB).toBe(false);
  });

  it('should map roles to authority levels correctly', () => {
    const roles = [
      'OWNER_PROMOTER', 'DIRECTOR_CEO', 'GENERAL_MANAGER', 
      'REGIONAL_MANAGER', 'AREA_MANAGER', 'SITE_IN_CHARGE', 
      'SUPERVISOR', 'SKILLED', 'SEMI_SKILLED', 'SUPPORT'
    ];
    
    for (const role of roles) {
      const session = { ...userA, role: role as any, authorityLevel: RbacService.getAuthorityLevel({ role } as any) };
      expect(session.authorityLevel).toBeDefined();
    }
  });
});

