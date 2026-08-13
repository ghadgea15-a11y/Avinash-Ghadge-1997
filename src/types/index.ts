export type UserRole = 
  | 'GUARD'
  | 'FIELD_OFFICER'
  | 'OPS_MANAGER'
  | 'HR_ADMIN'
  | 'COMPANY_ADMIN'
  | 'SUPER_ADMIN';

export type AccountStatus = 
  | 'ACTIVE'
  | 'PENDING_EMAIL_VERIFICATION'
  | 'PENDING_APPROVAL'
  | 'ADMIN_APPROVED'
  | 'HR_APPROVED'
  | 'REJECTED'
  | 'DISABLED';

export type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface CompanyTenant {
  companyId: string; // e.g. "APEX-SEC-101"
  companyLegalName: string; // e.g. "Apex Security Services Pvt Ltd"
  brandName: string;
  licenseTier: 'STARTER' | 'PROFESSIONAL' | 'ENTERPRISE';
  logoUrl?: string;
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
  employeeId: string;
  fullName: string;
  email: string;
  role: UserRole;
  companyId: string;
  branchId: string;
  assignedSiteId?: string;
  avatarUrl?: string;
  token: string;
  tokenExpiresAt: number;
  isBiometricEnabled: boolean;
  lastActiveAt: number;
  loginMode: 'PASSWORD' | 'PIN' | 'BIOMETRIC' | 'GOOGLE';
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
  assignedBranchId: string;
  assignedSiteId: string;
  departmentId: string;
  designation: string;
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
  assignedBranchId?: string;
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
  status: 'OPEN' | 'UNDER_INVESTIGATION' | 'RESOLVED' | 'CLOSED';
  resolutionNotes?: string;
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
  status: 'DRAFT' | 'SUBMITTED' | 'VERIFIED';
  createdAt: string;
}

export type PhaseAScreen = 
  | 'SPLASH'
  | 'UPDATE_CHECKER'
  | 'COMPANY_CODE'
  | 'LOGIN'
  | 'SIGN_UP'
  | 'APPROVAL_PENDING'
  | 'APPROVAL_MANAGEMENT'
  | 'FORGOT_PASSWORD'
  | 'SESSION_LOCK'
  | 'ROLE_DASHBOARD'
  | 'COMPANY_MANAGEMENT'
  | 'EMPLOYEES'
  | 'ATTENDANCE_SHIFTS'
  | 'SITE_OPERATIONS'
  | 'PROFILE'
  | 'SETTINGS'
  | 'NOTIFICATIONS'
  | 'KOTLIN_CODE_VIEWER'
  | 'SUPER_ADMIN_DASHBOARD'
  | 'SUPER_ADMIN_COMPANIES'
  | 'SUPER_ADMIN_CREATE_COMPANY'
  | 'SUPER_ADMIN_COMPANY_DETAILS'
  | 'SUPER_ADMIN_USERS'
  | 'SUPER_ADMIN_PENDING_APPROVALS'
  | 'SUPER_ADMIN_MODULES';

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
