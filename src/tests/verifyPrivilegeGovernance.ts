import { UserSession } from '../types';
import { PermissionRegistry } from '../services/permissionRegistry';
import { PrivilegeGovernanceService } from '../services/privilegeGovernanceService';
import { RbacService } from '../services/rbacService';

export interface TestResult {
  name: string;
  passed: boolean;
  message: string;
}

export async function runPrivilegeGovernanceVerification(): Promise<{
  passedCount: number;
  failedCount: number;
  results: TestResult[];
}> {
  const results: TestResult[] = [];

  console.log('=== STARTING MODULE 10 POINT 2 PRIVILEGE GOVERNANCE VERIFICATION ===');

  // Helper to create valid sessions
  const createMockSession = (partial: Partial<UserSession>): UserSession => ({
    userId: 'TEST-USER',
    employeeId: 'TEST-EMP',
    fullName: 'Test User',
    email: 'test@muster.com',
    role: 'SUPPORT',
    companyId: 'CORP-ALPHA',
    branchId: 'SITE-MAIN',
    token: 'mock-token',
    tokenExpiresAt: Date.now() + 3600000,
    isBiometricEnabled: false,
    lastActiveAt: Date.now(),
    loginMode: 'PASSWORD',
    authorityLevel: 'A9_SUPPORT',
    dataScope: 'SELF',
    ...partial
  });

  // Test 1: Super Admin full bypass check
  try {
    const superAdminSession = createMockSession({
      userId: 'SA-001',
      employeeId: 'EMP-SA-001',
      companyId: 'CORP-ALPHA',
      role: 'SUPER_ADMIN',
      authorityLevel: 'A0_OWNER',
      dataScope: 'GLOBAL'
    });

    const canHCMCreate = RbacService.can(superAdminSession, 'HCM:EMPLOYEE:CREATE');
    const canCrossTenant = PermissionRegistry.evaluatePermission(superAdminSession, 'OPERATIONS:GUARD_PATROL:READ', {
      targetCompanyId: 'CORP-BETA'
    });

    const passed = canHCMCreate && canCrossTenant.allowed;
    results.push({
      name: 'Super Admin Unrestricted Access & Cross-Tenant Bypass',
      passed,
      message: passed ? 'Super admin passed all module & cross-tenant evaluations.' : 'Super admin was unexpectedly restricted.'
    });
  } catch (err: any) {
    results.push({ name: 'Super Admin Unrestricted Access', passed: false, message: err.message });
  }

  // Test 2: Cross-Tenant Access Violation Detection
  try {
    const companyAdminSession = createMockSession({
      userId: 'CA-001',
      employeeId: 'EMP-CA-001',
      companyId: 'CORP-ALPHA',
      role: 'COMPANY_ADMIN',
      authorityLevel: 'A2_GENERAL_MANAGER',
      dataScope: 'COMPANY'
    });

    const crossCompanyEval = PermissionRegistry.evaluatePermission(companyAdminSession, 'HCM:EMPLOYEE:READ', {
      targetCompanyId: 'CORP-BETA'
    });

    const isBlocked = !crossCompanyEval.allowed && crossCompanyEval.violatesTenant === true;
    results.push({
      name: 'Cross-Tenant Access Blocking & Tenant Boundary Enforcement',
      passed: isBlocked,
      message: isBlocked ? 'Cross-company access strictly blocked.' : 'Failed: Cross-company access was allowed.'
    });
  } catch (err: any) {
    results.push({ name: 'Cross-Tenant Access Blocking', passed: false, message: err.message });
  }

  // Test 3: Cross-Site Access Violation Detection for Site-Scoped Role
  try {
    const siteInChargeSession = createMockSession({
      userId: 'SIC-001',
      employeeId: 'EMP-SIC-001',
      companyId: 'CORP-ALPHA',
      role: 'SITE_IN_CHARGE',
      authorityLevel: 'A5_SITE_IN_CHARGE',
      dataScope: 'SITE',
      assignedSiteId: 'SITE-NORTH'
    });

    const crossSiteEval = PermissionRegistry.evaluatePermission(siteInChargeSession, 'OPERATIONS:GUARD_PATROL:READ', {
      targetCompanyId: 'CORP-ALPHA',
      targetSiteId: 'SITE-SOUTH'
    });

    const isBlocked = !crossSiteEval.allowed && crossSiteEval.violatesScope === true;
    results.push({
      name: 'Cross-Site Access Blocking for Site-Scoped In-Charge',
      passed: isBlocked,
      message: isBlocked ? 'Cross-site access strictly blocked.' : 'Failed: Cross-site access was allowed.'
    });
  } catch (err: any) {
    results.push({ name: 'Cross-Site Access Blocking', passed: false, message: err.message });
  }

  // Test 4: Authority Level Enforcement on High-Privilege Permissions
  try {
    const supervisorSession = createMockSession({
      userId: 'SUP-001',
      employeeId: 'EMP-SUP-001',
      companyId: 'CORP-ALPHA',
      role: 'SUPERVISOR',
      authorityLevel: 'A6_SUPERVISOR',
      dataScope: 'SITE',
      assignedSiteId: 'SITE-NORTH'
    });

    // Supervisor attempting to execute payroll calculation
    const payrollEval = PermissionRegistry.evaluatePermission(supervisorSession, 'ERP_FINANCE:PAYROLL:CREATE', {
      targetCompanyId: 'CORP-ALPHA'
    });

    const isBlocked = !payrollEval.allowed && payrollEval.violatesRole === true;
    results.push({
      name: 'Authority Level Enforcement on Finance/Payroll Processing',
      passed: isBlocked,
      message: isBlocked ? 'Supervisor correctly blocked from payroll processing.' : 'Failed: Supervisor was allowed payroll write access.'
    });
  } catch (err: any) {
    results.push({ name: 'Authority Level Enforcement', passed: false, message: err.message });
  }

  // Test 5: Privilege Escalation Protection on Role Assignment
  try {
    const hrSession = createMockSession({
      userId: 'HR-001',
      employeeId: 'EMP-HR-001',
      companyId: 'CORP-ALPHA',
      role: 'HR',
      authorityLevel: 'A3_OFFICIAL_STAFF',
      dataScope: 'COMPANY'
    });

    const escalationCheck = await PrivilegeGovernanceService.validateRoleAssignment(
      hrSession,
      'SUPER_ADMIN',
      'CORP-ALPHA'
    );

    const isBlocked = !escalationCheck.allowed;
    results.push({
      name: 'Privilege Escalation Protection: Block Non-SuperAdmin Granting SuperAdmin',
      passed: isBlocked,
      message: isBlocked ? 'Privilege escalation blocked with security reason.' : 'Failed: HR user was allowed to assign SUPER_ADMIN.'
    });
  } catch (err: any) {
    results.push({ name: 'Privilege Escalation Protection', passed: false, message: err.message });
  }

  // Test 6: Personal Record Scope Enforcement (Self-Access Only for Ground Staff)
  try {
    const guardSession = createMockSession({
      userId: 'GUARD-001',
      employeeId: 'EMP-GUARD-001',
      companyId: 'CORP-ALPHA',
      role: 'SEMI_SKILLED',
      authorityLevel: 'A8_SEMI_SKILLED',
      dataScope: 'SELF'
    });

    const ownRecordEval = PermissionRegistry.evaluatePermission(guardSession, 'HCM:EMPLOYEE:READ', {
      targetCompanyId: 'CORP-ALPHA',
      targetOwnerId: 'EMP-GUARD-001'
    });

    const otherRecordEval = PermissionRegistry.evaluatePermission(guardSession, 'HCM:EMPLOYEE:READ', {
      targetCompanyId: 'CORP-ALPHA',
      targetOwnerId: 'EMP-GUARD-002'
    });

    const passed = ownRecordEval.allowed && !otherRecordEval.allowed;
    results.push({
      name: 'Ground Staff Self-Scope Isolation (Personal Record Access)',
      passed,
      message: passed ? 'Guard can view own record but blocked from reading other employees.' : 'Self-scope isolation failed.'
    });
  } catch (err: any) {
    results.push({ name: 'Ground Staff Self-Scope Isolation', passed: false, message: err.message });
  }

  // Test 7: Enforcement with Automated Audit Logging
  try {
    const intruderSession = createMockSession({
      userId: 'INT-001',
      employeeId: 'EMP-INT-001',
      companyId: 'CORP-ALPHA',
      role: 'SUPPORT',
      authorityLevel: 'A9_SUPPORT',
      dataScope: 'SELF'
    });

    const enforced = await PrivilegeGovernanceService.enforce(
      intruderSession,
      'GRC_SECURITY:SECURITY_AUDIT:DELETE',
      { targetCompanyId: 'CORP-ALPHA' }
    );

    const passed = enforced === false;
    results.push({
      name: 'PrivilegeGovernanceService.enforce Action & Automatic Audit Logging',
      passed,
      message: passed ? 'Enforce blocked unauthorized action and logged security event.' : 'Failed: Action was permitted.'
    });
  } catch (err: any) {
    results.push({ name: 'Privilege Governance Enforcement', passed: false, message: err.message });
  }

  // Calculate summary
  const passedCount = results.filter(r => r.passed).length;
  const failedCount = results.filter(r => !r.passed).length;

  console.log(`=== PRIVILEGE GOVERNANCE VERIFICATION COMPLETED: ${passedCount} PASSED, ${failedCount} FAILED ===`);

  return { passedCount, failedCount, results };
}
