export type UserRole = 
  | 'GUARD'
  | 'FIELD_OFFICER'
  | 'OPS_MANAGER'
  | 'HR_ADMIN'
  | 'COMPANY_ADMIN'
  | 'SUPER_ADMIN';

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
}

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
  loginMode: 'PASSWORD' | 'PIN' | 'BIOMETRIC';
}

export interface OfflineQueueItem {
  id: string;
  actionType: 'PUNCH_IN' | 'PUNCH_OUT' | 'PATROL_CHECK' | 'INCIDENT_REPORT' | 'VISITOR_LOG' | 'CREATE_EMPLOYEE' | 'UPDATE_EMPLOYEE_STATUS';
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
  profilePictureUrl?: string;
  role: UserRole;
  documents: EmployeeDocument[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export type PhaseAScreen = 
  | 'SPLASH'
  | 'UPDATE_CHECKER'
  | 'COMPANY_CODE'
  | 'LOGIN'
  | 'FORGOT_PASSWORD'
  | 'SESSION_LOCK'
  | 'ROLE_DASHBOARD'
  | 'EMPLOYEES'
  | 'PROFILE'
  | 'SETTINGS'
  | 'NOTIFICATIONS'
  | 'KOTLIN_CODE_VIEWER';

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
