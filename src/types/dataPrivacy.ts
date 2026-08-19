import { UserRole, AuthorityLevel, DataScope } from './index';

/**
 * 10 Core Application Sensitive Data Classifications
 */
export type SensitiveDataCategory =
  | 'EMPLOYEE_PERSONAL'    // DOB, gender, marital status, blood group, emergency contact, addresses
  | 'CONTACT_INFO'         // Personal phone, email, emergency mobile
  | 'IDENTITY_DOCUMENTS'   // Aadhaar, PAN, Passport, Driving License, Voter ID, Bank Account/IFSC
  | 'SALARY_PAYROLL'       // Basic, HRA, CTC, Allowances, Gross, Net Pay, Deductions, Payslips
  | 'STATUTORY_INFO'       // PF/UAN, ESI IP, PT, TDS/Tax, Gratuity, Form 16
  | 'ATTENDANCE_LOCATION'  // GPS coordinates, geo-fences, punch IP, device IDs, punch selfies
  | 'CONTRACTS_COMMERCIAL' // Client contracts, billing rates, commercial terms, SLA multipliers
  | 'FINANCIAL_RECORDS'    // Invoices, payment collections, bank remittance batches, ledger
  | 'SECURITY_AUDIT'       // Security events, anomalies, audit logs, account locks
  | 'AUTH_SECURITY';       // Hashed credentials, session tokens, refresh tokens, MFA secrets

/**
 * Enterprise Sensitivity Tiers
 */
export type DataSensitivityLevel =
  | 'RESTRICTED'   // Highest sensitivity (Aadhaar, PAN, Bank, Salary, Auth Secrets, Security Events)
  | 'CONFIDENTIAL' // High sensitivity (Employee PII, Contracts, Invoices, Attendance GPS)
  | 'INTERNAL'     // Medium sensitivity (Rosters, Muster rolls, Asset manifests, Shift logs)
  | 'PUBLIC';      // Public (Company logo, brand name)

/**
 * Dynamic Data Masking (DDM) Patterns
 */
export type DataMaskingPattern =
  | 'AADHAAR'
  | 'PAN'
  | 'BANK_ACCOUNT'
  | 'PHONE'
  | 'EMAIL'
  | 'SALARY'
  | 'GPS'
  | 'NAME'
  | 'FULL_REDACT';

/**
 * Sensitive Data Field Definition
 */
export interface SensitiveFieldDefinition {
  fieldKey: string;
  category: SensitiveDataCategory;
  sensitivityLevel: DataSensitivityLevel;
  maskingPattern: DataMaskingPattern;
  description: string;
  exemptRoles: UserRole[];
  exemptAuthorityLevels: AuthorityLevel[];
}

/**
 * Access Evaluation Context for Sensitive Data
 */
export interface SensitiveDataAccessContext {
  targetCompanyId: string;
  targetRegionId?: string;
  targetSiteId?: string;
  targetDepartmentId?: string;
  targetEmployeeId?: string;
  resourceType: string;
  resourceId?: string;
  category: SensitiveDataCategory;
  requestedAction: 'READ' | 'WRITE' | 'EXPORT' | 'DELETE' | 'DOWNLOAD';
}

/**
 * Sensitive Data Access Evaluation Result
 */
export interface SensitiveDataAccessResult {
  allowed: boolean;
  requiresMasking: boolean;
  maskingPattern?: DataMaskingPattern;
  reason?: string;
  violatesTenant?: boolean;
  violatesSite?: boolean;
  violatesRole?: boolean;
  violatesScope?: boolean;
  violatesRetention?: boolean;
}
