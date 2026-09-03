/**
 * Log Sheet Muster - Complete Enterprise Talent Management Data Models
 * Covers:
 * Phase A: Competency Model, Skills Matrix (L1-L5), 9-Box Succession Grid, Career Progression
 * Phase B: Digital Offer Letter, CTC Structure, Onboarding Checklist & Asset Provisioning
 * Phase C: Master Training Calendar, Kirkpatrick 4-Level Training Effectiveness Engine
 * Phase D: Rewards & Recognition (Spot Awards, Peer Kudos, Points Wallet, Payroll Bridge)
 */

// ============================================================================
// PHASE A: COMPETENCIES, SKILLS MATRIX & 9-BOX SUCCESSION PLANNING
// ============================================================================

export type SkillCategory = 'CORE_FUNCTIONAL' | 'SAFETY_SECURITY' | 'LEADERSHIP' | 'COMPLIANCE' | 'TECH_OPERATIONS';
export type SkillProficiencyLevel = 1 | 2 | 3 | 4 | 5; // 1: Beginner, 2: Developing, 3: Proficient, 4: Advanced, 5: Master/Trainer

export interface CompetencySkillDefinition {
  id: string;
  companyId: string;
  category: SkillCategory;
  name: string;
  code: string; // e.g. "SEC-PATROL-L3", "CCTV-SURV-L4"
  description: string;
  levelDescriptors: Record<SkillProficiencyLevel, string>;
  requiredProficiencyByRole: Record<string, SkillProficiencyLevel>; // e.g. { "SECURITY_OFFICER": 4, "GUARD": 2 }
  createdAt: string;
  updatedAt: string;
}

export interface AssessedSkillItem {
  skillId: string;
  skillName: string;
  category: SkillCategory;
  currentProficiency: SkillProficiencyLevel;
  requiredProficiency: SkillProficiencyLevel;
  gap: number; // positive = proficiency deficit, 0 or negative = met/exceeded
  evidenceNotes?: string;
  lastAssessedAt: string;
  assessedBy: string; // Evaluator employeeId
}

export interface EmployeeSkillsMatrixRecord {
  id: string;
  companyId: string;
  employeeId: string;
  employeeName: string;
  designation: string;
  departmentId: string;
  siteId?: string;
  assessedSkills: AssessedSkillItem[];
  overallCompetencyScore: number; // 0 to 100%
  skillsGapCount: number;
  identifiedTrainingNeeds: string[];
  updatedAt: string;
}

// 9-Box Grid Categorization
export type NineBoxGridPosition = 
  | '1_1_HIGH_RISK'        // Low Perf, Low Pot
  | '1_2_INCONSISTENT'     // Low Perf, Med Pot
  | '1_3_POTENTIAL_GEM'    // Low Perf, High Pot
  | '2_1_EFFECTIVE'        // Med Perf, Low Pot
  | '2_2_CORE_PLAYER'      // Med Perf, Med Pot
  | '2_3_HIGH_POTENTIAL'   // Med Perf, High Pot
  | '3_1_TRUSTED_PRO'      // High Perf, Low Pot
  | '3_2_HIGH_PERFORMER'   // High Perf, Med Pot
  | '3_3_STAR_TALENT';     // High Perf, High Pot

export type SuccessionReadiness = 'READY_NOW' | 'READY_1_YEAR' | 'READY_2_YEAR' | 'EMERGENCY_ONLY';

export interface SuccessionNominee {
  employeeId: string;
  employeeName: string;
  currentRole: string;
  performanceRating: number; // 1 to 3
  potentialRating: number;   // 1 to 3
  nineBoxPosition: NineBoxGridPosition;
  readiness: SuccessionReadiness;
  retentionRisk: 'LOW' | 'MEDIUM' | 'HIGH';
  flightRiskReason?: string;
  developmentPlanNotes: string;
  nominatedAt: string;
  nominatedBy: string;
}

export interface SuccessionPlanRecord {
  id: string;
  companyId: string;
  criticalRoleTitle: string;
  departmentId: string;
  siteId?: string;
  currentIncumbentEmployeeId?: string;
  currentIncumbentName?: string;
  benchStrengthScore: number; // 0 to 100 based on ready candidates
  nominees: SuccessionNominee[];
  status: 'ACTIVE' | 'AT_RISK' | 'UNDER_REVIEW';
  lastReviewedAt: string;
  reviewedBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface CareerPathLevel {
  levelNumber: number;
  roleTitle: string;
  minExperienceMonths: number;
  requiredCompetencies: string[]; // Competency IDs
  minPerformanceScore: number;
  salaryBandMin: number;
  salaryBandMax: number;
}

export interface CareerProgressionTrackRecord {
  id: string;
  companyId: string;
  departmentId: string;
  trackName: string; // e.g. "Physical Security Operations Track", "Facility Engineering Track"
  levels: CareerPathLevel[];
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// PHASE B: RECRUITMENT ATS EXTENSION - OFFER LETTER & DAY-1 ONBOARDING
// ============================================================================

export interface CtcComponentBreakdown {
  basicMonthly: number;
  hraMonthly: number;
  conveyanceMonthly: number;
  specialAllowanceMonthly: number;
  grossMonthly: number;
  employerPfMonthly: number;
  employerEsiMonthly: number;
  gratuityMonthly: number;
  monthlyCtc: number;
  annualCtc: number;
  netTakeHomeEstimatedMonthly: number;
  variableBonusAnnualMax?: number;
}

export type OfferLetterStatus = 
  | 'DRAFT'
  | 'INTERNAL_APPROVAL_PENDING'
  | 'APPROVED'
  | 'SENT_TO_CANDIDATE'
  | 'ACCEPTED_BY_CANDIDATE'
  | 'DECLINED_BY_CANDIDATE'
  | 'JOINED'
  | 'WITHDRAWN';

export interface OfferLetterRecord {
  id: string;
  companyId: string;
  candidateId: string;
  candidateName: string;
  candidateEmail: string;
  candidatePhone: string;
  requisitionId: string;
  jobTitle: string;
  departmentId: string;
  siteId: string;
  regionId?: string;
  proposedJoiningDate: string;
  reportingManagerId?: string;
  reportingManagerName?: string;
  ctc: CtcComponentBreakdown;
  termsAndConditions: string;
  status: OfferLetterStatus;
  bpmInstanceId?: string;
  approvedBy?: string;
  approvedAt?: string;
  sentAt?: string;
  candidateResponseAt?: string;
  candidateSignatureHash?: string;
  candidateDeclineReason?: string;
  createdAt: string;
  updatedAt: string;
}

export type OnboardingTaskCategory = 'DOCUMENTATION' | 'IT_PROVISIONING' | 'UNIFORM_EQUIPMENT' | 'ORIENTATION_TRAINING' | 'SITE_ALLOCATION';

export interface OnboardingChecklistItem {
  id: string;
  category: OnboardingTaskCategory;
  title: string;
  description: string;
  assignedToRole: string; // e.g. "HR", "IT_ADMIN", "SITE_MANAGER"
  isMandatory: boolean;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'WAIVED';
  completedAt?: string;
  completedBy?: string;
  notes?: string;
}

export interface DayOneOnboardingRecord {
  id: string;
  companyId: string;
  candidateId: string;
  offerLetterId: string;
  employeeId?: string; // Generated once joined
  employeeName: string;
  joiningDate: string;
  siteId: string;
  departmentId: string;
  tasks: OnboardingChecklistItem[];
  overallProgressPercent: number;
  idCardIssued: boolean;
  uniformIssued: boolean;
  biometricEnrolled: boolean;
  status: 'PRE_BOARDING' | 'IN_PROGRESS' | 'COMPLETED' | 'DELAYED';
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// PHASE C: LEARNING MANAGEMENT - TRAINING CALENDAR & KIRKPATRICK 4-LEVEL ROI
// ============================================================================

export type TrainingMode = 'CLASSROOM' | 'VIRTUAL_LIVE' | 'SELF_PACED_ELEARNING' | 'ON_THE_JOB_TRAINING';

export interface MasterTrainingCalendarEvent {
  id: string;
  companyId: string;
  programId: string;
  programTitle: string;
  trainerName: string;
  trainerType: 'INTERNAL_STAFF' | 'EXTERNAL_VENDOR';
  mode: TrainingMode;
  targetDepartmentIds?: string[];
  targetSiteIds?: string[];
  regionId?: string;
  scheduledStartDate: string;
  scheduledEndDate: string;
  maxCapacity: number;
  enrolledCount: number;
  attendedCount: number;
  locationOrMeetingLink: string;
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'RESCHEDULED';
  createdAt: string;
  updatedAt: string;
}

// Kirkpatrick 4-Level Evaluation Model
export interface KirkpatrickTrainingEvaluation {
  id: string;
  companyId: string;
  programId: string;
  calendarEventId: string;
  employeeId: string;
  employeeName: string;
  siteId: string;

  // Level 1: Reaction (Trainee immediate CSAT / NPS score)
  level1Reaction: {
    contentRelevanceRating: number; // 1 to 5
    trainerEffectivenessRating: number; // 1 to 5
    facilityQualityRating: number; // 1 to 5
    overallCsatPercent: number; // 0 to 100%
    feedbackComment?: string;
    submittedAt?: string;
  };

  // Level 2: Learning (Pre-Test vs Post-Test Knowledge Delta)
  level2Learning: {
    preTestScore: number;  // 0 to 100
    postTestScore: number; // 0 to 100
    scoreDeltaPercent: number; // post - pre
    passed: boolean;
    quizCompletedAt?: string;
  };

  // Level 3: Behavior (30-day Post-Training On-the-Job Supervisor Audit)
  level3Behavior: {
    assessedBySupervisorId?: string;
    assessedAt?: string;
    adherenceToSafetyProtocolRating: number; // 1 to 5
    operationalExecutionRating: number; // 1 to 5
    behaviorImprovementObserved: boolean;
    supervisorNotes?: string;
  };

  // Level 4: Results (Operational Business Impact & Incident Reduction)
  level4Results: {
    siteIncidentReductionPercent?: number;
    auditComplianceScoreImprovement?: number;
    isBusinessImpactVerified: boolean;
    verifiedAt?: string;
  };

  overallEffectivenessScore: number; // Composite 0 to 100
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// PHASE D: REWARDS & RECOGNITION (R&R) AND PAYROLL SYNC ENGINE
// ============================================================================

export type AwardType = 
  | 'SPOT_AWARD'
  | 'SAFETY_HERO'
  | 'ATTENDANCE_CHAMPION'
  | 'CUSTOMER_EXCELLENCE'
  | 'INNOVATION_STAR'
  | 'PEER_KUDOS';

export interface RewardNominationRecord {
  id: string;
  companyId: string;
  awardType: AwardType;
  nomineeEmployeeId: string;
  nomineeName: string;
  nomineeDepartment: string;
  nomineeSiteId?: string;
  nominatedByEmployeeId: string;
  nominatedByName: string;
  citationReason: string;
  pointsAwarded: number;
  cashEquivalentInr: number;
  status: 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'DISBURSED_TO_PAYROLL';
  approvedBy?: string;
  approvedAt?: string;
  payrollBatchMonth?: string; // e.g. "2026-09"
  createdAt: string;
  updatedAt: string;
}

export interface PeerRecognitionBadge {
  id: string;
  companyId: string;
  badgeCode: 'INTEGRITY' | 'VIGILANCE' | 'TEAMWORK' | 'CUSTOMER_FIRST' | 'PROBLEM_SOLVER';
  badgeName: string;
  senderEmployeeId: string;
  senderName: string;
  recipientEmployeeId: string;
  recipientName: string;
  message: string;
  pointsGiven: number;
  awardedAt: string;
}

export interface EmployeeRewardWalletRecord {
  id: string;
  companyId: string;
  employeeId: string;
  employeeName: string;
  totalPointsEarned: number;
  totalPointsRedeemed: number;
  availablePointsBalance: number;
  totalCashEquivEarnedInr: number;
  pendingPayrollDisbursementInr: number;
  badgesEarned: string[];
  lastUpdated: string;
}
