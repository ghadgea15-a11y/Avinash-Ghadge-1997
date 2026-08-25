export type TraceableEntityType = 'EMPLOYEE' | 'SITE' | 'CONTRACT' | 'ASSET' | 'TRANSACTION';

export type LifecycleTransition = 
  | 'CREATED'
  | 'MODIFIED'
  | 'TRANSFERRED'
  | 'APPROVED'
  | 'REJECTED'
  | 'SUSPENDED'
  | 'REACTIVATED'
  | 'CLOSED';

export interface TraceableActor {
  userId: string;
  employeeId?: string;
  fullName: string;
  role: string;
  email?: string;
  ipAddress?: string;
  authorityLevel?: string;
}

export interface TraceableScope {
  companyId: string;
  companyName?: string;
  regionId?: string;
  regionName?: string;
  branchId?: string;
  branchName?: string;
  siteId?: string;
  siteName?: string;
  departmentId?: string;
  departmentName?: string;
  contractId?: string;
  scopeLevel?: 'GLOBAL' | 'COMPANY' | 'REGION' | 'BRANCH' | 'SITE' | 'SELF';
}

export interface RelatedTransactionRef {
  transactionId?: string;
  correlationId?: string;
  workflowId?: string;
  approvalId?: string;
  transferId?: string;
  poNumber?: string;
  ticketId?: string;
  invoiceNumber?: string;
  batchNumber?: string;
  documentId?: string;
  parentEntityId?: string;
  referenceType?: string;
}

export interface FieldDiff {
  field: string;
  label?: string;
  beforeValue: any;
  afterValue: any;
  valueType?: 'string' | 'number' | 'boolean' | 'date' | 'object' | 'array';
}

export interface TraceableHistoricalEvent {
  id: string;
  entityType: TraceableEntityType;
  entityId: string;
  entityIdentifier: string; // e.g. EMP-101, SITE-ALPHA, CTR-2024-001, AST-009, TXN-PO-8821
  entityDisplayName: string;
  lifecycleStage: LifecycleTransition;
  action: string;
  eventSummary: string;
  timestamp: string; // ISO 8601
  formattedTimestamp: string;
  relativeTime: string;
  
  // Who performed the action
  who: TraceableActor;
  
  // When
  when: {
    iso: string;
    formatted: string;
    relative: string;
    unixMs: number;
  };
  
  // What happened
  what: {
    action: string;
    lifecycleStage: LifecycleTransition;
    module: string;
    summary: string;
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  };
  
  // State before
  before: {
    stateSnapshot?: Record<string, any>;
    summary?: string;
    diffs: FieldDiff[];
  };
  
  // State after
  after: {
    stateSnapshot?: Record<string, any>;
    summary?: string;
    diffs: FieldDiff[];
  };
  
  // Business reason / justification
  reason: {
    justification: string;
    category?: string;
    policyReference?: string;
    remarks?: string;
    rejectionReason?: string;
  };
  
  // Tenant company
  company: {
    companyId: string;
    companyName?: string;
  };
  
  // Scope coordinates
  scope: TraceableScope;
  
  // Related business transaction
  relatedTransaction: RelatedTransactionRef;
  
  // Cryptographic & source provenance
  provenance: {
    sourceCollection: string;
    sourceDocumentId: string;
    hash: string;
    verifiedImmutable: boolean;
    sequenceNumber: number;
  };
}

export interface HistoricalReconstructionResult {
  entityType: TraceableEntityType;
  entityId: string;
  entityIdentifier: string;
  entityDisplayName: string;
  firstSeen: string;
  lastUpdated: string;
  totalEvents: number;
  lifecycleProgress: {
    hasCreated: boolean;
    hasModified: boolean;
    hasTransferred: boolean;
    hasApproved: boolean;
    hasRejected: boolean;
    hasSuspended: boolean;
    hasReactivated: boolean;
    hasClosed: boolean;
    currentStatus: string;
  };
  events: TraceableHistoricalEvent[];
  integrityVerification: {
    isTamperEvident: boolean;
    allSignaturesValid: boolean;
    chainBroken: boolean;
    verifiedEventCount: number;
    genesisHash: string;
    latestBlockChecksum: string;
  };
  reconstructedAt: string;
}

export interface TraceableEntitySummary {
  id: string;
  type: TraceableEntityType;
  identifier: string;
  name: string;
  categoryOrRole?: string;
  currentStatus: string;
  siteOrLocation?: string;
  companyId: string;
  lastEventTimestamp?: string;
}

// Test Runner Types
export type TraceabilityTestStatus = 'IDLE' | 'RUNNING' | 'PASSED' | 'FAILED' | 'FIXED' | 'RETESTED';

export interface TraceabilityTestStep {
  id: string;
  name: string;
  phase: 'FAIL_SIMULATION' | 'ROOT_CAUSE_FIX' | 'RETEST_VERIFICATION' | 'REGRESSION_CHECK' | 'FINAL_PASS';
  status: 'PENDING' | 'RUNNING' | 'PASSED' | 'FAILED' | 'SKIPPED';
  details?: string;
  assertionMessage?: string;
  executionDurationMs?: number;
  error?: string;
  payload?: any;
}

export interface TraceabilityScenario {
  id: string;
  title: string;
  entityType: TraceableEntityType;
  targetEntityId: string;
  description: string;
  steps: TraceabilityTestStep[];
  status: TraceabilityTestStatus;
  startedAt?: string;
  completedAt?: string;
  durationMs?: number;
  errorMessage?: string;
}

export interface TraceabilityTestSuiteReport {
  suiteId: string;
  suiteName: string;
  scenarios: TraceabilityScenario[];
  totalScenarios: number;
  passedScenarios: number;
  failedScenarios: number;
  status: 'IDLE' | 'RUNNING' | 'PASSED' | 'FAILED';
  startedAt?: string;
  completedAt?: string;
  durationMs?: number;
  summaryNotes: string[];
}
