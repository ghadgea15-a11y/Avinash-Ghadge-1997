import { UserRole } from './index';

export type ControlCategory = 'ACCESS_CONTROL' | 'DATA_PRIVACY' | 'INCIDENT_RESPONSE' | 'BUSINESS_CONTINUITY' | 'PHYSICAL_SECURITY' | 'COMPLIANCE' | 'OPERATIONAL' | 'FINANCIAL';
export type ControlType = 'PREVENTIVE' | 'DETECTIVE' | 'CORRECTIVE' | 'ADMINISTRATIVE' | 'TECHNICAL' | 'OPERATIONAL';

export type ControlStatus = 'DRAFT' | 'ACTIVE' | 'UNDER_REVIEW' | 'TESTING' | 'EFFECTIVE' | 'INEFFECTIVE' | 'REMEDIATION_REQUIRED' | 'RETEST' | 'CLOSED' | 'RETIRED';

export type TestResult = 'EFFECTIVE' | 'PARTIALLY_EFFECTIVE' | 'INEFFECTIVE' | 'NOT_TESTED';
export type ExceptionSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type ExceptionStatus = 'OPEN' | 'ASSIGNED' | 'REMEDIATION' | 'EVIDENCE_SUBMITTED' | 'RETEST' | 'VERIFIED' | 'CLOSED';

export interface ComplianceControl {
  id: string; // e.g. CTL-1001
  companyId: string;
  name: string;
  description: string;
  category: ControlCategory;
  controlType: ControlType;
  frameworkReference?: string; // e.g. ISO 27001 A.9.1.1
  relatedModule?: string;
  
  siteId?: string;
  
  ownerId?: string;
  reviewerId?: string;
  
  testFrequency: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'BIANNUAL' | 'ANNUAL' | 'AD_HOC';
  
  effectiveDate: string;
  nextReviewDate?: string;
  
  status: ControlStatus;
  
  evidenceRequirement?: string;
  
  // Linkages
  linkedRiskIds: string[]; // Risk IDs
  
  createdAt: string;
  updatedAt: string;
}

export interface ControlTestRecord {
  id: string; // e.g. TST-2001
  companyId: string;
  controlId: string;
  
  testerId: string;
  testDate: string; // when it was tested
  testPeriodStart: string;
  testPeriodEnd: string;
  
  testProcedure: string;
  expectedResult: string;
  actualResult: string;
  
  evidenceUrls: string[]; // references to Storage
  
  result: TestResult;
  
  exceptionsGenerated?: string[]; // Exception IDs
  
  reviewerId?: string;
  reviewDecision?: 'APPROVED' | 'REJECTED' | 'RETEST_REQUIRED';
  reviewNotes?: string;
  reviewDate?: string;
  
  createdAt: string;
  updatedAt: string;
}

export interface ControlException {
  id: string; // e.g. EXC-3001
  companyId: string;
  controlId: string;
  testId?: string; // Optional if exception was raised outside a test
  
  riskId?: string; // Created in risk register, link here
  
  severity: ExceptionSeverity;
  description: string;
  evidenceUrls: string[];
  
  ownerId?: string;
  
  remediationDueDate?: string;
  status: ExceptionStatus;
  
  bpmWorkflowId?: string; // For integration with BPM engine
  remediationNotes?: string;
  closedAt?: string;
  
  createdAt: string;
  updatedAt: string;
}

export interface ComplianceDashboardMetrics {
  totalControls: number;
  activeControls: number;
  effectiveControls: number;
  partiallyEffectiveControls: number;
  ineffectiveControls: number;
  notTestedControls: number;
  remediationRequiredControls: number;
  
  overdueTests: number;
  overdueRemediations: number;
  
  controlsByCategory: Record<ControlCategory, number>;
  controlsByModule: Record<string, number>;
  controlsBySite: Record<string, number>;
  
  riskMitigationCoverage: number; // Percentage of risks with at least one control
}
