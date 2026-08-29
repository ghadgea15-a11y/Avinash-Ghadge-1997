export type ComplianceStatus = 'COMPLIANT' | 'NON_COMPLIANT' | 'PENDING_REVIEW' | 'WAIVED';

export type PolicyModule = string; //

export type ComplianceSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface ComplianceEvaluationRecord { [key: string]: any; }

export interface CompliancePolicy {
  id: string;
  companyId: string;
  name: string;
  description: string;
  module?: PolicyModule;
  policyType?: string;
  scope?: { scopeType: string; targetIds?: string[] };
  category?: 'LABOR' | 'SAFETY' | 'FINANCIAL' | 'SECURITY';
  conditions?: any[];
  effectiveTo?: string;
  effectiveFrom?: string;
  rules?: ComplianceRule[];
  thresholds?: any;
  severity?: ComplianceSeverity;
  active?: boolean;
  enabled?: boolean;
  enforcementAction?: string;
  responsibleRoles?: string[];
  createdBy?: string;
  updatedBy?: string;
  version?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface ComplianceRule {
  id: string;
  field: string;
  operator: 'GT' | 'LT' | 'EQ' | 'LTE' | 'GTE';
  value: any;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

export interface ComplianceViolation {
  id: string;
  companyId: string;
  policyId: string;
  ruleId: string;
  resourceId: string;
  detectedAt: string;
  status: 'OPEN' | 'RESOLVED' | 'DISMISSED' | 'WAIVED' | 'INVESTIGATING' | 'FALSE_POSITIVE';
  details: string;
  entityName?: string;
  entityType?: string;
  riskScore?: number;
  bpmStatus?: string;
  resolvedBy?: string;
  resolvedAt?: string;
  resolutionNotes?: string;
  conditionsBroken?: any[];
  severity?: any;
  module?: any;
  policyName?: any;
  evidence?: any;
  entityId?: any;
  assignedToUserId?: any;
  siteId?: any;
  department?: any;
}

export type ComplianceViolationRecord = ComplianceViolation;
export interface PolicyCondition { [key: string]: any; }
export type PolicyConditionOperator = string;
export type PolicyScopeType = string;
export type PolicyEnforcementAction = string;
export type PolicyType = string;
export type ViolationStatus = string;
