import { UserRole } from './index';

export type EnterpriseConflictCategory = 
  | 'DUPLICATE_ACTIVE_ASSIGNMENT'
  | 'OVERLAPPING_SHIFTS'
  | 'OVERLAPPING_SITE_ASSIGNMENTS'
  | 'CONFLICTING_SUPERVISORS'
  | 'DUPLICATE_RESPONSIBILITY_SOD'
  | 'INVALID_TRANSFER_DATES'
  | 'INVALID_EFFECTIVE_DATES'
  | 'STATUTORY_COMPLIANCE_VIOLATION';

export type ConflictSeverity = 'CRITICAL_BLOCKING' | 'HIGH_OVERRIDABLE' | 'MEDIUM_WARNING';

export type ConflictEntityType = 
  | 'EMPLOYEE_RECORD'
  | 'ROSTER_RECORD'
  | 'TRANSFER_REQUEST'
  | 'SITE_DEPLOYMENT'
  | 'ROLE_MEMBERSHIP'
  | 'SUPERVISOR_ASSIGNMENT';

export type OverrideReasonCode = 
  | 'BUSINESS_CRITICAL_RELIEF'
  | 'EMERGENCY_DISASTER_RECOVERY'
  | 'OFFICIAL_DUAL_POSTING'
  | 'EXECUTIVE_AUTHORIZED_TEMPORARY'
  | 'SYSTEM_RECONCILIATION';

export interface EnterpriseConflictRule {
  ruleCode: string;
  category: EnterpriseConflictCategory;
  name: string;
  description: string;
  defaultSeverity: ConflictSeverity;
  isBlockerByDefault: boolean;
  isOverrideAllowed: boolean;
  minAllowedOverrideRoles: UserRole[];
  remediationGuide: string;
}

export interface DetectedConflict {
  id: string;
  ruleCode: string;
  category: EnterpriseConflictCategory;
  severity: ConflictSeverity;
  title: string;
  reason: string;
  detailedExplanation: string;
  entityType: ConflictEntityType;
  entityId: string;
  employeeId: string;
  employeeName: string;
  
  // Conflicting counterpart
  conflictingEntityId?: string;
  conflictingEntityName?: string;
  conflictingContext?: {
    siteA?: { id: string; name: string };
    siteB?: { id: string; name: string };
    shiftA?: { id: string; name: string; timeWindow: string };
    shiftB?: { id: string; name: string; timeWindow: string };
    roleA?: string;
    roleB?: string;
    supervisorA?: string;
    supervisorB?: string;
    dateA?: string;
    dateB?: string;
    effectiveDate?: string;
    joiningDate?: string;
  };

  resolutionSteps: string[];
  isBlocker: boolean;
  isOverrideAllowed: boolean;
  requiredOverrideRoles: UserRole[];
  detectedAt: string;
}

export interface ConflictOverrideRequest {
  conflictId: string;
  ruleCode: string;
  reasonCategory: OverrideReasonCode;
  justification: string;
  approverId: string;
  approverName: string;
  approverRole: UserRole;
  expirationDate?: string;
  approvedAt: string;
}

export interface ConflictValidationResult {
  isValid: boolean;
  hasBlockers: boolean;
  conflicts: DetectedConflict[];
  blockingCount: number;
  overridableCount: number;
  warningCount: number;
  summary: string;
}

export interface ConflictOverrideAuditRecord {
  id: string;
  companyId: string;
  conflict: DetectedConflict;
  override: ConflictOverrideRequest;
  appliedToEntityType: ConflictEntityType;
  appliedToEntityId: string;
  status: 'ACTIVE' | 'EXPIRED' | 'REVOKED';
  createdAt: string;
  updatedAt: string;
}

export interface ConflictAuditMetrics {
  totalAuditedTransactions: number;
  totalConflictsDetected: number;
  criticalBlockedCount: number;
  overridesGrantedCount: number;
  categoryBreakdown: Record<EnterpriseConflictCategory, number>;
  topConflictedSites: { siteId: string; siteName: string; count: number }[];
  recentIncidents: DetectedConflict[];
}
