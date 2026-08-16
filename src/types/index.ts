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
}

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
  { key: 'GUARD_PATROL', name: 'Guard Patrol Tour', description: 'Live guard tour tracking and route patrols', category: 'SECURITY', icon: 'ShieldCheck' },
  { key: 'QR_CHECKPOINTS', name: 'QR Checkpoints', description: 'QR code checkpoint scanning & verification', category: 'SECURITY', icon: 'QrCode' },
  { key: 'SECURITY_INCIDENTS', name: 'Security Incident Register', description: 'Real-time incident reporting and investigation', category: 'SECURITY', icon: 'AlertTriangle' },
  { key: 'VISITOR_GATE_PASS', name: 'Visitor Gate Pass', description: 'Visitor check-in/out and digital badges', category: 'SECURITY', icon: 'UserCheck' },
  { key: 'MATERIAL_GATE_PASS', name: 'Material Gate Pass', description: 'Inward/outward material movement gate passes', category: 'SECURITY', icon: 'Truck' },
  { key: 'DAILY_SITE_MUSTER', name: 'Daily Site Muster', description: 'Daily site logs, weather, and guard counts', category: 'SECURITY', icon: 'ClipboardList' },
  { key: 'VENDOR_MANAGEMENT', name: 'Vendor & Contractor Management', description: 'Multi-vendor agency master, contract staff allocation, and contractor billing', category: 'HRMS', icon: 'Building' },
  { key: 'COMPLIANCE', name: 'Compliance & Audit', description: 'Regulatory compliance and statutory documents', category: 'SYSTEM', icon: 'CheckSquare' },
  { key: 'AUDIT_LOGS', name: 'System Audit Logs', description: 'Immutable trail of user and system actions', category: 'SYSTEM', icon: 'History' },
  { key: 'WORKFLOWS', name: 'Automated Workflows', description: 'Triggered notifications and automated tasks', category: 'SYSTEM', icon: 'Workflow' },
  { key: 'APPROVALS', name: 'Role Approvals', description: 'User registration approvals and role delegation', category: 'HRMS', icon: 'UserPlus' }
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
  requestedRole: UserRole;
  emailVerified: boolean;
  companyAdminApproval: ApprovalStatus;
  companyAdminApprovedBy?: string;
  companyAdminApprovedAt?: string;
  hrApproval: ApprovalStatus;
  hrApprovedBy?: string;
  hrApprovedAt?: string;
  accountStatus: AccountStatus;
  status?: 'PENDING' | 'APPROVED' | 'REJECTED';
  rejectionReason?: string;
  rejectedBy?: string;
  rejectedAt?: string;
  createdAt: string;
  updatedAt: string;
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
  actionType: 'PUNCH_IN' | 'PUNCH_OUT' | 'PATROL_CHECK' | 'PATROL_TOUR_LOG' | 'INCIDENT_REPORT' | 'VISITOR_LOG' | 'VISITOR_CHECK_OUT' | 'MATERIAL_PASS' | 'MATERIAL_APPROVE' | 'CREATE_EMPLOYEE' | 'UPDATE_EMPLOYEE_STATUS';
  payload: Record<string, unknown>;
  timestamp: number;
  status: 'PENDING' | 'SYNCED' | 'FAILED';
}

export interface EmployeeDocument {
  id: string;
  type: 'AADHAR' | 'PAN' | 'POLICE_VERIFICATION' | 'CONTRACT';
  documentNumber: string;
  fileUrl: string;
  status: 'VERIFIED' | 'PENDING' | 'REJECTED';
  uploadedAt: string;
}

export interface EmployeeRecord {
  id: string;
  employeeId?: string;
  companyId: string;
  authUid?: string;
  firstName: string;
  lastName: string;
  email?: string;
  contactNumber: string;
  dateOfBirth: string;
  bloodGroup: string;
  gender: 'MALE' | 'FEMALE' | 'OTHER';
  emergencyContact: {
    name: string;
    relation: string;
    phone: string;
  };
  assignedRegionId: string;
  assignedAreaId?: string;
  assignedBranchId: string;
  assignedSiteId: string;
  departmentId: string;
  designation: string;
  
  workforceCategory?: WorkforceCategory;
  organizationalGrade?: string;
  skillGrade?: SkillGrade;
  authorityLevel?: AuthorityLevel;
  reportingManagerId?: string;
  functionalManagerId?: string;
  approvalAuthorityId?: string;
  dataScope?: DataScope;

  status: 'ACTIVE' | 'PENDING_VERIFICATION' | 'SUSPENDED' | 'TERMINATED';
  joinedDate: string;
  supervisorId?: string;
  shiftId?: string;
  assignedShiftId?: string;
  employmentType?: 'PERMANENT' | 'CONTRACT' | 'TEMPORARY';
  vendorId?: string;
  vendorName?: string;
  profilePictureUrl?: string;
  role: UserRole;
  documents: EmployeeDocument[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
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
  branchId: string;
  clientName: string;
  address: string;
  status: 'ACTIVE' | 'INACTIVE';
  latitude?: number;
  longitude?: number;
  geofenceRadius?: number;
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
  siteId?: string;
  name: string;
  code: string;
  startTime: string; // HH:mm format, e.g. "08:00"
  endTime: string;   // HH:mm format, e.g. "16:00"
  gracePeriodMinutes: number; // e.g. 15
  breakDurationMinutes: number; // e.g. 30
  weeklyOffDays: number[]; // 0 = Sun, 1 = Mon, ..., 6 = Sat
  status: 'ACTIVE' | 'INACTIVE';
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;
}

export interface AttendanceLogRecord {
  id: string;
  companyId: string;
  employeeId: string;
  employeeName: string;
  siteId: string;
  siteName?: string;
  shiftId: string;
  shiftName?: string;
  date: string; // YYYY-MM-DD
  checkInTime?: string; // ISO string
  checkOutTime?: string; // ISO string
  status: 'PRESENT' | 'ABSENT' | 'HALF_DAY' | 'LATE' | 'EARLY_DEPARTURE' | 'ON_LEAVE' | 'PENDING_APPROVAL';
  checkInGps?: { latitude: number; longitude: number; accuracy?: number };
  checkOutGps?: { latitude: number; longitude: number; accuracy?: number };
  checkInPhotoUrl?: string;
  checkOutPhotoUrl?: string;
  checkInMethod: 'SELF_GPS' | 'SUPERVISOR_MUSTER' | 'BIOMETRIC' | 'MANUAL_CORRECTION';
  lateArrivalMinutes: number;
  earlyDepartureMinutes: number;
  overtimeMinutes: number;
  correctionNote?: string;
  correctionRequested?: boolean;
  correctionStatus?: 'NONE' | 'PENDING' | 'APPROVED' | 'REJECTED';
  approvedBy?: string;
  createdAt: string;
  updatedAt?: string;
  createdBy: string;
}

export interface PatrolCheckpointRecord {
  id: string;
  companyId: string;
  siteId: string;
  siteName?: string;
  checkpointName: string;
  code: string;
  qrCode: string;
  locationDescription?: string;
  sequenceOrder: number;
  gpsCoordinates?: { latitude: number; longitude: number };
  status: 'ACTIVE' | 'INACTIVE';
  createdAt?: string;
}

export interface PatrolLogRecord {
  id: string;
  companyId: string;
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

export interface IncidentReportRecord {
  type?: 'INCIDENT' | 'COMPLAINT' | 'BBS_OBSERVATION';
  slaDeadline?: string;
  resolutionNotes?: string;
  actionTaken?: string;
  behaviorCategory?: string;
  id: string;
  companyId: string;
  siteId: string;
  siteName?: string;
  reportedById: string;
  reportedByName: string;
  title: string;
  category: 'SECURITY_BREACH' | 'FIRE_HAZARD' | 'PROPERTY_DAMAGE' | 'THEFT' | 'MEDICAL' | 'UNAUTHORIZED_ENTRY' | 'OTHER';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  description: string;
  status: 'OPEN' | 'UNDER_INVESTIGATION' | 'RESOLVED' | 'CLOSED' | 'IN_PROGRESS' | 'ESCALATED' | 'RECORDED' | 'ACTION_REQUIRED';
  resolvedById?: string;
  resolvedByName?: string;
  photoUrls?: string[];
  gpsLocation?: { latitude: number; longitude: number };
  reportedAt: string;
  resolvedAt?: string;
}

export interface VisitorLogRecord {
  id: string;
  companyId: string;
  siteId: string;
  siteName?: string;
  visitorName: string;
  visitorPhone: string;
  visitorCompany?: string;
  hostEmployeeId?: string;
  hostEmployeeName: string;
  purpose: string;
  badgeNumber: string;
  vehicleNumber?: string;
  checkInTime: string;
  checkOutTime?: string;
  status: 'IN_SITE' | 'CHECKED_OUT';
  entryGateGuardId: string;
  photoUrl?: string;
  createdAt: string;
}

export interface MaterialMovementRecord {
  id: string;
  companyId: string;
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
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
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
  casualLeave: { total: number; used: number; remaining: number };
  sickLeave: { total: number; used: number; remaining: number };
  earnedLeave: { total: number; used: number; remaining: number };
  unpaidLeave: { used: number };
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
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'RECOVERED';
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
  description?: string;
  unit: InventoryUnit;
  currentStock: number;
  minStockThreshold: number;
  maxStockLimit?: number;
  unitCost: number;
  warehouseLocation?: string;
  siteId?: string;
  siteName?: string;
  supplierVendorId?: string;
  supplierVendorName?: string;
  status: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK' | 'DISCONTINUED';
  barcode?: string;
  isAssetTracked?: boolean;
  createdAt: string;
  updatedAt: string;
}

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
  referenceNumber?: string; // PO / Gate Pass / Issue Note #
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
  | 'ELECTRONICS_IT' 
  | 'VEHICLES' 
  | 'COMMUNICATION_RADIO' 
  | 'WEAPONS_TACTICAL' 
  | 'FACILITY_SAFETY' 
  | 'FURNITURE_FIXTURES' 
  | 'OFFICE_EQUIPMENT' 
  | 'OTHER';

export type AssetStatus = 
  | 'AVAILABLE' 
  | 'ASSIGNED' 
  | 'UNDER_MAINTENANCE' 
  | 'DAMAGED' 
  | 'DISPOSED' 
  | 'LOST';

export type AssetCondition = 
  | 'NEW' 
  | 'EXCELLENT' 
  | 'GOOD' 
  | 'FAIR' 
  | 'POOR';

export interface AssetRecord {
  id: string;
  companyId: string;
  assetCode: string; // AST-2026-001
  assetName: string;
  category: AssetCategory;
  brand: string;
  model: string;
  serialNumber: string;
  barcodeOrQr: string;
  purchaseDate: string; // YYYY-MM-DD
  purchaseCost: number;
  currentValue: number;
  warrantyExpiryDate?: string;
  status: AssetStatus;
  condition: AssetCondition;
  assignedEmployeeId?: string;
  assignedEmployeeName?: string;
  assignedDate?: string;
  expectedReturnDate?: string;
  siteId?: string;
  siteName?: string;
  warehouseLocation?: string;
  lastAuditDate?: string;
  lastAuditedBy?: string;
  nextMaintenanceDate?: string;
  specifications?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type AssetMovementAction = 
  | 'CHECK_OUT' 
  | 'CHECK_IN' 
  | 'MAINTENANCE_OUT' 
  | 'MAINTENANCE_IN' 
  | 'SITE_TRANSFER' 
  | 'AUDIT_VERIFIED' 
  | 'DISPOSAL';

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
}

export type AssetMaintenanceType = 
  | 'PREVENTIVE_CALIBRATION' 
  | 'REPAIR' 
  | 'ANNUAL_AMC' 
  | 'PARTS_REPLACEMENT';

export interface AssetMaintenanceRecord {
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
  createdAt: string;
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
  status: 'DRAFT' | 'CALCULATED' | 'APPROVED' | 'DISBURSED';
  processedAt?: string;
  processedBy?: string;
  processedByName?: string;
  approvedAt?: string;
  disbursedAt?: string;
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
  departmentName?: string;
  designation?: string;
  bankName?: string;
  accountNumber?: string;
  ifscCode?: string;
  panNumber?: string;
  uanNumber?: string;
  totalMonthDays: number;
  workedDays: number;
  paidLeaveDays: number;
  lopDays: number;
  payableDays: number;
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
  status: 'GENERATED' | 'APPROVED' | 'PAID';
  generatedAt: string;
  createdAt: string;
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
  | 'EMPLOYEES'
  | 'ATTENDANCE_SHIFTS'
  | 'LEAVE_MANAGEMENT'
  | 'PAYROLL_COMPENSATION'
  | 'INVENTORY_STOCK'
  | 'ASSET_TRACKING'
  | 'SITE_OPERATIONS'
  | 'REPORTS_ANALYTICS'
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
  | 'LEGAL_POLICIES'
  | 'TASK_MANAGEMENT'
  | 'ANNOUNCEMENTS'
  | 'MY_TASKS';

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
  SECURITY_INCIDENTS: 'SECURITY_INCIDENTS'
} as const;

export type AppModuleKey = keyof typeof APP_MODULES;

export interface TaskRecord {
  id: string;
  companyId: string;
  siteId?: string;
  departmentTag?: string;
  assignedTo: string;
  assignedToName?: string;
  createdBy: string;
  createdByName?: string;
  title: string;
  description: string;
  dueDate?: string;
  slaDeadline?: string;
  completionNotes?: string;
  photoUrl?: string;
  status: 'TODO' | 'IN_PROGRESS' | 'PENDING_VERIFICATION' | 'COMPLETED' | 'CANCELLED' | 'PENDING' | 'IN_REVIEW' | 'APPROVED' | 'REJECTED' | 'RESOLVED';
  createdAt: number;
  updatedAt: number;
}

export interface AnnouncementRecord {
  id: string;
  companyId: string;
  targetAudience: string;
  message: string;
  priority: 'NORMAL' | 'URGENT';
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
