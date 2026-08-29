export type BpmApprovalState = 
  | 'DRAFT' 
  | 'SUBMITTED' 
  | 'PENDING_APPROVAL' 
  | 'IN_PROGRESS' 
  | 'APPROVED' 
  | 'REJECTED' 
  | 'RETURNED' 
  | 'CANCELLED' 
  | 'EXPIRED';

export type BpmApprovalActionType = 
  | 'APPROVE' 
  | 'REJECT' 
  | 'RETURN' 
  | 'REQUEST_CHANGES' 
  | 'DELEGATE';

export interface BpmApprovalWorkflow {
  id: string;
  workflowId: string;
  companyId: string;
  module: string; // e.g., 'LEAVE', 'OVERTIME', 'PURCHASE_ORDER'
  transactionType: string;
  workflowName: string;
  active: boolean;
  version: number;
  effectiveFrom: string;
  effectiveTo?: string;
  steps: BpmApprovalStep[];
  createdAt: string;
  updatedAt: string;
}

export interface BpmApprovalStep {
  stepId: string;
  sequence: number;
  approverType: 'ROLE' | 'USER' | 'MANAGER' | 'DEPARTMENT_HEAD';
  approverRole?: string; // If approverType is ROLE
  approverUserId?: string; // If approverType is USER
  minimumApprovals: number;
  escalationPolicyId?: string; // Reference to escalation policy
  required: boolean;
  conditions?: BpmApprovalCondition[];
}

export interface BpmApprovalCondition {
  field: string;
  operator: 'EQUALS' | 'NOT_EQUALS' | 'GREATER_THAN' | 'LESS_THAN' | 'GREATER_THAN_EQUALS' | 'LESS_THAN_EQUALS';
  value: any;
}

export interface BpmApprovalInstance {
  id: string; // Document ID
  companyId: string;
  workflowId: string;
  sourceModule: string;
  transactionType: string;
  sourceRecordId: string;
  requesterId?: string;
  requesterName?: string;
  status: BpmApprovalState;
  currentTier: number;
  currentStepId?: string;
  currentApprovers: string[]; // List of user IDs or roles who can approve current tier
  history: BpmApprovalAction[];
  submittedAt: string;
  assignedAt?: string;
  dueAt?: string;
  pendingDuration?: number; // In milliseconds or minutes
  
  // Threshold Routing decision tracking (Immutable)
  routingDecision?: RoutingDecision;
  
  // Timer & Escalation fields
  escalationPolicyId?: string;
  policyVersion?: number;
  escalationLevel?: number; // 0 = standard/normal, 1 = level 1, 2 = level 2, 3+ = higher/final
  lastReminderAt?: string;
  lastEscalationAt?: string;
  completedAt?: string;
  isOverdue?: boolean;
  reassignedFrom?: string[]; // Previous approvers if reassigned via escalation
  siteId?: string;
  departmentId?: string;
  metadata?: Record<string, any>;
  
  createdAt: string;
  updatedAt: string;
}

export type ThresholdOperator = 
  | '=' 
  | '!=' 
  | '>' 
  | '>=' 
  | '<' 
  | '<=' 
  | 'IN' 
  | 'NOT_IN';

export interface SecondaryCondition {
  field: string;
  operator: ThresholdOperator;
  value: any;
}

export interface ThresholdRule {
  id: string; // Document ID: THR_{companyId}_{ruleId}
  ruleId: string;
  companyId: string;
  ruleName: string;
  description?: string;
  module: string; // e.g. 'SCM', 'PAYROLL', 'BILLING', 'OVERTIME', 'LEAVE', 'WORK_ORDER', 'CONTRACTS', 'STOCK_TRANSFER'
  transactionType: string; // e.g. 'PURCHASE_ORDER', 'SALARY_ADVANCE', 'OVERTIME_REQUEST', 'ALL'
  workflowId: string; // Target workflow triggered when matched
  workflowVersion: number;
  
  // Primary threshold comparison
  field: string; // e.g. 'amount', 'totalAmount', 'quantity', 'overtimeHours', 'riskScore'
  operator: ThresholdOperator;
  thresholdValue: any;
  
  // Secondary criteria
  secondaryConditions?: SecondaryCondition[];
  
  priority: number; // Higher number = higher precedence (e.g. 100 > 50 > 10)
  active: boolean;
  effectiveFrom: string; // ISO String
  effectiveTo?: string; // ISO String
  policyVersion: number;
  
  createdAt: string;
  createdBy?: string;
  updatedAt: string;
  updatedBy?: string;
}

export interface RoutingDecision {
  ruleId: string;
  ruleName?: string;
  policyVersion: number;
  selectedWorkflowId: string;
  selectedWorkflowVersion: number;
  matchedConditions: {
    field: string;
    operator: ThresholdOperator;
    thresholdValue: any;
    actualValue: any;
  }[];
  evaluatedAt: string;
  evaluatedBy: string; // 'SYSTEM' or user ID
  routingReason: string;
  isFallbackDefault?: boolean;
}

export interface RoutingEvaluationResult {
  success: boolean;
  selectedWorkflowId: string;
  selectedWorkflowVersion: number;
  matchedRule?: ThresholdRule;
  routingDecision: RoutingDecision;
  conflictDetected?: boolean;
  conflictDetails?: string;
  evaluationLogs: string[];
}


export type EscalationTargetType = 
  | 'MANAGER' 
  | 'ROLE' 
  | 'USER' 
  | 'DEPARTMENT_HEAD' 
  | 'SUPER_ADMIN';

export interface EscalationLevelConfig {
  level: number; // 1, 2, 3...
  escalationAfterMinutes: number; // Duration after assignment or previous tier
  escalationTargetType: EscalationTargetType;
  targetRole?: string; // If targetType is ROLE
  targetUserId?: string; // If targetType is USER
  reassignmentAllowed: boolean; // If true, currentApprovers is updated; if false, target is notified without reassigning
  notifyTarget: boolean; // Send notification to escalation target
  customNotificationMessage?: string;
}

export interface EscalationPolicy {
  id: string; // Document ID, e.g. "POL-companyId-uuid"
  policyId: string;
  companyId: string;
  policyName: string;
  description?: string;
  workflowId?: string; // Optional: bind to a specific workflow or '*' for module-wide
  module: string; // 'ALL' or 'LEAVE', 'OVERTIME', 'SCM', 'PAYROLL', etc.
  transactionType?: string; // e.g. 'ALL' or 'ANNUAL_LEAVE', 'SALARY_ADVANCE'
  stepId?: string; // Optional step binding
  
  reminderAfterMinutes: number; // Duration before/after to send reminder (e.g. 120 mins)
  dueAfterMinutes: number; // Total duration before marked as overdue (e.g. 1440 mins / 24h)
  
  levels: EscalationLevelConfig[];
  maximumEscalations: number;
  reassignmentAllowed: boolean; // Global policy default
  
  active: boolean;
  version: number;
  effectiveFrom: string;
  effectiveTo?: string;
  
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  updatedBy?: string;
}

export type BpmEscalationEventType = 
  | 'REMINDER' 
  | 'DUE' 
  | 'ESCALATION_LEVEL_1' 
  | 'ESCALATION_LEVEL_2' 
  | 'FINAL_ESCALATION' 
  | 'REASSIGNED' 
  | 'EXPIRED';

export interface BpmEscalationEvent {
  id: string; // Deterministic idempotency key: ESC_{companyId}_{approvalInstanceId}_{stepId}_V{policyVersion}_L{escalationLevel}_{eventType}
  companyId: string;
  approvalInstanceId: string;
  workflowId: string;
  stepId: string;
  policyId: string;
  policyVersion: number;
  eventType: BpmEscalationEventType;
  escalationLevel: number;
  previousApprovers: string[];
  escalatedTo: string[];
  reassigned: boolean;
  reason: string;
  triggeredAt: string;
  notificationId?: string;
  status: 'PROCESSED' | 'SKIPPED' | 'FAILED';
  metadata?: Record<string, any>;
}

export interface BpmApprovalAction {
  id: string;
  approvalInstanceId: string;
  stepId: string;
  actorId: string; // User ID of the actual person taking action
  action: BpmApprovalActionType;
  timestamp: string;
  reason?: string;
  delegatedFrom?: string; // User ID of original approver if delegated
  delegationId?: string; // ID of the delegation rule authorizing this action
  actingProxyName?: string;
  originalApproverName?: string;
  metadata?: any;
}

export type ProxyDelegationStatus = 'SCHEDULED' | 'ACTIVE' | 'REVOKED' | 'EXPIRED';

export type ProxyScopeModule = 
  | 'ALL'
  | 'LEAVE'
  | 'OVERTIME'
  | 'SCM'
  | 'CRM'
  | 'PAYROLL'
  | 'WORK_ORDER'
  | 'BILLING_RATE'
  | 'ASSET_MANAGEMENT'
  | 'SAFETY'
  | 'INCIDENTS'
  | 'SECURITY';

export interface ProxyDelegationScope {
  modules: string[]; // e.g., ['ALL'] or ['LEAVE', 'OVERTIME', 'SCM']
  allModules?: boolean;
  transactionTypes?: string[]; // e.g., ['ALL'] or ['ANNUAL_LEAVE', 'PURCHASE_ORDER']
  workflowIds?: string[]; // Optional: Specific workflow IDs
  siteIds?: string[]; // Optional: Specific site IDs
  departments?: string[]; // Optional: Specific department IDs
  maxTier?: number; // Optional: Max approval tier proxy can act on (e.g. Tier 1 only)
  maxApprovalTier?: number;
  maxValue?: number; // Optional: Monetary / value threshold limit
}

export interface ProxyDelegation {
  id: string; // Document ID / deterministic key: DEL_{companyId}_{timestamp}_{rand}
  delegationId?: string;
  companyId: string;
  delegatorUserId: string;
  delegatorName?: string;
  delegatorEmail?: string;
  delegatorRole?: string;
  delegatorDepartment?: string;
  
  delegateUserId: string;
  delegateName?: string;
  delegateEmail?: string;
  delegateRole?: string;
  delegateDepartment?: string;
  
  scope: ProxyDelegationScope;
  startAt: string; // ISO timestamp
  endAt: string; // ISO timestamp
  reason: string;
  status: ProxyDelegationStatus;
  policyVersion: number;
  
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy?: string;
  
  revokedAt?: string;
  revokedBy?: string;
  revocationReason?: string;
}

// Backward-compatible alias for existing references
export type BpmApprovalDelegation = ProxyDelegation;
