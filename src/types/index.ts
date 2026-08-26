export type UserRole = 
  // --- Legacy Roles (Do Not Remove) ---
  | 'EMPLOYEE'
  | 'SUPERVISOR'
  | 'GUARD'
  | 'FIELD_OFFICER'
  | 'OPS_MANAGER'
  | 'HR_ADMIN'
  | 'FINANCE_MANAGER'
  | 'SAFETY_OFFICER'
  | 'TECHNICIAN'
  | 'COMPANY_ADMIN'
  | 'SUPER_ADMIN'
  // --- New Locked Hierarchy Roles ---
  | 'OWNER_PROMOTER'
  | 'DIRECTOR_CEO'
  | 'GENERAL_MANAGER'
  | 'REGIONAL_MANAGER'
  | 'AREA_MANAGER'
  | 'SITE_IN_CHARGE'
  | 'SKILLED'
  | 'SEMI_SKILLED'
  | 'SUPPORT'
  | 'HR'
  | 'FINANCE'
  | 'ADMIN'
  | 'PROCUREMENT'
  | 'EHS'
  | 'QUALITY'
  | 'COMMERCIAL'
  | 'MIS'
  | 'CLIENT_MANAGEMENT'
  | 'IT'
  | 'OPERATIONS_OFFICE';

export type WorkforceCategory = 
  | 'OFFICIAL_STAFF'
  | 'OPERATIONS';

export type SkillGrade = 
  | 'SKILLED'
  | 'SEMI_SKILLED'
  | 'SUPPORT';

export type DataScope = 
  | 'GLOBAL'
  | 'COMPANY'
  | 'REGION'
  | 'AREA'
  | 'BRANCH'
  | 'SITE'
  | 'SELF';

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

export type AccountStatus = 
  | 'ACTIVE'
  | 'PENDING_EMAIL_VERIFICATION'
  | 'PENDING_APPROVAL'
  | 'ADMIN_APPROVED'
  | 'HR_APPROVED'
  | 'REJECTED'
  | 'DISABLED';

export type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
export type ProvisioningSource = 'SUPER_ADMIN' | 'COMPANY_ADMIN' | 'SELF_SIGNUP';


// --- SaaS Subscription Models ---

export interface SubscriptionPlan {
  planId: string;
  planCode: string; // e.g. 'STARTER', 'PRO', 'ENTERPRISE'
  planName: string;
  description: string;
  isDeployable?: boolean;
  rosterBlockReason?: string;
  status: 'ACTIVE' | 'ARCHIVED';
  billingCycle: 'MONTHLY' | 'YEARLY' | 'CUSTOM';
  monthlyPrice: number;
  yearlyPrice: number;
  currency: string;
  employeeLimit: number;
  userLimit: number; // Admin users
  storageLimitMB: number;
  enabledModules: string[];
  trialEligible: boolean;
  trialDays: number;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
}

export type SubscriptionStatus = 
  | 'TRIAL' 
  | 'ACTIVE' 
  | 'PAST_DUE' 
  | 'EXPIRING_SOON' 
  | 'GRACE_PERIOD' 
  | 'EXPIRED' 
  | 'SUSPENDED' 
  | 'CANCELLED';

export interface CompanySubscription {
  subscriptionId: string;
  companyId: string;
  planId: string;
  status: SubscriptionStatus;
  billingCycle: 'MONTHLY' | 'YEARLY' | 'CUSTOM';
  startDate: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  renewalDate: string;
  trialStart?: string;
  trialEnd?: string;
  autoRenew: boolean;
  cancelAtPeriodEnd: boolean;
  cancelledAt?: string;
  cancellationReason?: string;
  gracePeriodEnd?: string;
  employeeLimit: number;
  userLimit: number;
  storageLimitMB: number;
  source: 'SYSTEM' | 'STRIPE' | 'RAZORPAY' | 'MANUAL';
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
}

export type PaymentStatus = 'PENDING' | 'SUCCESS' | 'FAILED' | 'REFUNDED' | 'PARTIALLY_REFUNDED' | 'CANCELLED';

export interface PaymentRecord {
  paymentId: string;
  companyId: string;
  subscriptionId: string;
  amount: number;
  currency: string;
  provider: 'STRIPE' | 'RAZORPAY' | 'MANUAL';
  providerPaymentId?: string;
  providerOrderId?: string;
  status: PaymentStatus;
  paymentMethod?: string;
  paidAt?: string;
  failureReason?: string;
  invoiceId?: string;
  createdAt: string;
  metadata?: Record<string, any>;
}

export interface InvoiceRecord {
  invoiceId: string;
  companyId: string;
  subscriptionId: string;
  paymentId: string;
  invoiceNumber: string;
  amount: number;
  tax: number;
  subtotal: number;
  total: number;
  currency: string;
  issueDate: string;
  dueDate: string;
  status: 'DRAFT' | 'OPEN' | 'PAID' | 'VOID' | 'UNCOLLECTIBLE';
  billingDetails: {
    legalName: string;
    billingAddress: string;
    gstin?: string;
    billingEmail: string;
    contactName: string;
  };
}

export interface ModuleEntitlement {
  id: string; // "companyId_moduleId"
  companyId: string;
  moduleId: string;
  enabled: boolean;
  source: 'PLAN' | 'CUSTOM' | 'PROMOTIONAL' | 'MANUAL' | 'SYSTEM';
  planId?: string;
  subscriptionId?: string;
  validFrom: string;
  validUntil?: string;
  limit?: number; // E.g., for specific modules if they have limits
  featureFlags?: Record<string, boolean>;
  overriddenBySuperAdmin: boolean;
  overrideReason?: string;
  updatedAt: string;
}

export interface CompanyBillingProfile {
  companyId: string;
  legalName: string;
  billingAddress: string;
  gstin?: string;
  billingEmail: string;
  contactName: string;
  updatedAt: string;
}

// ---------------------------------

export interface CompanyTenant {
  companyId: string; // e.g. "APEX-SEC-101"
  companyCode?: string; // Tenant alias/code
  companyLegalName: string; // e.g. "Apex Security Services Pvt Ltd"
  brandName: string;
  licenseTier: 'STARTER' | 'PROFESSIONAL' | 'ENTERPRISE';
  logoUrl?: string;
  websiteUrl?: string;
  portalSubdomain?: string;
  status: 'ACTIVE' | 'SUSPENDED' | 'TRIAL_EXPIRED';
  primaryColorHex: string;
  secondaryColorHex: string;
  allowedBranches: string[];
  maxEmployeesAllowed: number;
  maxSitesAllowed: number;
  enabledModules?: string[]; // Array of module keys
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  adminName?: string;
  adminEmail?: string;
  adminUid?: string;
  emailDeliveryStatus?: 'SENT' | 'FAILED' | 'PENDING';
  emailDeliveryError?: string | null;
  activationSentAt?: string;
  directActivationLink?: string;
  createdAt?: string;
  updatedAt?: string;
  cinNumber?: string;
  gstNumber?: string;
  name?: string;
  legalName?: string;
}

export type CompanyRecord = CompanyTenant;

export interface AppModule {
  key: string;
  name: string;
  description: string;
  category: 'CORE' | 'HRMS' | 'SECURITY' | 'FINANCE' | 'SYSTEM';
  icon: string;
}

export const MASTER_APP_MODULES: AppModule[] = [
  { key: 'DASHBOARD', name: 'Dashboard & Analytics', description: 'Central operational dashboard and KPI overview', category: 'CORE', icon: 'LayoutDashboard' },
  { key: 'EMPLOYEES', name: 'Employee Directory', description: 'Staff records, KYC documents, and profiles', category: 'HRMS', icon: 'Users' },
  { key: 'ATTENDANCE', name: 'Attendance & Roster', description: 'Real-time biometric/GPS punches and shift rosters', category: 'HRMS', icon: 'Clock' },
  { key: 'LEAVE', name: 'Leave Management', description: 'Leave requests, balances, and approvals', category: 'HRMS', icon: 'Calendar' },
  { key: 'PAYROLL', name: 'Payroll & Compensation', description: 'Salary processing, advances, and pay slips', category: 'FINANCE', icon: 'DollarSign' },
  { key: 'INVENTORY', name: 'Inventory & Stock', description: 'Equipment allocation and stock movements', category: 'CORE', icon: 'Package' },
  { key: 'ASSETS', name: 'Asset Tracking', description: 'Asset register, maintenance, and allocation', category: 'CORE', icon: 'HardDrive' },
  { key: 'BILLING', name: 'Client Billing & Invoices', description: 'Client invoicing, contracts, and payments', category: 'FINANCE', icon: 'Receipt' },
  { key: 'NOTIFICATIONS', name: 'Notifications & Alerts', description: 'Broadcast messages and push notifications', category: 'SYSTEM', icon: 'Bell' },
  { key: 'REPORTS', name: 'Reports & Analytics', description: 'Exportable operational and muster reports', category: 'CORE', icon: 'BarChart3' },
  { key: 'WORK_ORDERS', name: 'Work Orders & Tasks', description: 'Operations workflow dispatch and execution', category: 'CORE', icon: 'ListTodo' },
  { key: 'GUARD_PATROL', name: 'Guard Patrol Tour', description: 'Live guard tour tracking and route patrols', category: 'SECURITY', icon: 'ShieldCheck' },
  { key: 'QR_CHECKPOINTS', name: 'QR Checkpoints', description: 'QR code checkpoint scanning & verification', category: 'SECURITY', icon: 'QrCode' },
  { key: 'SECURITY_INCIDENTS', name: 'Security Incident Register', description: 'Real-time incident reporting and investigation', category: 'SECURITY', icon: 'AlertTriangle' },
  { key: 'VISITOR_GATE_PASS', name: 'Visitor Gate Pass', description: 'Visitor check-in/out and digital badges', category: 'SECURITY', icon: 'UserCheck' },
  { key: 'MATERIAL_GATE_PASS', name: 'Material Gate Pass', description: 'Inward/outward material movement gate passes', category: 'SECURITY', icon: 'Truck' },
  { key: 'DAILY_SITE_MUSTER', name: 'Daily Site Muster', description: 'Daily site logs, weather, and guard counts', category: 'SECURITY', icon: 'ClipboardList' },
  { key: 'ID_BADGES', name: 'Identity Badges', description: 'Employee identity card lifecycle and QR verification', category: 'HRMS', icon: 'IdCard' },
  { key: 'VENDOR_MANAGEMENT', name: 'Vendor & Contractor Management', description: 'Multi-vendor agency master, contract staff allocation, and contractor billing', category: 'HRMS', icon: 'Building' },
  { key: 'COMPLIANCE', name: 'Compliance & Audit', description: 'Regulatory compliance and statutory documents', category: 'SYSTEM', icon: 'CheckSquare' },
  { key: 'AUDIT_LOGS', name: 'System Audit Logs', description: 'Immutable trail of user and system actions', category: 'SYSTEM', icon: 'History' },
  { key: 'WORKFLOWS', name: 'Automated Workflows', description: 'Triggered notifications and automated tasks', category: 'SYSTEM', icon: 'Workflow' },
  { key: 'APPROVALS', name: 'Role Approvals', description: 'User registration approvals and role delegation', category: 'HRMS', icon: 'UserPlus' },
  { key: 'SAFETY_MANAGEMENT', name: 'Safety Management', description: 'Safety check sheets, PPE audits, and fire safety inspections', category: 'SECURITY', icon: 'ShieldAlert' }
];

export interface AppUpdateInfo {
  currentVersion: string;
  latestVersion: string;
  isMandatory: boolean;
  releaseNotes: string[];
  downloadUrl: string;
  releasedAt: string;
}

export interface UserSession {
  provisioningSource?: ProvisioningSource;
  userId: string;
  firebaseUid?: string;
  employeeId: string;
  fullName: string;
  email: string;
  role: UserRole;
  companyId: string;
  regionId?: string;
  assignedRegionId?: string;
  areaId?: string;
  assignedAreaId?: string;
  branchId: string;
  assignedBranchId?: string;
  assignedSiteId?: string;
  workforceCategory?: WorkforceCategory;
  authorityLevel?: AuthorityLevel;
  dataScope?: DataScope;
  avatarUrl?: string;
  token: string;
  tokenExpiresAt: number;
  isBiometricEnabled: boolean;
  lastActiveAt: number;
  loginMode: 'PASSWORD' | 'PIN' | 'BIOMETRIC' | 'GOOGLE';
  authMode?: 'FIREBASE_AUTH' | 'CUSTOM_TOKEN' | 'LEGACY_TRANSITIONAL';
  permissionsVersion?: number;
  accountStatus?: AccountStatus;
  emailVerified?: boolean;
  departmentId?: string;
  departmentName?: string;
  companyAdminApproval?: ApprovalStatus;
  hrApproval?: ApprovalStatus;
  mobileNumber?: string;
}

export interface ApprovalRequestRecord {
  provisioningSource?: ProvisioningSource;
  id: string;
  uid: string;
  fullName: string;
  email: string;
  mobileNumber?: string;
  companyId: string;
  companyName?: string;
  departmentId: string;
  departmentName: string;
  requestedRole?: UserRole;
  emailVerified?: boolean;
  employeeId?: string;
  companyAdminApproval: ApprovalStatus;
  companyAdminApprovedBy?: string;
  companyAdminApprovedAt?: string;
  hrApproval: ApprovalStatus;
  hrApprovedBy?: string;
  hrApprovedAt?: string;
  accountStatus?: AccountStatus;
  status?: 'PENDING' | 'APPROVED' | 'REJECTED';
  rejectionReason?: string;
  rejectedBy?: string;
  rejectedAt?: string;
  createdAt: string;
  updatedAt: string;

  // Lifecycle extension
  type?: 'ONBOARDING' | 'LIFECYCLE';
  context?: 'PROMOTION' | 'TRANSFER' | 'EXIT';
  details?: any;
}

export interface SuspiciousMusterPunch {
  id: string;
  companyId: string;
  siteId: string;
  employeeId: string;
  attendanceId?: string;
  shiftId?: string;
  punchType: 'PUNCH_IN' | 'PUNCH_OUT';
  punchTimestamp: string;
  detectedAt: string;
  anomalyType: 'GEOFENCE_VIOLATION' | 'SHIFT_MISMATCH' | 'RAPID_PUNCH' | 'DUPLICATE_PUNCH' | 'IMPOSSIBLE_SEQUENCE' | 'INACTIVE_EMPLOYEE' | 'DEVICE_TAMPERING';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  riskScore: number;
  evidence: string;
  status: 'DETECTED' | 'UNDER_REVIEW' | 'CONFIRMED_ANOMALY' | 'FALSE_POSITIVE' | 'RESOLVED';
  reviewedBy?: string;
  reviewedAt?: string;
  resolution?: string;
  correlationId?: string;
}

export interface AuditTrailRecord {
  id: string;
  companyId: string;
  actorId: string;
  actorEmployeeId?: string;
  actorRole?: string;
  regionId?: string;
  branchId?: string;
  siteId?: string;
  module: string;
  action: string;
  operation: string;
  entityType: string;
  entityId: string;
  timestamp: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  success: boolean;
  failureReason?: string;
  correlationId?: string;
  source: string;
  changeSummary?: string;
  metadata?: any;
}

export interface AuditLogRecord {
  id: string;
  companyId: string;
  actorId: string;
  actorName: string;
  action: string; // e.g. "SIGNUP", "ADMIN_APPROVED", "HR_APPROVED", "ACCOUNT_REJECTED", "SUPER_ADMIN_INITIALIZED"
  details: string;
  targetUser?: string;
  timestamp: string;
}

export interface SystemConfigRecord {
  superAdminInitialized: boolean;
  superAdminUid: string;
  superAdminEmail: string;
  initializedAt: string;
}

export interface OfflineQueueItem {
  id: string;
  actionType: 'PUNCH_IN' | 'PUNCH_OUT' | 'PATROL_CHECK' | 'PATROL_TOUR_LOG' | 'PATROL_PLAN' | 'PATROL_TOUR_START' | 'PATROL_SCAN' | 'PATROL_TOUR_SCAN' | 'PATROL_TOUR_COMPLETE' | 'PATROL_OVERRIDE' | 'INCIDENT_REPORT' | 'VISITOR_LOG' | 'VISITOR_CHECK_OUT' | 'MATERIAL_PASS' | 'MATERIAL_APPROVE' | 'CREATE_EMPLOYEE' | 'UPDATE_EMPLOYEE_STATUS' | 'CREATE_ROSTER' | 'DELETE_ROSTER' | 'SERVICE_TICKET_COMMENT' | 'SERVICE_TICKET_ATTACHMENT' | 'SERVICE_TICKET_STATUS_TRANSITION' | 'SERVICE_TICKET_FEEDBACK';
  payload: Record<string, unknown>;
  timestamp: number;
  status: 'PENDING' | 'SYNCED' | 'FAILED';
}

export type DocumentStatus = 
  | 'MISSING'
  | 'UPLOADED'
  | 'UNDER_VERIFICATION'
  | 'VERIFIED'
  | 'IN_PROGRESS'
  | 'EXPIRING_SOON'
  | 'EXPIRED'
  | 'RENEWAL_PENDING'
  | 'RENEWED'
  | 'REJECTED';

export interface DocumentTypeConfig {
  id: string;
  companyId: string;
  name: string;
  code: string; // e.g., 'AADHAR', 'DRIVING_LICENSE'
  isMandatory: boolean;
  description?: string;
  expiryAlertThresholds: number[]; // days before expiry to alert, e.g., [90, 60, 30, 15, 7, 1]
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: string;
  updatedAt: string;
}

export interface EmployeeDocumentRecord {
  id: string;
  companyId: string;
  employeeId: string;
  documentTypeCode: string;
  documentNumber?: string;
  fileReference: string; // Firebase Storage Path
  fileUrl?: string; // Temporary download URL
  issueDate?: string;
  expiryDate?: string;
  status: DocumentStatus;
  
  verificationStatus: 'PENDING' | 'VERIFIED'
  | 'IN_PROGRESS' | 'REJECTED';
  verifiedBy?: string;
  verifiedByName?: string;
  verifiedAt?: string;
  
  uploadedBy: string;
  uploadedByName: string;
  
  remarks?: string;
  rejectionReason?: string;
  
  previousDocumentId?: string; // Link to history
  isLatest: boolean;
  
  createdAt: string;
  updatedAt: string;
  
  // Alert Tracking
  lastAlertSentAt?: string;
  lastThresholdReached?: number;
}

export type EmployeeLifecycleStatus = 
  | 'APPLICANT'
  | 'OFFERED'
  | 'PRE_ONBOARDING'
  | 'ONBOARDING'
  | 'ACTIVE'
  | 'PROMOTION_PENDING'
  | 'TRANSFER_PENDING'
  | 'SUSPENDED'
  | 'EXIT_INITIATED'
  | 'EXIT_PENDING'
  | 'EXITED';

export type OnboardingTaskStatus = 'PENDING' |'IN_PROGRESS'| 'COMPLETED' | 'WAIVED' | 'OVERDUE';

export interface OnboardingTask {
  id: string;
  title: string;
  description?: string;
  status: OnboardingTaskStatus;
  isMandatory: boolean;
  assignedToRole?: UserRole;
  dueDate?: string;
  completedAt?: string;
  completedBy?: string;
  remarks?: string;
  waivedBy?: string;
  waiveReason?: string;
}

export interface LifecycleHistoryRecord {
  id: string;
  type: 'STATUS_CHANGE' | 'PROMOTION' | 'TRANSFER' | 'EXIT' | 'ONBOARDING_TASK';
  fromStatus?: string;
  toStatus: string;
  effectiveDate: string;
  reason?: string;
  initiatedBy: string;
  approvedBy?: string;
  timestamp: string;
  details?: Record<string, any>;
}

export interface PromotionRequest {
  id: string;
  employeeId: string;
  companyId: string;
  previousDesignation: string;
  newDesignation: string;
  previousDepartmentId: string;
  newDepartmentId: string;
  previousManagerId?: string;
  newManagerId?: string;
  effectiveDate: string;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  initiatedBy: string;
  approvedBy?: string;
  createdAt: string;
}

export interface TransferRequest {
  id: string;
  employeeId: string;
  companyId: string;
  previousSiteId: string;
  newSiteId: string;
  previousBranchId: string;
  newBranchId: string;
  previousRegionId: string;
  newRegionId: string;
  effectiveDate: string;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  initiatedBy: string;
  approvedBy?: string;
  createdAt: string;
}

export interface ExitRequest {
  id: string;
  employeeId: string;
  companyId: string;
  exitType: 'RESIGNATION' | 'TERMINATION' | 'RETIREMENT' | 'CONTRACT_END' | 'ABSCONDING' | 'OTHER';
  resignationDate?: string;
  lastWorkingDay: string;
  reason: string;
  remarks?: string;
  status: 'PENDING' | 'CLEARANCE' | 'APPROVED' | 'REJECTED';
  initiatedBy: string;
  approvedBy?: string;
  exitChecklist: OnboardingTask[];
  createdAt: string;
}

export interface EmployeeRecord {
  id: string; // Internal GUID
  employeeId: string; // Business ID (e.g. EMP1001)
  employeeCode?: string; // Additional code if needed
  companyId: string;
  authUid?: string; // Link to Firebase Auth
  
  firstName: string;
  middleName?: string;
  lastName: string;
  profilePictureUrl?: string;
  
  contactNumber: string;
  email?: string;
  
  maskedAadhaar?: string;
  panNumber?: string;
  dateOfBirth: string;
  gender: 'MALE' | 'FEMALE' | 'OTHER';
  bloodGroup: string;
  
  joinedDate: string;
  employmentType: 'PERMANENT' | 'CONTRACT' | 'TEMPORARY' | 'PROBATION';
  vendorId?: string; // If employmentType is CONTRACT
  status: 'ACTIVE' | 'PENDING_VERIFICATION' | 'SUSPENDED' | 'TERMINATED' | 'DEACTIVATED';
  lifecycleStatus: EmployeeLifecycleStatus;
  lmsComplianceStatus?: 'COMPLIANT' | 'NON_COMPLIANT' | 'PENDING_TRAINING' | 'EXPIRED';
  latestLmsCertExpiry?: string;
  convertedFromCandidateId?: string;
  onboardingTasks?: OnboardingTask[];
  
  assignedRegionId: string;
  assignedAreaId?: string;
  assignedBranchId: string;
  assignedSiteId: string;
  departmentId: string;
  designation: string;
  
  supervisorId?: string; // Reporting Supervisor
  reportingManagerId?: string; // Reporting Manager
  
  shiftId?: string;
  weeklyOff?: number[]; // [0-6]
  
  address?: string;
  emergencyContact: {
    name: string;
    relation: string;
    phone: string;
  };
  
  bankDetailsRef?: string;
  documentStatus?: 'COMPLETE' | 'INCOMPLETE' | 'PENDING_RENEWAL';
  
  workforceCategory?: WorkforceCategory;
  organizationalGrade?: string;
  skillGrade?: SkillGrade;
  authorityLevel?: AuthorityLevel;
  dataScope?: DataScope;
  role: UserRole;
  
  documents: EmployeeDocumentRecord[];
  pin?: string; // 4-6 digit security PIN
  hasSystemAccess?: boolean;
  invitationId?: string;
  invitationSentAt?: string;
  
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;

  // Final Settlement
  finalSettlementStatus?: 'PENDING' | 'SETTLED';
  finalSettlementAmount?: number;
  finalSettlementDate?: string;

}

export interface RegionRecord {
  id: string;
  companyId: string;
  name: string;
  code: string;
  managerId?: string;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt?: string;
}

export interface AreaRecord {
  id: string;
  companyId: string;
  regionId: string;
  name: string;
  code: string;
  managerId?: string;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt?: string;
}

export interface BranchRecord {
  id: string;
  companyId: string;
  name: string;
  code: string;
  city: string;
  address: string;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt?: string;
}

export interface VendorRecord {
  id: string;
  companyId: string;
  vendorName: string;
  vendorCode: string;
  serviceType: 'SECURITY_AGENCY' | 'HOUSEKEEPING' | 'MANPOWER' | 'TECHNICAL' | 'CATERING' | 'FACILITY_MANAGEMENT' | 'OTHER';
  gstinNumber?: string;
  panNumber?: string;
  contactPerson: string;
  contactPhone: string;
  contactEmail?: string;
  address?: string;
  contractStartDate?: string;
  contractEndDate?: string;
  status: 'ACTIVE' | 'INACTIVE';
  deployedStaffCount?: number;
  notes?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface SiteRecord {
  id: string;
  name: string;
  siteName?: string;
  companyId?: string;
  regionId?: string;
  assignedRegionId?: string;
  branchId: string;
  assignedBranchId?: string;
  clientName: string;
  address: string;
  status: 'ACTIVE' | 'INACTIVE';
  latitude?: number;
  longitude?: number;
  geofenceRadius?: number; // in meters
  geoFenceRadiusMeters?: number; // in meters
  geoCoordinates?: { latitude: number; longitude: number };
  geofenceEnabled?: boolean;
  accuracyThreshold?: number; // in meters
  attendanceMode?: 'STANDARD' | 'GEO_FENCE' | 'BIOMETRIC' | 'GEO_FENCE_AND_BIOMETRIC' | 'SUPERVISOR_MUSTER';
  createdAt?: string;
}

export interface DepartmentRecord {
  id: string;
  companyId: string;
  name: string;
  code: string;
  description?: string;
  createdAt?: string;
}

export interface DesignationRecord {
  id: string;
  companyId: string;
  title: string;
  level: string;
  createdAt?: string;
}

// --- Identity Badge Lifecycle ---

export type BadgeStatus = 
  | 'REQUESTED'
  | 'APPROVED'
  | 'ISSUED'
  | 'ACTIVE'
  | 'SUSPENDED'
  | 'LOST'
  | 'DAMAGED'
  | 'REPLACEMENT_REQUESTED'
  | 'RETURNED'
  | 'EXPIRED'
  | 'DEACTIVATED';

export type BadgeType = 'REGULAR' | 'TEMPORARY' | 'VISITOR' | 'CONTRACTOR';

export interface IdentityBadgeRecord {
  id: string;
  badgeNumber: string; // Unique Identifier
  employeeId: string;
  companyId: string;
  badgeType: BadgeType;
  status: BadgeStatus;
  
  issueDate: string;
  effectiveFrom: string;
  expiryDate: string;
  issuedBy: string; // User ID
  
  activatedDate?: string;
  deactivatedDate?: string;
  returnDate?: string;
  
  replacementReason?: string;
  lostDamagedReason?: string;
  
  qrIdentifier: string; // Secure secure non-sensitive identifier
  
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
}

export interface BadgeLifecycleEvent {
  id: string;
  badgeId: string;
  companyId: string;
  employeeId: string;
  action: string;
  fromStatus?: BadgeStatus;
  toStatus: BadgeStatus;
  actorId: string;
  actorName: string;
  reason?: string;
  timestamp: string;
  details?: Record<string, any>;
}

export interface UserMembershipRecord {
  userId: string;
  email: string;
  fullName: string;
  role: UserRole;
  companyId: string;
  employeeId?: string;
  siteId?: string;
  departmentId?: string;
  assignedRegionId?: string;
  assignedAreaId?: string;
  assignedBranchId?: string;
  assignedSiteId?: string;
  workforceCategory?: WorkforceCategory;
  authorityLevel?: AuthorityLevel;
  dataScope?: DataScope;
  status: 'ACTIVE' | 'SUSPENDED';
  assignedAt?: string;
  updatedAt?: string;
}

export interface ShiftRecord {
  id: string;
  companyId: string;
  shiftCode: string;
  shiftName: string;
  startTime: string; // HH:mm format, e.g. "08:00"
  endTime: string;   // HH:mm format, e.g. "16:00"
  shiftDurationMinutes: number;
  gracePeriodMinutes: number;
  lateThresholdMinutes: number;
  earlyDepartureThresholdMinutes: number;
  breakDurationMinutes: number;
  isCrossMidnight: boolean;
  minWorkMinutes: number;
  weeklyOffDays: number[]; // 0 = Sun, 1 = Mon, ..., 6 = Sat
  applicableSites?: string[];
  applicableDepartments?: string[];
  weeklyApplicability: number[]; // 0 = Sun, 1 = Mon, ..., 6 = Sat
  status: 'ACTIVE' | 'INACTIVE';
  createdBy: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
}

export type AttendanceStatus = 
  | 'SCHEDULED'
  | 'PRESENT'
  | 'LATE'
  | 'EARLY_DEPARTURE'
  | 'ABSENT'
  | 'HALF_DAY'
  | 'ON_LEAVE'
  | 'HOLIDAY'
  | 'WEEKLY_OFF'
  | 'MISSED_PUNCH'
  | 'PENDING_REGULARIZATION'
  | 'REGULARIZED';

export type AttendanceSource = 'EMPLOYEE' | 'SUPERVISOR' | 'ADMIN' | 'IMPORT' | 'SYSTEM';

export type OvertimeRoundingRule = 
  | 'EXACT' 
  | 'NEAREST_5' 
  | 'NEAREST_10' 
  | 'NEAREST_15' 
  | 'NEAREST_30' 
  | 'FLOOR_15' 
  | 'FLOOR_30' 
  | 'CEILING_15' 
  | 'CEILING_30';

export type LateCalculationMode = 'FROM_SHIFT_START' | 'FROM_GRACE_END';

export type OvertimeStatus = 
  | 'CALCULATED' 
  | 'PENDING_APPROVAL' 
  | 'APPROVED' 
  | 'REJECTED' 
  | 'ADJUSTED' 
  | 'CANCELLED';

export type AttendanceExceptionType = 
  | 'LATE' 
  | 'EARLY_DEPARTURE' 
  | 'LATE_AND_EARLY' 
  | 'MAX_DAILY_OT_EXCEEDED' 
  | 'MAX_WEEKLY_OT_EXCEEDED' 
  | 'MAX_MONTHLY_OT_EXCEEDED' 
  | 'MISSING_CHECK_IN' 
  | 'MISSING_CHECK_OUT' 
  | 'INVALID_PUNCH_ORDER' 
  | 'UNROSTERED_ATTENDANCE' 
  | 'SHORTFALL' 
  | 'INELIGIBLE_OVERTIME' 
  | 'REQUIRES_REVIEW'
  | 'NORMAL';

export interface OvertimePolicyRecord {
  id: string;
  companyId: string;
  policyName: string;
  isDefault: boolean;
  applicableSiteIds?: string[];
  applicableDepartmentIds?: string[];
  applicableWorkforceCategories?: WorkforceCategory[];
  applicableRoles?: UserRole[];
  gracePeriodMinutes: number;
  lateCalculationMode: LateCalculationMode;
  lateDeductionThresholdMinutes: number;
  earlyDepartureGraceMinutes: number;
  earlyDepartureThresholdMinutes: number;
  overtimeThresholdMinutes: number;
  overtimeRoundingRule: OvertimeRoundingRule;
  maxDailyOvertimeMinutes: number;
  maxWeeklyOvertimeMinutes: number;
  maxMonthlyOvertimeMinutes: number;
  requireApprovalForOvertime: boolean;
  autoApproveUnderMinutes?: number;
  includeBreakInWorkedTime: boolean;
  defaultBreakMinutes: number;
  allowCrossMidnight: boolean;
  eligibleForOvertime: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
}

export interface OvertimeRequestRecord {
  id: string;
  companyId: string;
  attendanceId: string;
  employeeId: string;
  employeeName: string;
  siteId: string;
  siteName: string;
  departmentId?: string;
  workDate: string; // YYYY-MM-DD
  shiftId: string;
  shiftName: string;
  shiftStart: string;
  shiftEnd: string;
  actualCheckIn?: string;
  actualCheckOut?: string;
  scheduledMinutes: number;
  workedMinutes: number;
  breakMinutes: number;
  netWorkedMinutes: number;
  rawOvertimeMinutes: number;
  roundedOvertimeMinutes: number;
  approvedOvertimeMinutes: number;
  status: OvertimeStatus;
  calculationBreakdown: string;
  reason?: string;
  exceptionFlags?: AttendanceExceptionType[];
  requestedBy: string;
  requestedByName: string;
  requestedAt: string;
  approvedBy?: string;
  approvedByName?: string;
  approvedAt?: string;
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface OvertimeAdjustmentRecord {
  id: string;
  companyId: string;
  overtimeRequestId?: string;
  attendanceId: string;
  employeeId: string;
  employeeName: string;
  workDate?: string;
  originalMinutes: number;
  requestedMinutes: number;
  adjustmentType: 'OVERTIME' | 'LATE' | 'EARLY_DEPARTURE' | 'WORKED_MINUTES';
  reason: string;
  status: 'PENDING' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED';
  requestedBy: string;
  requestedByName: string;
  requestedAt: string;
  approvedBy?: string;
  approvedByName?: string;
  approvedAt?: string;
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AttendanceCalculationResult {
  attendanceId: string;
  workDate: string;
  scheduledMinutes: number;
  workedMinutes: number;
  breakMinutes: number;
  netWorkedMinutes: number;
  lateMinutes: number;
  earlyDepartureMinutes: number;
  shortfallMinutes: number;
  rawOvertimeMinutes: number;
  calculatedOvertimeMinutes: number;
  approvedOvertimeMinutes: number;
  unapprovedOvertimeMinutes: number;
  status: AttendanceStatus;
  isEligibleForOvertime: boolean;
  exceptions: AttendanceExceptionType[];
  requiresReview: boolean;
  humanExplanation: string;
  breakdownSteps: string[];
}

export type GeoVerificationResult = 'WITHIN_GEOFENCE' | 'OUTSIDE_GEOFENCE' | 'LOCATION_UNAVAILABLE' | 'LOW_ACCURACY' | 'GEOFENCE_NOT_CONFIGURED';
export type BiometricVerificationResult = 'SUCCESS' | 'FAILED' | 'UNAVAILABLE' | 'NOT_REQUIRED';

export interface GeoVerificationData {
  latitude: number;
  longitude: number;
  accuracy?: number;
  distanceFromSite?: number;
  verification: GeoVerificationResult;
  timestamp: string;
  biometricVerification?: BiometricVerificationResult;
  suspiciousFlag?: string;
  geofenceOverrideRequested?: boolean;
  geofenceOverrideApproved?: boolean;
  geofenceOverrideReason?: string;
  geofenceOverrideApproverId?: string;
  geofenceOverrideApproverName?: string;
}

export interface AttendanceRecord {
  id: string;
  companyId: string;
  employeeId: string;
  employeeName: string;
  rosterId: string;
  shiftId: string;
  shiftName: string;
  siteId: string;
  siteName: string;
  attendanceDate: string; // YYYY-MM-DD
  checkIn?: string; // ISO string
  checkOut?: string; // ISO string
  status: AttendanceStatus;
  lateMinutes: number;
  earlyDepartureMinutes: number;
  workedMinutes: number;
  overtimeMinutes: number;
  scheduledMinutes?: number;
  breakMinutes?: number;
  netWorkedMinutes?: number;
  shortfallMinutes?: number;
  approvedOvertimeMinutes?: number;
  unapprovedOvertimeMinutes?: number;
  overtimeStatus?: OvertimeStatus;
  calculationExplanation?: string;
  exceptions?: AttendanceExceptionType[];
  requiresReview?: boolean;
  source: AttendanceSource;
  checkInGps?: GeoVerificationData;
  checkOutGps?: GeoVerificationData;
  deviceInfo?: string;
  remarks?: string;
  regularizationRequested?: boolean;
  regularizationReason?: string;
  regularizationDetails?: {
    originalStatus: AttendanceStatus;
    requestedStatus: AttendanceStatus;
    requestedCheckIn?: string;
    requestedCheckOut?: string;
  };
  approvedBy?: string;
  approvedByName?: string;
  approvedAt?: string;
  createdBy: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface PatrolCheckpointRecord {
  id: string;
  companyId: string;
  assignedRegionId?: string;
  assignedBranchId?: string;
  siteId: string;
  siteName?: string;
  checkpointName: string;
  code: string;
  qrCode: string;
  locationDescription?: string;
  sequenceOrder: number;
  gpsCoordinates?: { latitude: number; longitude: number };
  latitude?: number;
  longitude?: number;
  geofenceRadius?: number;
  geofenceRadiusMeters?: number;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt?: string;
  updatedAt?: string;
}

export type PatrolFrequency = 'HOURLY' | 'DAILY' | 'PER_SHIFT' | 'CUSTOM_INTERVAL';

export interface PatrolPlanRecord {
  id: string;
  companyId: string;
  assignedRegionId?: string;
  assignedBranchId?: string;
  siteId: string;
  siteName?: string;
  planName: string;
  description?: string;
  frequency: PatrolFrequency;
  intervalMinutes?: number;
  shiftId?: string;
  shiftName?: string;
  assignedRole?: string;
  assignedEmployeeIds?: string[];
  checkpointIds: string[]; // Ordered list of checkpoint IDs
  requireGeofence?: boolean;
  geofenceRequired?: boolean;
  enforceSequence?: boolean;
  strictSequenceEnforced?: boolean;
  minCompletionPercentage: number;
  status: 'ACTIVE' | 'INACTIVE';
  createdBy: string;
  createdByName?: string;
  createdAt: string;
  updatedAt: string;
}

export type PatrolVerificationMethod = 'QR_SCAN' | 'MANUAL_CODE' | 'NFC' | 'SUPERVISOR_VERIFIED';
export type PatrolScanStatus = 'COMPLETED' | 'LATE' | 'SKIPPED' | 'INVALID';
export type PatrolGeofenceStatus = 'WITHIN_GEOFENCE' | 'OUTSIDE_GEOFENCE' | 'LOW_ACCURACY' | 'NO_GPS' | 'GEOFENCE_NOT_CONFIGURED' | 'NO_GEOFENCE_DATA';

export interface PatrolTourCheckpointScan {
  checkpointId: string;
  checkpointName: string;
  code: string;
  sequenceOrder: number;
  scannedAt: string;
  scannedByUid: string;
  scannedByName: string;
  verificationMethod: PatrolVerificationMethod;
  gpsLatitude?: number;
  gpsLongitude?: number;
  gpsAccuracy?: number;
  gpsLocation?: { latitude: number; longitude: number; accuracy?: number };
  geofenceStatus: PatrolGeofenceStatus;
  distanceMeters?: number;
  distanceFromTargetMeters?: number;
  sequenceStatus: 'IN_SEQUENCE' | 'OUT_OF_SEQUENCE';
  outOfSequence?: boolean;
  outsideGeofence?: boolean;
  scanMethod?: string;
  status: PatrolScanStatus;
  notes?: string;
  remarks?: string;
  reportedIncidentId?: string;
}

export type PatrolTourStatus = 
  | 'SCHEDULED' 
  | 'ASSIGNED' 
  |'IN_PROGRESS'
  | 'COMPLETED' 
  | 'INCOMPLETE' 
  | 'MISSED' 
  | 'ABORTED' 
  | 'CANCELLED'
  | 'INTERRUPTED';

export interface PatrolTourRecord {
  id: string;
  tourNumber: string; // e.g. PTR-2026-0001
  patrolPlanId?: string;
  patrolPlanName?: string;
  companyId: string;
  assignedRegionId?: string;
  assignedBranchId?: string;
  siteId: string;
  siteName: string;
  shiftId?: string;
  shiftName?: string;
  assignedGuardId: string;
  assignedGuardName: string;
  scheduledStart?: string;
  scheduledEnd?: string;
  actualStart?: string;
  actualEnd?: string;
  status: PatrolTourStatus;
  totalCheckpoints: number;
  completedCheckpointsCount: number;
  completionPercentage: number;
  checkpointScans: PatrolTourCheckpointScan[];
  missedCheckpointIds: string[];
  exceptionsDetected: string[];
  enforceSequence?: boolean;
  strictSequenceEnforced?: boolean;
  isOverridden?: boolean;
  overrideReason?: string;
  overriddenByUid?: string;
  overriddenByName?: string;
  overriddenAt?: string;
  supervisorOverride?: {
    reason?: string;
    overriddenByUid?: string;
    overriddenByName?: string;
    overriddenAt?: string;
  };
  startGps?: { latitude: number; longitude: number; accuracy?: number };
  endGps?: { latitude: number; longitude: number; accuracy?: number };
  startGeofenceResult?: PatrolGeofenceStatus;
  remarks?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface PatrolLogRecord {
  id: string;
  companyId: string;
  assignedRegionId?: string;
  assignedBranchId?: string;
  siteId: string;
  siteName?: string;
  patrolName: string;
  guardId: string;
  guardName: string;
  startTime: string;
  endTime?: string;
  checkpointsVisited: string[]; // Checkpoint IDs
  totalCheckpoints: number;
  status: 'COMPLETED' | 'INCOMPLETE' | 'MISSED' | 'IN_PROGRESS';
  remarks?: string;
  gpsLocation?: { latitude: number; longitude: number };
  createdAt: string;
}

export type IncidentCategory = 
  | 'SECURITY_BREACH' 
  | 'FIRE_HAZARD' 
  | 'PROPERTY_DAMAGE' 
  | 'THEFT' 
  | 'MEDICAL' 
  | 'UNAUTHORIZED_ENTRY' 
  | 'ACCESS_CONTROL' 
  | 'EQUIPMENT_FAILURE' 
  | 'POLICY_VIOLATION' 
  | 'SAFETY' 
  | 'ASSET_LOSS'
  | 'OTHER';

export type IncidentSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type IncidentStatus = 
  | 'OPEN' 
  | 'REPORTED' 
  | 'ACKNOWLEDGED' 
  | 'UNDER_INVESTIGATION' 
  | 'INVESTIGATING' 
  | 'ACTION_REQUIRED' 
  | 'RESOLVED'
  | 'VERIFIED'
  | 'IN_PROGRESS' 
  | 'CLOSED'
  | 'REJECTED' 
  | 'CANCELLED' 
  | 'REOPENED'
  | 'ESCALATED' 
  | 'RECORDED';

export interface IncidentTimelineEvent {
  timestamp: string;
  actorId: string;
  actorName: string;
  action: string;
  notes?: string;
}

export interface IncidentReportRecord {
  id: string;
  companyId: string;
  incidentNumber?: string;
  assignedRegionId?: string;
  assignedBranchId?: string;
  siteId: string;
  siteName?: string;
  locationDescription?: string;
  reportedById: string;
  reportedByName: string;
  reportedAt: string;
  type?: 'INCIDENT' | 'COMPLAINT' | 'BBS_OBSERVATION' | 'ACCIDENT' | 'SAFETY_HAZARD';
  title: string;
  category: IncidentCategory;
  severity: IncidentSeverity;
  description: string;
  status: IncidentStatus;
  slaDeadline?: string;
  behaviorCategory?: string;
  
  // Investigation & Root Cause
  assignedInvestigatorId?: string;
  assignedInvestigatorName?: string;
  immediateAction?: string;
  rootCause?: string;
  correctiveAction?: string;
  preventiveAction?: string;
  actionTaken?: string;
  resolutionNotes?: string;
  
  // Resolution & Verification
  resolvedById?: string;
  resolvedByName?: string;
  resolvedAt?: string;
  verifiedById?: string;
  verifiedByName?: string;
  verifiedAt?: string;
  closedById?: string;
  closedByName?: string;
  closedAt?: string;
  
  // Operational Linkage
  relatedPatrolTourId?: string;
  relatedCheckpointId?: string;
  relatedWorkOrderId?: string;
  
  // Attachments & Coordinates
  photoUrls?: string[];
  gpsLocation?: { latitude: number; longitude: number };
  timeline?: IncidentTimelineEvent[];
  createdAt?: string;
  updatedAt?: string;

  // ==========================================
  // EAM LOSS/DAMAGE LINKAGE
  // ==========================================
  assetId?: string;
  custodianId?: string;
  lossDamageType?: 'LOST' | 'DAMAGED' | 'MISSING' | 'STOLEN';
  damageSeverity?: 'MINOR' | 'MODERATE' | 'SEVERE' | 'TOTAL_LOSS';
  estimatedImpactAmount?: number;
  recoveryStatus?: 'NOT_RECOVERED' | 'RECOVERY_REPORTED' | 'RECOVERY_VERIFIED';
  recoveredAt?: string;
  recoveredBy?: string;
  replacementAssetId?: string;
  eamResolution?: 'REPAIRED' | 'REPLACED' | 'RECOVERED' | 'WRITTEN_OFF' | 'UNRESOLVED';
}

export type VisitorType = 'CLIENT' | 'VENDOR' | 'CONTRACTOR' | 'CANDIDATE' | 'INTERVIEW_VISITOR' | 'DELIVERY' | 'SERVICE_TECHNICIAN' | 'GUEST' | 'OFFICIAL' | 'OTHER';
export type VisitorStatus = 'EXPECTED' | 'APPROVED' | 'CHECKED_IN' | 'CHECKED_OUT' | 'CANCELLED' | 'OVERSTAY' | 'REJECTED';

export interface VisitorLogRecord {
  id: string; // visitorId
  companyId: string;
  siteId: string;
  assignedRegionId?: string;
  assignedBranchId?: string;
  siteName?: string;
  
  visitorName: string;
  visitorPhone: string; // mobile
  visitorEmail?: string;
  visitorCompany?: string; // organization
  
  identificationType?: string;
  identificationReference?: string;
  photoUrl?: string;
  
  hostEmployeeId?: string;
  hostEmployeeName: string;
  hostDepartmentId?: string;
  
  purpose: string;
  visitType?: VisitorType;
  
  expectedDate?: string;
  expectedTime?: string;
  expectedDuration?: number; // in minutes
  
  checkInTime?: string; // actualCheckIn
  checkOutTime?: string; // actualCheckOut
  
  status: VisitorStatus;
  
  badgeNumber?: string; // passId
  vehicleNumber?: string;
  numberOfVisitors?: number;
  notes?: string;
  
  entryGateGuardId?: string; // checkedInBy
  checkoutGuardId?: string; // checkedOutBy
  badgeReturned?: boolean;
  checkoutNotes?: string;
  
  verifiedBy?: string;
  verifiedAt?: string;
  
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

export type HandoverStatus = 'DRAFT' | 'SUBMITTED' | 'ACKNOWLEDGED' | 'RETURNED' | 'CLOSED';
export type HandoverExceptionType = 'MISSING_INFO' | 'TASK_NOT_COMPLETED' | 'INCIDENT_UNRESOLVED' | 'VISITOR_ON_SITE' | 'EQUIPMENT_ISSUE' | 'PATROL_ISSUE' | 'SECURITY_CONCERN' | 'OTHER';

export interface ShiftHandoverException {
  type: HandoverExceptionType;
  description: string;
  referenceId?: string;
}

export interface ShiftHandoverRecord {
  id: string; // handoverId
  companyId: string;
  siteId: string;
  shiftId: string;
  
  outgoingEmployeeId: string;
  incomingEmployeeId?: string;
  
  outgoingShiftStart?: string;
  outgoingShiftEnd?: string;
  incomingShiftStart?: string;
  incomingShiftEnd?: string;
  
  status: HandoverStatus;
  
  summary: string;
  importantNotes?: string;
  
  openTasks?: string[];
  openIncidents?: string[];
  activeVisitors?: string[];
  pendingWorkOrders?: string[];
  
  criticalObservations?: string;
  exceptions?: ShiftHandoverException[];
  
  submittedAt?: string;
  acknowledgedAt?: string;
  acknowledgedBy?: string;
  closedAt?: string;
  
  returnReason?: string;
  
  createdAt: string;
  updatedAt?: string;
}

export interface MaterialMovementRecord {
  id: string;
  companyId: string;
  assignedRegionId?: string;
  assignedBranchId?: string;
  siteId: string;
  siteName?: string;
  movementType: 'INWARD' | 'OUTWARD';
  gatePassNumber: string;
  materialDescription: string;
  quantity: string;
  supplierVendorName: string;
  vehicleNumber: string;
  driverName: string;
  driverPhone: string;
  approvedById?: string;
  approvedByName?: string;
  status: 'PENDING_APPROVAL' | 'APPROVED' | 'DISPATCHED' | 'RECEIVED' | 'REJECTED';
  remarks?: string;
  createdAt: string;
  createdBy: string;
}

export interface DailySiteLogRecord {
  logType?: 'STANDARD' | 'INSPECTION' | 'HANDOVER';
  inspectorId?: string;
  checklistData?: any[];
  score?: number;
  outgoingSupervisorId?: string;
  incomingSupervisorId?: string;
  inventoryStatus?: any;
  notes?: string;
  id: string;
  companyId: string;
  assignedRegionId?: string;
  assignedBranchId?: string;
  siteId: string;
  siteName: string;
  date: string; // YYYY-MM-DD
  supervisorId: string;
  supervisorName: string;
  weatherCondition?: string;
  guardsCountOnDuty: number;
  totalPatrolsCompleted: number;
  totalVisitorsLogged: number;
  totalIncidentsReported: number;
  generalNotes?: string;
  createdAt: string;
  status?: 'DRAFT' | 'SUBMITTED' | 'VERIFIED'
  | 'IN_PROGRESS' | 'REVIEWED' | 'INITIATED' | 'ACCEPTED' | 'DISPUTED';
}

export interface LeaveRequestRecord {
  isHalfDay?: boolean;
  leaveTypeName?: string;
  id: string;
  companyId: string;
  employeeId: string;
  employeeName: string;
  departmentId?: string;
  leaveType: 'CASUAL' | 'SICK' | 'EARNED' | 'MATERNITY' | 'PATERNITY' | 'UNPAID' | 'COMP_OFF' | 'EMERGENCY';
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  daysCount: number;
  reason: string;
  contactDuringLeave?: string;
  handoverEmployeeId?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED' | 'WITHDRAWN' | 'PENDING_APPROVAL';
  appliedAt: string;
  approvedBy?: string;
  approvedByName?: string;
  approvedAt?: string;
  rejectionReason?: string;
  rejectedBy?: string;
  rejectedAt?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface LeaveBalanceRecord {
  id: string;
  companyId: string;
  employeeId: string;
  employeeName: string;
  year: number;
  balances?: LeaveBalanceDetail[];
  casualLeave?: { total: number; used: number; remaining: number };
  sickLeave?: { total: number; used: number; remaining: number };
  earnedLeave?: { total: number; used: number; remaining: number };
  unpaidLeave?: { used: number };
  updatedAt: string;
}

export interface SalaryStructureRecord {
  id: string;
  companyId: string;
  name: string;
  code: string;
  basicPercentage: number;
  hraPercentage: number;
  daPercentage: number;
  conveyanceAllowance: number;
  medicalAllowance: number;
  specialAllowance: number;
  pfApplicable: boolean;
  esicApplicable: boolean;
  ptApplicable: boolean;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: string;
}

export interface EmployeeSalaryProfileRecord {
  id: string;
  companyId: string;
  employeeId: string;
  employeeName: string;
  structureId: string;
  monthlyCtc: number;
  baseMonthlySalary: number;
  bankName: string;
  accountNumber: string;
  ifscCode: string;
  panNumber: string;
  uanNumber?: string;
  esicNumber?: string;
  paymentMode: 'BANK_TRANSFER' | 'CHEQUE' | 'CASH';
  updatedAt: string;
}

export interface SalaryAdvanceRecord {
  id: string;
  companyId: string;
  employeeId: string;
  employeeName: string;
  amount: number;
  reason: string;
  requestedDate: string;
  status: 'PENDING' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'RECOVERED';
  approvedBy?: string;
  approvedByName?: string;
  monthlyDeductionAmount: number;
  remainingAmount: number;
  createdAt: string;
}

export type InventoryCategory = 
  | 'UNIFORM' 
  | 'SAFETY_GEAR' 
  | 'SURVEILLANCE_EQUIPMENT' 
  | 'FIRE_SAFETY' 
  | 'COMMUNICATION' 
  | 'FIRST_AID' 
  | 'OFFICE_SUPPLIES' 
  | 'ACCESS_CARDS'
  | 'OTHER';

export type InventoryUnit = 'PCS' | 'PAIRS' | 'SETS' | 'BOXES' | 'METERS' | 'KG' | 'LITERS' | 'ROLLS';

export interface InventoryItemRecord {
  id: string;
  companyId: string;
  itemCode: string;
  itemName: string;
  category: InventoryCategory;
  subCategory?: string;
  description?: string;
  unit: InventoryUnit;
  serialTracking?: boolean;
  batchTracking?: boolean;
  
  currentStock: number;
  minStockThreshold: number;
  maxStockLimit?: number;
  reorderLevel?: number;
  criticalStockLevel?: number;
  thresholdEnabled?: boolean;
  notificationEnabled?: boolean;
  thresholdScope?: 'COMPANY' | 'LOCATION';
  
  unitCost: number;
  warehouseLocation?: string; 
  siteId?: string;
  siteName?: string;
  supplierVendorId?: string;
  supplierVendorName?: string;
  
  status: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK' | 'DISCONTINUED';
  active?: boolean;
  
  barcode?: string;
  isAssetTracked?: boolean;
  
  createdAt: string;
  createdBy?: string;
  updatedAt: string;
  updatedBy?: string;
}



export interface InventoryVendorRecord {
  id: string;
  companyId: string;
  vendorCode: string;
  vendorName: string;
  contactPerson: string;
  email: string;
  phone: string;
  address?: string;
  gstin?: string;
  categoriesSupplied?: InventoryCategory[];
  paymentTerms?: string;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: string;
  updatedAt: string;
}

export type AssetCategory = 
  | 'SECURITY_EQUIPMENT'
  | 'CCTV'
  | 'COMPUTER'
  | 'MOBILE_DEVICE'
  | 'FURNITURE'
  | 'ELECTRICAL_EQUIPMENT'
  | 'FIRE_SAFETY_EQUIPMENT'
  | 'VEHICLE'
  | 'TOOLS'
  | 'MACHINERY'
  | 'COMMUNICATION_EQUIPMENT'
  | 'UNIFORM_EQUIPMENT'
  | 'OTHER';

export type AssetStatus = 
  | 'AVAILABLE'
  | 'ASSIGNED'
  | 'DISPOSED'
  | 'RESERVED'
  | 'DEPLOYED'
  | 'IN_CUSTODY'
  | 'UNDER_MAINTENANCE'
  | 'LOST'
  | 'DAMAGED'
  | 'RETURNED'
  | 'RETIRED';

export type AssetCondition = 
  | 'NEW'
  | 'EXCELLENT'
  | 'POOR'
  | 'GOOD'
  | 'FAIR'
  | 'DAMAGED'
  | 'CRITICAL'
  | 'UNUSABLE';

export type AssetOwnershipType = 'OWNED' | 'LEASED' | 'CLIENT_PROVIDED';
export type AssetCriticality = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface AssetRecord {
  id: string; // assetId
  assetCode: string;
  companyId: string;
  regionId?: string;
  branchId?: string;
  siteId?: string;
  departmentId?: string;
  categoryId?: AssetCategory;
  category?: AssetCategory; // Keeping for backward compatibility temporarily
  subCategoryId?: string;
  assetName: string;
  description?: string;
  serialNumber?: string;
  modelNumber?: string;
  manufacturer?: string;
  brand?: string; // Keeping for backward compatibility
  model?: string; // Keeping for backward compatibility
  barcodeOrQr?: string;
  purchaseDate?: string;
  purchaseCost?: number;
  currentValue?: number;
  currentStatus: AssetStatus;
  status?: AssetStatus; // backward compat
  currentCustodianId?: string; 
  currentLocationId?: string;
  ownershipType?: AssetOwnershipType;
  condition: AssetCondition;
  criticality?: AssetCriticality;
  warrantyReference?: string;
  warrantyExpiryDate?: string;
  
  assignedEmployeeId?: string; // backward compat
  assignedEmployeeName?: string; // backward compat
  assignedDate?: string; // backward compat
  expectedReturnDate?: string; // backward compat
  siteName?: string; // backward compat
  warehouseLocation?: string; // backward compat
  lastAuditDate?: string;
  lastAuditedBy?: string;
  nextMaintenanceDate?: string;
  specifications?: string;
  notes?: string;

  createdBy?: string;
  createdAt: string;
  updatedBy?: string;
  updatedAt: string;
}

export type AssetMovementAction = 
  | 'CHECK_OUT' 
  | 'CHECK_IN' 
  | 'MAINTENANCE_OUT' 
  | 'MAINTENANCE_IN' 
  | 'SITE_TRANSFER' 
  | 'AUDIT_VERIFIED' 
  | 'DISPOSAL'
  | 'DEPLOYMENT'
  | 'ASSIGNMENT'
  | 'TRANSFER'
  | 'RETURN'
  | 'LOSS_REPORT'
  | 'DAMAGE_REPORT'
  | 'RETIREMENT';

export interface AssetMovementHistoryRecord {
  id: string;
  companyId: string;
  assetId: string;
  assetCode: string;
  assetName: string;
  action: AssetMovementAction;
  employeeId?: string;
  employeeName?: string;
  siteId?: string;
  siteName?: string;
  conditionAtAction: AssetCondition;
  performedByUid: string;
  performedByName: string;
  remarks?: string;
  timestamp: string;
  
  // New custody fields
  fromCustodianId?: string;
  toCustodianId?: string;
  fromLocationId?: string;
  toLocationId?: string;
  expectedReturnDate?: string;
  acknowledgementStatus?: 'PENDING' | 'ACCEPTED' | 'REJECTED';
  acknowledgementTimestamp?: string;
  evidenceUrls?: string[];
  reason?: string;
}

export type AssetMaintenanceType = 
  | 'PREVENTIVE_CALIBRATION' 
  | 'REPAIR' 
  | 'ANNUAL_AMC' 
  | 'PARTS_REPLACEMENT';

export interface AssetMaintenanceRecord {
  createdAt?: string;
  updatedAt?: string;
  id: string;
  companyId: string;
  assetId: string;
  assetCode: string;
  assetName: string;
  serviceVendor: string;
  serviceDate: string;
  serviceCost: number;
  serviceType: AssetMaintenanceType;
  issueDescription: string;
  actionTaken: string;
  nextServiceDate?: string;
  status: 'SCHEDULED' |'IN_PROGRESS'| 'COMPLETED' | 'CANCELLED';
  loggedByUid: string;
  loggedByName: string;
}

export interface PayrollCycleRecord {
  id: string; // e.g. "2026-08"
  companyId: string;
  month: number;
  year: number;
  cycleLabel: string;
  totalEmployees: number;
  totalGrossPay: number;
  totalDeductions: number;
  totalNetPay: number;
  status: 'DRAFT' | 'PROCESSING' | 'CALCULATED' | 'PENDING_APPROVAL' | 'APPROVED' | 'LOCKED' | 'CANCELLED' | 'DISBURSED';
  processedAt?: string;
  processedBy?: string;
  processedByName?: string;
  approvedAt?: string;
  lockedAt?: string;
  disbursedAt?: string;
  createdAt: string;
}

export interface StatutoryConfigRecord {
  id: string;
  companyId: string;
  type: 'PF' | 'ESIC' | 'PT' | 'TDS';
  version: string; // e.g. 'v1'
  effectiveDate: string; // YYYY-MM-DD
  status: 'ACTIVE' | 'ARCHIVED';
  
  // For PF
  pfEmployerShare?: number;
  pfEmployeeShare?: number;
  pfWageLimit?: number;
  
  // For ESIC
  esicEmployerShare?: number;
  esicEmployeeShare?: number;
  esicWageLimit?: number;
  
  // For PT (Configured by State typically, we can store slabs)
  ptState?: string;
  ptSlabs?: { min: number, max: number, amount: number, gender?: string }[];
  
  // For TDS (Simplified tax brackets/slabs)
  tdsRegime?: string;
  tdsSlabs?: { min: number, max: number, percentage: number }[];
  
  createdBy: string;
  createdAt: string;
}

export interface SalarySlipRecord {
  id: string;
  companyId: string;
  payrollCycleId: string;
  month: number;
  year: number;
  employeeId: string;
  employeeName: string;
  employeeCode?: string;
  departmentName?: string;
  designation?: string;
  dateOfJoining?: string;
  bankName?: string;
  accountNumber?: string;
  ifscCode?: string;
  panNumber?: string;
  uanNumber?: string;
  pfNumber?: string;
  esicNumber?: string;
  totalMonthDays: number;
  workedDays: number;
  paidLeaveDays: number;
  lopDays: number;
  payableDays: number;
  overtimeHours?: number;
  earnings: {
    basic: number;
    hra: number;
    da: number;
    conveyance: number;
    medical: number;
    specialAllowance: number;
    overtimePay: number;
    bonus: number;
    totalGross: number;
  };
  deductions: {
    pf: number;
    esic: number;
    pt: number;
    tds: number;
    advanceDeduction: number;
    lopDeduction: number;
    otherDeductions: number;
    totalDeductions: number;
  };
  netPay: number;
  netPayInWords: string;
  status: 'GENERATED' | 'APPROVED' | 'PUBLISHED' | 'PAID';
  isPublished?: boolean;
  publishedAt?: string;
  publishedBy?: string;
  downloadCount?: number;
  lastDownloadedAt?: string;
  verificationHash?: string;
  pdfUrl?: string;
  generatedAt: string;
  createdAt: string;
}

// ----------------------------------------------------
// NEFT / RTGS BANK PAYMENT BATCH & EXPORT TYPES
// ----------------------------------------------------

export type BankExportFormat = 
  | 'STANDARD_CSV' 
  | 'HDFC_CMS' 
  | 'SBI_CORP' 
  | 'ICICI_E_BANKING' 
  | 'KOTAK_CMS' 
  | 'AXIS_BULK'
  | 'PIPE_DELIMITED_TXT';

export type PaymentBatchMethod = 'NEFT' | 'RTGS' | 'AUTO';

export type PaymentBatchStatus = 
  | 'DRAFT'
  | 'VALIDATING'
  | 'VALIDATION_FAILED'
  | 'READY_FOR_APPROVAL'
  | 'APPROVED'
  | 'EXPORTED'
  | 'SUBMITTED'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED';

export interface CompanyBankAccountRecord {
  id: string;
  companyId: string;
  bankName: string;
  accountHolderName: string;
  accountNumber: string;
  maskedAccountNumber: string;
  ifscCode: string;
  branchName?: string;
  accountType: 'CURRENT' | 'OVERDRAFT' | 'SAVINGS';
  isDefault: boolean;
  status: 'ACTIVE' | 'INACTIVE';
  paymentReferencePrefix?: string;
  createdAt: string;
  updatedAt?: string;
  createdBy?: string;
}

export interface PaymentBatchItemRecord {
  id: string;
  salarySlipId: string;
  employeeId: string;
  employeeName: string;
  employeeCode?: string;
  departmentName?: string;
  designation?: string;
  bankName: string;
  accountNumber: string;
  maskedAccountNumber: string;
  ifscCode: string;
  netPay: number; // Authoritative from locked SalarySlipRecord
  paymentMethod: 'NEFT' | 'RTGS';
  paymentReference: string;
  validationStatus: 'VALID' | 'INVALID';
  validationErrors: string[];
  isEligible: boolean;
}

export interface PaymentBatchValidationSummary {
  totalItems: number;
  totalValid: number;
  totalInvalid: number;
  totalAmount: number;
  isValid: boolean;
  errors: string[];
  warnings: string[];
  validatedAt: string;
}

export interface PaymentBatchRecord {
  id: string;
  batchNumber: string; // e.g. "BATCH-2026-08-NEFT-001"
  companyId: string;
  payrollCycleId: string;
  month: number;
  year: number;
  payrollCycleLabel: string;
  paymentMethod: PaymentBatchMethod;
  companyBankAccountId?: string;
  companyBankName?: string;
  companyMaskedAccount?: string;
  debitAccountReference?: string;
  beneficiaryCount: number;
  validBeneficiaryCount: number;
  totalAmount: number; // Exact sum of valid items
  currency: string; // 'INR'
  status: PaymentBatchStatus;
  items: PaymentBatchItemRecord[];
  validationSummary?: PaymentBatchValidationSummary;
  rejectionReason?: string;
  cancellationReason?: string;
  
  // Lifecycle timestamps & actors
  createdBy: string;
  createdByName: string;
  createdAt: string;
  
  validatedAt?: string;
  
  approvedBy?: string;
  approvedByName?: string;
  approvedAt?: string;
  
  exportedBy?: string;
  exportedByName?: string;
  exportedAt?: string;
  exportCount: number;
  exportVersion: number;
  lastExportFormat?: BankExportFormat;
  lastExportFileName?: string;
  
  updatedAt: string;
}

export interface BankExportFileResult {
  fileName: string;
  fileContent: string;
  mimeType: string;
  format: BankExportFormat;
  recordCount: number;
  totalAmount: number;
  generatedAt: string;
  batchNumber: string;
  checksum?: string;
}

export type PhaseAScreen = 
  | 'SPLASH'
  | 'LANDING'
  | 'UPDATE_CHECKER'
  | 'COMPANY_CODE'
  | 'LOGIN'
  | 'SIGN_UP'
  | 'APPROVAL_PENDING'
  | 'APPROVAL_MANAGEMENT'
  | 'FORGOT_PASSWORD'
  | 'SESSION_LOCK'
  | 'ENTERPRISE_DASHBOARD'
  | 'COMPANY_MANAGEMENT'
  | 'CLIENT_MANAGEMENT'
  | 'DEPLOYMENT_MANAGEMENT'
  | 'SHIFT_ROSTER'
  | 'EMPLOYEES'
  | 'ORG_CONTROL'
  | 'ATTENDANCE_SHIFTS'
  | 'LEAVE_MANAGEMENT'
  | 'PAYROLL_COMPENSATION'
  | 'INVENTORY_STOCK'
  | 'ASSET_TRACKING'
  | 'SITE_OPERATIONS'
  | 'REPORTS_ANALYTICS'
  | 'SECURITY_AUDIT'
  | 'PROFILE'
  | 'SETTINGS'
  | 'NOTIFICATIONS'
  | 'KOTLIN_CODE_VIEWER'
  | 'SUPER_ADMIN_DASHBOARD'
  | 'SUPER_ADMIN_COMPANIES' | 'SUPER_ADMIN_SUBSCRIPTIONS' | 'COMPANY_BILLING'
  | 'SUPER_ADMIN_CREATE_COMPANY'
  | 'SUPER_ADMIN_PENDING_APPROVALS'
  | 'SUPER_ADMIN_MODULES'
  | 'SUPER_ADMIN_LEADS'
  | 'LEGAL_POLICIES' | 'APPROVAL_CENTER'
  | 'TASK_MANAGEMENT'
  | 'ID_BADGES'
  | 'ANNOUNCEMENTS'
  | 'MY_TASKS'
  | 'WORK_ORDERS'
  | 'SERVICE_DESK'
  | 'TALENT_ACQUISITION'
  | 'TRAINING_LMS'
  | 'MANDATORY_REFRESHERS'
  | 'CERTIFICATION_TRACKING'
  | 'PROCUREMENT_SRM'
  | 'VENDOR_MANAGEMENT'
  | 'RFQ_MANAGEMENT'
  | 'PURCHASE_ORDERS'
  | 'THREE_WAY_MATCH'
  | 'SAFETY_MANAGEMENT'
  | 'COMPLIANCE'
  | 'DOCUMENT_LIFECYCLE'
  | 'OPERATIONAL_INTELLIGENCE'
  | 'WORKFORCE_CAPACITY'
  | 'CONFLICT_DETECTION'
  | 'HISTORICAL_TRACEABILITY'
  | 'SCALABILITY_ASSESSMENT'
  | 'BIOMETRIC_DEVICES'
  | 'DEVICE_INTEGRATION_HUB';

export * from './scalability';
export * from './biometric';

export type AppThemeMode = 'DARK' | 'LIGHT' | 'SYSTEM';

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: 'ALERT' | 'INFO' | 'SUCCESS' | 'WARNING';
  timestamp: string;
  isRead: boolean;
  roleScope?: UserRole[];
  actionRoute?: PhaseAScreen;
  siteId?: string;
}

export interface UserProfileData {
  phoneNumber: string;
  emergencyContact: string;
  bloodGroup: string;
  address: string;
  kycStatus: 'VERIFIED' | 'PENDING' | 'REJECTED';
  certifications: string[];
  joinedDate: string;
  shiftSchedule: string;
}

export interface AppSettings {
  themeMode: AppThemeMode;
  notificationsEnabled: boolean;
  biometricUnlock: boolean;
  hapticFeedback: boolean;
  offlineAutoSync: boolean;
  defaultView: 'MOBILE' | 'TABLET' | 'AUTO';
  language: string;
  gpsTrackingHighAccuracy: boolean;
}

export interface InitStep {
  id: string;
  label: string;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  detail?: string;
}


export const APP_MODULES = {
  COMPANY_MANAGEMENT: 'COMPANY_MANAGEMENT',
  CLIENTS: 'CLIENTS',
  DEPLOYMENTS: 'DEPLOYMENTS',
  SHIFT_ROSTER: 'SHIFT_ROSTER',
  APPROVAL_MANAGEMENT: 'APPROVAL_MANAGEMENT',
  SITE_OPERATIONS: 'SITE_OPERATIONS',
  COMPANY_BILLING: 'COMPANY_BILLING',
  EMPLOYEES: 'EMPLOYEES',
  ATTENDANCE: 'ATTENDANCE',
  SHIFTS: 'SHIFTS',
  LEAVE: 'LEAVE',
  PAYROLL: 'PAYROLL',
  INVENTORY: 'INVENTORY',
  ASSETS: 'ASSETS',
  BILLING: 'BILLING',
  REPORTS: 'REPORTS',
  ANALYTICS: 'ANALYTICS',
  VISITORS: 'VISITORS',
  GUARD_PATROL: 'GUARD_PATROL',
  SECURITY_INCIDENTS: 'SECURITY_INCIDENTS',
  SECURITY_AUDIT: 'SECURITY_AUDIT',
  ID_BADGES: 'ID_BADGES',
  COMPLIANCE: 'COMPLIANCE',
  WORK_ORDERS: 'WORK_ORDERS'
} as const;

export type AppModuleKey = keyof typeof APP_MODULES;

export type WorkOrderStatus = 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'DISPATCHED' | 'ACCEPTED' | 'IN_PROGRESS' | 'PAUSED' | 'COMPLETED' | 'VERIFIED'
  | 'IN_PROGRESS' | 'CLOSED' | 'CANCELLED' | 'REJECTED' | 'OVERDUE';
export type WorkOrderPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type LocationRequirementMode = 'NONE' | 'SITE_ONLY' | 'GEOFENCE_REQUIRED';

export interface WorkOrderChecklistItem {
  id: string;
  text: string;
  isCompleted: boolean;
  isRequired: boolean;
  completedAt?: string;
  completedBy?: string;
}

export interface WorkOrderActivity {
  id: string;
  action: string;
  status: WorkOrderStatus;
  timestamp: string;
  actorId: string;
  actorName: string;
  reason?: string;
  notes?: string;
}

export interface WorkOrderRecord {
  id: string; // Used as workOrderId
  companyId: string;
  regionId?: string;
  branchId?: string;
  siteId?: string;
  departmentId?: string;
  
  title: string;
  description: string;
  category: string;
  priority: WorkOrderPriority;
  status: WorkOrderStatus;
  
  requestedBy?: string;
  assignedTo?: string; // Employee ID
  assignedTeam?: string; // Team/Group ID

  // Schedule & Timestamps
  createdAt: string;
  scheduledStart?: string;
  scheduledEnd?: string;
  actualStart?: string;
  actualEnd?: string;
  dueAt?: string;
  closedAt?: string;
  
  // Execution
  completionPercentage?: number;
  checklist?: WorkOrderChecklistItem[];
  
  // Requirements
  locationRequirement: LocationRequirementMode;
  evidenceRequirement: boolean;
  approvalRequirement: boolean;
  
  // Status/Audit
  verificationStatus?: 'PENDING' | 'VERIFIED'
  | 'IN_PROGRESS' | 'REJECTED';
  closedBy?: string; // Actor ID
  createdBy: string; // Actor ID
  updatedBy: string; // Actor ID
  updatedAt: string;
  
  // Evidence references (URLs)
  evidenceUrls?: string[];
  
  // Timeline/Activity
  activityTimeline?: WorkOrderActivity[];
}

export interface TaskRecord {
  id: string;
  companyId: string;
  siteId?: string;
  siteName?: string;
  departmentTag?: string;
  assignedTo: string;
  assignedToName?: string;
  createdBy: string;
  createdByName?: string;
  title: string;
  description: string;
  priority?: 'URGENT' | 'HIGH' | 'MEDIUM' | 'LOW';
  dueDate?: string;
  slaDeadline?: string;
  checklist?: { id: string; text: string; done: boolean }[];
  completionNotes?: string;
  photoUrl?: string;
  status: 'TODO' |'IN_PROGRESS'| 'PENDING_VERIFICATION' | 'COMPLETED' | 'CANCELLED' | 'PENDING' | 'IN_REVIEW' | 'APPROVED' | 'REJECTED' | 'RESOLVED';
  createdAt: number;
  updatedAt: number;
}

export interface AnnouncementRecord {
  id: string;
  companyId: string;
  assignedRegionId?: string;
  assignedBranchId?: string;
  title?: string;
  category?: string;
  targetAudience: string;
  message: string;
  priority: 'NORMAL' | 'URGENT';
  isPinned?: boolean;
  createdBy: string;
  createdByName?: string;
  createdAt: number;
  expiresAt: number;
}

export interface DocumentRecord {
  id: string;
  companyId: string;
  departmentTag: string;
  title: string;
  documentUrl?: string;
  status: 'PENDING' | 'IN_REVIEW' | 'APPROVED' | 'REJECTED' | 'RESOLVED';
  createdBy: string;
  createdByName?: string;
  createdAt: number;
  updatedAt: number;
  payload?: any;
}

export interface KpiSnapshotRecord {
  id: string;
  companyId: string;
  date: string;
  totalActiveEmployees: number;
  openIncidents: number;
  totalSlaBreaches: number;
  activeSites: number;
  status: 'PUBLISHED';
  createdAt: number;
}


export type ClientContactType = 'COMMERCIAL' | 'OPERATIONS' | 'HR' | 'FINANCE' | 'EMERGENCY' | 'CONTRACT' | 'OTHER';

export interface ClientContactRecord {
  id: string; // contactId
  companyId: string;
  clientId: string;
  name: string;
  designation?: string;
  email: string;
  phone: string;
  department?: string;
  contactType: ClientContactType;
  primaryContact: boolean;
  active: boolean;
}

export interface ClientRecord {
  id: string; // clientId
  companyId: string;
  clientCode: string;
  legalName: string;
  displayName: string;
  clientType: 'CORPORATE' | 'GOVERNMENT' | 'INDUSTRIAL' | 'RESIDENTIAL' | 'INSTITUTIONAL' | 'OTHER';
  industry?: string;
  registrationDetails?: string; // e.g. GST
  billingAddress?: string;
  communicationDetails?: string;
  status: 'ACTIVE' | 'INACTIVE' | 'ONBOARDING' | 'CLOSED';
  notes?: string;
  createdByUid?: string;
  createdByName?: string;
  createdAt: string;
  updatedByUid?: string;
  updatedByName?: string;
  updatedAt: string;
  
  // Kept for backward compatibility if any
  primaryContactName?: string;
  primaryContactPhone?: string;
  primaryContactEmail?: string;
}

export type ContractStatus = 'DRAFT' | 'SUBMITTED' | 'UNDER_REVIEW' | 'APPROVED' | 'ACTIVE' | 'EXPIRING' | 'RENEWAL_PENDING' | 'RENEWED' | 'EXPIRED' | 'TERMINATED' | 'CLOSED';

export interface ContractSiteMapping {
  id: string; // mappingId
  companyId: string;
  contractId: string;
  clientId: string;
  siteId: string;
  serviceStartDate: string;
  serviceEndDate: string;
  scope?: string;
  active: boolean;
}

export interface ContractScopeRecord {
  id: string;
  contractId: string;
  companyId: string;
  serviceCategory: string; // E.g., SECURITY, CLEANING, MAINTENANCE
  description: string;
  frequency?: string;
  manpowerRequirement?: number;
  exclusions?: string;
  siteSpecificScope?: string;
}

export interface ContractAmendmentRecord {
  id: string;
  contractId: string;
  companyId: string;
  amendmentNumber: string;
  effectiveDate: string;
  changedFields: string;
  reason: string;
  approvedByUid?: string;
  approvedByName?: string;
  approvalDate?: string;
  documentUrl?: string;
  createdAt: string;
}

export interface ContractRecord {
  id: string; // contractId
  companyId: string;
  clientId: string;
  contractNumber: string;
  contractTitle: string;
  contractType: 'MASTER_SERVICES' | 'SITE_SPECIFIC' | 'SUBCONTRACT' | 'ONE_OFF';
  startDate: string;
  endDate: string;
  status: ContractStatus;
  scopeOfService?: string;
  termsAndConditions?: string;
  approvalWorkflow?: {
    currentApprovalTier: 'A2' | 'A1' | 'A0' | 'COMPLETED';
    approvalTrail: {
      tier: 'A2' | 'A1' | 'A0';
      approvedBy?: string;
      status: 'PENDING' | 'APPROVED' | 'REJECTED';
      timestamp?: string;
      comments?: string;
    }[];
  };
  pdfUrl?: string;
  version?: number;
  rfqId?: string;
  renewalType: 'AUTO' | 'MANUAL' | 'NON_RENEWABLE';
  noticePeriodDays?: number;
  
  // Commercials
  contractValue?: number;
  currency?: string;
  billingModel?: 'FIXED_MONTHLY' | 'PER_SHIFT' | 'HOURLY' | 'MILESTONE';
  billingCycle?: 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'ANNUALLY';
  taxConfiguration?: string;
  paymentTermsDays?: number;
  commercialEffectiveDate?: string;

  ownerUid?: string;
  ownerName?: string;
  
  createdByUid?: string;
  createdByName?: string;
  createdAt: string;
  updatedByUid?: string;
  updatedByName?: string;
  updatedAt: string;
  
  // Storage
  documentUrls?: string[];
}


export interface DeploymentRecord {
  id: string;
  companyId: string;
  employeeId: string;
  employeeName: string;
  siteId: string;
  siteName: string;
  clientId: string;
  clientName: string;
  startDate: string;
  endDate?: string;
  status: 'ACTIVE' | 'COMPLETED' | 'CANCELLED' | 'ON_HOLD';
  deploymentType: 'PERMANENT_POSTING' | 'TEMPORARY' | 'RELIEF';
  billingRateType: 'PER_SHIFT' | 'MONTHLY_FIXED' | 'HOURLY';
  billingRate: number;
  assignedShiftTypeId: string;
  approvedByUserId?: string;
  approvedAt?: string;
  endReason?: string;
  createdAt: string;
  updatedAt: string;
}

export type RosterStatus = 'DRAFT' | 'PUBLISHED' | 'CANCELLED' | 'COMPLETED' | 'SCHEDULED';

export interface RosterRecord {
  id: string;
  companyId: string;
  siteId: string;
  siteName: string;
  employeeId: string;
  employeeName: string;
  shiftId: string;
  shiftName: string;
  date: string; // YYYY-MM-DD
  rosterDate?: string; // For legacy compatibility during migration
  departmentId?: string;
  supervisorId?: string;
  status: RosterStatus;
  publishedAt?: string;
  publishedBy?: string;
  createdBy: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface DeploymentHistoryRecord {
  id: string;
  companyId: string;
  deploymentId: string;
  employeeId: string;
  action: 'SITE_TRANSFER' | 'RATE_CHANGE' | 'STATUS_CHANGE';
  previousValue: any;
  newValue: any;
  changedByUserId: string;
  changedAt: string;
  reason?: string;
}




// ============================================================================
// MODULE 14.1: VENDOR MANAGEMENT SYSTEM
// ============================================================================

export type VendorTier = 'TIER_1_PREFERRED' | 'TIER_2_APPROVED' | 'TIER_3_PROVISIONAL' | 'BLACKLISTED';
export type VendorStatus = 'DRAFT' | 'UNDER_REVIEW' | 'ACTIVE' | 'SUSPENDED' | 'INACTIVE';
export type VendorDocType = 'GST_CERTIFICATE' | 'PAN_CARD' | 'MSME_CERTIFICATE' | 'CANCELLED_CHEQUE' | 'PSARA_LICENSE' | 'ISO_CERTIFICATE';

export interface SrmVendorRecord {
  id: string; // vendorId
  companyId: string;
  businessName: string;
  legalEntityName: string;
  category: string;
  subCategories: string[];
  tier: VendorTier;
  status: VendorStatus;
  contactPerson: {
    name: string;
    phone: string;
    email: string;
  };
  billingAddress: string;
  bankDetails: {
    accountName: string;
    accountNumber: string;
    ifscCode: string;
    bankName: string;
  };
  taxDetails: {
    gstin: string;
    panNumber: string;
    msmeRegistrationNumber: string;
  };
  complianceScore: number;
  ratingAverage: number;
  creditPeriodDays: number;
  createdAt: string;
  updatedAt: string;
}

export interface VendorDocumentRecord {
  id: string; // docId
  companyId: string;
  vendorId: string;
  docType: VendorDocType;
  fileUrl: string;
  expiryDate?: string;
  verificationStatus: 'PENDING' | 'VERIFIED' | 'REJECTED';
  verifiedBy?: string;
  verifiedAt?: string;
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface VendorPerformanceLog {
  id: string; // logId
  companyId: string;
  vendorId: string;
  evaluationDate: string; // ISO
  onTimeDeliveryRate: number;
  qualityDefectRate: number;
  priceCompetitivenessScore: number;
  slaBreachCount: number;
  overallScore: number;
  evaluatedBy: string;
  createdAt: string;
}

// ============================================================================
// MODULE 13.3: MANDATORY REFRESHERS SYSTEM
// ============================================================================
export interface MandatoryRefresherConfig {
  id: string; // Internal GUID
  companyId: string;
  courseId: string; // Link to TrainingProgramRecord or Certification
  courseName: string;
  recurrenceIntervalMonths: number;
  gracePeriodDays: number;
  targetRoles: UserRole[]; // Which roles need this refresher
  blockingPolicy: 'WARN' | 'BLOCK_ROSTER' | 'MARK_NON_DEPLOYABLE';
  createdAt: string;
  updatedAt: string;
}

export type RefresherStatus = 'ACTIVE' | 'DUE_SOON' | 'IN_GRACE_PERIOD' | 'OVERDUE_LOCKED';

export interface RefresherCompletionRecord {
  completionDate: string; // ISO String
  certificateId?: string;
  trainerName?: string;
  score?: number;
}

export interface EmployeeRefresherStatus {
  id: string; // employeeId_courseId
  companyId: string;
  employeeId: string;
  employeeName: string;
  courseId: string;
  courseName: string;
  lastCompletedDate: string; // ISO String
  nextDueDate: string; // ISO String
  gracePeriodExpiryDate: string; // ISO String
  status: RefresherStatus;
  completionHistory: RefresherCompletionRecord[];
  createdAt: string;
  updatedAt: string;
}

export interface RefresherEnrollment {
  id: string;
  companyId: string;
  sessionId: string;
  courseId: string;
  employeeId: string;
  employeeName: string;
  attendanceStatus: 'PENDING' | 'ATTENDED' | 'MISSED';
  assessmentScore?: number;
  enrolledAt: string;
}

// ============================================================================
// MODULE 13: POINT 2 - CERTIFICATION EXPIRY TRACKING
// ============================================================================
export type CertificationStatus = 'ACTIVE' | 'EXPIRING_SOON' | 'EXPIRED' | 'RENEWED' | 'REVOKED';

export interface EmployeeCertificationRecord {
  id: string; // Internal GUID
  companyId: string;
  employeeId: string;
  employeeName: string;
  certificationName: string;
  certificationType: string;
  issuingAuthority: string;
  certificateNumber: string;
  issueDate: string; // ISO Date
  expiryDate?: string; // ISO Date
  isMandatory: boolean;
  status: CertificationStatus;
  documentUrl?: string;
  verificationStatus: 'PENDING' | 'VERIFIED' | 'REJECTED';
  verifiedBy?: string;
  verifiedAt?: string;
  siteId?: string;
  department?: string;
  designation?: string;
  previousCertificationId?: string; // For renewal chain
  renewedByCertificationId?: string; // Points to the new active certificate
  createdAt: string;
  updatedAt: string;
}


// ============================================================================
// MODULE 11: SERVICE MANAGEMENT / CLIENT HELPDESK
// ============================================================================
export type ServiceTicketPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type ServiceTicketStatus = 
  | 'NEW' 
  | 'OPEN' 
  | 'ASSIGNED' 
  | 'ACCEPTED' 
  | 'IN_PROGRESS' 
  | 'ON_HOLD' 
  | 'PENDING_CLIENT' 
  | 'RESOLVED' 
  | 'CLOSED' 
  | 'REOPENED' 
  | 'CANCELLED';

export interface TicketStatusHistoryRecord {
  id: string;
  ticketId: string;
  companyId: string;
  fromStatus: ServiceTicketStatus;
  toStatus: ServiceTicketStatus;
  changedAt: string;
  changedByUserId: string;
  changedByName: string;
  changedByRole?: string;
  reason?: string;
  notes?: string;
  pauseReason?: TicketSlaPauseReason;
  resolutionCategory?: string;
  resolutionSummary?: string;
  rootCause?: string;
  clientRating?: number;
  clientFeedbackNotes?: string;
  evidenceAttachmentIds?: string[];
  bpmWorkflowId?: string;
  bpmStatus?: 'PENDING' | 'APPROVED' | 'REJECTED';
  auditReference?: string;
}

export interface TicketStatusDefinition {
  status: ServiceTicketStatus;
  code: string;
  name: string;
  description: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  allowedTransitions: ServiceTicketStatus[];
  permittedRoles?: string[];
  requiresReason?: boolean;
  requiresResolutionDetails?: boolean;
  requiresPauseReason?: boolean;
  requiresReopenReason?: boolean;
  requiresCancellationReason?: boolean;
  requiresRating?: boolean;
  affectsSla?: 'START_RESPONSE' | 'PAUSE' | 'RESUME' | 'COMPLETE_RESOLUTION' | 'COMPLETE_LIFECYCLE' | 'RESET_RESOLUTION' | 'CANCEL';
}

export interface TicketStatusTransitionPayload {
  toStatus: ServiceTicketStatus;
  reason?: string;
  notes?: string;
  pauseReason?: TicketSlaPauseReason;
  resolutionCategory?: string;
  rootCause?: string;
  correctiveAction?: string;
  resolutionSummary?: string;
  clientRating?: number;
  clientFeedbackNotes?: string;
  evidenceAttachmentIds?: string[];
  linkedAttachmentIds?: string[];
  expectedCurrentStatus?: ServiceTicketStatus;
}

// ==========================================
// POINT 9: SERVICE TICKET RESOLUTION
// ==========================================
export type TicketVerificationStatus = 'PENDING_VERIFICATION' | 'VERIFIED' | 'REJECTED' | 'NOT_REQUIRED';
export type TicketVerificationResult = 'APPROVED' | 'REJECTED';

export interface ServiceTicketResolutionRecord {
  id: string; // e.g. res_1740000000_abc12
  ticketId: string;
  ticketNumber?: string;
  companyId: string;
  siteId?: string;
  siteName?: string;
  clientId?: string;
  clientName?: string;
  contractId?: string;
  resolutionSummary: string; // Detailed description of the resolution
  rootCause: string; // Root cause analysis (RCA)
  correctiveAction: string; // Corrective and preventive action (CAPA)
  resolutionCategory?: string;
  resolvedByUserId: string;
  resolvedByName: string;
  resolvedByRole?: string;
  resolutionTimestamp: string; // Authoritative ISO timestamp
  evidenceAttachmentIds?: string[]; // Point 7 attachment references
  evidenceUrls?: string[];
  resolutionCommentId?: string; // Point 6 comment reference
  isClientVisible: boolean; // default true
  internalNotes?: string; // confidential tech remarks
  verificationStatus: TicketVerificationStatus;
  verificationResult?: TicketVerificationResult;
  verifiedByUserId?: string;
  verifiedByName?: string;
  verifiedByRole?: string;
  verifiedAt?: string;
  verificationNotes?: string;
  rejectionReason?: string;
  reworkNotes?: string;
  rejectedByUserId?: string;
  rejectedByName?: string;
  rejectedAt?: string;
  slaResolutionStatus: TicketSlaStatus; // 'MET' | 'FAILED' | 'BREACHED'
  slaTargetDueTime: string;
  actualResolutionDurationMinutes: number;
  isSlaMet: boolean;
  bpmWorkflowId?: string;
  bpmStatus?: 'PENDING' | 'APPROVED' | 'REJECTED';
  status: 'ACTIVE' | 'SUPERSEDED' | 'REJECTED';
  auditReference?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SubmitResolutionPayload {
  resolutionSummary: string;
  rootCause: string;
  correctiveAction: string;
  resolutionCategory?: string;
  isClientVisible?: boolean;
  internalNotes?: string;
  evidenceAttachmentIds?: string[];
  resolutionComment?: string;
  requiresVerification?: boolean;
}

export interface VerifyResolutionPayload {
  resolutionId: string;
  verificationResult: TicketVerificationResult;
  verificationNotes?: string;
  rejectionReason?: string;
  reworkNotes?: string;
}

// ============================================================================
// MODULE 11 / POINT 10: SERVICE TICKET REOPEN
// ============================================================================

export type TicketReopenReasonCategory = 
  | 'ISSUE_RECURRED'
  | 'INCOMPLETE_RESOLUTION'
  | 'SECONDARY_SYMPTOM'
  | 'CLIENT_REJECTED'
  | 'QUALITY_FAILURE'
  | 'NEW_FINDING'
  | 'OTHER';

export interface TicketReopenRecord {
  id: string; // e.g. reopen_1740000000_abc12
  ticketId: string;
  ticketNumber?: string;
  companyId: string;
  siteId?: string;
  siteName?: string;
  clientId?: string;
  clientName?: string;
  contractId?: string;
  reasonCategory: TicketReopenReasonCategory;
  reason: string; // Detailed justification (min 5 chars)
  notes?: string; // Operational instructions
  previousStatus: ServiceTicketStatus;
  newStatus: ServiceTicketStatus; // 'REOPENED' | 'IN_PROGRESS' | 'ASSIGNED'
  previousResolutionId?: string; // Immutable link to prior resolution
  reopenedByUserId: string;
  reopenedByName: string;
  reopenedByRole: string;
  reopenedAt: string; // ISO string
  evidenceAttachmentIds?: string[];
  slaCycleNumber: number; // e.g. 2 for 2nd cycle
  slaRecalculationMode: 'NEW_CYCLE' | 'RESUME' | 'CUSTOM';
  previousSlaResolutionStatus?: TicketSlaStatus;
  previousSlaDueTime?: string;
  newSlaDueTime?: string;
  assignedToUserId?: string;
  assignedToName?: string;
  assignedTeam?: string;
  priorityAtReopen: ServiceTicketPriority;
  bpmWorkflowId?: string;
  bpmStatus?: 'PENDING' | 'APPROVED' | 'REJECTED' | 'AUTO_APPROVED';
  approvalNotes?: string;
  approvedByUserId?: string;
  approvedByName?: string;
  approvedAt?: string;
  status: 'ACTIVE' | 'CANCELLED' | 'SUPERSEDED';
  auditReference?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ReopenTicketPayload {
  reasonCategory: TicketReopenReasonCategory;
  reason: string;
  notes?: string;
  targetStatus?: ServiceTicketStatus; // 'REOPENED' | 'IN_PROGRESS' | 'ASSIGNED'
  assignedToUserId?: string;
  assignedToName?: string;
  assignedTeam?: string;
  updatedPriority?: ServiceTicketPriority;
  evidenceAttachmentIds?: string[];
  slaRecalculationMode?: 'NEW_CYCLE' | 'RESUME' | 'CUSTOM';
  customSlaTargetMinutes?: number;
  requireApproval?: boolean;
}

export interface TicketReopenEligibilityResult {
  isEligible: boolean;
  reason?: string;
  allowedTargetStatuses: ServiceTicketStatus[];
  reopenWindowDays: number;
  daysSinceClosure?: number;
  isWithinWindow: boolean;
  requiresApproval: boolean;
  previousResolutionId?: string;
  currentCycleCount: number;
}

// ============================================================================
// MODULE 11 / POINT 11: CLIENT FEEDBACK & CSAT
// ============================================================================

export type TicketFeedbackStatus = 
  | 'PENDING' 
  | 'REQUESTED' 
  | 'SUBMITTED' 
  | 'REVIEWED' 
  | 'CLOSED';

export type FeedbackSentiment = 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE';

export interface TicketFeedbackRatingBreakdown {
  overallRating: number; // 1 - 5 stars (Mandatory)
  timelinessScore?: number; // 1 - 5 stars
  technicianCompetenceScore?: number; // 1 - 5 stars
  communicationScore?: number; // 1 - 5 stars
  resolutionQualityScore?: number; // 1 - 5 stars
}

export interface TicketFeedbackRecord {
  id: string; // e.g. fb_1740000000_abc12
  ticketId: string;
  ticketNumber?: string;
  companyId: string;
  clientId?: string;
  clientName?: string;
  siteId?: string;
  siteName?: string;
  contractId?: string;
  contactId?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  
  rating: number; // 1 - 5 stars
  ratingBreakdown?: TicketFeedbackRatingBreakdown;
  comment: string;
  feedbackTags?: string[];
  sentiment?: FeedbackSentiment;
  isNegativeFeedback: boolean; // Flagged when rating <= 2 or dissatisfied
  
  // Follow-up requested by client
  followUpRequested?: boolean;
  followUpNotes?: string;
  followUpContactPreferred?: 'PHONE' | 'EMAIL';

  // Lifecycle
  status: TicketFeedbackStatus;
  resolutionId?: string;
  slaCycleNumber?: number;

  // Submitter details
  submittedByUserId: string;
  submittedByName: string;
  submittedByRole: string;
  submittedByEmail?: string;
  submittedAt: string; // ISO

  // Staff Review & Escalation Management
  reviewedByUserId?: string;
  reviewedByName?: string;
  reviewedAt?: string;
  reviewNotes?: string;
  actionTaken?: string;

  // Negative Feedback Escalation
  isEscalated?: boolean;
  escalatedAt?: string;
  escalatedToUserId?: string;
  escalatedToName?: string;
  escalationNotes?: string;
  escalationStatus?: 'OPEN' | 'INVESTIGATING' | 'ACTION_TAKEN' | 'RESOLVED' | 'CLOSED';

  // Governance
  auditReference?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SubmitClientFeedbackPayload {
  rating: number; // 1 - 5
  comment: string;
  ratingBreakdown?: TicketFeedbackRatingBreakdown;
  feedbackTags?: string[];
  followUpRequested?: boolean;
  followUpNotes?: string;
  followUpContactPreferred?: 'PHONE' | 'EMAIL';
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
}

export interface ReviewClientFeedbackPayload {
  reviewNotes: string;
  actionTaken?: string;
  closeEscalation?: boolean;
  newStatus?: 'REVIEWED' | 'CLOSED';
}

export interface RequestClientFeedbackPayload {
  recipientEmail?: string;
  recipientName?: string;
  customMessage?: string;
}

export interface TicketFeedbackEligibilityResult {
  isEligible: boolean;
  reason?: string;
  isWithinWindow: boolean;
  feedbackWindowDays: number;
  daysSinceResolution?: number;
  alreadySubmitted: boolean;
  feedbackId?: string;
  existingFeedback?: TicketFeedbackRecord;
  canRequestFeedback: boolean;
  canSubmitFeedback: boolean;
  canReviewFeedback: boolean;
}

// ============================================================================
// MODULE 11 / POINT 12: SATISFACTION SCORE & CSAT ANALYTICS
// ============================================================================

export interface SatisfactionScoreFilter {
  companyId: string;
  clientId?: string;
  siteId?: string;
  contractId?: string;
  category?: string;
  priority?: string;
  startDate?: string;
  endDate?: string;
  dateRangePreset?: 'ALL' | '7D' | '30D' | '90D' | 'YEAR' | 'CUSTOM';
  ticketStatus?: string;
  assignedToEmployeeId?: string;
  minRating?: number;
  maxRating?: number;
  isNegativeOnly?: boolean;
}

export interface SatisfactionDimensionScore {
  dimension: 'overall' | 'timeliness' | 'competence' | 'communication' | 'quality';
  label: string;
  averageScore: number; // 0.0 - 5.0
  responseCount: number;
  positivePercentage: number; // >= 4 stars %
}

export interface SatisfactionGroupMetric {
  id: string; // e.g. clientId, siteId, category, technicianId
  name: string; // Display label
  code?: string;
  totalResponses: number;
  averageScore: number; // 0.0 - 5.0
  positiveCount: number; // 4-5 stars
  neutralCount: number; // 3 stars
  negativeCount: number; // 1-2 stars
  satisfactionPercentage: number; // % positive
  escalationCount: number;
  avgTimelinessScore?: number;
  avgCompetenceScore?: number;
  avgCommunicationScore?: number;
  avgQualityScore?: number;
  slaComplianceRate?: number; // % SLA met on these tickets
  avgResolutionTimeHours?: number; // MTTR for this group
  totalTicketsCount?: number;
  feedbackResponseRate?: number; // feedback count / total resolved tickets * 100
}

export interface SatisfactionTrendPoint {
  periodKey: string; // e.g. "2026-08-01", "2026-W34", "2026-08"
  periodLabel: string; // e.g. "Aug 15", "Week 34", "August 2026"
  periodTimestamp: number;
  averageScore: number;
  totalResponses: number;
  positiveCount: number;
  neutralCount: number;
  negativeCount: number;
  satisfactionPercentage: number;
}

export interface SatisfactionScoreSummary {
  hasData: boolean;
  totalFeedbackRecords: number;
  totalResolvedTickets: number;
  surveyResponseRate: number; // percentage (0 - 100)
  overallAverageScore: number; // 0.0 - 5.0
  overallSatisfactionPercentage: number; // >= 4 stars %
  positiveCount: number; // 4-5 stars
  neutralCount: number; // 3 stars
  negativeCount: number; // 1-2 stars
  escalationCount: number;
  dimensionScores: {
    overall: SatisfactionDimensionScore;
    timeliness: SatisfactionDimensionScore;
    competence: SatisfactionDimensionScore;
    communication: SatisfactionDimensionScore;
    quality: SatisfactionDimensionScore;
  };
  byClient: SatisfactionGroupMetric[];
  bySite: SatisfactionGroupMetric[];
  byCategory: SatisfactionGroupMetric[];
  byPriority: SatisfactionGroupMetric[];
  byTechnician: SatisfactionGroupMetric[];
  trend: SatisfactionTrendPoint[];
  slaCorrelation: {
    slaMetAvgScore: number;
    slaBreachedAvgScore: number;
    slaMetResponsesCount: number;
    slaBreachedResponsesCount: number;
    avgResolutionHoursSatisfied: number; // MTTR when rating >= 4
    avgResolutionHoursDissatisfied: number; // MTTR when rating <= 2
    reopenRateSatisfiedPct: number; // % reopened when rating >= 4
    reopenRateDissatisfiedPct: number; // % reopened when rating <= 2
  };
  thresholdAlerts: {
    isCompanyBelowThreshold: boolean;
    configuredThreshold: number; // default 3.5
    underperformingClients: { clientId: string; clientName: string; averageScore: number; responseCount: number }[];
    underperformingSites: { siteId: string; siteName: string; averageScore: number; responseCount: number }[];
    underperformingCategories: { category: string; categoryName: string; averageScore: number; responseCount: number }[];
  };
  filterApplied: SatisfactionScoreFilter;
  calculatedAt: string; // ISO
}

export interface ServiceCsatSnapshotRecord {
  id: string;
  companyId: string;
  snapshotPeriod: string; // e.g. "2026-08", "DAILY_2026-08-20", "OVERALL"
  summary: SatisfactionScoreSummary;
  createdAt: string;
  createdBy: string;
}

export type ServiceTicketCategory = string; // Allows legacy codes + dynamic IDs

export interface TicketCategoryRecord {
  id: string;
  companyId: string;
  code: string;
  name: string;
  description?: string;
  parentId?: string; // For hierarchy
  isActive: boolean;
  displayOrder: number;
  applicableServiceTypes?: string[];
  applicableSiteIds?: string[];
  restrictedRoles?: string[]; // Roles allowed to use this
  defaultPriority?: string;
  slaReferenceId?: string;
  createdBy: string;
  createdAt: string;
  updatedBy: string;
  updatedAt: string;
}


export interface ServicePriorityConfigRecord {
  id: string; // Document ID (could be 'LOW', 'MEDIUM', etc.)
  companyId: string;
  name: string;
  code: string;
  severity: number; // e.g. 1 (Critical) to 4 (Low)
  description: string;
  ordering: number;
  isActive: boolean;
  dispatchImpact: 'HIGH' | 'NORMAL' | 'NONE';
  escalationImpact: 'ACCELERATED' | 'STANDARD' | 'NONE';
  requiresReasonToChange: boolean;
  restrictedRoles?: string[]; // Roles allowed to change to/from this priority
  slaTargetHours?: number; // Added for SLA calculation impact
  createdAt: string;
  updatedAt: string;
  updatedBy: string;
}

export type TicketSlaStatus = 'NOT_STARTED' | 'ACTIVE' | 'WARNING' | 'BREACHED' | 'PAUSED' | 'MET' | 'FAILED' | 'CANCELLED';
export type TicketSlaCoverageType = '24X7' | 'BUSINESS_HOURS' | 'CUSTOM';
export type TicketSlaPauseReason = 'WAITING_ON_CLIENT' | 'PENDING_PARTS' | 'THIRD_PARTY_DEPENDENCY' | 'SCHEDULED_MAINTENANCE' | 'OTHER';

export interface TicketSlaPauseRecord {
  id: string;
  ticketId: string;
  companyId: string;
  pausedAt: string;
  resumedAt?: string;
  pausedDurationMinutes?: number;
  reason: TicketSlaPauseReason;
  notes?: string;
  pausedByUserId: string;
  pausedByName: string;
  resumedByUserId?: string;
  resumedByName?: string;
}

export interface ServiceSlaPolicyRecord {
  id: string; // policy ID
  companyId: string;
  policyName: string;
  code: string;
  description: string;
  // Scope / Target criteria ('*' or undefined means all)
  clientId?: string;
  contractId?: string;
  siteId?: string;
  category?: string;
  priority?: ServiceTicketPriority | '*';
  // Target Durations
  responseTargetMinutes: number; // e.g. 30
  resolutionTargetMinutes: number; // e.g. 240
  warningThresholdPercentage: number; // e.g. 75 or 80 %
  // Operating Coverage
  coverageType: TicketSlaCoverageType;
  businessHoursStart?: string; // e.g. '09:00'
  businessHoursEnd?: string; // e.g. '18:00'
  businessDays?: number[]; // [1, 2, 3, 4, 5] (Mon-Fri)
  timezone?: string;
  // Escalation Integration
  escalationPolicyId?: string;
  escalateOnWarning?: boolean;
  escalateOnBreach?: boolean;
  escalationUserIds?: string[];
  // Lifecycle
  status: 'ACTIVE' | 'DRAFT' | 'INACTIVE';
  effectiveFrom: string;
  effectiveTo?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
}

export interface TicketPriorityHistoryRecord {
  id: string; // unique ID or timestamp based
  ticketId: string;
  companyId: string;
  previousPriority: ServiceTicketPriority | string;
  newPriority: ServiceTicketPriority | string;
  reason: string;
  changedByUserId: string;
  changedByName: string;
  timestamp: string; // ISO string
}

export interface TicketCommentRecord {
  id: string;
  ticketId: string;
  companyId: string;
  clientId?: string;
  siteId?: string;
  authorUserId: string;
  authorName: string;
  authorRole: string;
  comment: string;
  isInternalOnly: boolean;
  visibility?: 'INTERNAL' | 'CLIENT_VISIBLE';
  attachmentUrls?: string[];
  priorityHistory?: TicketPriorityHistoryRecord[];
  createdAt: string;
  updatedAt?: string;
  isEdited?: boolean;
  editedAt?: string;
  editedByUserId?: string;
  editedByName?: string;
  editHistory?: {
    text: string;
    editedAt: string;
    editedByUserId: string;
    editedByName?: string;
  }[];
  status?: 'ACTIVE' | 'ARCHIVED';
  archivedAt?: string;
  archivedByUserId?: string;
  archivedByName?: string;
  archiveReason?: string;
  auditReference?: string;
}

export type TicketEvidenceType = 
  | 'PHOTO' 
  | 'DOCUMENT' 
  | 'SERVICE_REPORT' 
  | 'INSPECTION' 
  | 'COMPLETION' 
  | 'CLIENT_DOCUMENT' 
  | 'OTHER';

export interface TicketAttachmentRecord {
  id: string;
  ticketId: string;
  companyId: string;
  siteId?: string;
  clientId?: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  storagePath: string;
  downloadUrl: string;
  uploadedByUserId: string;
  uploadedByName: string;
  uploadedByRole?: string;
  uploadedAt: string;
  createdAt: string;
  updatedAt?: string;
  visibility: 'CLIENT_VISIBLE' | 'INTERNAL';
  evidenceType: TicketEvidenceType;
  notes?: string;
  status: 'ACTIVE' | 'ARCHIVED';
  auditReference?: string;
  archivedAt?: string;
  archivedByUserId?: string;
  archivedByName?: string;
  archiveReason?: string;
  commentId?: string;
}

export interface ServiceTicketRecord {
  id: string;
  ticketNumber: string; // e.g. TKT-2026-001
  companyId: string;
  clientId: string;
  clientName: string;
  contactId?: string; // Client Contact
  contactName?: string;
  siteId: string;
  siteName: string;
  contractId?: string;
  title: string;
  description: string;
  category: ServiceTicketCategory;
  subCategoryId?: string;
  priority: ServiceTicketPriority;
  status: ServiceTicketStatus;
  source?: string; // channel/source
  reportedByUserId: string;
  reportedByName: string;
  reportedByEmail?: string;
  reportedByPhone?: string;
  assignedToUserId?: string;
  assignedToName?: string;
  assignedTeam?: string;
  
  // SLA Timers & Lifecycle Tracking
  slaPolicyId?: string;
  slaPolicyName?: string;
  responseTargetMinutes?: number;
  resolutionTargetMinutes?: number;
  responseDueTime?: string; // ISO timestamp
  respondedAt?: string; // ISO timestamp when first acknowledged/contacted
  respondedByUserId?: string;
  responseSlaStatus?: 'PENDING' | 'MET' | 'BREACHED';
  slaDueTime: string; // ISO string (resolution due time)
  resolutionDueTime?: string; // Explicit resolution due timestamp
  resolutionSlaStatus?: TicketSlaStatus;
  isSlaBreached: boolean;
  isResponseBreached?: boolean;
  isResolutionBreached?: boolean;
  totalPausedDurationMinutes?: number;
  lastPausedAt?: string;
  pauseHistory?: TicketSlaPauseRecord[];
  slaBreachRecorded?: boolean;
  slaWarningTriggered?: boolean;
  slaBreachTriggered?: boolean;
  escalatedAt?: string;
  escalationLevel?: number;
  escalationInstanceId?: string;

  resolutionSummary?: string;
  resolutionCategory?: string;
  rootCause?: string;
  correctiveAction?: string;
  activeResolutionId?: string;
  verificationStatus?: TicketVerificationStatus;
  verifiedAt?: string;
  verifiedByUserId?: string;
  verifiedByName?: string;
  rejectionReason?: string;
  reworkNotes?: string;
  resolvedAt?: string;
  resolvedByUserId?: string;
  closedAt?: string;
  clientRating?: number; // 1 - 5 stars
  clientFeedbackNotes?: string;
  feedbackStatus?: TicketFeedbackStatus;
  hasNegativeFeedback?: boolean;
  activeFeedbackId?: string;
  feedbackRequestedAt?: string;
  feedbackSubmittedAt?: string;
  feedbackEscalationStatus?: 'NONE' | 'ESCALATED' | 'REVIEWED' | 'CLOSED';
  feedbackReviewNotes?: string;
  previousStatus?: ServiceTicketStatus;
  lastStatusChangedAt?: string;
  lastStatusChangedByUserId?: string;
  lastStatusChangedByName?: string;
  statusChangeReason?: string;
  statusHistory?: TicketStatusHistoryRecord[];
  bpmWorkflowId?: string;
  bpmStatus?: 'PENDING' | 'APPROVED' | 'REJECTED';
  linkedIncidentId?: string;
  relatedRecordId?: string; // general related op record
  attachmentUrls?: string[];
  priorityHistory?: TicketPriorityHistoryRecord[];
  
  // Reopen Tracking & Multi-Cycle SLA
  reopenCount?: number;
  lastReopenedAt?: string;
  lastReopenedByUserId?: string;
  lastReopenedByName?: string;
  lastReopenedByRole?: string;
  activeReopenId?: string;
  slaCycleCount?: number; // 1 = initial cycle, 2 = 1st reopen, etc.
  historicalSlaCycles?: {
    cycleNumber: number;
    startedAt: string;
    endedAt?: string;
    dueTime: string;
    slaStatus: TicketSlaStatus;
    isMet: boolean;
    resolutionId?: string;
  }[];
  reopenHistory?: TicketReopenRecord[];

  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// MODULE 12: TALENT ACQUISITION & ONBOARDING (ATS)
// ============================================================================
export type RequisitionStatus = 
  | 'DRAFT' 
  | 'SUBMITTED' 
  | 'PENDING_APPROVAL' 
  | 'APPROVED' 
  | 'OPEN' 
  | 'ON_HOLD' 
  | 'CLOSED' 
  | 'CANCELLED' 
  | 'FILLED' 
  | 'REJECTED';
export type CandidateStage = 
  | 'REGISTERED'
  | 'APPLIED'
  | 'SCREENING'
  | 'SHORTLISTED'
  | 'INTERVIEW_SCHEDULED'
  | 'INTERVIEW_COMPLETED'
  | 'SELECTED'
  | 'OFFER_PREPARATION'
  | 'OFFER_EXTENDED'
  | 'OFFER_ACCEPTED'
  | 'BACKGROUND_VERIFICATION'
  | 'DOCUMENT_VERIFICATION'
  | 'READY_FOR_ONBOARDING'
  | 'ONBOARDING'
  | 'CONVERTED_TO_EMPLOYEE'
  | 'REJECTED'
  | 'ON_HOLD'
  | 'WITHDRAWN'
  | 'DISQUALIFIED'
  | 'VERIFICATION_FAILED';

export interface CandidateStatusHistory {
  stage: CandidateStage;
  changedBy: string;
  changedByName?: string;
  changedAt: string;
  reason?: string;
  sourceEvent?: string;
  notes?: string;
}

export type VerificationStatus = 'PENDING' | 'VERIFIED'
  | 'IN_PROGRESS' | 'FAILED' | 'EXEMPTED';

export interface JobRequisitionRecord {
  id: string;
  requisitionCode: string; // e.g. REQ-2026-012
  companyId: string;
  jobTitle: string;
  description?: string; // Detailed description
  departmentId: string;
  departmentName: string;
  siteId: string;
  siteName: string;
  designationId?: string;
  designationName?: string;
  
  // Capacity & Tracking
  openPositions: number;
  filledPositions: number;
  pipelineCount?: number;
  
  // Requirements
  employmentType: 'FULL_TIME' | 'PART_TIME' | 'CONTRACT' | 'TEMPORARY';
  workforceCategory: WorkforceCategory;
  shiftRequirement?: string;
  minExperienceYears: number;
  requiredQualifications?: string[];
  requiredSkills?: string[];
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  
  // Ownership
  hiringManagerId: string;
  hiringManagerName: string;
  recruiterId?: string;
  recruiterName?: string;
  
  // Financials
  salaryMinMonthly: number;
  salaryMaxMonthly: number;
  currency?: string;
  
  // Lifecycle
  status: RequisitionStatus;
  statusReason?: string;
  openingDate?: string;
  closingDate?: string;
  targetHiringDate: string;
  
  // BPM / Approval
  bpmInstanceId?: string;
  
  // Metadata
  createdByUserId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CandidateEducation {
  institution: string;
  degree: string;
  fieldOfStudy: string;
  startDate: string;
  endDate: string;
  percentage?: number;
  grade?: string;
}

export interface CandidateExperience {
  company: string;
  position: string;
  location?: string;
  startDate: string;
  endDate?: string; // Empty if current
  isCurrent: boolean;
  description?: string;
}

export interface CandidateCertification {
  title: string;
  issuingOrganization: string;
  issueDate: string;
  expiryDate?: string;
  credentialId?: string;
  credentialUrl?: string;
}

export type ScreeningDecision = 'SHORTLISTED' | 'REJECTED' | 'HOLD';
export type SelectionDecision = 'SELECTED' | 'REJECTED' | 'HOLD';

export type InterviewType = 'TECHNICAL' | 'HR' | 'MANAGERIAL' | 'FINAL' | 'GENERAL';
export type InterviewStatus = 'SCHEDULED' | 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';
export type InterviewDecision = 'SELECTED' | 'REJECTED' | 'FURTHER_REVIEW' | 'HOLD';

export interface InterviewEvaluationItem {
  criteria: string;
  rating: number; // 1-5
  comments?: string;
}

export interface InterviewRecord {
  id: string;
  companyId: string;
  candidateId: string;
  requisitionId: string;
  screeningId: string;
  interviewCode: string; // e.g. INT-1123
  type: InterviewType;
  interviewers: {
    userId: string;
    fullName: string;
  }[];
  scheduledAt: string; // ISO string
  durationMinutes: number;
  location?: string;
  meetingLink?: string;
  status: InterviewStatus;
  evaluation?: {
    items: InterviewEvaluationItem[];
    overallRating: number;
    notes?: string;
  };
  decision?: InterviewDecision;
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
  bpmInstanceId?: string;
}

export interface SelectionRecord {
  id: string;
  companyId: string;
  candidateId: string;
  requisitionId: string;
  screeningId?: string;
  interviewId?: string;
  selectionCode: string; // e.g. SEL-2026-101
  selectorId: string;
  selectorName: string;
  selectionDate: string;
  decision: SelectionDecision;
  rejectionReason?: string;
  notes?: string;
  approvalReference?: string;
  bpmInstanceId?: string;
  createdAt: string;
  updatedAt: string;
}

export type BgVerificationType = 'EMPLOYMENT' | 'EDUCATION' | 'IDENTITY' | 'ADDRESS' | 'REFERENCE' | 'OTHER' | 'AADHAAR' | 'POLICE';
export type BgVerificationStatus = 'REQUESTED' | 'ASSIGNED' | 'IN_PROGRESS' | 'EVIDENCE_SUBMITTED' | 'UNDER_REVIEW' | 'CLEARED' | 'FAILED' | 'CLARIFICATION_REQUIRED' | 'CLOSED';
export type BgVerificationResult = 'CLEARED' | 'FAILED' | 'PENDING' | 'CLARIFICATION_REQUIRED';

export interface BackgroundVerificationRecord {
  id: string;
  companyId: string;
  candidateId: string;
  selectionId: string;
  requisitionId: string;
  verificationCode: string; // e.g. BGV-2026-101
  type: BgVerificationType;
  consentStatus?: 'PENDING' | 'GRANTED' | 'REVOKED';
  consentTimestamp?: string;
  verificationMethod?: string;
  assignedVerifierId?: string;
  assignedVerifierName?: string;
  requestDate: string;
  dueDate: string;
  status: BgVerificationStatus;
  result: BgVerificationResult;
  findings?: string;
  notes?: string;
  evidenceReferences: {
    documentId: string;
    documentType: string;
    fileName: string;
    fileUrl: string;
    uploadedAt: string;
  }[];
  completionDate?: string;
  bpmInstanceId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ScreeningCriteriaResult {
  requirement: string;
  isMet: boolean;
  details?: string;
  type: 'QUALIFICATION' | 'SKILL' | 'EXPERIENCE' | 'OTHER';
}

export interface ScreeningRecord {
  id: string;
  companyId: string;
  candidateId: string;
  requisitionId: string;
  screeningCode: string; // e.g. SCR-9921
  screenerId: string;
  screenerName: string;
  screeningDate: string;
  decision: ScreeningDecision;
  rejectionReason?: string;
  notes?: string;
  criteriaResults: ScreeningCriteriaResult[];
  overallEligibilityScore?: number; // 0-100 percentage
  createdAt: string;
  updatedAt: string;
}

export interface CandidateRecord {
  id: string;
  applicationId: string; // Explicit Application ID
  candidateCode: string; // e.g. CAND-8841
  companyId: string;
  requisitionId?: string;
  jobTitleAppliedFor: string;
  fullName: string;
  gender: 'MALE' | 'FEMALE' | 'OTHER';
  dateOfBirth: string;
  phoneNumber: string;
  email: string; // Required for recruitment lifecycle
  currentAddress: string;
  permanentAddress?: string;
  qualification?: string;
  skills?: string[];
  education?: CandidateEducation[];
  experience?: CandidateExperience[];
  certifications?: CandidateCertification[];
  experienceYears: number;
  highestEducation: string;
  aadhaarNumber?: string;
  aadhaarVerificationStatus: VerificationStatus;
  panNumber?: string;
  policeVerificationStatus: VerificationStatus;
  policeStationName?: string;
  policeVerificationCertUrl?: string;
  previousEmployer?: string;
  expectedSalaryMonthly: number;
  offeredSalaryMonthly?: number;
  resumeUrl?: string; // Reference to Storage
  source?: string; // e.g. "Direct", "LinkedIn", "Referral"
  stage: CandidateStage;
  statusHistory?: CandidateStatusHistory[];
  interviewFeedback?: string;
  interviewerRating?: number; // 1-5
  rejectionReason?: string;
  convertedToEmployeeId?: string;
  onboardedAt?: string;
  siteId?: string;
  siteName?: string;
  availabilityDate?: string;
  noticePeriodDays?: number;
  profilePhotoUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CandidateRegistrationResult {
  success: boolean;
  candidateId?: string;
  isDuplicate?: boolean;
  error?: string;
}

// ----------------------------------------------------------------------------
// Candidate Document Verification Types (Module 12 / Point 10)
// ----------------------------------------------------------------------------

export type CandidateDocumentType = 
  | 'RESUME'
  | 'AADHAAR_CARD'
  | 'PAN_CARD'
  | 'VOTER_ID'
  | 'DRIVING_LICENSE'
  | 'PASSPORT'
  | 'POLICE_CLEARANCE'
  | 'EDUCATION_CERTIFICATE'
  | 'EXPERIENCE_LETTER'
  | 'PHOTOGRAPH'
  | 'BANK_PASSBOOK'
  | 'MEDICAL_FITNESS'
  | 'OTHER';

export type CandidateDocVerificationStatus = 
  | 'MISSING'
  | 'SUBMITTED'
  | 'UNDER_REVIEW'
  | 'VERIFIED'
  | 'REJECTED'
  | 'CORRECTION_REQUIRED'
  | 'RESUBMITTED';

export interface CandidateDocumentVersion {
  version: number;
  fileName: string;
  fileUrl: string;
  storagePath?: string;
  fileSize: number;
  fileType: string;
  uploadedAt: string;
  uploadedBy: string;
  status: CandidateDocVerificationStatus;
  rejectionReason?: string;
  correctionNotes?: string;
}

export interface CandidateDocumentRecord {
  id: string;
  companyId: string;
  candidateId: string;
  selectionId?: string;
  requisitionId?: string;
  documentType: CandidateDocumentType;
  documentName: string;
  isRequired: boolean;
  fileUrl?: string;
  storagePath?: string;
  fileName?: string;
  fileSize?: number;
  fileType?: string;
  status: CandidateDocVerificationStatus;
  version: number;
  history?: CandidateDocumentVersion[];
  submittedAt?: string;
  submittedBy?: string;
  verifiedAt?: string;
  verifiedBy?: string;
  rejectionReason?: string;
  correctionNotes?: string;
  expiryDate?: string; // YYYY-MM-DD
  isExpired?: boolean;
  metadata?: Record<string, any>;
  auditReference?: string;
  bpmInstanceId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CandidateDocumentChecklistItem {
  documentType: CandidateDocumentType;
  documentName: string;
  description: string;
  isRequired: boolean;
  hasExpiry: boolean;
  category: 'IDENTITY' | 'STATUTORY' | 'PROFESSIONAL' | 'FINANCIAL' | 'GENERAL';
}

export const STANDARD_CANDIDATE_DOCUMENTS: CandidateDocumentChecklistItem[] = [
  { documentType: 'RESUME', documentName: 'Resume / CV', description: 'Curriculum vitae detailing career and education', isRequired: true, hasExpiry: false, category: 'GENERAL' },
  { documentType: 'PHOTOGRAPH', documentName: 'Passport Size Photograph', description: 'Recent colour photo with clear face profile', isRequired: true, hasExpiry: false, category: 'GENERAL' },
  { documentType: 'AADHAAR_CARD', documentName: 'Aadhaar Card', description: 'UIDAI identity document for KYC verification', isRequired: true, hasExpiry: false, category: 'IDENTITY' },
  { documentType: 'PAN_CARD', documentName: 'PAN Card', description: 'Permanent Account Number card for statutory payroll and TDS', isRequired: true, hasExpiry: false, category: 'STATUTORY' },
  { documentType: 'POLICE_CLEARANCE', documentName: 'Police Verification / PCC', description: 'Police character verification certificate for PSARA compliance', isRequired: true, hasExpiry: true, category: 'STATUTORY' },
  { documentType: 'EDUCATION_CERTIFICATE', documentName: 'Highest Educational Certificate', description: 'Degree, diploma or matriculation passing certificate', isRequired: true, hasExpiry: false, category: 'PROFESSIONAL' },
  { documentType: 'EXPERIENCE_LETTER', documentName: 'Experience / Relieving Letter', description: 'Previous employer service or relieving letter', isRequired: false, hasExpiry: false, category: 'PROFESSIONAL' },
  { documentType: 'BANK_PASSBOOK', documentName: 'Bank Passbook / Cancelled Cheque', description: 'Salary account details with printed account number and IFSC', isRequired: true, hasExpiry: false, category: 'FINANCIAL' },
  { documentType: 'MEDICAL_FITNESS', documentName: 'Medical Fitness Certificate', description: 'Registered medical practitioner physical fitness declaration', isRequired: false, hasExpiry: true, category: 'STATUTORY' },
  { documentType: 'DRIVING_LICENSE', documentName: 'Driving License', description: 'Valid transport/motor driving license (if applicable)', isRequired: false, hasExpiry: true, category: 'IDENTITY' },
  { documentType: 'VOTER_ID', documentName: 'Voter Identity Card / EPIC', description: 'Election Commission of India identity document', isRequired: false, hasExpiry: false, category: 'IDENTITY' },
  { documentType: 'PASSPORT', documentName: 'Passport', description: 'Indian Republic passport copy', isRequired: false, hasExpiry: true, category: 'IDENTITY' },
  { documentType: 'OTHER', documentName: 'Other Supporting Document', description: 'Additional certifications, training letters, or affidavits', isRequired: false, hasExpiry: false, category: 'GENERAL' },
];

// ============================================================================
// MODULE 13: LEARNING & COMPLIANCE / LMS
// ============================================================================
export type TrainingCategory = 
  | 'PSARA_COMPLIANCE' 
  | 'FIRE_SAFETY_EVACUATION' 
  | 'INDUSTRIAL_FIRST_AID' 
  | 'CRISIS_EMERGENCY_RESPONSE' 
  | 'POSH_CODE_OF_CONDUCT' 
  | 'FACILITY_CLEANING_SOP' 
  | 'UNARMED_COMBAT_DEFENSE' 
  | 'SECURITY_EQUIPMENT_OPERATION';

export interface TrainingProgramRecord {
  id: string;
  programCode: string; // e.g. TRN-PSARA-01
  companyId: string;
  title: string;
  description: string;
  category: TrainingCategory;
  isMandatoryForPSARA: boolean;
  validityMonths: number; // e.g. 12 or 24 months before refresher needed
  durationHours: number;
  passScorePercentage: number;
  trainerName: string;
  trainerDesignation?: string;
  location: string;
  status: 'ACTIVE' | 'ARCHIVED';
  createdAt: string;
  updatedAt: string;
}


export interface TrainingSessionRecord {
  id: string;
  companyId: string;
  programId: string;
  trainerId?: string;
  trainerName: string;
  scheduledDate: string;
  startTime: string;
  endTime: string;
  location: string;
  maxParticipants: number;
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  createdAt: string;
  updatedAt: string;
}

export interface TrainingEnrollmentRecord {
  sessionId?: string;
  id: string;
  companyId: string;
  programId: string;
  programTitle: string;
  employeeId: string;
  employeeName: string;
  siteId: string;
  siteName?: string;
  enrollmentDate: string;
  scheduledDate: string;
  attendanceStatus: 'SCHEDULED' | 'PRESENT' | 'ABSENT';
  scoreObtained?: number;
  resultStatus: 'ENROLLED' |'IN_PROGRESS'| 'PASSED' | 'FAILED';
  certificateId?: string;
  certificateNumber?: string;
  certificateIssuedDate?: string;
  certificateExpiryDate?: string;
  notes?: string;
  evaluatedByUserId?: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// MODULE 14: PROCUREMENT & SOURCING / SRM
// ============================================================================
export type ProcurementStatus = 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'PO_ISSUED' | 'PARTIALLY_DELIVERED' | 'FULFILLED' | 'CANCELLED';
export type PurchaseOrderStatus = 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'ISSUED' | 'ISSUED_TO_VENDOR' | 'PARTIALLY_RECEIVED' | 'PARTIALLY_DELIVERED' | 'COMPLETED' | 'CANCELLED';

export interface RequisitionLineItem {
  itemId?: string;
  itemCode?: string;
  itemName: string;
  description?: string;
  unit: string; // e.g. PCS, METERS, BOXES, LITRES
  quantityRequested: number;
  estimatedUnitPrice: number;
  totalEstimatedAmount: number;
}

export interface ProcurementRequisitionRecord {
  id: string;
  prNumber: string; // e.g. PR-2026-004
  companyId: string;
  departmentId: string;
  departmentName: string;
  requestedByUserId: string;
  requestedByName: string;
  siteId: string;
  siteName: string;
  urgency: 'LOW' | 'NORMAL' | 'HIGH' | 'EMERGENCY';
  requiredByDate: string;
  justification: string;
  items: RequisitionLineItem[];
  totalEstimatedValue: number;
  status: ProcurementStatus;
  approvedByUserId?: string;
  approvedAt?: string;
  rejectionReason?: string;
  poId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PurchaseOrderLineItem {
  itemId?: string;
  itemName: string;
  description?: string;
  unit: string;
  uom?: string;
  quantityOrdered: number;
  quantity?: number;
  quantityReceived: number;
  unitPrice: number;
  taxPercent: number;
  gstRate?: number;
  totalAmount: number;
}

export interface PurchaseOrderRecord {
  id: string;
  poNumber: string; // e.g. PO-2026-0091
  companyId: string;
  prId?: string;
  vendorId: string;
  vendorName: string;
  vendorGstin?: string;
  shippingSiteId: string;
  shippingSiteName: string;
  deliveryAddress: string;
  orderDate: string;
  expectedDeliveryDate: string;
  paymentTerms: 'ADVANCE' | 'NET_15' | 'NET_30' | 'NET_45' | 'ON_DELIVERY';
  items: PurchaseOrderLineItem[];
  lineItems?: PurchaseOrderLineItem[];
  approvalWorkflow?: any;
  pdfUrl?: string;
  billingAddress?: string;
  subTotal?: number;
  totalTax?: number;
  vendorGst?: string;
  subtotal: number;
  taxAmount: number;
  grandTotal: number;
  status: PurchaseOrderStatus;
  authorizedByUserId: string;
  authorizedByName: string;
  termsAndConditions?: string;
  createdAt: string;
  updatedAt: string;
}

export interface GoodsReceiptNoteRecord {
  id: string;
  grnNumber: string; // e.g. GRN-2026-0034
  companyId: string;
  poId: string;
  poNumber: string;
  vendorId: string;
  vendorName: string;
  siteId: string;
  siteName: string;
  deliveryChallanNumber: string;
  receivedDate: string;
  receivedByUserId: string;
  receivedByName: string;
  vendorInvoiceNumber?: string;
  vendorInvoiceAmount?: number;
  itemsReceived: {
    itemName: string;
    unit: string;
    quantityOrdered: number;
    quantityReceived: number;
    quantityAccepted: number;
    quantityRejected: number;
    rejectionReason?: string;
  }[];
  inspectionNotes?: string;
  hasVariance: boolean;
  createdAt: string;
}


export type PoLineItem = PurchaseOrderLineItem;

export interface ThreeWayMatchRecord {
  id: string;
  companyId: string;
  poId: string;
  poNumber?: string;
  grnId: string;
  grnNumber?: string;
  vendorInvoiceNumber?: string;
  vendorInvoiceDate?: string;
  poTotalAmount?: number;
  grnAcceptedValue?: number;
  invoiceTotalAmount?: number;
  varianceAmount?: number;
  isMatched?: boolean;
  matchStatus: 'EXACT_MATCH' | 'TOLERANCE_ACCEPTED' | 'DISCREPANCY_FLAGGED' | 'RESOLVED' | 'PERFECT_MATCH' | 'TOLERANCE_PASSED' | 'VARIANCE_DETECTED' | 'MANUALLY_OVERRIDDEN' | 'REJECTED';
  flaggedReason?: string;
  reviewedByUserId?: string;
  approvedForPayment?: boolean;
  invoiceId?: string;
  vendorId?: string;
  toleranceConfigUsed?: { quantityTolerancePercent: number; priceTolerancePercent: number; maxAmountVarianceLimit: number; };
  lineItemMatches?: any[];
  createdAt?: string;
  updatedAt?: string;
}

// Missing Types & Interface Definitions
export type SensitiveDataCategory = 
  | 'IDENTITY_DOCUMENTS' 
  | 'SALARY_PAYROLL' 
  | 'STATUTORY_INFO' 
  | 'CONTACT_INFO' 
  | 'ATTENDANCE_LOCATION' 
  | 'CONTRACTS_COMMERCIAL' 
  | 'FINANCIAL_RECORDS' 
  | 'AUTH_SECURITY'
  | 'EMPLOYEE_PERSONAL'
  | 'SECURITY_AUDIT';

export type DataSensitivityLevel = 'PUBLIC' | 'INTERNAL' | 'CONFIDENTIAL' | 'RESTRICTED';

export type DataMaskingPattern = 'AADHAAR' | 'PAN' | 'BANK_ACCOUNT' | 'PHONE' | 'EMAIL' | 'SALARY' | 'GPS' | 'FULL_REDACT';

export interface SensitiveFieldDefinition {
  fieldKey: string;
  category: SensitiveDataCategory;
  sensitivityLevel: DataSensitivityLevel;
  maskingPattern: DataMaskingPattern;
  description: string;
  exemptRoles: UserRole[];
  exemptAuthorityLevels: AuthorityLevel[];
}

export interface SensitiveDataAccessContext {
  targetCompanyId: string;
  category: SensitiveDataCategory;
  targetSiteId?: string;
  targetEmployeeId?: string;
  resourceId?: string;
  resourceType?: string;
  fieldKey?: string;
  requestedAction?: string;
}

export interface SensitiveDataAccessResult {
  allowed: boolean;
  reason?: string;
  maskedData?: any;
  violatesTenant?: boolean;
  violatesSite?: boolean;
  violatesRole?: boolean;
  violatesScope?: boolean;
  requiresMasking?: boolean;
  maskingPattern?: DataMaskingPattern | string;
}

export type DetectedRiskStatus = 'DETECTED' | 'INVESTIGATING' | 'CONFIRMED' | 'RESOLVED' | 'DISMISSED' | 'CLOSED' | 'FALSE_POSITIVE' | 'INVESTIGATION' | 'REMEDIATION';

export interface DetectedRiskEvent {
  id: string;
  companyId: string;
  ruleId: string;
  ruleName: string;
  eventType: string;
  source?: string;
  userId?: string;
  userRole?: string;
  timestamp: string;
  severity: SecuritySeverity;
  evidence: string;
  description: string;
  status: DetectedRiskStatus;
  closureNotes?: string;
  closedAt?: string;
  investigationNotes?: string;
  remediation?: string;
  updatedAt: string;
}

export type ContractExpiryMilestone = 90 | 60 | 30 | 15 | 7 | 1 | 0;

export interface ContractExpiryEventRecord {
  id: string;
  companyId: string;
  contractId: string;
  contractTitle?: string;
  clientId?: string;
  clientName?: string;
  endDate?: string;
  expiryDate?: string;
  daysRemaining: number;
  milestone: ContractExpiryMilestone | number;
  status: 'PENDING_NOTIFICATION' | 'NOTIFIED' | 'ESCALATED' | 'RENEWED' | 'TERMINATED' | 'IGNORED';
  notifiedAt?: string;
  notificationId?: string;
  escalationId?: string;
  detectedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export type BulkOperationType = 
  | 'BULK_UPDATE' 
  | 'BULK_DELETE' 
  | 'BULK_ASSIGN' 
  | 'BULK_STATUS_CHANGE' 
  | 'BULK_PUBLISH' 
  | 'BULK_UNPUBLISH' 
  | 'BULK_APPROVE' 
  | 'BULK_REJECT' 
  | 'BULK_IMPORT'
  | 'EXPORT_BANK_TXT'
  | 'EXPORT_BANK_CMS_FILE'
  | 'EXPORT_CSV'
  | 'EXPORT_DOCX'
  | 'EXPORT_EXCEL'
  | 'EXPORT_JSON'
  | 'EXPORT_PDF'
  | 'EXPORT_ZIP';

export type ExportDataFormat = 'CSV' | 'EXCEL' | 'PDF' | 'JSON' | 'BANK_TXT' | 'ZIP' | 'DOCX' | 'BANK_CMS_FILE';

export type SensitiveDataClassification = 
  | 'PUBLIC' 
  | 'GENERAL_OPERATIONAL' 
  | 'EMPLOYEE_PII' 
  | 'PAYROLL_SALARY' 
  | 'BANK_DISBURSEMENT' 
  | 'STATUTORY_COMPLIANCE' 
  | 'CLIENT_CONTRACT' 
  | 'FINANCIAL_LEDGER'
  | 'OPERATIONS_SECURITY'
  | 'INVENTORY_SCM'
  | 'GENERAL';

export interface SecurityGovernanceConfig {
  companyId: string;
  businessHoursStart: number;
  businessHoursEnd: number;
  bulkWarningThreshold: number;
  exportWarningThreshold: number;
  sensitiveExportNotificationThreshold: SecuritySeverity | string;
  repeatedDownloadWindowMinutes: number;
  repeatedDownloadMaxCount: number;
  updatedAt?: string;
  updatedBy?: string;
}

export interface BulkAndExportAlertRecord {
  id: string;
  companyId: string;
  category: 'AFTER_HOURS_DOWNLOAD' | 'BULK_EDIT' | 'SENSITIVE_EXPORT' | 'HIGH_VOLUME_EXPORT' | 'REPEATED_DOWNLOAD' | 'REPEATED_ACTIVITY';
  eventType: 'BULK_OPERATION' | 'DATA_EXPORT';
  userId: string;
  userRole: UserRole;
  userEmployeeId?: string;
  userName: string;
  module: string;
  entityType: string;
  operation?: BulkOperationType;
  exportFormat?: ExportDataFormat;
  dataClassification?: SensitiveDataClassification;
  affectedRecordCount?: number;
  recordCount?: number;
  exportName?: string;
  isAfterHours: boolean;
  localTimeHour: number;
  riskScore: number;
  severity: SecuritySeverity;
  rulesTriggered: string[];
  evidence: string;
  timestamp: string;
  status: 'DETECTED' | 'ACKNOWLEDGED' | 'INVESTIGATING' | 'DISMISSED' | 'RESOLVED' | 'UNDER_REVIEW';
  correlationId?: string;
  affectedRecordIds?: string[];
  reviewedAt?: string;
  reviewedBy?: string;
  resolutionNotes?: string;
  metadata?: Record<string, any>;
}

export type KpiTrendDirection = 'UP' | 'DOWN' | 'STABLE';
export type KpiStatus = 'ON_TARGET' | 'WARNING' | 'CRITICAL' | 'NO_TARGET';
export type SnapshotStatus = 'GENERATING' | 'PARTIAL' | 'COMPLETE' | 'FAILED';
export type DataQuality = 'COMPLETE' | 'PARTIAL' | 'INSUFFICIENT';

export interface KpiDefinition {
  kpiId: string;
  name: string;
  category: string;
  description: string;
  calculationType: string;
  source: string;
  unit: string;
  frequency: string;
  active: boolean;
  visibilityPermissions: string[];
  higherIsBetter: boolean;
  target?: number;
  warningThreshold?: number;
  criticalThreshold?: number;
}

export interface KpiValue {
  kpiId: string;
  name: string;
  category: string;
  currentValue: number;
  previousValue: number | null;
  difference: number | null;
  percentageChange: number | null;
  trendDirection: KpiTrendDirection;
  status: KpiStatus;
  target?: number;
  unit: string;
}

export interface KpiSnapshot {
  id: string;
  companyId: string;
  snapshotDate: string;
  periodStart: string;
  periodEnd: string;
  generatedAt: string;
  timezone?: string;
  values: KpiValue[];
  calculationVersion: string;
  status: SnapshotStatus;
  dataQuality: DataQuality;
  moduleDataQuality?: Record<string, DataQuality>;
}

export interface BillingPreviewRecord {
  contractId: string;
  siteId?: string;
  serviceId?: string;
  periodStart: string;
  periodEnd: string;
  applicableRate?: number;
  rateType?: string;
  quantity: number;
  unit?: string;
  grossAmount: number;
  currency?: string;
  generatedAt: string;
  sourceReference?: string;
}

export interface LeaveBalanceDetail {
  leaveTypeId?: string;
  leaveTypeName?: string;
  leaveCode?: string;
  leaveName?: string;
  total?: number;
  used?: number;
  remaining?: number;
  openingBalance?: number;
  accrued?: number;
  carriedForward?: number;
  adjusted?: number;
  encashed?: number;
  pending?: number;
  availableBalance?: number;
}

export interface LeavePolicyRecord {
  id: string;
  companyId: string;
  name: string;
  leaveCode?: string;
  leaveName?: string;
  annualEntitlement?: number;
  leaveTypes?: Array<{
    id: string;
    name: string;
    annualQuota: number;
    carryForwardMax?: number;
  }>;
  createdAt: string;
  updatedAt?: string;
}

export interface HolidayRecord {
  id: string;
  companyId: string;
  name: string;
  date: string;
  isOptional?: boolean;
  createdAt: string;
}

export type StockTransactionType = 
  | 'IN' 
  | 'OUT' 
  | 'ADJUST' 
  | 'TRANSFER'
  | 'PURCHASE_INWARD' 
  | 'ISSUE_TO_EMPLOYEE' 
  | 'RETURN_FROM_EMPLOYEE' 
  | 'AUDIT_ADJUSTMENT' 
  | 'DAMAGE_WRITE_OFF' 
  | 'LOCATION_TRANSFER';

export interface StockTransactionRecord {
  id: string;
  companyId: string;
  itemId: string;
  itemName?: string;
  itemCode?: string;
  locationId?: string;
  fromSiteId?: string;
  toSiteId?: string;
  siteId?: string;
  siteName?: string;
  fromSiteName?: string;
  toSiteName?: string;
  type?: StockTransactionType | 'IN' | 'OUT' | 'ADJUST' | 'TRANSFER';
  transactionType?: string;
  quantity: number;
  unitCost?: number;
  totalValue?: number;
  previousStock?: number;
  newStock?: number;
  performedByUid?: string;
  performedByName?: string;
  employeeId?: string;
  employeeName?: string;
  vendorSupplier?: string;
  referenceNumber?: string;
  notes?: string;
  remarks?: string;
  timestamp?: string;
  createdAt?: string;
  referenceId?: string;
}

export interface InventoryAlertRecord {
  id: string;
  companyId: string;
  itemId: string;
  itemName: string;
  locationId?: string;
  alertType?: 'LOW_STOCK' | 'OUT_OF_STOCK' | 'EXPIRY' | 'OVERSTOCK' | string;
  currentStock?: number;
  currentQuantity?: number;
  threshold?: number;
  previousStatus?: string;
  newStatus?: string;
  severity: SecuritySeverity | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: 'OPEN' | 'ACKNOWLEDGED' | 'RESOLVED' | string;
  acknowledged?: boolean;
  acknowledgedByName?: string;
  createdAt: string;
  acknowledgedAt?: string;
  resolvedAt?: string;
}

export interface StockLocationRecord {
  id: string;
  companyId: string;
  name: string;
  code?: string;
  type?: string;
  siteId?: string;
  address?: string;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt?: string;
}

export interface StockLedgerRecord {
  id: string;
  companyId: string;
  itemId: string;
  locationId: string;
  transactionType: string;
  quantity: number;
  previousBalance: number;
  newBalance: number;
  unitCost?: number;
  reason?: string;
  referenceId?: string;
  referenceType?: string;
  performedByUid: string;
  performedByName: string;
  createdAt: string;
}

export interface StockBalanceRecord {
  id?: string;
  companyId?: string;
  itemId?: string;
  locationId?: string;
  quantity: number;
  status?: string;
  lastUpdatedAt?: string;
}

export interface GatePassLineItem {
  itemId: string;
  itemName: string;
  itemCode?: string;
  unit?: string;
  quantity: number;
  returnedQuantity?: number;
}

export interface GatePassRecord {
  id?: string;
  companyId: string;
  passNumber: string;
  passType: 'INWARD' | 'OUTWARD' | 'RETURNABLE' | 'NON_RETURNABLE';
  status: 'DRAFT' | 'APPROVED' | 'DISPATCHED' | 'VERIFIED' | 'REJECTED' | 'GATE_VERIFIED' | 'CLOSED' | 'RETURN_PENDING' | 'SUBMITTED';
  sourceLocationId?: string;
  sourceLocationName?: string;
  destinationLocationId?: string;
  destinationLocationName?: string;
  lines: GatePassLineItem[];
  requesterId: string;
  requesterName: string;
  recipientName?: string;
  purpose?: string;
  transferOrderId?: string;
  vehicleNumber?: string;
  submittedAt?: string;
  approvedAt?: string;
  approvedByUid?: string;
  approvedByName?: string;
  verifiedAt?: string;
  verifiedByUid?: string;
  verifiedByName?: string;
  closedAt?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface MaintenancePlan {
  id: string;
  maintenancePlanId?: string;
  companyId: string;
  siteId?: string;
  assetId: string;
  title: string;
  description?: string;
  maintenanceType?: string;
  priority?: string;
  frequency: any;
  frequencyUnit?: string;
  gracePeriod?: number;
  gracePeriodDays?: number;
  assignedToUid?: string;
  assignedTo?: string;
  startDate?: string;
  status: 'ACTIVE' | 'PAUSED';
  nextDueDate: string;
  lastCompletedDate?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface MaintenanceOccurrence {
  id: string;
  maintenanceOccurrenceId?: string;
  companyId: string;
  planId?: string;
  maintenancePlanId?: string;
  workOrderId?: string;
  assetId: string;
  scheduledDate?: string;
  dueDate?: string;
  completedDate?: string;
  performedByUid?: string;
  status: 'PENDING' | 'COMPLETED' | 'MISSED' | 'CANCELLED' | 'UPCOMING' | 'OVERDUE' | 'DUE' | 'IN_PROGRESS';
  notes?: string;
  createdAt: string;
  updatedAt?: string;
}

export type SlaMeasurementType = 'PERCENTAGE' | 'HOURS' | 'MINUTES' | 'DAYS' | 'NUMERIC' | string;
export type SlaSeverity = SecuritySeverity | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface SlaDefinitionRecord {
  id: string;
  companyId: string;
  name?: string;
  category?: string;
  targetResponseMinutes?: number;
  targetResolutionMinutes?: number;
  penaltyPercentage?: number;
  status: 'ACTIVE' | 'INACTIVE';
  slaId?: string;
  slaCode?: string;
  slaName?: string;
  clientId?: string;
  contractId?: string;
  description?: string;
  targetValue?: number;
  targetUnit?: string;
  measurementType?: string;
  severity?: SecuritySeverity;
  effectiveFrom?: string;
  createdBy?: string;
  createdAt?: string;
  updatedBy?: string;
  updatedAt?: string;
}

export interface SlaBreachRecord {
  id: string;
  companyId: string;
  slaId?: string;
  ticketId?: string;
  clientId?: string;
  contractId?: string;
  siteId?: string;
  sourceRecordId?: string;
  incidentType?: string;
  breachType?: 'RESPONSE' | 'RESOLUTION' | string;
  breachedAt?: string;
  detectedAt?: string;
  targetValue?: number;
  actualValue?: number;
  variance?: number;
  resolutionTimeMinutes?: number;
  penaltyAmount?: number;
  severity?: SecuritySeverity;
  status: 'OPEN' | 'INVESTIGATING' | 'WAIVED' | 'PENALIZED' | 'ESCALATED';
}

export interface SlaScorecardMetric {
  metricName?: string;
  targetValue?: number;
  actualValue?: number;
  achieved?: boolean;
  slaId?: string;
  slaName?: string;
  targetUnit?: string;
  breaches?: any;
  compliancePercentage?: number;
  totalMeasuredEvents?: number;
  isMet?: boolean;
}

export interface SlaScorecardRecord {
  id: string;
  companyId: string;
  siteId?: string;
  clientId?: string;
  contractId?: string;
  month?: string;
  overallScore?: number;
  metrics: SlaScorecardMetric[];
  status?: 'DRAFT' | 'PUBLISHED';
  evaluatedAt?: string;
  periodType?: string;
  periodStartDate?: string;
  periodEndDate?: string;
  overallCompliance?: number;
  totalBreaches?: number;
  criticalBreaches?: number;
  generatedAt?: string;
  version?: number;
}

export type BillingRateType = 'PER_SHIFT' | 'MONTHLY_FIXED' | 'HOURLY' | 'DAILY' | string;

export interface BillingRateMatrixRecord {
  id: string;
  companyId: string;
  clientId?: string;
  role?: string;
  ratePerHour?: number;
  ratePerShift?: number;
  overtimeRatePerHour?: number;
  effectiveFrom?: string;
  rateType?: string;
  rate?: number;
  siteId?: string;
  serviceId?: string;
  designationId?: string;
  unit?: string;
  currency?: string;
  status?: string;
  contractId?: string;
  createdBy?: string;
  createdAt?: string;
  updatedBy?: string;
  updatedAt?: string;
}

export type TransferOrderStatus = 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'DISPATCHED' | 'IN_TRANSIT' | 'PARTIALLY_RECEIVED' | 'COMPLETED' | 'EXCEPTION' | 'REJECTED' | 'RESERVED';

export interface TransferOrderLine {
  itemId: string;
  itemName: string;
  unitOfMeasure: string;
  requestedQuantity: number;
  approvedQuantity?: number;
  dispatchedQuantity?: number;
  receivedQuantity?: number;
  damagedQuantity?: number;
  missingQuantity?: number;
  reservedQuantity?: number;
}

export interface TransferOrderRecord {
  id: string;
  companyId: string;
  transferOrderNumber?: string;
  transferNumber?: string;
  sourceLocationId: string;
  destinationLocationId: string;
  status: TransferOrderStatus;
  priority?: string;
  requestedByUid: string;
  requestedByName: string;
  approvedByUid?: string;
  dispatchedByUid?: string;
  dispatchedByName?: string;
  actualDispatchDate?: string;
  expectedDeliveryDate?: string;
  purpose?: string;
  gatePassId?: string;
  lines: TransferOrderLine[];
  createdAt: string;
  updatedAt?: string;
}

export type SecuritySeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type SecurityFindingStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'ACCEPTED_RISK' | 'DETECTED';

export interface SecurityFinding {
  id: string;
  title?: string;
  severity: SecuritySeverity;
  status: SecurityFindingStatus;
  description?: string;
  remediation?: string;
  detectedAt?: string;
  companyId?: string;
  runId?: string;
  checkId?: string;
  module?: string;
  testName?: string;
  failureReason?: string;
  affectedResource?: string;
  timestamp?: string;
  updatedAt?: string;
}

export interface SecurityAssuranceRun {
  id: string;
  companyId: string;
  runDate?: string;
  status: 'PASSED' | 'FAILED' | 'WARNING' | 'BLOCKED' | 'PASS' | 'FAIL';
  findingsCount?: number;
  findings: SecurityFinding[];
  score?: number;
  version?: string;
  totalChecks?: number;
  passed?: number;
  failed?: number;
  blocked?: number;
  executedAt?: string;
  signOffStatus?: string;
  webBuildStatus?: string;
  androidBuildStatus?: string;
}

export interface ReleaseGateSignOff {
  id: string;
  version: string;
  runId?: string;
  reviewerId?: string;
  signedOffBy?: string;
  signedOffAt?: string;
  status?: 'APPROVED' | 'BLOCKED';
  approvalDecision?: string;
  reviewerRole?: string;
  reviewerName?: string;
  companyId?: string;
  timestamp?: string;
  securityResult?: string;
  comments?: string;
  notes?: string;
}

export interface SecurityEventRecord {
  id?: string;
  companyId: string;
  eventType?: string;
  severity: SecuritySeverity;
  userId?: string;
  role?: string;
  success?: boolean;
  action?: string;
  reason?: string;
  resource?: string;
  resourceId?: string;
  source?: string;
  ipAddress?: string;
  details?: Record<string, any>;
  timestamp: string;
  eventId?: string;
}

export interface SecurityAnomalyRecord {
  id?: string;
  companyId: string;
  anomalyType?: string;
  anomalyId?: string;
  type?: string;
  reason?: string;
  status?: 'DETECTED' | 'RESOLVED' | 'INVESTIGATING' | 'DISMISSED' | 'FALSE_POSITIVE' | 'CONFIRMED' | 'UNDER_REVIEW';
  resolvedByUserId?: string;
  resolvedAt?: string;
  resolutionNotes?: string;
  triggeringEvents?: string[];
  severity: SecuritySeverity;
  score: number;
  details?: string;
  detectedAt: string;
  recommendedAction?: string;
}

export interface SecurityDetectionRule {
  id: string;
  companyId?: string;
  name: string;
  description?: string;
  condition?: string;
  eventType: string;
  threshold: number;
  windowMinutes?: number;
  timeWindowMinutes?: number;
  severity: SecuritySeverity;
  riskCategory?: string;
  effectiveDate?: string;
  enabled: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface RiskMitigationAction {
  id: string;
  title: string;
  assignedTo: string;
  dueDate: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'COMPLETED';
}

export interface RiskRecord {
  id: string;
  companyId: string;
  title: string;
  category: string;
  likelihood: 'LOW' | 'MEDIUM' | 'HIGH';
  impact: 'LOW' | 'MEDIUM' | 'HIGH';
  score: number;
  mitigationPlan?: string;
  actions?: RiskMitigationAction[];
  status: 'IDENTIFIED' | 'MITIGATED' | 'ACCEPTED' | 'CLOSED';
  createdAt: string;
}

export type WarrantyStatus = 'ACTIVE' | 'EXPIRED' | 'VOID' | 'PENDING_REGISTRATION' | 'EXPIRING_SOON' | 'CANCELLED' | 'CLAIM_IN_PROGRESS' | 'CLAIM_RESOLVED';
export type WarrantyClaimStatus = 'CLAIM_CREATED' | 'SUBMITTED' | 'UNDER_REVIEW' | 'APPROVED' | 'REPLACED' | 'REPAIRED' | 'REJECTED' | 'RESOLVED' | 'CLOSED' | 'SERVICE_IN_PROGRESS';

export interface WarrantyRecord {
  id: string;
  companyId: string;
  assetId: string;
  vendorId?: string;
  warrantyNumber?: string;
  warrantyPeriodMonths?: number;
  startDate: string;
  endDate: string;
  status: WarrantyStatus;
  coverageDetails?: string;
  coverageDescription?: string;
  warrantyProvider?: string;
  warrantyType?: string;
  claimIds?: string[];
  claimEligibility?: any;
  documentUrls?: string[];
  createdBy?: string;
  updatedBy?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface WarrantyClaimRecord {
  id: string;
  companyId: string;
  warrantyId: string;
  assetId: string;
  claimDate?: string;
  issueDescription: string;
  status: WarrantyClaimStatus;
  resolutionNotes?: string;
  resolvedAt?: string;
  resolvedBy?: string;
  reportedBy?: string;
  reportedByName?: string;
  reportedAt?: string;
  workOrderId?: string;
  priority?: string;
  claimNumber?: string;
  claimTitle?: string;
  attachments?: string[];
  documents?: string[];
  evidenceUrls?: string[];
  createdAt?: string;
  updatedAt?: string;
}

export type SosStatus = 'TRIGGERED' | 'ACKNOWLEDGED' | 'RESPONDING' | 'RESPONSE_STARTED' | 'RESOLVED' | 'CLOSED' | 'FALSE_ALARM' | 'CANCELLED';

export interface SosEventRecord {
  id: string;
  companyId: string;
  userId?: string;
  userName?: string;
  employeeId?: string;
  triggeredByUserId?: string;
  regionId?: string;
  branchId?: string;
  siteId?: string;
  source?: 'WEB' | 'ANDROID' | 'KIOSK' | string;
  emergencyType?: any;
  severity?: any;
  latitude: number;
  longitude: number;
  locationAccuracy?: number;
  locationTimestamp?: string;
  status: SosStatus | string;
  triggeredAt: string;
  acknowledgedAt?: string;
  acknowledgedBy?: string;
  responseStartedAt?: string;
  resolvedAt?: string;
  resolvedBy?: string;
  closedAt?: string;
  incidentId?: string;
  patrolTourId?: string;
  workOrderId?: string;
  trackingSessionId?: string;
  escalationLevel?: number;
  lastEscalatedAt?: string;
  cancellationReason?: string;
  resolutionNotes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface TrackingSessionRecord {
  id: string;
  companyId: string;
  userId?: string;
  userName?: string;
  employeeId?: string;
  siteId?: string;
  purposeType?: any;
  purposeId?: string;
  startedAt?: string;
  startTime?: string;
  endedAt?: string;
  endTime?: string;
  status: any;
  startedBy?: string;
  endedBy?: string;
  locationPolicy?: any;
  lastLatitude?: number;
  lastLongitude?: number;
  lastPingAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface GpsLocationEvent {
  id: string;
  trackingSessionId?: string;
  companyId: string;
  userId?: string;
  siteId?: string;
  employeeId?: string;
  latitude: number;
  longitude: number;
  accuracy?: number;
  speed?: number;
  heading?: number;
  bearing?: number;
  source?: 'FUSED' | 'GPS' | 'NETWORK' | string;
  sequenceNumber?: number;
  isStale?: boolean;
  timestamp: string;
}

export type LeadStatus = 'NEW' | 'CONTACTED' | 'QUALIFIED' | 'DEMO' | 'DEMO_SCHEDULED' | 'PROPOSAL_SENT' | 'CONVERTED' | 'LOST';

export interface LeadActivity {
  id: string;
  action: string;
  notes?: string;
  timestamp: string;
  actorId?: string;
  actorName?: string;
}

export interface LeadRecord {
  id: string;
  name?: string;
  company?: string;
  companyName?: string;
  contactPerson?: string;
  email: string;
  phone?: string;
  status: LeadStatus;
  notes?: string;
  interestedModules?: string[] | string;
  workforceSize?: string;
  message?: string;
  activityHistory?: LeadActivity[];
  createdAt: string;
  updatedAt?: string;
}

export interface RfqLineItem {
  itemId: string;
  itemName: string;
  specification?: string;
  quantity: number;
  uom: string;
}

export interface RfqEvaluationCriteria {
  priceWeightage: number;
  deliverySpeedWeightage: number;
  vendorRatingWeightage: number;
}

export interface RfqRequest {
  id: string;
  companyId: string;
  rfqNumber: string;
  title: string;
  category?: string;
  description?: string;
  scopeOfWork?: string;
  requiredDeliveryDate?: string;
  deliverySiteId?: string;
  deliveryAddress?: string;
  submissionDeadline?: string;
  status: 'DRAFT' | 'PUBLISHED' | 'UNDER_EVALUATION' | 'AWARDED' | 'CLOSED' | 'CANCELLED';
  invitedVendorIds?: string[];
  lineItems: RfqLineItem[];
  evaluationCriteria?: RfqEvaluationCriteria;
  createdBy?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface RfqBidLineQuote {
  itemId: string;
  offeredUnitPrice: number;
  taxPercent: number;
  hsnCode?: string;
  lineTotal: number;
  leadTimeDays?: number;
  remarks?: string;
}

export interface RfqBidScore {
  technicalScore?: number;
  commercialScore?: number;
  totalRank?: number;
}

export interface RfqBid {
  id: string;
  companyId: string;
  rfqId: string;
  vendorId: string;
  vendorName: string;
  bidStatus: 'DRAFT' | 'SUBMITTED' | 'UNDER_REVIEW' | 'ACCEPTED' | 'REJECTED' | 'AWARDED';
  lineItemQuotes: RfqBidLineQuote[];
  subTotal: number;
  totalTax: number;
  grandTotal: number;
  paymentTermsOffered?: string;
  quoteValidityDate?: string;
  submittedAt?: string;
  score?: RfqBidScore;
  createdAt: string;
  updatedAt?: string;
}

export type KpiCategory = 'WORKFORCE' | 'OPERATIONS' | 'FINANCE' | 'ASSETS' | 'INVENTORY' | 'CRM' | string;

export * from './compliance';
export * from './workforceCapacity';
export * from './enterpriseConflict';
export * from './historicalTraceability';

