import { UserSession, UserRole, EmployeeRecord, ShiftRecord, SiteRecord, RosterRecord, AttendanceRecord, LeaveRequestRecord } from './index';

export type CriticalSkillType = 
  | 'FIRST_AID'
  | 'FIRE_SAFETY'
  | 'ARMED_SECURITY'
  | 'UNARMED_SECURITY'
  | 'SUPERVISOR'
  | 'CCTV_OPERATOR'
  | 'DEFENSIVE_TACTICS'
  | 'ELECTRICIAN'
  | 'HVAC_TECH'
  | 'PARAMEDIC'
  | 'HAZMAT';

export interface RequiredSkillFloor {
  skill: CriticalSkillType | string;
  minCount: number;
  description?: string;
}

export interface SiteShiftRequirement {
  id: string;
  companyId: string;
  siteId: string;
  siteName: string;
  shiftId: string;
  shiftName: string;
  requiredHeadcount: number;
  minHeadcount: number; // Critical SLA floor below which alerts trigger CRITICAL
  maxHeadcount: number; // Budget cap above which triggers OVERSTAFFING
  requiredSkills: RequiredSkillFloor[];
  applicableDays: number[]; // 0 = Sun, 1 = Mon ... 6 = Sat
  isActive: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type WorkforceAnomalyType = 
  | 'UNDERSTAFFING'
  | 'OVERSTAFFING'
  | 'UNFILLED_SHIFTS'
  | 'CRITICAL_SKILL_SHORTAGE'
  | 'UNEXPECTED_ABSENCE';

export type ShortageSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export type ShortageWorkflowStage = 
  | 'REQUIRED_EVALUATED'
  | 'SCHEDULED_EVALUATED'
  | 'AVAILABLE_EVALUATED'
  | 'LEAVE_DEDUCTED'
  | 'ABSENCE_DETECTED'
  | 'OVERTIME_FACTORED'
  | 'SHORTAGE_IDENTIFIED'
  | 'SUPERVISOR_ALERTED'
  | 'REPLACEMENT_PROPOSED'
  | 'APPROVAL_PENDING'
  | 'APPROVED'
  | 'RESOLVED'
  | 'DISMISSED';

export interface ScheduledStaffDetail {
  employeeId: string;
  name: string;
  phone?: string;
  designation?: string;
  skills: string[];
  certifications?: string[];
  status: 'SCHEDULED' | 'PRESENT' | 'ON_LEAVE' | 'LEAVE_PENDING' | 'ABSENT' | 'RELIEF';
  leaveType?: string;
  punchTime?: string;
  isOvertime?: boolean;
}

export interface SkillGapDetail {
  skill: string;
  requiredCount: number;
  availableCount: number;
  deficit: number;
}

export interface UnexpectedAbsenceDetail {
  employeeId: string;
  name: string;
  phone?: string;
  shiftStart: string;
  minutesOverdue: number;
  supervisorNotified: boolean;
}

export interface ShiftWorkforceBreakdown {
  requiredCount: number;
  scheduledCount: number;
  leaveCount: number;
  absenceCount: number;
  overtimeCount: number;
  availableCount: number;
  shortageCount: number;
  surplusCount: number;
  scheduledStaff: ScheduledStaffDetail[];
  missingSkills: SkillGapDetail[];
  unexpectedAbsences: UnexpectedAbsenceDetail[];
  approvedLeaves: { employeeId: string; name: string; leaveType: string }[];
}

export interface ReplacementProposal {
  candidateId: string;
  candidateName: string;
  candidatePhone?: string;
  candidateSkills: string[];
  candidateDesignation?: string;
  sourceType: 'STANDBY_POOL' | 'OVERTIME_EXTENSION' | 'CROSS_SITE_TRANSFER' | 'AGENCY_RELIEF';
  originSiteId?: string;
  originSiteName?: string;
  skillMatchScore: number;
  weeklyOtHours: number;
  restHours: number;
  estimatedCost: number;
  proposedAt: string;
  proposedBy: string;
  proposedByName: string;
  notes?: string;
}

export interface ShortageAuditTimelineEntry {
  stage: ShortageWorkflowStage;
  timestamp: string;
  actor: string;
  actorRole?: string;
  note: string;
}

export interface WorkforceShortageIncident {
  id: string;
  companyId: string;
  siteId: string;
  siteName: string;
  shiftId: string;
  shiftName: string;
  shiftStartTime: string;
  shiftEndTime: string;
  date: string; // YYYY-MM-DD
  stage: ShortageWorkflowStage;
  anomalyTypes: WorkforceAnomalyType[];
  primaryAnomaly: WorkforceAnomalyType;
  severity: ShortageSeverity;
  breakdown: ShiftWorkforceBreakdown;
  
  supervisorId?: string;
  supervisorName?: string;
  supervisorPhone?: string;
  alertDispatchedAt?: string;
  
  replacementProposal?: ReplacementProposal;
  
  approval?: {
    approvedBy: string;
    approvedByName: string;
    approvedAt: string;
    notes?: string;
  };
  
  resolution?: {
    resolvedAt: string;
    resolvedBy: string;
    resolvedByName: string;
    actionTaken: string;
    notes?: string;
  };
  
  timeline: ShortageAuditTimelineEntry[];
  createdAt: string;
  updatedAt: string;
}

export interface ReplacementCandidate {
  employeeId: string;
  fullName: string;
  phone: string;
  email?: string;
  designation: string;
  skillGrade: string;
  skills: string[];
  certifications: string[];
  assignedSiteId: string;
  assignedSiteName: string;
  assignedBranchId: string;
  sourceType: 'STANDBY_POOL' | 'OVERTIME_EXTENSION' | 'CROSS_SITE_TRANSFER' | 'AGENCY_RELIEF';
  weeklyOvertimeHours: number;
  restHoursSinceLastShift: number;
  complianceScore: number; // 0-100
  skillMatchScore: number; // 0-100
  isEligibleForOvertime: boolean;
  availabilityStatus: 'AVAILABLE' | 'RESTING' | 'OVERTIME_ELIGIBLE';
  estimatedCostPerShift: number;
}

export interface CapacityPlanningSummary {
  date: string;
  totalSitesEvaluated: number;
  totalShiftsEvaluated: number;
  totalRequiredWorkforce: number;
  totalScheduledWorkforce: number;
  totalAvailableWorkforce: number;
  totalLeavesCount: number;
  totalAbsencesCount: number;
  totalOvertimeCount: number;
  netShortageCount: number;
  netSurplusCount: number;
  understaffedShiftsCount: number;
  overstaffedShiftsCount: number;
  unfilledShiftsCount: number;
  skillShortageShiftsCount: number;
  unexpectedAbsencesCount: number;
  criticalIncidentsCount: number;
  openAlertsCount: number;
  resolvedTodayCount: number;
  siteCoverageRate: number; // 0-100 %
}

export interface SiteCapacityAssessment {
  site: SiteRecord;
  requirements: SiteShiftRequirement[];
  shiftsAssessment: {
    shift: ShiftRecord;
    requirement?: SiteShiftRequirement;
    breakdown: ShiftWorkforceBreakdown;
    anomalies: WorkforceAnomalyType[];
    severity: ShortageSeverity;
    incident?: WorkforceShortageIncident;
  }[];
  overallStatus: 'OPTIMAL' | 'WARNING' | 'CRITICAL' | 'OVERSTAFFED';
  totalRequired: number;
  totalScheduled: number;
  totalAvailable: number;
  totalShortage: number;
}
