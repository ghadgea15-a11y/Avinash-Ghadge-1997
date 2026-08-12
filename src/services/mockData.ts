import { CompanyTenant, AppUpdateInfo, UserSession, UserRole } from '../types';

export const MOCK_TENANTS: Record<string, CompanyTenant> = {
  'APEX-SEC-101': {
    companyId: 'APEX-SEC-101',
    companyLegalName: 'Apex Security & Facility Management Pvt Ltd',
    brandName: 'Apex Security',
    licenseTier: 'ENTERPRISE',
    status: 'ACTIVE',
    primaryColorHex: '#4F46E5',
    secondaryColorHex: '#10B981',
    allowedBranches: ['MUMBAI_HO', 'PUNE_NORTH', 'DELHI_NCR', 'BANGALORE_CENTRAL'],
    maxEmployeesAllowed: 10000,
    maxSitesAllowed: 250
  },
  'LOG-MUSTER-001': {
    companyId: 'LOG-MUSTER-001',
    companyLegalName: 'Log Sheet Muster Internal Demo Corp',
    brandName: 'Log Sheet Muster',
    licenseTier: 'PROFESSIONAL',
    status: 'ACTIVE',
    primaryColorHex: '#2563EB',
    secondaryColorHex: '#F59E0B',
    allowedBranches: ['BRANCH_ALPHA', 'BRANCH_BETA', 'BRANCH_GAMMA'],
    maxEmployeesAllowed: 2500,
    maxSitesAllowed: 50
  },
  'GLOBAL-GUARD-01': {
    companyId: 'GLOBAL-GUARD-01',
    companyLegalName: 'Global Shield Force & Patrol Solutions',
    brandName: 'Global Shield Force',
    licenseTier: 'ENTERPRISE',
    status: 'ACTIVE',
    primaryColorHex: '#0D9488',
    secondaryColorHex: '#6366F1',
    allowedBranches: ['HYDERABAD_HQ', 'CHENNAI_PORT', 'KOLKATA_EAST'],
    maxEmployeesAllowed: 15000,
    maxSitesAllowed: 500
  }
};

export const MOCK_APP_UPDATE: AppUpdateInfo = {
  currentVersion: 'v1.0.0',
  latestVersion: 'v1.0.0', // change to v1.1.0 in testing if requested
  isMandatory: false,
  releaseNotes: [
    'Phase A: Enterprise Android Core Framework released',
    'Offline first company verification & biometric unlock engine',
    'Role-based dynamic Jetpack Compose adaptive navigation',
    'Encrypted session token manager & DataStore persistence'
  ],
  downloadUrl: 'https://play.google.com/store/apps/details?id=com.enterprise.logsheetmuster',
  releasedAt: '2026-07-26'
};

export const MOCK_USERS: Array<{
  email: string;
  pin: string;
  password: string;
  employeeId: string;
  fullName: string;
  role: UserRole;
  companyId: string;
  branchId: string;
  assignedSiteId?: string;
  avatarUrl: string;
}> = [
  {
    email: 'guard@apexsecurity.com',
    pin: '1234',
    password: 'password123',
    employeeId: 'EMP-G-8821',
    fullName: 'Ramesh Kumar (Security Guard)',
    role: 'GUARD',
    companyId: 'APEX-SEC-101',
    branchId: 'MUMBAI_HO',
    assignedSiteId: 'SITE-MUMBAI-T2-AIRPORT',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
  },
  {
    email: 'officer@apexsecurity.com',
    pin: '2345',
    password: 'password123',
    employeeId: 'EMP-FO-4012',
    fullName: 'Vikram Singh (Field Inspection Officer)',
    role: 'FIELD_OFFICER',
    companyId: 'APEX-SEC-101',
    branchId: 'MUMBAI_HO',
    assignedSiteId: 'REGION-MUMBAI-WEST',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80'
  },
  {
    email: 'ops@apexsecurity.com',
    pin: '3456',
    password: 'password123',
    employeeId: 'EMP-OPS-1002',
    fullName: 'Ananya Sharma (Operations Manager)',
    role: 'OPS_MANAGER',
    companyId: 'APEX-SEC-101',
    branchId: 'MUMBAI_HO',
    avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80'
  },
  {
    email: 'hr@apexsecurity.com',
    pin: '4567',
    password: 'password123',
    employeeId: 'EMP-HR-0034',
    fullName: 'Priya Verma (Senior HR Lead)',
    role: 'HR_ADMIN',
    companyId: 'APEX-SEC-101',
    branchId: 'MUMBAI_HO',
    avatarUrl: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80'
  },
  {
    email: 'admin@apexsecurity.com',
    pin: '5678',
    password: 'password123',
    employeeId: 'EMP-ADM-0001',
    fullName: 'Rajesh Ghadge (Company Admin / Director)',
    role: 'COMPANY_ADMIN',
    companyId: 'APEX-SEC-101',
    branchId: 'MUMBAI_HO',
    avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80'
  },
  {
    email: 'superadmin@logsheetmuster.com',
    pin: '9999',
    password: 'password123',
    employeeId: 'SUPER-0001',
    fullName: 'System Super Administrator',
    role: 'SUPER_ADMIN',
    companyId: 'LOG-MUSTER-001',
    branchId: 'BRANCH_ALPHA',
    avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80'
  }
];

export const MOCK_NOTIFICATIONS: import('../types').AppNotification[] = [
  {
    id: 'NOTIF-101',
    title: 'Urgent Patrol Alert',
    message: 'NFC Checkpoint #4 (Gate 2 West) missed during scheduled 03:00 AM round.',
    type: 'ALERT',
    timestamp: '10 mins ago',
    isRead: false,
    siteId: 'SITE-MUMBAI-T2-AIRPORT'
  },
  {
    id: 'NOTIF-102',
    title: 'Shift Assignment Updated',
    message: 'Morning Shift (06:00 AM - 02:00 PM) assigned for Terminal 2 Main Gate.',
    type: 'INFO',
    timestamp: '45 mins ago',
    isRead: false,
    actionRoute: 'ROLE_DASHBOARD'
  },
  {
    id: 'NOTIF-103',
    title: 'Offline Queue Synchronized',
    message: '14 pending local attendance logs successfully pushed to Firestore database.',
    type: 'SUCCESS',
    timestamp: '2 hours ago',
    isRead: true
  },
  {
    id: 'NOTIF-104',
    title: 'License Limit Warning',
    message: 'Site guard headcount reached 92% of max allowed quota (10,000 employees).',
    type: 'WARNING',
    timestamp: '5 hours ago',
    isRead: true,
    actionRoute: 'SETTINGS'
  }
];

export const MOCK_USER_PROFILE: import('../types').UserProfileData = {
  phoneNumber: '+91 98201 44512',
  emergencyContact: '+91 98201 00911 (Wife)',
  bloodGroup: 'O+ Positive',
  address: 'B-402, Highstreet Park, Off WE Highway, Andheri East, Mumbai 400069',
  kycStatus: 'VERIFIED',
  certifications: [
    'Aadhaar KYC Verified',
    'PSARA Guard Training Certified (Level 3)',
    'Fire Safety & First Aid Specialist',
    'NFC Patrol Terminal Handler'
  ],
  joinedDate: '15 March 2022',
  shiftSchedule: 'General Shift (08:00 AM - 08:00 PM)'
};

export const MOCK_SETTINGS: import('../types').AppSettings = {
  themeMode: 'DARK',
  notificationsEnabled: true,
  biometricUnlock: true,
  hapticFeedback: true,
  offlineAutoSync: true,
  defaultView: 'AUTO',
  language: 'English (US)',
  gpsTrackingHighAccuracy: true
};

export const MOCK_EMPLOYEES: import('../types').EmployeeRecord[] = [
  {
    id: 'EMP-G-8821',
    companyId: 'APEX-SEC-101',
    authUid: 'aB3x9kL2pQ8mZ1vN7cY5',
    firstName: 'Ramesh',
    lastName: 'Kumar',
    email: 'guard@apexsecurity.com',
    contactNumber: '+919820144512',
    dateOfBirth: '1992-08-14',
    bloodGroup: 'O+',
    gender: 'MALE',
    emergencyContact: {
      name: 'Sunita Kumar',
      relation: 'Spouse',
      phone: '+919820100911'
    },
    assignedRegionId: 'REG-WEST-MUMBAI',
    assignedBranchId: 'MUMBAI_HO',
    assignedSiteId: 'SITE-MUMBAI-T2-AIRPORT',
    departmentId: 'DPT-SECURITY',
    designation: 'Senior Security Guard',
    status: 'ACTIVE',
    joinedDate: '2022-03-15',
    profilePictureUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    role: 'GUARD',
    documents: [
      {
        id: 'DOC-101',
        type: 'AADHAR',
        documentNumber: '5412-8890-1234',
        fileUrl: 'https://placehold.co/400x250/1e293b/indigo?text=Aadhaar+KYC+Doc',
        status: 'VERIFIED',
        uploadedAt: '2022-03-15'
      },
      {
        id: 'DOC-102',
        type: 'POLICE_VERIFICATION',
        documentNumber: 'POL-MUM-88219',
        fileUrl: 'https://placehold.co/400x250/1e293b/indigo?text=Police+Clearance',
        status: 'VERIFIED',
        uploadedAt: '2022-03-16'
      }
    ],
    createdBy: 'EMP-HR-0034',
    createdAt: '2022-03-15T09:00:00Z',
    updatedAt: '2026-07-01T10:00:00Z'
  },
  {
    id: 'EMP-FO-4012',
    companyId: 'APEX-SEC-101',
    authUid: 'vK9mL2pQ8mZ1vN7cY5aB',
    firstName: 'Vikram',
    lastName: 'Singh',
    email: 'officer@apexsecurity.com',
    contactNumber: '+919876543210',
    dateOfBirth: '1988-11-22',
    bloodGroup: 'B+',
    gender: 'MALE',
    emergencyContact: {
      name: 'Rajni Singh',
      relation: 'Spouse',
      phone: '+919876543211'
    },
    assignedRegionId: 'REG-WEST-MUMBAI',
    assignedBranchId: 'MUMBAI_HO',
    assignedSiteId: 'REGION-MUMBAI-WEST',
    departmentId: 'DPT-INSPECTION',
    designation: 'Field Inspection Officer',
    status: 'ACTIVE',
    joinedDate: '2021-06-10',
    profilePictureUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    role: 'FIELD_OFFICER',
    documents: [
      {
        id: 'DOC-103',
        type: 'AADHAR',
        documentNumber: '9982-1123-4455',
        fileUrl: 'https://placehold.co/400x250/1e293b/indigo?text=Aadhaar+KYC+Doc',
        status: 'VERIFIED',
        uploadedAt: '2021-06-10'
      }
    ],
    createdBy: 'EMP-HR-0034',
    createdAt: '2021-06-10T10:00:00Z',
    updatedAt: '2026-07-01T10:00:00Z'
  },
  {
    id: 'EMP-OPS-1002',
    companyId: 'APEX-SEC-101',
    authUid: 'aN7cY5aB3x9kL2pQ8mZ1',
    firstName: 'Ananya',
    lastName: 'Sharma',
    email: 'ops@apexsecurity.com',
    contactNumber: '+919822233344',
    dateOfBirth: '1994-04-05',
    bloodGroup: 'A+',
    gender: 'FEMALE',
    emergencyContact: {
      name: 'Prakash Sharma',
      relation: 'Father',
      phone: '+919822233345'
    },
    assignedRegionId: 'REG-WEST-MUMBAI',
    assignedBranchId: 'MUMBAI_HO',
    assignedSiteId: 'SITE-HQ',
    departmentId: 'DPT-OPERATIONS',
    designation: 'Operations Manager',
    status: 'ACTIVE',
    joinedDate: '2020-01-10',
    profilePictureUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
    role: 'OPS_MANAGER',
    documents: [
      {
        id: 'DOC-104',
        type: 'PAN',
        documentNumber: 'ANP123456F',
        fileUrl: 'https://placehold.co/400x250/1e293b/indigo?text=PAN+Card',
        status: 'VERIFIED',
        uploadedAt: '2020-01-10'
      }
    ],
    createdBy: 'EMP-ADM-0001',
    createdAt: '2020-01-10T09:00:00Z',
    updatedAt: '2026-07-01T10:00:00Z'
  },
  {
    id: 'EMP-G-9020',
    companyId: 'APEX-SEC-101',
    firstName: 'Deepak',
    lastName: 'Patil',
    email: 'deepak.p@apexsecurity.com',
    contactNumber: '+919112233445',
    dateOfBirth: '1995-12-01',
    bloodGroup: 'AB+',
    gender: 'MALE',
    emergencyContact: {
      name: 'Suresh Patil',
      relation: 'Brother',
      phone: '+919112233446'
    },
    assignedRegionId: 'REG-WEST-MUMBAI',
    assignedBranchId: 'MUMBAI_HO',
    assignedSiteId: 'SITE-MUMBAI-T2-AIRPORT',
    departmentId: 'DPT-SECURITY',
    designation: 'Patrol Specialist',
    status: 'PENDING_VERIFICATION',
    joinedDate: '2026-07-20',
    profilePictureUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    role: 'GUARD',
    documents: [
      {
        id: 'DOC-105',
        type: 'AADHAR',
        documentNumber: '7766-5544-3322',
        fileUrl: 'https://placehold.co/400x250/1e293b/indigo?text=Aadhaar+Pending',
        status: 'PENDING',
        uploadedAt: '2026-07-20'
      }
    ],
    createdBy: 'EMP-FO-4012',
    createdAt: '2026-07-20T11:30:00Z',
    updatedAt: '2026-07-20T11:30:00Z'
  }
];
