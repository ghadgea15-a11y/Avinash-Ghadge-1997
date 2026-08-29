import { UserSession } from '../types';
import { 
  DataProtectionService, 
  SENSITIVE_FIELD_REGISTRY 
} from '../services/dataProtectionService';

export async function runDataProtectionTests(): Promise<{ passed: number; failed: number; errors: string[] }> {
  let passed = 0;
  let failed = 0;
  const errors: string[] = [];

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`  ✅ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${testName}${detail ? ` - ${detail}` : ''}`);
      failed++;
      errors.push(`${testName}${detail ? `: ${detail}` : ''}`);
    }
  }

  console.log('\n🔒 RUNNING ENTERPRISE DATA PROTECTION & PRIVACY VERIFICATION SUITE...\n');

  // -------------------------------------------------------------
  // Test 1: SENSITIVE DATA CLASSIFICATION MATRIX
  // -------------------------------------------------------------
  try {
    const categories = new Set(SENSITIVE_FIELD_REGISTRY.map(f => f.category));
    assert(categories.has('IDENTITY_DOCUMENTS'), 'Test 1.1: IDENTITY_DOCUMENTS registered in catalog');
    assert(categories.has('SALARY_PAYROLL'), 'Test 1.2: SALARY_PAYROLL registered in catalog');
    assert(categories.has('STATUTORY_INFO'), 'Test 1.3: STATUTORY_INFO registered in catalog');
    assert(categories.has('CONTACT_INFO'), 'Test 1.4: CONTACT_INFO registered in catalog');
    assert(categories.has('ATTENDANCE_LOCATION'), 'Test 1.5: ATTENDANCE_LOCATION registered in catalog');
    assert(categories.has('CONTRACTS_COMMERCIAL'), 'Test 1.6: CONTRACTS_COMMERCIAL registered in catalog');
    assert(categories.has('AUTH_SECURITY'), 'Test 1.7: AUTH_SECURITY registered in catalog');
  } catch (err: any) {
    assert(false, 'Test 1: Classification Matrix Catalog', err.message);
  }

  // -------------------------------------------------------------
  // Test 2: DYNAMIC DATA MASKING (DDM)
  // -------------------------------------------------------------
  try {
    const maskedAadhaar = DataProtectionService.maskAadhaar('548912345678');
    assert(maskedAadhaar === 'XXXXXXXX5678', 'Test 2.1: Aadhaar masking outputs XXXXXXXX5678', `Got: ${maskedAadhaar}`);

    const maskedPan = DataProtectionService.maskPan('ABCDE1234F');
    assert(maskedPan === 'XXXXX1234F', 'Test 2.2: PAN masking outputs XXXXX1234F', `Got: ${maskedPan}`);

    const maskedBank = DataProtectionService.maskBankAccount('9180200456789123');
    assert(maskedBank.endsWith('9123') && maskedBank.includes('•'), 'Test 2.3: Bank account masked correctly', `Got: ${maskedBank}`);

    const maskedPhone = DataProtectionService.maskPhone('9876543210');
    assert(maskedPhone === '••••••3210', 'Test 2.4: Phone masked to ••••••3210', `Got: ${maskedPhone}`);

    const maskedEmail = DataProtectionService.maskEmail('rajesh.sharma@gmail.com');
    assert(maskedEmail.startsWith('r***a@') && maskedEmail.endsWith('gmail.com'), 'Test 2.5: Email masked correctly', `Got: ${maskedEmail}`);

    const maskedSalary = DataProtectionService.maskSalary(45000);
    assert(maskedSalary === '₹ ••••••', 'Test 2.6: Salary masked to ₹ ••••••', `Got: ${maskedSalary}`);
  } catch (err: any) {
    assert(false, 'Test 2: Dynamic Data Masking (DDM)', err.message);
  }

  // -------------------------------------------------------------
  // Test 3: STRICT TENANT ISOLATION (Cross-Company Access Blocked)
  // -------------------------------------------------------------
  try {
    const compASession: UserSession = {
      userId: 'USR-A1',
      employeeId: 'EMP-A1',
      fullName: 'Admin Alpha',
      email: 'admin@alpha.com',
      branchId: 'BR-01',
      companyId: 'COMP-ALPHA',
      role: 'COMPANY_ADMIN',
      authorityLevel: 'A0_OWNER',
      dataScope: 'COMPANY',
      token: 'tok-a',
      tokenExpiresAt: Date.now() + 3600000,
      isBiometricEnabled: false,
      lastActiveAt: Date.now(),
      loginMode: 'PASSWORD',
      accountStatus: 'ACTIVE',
      emailVerified: true,
      companyAdminApproval: 'APPROVED',
      hrApproval: 'APPROVED'
    };

    const crossTenantEval = DataProtectionService.evaluateAccess(compASession, {
      targetCompanyId: 'COMP-BETA',
      resourceType: 'EMPLOYEE',
      resourceId: 'EMP-B1',
      category: 'SALARY_PAYROLL',
      requestedAction: 'READ'
    });

    assert(!crossTenantEval.allowed && crossTenantEval.violatesTenant === true, 'Test 3.1: Cross-company data access strictly blocked', crossTenantEval.reason);
  } catch (err: any) {
    assert(false, 'Test 3: Strict Multi-Tenant Isolation', err.message);
  }

  // -------------------------------------------------------------
  // Test 4: SITE ISOLATION (Cross-Site Access Blocked for Site In-Charge)
  // -------------------------------------------------------------
  try {
    const siteInchargeSession: UserSession = {
      userId: 'USR-SIC1',
      employeeId: 'EMP-SIC1',
      fullName: 'Incharge North',
      email: 'sic@north.com',
      branchId: 'BR-01',
      companyId: 'COMP-ALPHA',
      assignedSiteId: 'SITE-NORTH',
      role: 'SITE_IN_CHARGE',
      authorityLevel: 'A5_SITE_IN_CHARGE',
      dataScope: 'SITE',
      token: 'tok-sic',
      tokenExpiresAt: Date.now() + 3600000,
      isBiometricEnabled: false,
      lastActiveAt: Date.now(),
      loginMode: 'PASSWORD',
      accountStatus: 'ACTIVE',
      emailVerified: true,
      companyAdminApproval: 'APPROVED',
      hrApproval: 'APPROVED'
    };

    const crossSiteEval = DataProtectionService.evaluateAccess(siteInchargeSession, {
      targetCompanyId: 'COMP-ALPHA',
      targetSiteId: 'SITE-SOUTH',
      resourceType: 'EMPLOYEE',
      resourceId: 'EMP-SOUTH-1',
      category: 'EMPLOYEE_PERSONAL',
      requestedAction: 'READ'
    });

    assert(!crossSiteEval.allowed && crossSiteEval.violatesSite === true, 'Test 4.1: Cross-site data access strictly blocked for site in-charge', crossSiteEval.reason);
  } catch (err: any) {
    assert(false, 'Test 4: Site-Level Isolation', err.message);
  }

  // -------------------------------------------------------------
  // Test 5: SALARY & PAYROLL ACCESS CONTROL
  // -------------------------------------------------------------
  try {
    const supervisorSession: UserSession = {
      userId: 'USR-SUP1',
      employeeId: 'EMP-SUP1',
      fullName: 'Supervisor Alpha',
      email: 'sup@alpha.com',
      branchId: 'BR-01',
      companyId: 'COMP-ALPHA',
      role: 'SUPERVISOR',
      authorityLevel: 'A6_SUPERVISOR',
      dataScope: 'SITE',
      token: 'tok-sup',
      tokenExpiresAt: Date.now() + 3600000,
      isBiometricEnabled: false,
      lastActiveAt: Date.now(),
      loginMode: 'PASSWORD',
      accountStatus: 'ACTIVE',
      emailVerified: true,
      companyAdminApproval: 'APPROVED',
      hrApproval: 'APPROVED'
    };

    // Supervisor accessing another employee's salary
    const peerSalaryEval = DataProtectionService.evaluateAccess(supervisorSession, {
      targetCompanyId: 'COMP-ALPHA',
      targetEmployeeId: 'EMP-GUARD-10',
      resourceType: 'PAYROLL',
      category: 'SALARY_PAYROLL',
      requestedAction: 'READ'
    });
    assert(!peerSalaryEval.allowed && peerSalaryEval.violatesRole === true, 'Test 5.1: Supervisor blocked from reading peer employee salary', peerSalaryEval.reason);

    // Supervisor accessing OWN salary (self)
    const selfSalaryEval = DataProtectionService.evaluateAccess(supervisorSession, {
      targetCompanyId: 'COMP-ALPHA',
      targetEmployeeId: 'EMP-SUP1',
      resourceType: 'PAYROLL',
      category: 'SALARY_PAYROLL',
      requestedAction: 'READ'
    });
    assert(selfSalaryEval.allowed === true && !selfSalaryEval.requiresMasking, 'Test 5.2: User can view OWN salary profile without redaction');

    // HR Admin accessing salary
    const hrSession: UserSession = {
      userId: 'USR-HR1',
      employeeId: 'EMP-HR1',
      fullName: 'HR Head',
      email: 'hr@alpha.com',
      branchId: 'BR-01',
      companyId: 'COMP-ALPHA',
      role: 'HR_ADMIN',
      authorityLevel: 'A3_OFFICIAL_STAFF',
      dataScope: 'COMPANY',
      token: 'tok-hr',
      tokenExpiresAt: Date.now() + 3600000,
      isBiometricEnabled: false,
      lastActiveAt: Date.now(),
      loginMode: 'PASSWORD',
      accountStatus: 'ACTIVE',
      emailVerified: true,
      companyAdminApproval: 'APPROVED',
      hrApproval: 'APPROVED'
    };
    const hrSalaryEval = DataProtectionService.evaluateAccess(hrSession, {
      targetCompanyId: 'COMP-ALPHA',
      targetEmployeeId: 'EMP-GUARD-10',
      resourceType: 'PAYROLL',
      category: 'SALARY_PAYROLL',
      requestedAction: 'READ'
    });
    assert(hrSalaryEval.allowed === true && !hrSalaryEval.requiresMasking, 'Test 5.3: HR Admin authorized to view employee salary');
  } catch (err: any) {
    assert(false, 'Test 5: Salary & Payroll Access Control', err.message);
  }

  // -------------------------------------------------------------
  // Test 6: DATA LEAKAGE PREVENTION (DLP Sanitizer)
  // -------------------------------------------------------------
  try {
    const rawData = {
      user: 'admin',
      password: 'SuperSecretPassword123!',
      token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ1c3IxIn0',
      apiKey: 'AIzaSyD-SecretApiKey12345',
      employee: {
        fullName: 'Vikram Singh',
        aadhaarNumber: '123456789012',
        panNumber: 'ABCDE5678G',
        bankAccount: '1234567890123456'
      }
    };

    const sanitized = DataProtectionService.sanitizeForLogging(rawData);
    assert(sanitized.password === '[REDACTED_SECRET]', 'Test 6.1: DLP scrubs password from logs');
    assert(sanitized.token === '[REDACTED_SECRET]', 'Test 6.2: DLP scrubs auth token from logs');
    assert(sanitized.apiKey === '[REDACTED_SECRET]', 'Test 6.3: DLP scrubs API key from logs');
    assert(sanitized.employee.aadhaarNumber === 'XXXXXXXX9012', 'Test 6.4: DLP masks Aadhaar in nested log objects');
    assert(sanitized.employee.panNumber === 'XXXXX5678G', 'Test 6.5: DLP masks PAN in nested log objects');
  } catch (err: any) {
    assert(false, 'Test 6: Data Leakage Prevention (DLP)', err.message);
  }

  // -------------------------------------------------------------
  // Test 7: STORAGE PATH ACCESS GUARDIAN
  // -------------------------------------------------------------
  try {
    const compASession: UserSession = {
      userId: 'USR-A1',
      employeeId: 'EMP-A1',
      fullName: 'Guard Alpha',
      email: 'guard@alpha.com',
      branchId: 'BR-01',
      companyId: 'COMP-ALPHA',
      role: 'GUARD',
      authorityLevel: 'A9_SUPPORT',
      dataScope: 'SELF',
      token: 'tok-a',
      tokenExpiresAt: Date.now() + 3600000,
      isBiometricEnabled: false,
      lastActiveAt: Date.now(),
      loginMode: 'PASSWORD',
      accountStatus: 'ACTIVE',
      emailVerified: true,
      companyAdminApproval: 'APPROVED',
      hrApproval: 'APPROVED'
    };

    // Cross-tenant storage access
    const crossStorage = DataProtectionService.validateStorageAccess(compASession, 'companies/COMP-BETA/employees/EMP-B1/documents/aadhaar.pdf');
    assert(!crossStorage.allowed, 'Test 7.1: Cross-tenant storage path access blocked', crossStorage.reason);

    // Cross-employee document access by non-HR
    const peerDocStorage = DataProtectionService.validateStorageAccess(compASession, 'companies/COMP-ALPHA/employees/EMP-A2/documents/pan.pdf');
    assert(!peerDocStorage.allowed, 'Test 7.2: Non-HR ground staff blocked from reading peer storage documents', peerDocStorage.reason);

    // Self employee document access
    const selfDocStorage = DataProtectionService.validateStorageAccess(compASession, 'companies/COMP-ALPHA/employees/EMP-A1/documents/pan.pdf');
    assert(selfDocStorage.allowed, 'Test 7.3: Employee permitted to access own document storage path');
  } catch (err: any) {
    assert(false, 'Test 7: Storage Path Access Guardian', err.message);
  }

  // -------------------------------------------------------------
  // Test 8: RETENTION & ANTI-ACCIDENTAL DELETION GOVERNANCE
  // -------------------------------------------------------------
  try {
    const superAdminSession: UserSession = {
      userId: 'USR-ROOT',
      employeeId: 'EMP-ROOT',
      fullName: 'Root Admin',
      email: 'root@platform.com',
      branchId: 'BR-01',
      companyId: 'COMP-ALPHA',
      role: 'SUPER_ADMIN',
      authorityLevel: 'A0_OWNER',
      dataScope: 'GLOBAL',
      token: 'tok-root',
      tokenExpiresAt: Date.now() + 3600000,
      isBiometricEnabled: false,
      lastActiveAt: Date.now(),
      loginMode: 'PASSWORD',
      accountStatus: 'ACTIVE',
      emailVerified: true,
      companyAdminApproval: 'APPROVED',
      hrApproval: 'APPROVED'
    };

    const auditDelete = DataProtectionService.validateDeletionRequest(superAdminSession, 'SECURITY_AUDIT', 'EVT-1001');
    assert(!auditDelete.allowed, 'Test 8.1: Security audit log deletion is strictly impossible even for Super Admin (Immutable)');

    const guardSession: UserSession = {
      userId: 'USR-G1',
      employeeId: 'EMP-G1',
      fullName: 'Guard G1',
      email: 'g1@alpha.com',
      branchId: 'BR-01',
      companyId: 'COMP-ALPHA',
      role: 'GUARD',
      authorityLevel: 'A9_SUPPORT',
      dataScope: 'SELF',
      token: 'tok-g',
      tokenExpiresAt: Date.now() + 3600000,
      isBiometricEnabled: false,
      lastActiveAt: Date.now(),
      loginMode: 'PASSWORD',
      accountStatus: 'ACTIVE',
      emailVerified: true,
      companyAdminApproval: 'APPROVED',
      hrApproval: 'APPROVED'
    };

    const guardEmpDelete = DataProtectionService.validateDeletionRequest(guardSession, 'EMPLOYEE_PERSONAL', 'EMP-G2');
    assert(!guardEmpDelete.allowed, 'Test 8.2: Guard blocked from deleting employee records', guardEmpDelete.reason);
  } catch (err: any) {
    assert(false, 'Test 8: Retention & Anti-Accidental Deletion', err.message);
  }

  console.log(`\n======================================================`);
  console.log(`🎯 PRIVACY & DATA PROTECTION RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log(`======================================================\n`);

  return { passed, failed, errors };
}
