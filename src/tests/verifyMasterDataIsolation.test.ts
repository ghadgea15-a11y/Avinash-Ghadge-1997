import { RbacService } from '../services/rbacService';
import { UserSession } from '../types';

async function runTests() {
  console.log('Running Master Data Isolation Tests...');

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

  // Test 1: Company Isolation
  const canViewCompA = RbacService.can(userA, 'HCM:EMPLOYEE:READ', { targetCompanyId: companyAId });
  const canViewCompB = RbacService.can(userA, 'HCM:EMPLOYEE:READ', { targetCompanyId: companyBId });
  
  if (canViewCompA && !canViewCompB) {
    console.log('✅ Company Isolation PASSED');
  } else {
    console.error('❌ Company Isolation FAILED', { canViewCompA, canViewCompB });
  }

  // Test 2: Site Isolation
  const canViewSiteA = RbacService.can(userASite, 'HCM:EMPLOYEE:READ', { targetCompanyId: companyAId, targetSiteId: siteAId });
  const canViewSiteB = RbacService.can(userASite, 'HCM:EMPLOYEE:READ', { targetCompanyId: companyAId, targetSiteId: siteBId });

  if (canViewSiteA && !canViewSiteB) {
    console.log('✅ Site Isolation PASSED');
  } else {
    console.error('❌ Site Isolation FAILED', { canViewSiteA, canViewSiteB });
  }

  // Verify Roles
  const roles = [
    'OWNER_PROMOTER', 'DIRECTOR_CEO', 'GENERAL_MANAGER', 
    'REGIONAL_MANAGER', 'AREA_MANAGER', 'SITE_IN_CHARGE', 
    'SUPERVISOR', 'SKILLED', 'SEMI_SKILLED', 'SUPPORT'
  ];
  
  let rolesPassed = true;
  for (const role of roles) {
    const session = { ...userA, role: role as any, authorityLevel: RbacService.getAuthorityLevel({ role } as any) };
    if (!session.authorityLevel) {
      console.error(`❌ Role mapping failed for ${role}`);
      rolesPassed = false;
    }
  }
  
  if (rolesPassed) {
    console.log('✅ Role Mapping PASSED');
  }
}

runTests().catch(console.error);
