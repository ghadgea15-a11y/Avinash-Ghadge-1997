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


// --- SaaS Subscription Models ---

export interface SubscriptionPlan {
  planId: string;
  planCode: string; // e.g. 'STARTER', 'PRO', 'ENTERPRISE'
  planName: string;
  description: string;
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
  createdAt?: string;
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
  employeeId?: string;
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
  actionType: 'PUNCH_IN' | 'PUNCH_OUT' | 'PATROL_CHECK' | 'PATROL_TOUR_LOG' | 'PATROL_PLAN' | 'PATROL_TOUR_START' | 'PATROL_SCAN' | 'PATROL_TOUR_SCAN' | 'PATROL_TOUR_COMPLETE' | 'PATROL_OVERRIDE' | 'INCIDENT_REPORT' | 'VISITOR_LOG' | 'VISITOR_CHECK_OUT' | 'MATERIAL_PASS' | 'MATERIAL_APPROVE' | 'CREATE_EMPLOYEE' | 'UPDATE_EMPLOYEE_STATUS' | 'CREATE_ROSTER' | 'DELETE_ROSTER';
  payload: Record<string, unknown>;
  timestamp: number;
  status: 'PENDING' | 'SYNCED' | 'FAILED';
}

export type DocumentStatus = 
  | 'MISSING'
  | 'UPLOADED'
  | 'UNDER_VERIFICATION'
  | 'VERIFIED'
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
  
  verificationStatus: 'PENDING' | 'VERIFIED' | 'REJECTED';
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

export type OnboardingTaskStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'WAIVED' | 'OVERDUE';

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
  
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
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
  name: string;
  code: string;
  description?: string;
  createdAt?: string;
}

export interface DesignationRecord {
  id: string;
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
  assignedRegionId?: string;
  assignedAreaId?: string;
  assignedBranchId?: string;
  assignedSiteId?: string;
  workforceCategory?: WorkforceCategory;
  authorityLevel?: AuthorityLevel;
  dataScope?: DataScope;
  status: 'ACTIVE' | 'SUSPENDED';
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
  | 'IN_PROGRESS' 
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
  | 'CLOSED' 
  | 'REJECTED' 
  | 'CANCELLED' 
  | 'IN_PROGRESS' 
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
  status?: 'DRAFT' | 'SUBMITTED' | 'VERIFIED' | 'REVIEWED' | 'INITIATED' | 'ACCEPTED' | 'DISPUTED';
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
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
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
  | 'SUPER_ADMIN_COMPANY_DETAILS'
  | 'SUPER_ADMIN_USERS'
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
  | 'PROCUREMENT_SRM'
  | 'SAFETY_MANAGEMENT'
  | 'COMPLIANCE';

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

export type WorkOrderStatus = 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'DISPATCHED' | 'ACCEPTED' | 'IN_PROGRESS' | 'PAUSED' | 'COMPLETED' | 'VERIFIED' | 'CLOSED' | 'CANCELLED' | 'REJECTED' | 'OVERDUE';
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
  verificationStatus?: 'PENDING' | 'VERIFIED' | 'REJECTED';
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
  status: 'TODO' | 'IN_PROGRESS' | 'PENDING_VERIFICATION' | 'COMPLETED' | 'CANCELLED' | 'PENDING' | 'IN_REVIEW' | 'APPROVED' | 'REJECTED' | 'RESOLVED';
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
// MODULE 11: SERVICE MANAGEMENT / CLIENT HELPDESK
// ============================================================================
export type ServiceTicketPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type ServiceTicketStatus = 'OPEN' | 'IN_PROGRESS' | 'PENDING_CLIENT' | 'RESOLVED' | 'CLOSED' | 'REOPENED';
export type ServiceTicketCategory = 
  | 'GUARD_BEHAVIOR' 
  | 'SHORT_MANPOWER' 
  | 'EQUIPMENT_MALFUNCTION' 
  | 'BILLING_INVOICE' 
  | 'ACCESS_CONTROL' 
  | 'PATROL_IRREGULARITY' 
  | 'CLEANLINESS_HYGIENE' 
  | 'OTHER';

export interface TicketCommentRecord {
  id: string;
  ticketId: string;
  companyId: string;
  authorUserId: string;
  authorName: string;
  authorRole: string;
  comment: string;
  isInternalOnly: boolean;
  createdAt: string;
}

export interface ServiceTicketRecord {
  id: string;
  ticketNumber: string; // e.g. TKT-2026-001
  companyId: string;
  clientId: string;
  clientName: string;
  siteId: string;
  siteName: string;
  title: string;
  description: string;
  category: ServiceTicketCategory;
  priority: ServiceTicketPriority;
  status: ServiceTicketStatus;
  reportedByUserId: string;
  reportedByName: string;
  reportedByEmail?: string;
  reportedByPhone?: string;
  assignedToUserId?: string;
  assignedToName?: string;
  slaDueTime: string; // ISO string calculated from priority
  isSlaBreached: boolean;
  resolutionSummary?: string;
  resolvedAt?: string;
  resolvedByUserId?: string;
  closedAt?: string;
  clientRating?: number; // 1 - 5 stars
  clientFeedbackNotes?: string;
  linkedIncidentId?: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// MODULE 12: TALENT ACQUISITION & ONBOARDING (ATS)
// ============================================================================
export type RequisitionStatus = 'OPEN' | 'INTERVIEWING' | 'FILLED' | 'CANCELLED';
export type CandidateStage = 
  | 'APPLIED' 
  | 'SCREENING' 
  | 'INTERVIEW' 
  | 'BACKGROUND_VERIFICATION' 
  | 'SELECTED' 
  | 'OFFER_EXTENDED' 
  | 'ONBOARDED' 
  | 'REJECTED';

export type VerificationStatus = 'PENDING' | 'VERIFIED' | 'FAILED' | 'EXEMPTED';

export interface JobRequisitionRecord {
  id: string;
  requisitionCode: string; // e.g. REQ-2026-012
  companyId: string;
  jobTitle: string;
  departmentId: string;
  departmentName: string;
  siteId: string;
  siteName: string;
  designationId?: string;
  openPositions: number;
  filledPositions: number;
  minExperienceYears: number;
  salaryMinMonthly: number;
  salaryMaxMonthly: number;
  workforceCategory: WorkforceCategory;
  jobDescription: string;
  status: RequisitionStatus;
  targetHiringDate: string;
  createdByUserId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CandidateRecord {
  id: string;
  candidateCode: string; // e.g. CAND-8841
  companyId: string;
  requisitionId?: string;
  jobTitleAppliedFor: string;
  fullName: string;
  gender: 'MALE' | 'FEMALE' | 'OTHER';
  dateOfBirth: string;
  phoneNumber: string;
  email?: string;
  currentAddress: string;
  permanentAddress?: string;
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
  stage: CandidateStage;
  interviewFeedback?: string;
  interviewerRating?: number; // 1-5
  rejectionReason?: string;
  convertedToEmployeeId?: string;
  onboardedAt?: string;
  createdAt: string;
  updatedAt: string;
}

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

export interface TrainingEnrollmentRecord {
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
  resultStatus: 'ENROLLED' | 'IN_PROGRESS' | 'PASSED' | 'FAILED';
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
export type PurchaseOrderStatus = 'DRAFT' | 'PENDING_APPROVAL' | 'ISSUED' | 'PARTIALLY_RECEIVED' | 'COMPLETED' | 'CANCELLED';

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
  unit: string;
  quantityOrdered: number;
  quantityReceived: number;
  unitPrice: number;
  taxPercent: number;
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

export interface ThreeWayMatchRecord {
  id: string;
  companyId: string;
  poId: string;
  poNumber: string;
  grnId: string;
  grnNumber: string;
  vendorInvoiceNumber: string;
  vendorInvoiceDate: string;
  poTotalAmount: number;
  grnAcceptedValue: number;
  invoiceTotalAmount: number;
  varianceAmount: number;
  isMatched: boolean;
  matchStatus: 'EXACT_MATCH' | 'TOLERANCE_ACCEPTED' | 'DISCREPANCY_FLAGGED' | 'RESOLVED';
  flaggedReason?: string;
  reviewedByUserId?: string;
  approvedForPayment: boolean;
  createdAt: string;
  updatedAt: string;
}


export interface LeavePolicyRecord {
  id: string;
  companyId: string;
  leaveCode: string;
  leaveName: string;
  description?: string;
  annualEntitlement: number;
  maxCarryForward: number;
  isPaid: boolean;
  requiresApproval: boolean;
  genderRestriction?: 'ALL' | 'MALE' | 'FEMALE';
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: string;
}

export interface HolidayRecord {
  id: string;
  companyId: string;
  name: string;
  date: string; // YYYY-MM-DD
  type: 'NATIONAL' | 'FESTIVAL' | 'OTHER';
}

export interface LeaveBalanceDetail {
  leaveCode: string;
  leaveName: string;
  openingBalance: number;
  accrued: number;
  used: number;
  pending: number;
  adjusted: number;
  carriedForward: number;
  encashed: number;
  availableBalance: number;
}
export type LeadStatus = 'NEW' | 'CONTACTED' | 'QUALIFIED' | 'DEMO' | 'CONVERTED' | 'LOST';

export interface LeadActivity {
  id: string;
  action: string;
  notes: string;
  timestamp: string;
  actorId?: string;
  actorName?: string;
}

export interface LeadRecord {
  id: string; // leadId
  name: string;
  company: string;
  email: string;
  phone: string;
  designation?: string;
  city?: string;
  workforceSize?: string;
  interestedModules?: string;
  message?: string;
  utmSource?: string;
  landingPage?: string;
  status: LeadStatus;
  notes?: string;
  activityHistory?: LeadActivity[];
  createdAt: string;
  updatedAt?: string;
}

export interface AbsenceRegularizationRecord {
  id: string;
  employeeId: string;
  companyId: string;
  date: string;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: number;
  updatedAt: number;
}

export interface MaintenancePlan {
  maintenancePlanId: string;
  companyId: string;
  assetId: string;
  siteId: string;
  maintenanceType: 'PREVENTIVE' | 'INSPECTION' | 'CALIBRATION' | 'SAFETY_CHECK' | 'SERVICING' | 'OTHER';
  frequency: number;
  frequencyUnit: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'HALF_YEARLY' | 'YEARLY' | 'CUSTOM';
  startDate: string;
  nextDueDate: string;
  lastCompletedDate?: string;
  gracePeriod: number;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  assignedTo?: string;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: string;
  updatedAt: string;
}

export interface MaintenanceOccurrence {
  maintenanceOccurrenceId: string;
  maintenancePlanId: string;
  companyId: string;
  assetId: string;
  workOrderId?: string;
  dueDate: string;
  status: 'UPCOMING' | 'DUE' | 'OVERDUE' | 'IN_PROGRESS' | 'COMPLETED' | 'SKIPPED' | 'CANCELLED';
  createdAt: string;
}

export type WarrantyStatus = 'ACTIVE' | 'EXPIRING_SOON' | 'EXPIRED' | 'CLAIM_IN_PROGRESS' | 'CLAIM_RESOLVED' | 'CANCELLED';

export interface WarrantyRecord {
  id: string; // warrantyId
  companyId: string;
  assetId: string;
  warrantyProvider?: string; // vendorId or name
  warrantyNumber: string;
  warrantyType: 'MANUFACTURER' | 'EXTENDED' | 'SERVICE_CONTRACT' | 'OTHER';
  startDate: string;
  endDate: string;
  coverageDescription?: string;
  exclusions?: string;
  terms?: string;
  status: WarrantyStatus;
  claimEligibility: boolean;
  serviceContact?: string;
  documentUrls?: string[];
  createdBy: string;
  createdAt: string;
  updatedBy: string;
  updatedAt: string;
}

export type WarrantyClaimStatus = 'CLAIM_CREATED' | 'SUBMITTED' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED' | 'SERVICE_IN_PROGRESS' | 'RESOLVED' | 'CLOSED';

export interface WarrantyClaimRecord {
  id: string; // claimId
  companyId: string;
  warrantyId: string;
  assetId: string;
  issueDescription: string;
  reportedBy: string;
  reportedByName?: string;
  reportedAt: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  evidenceUrls?: string[];
  vendorId?: string;
  claimReference?: string;
  status: WarrantyClaimStatus;
  workOrderId?: string;
  incidentId?: string;
  resolutionNotes?: string;
  resolvedAt?: string;
  resolvedBy?: string;
  closedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export * from './ops';

// ==========================================
export type StockTransactionType = 
  | 'PURCHASE_INWARD' 
  | 'ISSUE_TO_EMPLOYEE' 
  | 'SITE_TRANSFER' 
  | 'RETURN_FROM_EMPLOYEE' 
  | 'DAMAGE_SCRAP' 
  | 'AUDIT_ADJUSTMENT';

export interface StockTransactionRecord {
  id: string;
  companyId: string;
  itemId: string;
  itemName: string;
  itemCode: string;
  transactionType: StockTransactionType;
  quantity: number;
  previousStock: number;
  newStock: number;
  unitCost?: number;
  totalValue?: number;
  referenceNumber?: string;
  employeeId?: string;
  employeeName?: string;
  fromSiteId?: string;
  toSiteId?: string;
  siteName?: string;
  vendorSupplier?: string;
  remarks?: string;
  performedByUid: string;
  performedByName: string;
  createdAt: string;
}

// SCM & INVENTORY ENHANCEMENTS
// ==========================================

export interface StockLocationRecord {
  id: string;
  companyId: string;
  siteId?: string;
  departmentId?: string;
  name: string;
  type: 'CENTRAL_STORE' | 'BRANCH_STORE' | 'SITE_STORE' | 'DEPARTMENT_STORE' | 'OTHER';
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: string;
}

export type StockTransactionTypeExtended = 
  | 'OPENING_BALANCE'
  | 'RECEIPT'
  | 'ISSUE'
  | 'TRANSFER'
  | 'RETURN'
  | 'ADJUSTMENT'
  | 'CONSUMPTION';

export interface StockLedgerRecord {
  id: string;
  companyId: string;
  itemId: string;
  locationId: string;
  transactionType: StockTransactionTypeExtended;
  
  quantity: number;
  previousBalance: number;
  newBalance: number;
  
  unitCost?: number;
  totalValue?: number;
  
  referenceId?: string; // Gate Pass ID, PO ID, etc.
  referenceType?: 'GATE_PASS' | 'ADJUSTMENT' | 'MANUAL';
  
  batchNumber?: string;
  serialNumber?: string;
  condition?: string;
  
  reason?: string;
  evidenceUrls?: string[];
  
  performedByUid: string;
  performedByName: string;
  createdAt: string;
}

export interface GatePassLineItem {
  itemId: string;
  itemName: string;
  itemCode: string;
  unit: string;
  quantity: number;
  returnedQuantity?: number;
  serialNumbers?: string[];
  batchNumbers?: string[];
  remarks?: string;
}

export type GatePassType = 'INWARD' | 'OUTWARD' | 'RETURNABLE' | 'NON_RETURNABLE';
export type GatePassStatus = 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'DISPATCHED' | 'GATE_VERIFIED' | 'RECEIVED' | 'RETURN_PENDING' | 'RETURNED' | 'CLOSED' | 'CANCELLED';

export interface GatePassRecord {
  id: string;
  companyId: string;
  passNumber: string;
  passType: GatePassType;
  status: GatePassStatus;
  
  sourceLocationId?: string;
  sourceLocationName?: string;
  destinationLocationId?: string;
  destinationLocationName?: string;
  
  lines: GatePassLineItem[];
  
  requesterId: string;
  requesterName: string;
  recipientName: string;
  recipientPhone?: string;
  recipientCompany?: string;
  
  purpose: string;
  vehicleNumber?: string;
  expectedReturnDate?: string;
  
  evidenceUrls?: string[];
  transferOrderId?: string;
  createdAt: string;
  submittedAt?: string;
  approvedAt?: string;
  approvedByUid?: string;
  approvedByName?: string;
  dispatchedAt?: string;
  verifiedAt?: string;
  verifiedByUid?: string;
  verifiedByName?: string;
  receivedAt?: string;
  returnedAt?: string;
  closedAt?: string;
  
  rejectionReason?: string;
}

export interface StockBalanceRecord {
  id: string; // usually `${locationId}_${itemId}`
  companyId: string;
  locationId: string;
  itemId: string;
  quantity: number;
  reservedQuantity?: number;
  lastUpdatedAt: string;
  status?: 'NORMAL' | 'LOW_STOCK' | 'CRITICAL_STOCK' | 'OUT_OF_STOCK' | 'OVER_STOCK';
}

export interface InventoryAlertRecord {
  id: string;
  companyId: string;
  locationId: string;
  itemId: string;
  itemName: string;
  previousStatus: string;
  newStatus: string;
  previousQuantity: number;
  currentQuantity: number;
  thresholdValue: number;
  eventType: 'LOW_STOCK_DETECTED' | 'CRITICAL_STOCK_DETECTED' | 'OUT_OF_STOCK_DETECTED' | 'RECOVERY_DETECTED';
  notificationId?: string;
  acknowledged: boolean;
  acknowledgedByUid?: string;
  acknowledgedByName?: string;
  acknowledgedAt?: string;
  notes?: string;
  createdAt: string;
}

export interface TransferOrderLine {
  itemId: string;
  itemName: string;
  requestedQuantity: number;
  approvedQuantity?: number;
  reservedQuantity?: number;
  dispatchedQuantity?: number;
  receivedQuantity?: number;
  damagedQuantity?: number;
  missingQuantity?: number;
  unitOfMeasure: string;
}

export type TransferOrderStatus = 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'RESERVED' | 'DISPATCHED' | 'IN_TRANSIT' | 'RECEIVED' | 'PARTIALLY_RECEIVED' | 'COMPLETED' | 'REJECTED' | 'CANCELLED' | 'EXCEPTION';

export interface TransferOrderRecord {
  id: string;
  companyId: string;
  transferNumber: string;
  sourceLocationId: string;
  destinationLocationId: string;
  sourceSiteId?: string;
  destinationSiteId?: string;
  requestedByUid: string;
  requestedByName: string;
  approvedByUid?: string;
  approvedByName?: string;
  dispatchedByUid?: string;
  dispatchedByName?: string;
  receivedByUid?: string;
  receivedByName?: string;
  
  purpose: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  status: TransferOrderStatus;
  
  expectedDeliveryDate?: string;
  actualDispatchDate?: string;
  actualReceiptDate?: string;
  remarks?: string;
  
  gatePassId?: string;
  incidentId?: string; 
  
  lines: TransferOrderLine[];
  
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// MODULE 7.2: CRM - SLA PERFORMANCE SCORECARDS
// ============================================================================

export type SlaMeasurementType = 
  | 'RESOLUTION_TIME'
  | 'RESPONSE_TIME'
  | 'ATTENDANCE_COMPLIANCE'
  | 'TASK_COMPLETION'
  | 'SERVICE_AVAILABILITY';

export type SlaStatus = 'ACTIVE' | 'DRAFT' | 'INACTIVE';

export type SlaSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface SlaDefinitionRecord {
  id: string; // slaId
  companyId: string;
  clientId: string;
  contractId: string;
  siteId?: string; // Optional if applies to all sites
  slaCode: string;
  slaName: string;
  description: string;
  measurementType: SlaMeasurementType;
  targetValue: number;
  targetUnit: 'MINUTES' | 'HOURS' | 'DAYS' | 'PERCENTAGE';
  severity: SlaSeverity;
  effectiveFrom: string; // ISO Date
  effectiveTo?: string; // ISO Date
  status: SlaStatus;
  applicableService?: string; // e.g. "Security", "Cleaning"
  createdBy: string;
  createdAt: string;
  updatedBy: string;
  updatedAt: string;
}

export type SlaBreachStatus = 'OPEN' | 'ESCALATED' | 'RESOLVED' | 'CLOSED';

export interface SlaBreachRecord {
  id: string; // breachId
  companyId: string;
  clientId: string;
  contractId: string;
  siteId?: string;
  slaId: string;
  sourceRecordId: string; // e.g. ticketId, workOrderId
  targetValue: number;
  actualValue: number;
  variance: number; // actual - target
  detectedAt: string; // ISO timestamp
  severity: SlaSeverity;
  status: SlaBreachStatus;
  escalationId?: string; // If escalated using BPM
  resolutionNotes?: string;
  resolvedAt?: string;
  resolvedBy?: string;
}

export interface SlaScorecardMetric {
  slaId: string;
  slaName: string;
  targetValue: number;
  targetUnit: string;
  actualValue: number;
  compliancePercentage: number;
  totalMeasuredEvents: number;
  breaches: number;
  isMet: boolean;
}

export interface SlaScorecardRecord {
  id: string; // scorecardId e.g. companyId_contractId_YYYY_MM
  companyId: string;
  clientId: string;
  contractId: string;
  siteId?: string; // Can be for specific site or aggregate
  periodType: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'CUSTOM';
  periodStartDate: string; // ISO Date
  periodEndDate: string; // ISO Date
  
  metrics: SlaScorecardMetric[];
  
  overallCompliance: number;
  totalBreaches: number;
  criticalBreaches: number;
  
  generatedAt: string;
  version: number;
}

// ============================================================================
// MODULE 7.3: CRM - BILLING RATE MATRICES
// ============================================================================

export type BillingRateType = 
  | 'PER_EMPLOYEE'
  | 'PER_SHIFT'
  | 'PER_DAY'
  | 'PER_HOUR'
  | 'PER_SERVICE'
  | 'FIXED_MONTHLY'
  | 'VARIABLE_QUANTITY';

export type BillingRateStatus = 'DRAFT' | 'PENDING_APPROVAL' | 'ACTIVE' | 'EXPIRED' | 'REJECTED';

export interface BillingRateMatrixRecord {
  id: string; // rateMatrixId
  companyId: string;
  clientId: string;
  contractId: string;
  
  siteId?: string; // Optional: If empty, applies to all sites under contract
  serviceId?: string; // Optional: If empty, applies generically
  designationId?: string; // Optional: For specific roles
  
  rateType: BillingRateType;
  unit: string; // e.g. 'Shift', 'Hour', 'Month', 'Employee'
  rate: number;
  currency: string;
  
  taxApplicability?: string; // Tax references
  
  effectiveFrom: string; // ISO Date
  effectiveTo?: string; // ISO Date
  
  status: BillingRateStatus;
  
  createdBy: string;
  createdAt: string;
  updatedBy: string;
  updatedAt: string;
  approvedBy?: string;
  approvedAt?: string;
}

export interface BillingPreviewRecord {
  contractId: string;
  siteId?: string;
  serviceId?: string;
  periodStart: string;
  periodEnd: string;
  applicableRate: number;
  rateType: BillingRateType;
  quantity: number;
  unit: string;
  grossAmount: number;
  currency: string;
  generatedAt: string;
  sourceReference?: string;
}

// ============================================================================
// MODULE 7.4: CRM - CONTRACT EXPIRATION ALERTS
// ============================================================================

export type ContractExpiryMilestone = 90 | 60 | 30 | 15 | 7 | 1 | 0; // 0 = EXPIRED

export interface ContractExpiryEventRecord {
  id: string; // e.g. EXP-contractId-milestone
  companyId: string;
  clientId: string;
  contractId: string;
  milestone: ContractExpiryMilestone;
  expiryDate: string; // ISO string of contract endDate
  daysRemaining: number;
  detectedAt: string; // ISO string
  notificationId?: string; // Reference to notification event
  escalationId?: string; // Reference to escalation/BPM
  status: 'PENDING_NOTIFICATION' | 'NOTIFIED' | 'ESCALATED' | 'RESOLVED';
}
export * from './bi';
export * from './bpm';

export type SecuritySeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface SecurityEventRecord {
  eventId: string;
  companyId: string;
  userId: string;
  employeeId?: string;
  role: string;
  action: string;
  resource: string;
  resourceId: string;
  timestamp: string;
  severity: SecuritySeverity;
  source: string;
  ipAddress?: string;
  deviceMetadata?: string;
  success: boolean;
  reason?: string;
  correlationId?: string;
}

export interface SecurityAnomalyRecord {
  anomalyId: string;
  companyId: string;
  severity: SecuritySeverity;
  type: string;
  score: number;
  triggeringEvents: string[]; // eventIds
  reason: string;
  detectedAt: string;
  status: 'DETECTED' | 'UNDER_REVIEW' | 'CONFIRMED' | 'FALSE_POSITIVE' | 'RESOLVED';
  resolutionNotes?: string;
  resolvedByUserId?: string;
  resolvedAt?: string;
  recommendedAction?: string;
}


// ==========================================
// MODULE 10 / POINT 4: BULK & EXPORT GOVERNANCE
// ==========================================

export type SensitiveDataClassification = 
  | 'EMPLOYEE_PII' 
  | 'PAYROLL_SALARY' 
  | 'BANK_DISBURSEMENT' 
  | 'STATUTORY_COMPLIANCE' 
  | 'CLIENT_CONTRACT' 
  | 'OPERATIONS_SECURITY' 
  | 'INVENTORY_SCM'
  | 'GENERAL';

export type BulkOperationType = 
  | 'BULK_UPDATE' 
  | 'BULK_ASSIGN' 
  | 'BULK_PUBLISH' 
  | 'BULK_UNPUBLISH'
  | 'BULK_DELETE' 
  | 'BULK_IMPORT' 
  | 'BULK_STATUS_CHANGE' 
  | 'BULK_APPROVE'
  | 'BATCH_RECALCULATE';

export type ExportDataFormat = 'CSV' | 'EXCEL' | 'PDF' | 'BANK_CMS_FILE' | 'JSON' | 'DOCUMENT';

export interface BulkAndExportAlertRecord {
  id: string;
  companyId: string;
  category: 'BULK_EDIT' | 'AFTER_HOURS_DOWNLOAD' | 'SENSITIVE_EXPORT' | 'HIGH_VOLUME_EXPORT' | 'UNAUTHORIZED_EXPORT' | 'REPEATED_ACTIVITY';
  eventType: 'BULK_OPERATION' | 'DATA_EXPORT';
  userId: string;
  userRole: string;
  userEmployeeId?: string;
  userName?: string;
  module: string;
  entityType: string;
  operation: string;
  affectedRecordCount: number;
  exportFormat?: ExportDataFormat;
  dataClassification?: SensitiveDataClassification;
  isAfterHours: boolean;
  localTimeHour: number;
  riskScore: number;
  severity: SecuritySeverity;
  rulesTriggered: string[];
  evidence: string;
  timestamp: string;
  status: 'DETECTED' | 'UNDER_REVIEW' | 'CONFIRMED' | 'FALSE_POSITIVE' | 'RESOLVED';
  reviewedBy?: string;
  reviewedAt?: string;
  resolutionNotes?: string;
  correlationId: string;
  affectedRecordIds?: string[];
  metadata?: Record<string, any>;
}

export interface SecurityGovernanceConfig {
  companyId: string;
  businessHoursStart: number; // 0-23, default 8 (08:00)
  businessHoursEnd: number;   // 0-23, default 20 (20:00)
  bulkWarningThreshold: number; // default 25 records
  exportWarningThreshold: number; // default 100 records
  sensitiveExportNotificationThreshold: SecuritySeverity; // default 'MEDIUM'
  repeatedDownloadWindowMinutes: number; // default 10 mins
  repeatedDownloadMaxCount: number; // default 3
  updatedAt?: string;
  updatedBy?: string;
}

export * from './compliance';
export * from './dataPrivacy';

