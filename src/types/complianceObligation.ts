import { UserRole } from './index';

export type ObligationCategory = 'LEGAL' | 'REGULATORY' | 'CONTRACTUAL' | 'INTERNAL_POLICY' | 'HSE' | 'DATA_PRIVACY' | 'FINANCIAL' | 'OTHER';

export type ObligationStatus = 
  | 'DRAFT'
  | 'ACTIVE' 
  | 'REVIEW_DUE'
  | 'RENEWAL_DUE' 
  | 'NON_COMPLIANT' 
  | 'REMEDIATION' 
  | 'VERIFIED' 
  | 'EXPIRED'
  | 'CLOSED'
  | 'RETIRED';

export type ObligationRiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface ComplianceObligation {
  id: string; // e.g., OBL-2023-001
  companyId: string;
  name: string;
  description: string;
  
  category: ObligationCategory;
  regulatorySource: string; // e.g., "GDPR", "OSHA 1910", "Vendor Contract X"
  requirementReference: string; // Specific section or clause
  
  applicableSiteId?: string;
  applicableModule?: string;
  
  ownerId: string;
  reviewerId?: string;
  
  effectiveDate: string; // ISO string
  dueDate: string; // ISO string, next key milestone (review, renewal, expiry)
  renewalFrequency?: 'MONTHLY' | 'QUARTERLY' | 'BIANNUAL' | 'ANNUAL' | 'BIENNIAL' | 'CUSTOM';
  
  status: ObligationStatus;
  riskLevel: ObligationRiskLevel;
  
  evidenceRequirement?: string;
  
  // Linkages
  linkedControlIds?: string[];
  linkedRiskIds?: string[];
  
  // Tracking alerts
  alertThresholdsDays: number[]; // e.g., [90, 60, 30, 15, 7, 0]
  lastAlertSentAt?: string; // ISO string to prevent duplicate notifications
  
  createdAt: string;
  updatedAt: string;
}

export interface ObligationReviewRecord {
  id: string; // e.g., OREV-1001
  obligationId: string;
  companyId: string;
  
  reviewerId: string;
  reviewDate: string;
  
  decision: 'APPROVED' | 'REJECTED' | 'REMEDIATION_REQUIRED';
  comments?: string;
  evidenceUrls?: string[];
  
  nextDueDate?: string; // If approved and renewed, set next date
  
  createdAt: string;
}

export interface ObligationMetrics {
  totalObligations: number;
  compliant: number;
  dueSoon: number;
  expired: number;
  nonCompliant: number;
  underReview: number;
  pendingVerification: number;
  overdueRemediation: number;
  
  byCategory: Record<ObligationCategory, number>;
  upcomingExpiries: ComplianceObligation[]; // Next 30 days
}
