export type GoalCategory = 'INDIVIDUAL' | 'DEPARTMENTAL' | 'COMPANY_OKR' | 'COMPLIANCE_SAFETY';
export type GoalStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'ON_TRACK' | 'AT_RISK' | 'COMPLETED' | 'CANCELLED';

export interface KeyResult {
  id: string;
  title: string;
  targetMetric: number;
  currentMetric: number;
  unit: string; // e.g. '%', 'Incidents', 'Hours', 'INR'
  weightage: number; // 0 to 100
  updatedAt: string;
}

export interface PerformanceGoalRecord {
  id: string;
  companyId: string;
  employeeId: string;
  employeeName: string;
  departmentId?: string;
  siteId?: string;
  regionId?: string;
  cycleId: string;
  title: string;
  description: string;
  category: GoalCategory;
  alignedParentGoalId?: string; // Cascading from Company or Dept OKR
  weightage: number; // 0 to 100 (Sum of employee goals must equal 100)
  keyResults: KeyResult[];
  status: GoalStatus;
  progressPercent: number; // 0 to 100
  startDate: string;
  dueDate: string;
  managerComment?: string;
  selfRating?: number; // 1 to 5
  managerRating?: number; // 1 to 5
  calibratedRating?: number; // 1 to 5
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export type AppraisalFrequency = 'ANNUAL' | 'HALF_YEARLY' | 'QUARTERLY';
export type AppraisalCycleStatus = 'DRAFT' | 'ACTIVE' | 'SELF_REVIEW' | 'MANAGER_REVIEW' | 'CALIBRATION' | 'COMPLETED' | 'ARCHIVED';

export interface AppraisalCycleRecord {
  id: string;
  companyId: string;
  name: string;
  frequency: AppraisalFrequency;
  fiscalYear: string; // e.g., '2026-2027'
  startDate: string;
  endDate: string;
  selfReviewDeadline: string;
  managerReviewDeadline: string;
  calibrationDeadline: string;
  status: AppraisalCycleStatus;
  applicableDepartmentIds?: string[];
  applicableDesignationIds?: string[];
  totalEligibleEmployees: number;
  completedReviewsCount: number;
  bellCurveTargetDistribution?: {
    exceptional5: number; // Percentage, e.g., 10%
    exceeds4: number;     // 25%
    meets3: number;       // 50%
    needsImprovement2: number; // 10%
    unsatisfactory1: number;   // 5%
  };
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export type ReviewStage = 'SELF' | 'MANAGER' | 'SKIP_LEVEL' | 'CALIBRATION' | 'FINAL_SIGN_OFF' | 'CLOSED';

export interface CompetencyScore {
  competencyId: string;
  name: string;
  description: string;
  selfScore: number; // 1-5
  managerScore: number; // 1-5
  managerComment?: string;
}

export interface AppraisalReviewRecord {
  id: string;
  companyId: string;
  cycleId: string;
  cycleName: string;
  employeeId: string;
  employeeName: string;
  departmentId: string;
  siteId: string;
  regionId: string;
  designationId: string;
  primaryManagerId: string;
  skipLevelManagerId?: string;
  stage: ReviewStage;
  
  // Scoring
  goalScoreWeighted: number; // Computed from goals (1-5)
  competencyScores: CompetencyScore[];
  competencyScoreAverage: number;
  
  selfOverallRating: number;
  selfFeedbackNotes: string;
  selfSubmittedAt?: string;
  
  managerOverallRating: number;
  managerFeedbackNotes: string;
  managerSubmittedAt?: string;
  
  skipLevelOverallRating?: number;
  skipLevelNotes?: string;
  skipLevelSubmittedAt?: string;
  
  finalCalibratedRating: number; // 1 to 5 scale
  calibratedBy?: string;
  calibrationNotes?: string;
  calibratedAt?: string;
  
  // Payroll Linkage Recommendation (Advisory only)
  performanceBonusMultiplier: number; // e.g., 1.2x of variable pay
  recommendedIncrementPercent: number; // e.g., 10%
  payrollSyncStatus: 'PENDING' | 'EXPORTED_TO_PAYROLL' | 'REJECTED';
  
  bpmInstanceId?: string; // Integrated with Module 13
  
  createdAt: string;
  updatedAt: string;
}

export interface Feedback360RequestRecord {
  id: string;
  companyId: string;
  cycleId: string;
  targetEmployeeId: string;
  targetEmployeeName: string;
  reviewerEmployeeId: string;
  reviewerEmployeeName: string;
  relationship: 'PEER' | 'SUBORDINATE' | 'CROSS_FUNCTIONAL' | 'MANAGER';
  isAnonymous: boolean;
  status: 'PENDING' | 'SUBMITTED' | 'DECLINED';
  requestedBy: string;
  dueDate: string;
  
  // Answers
  strengths?: string;
  areasOfImprovement?: string;
  ratingScores?: {
    teamwork: number;
    communication: number;
    leadership: number;
    operationalDiscipline: number;
  };
  submittedAt?: string;
  createdAt: string;
}

export type PipStatus = 'ACTIVE' | 'EXTENDED' | 'PASSED_RETAINED' | 'FAILED_ESCALATED' | 'CANCELLED';

export interface PipMilestone {
  id: string;
  title: string;
  targetDate: string;
  successCriteria: string;
  status: 'PENDING' | 'ACHIEVED' | 'MISSED';
  managerNotes?: string;
}

export interface PipRecord {
  id: string;
  companyId: string;
  employeeId: string;
  employeeName: string;
  departmentId: string;
  siteId: string;
  regionId: string;
  supervisorId: string;
  supervisorName: string;
  hrInChargeId: string;
  startDate: string;
  endDate: string;
  reason: string;
  actionPlan: string;
  milestones: PipMilestone[];
  status: PipStatus;
  finalOutcomeSummary?: string;
  bpmInstanceId?: string; // Sign-off via Module 13
  createdAt: string;
  updatedAt: string;
}
