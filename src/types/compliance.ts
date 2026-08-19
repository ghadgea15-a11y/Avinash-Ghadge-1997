import { UserRole } from './index';

export type PolicyModule = 
  | 'HCM' 
  | 'WFM' 
  | 'PAYROLL' 
  | 'OPERATIONS' 
  | 'SCM' 
  | 'EAM' 
  | 'CRM' 
  | 'BPM' 
  | 'SECURITY' 
  | 'STATUTORY';

export type PolicyType = 
  | 'ATTENDANCE_OVERTIME_LIMIT'
  | 'MANDATORY_REST_HOURS'
  | 'MAX_CONSECUTIVE_WORK_DAYS'
  | 'GEOFENCE_RADIUS_STRICTNESS'
  | 'KYC_DOCUMENT_MANDATORY'
  | 'DOCUMENT_EXPIRY_COMPLIANCE'
  | 'MINIMUM_WAGE_STATUTORY'
  | 'PF_ESI_WAGE_CEILING'
  | 'PAYROLL_DISBURSEMENT_TIMELINE'
  | 'INVENTORY_SAFETY_STOCK'
  | 'PO_AUTHORIZATION_THRESHOLD'
  | 'ASSET_MAINTENANCE_SCHEDULE'
  | 'INCIDENT_SLA_RESOLUTION'
  | 'AFTER_HOURS_DATA_DOWNLOAD'
  | 'BULK_OPERATION_GOVERNANCE'
  | 'CONTRACT_EXPIRY_GOVERNANCE'
  | 'CUSTOM_RULE';

export type PolicyScopeType = 'COMPANY_WIDE' | 'SITE' | 'DEPARTMENT' | 'ROLE' | 'CONTRACT';

export interface PolicyScope {
  scopeType: PolicyScopeType;
  targetIds?: string[]; // site IDs, department names, or roles
  excludedIds?: string[];
}

export type PolicyConditionOperator = 
  | 'EQUALS' 
  | 'NOT_EQUALS' 
  | 'GREATER_THAN' 
  | 'GREATER_THAN_OR_EQUAL' 
  | 'LESS_THAN' 
  | 'LESS_THAN_OR_EQUAL' 
  | 'IN' 
  | 'NOT_IN' 
  | 'EXISTS' 
  | 'NOT_EXISTS' 
  | 'CONTAINS';

export interface PolicyCondition {
  field: string;
  operator: PolicyConditionOperator;
  value: any;
  description?: string;
}

export interface PolicyThresholds {
  warningThreshold?: number;
  violationThreshold?: number;
  timeframeMinutes?: number;
  maxCount?: number;
  customLimits?: Record<string, any>;
}

export type PolicyEnforcementAction = 
  | 'LOG_WARNING' 
  | 'CREATE_VIOLATION' 
  | 'TRIGGER_BPM' 
  | 'BLOCK_TRANSACTION' 
  | 'NOTIFY_ADMIN';

export type ComplianceSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface CompliancePolicy {
  id: string;
  companyId: string;
  name: string;
  description: string;
  module: PolicyModule;
  policyType: PolicyType;
  scope: PolicyScope;
  conditions: PolicyCondition[];
  thresholds: PolicyThresholds;
  severity: ComplianceSeverity;
  enabled: boolean;
  effectiveFrom: string; // ISO date string (YYYY-MM-DD or full ISO)
  effectiveTo?: string;   // ISO date string
  enforcementAction: PolicyEnforcementAction;
  responsibleRoles: UserRole[];
  createdBy: string;
  updatedBy: string;
  version: number;
  createdAt: string;
  updatedAt: string;
  tags?: string[];
}

export interface PolicyVersionRecord {
  id: string; // ${policyId}_v${version}
  policyId: string;
  companyId: string;
  version: number;
  snapshot: CompliancePolicy;
  changeReason: string;
  changedBy: string;
  changedByName?: string;
  changedAt: string;
}

export type ComplianceEvaluationResultType = 'COMPLIANT' | 'WARNING' | 'VIOLATION' | 'EXEMPTED';

export interface ConditionEvaluationDetail {
  condition: string;
  passed: boolean;
  actualValue?: any;
  expectedValue?: any;
}

export interface ComplianceEvaluationRecord {
  id: string;
  companyId: string;
  policyId: string;
  policyName: string;
  module: PolicyModule;
  subjectId: string; // e.g. employeeId, siteId, poId, slipId, userId
  subjectName?: string;
  transactionId: string;
  transactionType: string;
  conditionsEvaluated: ConditionEvaluationDetail[];
  result: ComplianceEvaluationResultType;
  severity: ComplianceSeverity;
  riskScore: number;
  violationId?: string;
  evidence: string;
  correlationId: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

export type ViolationStatus = 
  | 'DETECTED' 
  | 'ACKNOWLEDGED' 
  | 'UNDER_REVIEW' 
  | 'REMEDIATION' 
  | 'RESOLVED' 
  | 'FALSE_POSITIVE' 
  | 'EXEMPTED';

export interface ComplianceViolationRecord {
  id: string; // VIOLATION-${correlationId}
  companyId: string;
  policyId: string;
  policyName: string;
  module: PolicyModule;
  entityType: string;
  entityId: string;
  entityName?: string;
  siteId?: string;
  department?: string;
  severity: ComplianceSeverity;
  riskScore: number;
  evidence: string;
  conditionsBroken: string[];
  detectedAt: string;
  assignedToRole?: UserRole;
  assignedToUserId?: string;
  status: ViolationStatus;
  remediationPlan?: string;
  resolutionNotes?: string;
  resolvedBy?: string;
  resolvedAt?: string;
  bpmWorkflowId?: string;
  bpmStatus?: 'PENDING' | 'APPROVED' | 'REJECTED';
  correlationId: string;
  source?: string;
  metadata?: Record<string, any>;
}

export interface ComplianceMetricsSummary {
  overallComplianceScore: number; // 0 - 100
  activePoliciesCount: number;
  totalEvaluationsCount: number;
  openViolationsCount: number;
  criticalViolationsCount: number;
  highViolationsCount: number;
  overdueRemediationCount: number;
  moduleBreakdown: Record<PolicyModule, {
    totalPolicies: number;
    evaluations: number;
    violations: number;
    compliancePercentage: number;
  }>;
  siteBreakdown: Record<string, {
    siteName: string;
    violations: number;
    compliancePercentage: number;
  }>;
}
