import { 
  UserSession, 
  UserRole, 
  AuthorityLevel,
  SensitiveDataCategory,
  DataSensitivityLevel,
  DataMaskingPattern,
  SensitiveFieldDefinition,
  SensitiveDataAccessContext,
  SensitiveDataAccessResult
} from '../types';
import { SecurityAuditService } from './securityAuditService';

/**
 * Master Enterprise Data Classification Registry
 */
export const SENSITIVE_FIELD_REGISTRY: SensitiveFieldDefinition[] = [
  // 1. IDENTITY DOCUMENTS
  {
    fieldKey: 'aadhaarNumber',
    category: 'IDENTITY_DOCUMENTS',
    sensitivityLevel: 'RESTRICTED',
    maskingPattern: 'AADHAAR',
    description: 'Government 12-digit Aadhaar UID',
    exemptRoles: ['SUPER_ADMIN', 'COMPANY_ADMIN', 'HR_ADMIN', 'HR'],
    exemptAuthorityLevels: ['A0_OWNER', 'A1_DIRECTOR_CEO', 'A2_GENERAL_MANAGER', 'A3_OFFICIAL_STAFF']
  },
  {
    fieldKey: 'panNumber',
    category: 'IDENTITY_DOCUMENTS',
    sensitivityLevel: 'RESTRICTED',
    maskingPattern: 'PAN',
    description: 'Income Tax Permanent Account Number (PAN)',
    exemptRoles: ['SUPER_ADMIN', 'COMPANY_ADMIN', 'HR_ADMIN', 'HR', 'FINANCE'],
    exemptAuthorityLevels: ['A0_OWNER', 'A1_DIRECTOR_CEO', 'A2_GENERAL_MANAGER', 'A3_OFFICIAL_STAFF']
  },
  {
    fieldKey: 'bankAccountNumber',
    category: 'IDENTITY_DOCUMENTS',
    sensitivityLevel: 'RESTRICTED',
    maskingPattern: 'BANK_ACCOUNT',
    description: 'Employee or Vendor Bank Account Number',
    exemptRoles: ['SUPER_ADMIN', 'COMPANY_ADMIN', 'HR_ADMIN', 'FINANCE'],
    exemptAuthorityLevels: ['A0_OWNER', 'A1_DIRECTOR_CEO', 'A2_GENERAL_MANAGER', 'A3_OFFICIAL_STAFF']
  },
  {
    fieldKey: 'passportNumber',
    category: 'IDENTITY_DOCUMENTS',
    sensitivityLevel: 'CONFIDENTIAL',
    maskingPattern: 'FULL_REDACT',
    description: 'Passport Number',
    exemptRoles: ['SUPER_ADMIN', 'COMPANY_ADMIN', 'HR_ADMIN', 'HR'],
    exemptAuthorityLevels: ['A0_OWNER', 'A1_DIRECTOR_CEO', 'A2_GENERAL_MANAGER']
  },

  // 2. SALARY & PAYROLL
  {
    fieldKey: 'basicSalary',
    category: 'SALARY_PAYROLL',
    sensitivityLevel: 'RESTRICTED',
    maskingPattern: 'SALARY',
    description: 'Base salary component',
    exemptRoles: ['SUPER_ADMIN', 'COMPANY_ADMIN', 'HR_ADMIN', 'FINANCE', 'DIRECTOR_CEO', 'OWNER_PROMOTER'],
    exemptAuthorityLevels: ['A0_OWNER', 'A1_DIRECTOR_CEO', 'A2_GENERAL_MANAGER', 'A3_OFFICIAL_STAFF']
  },
  {
    fieldKey: 'ctc',
    category: 'SALARY_PAYROLL',
    sensitivityLevel: 'RESTRICTED',
    maskingPattern: 'SALARY',
    description: 'Cost to Company total annual/monthly package',
    exemptRoles: ['SUPER_ADMIN', 'COMPANY_ADMIN', 'HR_ADMIN', 'FINANCE', 'DIRECTOR_CEO', 'OWNER_PROMOTER'],
    exemptAuthorityLevels: ['A0_OWNER', 'A1_DIRECTOR_CEO', 'A2_GENERAL_MANAGER']
  },
  {
    fieldKey: 'netSalary',
    category: 'SALARY_PAYROLL',
    sensitivityLevel: 'RESTRICTED',
    maskingPattern: 'SALARY',
    description: 'Net payable salary after statutory deductions',
    exemptRoles: ['SUPER_ADMIN', 'COMPANY_ADMIN', 'HR_ADMIN', 'FINANCE', 'DIRECTOR_CEO', 'OWNER_PROMOTER'],
    exemptAuthorityLevels: ['A0_OWNER', 'A1_DIRECTOR_CEO', 'A2_GENERAL_MANAGER', 'A3_OFFICIAL_STAFF']
  },

  // 3. STATUTORY INFO
  {
    fieldKey: 'pfUanNumber',
    category: 'STATUTORY_INFO',
    sensitivityLevel: 'CONFIDENTIAL',
    maskingPattern: 'FULL_REDACT',
    description: 'Provident Fund Universal Account Number (UAN)',
    exemptRoles: ['SUPER_ADMIN', 'COMPANY_ADMIN', 'HR_ADMIN', 'HR', 'FINANCE'],
    exemptAuthorityLevels: ['A0_OWNER', 'A1_DIRECTOR_CEO', 'A2_GENERAL_MANAGER', 'A3_OFFICIAL_STAFF']
  },
  {
    fieldKey: 'esiIpNumber',
    category: 'STATUTORY_INFO',
    sensitivityLevel: 'CONFIDENTIAL',
    maskingPattern: 'FULL_REDACT',
    description: 'Employee State Insurance IP Number',
    exemptRoles: ['SUPER_ADMIN', 'COMPANY_ADMIN', 'HR_ADMIN', 'HR', 'FINANCE'],
    exemptAuthorityLevels: ['A0_OWNER', 'A1_DIRECTOR_CEO', 'A2_GENERAL_MANAGER', 'A3_OFFICIAL_STAFF']
  },

  // 4. CONTACT INFO
  {
    fieldKey: 'mobileNumber',
    category: 'CONTACT_INFO',
    sensitivityLevel: 'CONFIDENTIAL',
    maskingPattern: 'PHONE',
    description: 'Employee or Contact Mobile Phone',
    exemptRoles: ['SUPER_ADMIN', 'COMPANY_ADMIN', 'HR_ADMIN', 'HR', 'OPS_MANAGER', 'REGIONAL_MANAGER', 'AREA_MANAGER', 'SITE_IN_CHARGE'],
    exemptAuthorityLevels: ['A0_OWNER', 'A1_DIRECTOR_CEO', 'A2_GENERAL_MANAGER', 'A3_OFFICIAL_STAFF', 'A4_REGIONAL_AREA_MANAGER', 'A5_SITE_IN_CHARGE']
  },
  {
    fieldKey: 'personalEmail',
    category: 'CONTACT_INFO',
    sensitivityLevel: 'CONFIDENTIAL',
    maskingPattern: 'EMAIL',
    description: 'Personal email address',
    exemptRoles: ['SUPER_ADMIN', 'COMPANY_ADMIN', 'HR_ADMIN', 'HR'],
    exemptAuthorityLevels: ['A0_OWNER', 'A1_DIRECTOR_CEO', 'A2_GENERAL_MANAGER', 'A3_OFFICIAL_STAFF']
  },

  // 5. ATTENDANCE & LOCATION
  {
    fieldKey: 'punchGpsCoordinates',
    category: 'ATTENDANCE_LOCATION',
    sensitivityLevel: 'CONFIDENTIAL',
    maskingPattern: 'GPS',
    description: 'Latitude and Longitude of clock-in/out event',
    exemptRoles: ['SUPER_ADMIN', 'COMPANY_ADMIN', 'HR_ADMIN', 'OPS_MANAGER', 'REGIONAL_MANAGER', 'AREA_MANAGER', 'SITE_IN_CHARGE'],
    exemptAuthorityLevels: ['A0_OWNER', 'A1_DIRECTOR_CEO', 'A2_GENERAL_MANAGER', 'A3_OFFICIAL_STAFF', 'A4_REGIONAL_AREA_MANAGER', 'A5_SITE_IN_CHARGE']
  },

  // 6. CONTRACTS & COMMERCIAL
  {
    fieldKey: 'billingRate',
    category: 'CONTRACTS_COMMERCIAL',
    sensitivityLevel: 'CONFIDENTIAL',
    maskingPattern: 'SALARY',
    description: 'Client billing hourly/monthly rates',
    exemptRoles: ['SUPER_ADMIN', 'COMPANY_ADMIN', 'FINANCE', 'COMMERCIAL', 'DIRECTOR_CEO', 'OWNER_PROMOTER'],
    exemptAuthorityLevels: ['A0_OWNER', 'A1_DIRECTOR_CEO', 'A2_GENERAL_MANAGER']
  },

  // 7. FINANCIAL RECORDS
  {
    fieldKey: 'invoiceAmount',
    category: 'FINANCIAL_RECORDS',
    sensitivityLevel: 'CONFIDENTIAL',
    maskingPattern: 'SALARY',
    description: 'Commercial invoice subtotal and tax amounts',
    exemptRoles: ['SUPER_ADMIN', 'COMPANY_ADMIN', 'FINANCE', 'COMMERCIAL', 'DIRECTOR_CEO', 'OWNER_PROMOTER'],
    exemptAuthorityLevels: ['A0_OWNER', 'A1_DIRECTOR_CEO', 'A2_GENERAL_MANAGER']
  },

  // 8. AUTH & SECURITY
  {
    fieldKey: 'hashedPassword',
    category: 'AUTH_SECURITY',
    sensitivityLevel: 'RESTRICTED',
    maskingPattern: 'FULL_REDACT',
    description: 'Hashed PIN or authentication credential',
    exemptRoles: [], // Never exposed to any role
    exemptAuthorityLevels: []
  },
  {
    fieldKey: 'sessionToken',
    category: 'AUTH_SECURITY',
    sensitivityLevel: 'RESTRICTED',
    maskingPattern: 'FULL_REDACT',
    description: 'Session bearer token',
    exemptRoles: [],
    exemptAuthorityLevels: []
  }
];

export class DataProtectionService {

  // =========================================================================
  // 1. DYNAMIC DATA MASKING (DDM) UTILITIES
  // =========================================================================

  /**
   * Masks a 12-digit Aadhaar Number: e.g. "XXXXXXXX9876"
   */
  public static maskAadhaar(val: string | null | undefined): string {
    if (!val) return '';
    const clean = String(val).replace(/\D/g, '');
    if (clean.length < 4) return 'XXXXXXXXXXXX';
    const last4 = clean.slice(-4);
    return `XXXXXXXX${last4}`;
  }

  /**
   * Masks a 10-character Indian PAN: e.g. "XXXXX1234F"
   */
  public static maskPan(val: string | null | undefined): string {
    if (!val) return '';
    const clean = String(val).trim().toUpperCase();
    if (clean.length < 5) return 'XXXXXXXXXX';
    const last5 = clean.slice(-5);
    return `XXXXX${last5}`;
  }

  /**
   * Masks a Bank Account Number: e.g. "••••••••1234"
   */
  public static maskBankAccount(val: string | null | undefined): string {
    if (!val) return '';
    const clean = String(val).trim();
    if (clean.length <= 4) return '••••••••';
    const last4 = clean.slice(-4);
    return `${'•'.repeat(Math.max(4, clean.length - 4))}${last4}`;
  }

  /**
   * Masks a Phone Number: e.g. "••••••1234"
   */
  public static maskPhone(val: string | null | undefined): string {
    if (!val) return '';
    const clean = String(val).trim();
    if (clean.length <= 4) return '••••••••••';
    const last4 = clean.slice(-4);
    return `••••••${last4}`;
  }

  /**
   * Masks an Email Address: e.g. "j***@company.com"
   */
  public static maskEmail(val: string | null | undefined): string {
    if (!val) return '';
    const clean = String(val).trim();
    const parts = clean.split('@');
    if (parts.length !== 2) return '•••••@••••.com';
    const name = parts[0];
    const domain = parts[1];
    const maskedName = name.length > 2 ? `${name[0]}***${name[name.length - 1]}` : `${name[0]}***`;
    return `${maskedName}@${domain}`;
  }

  /**
   * Masks a Salary / Monetary Amount: e.g. "₹ ••••••"
   */
  public static maskSalary(val: number | string | null | undefined): string {
    if (val === null || val === undefined) return '₹ 0.00';
    return '₹ ••••••';
  }

  /**
   * Masks GPS coordinates by fuzzing precision for privacy (~1.1km area)
   */
  public static maskGps(lat: number, lng: number): { lat: number; lng: number } {
    return {
      lat: Math.round(lat * 100) / 100,
      lng: Math.round(lng * 100) / 100
    };
  }

  /**
   * Full Redaction Mask
   */
  public static fullRedact(val?: any): string {
    return '[REDACTED_CONFIDENTIAL]';
  }

  // =========================================================================
  // 2. AUTHORITATIVE ACCESS EVALUATION (Company -> Region -> Site -> Dept -> Employee)
  // =========================================================================

  /**
   * Evaluates if a user session is authorized to access a given sensitive data category and record scope.
   */
  public static evaluateAccess(
    session: UserSession | null,
    context: SensitiveDataAccessContext
  ): SensitiveDataAccessResult {
    // 1. Unauthenticated access is strictly rejected
    if (!session) {
      return {
        allowed: false,
        requiresMasking: true,
        reason: 'Unauthenticated session attempted sensitive data access.'
      };
    }

    // 2. Super Admin has unrestricted platform access
    if (session.role === 'SUPER_ADMIN') {
      return { allowed: true, requiresMasking: false };
    }

    // 3. Strict Multi-Tenant Boundary: Cross-company access is blocked
    if (session.companyId !== context.targetCompanyId) {
      return {
        allowed: false,
        requiresMasking: true,
        violatesTenant: true,
        reason: `Cross-tenant violation: User from '${session.companyId}' attempted to access sensitive data of '${context.targetCompanyId}'.`
      };
    }

    // 4. Data Scope & Hierarchy Verification
    const scope = session.dataScope || 'SELF';
    const isOwnerOrExecutive = session.role === 'OWNER_PROMOTER' || session.role === 'DIRECTOR_CEO' || session.role === 'COMPANY_ADMIN';

    // 5. Site Isolation for Site-Scoped / Field Staff
    if (context.targetSiteId && !isOwnerOrExecutive) {
      const userSite = session.assignedSiteId || session.branchId;
      if (scope === 'SITE' && userSite && userSite !== context.targetSiteId) {
        return {
          allowed: false,
          requiresMasking: true,
          violatesSite: true,
          reason: `Cross-site violation: User assigned to site '${userSite}' cannot access resources of site '${context.targetSiteId}'.`
        };
      }
    }

    // 6. Category-Specific Access Rules
    switch (context.category) {
      case 'AUTH_SECURITY':
        // Passwords, tokens, credentials can never be viewed
        return {
          allowed: false,
          requiresMasking: true,
          reason: 'Access to raw authentication credentials or tokens is strictly forbidden.'
        };

      case 'SALARY_PAYROLL': {
        const canViewAllSalary = isOwnerOrExecutive || 
          session.role === 'HR_ADMIN' || 
          session.role === 'HR' || 
          session.role === 'FINANCE';

        const isSelf = context.targetEmployeeId && (session.employeeId === context.targetEmployeeId || session.userId === context.targetEmployeeId);

        if (!canViewAllSalary && !isSelf) {
          return {
            allowed: false,
            requiresMasking: true,
            violatesRole: true,
            reason: `Role '${session.role}' is not authorized to view salary or payroll records of other employees.`
          };
        }
        return { allowed: true, requiresMasking: false };
      }

      case 'IDENTITY_DOCUMENTS': {
        const canViewAllIdentity = isOwnerOrExecutive || 
          session.role === 'HR_ADMIN' || 
          session.role === 'HR';

        const isSelf = context.targetEmployeeId && (session.employeeId === context.targetEmployeeId || session.userId === context.targetEmployeeId);

        if (!canViewAllIdentity && !isSelf) {
          // If manager/supervisor, they can see employee profile but identity documents must be masked
          if (session.role === 'OPS_MANAGER' || session.role === 'REGIONAL_MANAGER' || session.role === 'AREA_MANAGER' || session.role === 'SITE_IN_CHARGE' || session.role === 'SUPERVISOR') {
            return { allowed: true, requiresMasking: true, maskingPattern: 'AADHAAR' };
          }
          return {
            allowed: false,
            requiresMasking: true,
            violatesRole: true,
            reason: `Role '${session.role}' cannot access identity documents of employee '${context.targetEmployeeId}'.`
          };
        }
        return { allowed: true, requiresMasking: false };
      }

      case 'CONTRACTS_COMMERCIAL':
      case 'FINANCIAL_RECORDS': {
        const canViewFinancials = isOwnerOrExecutive || 
          session.role === 'FINANCE' || 
          session.role === 'COMMERCIAL' || 
          session.role === 'CLIENT_MANAGEMENT';

        if (!canViewFinancials) {
          return {
            allowed: false,
            requiresMasking: true,
            violatesRole: true,
            reason: `Role '${session.role}' is not authorized to access commercial contracts or billing data.`
          };
        }
        return { allowed: true, requiresMasking: false };
      }

      case 'SECURITY_AUDIT': {
        const canViewAudit = isOwnerOrExecutive || 
          session.role === 'HR_ADMIN' || 
          session.role === 'IT' || 
          session.role === 'EHS' || 
          session.role === 'QUALITY';

        if (!canViewAudit) {
          return {
            allowed: false,
            requiresMasking: true,
            violatesRole: true,
            reason: `Role '${session.role}' is not authorized to view security audit event records.`
          };
        }
        return { allowed: true, requiresMasking: false };
      }

      case 'EMPLOYEE_PERSONAL':
      case 'CONTACT_INFO': {
        const isSelf = context.targetEmployeeId && (session.employeeId === context.targetEmployeeId || session.userId === context.targetEmployeeId);
        if (isSelf || isOwnerOrExecutive || session.role === 'HR_ADMIN' || session.role === 'HR') {
          return { allowed: true, requiresMasking: false };
        }
        // Site supervisors / field officers can view work contacts but get masked personal details
        if (scope === 'SITE' || scope === 'AREA' || scope === 'REGION') {
          return { allowed: true, requiresMasking: true, maskingPattern: 'PHONE' };
        }
        // Self-scoped employee accessing another employee's personal details is blocked
        if (scope === 'SELF' && !isSelf) {
          return {
            allowed: false,
            requiresMasking: true,
            violatesScope: true,
            reason: 'Ground staff cannot access personal records of other employees.'
          };
        }
        return { allowed: true, requiresMasking: false };
      }

      default:
        return { allowed: true, requiresMasking: false };
    }
  }

  /**
   * Authoritative access enforcement with automatic immutable security audit logging when rejected.
   */
  public static async enforceSensitiveAccess(
    session: UserSession | null,
    context: SensitiveDataAccessContext
  ): Promise<SensitiveDataAccessResult> {
    const result = this.evaluateAccess(session, context);

    if (!result.allowed) {
      if (session) {
        let action = 'UNAUTHORIZED_SENSITIVE_DATA_ACCESS';
        let severity: 'HIGH' | 'CRITICAL' = 'HIGH';

        if (result.violatesTenant) {
          action = 'CROSS_COMPANY_ACCESS_DENIED';
          severity = 'CRITICAL';
        } else if (result.violatesSite) {
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
          context.resourceType || 'DATA_PROTECTION',
          context.resourceId || context.category,
          false,
          severity,
          result.reason || `Unauthorized access attempt on ${context.category}`
        ).catch(() => {});
      }
    }

    return result;
  }

  // =========================================================================
  // 3. RECORD-LEVEL SANITIZATION & DYNAMIC MASKING WRAPPERS
  // =========================================================================

  /**
   * Sanitizes an Employee record dynamically based on the actor's session.
   */
  public static sanitizeEmployeeRecord<T extends Record<string, any>>(session: UserSession | null, employee: T): T {
    if (!employee) return employee;
    const cloned: Record<string, any> = { ...employee };

    const access = this.evaluateAccess(session, {
      targetCompanyId: cloned.companyId || (session ? session.companyId : ''),
      targetSiteId: cloned.assignedSiteId || cloned.branchId,
      targetEmployeeId: cloned.id || cloned.employeeId,
      resourceType: 'EMPLOYEE',
      resourceId: cloned.id || cloned.employeeId,
      category: 'IDENTITY_DOCUMENTS',
      requestedAction: 'READ'
    });

    if (access.requiresMasking || !access.allowed) {
      if (cloned.aadhaarNumber) cloned.aadhaarNumber = this.maskAadhaar(cloned.aadhaarNumber);
      if (cloned.panNumber) cloned.panNumber = this.maskPan(cloned.panNumber);
      if (cloned.bankAccountNumber) cloned.bankAccountNumber = this.maskBankAccount(cloned.bankAccountNumber);
      if (cloned.passportNumber) cloned.passportNumber = this.fullRedact();
      if (cloned.pfUanNumber) cloned.pfUanNumber = this.fullRedact();
      if (cloned.esiIpNumber) cloned.esiIpNumber = this.fullRedact();
      if (cloned.basicSalary !== undefined) cloned.basicSalary = this.maskSalary(cloned.basicSalary);
      if (cloned.grossSalary !== undefined) cloned.grossSalary = this.maskSalary(cloned.grossSalary);
      if (cloned.netSalary !== undefined) cloned.netSalary = this.maskSalary(cloned.netSalary);
      if (cloned.ctc !== undefined) cloned.ctc = this.maskSalary(cloned.ctc);
    }

    // Always strip internal auth secrets if accidentally attached
    delete cloned.password;
    delete cloned.pin;
    delete cloned.hashedPassword;
    delete cloned.token;

    return cloned as T;
  }

  /**
   * Sanitizes a Salary/Payroll record dynamically.
   */
  public static sanitizeSalaryProfile<T extends Record<string, any>>(session: UserSession | null, profile: T): T {
    if (!profile) return profile;
    const cloned: Record<string, any> = { ...profile };

    const access = this.evaluateAccess(session, {
      targetCompanyId: cloned.companyId || (session ? session.companyId : ''),
      targetEmployeeId: cloned.employeeId || cloned.id,
      resourceType: 'PAYROLL',
      resourceId: cloned.id || cloned.employeeId,
      category: 'SALARY_PAYROLL',
      requestedAction: 'READ'
    });

    if (!access.allowed || access.requiresMasking) {
      cloned.basicSalary = this.maskSalary(cloned.basicSalary);
      cloned.grossSalary = this.maskSalary(cloned.grossSalary);
      cloned.netSalary = this.maskSalary(cloned.netSalary);
      cloned.ctc = this.maskSalary(cloned.ctc);
      if (cloned.bankAccountNumber) cloned.bankAccountNumber = this.maskBankAccount(cloned.bankAccountNumber);
      if (cloned.panNumber) cloned.panNumber = this.maskPan(cloned.panNumber);
      if (cloned.aadhaarNumber) cloned.aadhaarNumber = this.maskAadhaar(cloned.aadhaarNumber);
    }

    return cloned as T;
  }

  // =========================================================================
  // 4. DATA LEAKAGE PREVENTION (DLP) SANITIZERS
  // =========================================================================

  /**
   * Deeply cleanses an object before sending to logging, analytics, or UI bundles.
   * Strips all passwords, credentials, tokens, and sensitive private keys.
   */
  public static sanitizeForLogging(obj: any): any {
    if (obj === null || obj === undefined) return obj;
    if (typeof obj !== 'object') return obj;

    if (Array.isArray(obj)) {
      return obj.map(item => this.sanitizeForLogging(item));
    }

    const sanitized: Record<string, any> = {};
    const SENSITIVE_KEYS = [
      'password', 'pin', 'hashedpassword', 'token', 'refreshtoken', 'accesstoken',
      'secret', 'privatekey', 'apikey', 'credential', 'authheader'
    ];

    for (const [key, value] of Object.entries(obj)) {
      const lowerKey = key.toLowerCase();
      if (SENSITIVE_KEYS.some(sk => lowerKey.includes(sk))) {
        sanitized[key] = '[REDACTED_SECRET]';
      } else if (lowerKey.includes('aadhaar')) {
        sanitized[key] = typeof value === 'string' ? this.maskAadhaar(value) : '[REDACTED_AADHAAR]';
      } else if (lowerKey.includes('pan') && lowerKey !== 'company' && lowerKey !== 'span') {
        sanitized[key] = typeof value === 'string' ? this.maskPan(value) : '[REDACTED_PAN]';
      } else if (typeof value === 'object') {
        sanitized[key] = this.sanitizeForLogging(value);
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  /**
   * Sanitizes export datasets based on the caller's session role and scope.
   */
  public static sanitizeExportDataset(
    session: UserSession,
    records: any[],
    category: SensitiveDataCategory
  ): any[] {
    if (!records || !Array.isArray(records)) return [];

    return records.map(record => {
      const access = this.evaluateAccess(session, {
        targetCompanyId: record.companyId || session.companyId,
        targetSiteId: record.siteId || record.branchId,
        targetEmployeeId: record.employeeId || record.id,
        resourceType: 'EXPORT',
        category,
        requestedAction: 'EXPORT'
      });

      if (!access.allowed || access.requiresMasking) {
        return this.sanitizeEmployeeRecord(session, record);
      }
      return record;
    });
  }

  // =========================================================================
  // 5. STORAGE ACCESS & FILE DOWNLOAD PROTECTION
  // =========================================================================

  /**
   * Validates storage file path access to prevent IDOR and cross-tenant file exfiltration.
   */
  public static validateStorageAccess(
    session: UserSession | null,
    filePath: string,
    action: 'READ' | 'WRITE' | 'DELETE' = 'READ'
  ): { allowed: boolean; reason?: string } {
    if (!session) {
      return { allowed: false, reason: 'Unauthenticated storage access denied.' };
    }

    if (session.role === 'SUPER_ADMIN') {
      return { allowed: true };
    }

    // Storage path format: companies/{companyId}/...
    const parts = filePath.split('/').filter(Boolean);
    if (parts.length >= 2 && parts[0] === 'companies') {
      const targetCompanyId = parts[1];
      if (session.companyId !== targetCompanyId) {
        return {
          allowed: false,
          reason: `Cross-tenant storage access blocked: Actor from '${session.companyId}' cannot access files in '${targetCompanyId}'.`
        };
      }

      // Check employee document ownership if nested under employees/{employeeId}/...
      if (parts.length >= 4 && parts[2] === 'employees') {
        const targetEmpId = parts[3];
        const isHRAdmin = session.role === 'COMPANY_ADMIN' || session.role === 'HR_ADMIN' || session.role === 'HR';
        const isSelf = session.employeeId === targetEmpId || session.userId === targetEmpId;

        if (action === 'DELETE' && !isHRAdmin) {
          return { allowed: false, reason: 'Only HR administrators can delete employee documents.' };
        }

        if (!isHRAdmin && !isSelf) {
          return { allowed: false, reason: 'Unauthorized access to employee personal document path.' };
        }
      }
    }

    return { allowed: true };
  }

  // =========================================================================
  // 6. RETENTION & ANTI-ACCIDENTAL DELETION GOVERNANCE
  // =========================================================================

  /**
   * Validates deletion operations to protect audit trails, payroll batches, and statutory records.
   */
  public static validateDeletionRequest(
    session: UserSession,
    category: SensitiveDataCategory,
    resourceId: string
  ): { allowed: boolean; reason?: string } {
    // 1. Audit logs are strictly immutable: deletion is impossible for ANY role
    if (category === 'SECURITY_AUDIT') {
      return {
        allowed: false,
        reason: 'Security audit logs and compliance records are immutable and cannot be deleted.'
      };
    }

    // 2. Statutory and payroll cycle deletion is restricted to Super Admin
    if (category === 'STATUTORY_INFO' || category === 'SALARY_PAYROLL') {
      if (session.role !== 'SUPER_ADMIN') {
        return {
          allowed: false,
          reason: 'Statutory compliance files and finalized payroll batches cannot be deleted by non-SuperAdmin roles.'
        };
      }
    }

    // 3. Employee master deletion requires Company Admin or Super Admin
    if (category === 'EMPLOYEE_PERSONAL' || category === 'IDENTITY_DOCUMENTS') {
      if (session.role !== 'SUPER_ADMIN' && session.role !== 'COMPANY_ADMIN') {
        return {
          allowed: false,
          reason: 'Employee records cannot be deleted by operational or supervisory staff. Use archiving/deactivation.'
        };
      }
    }

    return { allowed: true };
  }
}
