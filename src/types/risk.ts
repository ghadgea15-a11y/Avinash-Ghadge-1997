import { UserRole } from './index';
import { PolicyModule, ComplianceSeverity } from './compliance';

export type RiskLikelihood = 1 | 2 | 3 | 4 | 5; // 1 = Rare, 5 = Almost Certain
export type RiskImpact = 1 | 2 | 3 | 4 | 5; // 1 = Negligible, 5 = Critical

// Score is Likelihood * Impact (1 - 25)
// Severity thresholds (Deterministic)
// 1-4: LOW
// 5-9: MEDIUM
// 10-14: HIGH
// 15-25: CRITICAL
export type RiskCategory = 
  | 'SECURITY_ANOMALY'
  | 'POLICY_VIOLATION'
  | 'PRIVILEGE_ESCALATION'
  | 'COMPLIANCE_FAILURE'
  | 'DATA_LEAKAGE'
  | 'OPERATIONAL_FAILURE'
  | 'BPM_ESCALATION';

export type RiskStatus = 
  | 'IDENTIFIED'
  | 'TREATMENT_PLANNED'
  | 'RETEST'
  | 'ASSESSED'
  | 'MITIGATION_REQUIRED'
  | 'MITIGATION_IN_PROGRESS'
  | 'MONITORING'
  | 'ACCEPTED'
  | 'RESOLVED'
  | 'CLOSED';

export interface RiskRecord {
  id: string; // e.g., RSK-12345
  companyId: string;
  category: RiskCategory;
  module: PolicyModule;
  title: string;
  description: string;
  
  // Deterministic Scoring
  likelihood: RiskLikelihood;
  impact: RiskImpact;
  riskScore: number; // Likelihood * Impact
  severity: ComplianceSeverity;
  
  // Lifecycle
  status: RiskStatus;
  ownerId?: string; // User ID assigned to risk
  ownerRole?: UserRole;
  
  // Residual Risk
  residualLikelihood?: RiskLikelihood;
  residualImpact?: RiskImpact;
  residualRiskScore?: number;
  residualSeverity?: ComplianceSeverity;

  // Treatment & Controls
  treatmentStrategy?: 'MITIGATE' | 'AVOID' | 'TRANSFER' | 'ACCEPT';
  existingControls?: string;

  // Review & Acceptance
  reviewerId?: string;
  acceptedBy?: string;
  acceptedByRole?: UserRole;
  acceptanceReason?: string;
  acceptedAt?: string; // ISO String
  acceptanceExpiryDate?: string; // ISO String
  lastReviewDate?: string; // ISO String
  nextReviewDate?: string; // ISO String

  // Traceability & Evidence
  sourceId: string; // ID of violation, incident, etc.
  sourceType: string; // 'VIOLATION', 'ANOMALY', 'AUDIT'
  evidence: string;
  affectedEntities: string[]; // User IDs, IP addresses, resource IDs
  
  // Context scope
  siteId?: string;
  department?: string;

  // Timestamps
  identifiedAt: string; // ISO String
  assessedAt?: string;
  resolvedAt?: string;
  closedAt?: string;
  createdAt: string;
  updatedAt: string;
  
  // Mitigation tracking
  mitigationDeadline?: string;
  bpmWorkflowId?: string;
  resolutionNotes?: string;
}

export interface RiskMitigationAction {
  id: string;
  riskId: string;
  companyId: string;
  title: string;
  description: string;
  
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'VERIFIED' | 'CANCELLED';
  
  assignedToRole?: UserRole;
  assignedToUserId?: string;
  targetDate: string; // ISO String
  completedAt?: string;
  verifiedByUserId?: string;
  
  expectedControl?: string;
  actualResult?: string;
  completionEvidence?: string; // Notes or links
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface RiskMetricsSummary {
  totalOpenRisks: number;
  criticalRisks: number;
  highRisks: number;
  overdueMitigations: number;
  risksByCategory: Record<RiskCategory, number>;
  averageResolutionTimeHours: number;
}

export interface RiskReviewRecord {
  id: string;
  riskId: string;
  companyId: string;
  reviewerId: string;
  reviewerRole: UserRole;
  reviewDate: string;
  
  // Assessed state during review
  currentLikelihood: RiskLikelihood;
  currentImpact: RiskImpact;
  currentRiskScore: number;
  currentSeverity: ComplianceSeverity;
  
  currentControls: string;
  evidence: string;
  decision: 'CONTINUE_MITIGATION' | 'ACCEPT_RISK' | 'CLOSE_RISK' | 'REQUIRE_NEW_MITIGATION';
  nextReviewDate?: string;
  comments?: string;
  createdAt: string;
}
