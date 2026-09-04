import { Timestamp } from 'firebase/firestore';

export * from './permissions';
export * from './ops';
export * from './compliance';
export * from './biometric';
export * from './bpm';
export * from './risk';
export * from './scalability';
export * from './workforceCapacity';
export * from './platform';
export * from './complianceControl';
export * from './scm';
export * from './pms';
export * from './talentManagement';
export * from './clientBilling';
export * from './multiModePatrol';
export * from './complianceExpiry';
export * from './aiScheduling';
export * from './unifiedSync';

export type UserRole = 
  | 'SUPER_ADMIN'
  | 'COMPANY_ADMIN'
  | 'ADMIN'
  | 'CLIENT_MANAGEMENT'
  | 'clientUser'
  | 'HR_ADMIN'
  | 'HR'
  | 'GENERAL_MANAGER'
  | 'DIRECTOR_CEO'
  | 'OWNER_PROMOTER'
  | 'OPS_MANAGER'
  | 'OPERATIONS_MANAGER'
  | 'FINANCE_MANAGER'
  | 'MANAGER'
  | 'SITE_MANAGER'
  | 'SITE_IN_CHARGE'
  | 'SUPERVISOR'
  | 'SITE_SUPERVISOR'
  | 'EMPLOYEE'
  | 'GUARD'
  | 'WORKER'
  | 'SERVICE_DESK'
  | 'FIELD_OFFICER'
  | 'PLATFORM_OPS'
  | 'SUPPORT_AUDITOR'
  | 'REGIONAL_AREA_MANAGER'
  | 'SUPPORT'
  | 'SEMI_SKILLED'
  | 'SKILLED'
  | 'FINANCE'
  | 'COMMERCIAL'
  | 'REGIONAL_MANAGER'
  | 'AREA_MANAGER'
  | 'IT'
  | 'MIS'
  | 'OPERATIONS_OFFICE'
  | 'QUALITY'
  | 'EHS'
  | 'SAFETY_OFFICER'
  | 'PROCUREMENT';

export type AuthorityLevel = 
  | 'A0_OWNER'
  | 'A1_DIRECTOR_CEO'
  | 'A2_GENERAL_MANAGER'
  | 'A3_OFFICIAL_STAFF'
  | 'A4_REGIONAL_AREA_MANAGER'
  | 'A5_SITE_IN_CHARGE'
  | 'A6_SUPERVISOR'
  | 'A7_SKILLED'
  | 'A8_SEMI_SKILLED'
  | 'A9_SUPPORT';

export type DataScope = 
  | 'GLOBAL'
  | 'COMPANY'
  | 'REGION'
  | 'AREA'
  | 'BRANCH'
  | 'SITE'
  | 'SELF';

export type AccountStatus = 'ACTIVE' | 'SUSPENDED' | 'PENDING' | 'INACTIVE' | 'ADMIN_APPROVED' | 'HR_APPROVED' | 'TRIAL_EXPIRED' | 'PENDING_APPROVAL' | 'REJECTED' | 'DISABLED';
export type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export type AppModuleKey = 
  | 'HCM' 
  | 'WFM' 
  | 'PAYROLL' 
  | 'INVENTORY' 
  | 'ASSETS' 
  | 'BILLING' 
  | 'CLIENT' 
  | 'VENDOR' 
  | 'ESS' 
  | 'NOTIFICATIONS' 
  | 'ANALYTICS' 
  | 'REPORTS' 
  | 'WORKFLOW' 
  | 'APPROVALS' 
  | 'AI' 
  | 'COMPLIANCE' 
  | 'SECURITY' 
  | 'BPM' 
  | 'CRM'
  | 'EMPLOYEES'
  | 'ATTENDANCE'
  | 'SHIFTS'
  | 'ID_BADGES'
  | 'SHIFT_ROSTER'
  | 'LEAVE'
  | 'COMPANY_BILLING'
  | 'SITE_OPERATIONS'
  | 'GUARD_PATROL'
  | 'VISITORS'
  | 'SECURITY_INCIDENTS'
  | 'CLIENTS'
  | 'APPROVAL_MANAGEMENT'
  | 'COMPANY_MANAGEMENT';

export const APP_MODULES = {
  HCM: 'HCM',
  WFM: 'WFM',
  PAYROLL: 'PAYROLL',
  INVENTORY: 'INVENTORY',
  ASSETS: 'ASSETS',
  BILLING: 'BILLING',
  CLIENT: 'CLIENT',
  VENDOR: 'VENDOR',
  ESS: 'ESS',
  NOTIFICATIONS: 'NOTIFICATIONS',
  ANALYTICS: 'ANALYTICS',
  REPORTS: 'REPORTS',
  WORKFLOW: 'WORKFLOW',
  APPROVALS: 'APPROVALS',
  AI: 'AI',
  COMPLIANCE: 'COMPLIANCE',
  SECURITY: 'SECURITY',
  BPM: 'BPM',
  CRM: 'CRM',
  EMPLOYEES: 'EMPLOYEES',
  ATTENDANCE: 'ATTENDANCE',
  SHIFTS: 'SHIFTS',
  ID_BADGES: 'ID_BADGES',
  SHIFT_ROSTER: 'SHIFT_ROSTER',
  LEAVE: 'LEAVE',
  COMPANY_BILLING: 'COMPANY_BILLING',
  SITE_OPERATIONS: 'SITE_OPERATIONS',
  GUARD_PATROL: 'GUARD_PATROL',
  VISITORS: 'VISITORS',
  SECURITY_INCIDENTS: 'SECURITY_INCIDENTS',
  CLIENTS: 'CLIENTS',
  APPROVAL_MANAGEMENT: 'APPROVAL_MANAGEMENT',
  COMPANY_MANAGEMENT: 'COMPANY_MANAGEMENT'
} as const;

export interface UserSession {
  userId: string;
  uid?: string;
  employeeId: string;
  fullName: string;
  email: string;
  role: UserRole;
  authority?: AuthorityLevel;
  companyId: string;
  branchId: string;
  token: string;
  tokenExpiresAt: number;
  authorityLevel?: AuthorityLevel;
  assignedSiteId?: string;
  isBiometricEnabled: boolean;
  lastActiveAt: number;
  loginMode: 'PASSWORD' | 'BIOMETRIC' | 'OTP' | 'PIN' | 'GOOGLE' | 'SSO';
  authMode?: string;
  accountStatus: AccountStatus;
  emailVerified: boolean;
  departmentId?: string;
  departmentName?: string;
  companyAdminApproval?: any;
  provisioningSource?: string;
  firebaseUid?: string;
  permissionsVersion?: number;
  avatarUrl?: string;
  hrApproval?: any;
  assignedRegionId?: string;
  regionId?: string;
  assignedBranchId?: string;
  assignedSiteIds?: string[];
  clientId?: string;
  siteIds?: string[];
  isClientPortalUser?: boolean;
  lastLoginAt?: number | Timestamp;
  dataScope?: string;
}

export interface CandidateStatusHistory { [key: string]: any; }
export interface ScreeningRecord { [key: string]: any; }
export type ScreeningDecision = 'SELECTED' | 'REJECTED' | 'SHORTLISTED' | 'HOLD';
export interface ScreeningCriteriaResult { [key: string]: any; }
export interface InterviewRecord { [key: string]: any; }
export type InterviewStatus = 'SCHEDULED' | 'COMPLETED' | 'CANCELLED' | 'RESCHEDULED';
export type InterviewDecision = 'SELECTED' | 'REJECTED' | 'NEXT_ROUND';
export interface SelectionRecord { [key: string]: any; }

export type SelectionDecision = 'SELECTED' | 'REJECTED' | 'ON_HOLD';
export interface BackgroundVerificationRecord { [key: string]: any; }
export type BgVerificationType = 'POLICE' | 'PREVIOUS_EMPLOYER' | 'ADDRESS' | 'EDUCATION';
export type BgVerificationStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
export type BgVerificationResult = 'CLEAN' | 'DISCREPANCY' | 'MINOR_ISSUE' | 'FAILED';
export type VerificationStatus = 'PENDING' | 'VERIFIED' | 'REJECTED' | 'FAILED';
export interface CandidateDocumentRecord { [key: string]: any; }

export interface StandardCandidateDocument {
  documentType: string;
  documentName: string;
  isRequired: boolean;
}

export const STANDARD_CANDIDATE_DOCUMENTS: StandardCandidateDocument[] = [
  { documentType: 'ADHAAR', documentName: 'Aadhaar Card', isRequired: true },
  { documentType: 'PAN', documentName: 'PAN Card', isRequired: true },
  { documentType: 'VOTER_ID', documentName: 'Voter ID', isRequired: false },
  { documentType: 'DRIVING_LICENSE', documentName: 'Driving License', isRequired: false },
  { documentType: 'PASSPORT', documentName: 'Passport', isRequired: false },
  { documentType: 'RESUME', documentName: 'Resume', isRequired: true },
  { documentType: 'PHOTOGRAPH', documentName: 'Photograph', isRequired: true },
  { documentType: 'POLICE_CLEARANCE', documentName: 'Police Clearance', isRequired: false }
];

export type CandidateDocumentType = string;
export type CandidateDocVerificationStatus = 'PENDING' | 'VERIFIED' | 'REJECTED';

export interface OvertimeRequestRecord { [key: string]: any; }
export interface AppNotification { [key: string]: any; }
export interface PatrolCheckpointRecord { [key: string]: any; }
export interface PatrolLogRecord { [key: string]: any; }
export interface VisitorLogRecord { [key: string]: any; }

export interface VisitorWatchlistRecord {
  id: string;
  companyId: string;
  assignedRegionId?: string;
  assignedBranchId?: string;
  siteId?: string;
  siteName?: string;
  visitorName: string;
  visitorPhone: string;
  idNumber?: string;
  vehicleNumber?: string;
  reason: string;
  severity: 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: 'ACTIVE' | 'REVOKED';
  incidentReportId?: string;
  incidentCategory?: string;
  incidentDate?: string;
  blacklistedBy: string;
  blacklistedByName?: string;
  blacklistedAt: string;
  revokedAt?: string;
  revokedBy?: string;
  revocationReason?: string;
  notes?: string;
  createdAt: string;
  updatedAt?: string;
  [key: string]: any;
}

export interface BlacklistCheckResult {
  isBlacklisted: boolean;
  severity?: 'MEDIUM' | 'HIGH' | 'CRITICAL';
  reason?: string;
  matchedSource: 'WATCHLIST' | 'INCIDENT_REPORT' | 'PREVIOUS_VIOLATION' | 'NONE';
  matchedField?: 'PHONE' | 'NAME' | 'VEHICLE' | 'ID';
  incidentReportId?: string;
  incidentDate?: string;
  incidentCategory?: string;
  incidentDescription?: string;
  watchlistId?: string;
  blacklistedAt?: string;
  blacklistedByName?: string;
  notes?: string;
}
export interface MaterialMovementRecord { [key: string]: any; }
export interface DailySiteLogRecord {
  id: string;
  companyId: string;
  assignedRegionId?: string;
  assignedBranchId?: string;
  siteId: string;
  siteName: string;
  date: string;
  supervisorId: string;
  supervisorName: string;
  logType?: 'INSPECTION' | 'HANDOVER' | 'DAILY' | string;
  inspectorId?: string;
  guardsCountOnDuty: number;
  totalPatrolsCompleted: number;
  totalVisitorsLogged: number;
  totalIncidentsReported: number;
  checklistData?: any[];
  score?: number;
  inventoryStatus?: {
    keysTransferred: boolean;
    radiosTransferred: boolean;
    logbooksTransferred: boolean;
    musterVerified: boolean;
    incomingSupervisorName: string;
  };
  status?: 'SUBMITTED' | 'INITIATED' | 'COMPLETED' | 'AMENDED' | string;
  notes?: string;
  createdAt: string;
  updatedAt?: number | string;
  version?: number;
  editHistory?: Array<{
    updatedAt: string;
    updatedBy: string;
    previousData: any;
    changeSummary: string;
  }>;
  [key: string]: any;
}


export type PhaseAScreen = string;
export interface CompanyTenant {
  companyId: string;
  companyLegalName: string;
  name?: string;
  brandName: string;
  emailDeliveryStatus?: string;
  emailDeliveryError?: string;
  licenseTier: 'STARTER' | 'PROFESSIONAL' | 'ENTERPRISE';
  allowedBranches: string[];
  maxEmployeesAllowed: number;
  maxSitesAllowed: number;
  primaryColorHex: string;
  secondaryColorHex: string;
  status: 'ACTIVE' | 'SUSPENDED' | 'PENDING' | 'TRIAL_EXPIRED';
  companyCode?: string;
  enabledModules?: string[];
  adminEmail?: string;
  adminName?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  logoUrl?: string;
  tagline?: string;
  loginBackgroundUrl?: string;
  websiteUrl?: string;
  portalSubdomain?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface SubscriptionPlan {
  planId: string;
  planCode: string;
  name: string;
  employeeLimit: number;
  userLimit: number;
  storageLimitMB: number;
  planName?: string;
  description?: string;
  monthlyPrice: number;
  yearlyPrice: number;
  status: 'ACTIVE' | 'INACTIVE';
  trialDays: number;
  currency: string;
  billingCycle: 'MONTHLY' | 'YEARLY' | 'BOTH';
  trialEligible: boolean;
  createdAt?: string;
  updatedAt?: string;
  enabledModules: string[];
}

export interface CompanySubscription {
  subscriptionId: string;
  companyId: string;
  planId: string;
  status: 'ACTIVE' | 'TRIAL' | 'PAST_DUE' | 'CANCELED' | 'EXPIRED' | 'GRACE_PERIOD';
  billingCycle: 'MONTHLY' | 'YEARLY';
  startDate: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  renewalDate: string;
  autoRenew: boolean;
  cancelAtPeriodEnd: boolean;
  employeeLimit: number;
  userLimit: number;
  storageLimitMB: number;
  source: 'MANUAL' | 'STRIPE' | 'PAYPAL' | 'SYSTEM';
  proratedCredit?: number;
  lastPaymentAmount?: number;
  lastPaymentDate?: string;
  nextBillingAmount?: number;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
}

export interface ModuleEntitlement {
  moduleId: string;
  enabled: boolean;
  validUntil?: string;
  id?: string;
  companyId?: string;
  source?: string;
  planId?: string;
  subscriptionId?: string;
  validFrom?: string;
  overriddenBySuperAdmin?: boolean;
  updatedAt?: string;
}

// Production Organizational Hierarchy Models
export interface RegionRecord {
  id: string;
  companyId: string;
  name: string;
  code: string;
  description?: string;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: string;
  updatedAt: string;
}

export interface BranchRecord {
  id: string;
  companyId: string;
  regionId: string;
  name: string;
  code: string;
  description?: string;
  city?: string;
  address?: string;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: string;
  updatedAt: string;
}

export interface SiteRecord {
  id: string;
  companyId: string;
  regionId?: string;
  branchId?: string;
  name: string;
  siteName?: string;
  code: string;
  address?: string;
  clientId?: string;
  clientName?: string;
  latitude?: number;
  longitude?: number;
  radius?: number; // Geofence radius
  geofenceRadius?: number;
  geoFenceRadiusMeters?: number;
  geofenceEnabled?: boolean;
  accuracyThreshold?: number;
  attendanceMode?: string;
  geoCoordinates?: { latitude: number; longitude: number };
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  createdAt: string;
  updatedAt: string;
}

export interface DepartmentRecord {
  id: string;
  companyId: string;
  name: string;
  code: string;
  description?: string;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: string;
  updatedAt: string;
}

export interface GroupRecord {
  id: string;
  companyId: string;
  name: string;
  code: string;
  type?: 'OPERATIONAL' | 'ADMINISTRATIVE' | 'SECURITY' | 'MAINTENANCE';
  regionId?: string;
  siteId?: string;
  departmentId?: string;
  supervisorId?: string;
  shiftId?: string;
  description?: string;
  status: 'ACTIVE' | 'INACTIVE';
  memberCount: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface GroupMemberRecord {
  id: string; // usually groupId_employeeId
  companyId: string;
  groupId: string;
  employeeId: string;
  siteId?: string;
  departmentId?: string;
  assignedAt: string;
  status: 'ACTIVE' | 'INACTIVE';
}

export interface EmployeeRecord {
  id: string;
  companyId: string;
  employeeId: string; // unique public code
  employeeCode?: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  email?: string;
  phone?: string;
  contactNumber?: string;
  dateOfBirth?: string;
  bloodGroup?: string;
  gender?: 'MALE' | 'FEMALE' | 'OTHER';
  emergencyContact?: {
    name: string;
    relation: string;
    phone: string;
  };
  address?: string;

  // Professional
  role: UserRole;
  designation?: string;
  departmentId?: string;
  assignedRegionId?: string;
  assignedBranchId?: string;
  assignedSiteId?: string;
  supervisorId?: string;
  reportingManagerId?: string;
  shiftId?: string;
  employmentType?: 'PERMANENT' | 'CONTRACT' | 'TEMPORARY' | 'PROBATION';
  weeklyOff?: number[];
  joinedDate?: string;
  groupId?: string; // Current primary group

  // Statutory
  panNumber?: string;
  aadharNumber?: string;
  uanNumber?: string;
  pfNumber?: string;
  esicNumber?: string;

  // Bank Details
  bankDetailsRef?: string;
  bankName?: string;
  bankAccountNumber?: string;
  bankIfsc?: string;

  status: 'ACTIVE' | 'INACTIVE' | 'TERMINATED' | 'SUSPENDED' | 'PENDING_VERIFICATION' | 'DEACTIVATED';
  lifecycleStatus?: string;
  profilePhotoUrl?: string;
  profilePictureUrl?: string;
  documents?: any[];
  onboardingStatus?: string;
  hasSystemAccess?: boolean;
  fcmTokens?: string[];
  joinedAt?: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  updatedBy?: string;
  [key: string]: any;
}

export interface ShiftRecord { [key: string]: any; }
export interface AttendanceRecord {
  id: string;
  companyId: string;
  employeeId: string;
  date: string; // YYYY-MM-DD (Standard)
  attendanceDate?: string; // Legacy support
  checkInTime?: string; // ISO
  checkOutTime?: string; // ISO
  status: AttendanceStatus;
  workedMinutes: number;
  lateMinutes: number;
  earlyDepartureMinutes: number;
  overtimeMinutes: number;
  approvedOvertimeMinutes?: number;
  shiftId?: string;
  siteId?: string;
  remarks?: string;
  updatedAt: string;
  [key: string]: any;
}
export interface RosterRecord { id?: string; companyId: string; employeeId: string; employeeName?: string; shiftId: string; shiftName?: string; siteId: string; siteName?: string; date?: string; rosterDate?: string; status: "ACTIVE" | "CANCELLED" | "COMPLETED" | "SCHEDULED"; createdBy?: string; createdAt?: string; updatedBy?: string; updatedAt?: string; [key: string]: any; }
export interface CostCentreRecord {
  id?: string;
  companyId: string;
  code: string;
  name: string;
  description?: string;
  budgetAllocated?: number;
  budgetReserved?: number;
  budgetConsumed?: number;
  status: 'ACTIVE' | 'INACTIVE';
}
export interface ApprovalRequestRecord { [key: string]: any; }

export interface MASTER_APP_MODULE {
  key: string;
  name: string;
  label: string;
  category: 'CORE' | 'HRMS' | 'SECURITY' | 'FINANCE' | 'SYSTEM' | string;
  description: string;
  icon?: string;
  [key: string]: any;
}
export interface AppModule {
  key: AppModuleKey;
  label: string;
  icon?: string;
  name?: string;
  category?: string;
  description?: string;
}

export * from './permissions';
export * from './ops';
export * from './compliance';
export * from './biometric';
export * from './bpm';
export * from './risk';
export * from './scalability';
export * from './workforceCapacity';

export interface WarrantyClaimRecord { [key: string]: any; }
export interface AssetRecord { [key: string]: any; }
export interface EamAssetRecord { [key: string]: any; }
export type WarrantyStatus = 'ACTIVE' | 'EXPIRED' | 'VOID' | 'PENDING' | 'CANCELLED' | 'CLAIM_IN_PROGRESS' | 'CLAIM_RESOLVED' | 'EXPIRING_SOON';
export type WarrantyClaimStatus = 'OPEN' | 'IN_PROGRESS' | 'APPROVED' | 'REJECTED' | 'CLOSED' | 'RESOLVED' | 'SERVICE_IN_PROGRESS';
export interface WorkOrderRecord { [key: string]: any; }
export interface WarrantyRecord { [key: string]: any; }
export type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'LATE' | 'ON_LEAVE' | 'HALFDAY' | 'OFF_DUTY' | 'SCHEDULED' | 'EARLY_DEPARTURE';
export interface OvertimePolicyRecord { [key: string]: any; }
export interface AttendanceCalculationResult { [key: string]: any; }
export interface GeoVerificationData { [key: string]: any; }
export type GeoVerificationResult = 'WITHIN_GEOFENCE' | 'OUTSIDE_GEOFENCE' | 'MOCKED_GPS' | 'POOR_ACCURACY' | 'INCONCLUSIVE' | string;
export interface SuspiciousMusterPunch { [key: string]: any; }
export interface CandidateRecord { [key: string]: any; }
export interface CandidateRegistrationResult { [key: string]: any; }
export interface JobRequisitionRecord { [key: string]: any; }
export interface PublicJobPosting {
  id: string; // matches requisition id
  companyId: string;
  companyName?: string;
  jobTitle: string;
  departmentName?: string;
  siteName?: string;
  locationCity?: string;
  employmentType?: 'FULL_TIME' | 'PART_TIME' | 'CONTRACT' | 'SHIFT' | string;
  experienceRequired?: string;
  jobDescription: string;
  skills: string[];
  openPositions?: number;
  publicSalaryRange?: string;
  status: 'PUBLISHED' | 'CLOSED';
  publishedAt: string;
  updatedAt: string;
  closingDate?: string;
}
export type CandidateStage = 
  | 'APPLIED' 
  | 'SCREENING' 
  | 'INTERVIEW' 
  | 'OFFER' 
  | 'HIRED' 
  | 'REJECTED'
  | 'SELECTED'
  | 'INTERVIEW_SCHEDULED'
  | 'WITHDRAWN'
  | 'SHORTLISTED'
  | 'ON_HOLD'
  | 'CONVERTED_TO_EMPLOYEE'
  | 'DISQUALIFIED'
  | 'VERIFICATION_FAILED'
  | 'OFFER_PREPARATION'
  | 'READY_FOR_ONBOARDING'
  | 'INTERVIEW_COMPLETED'
  | 'BACKGROUND_VERIFICATION'
  | 'DOCUMENT_VERIFICATION'
  | 'OFFER_EXTENDED'
  | 'ONBOARDING'
  | 'REGISTERED'
  | 'OFFER_ACCEPTED'
  | string;
export interface IncidentReportRecord { [key: string]: any; }
export interface ServiceTicketRecord { [key: string]: any; }
export interface ServicePriorityConfigRecord { [key: string]: any; }
export interface ServiceSlaPolicyRecord { [key: string]: any; }
export interface SlaDefinitionRecord { [key: string]: any; }
export interface SlaBreachRecord { [key: string]: any; }
export interface SlaScorecardRecord { [key: string]: any; }
export interface SlaScorecardMetric { [key: string]: any; }
export interface TicketSlaPauseRecord { [key: string]: any; }
export interface TicketPriorityHistoryRecord { [key: string]: any; }
export type ServiceTicketPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | 'URGENT';
export type TicketSlaStatus = 'IN_SLA' | 'WARNING' | 'BREACHED' | 'PAUSED' | 'ACTIVE' | 'MET' | 'FAILED' | 'CANCELLED';

export type TicketSlaPauseReason = 'AWAITING_CLIENT' | 'WAITING_ON_CLIENT' | 'AWAITING_VENDOR' | 'AWAITING_INFO' | 'ON_HOLD';

export interface AuditLogRecord { [key: string]: any; }
export interface TicketCategoryRecord { [key: string]: any; }
export interface TicketCommentRecord { [key: string]: any; }
export interface TicketAttachmentRecord { [key: string]: any; }
export type TicketEvidenceType = string;
export type ServiceTicketStatus = string;
export interface TicketStatusHistoryRecord { [key: string]: any; }
export interface TicketStatusDefinition { [key: string]: any; }
export interface TicketStatusTransitionPayload { [key: string]: any; }
export interface ServiceTicketResolutionRecord { [key: string]: any; }
export type TicketVerificationStatus = string;
export type TicketVerificationResult = string;
export interface SubmitResolutionPayload { [key: string]: any; }
export interface VerifyResolutionPayload { [key: string]: any; }
export type TicketReopenReasonCategory = string;
export interface TicketReopenRecord { [key: string]: any; }
export interface ReopenTicketPayload { [key: string]: any; }
export interface TicketReopenEligibilityResult { [key: string]: any; }
export type TicketFeedbackStatus = string;
export type FeedbackSentiment = string;
export interface TicketFeedbackRatingBreakdown { [key: string]: any; }
export interface TicketFeedbackRecord { [key: string]: any; }
export interface SubmitClientFeedbackPayload { [key: string]: any; }
export interface ReviewClientFeedbackPayload { [key: string]: any; }
export interface RequestClientFeedbackPayload { [key: string]: any; }
export interface TicketFeedbackEligibilityResult { [key: string]: any; }
export interface ReleaseGateSignOff { [key: string]: any; }
export type SecurityFindingStatus = string;
export interface SatisfactionScoreFilter { [key: string]: any; }
export interface SatisfactionScoreSummary { [key: string]: any; }
export interface SatisfactionDimensionScore { [key: string]: any; }
export interface SatisfactionGroupMetric { [key: string]: any; }
export interface SatisfactionTrendPoint { [key: string]: any; }
export interface ServiceCsatSnapshotRecord { [key: string]: any; }
export interface SecurityAssuranceRun { [key: string]: any; }
export interface SecurityFinding { [key: string]: any; }
export type PlatformPermission = string;
export interface ContractRecord { [key: string]: any; }
export interface BillingRateMatrixRecord { [key: string]: any; }
export interface EmployeeSalaryProfileRecord { [key: string]: any; }
export interface PaymentRecord { [key: string]: any; }
export interface InvoiceRecord { [key: string]: any; }
export interface CompanySubscription { [key: string]: any; }
export interface PurchaseOrderRecord { [key: string]: any; }
export interface TransferRequest { [key: string]: any; }
export type IncidentStatus = string;
export interface IncidentTimelineEvent { [key: string]: any; }
export interface TrainingProgramRecord { [key: string]: any; }
export interface TrainingSessionRecord { [key: string]: any; }
export interface TrainingEnrollmentRecord { [key: string]: any; }
export interface MandatoryRefresherConfig { [key: string]: any; }
export interface EmployeeRefresherStatus { [key: string]: any; }




export interface SalarySlipRecord { [key: string]: any; }
export interface CompanyRecord { [key: string]: any; }
export interface PtSlab {
  minSalary: number;
  maxSalary: number;
  amount: number;
  febAmount?: number; // Special adjustment for February in states like Maharashtra
  gender?: 'ALL' | 'MALE' | 'FEMALE';
}

export interface StatutoryConfigRecord {
  id?: string;
  companyId: string;
  state: string; // e.g. 'MAHARASHTRA', 'KARNATAKA', 'GUJARAT', 'TAMIL_NADU', 'TELANGANA', 'WEST_BENGAL', 'DELHI', 'DEFAULT'
  stateName?: string;
  pfEnabled: boolean;
  pfEmployeeRate: number; // e.g. 12%
  pfEmployerRate: number; // e.g. 12%
  pfWageCeiling: number; // e.g. 15000
  pfCapAmount: number; // e.g. 1800 (12% of 15000)
  pfCappedAtCeiling: boolean;
  esiEnabled: boolean;
  esiEmployeeRate: number; // e.g. 0.75%
  esiEmployerRate: number; // e.g. 3.25%
  esiWageCeiling: number; // e.g. 21000
  ptEnabled: boolean;
  ptSlabs: PtSlab[];
  tdsEnabled: boolean;
  tdsThreshold: number; // e.g. 50000 per month or 600000 annual
  tdsDefaultRate: number; // e.g. 5%
  lwfEnabled?: boolean; // Labour Welfare Fund
  lwfEmployeeAmount?: number;
  lwfEmployerAmount?: number;
  updatedAt?: string;
  updatedBy?: string;
}
export interface ShiftHandoverRecord { [key: string]: any; }
export type LeadStatus = 'NEW' | 'CONTACTED' | 'QUALIFIED' | 'DEMO' | 'CONVERTED' | 'LOST' | string;

export interface LeadActivity {
  id: string;
  action: 'LEAD_CREATED' | 'STATUS_CHANGE' | 'NOTE_ADDED' | 'FOLLOW_UP_SCHEDULED' | 'CONVERTED_TO_TENANT' | string;
  notes: string;
  timestamp: string;
  actorId?: string;
  actorName?: string;
}

export interface LeadRecord {
  id: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  designation?: string;
  city?: string;
  workforceSize?: string;
  interestedModules?: string;
  message?: string;
  source?: 'WEBSITE_DEMO' | 'CONTACT_SALES' | 'COLD_OUTREACH' | 'REFERRAL' | 'SUPER_ADMIN_MANUAL' | string;
  status: LeadStatus;
  notes?: string;
  followUpDate?: string;
  followUpNotes?: string;
  convertedCompanyId?: string;
  convertedAt?: string;
  activityHistory?: LeadActivity[];
  budget?: string;
  estimatedEmployees?: number;
  createdAt: string;
  updatedAt: string;
  [key: string]: any;
}
export interface PromotionRequest { [key: string]: any; }
export interface ExitRequest { [key: string]: any; }
export interface IdentityBadgeRecord { [key: string]: any; }
export type BadgeStatus = string;
export type BadgeType = string;
export interface BadgeLifecycleEvent { [key: string]: any; }
export interface DocumentTypeConfig { [key: string]: any; }
export interface EmployeeDocumentRecord { [key: string]: any; }
export type DocumentStatus = string;
export type BiometricVerificationResult = string;
export interface AuditTrailRecord { [key: string]: any; }

export interface AppSettings { [key: string]: any; }
export interface ClientRecord { [key: string]: any; }
export interface DeploymentRecord { [key: string]: any; }
export interface DeploymentHistoryRecord { [key: string]: any; }
export interface DesignationRecord { [key: string]: any; }
export interface UserMembershipRecord { [key: string]: any; }
export interface PatrolPlanRecord { [key: string]: any; }
export interface PatrolTourRecord { [key: string]: any; }
export interface PatrolTourCheckpointScan { [key: string]: any; }
export type PatrolTourStatus = string;
export type IncidentCategory = string;
export type IncidentSeverity = string;
export interface SystemConfigRecord { [key: string]: any; }
export interface VendorRecord { [key: string]: any; }
export interface OvertimeAdjustmentRecord { [key: string]: any; }
export type AttendanceExceptionType = string;
export interface SalaryAdvanceRecord { [key: string]: any; }
export interface PaymentBatchRecord { [key: string]: any; }
export type PaymentBatchStatus = string;
export interface CompanyBankAccountRecord { [key: string]: any; }
export type BankExportFormat = string;
export interface StockTransactionRecord { [key: string]: any; }
export interface InventoryVendorRecord { [key: string]: any; }
export interface AssetMovementHistoryRecord { [key: string]: any; }
export interface AssetMaintenanceRecord { [key: string]: any; }
export type AssetCondition = string;
export type AssetMovementAction = string;
export interface ProcurementRequisitionRecord { [key: string]: any; }
export interface GoodsReceiptNoteRecord { [key: string]: any; }
export interface ThreeWayMatchRecord { [key: string]: any; }
export interface OnboardingTask { [key: string]: any; }
export interface LifecycleHistoryRecord { [key: string]: any; }

export interface SecurityGovernanceConfig { [key: string]: any; }
export type SensitiveDataClassification = string;
export type BulkOperationType = string;
export type ExportDataFormat = string;
export type SecuritySeverity = string;
export type OvertimeRoundingRule = string;
export type WorkforceCategory = string;
export interface EmployeeCertificationRecord { [key: string]: any; }
export interface SecurityEventRecord { [key: string]: any; }
export interface SecurityDetectionRule { [key: string]: any; }
export interface DetectedRiskEvent { [key: string]: any; }
export type DetectedRiskStatus = string;
export interface ContractExpiryEventRecord { [key: string]: any; }
export type ContractExpiryMilestone = number;
export interface ClientContactRecord { [key: string]: any; }
export interface ContractSiteMapping { [key: string]: any; }
export interface ContractScopeRecord { [key: string]: any; }
export interface ContractAmendmentRecord { [key: string]: any; }
export type SensitiveDataCategory = string;
export type DataSensitivityLevel = string;
export type DataMaskingPattern = string;
export interface SensitiveFieldDefinition { [key: string]: any; }
export interface SensitiveDataAccessContext { [key: string]: any; }
export interface SensitiveDataAccessResult { [key: string]: any; }
export type AssetStatus = string;
export interface TaskRecord { [key: string]: any; }
export interface AnnouncementRecord { [key: string]: any; }
export interface DocumentRecord { [key: string]: any; }
export interface UserProfileData { [key: string]: any; }

export interface PlatformAudit { [key: string]: any; }
export interface PaymentBatchItemRecord { [key: string]: any; }
export interface PaymentBatchValidationSummary { [key: string]: any; }
export interface BankExportFileResult { [key: string]: any; }
export type PaymentBatchMethod = string;
export interface KpiDefinition { [key: string]: any; }
export type KpiCategory = string;
export interface KpiSnapshot { [key: string]: any; }
export interface KpiValue { [key: string]: any; }
export type KpiStatus = string;
export type KpiTrendDirection = string;
export type SnapshotStatus = string;
export type DataQuality = string;
export interface BillingPreviewRecord { [key: string]: any; }
export interface BulkAndExportAlertRecord { [key: string]: any; }

export interface AppUpdateInfo { [key: string]: any; }



export type TrainingCategory = string;
export type WorkOrderStatus = string;
export type WorkOrderPriority = string;
export interface SecurityAnomalyRecord { [key: string]: any; }

export const MASTER_APP_MODULES: MASTER_APP_MODULE[] = [
  // HRMS & Workforce
  { key: 'HCM', name: 'Human Capital Management', label: 'Human Capital Management', category: 'HRMS', description: 'Core personnel profiles, organizational hierarchies, and designation ladders.' },
  { key: 'WFM', name: 'Workforce Management', label: 'Workforce Management', category: 'HRMS', description: 'Deployment planning, staff capacity scheduling, and post allocations.' },
  { key: 'EMPLOYEES', name: 'Employee Directory', label: 'Employee Directory', category: 'HRMS', description: 'Comprehensive staff records, onboarding verifications, and status tracking.' },
  { key: 'ATTENDANCE', name: 'Time & Attendance Muster', label: 'Time & Attendance Muster', category: 'HRMS', description: 'Live biometric sync, GPS geotagged muster, and daily punch audit logs.' },
  { key: 'SHIFTS', name: 'Shift Configurations', label: 'Shift Configurations', category: 'HRMS', description: 'Custom rotational shifts, grace periods, and break rules.' },
  { key: 'SHIFT_ROSTER', name: 'Duty Roster', label: 'Duty Roster', category: 'HRMS', description: 'Monthly operational shift schedules, guard assignments, and reliever duty.' },
  { key: 'LEAVE', name: 'Leave Management', label: 'Leave Management', category: 'HRMS', description: 'Leave accrual rules, requests, balance ledgers, and approval workflows.' },
  { key: 'ID_BADGES', name: 'Digital ID Badges', label: 'Digital ID Badges', category: 'HRMS', description: 'NFC & QR digital employee identity cards and verification credentials.' },

  // Operations & Assets (Core)
  { key: 'INVENTORY', name: 'Uniforms & Equipment', label: 'Uniforms & Equipment', category: 'CORE', description: 'Store inventories, uniform issuing, batch management, and requisitions.' },
  { key: 'ASSETS', name: 'Asset Management', label: 'Asset Management', category: 'CORE', description: 'Physical equipment tracking, barcode scanning, and maintenance lifecycle.' },
  { key: 'SITE_OPERATIONS', name: 'Site Operations', label: 'Site Operations', category: 'CORE', description: 'Multi-site post deployment, geo-fence perimeters, and site logbooks.' },
  { key: 'CLIENTS', name: 'Client Accounts', label: 'Client Accounts', category: 'CORE', description: 'Client profiles, deployed site contracts, SLAs, and service agreements.' },
  { key: 'CLIENT', name: 'Client Portal', label: 'Client Portal', category: 'CORE', description: 'External client dashboard, service requests, and SLA performance reports.' },
  { key: 'VENDOR', name: 'Vendor Procurement', label: 'Vendor Procurement', category: 'CORE', description: 'Vendor registry, RFQs, purchase orders, and supplier risk scores.' },
  { key: 'CRM', name: 'Business Development', label: 'Business Development', category: 'CORE', description: 'Sales pipeline, lead qualification, quotation builders, and proposals.' },

  // Security & Compliance
  { key: 'GUARD_PATROL', name: 'Guard Tour Patrol', label: 'Guard Tour Patrol', category: 'SECURITY', description: 'NFC/QR checkpoint tours, live patrol tracks, and missed checkpoint alerts.' },
  { key: 'VISITORS', name: 'Visitor Management', label: 'Visitor Management', category: 'SECURITY', description: 'Digital gate passes, visitor check-in, photo capture, and host approvals.' },
  { key: 'SECURITY_INCIDENTS', name: 'Incident Dispatch', label: 'Incident Dispatch', category: 'SECURITY', description: 'SOS alarms, site incident reports, dispatch escalations, and root-cause logs.' },
  { key: 'SECURITY', name: 'Security Assurance', label: 'Security Assurance', category: 'SECURITY', description: 'Security audit logs, anomaly detection, device attestation, and interlocks.' },
  { key: 'COMPLIANCE', name: 'Statutory Compliance', label: 'Statutory Compliance', category: 'SECURITY', description: 'PF, ESI, Minimum Wages Act audits, labor registers, and statutory returns.' },

  // Finance & Billing
  { key: 'PAYROLL', name: 'Payroll Engine', label: 'Payroll Engine', category: 'FINANCE', description: 'Automated wage calculation, attendance-based deductions, and payslips.' },
  { key: 'COMPANY_BILLING', name: 'Tenant Subscriptions', label: 'Tenant Subscriptions', category: 'FINANCE', description: 'Tenant SaaS subscriptions, license tiers, and automated billing invoices.' },
  { key: 'BILLING', name: 'Client Invoicing', label: 'Client Invoicing', category: 'FINANCE', description: 'Contract rate cards, billable shift muster, GST invoices, and collections.' },

  // Platform & System Governance
  { key: 'ESS', name: 'Employee Self-Service', label: 'Employee Self-Service', category: 'SYSTEM', description: 'Mobile self-service for punches, payslips, leaves, and uniform requests.' },
  { key: 'NOTIFICATIONS', name: 'Notification Hub', label: 'Notification Hub', category: 'SYSTEM', description: 'Real-time push, in-app alerts, email triggers, and SMS operational dispatches.' },
  { key: 'ANALYTICS', name: 'Operational Intelligence', label: 'Operational Intelligence', category: 'SYSTEM', description: 'Real-time KPI widgets, attendance heatmap, muster deficits, and analytics.' },
  { key: 'REPORTS', name: 'Operational Reports', label: 'Operational Reports', category: 'SYSTEM', description: 'Exportable muster books, wage registers, SLA compliance, and patrol logs.' },
  { key: 'WORKFLOW', name: 'BPM Workflow Engine', label: 'BPM Workflow Engine', category: 'SYSTEM', description: 'Dynamic process approval chains, step transitions, and escalations.' },
  { key: 'APPROVALS', name: 'Approval Inbox', label: 'Approval Inbox', category: 'SYSTEM', description: 'Unified multi-tier pending approvals for leaves, requisitions, and muster.' },
  { key: 'APPROVAL_MANAGEMENT', name: 'Approval Governance', label: 'Approval Governance', category: 'SYSTEM', description: 'Delegation matrix, multi-level signature rules, and audit signoffs.' },
  { key: 'AI', name: 'AI Intelligence Suite', label: 'AI Intelligence Suite', category: 'SYSTEM', description: 'Document OCR muster parsing, automated shift matching, and anomaly alerts.' },
  { key: 'BPM', name: 'Process Escalations', label: 'Process Escalations', category: 'SYSTEM', description: 'Breach notifications, auto-reassignments, and SLA countdowns.' },
  { key: 'COMPANY_MANAGEMENT', name: 'Tenant Hierarchy', label: 'Tenant Hierarchy', category: 'SYSTEM', description: 'Multi-branch corporate structure, region divisions, and global policies.' }
];

export * from './platform';
export * from './permissions';
export * from './bpm';
export * from './complianceControl';
export * from './complianceObligation';
export * from './documentLifecycle';
export * from './eam';
export * from './historicalTraceability';
export * from './operationalIntelligence';
export * from './risk';
export * from './scalability';
export * from './vendorRisk';
export * from './workforceCapacity';
export interface PoLineItem { [key: string]: any; }
export interface RfqRequest { [key: string]: any; }
export interface RfqBid { [key: string]: any; }
export type ServiceTicketCategory = string;
export interface InitStep { [key: string]: any; }
export type InventoryCategory = string;
export type InventoryUnit = string;
export type StockTransactionType = string;
export type PolicyModule = string;
export type ContractStatus = string;
export type BillingRateType = string;
export type SlaMeasurementType = string;
export type SlaSeverity = string;
export type AssetCategory = string;
export type EmployeeLifecycleStatus = string;
export type OnboardingTaskStatus = string;
export interface MaintenancePlan { [key: string]: any; }
export type PatrolGeofenceStatus = string;
export interface MaintenanceOccurrence { [key: string]: any; }






export interface LeaveLedgerEntry {
  id: string;
  companyId: string;
  employeeId: string;
  employeeName?: string;
  leaveCode: string;
  leaveName?: string;
  year: number;
  transactionType: 'PRO_RATA_OPENING' | 'ANNUAL_ACCRUAL' | 'MONTHLY_ACCRUAL' | 'LEAVE_DEBIT' | 'LEAVE_REVERSAL' | 'MANUAL_ADJUSTMENT' | 'ENCASHMENT' | 'CARRY_FORWARD';
  transactionDate: string;
  creditDays: number;
  debitDays: number;
  balanceBefore: number;
  balanceAfter: number;
  joiningDate?: string;
  proRataFactor?: number;
  annualEntitlement?: number;
  reason: string;
  referenceId?: string;
  createdBy?: string;
  createdAt: string;
}

export interface LeaveBalanceDetail {
  leaveCode?: string;
  leaveName?: string;
  openingBalance: number;
  accrued?: number;
  used: number;
  pending: number;
  adjusted: number;
  carriedForward: number;
  encashed: number;
  availableBalance?: number;
  isProRataApplied?: boolean;
  joiningDate?: string;
  proRataFactor?: number;
  proRataEntitlement?: number;
}

export interface LeaveRequestRecord {
  id: string;
  companyId: string;
  employeeId: string;
  employeeName?: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  daysCount: number;
  totalDays?: number;
  reason: string;
  status: 'PENDING' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'CANCELLED' | 'WITHDRAWN' | 'ACCEPTED';
  approvedBy?: string;
  rejectionReason?: string;
  appliedOn?: string;
  appliedAt?: string;
  createdAt?: string;
  updatedAt?: string;
  documents?: string[];
  [key: string]: any;
}

export interface LeavePolicyRecord {
  id: string;
  companyId: string;
  policyCode?: string;
  policyName?: string;
  leaveCode?: string;
  leaveName?: string;
  leaveType?: 'CASUAL' | 'SICK' | 'EARNED' | 'MATERNITY' | 'PATERNITY' | 'UNPAID' | 'COMP_OFF' | string;
  annualAllocation?: number;
  annualEntitlement?: number;
  carryForwardAllowed: boolean;
  maxCarryForward?: number;
  encashmentAllowed: boolean;
  minNoticeDays: number;
  applicableToGenders?: 'ALL' | 'MALE' | 'FEMALE';
  status: 'ACTIVE' | 'INACTIVE';
  [key: string]: any;
}

export interface LeaveBalanceRecord {
  id: string;
  companyId: string;
  employeeId: string;
  employeeName?: string;
  year: number;
  balances: LeaveBalanceDetail[];
  accrued?: Record<string, number>;
  used?: Record<string, number>;
  lastUpdated?: string;
  updatedAt?: string;
}

export interface AbsenceRegularizationRecord {
  id: string;
  companyId: string;
  employeeId: string;
  employeeName: string;
  date: string;
  reason: string;
  adjustmentType: 'MARK_PRESENT' | 'APPLY_LEAVE' | 'MARK_HALF_DAY';
  leaveType?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  approvedBy?: string;
  createdAt: string;
}

export interface HolidayRecord {
  id: string;
  companyId: string;
  name: string;
  date: string;
  type: 'MANDATORY' | 'RESTRICTED';
  applicableRegions: string[];
}


export interface SalaryStructureRecord {
  id: string;
  companyId: string;
  name: string;
  description?: string;
  basicPercentage: number; // e.g., 50 for 50% of gross
  hraPercentage: number; // e.g., 40 for 40% of basic
  pfPercentage: number; // e.g., 12 for 12% of basic
  esiPercentage: number; // e.g., 1.75
  status: 'ACTIVE' | 'INACTIVE';
}

export interface SalaryProfileRecord {
  id?: string;
  companyId: string;
  employeeId: string;
  structureId: string;
  baseMonthlySalary: number;
  effectiveDate?: string;
}

export interface PayrollCycleRecord {
  id: string;
  companyId: string;
  month: number;
  year: number;
  cycleLabel: string;
  status: 'DRAFT' | 'PROCESSING' | 'CALCULATED' | 'PENDING_APPROVAL' | 'APPROVED' | 'LOCKED' | 'DISBURSED';
  totalEmployees?: number;
  totalGrossPay?: number;
  totalDeductions?: number;
  totalNetPay?: number;
  createdAt?: string;
  processedAt?: string;
  processedBy?: string;
  processedByName?: string;
  approvedAt?: string;
  approvedBy?: string;
  approvedByName?: string;
}

export interface PayrollCalculation {
  payableDays: number;
  lopDays: number;
  totalGross: number;
  totalDeductions: number;
  netPay: number;
  isEpsExempt?: boolean;
  epsExemptionFlag?: string;
  earnings: {
    basic: number;
    hra: number;
    overtimePay: number;
    otherAllowances: number;
    reimbursements?: number;
    totalGross?: number;
  };
  deductions: {
    pf: number;
    esic: number;
    pt: number;
    tds: number;
    lopDeduction: number;
    advanceDeduction?: number;
    epsExemptionApplied?: boolean;
    epsExemptionNote?: string;
  };
}

export interface PayrollRecord {
  id: string;
  companyId: string;
  cycleId: string;
  employeeId: string;
  employeeName: string;
  month: number;
  year: number;
  status: 'CALCULATED' | 'LOCKED' | 'PAID';
  calculations: PayrollCalculation;
  createdAt?: string;
}
export * from './srm';
export * from './integration';
export * from './expense';
