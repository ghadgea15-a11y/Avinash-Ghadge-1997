import { Network, 
  LayoutDashboard, 
  Building2, 
  MapPin, 
  Users, 
  IdCard, 
  GraduationCap, 
  ShieldAlert, 
  Award, Target, 
  Calendar, 
  Clock, 
  ListTodo, 
  ShieldCheck, 
  QrCode, 
  Boxes, 
  DollarSign, 
  ShoppingCart, 
  FileSignature, 
  Receipt, 
  Briefcase, 
  Scale, 
  CheckSquare, 
  BarChart3, 
  Bell, 
  Megaphone, 
  Shield, 
  Settings, 
  PlusCircle, 
  Layers, 
  UserCheck, 
  LifeBuoy, 
  FileText, 
  Lock,
  Compass,
  FolderKanban,
  FileSpreadsheet,
  History,
  Server,
  Fingerprint,
  Activity,
  Sliders,
  Radio,
  FileBarChart,
  UserCog,
  EyeOff
} from 'lucide-react';
import { PhaseAScreen, UserRole } from '../types';

export type NavigationCategory = 
  | 'DASHBOARD'
  | 'COMPANIES'
  | 'ORGANIZATION_MASTER'
  | 'PEOPLE_WORKFORCE'
  | 'OPERATIONS'
  | 'ASSETS_INVENTORY'
  | 'FINANCE'
  | 'PROCUREMENT'
  | 'CRM'
  | 'COMPLIANCE_RISK'
  | 'APPROVALS_WORKFLOWS'
  | 'REPORTS_ANALYTICS'
  | 'NOTIFICATIONS'
  | 'SECURITY_AUDIT'
  | 'SETTINGS';

export interface NavigationItemDef {
  screen: PhaseAScreen;
  label: string;
  shortLabel?: string;
  description: string;
  icon: any;
  category: NavigationCategory;
  dataType: 'MASTER_DATA' | 'TRANSACTION' | 'SYSTEM' | 'ANALYTICS';
  rolesAllowed?: UserRole[]; // If undefined, accessible to all authenticated roles
  isSuperAdminOnly?: boolean;
  badgeKey?: string;
}

export interface NavigationCategoryDef {
  id: NavigationCategory;
  number: number;
  title: string;
  description: string;
  icon: any;
  superAdminOnly?: boolean;
  tenantOnly?: boolean;
}

export const ENTERPRISE_NAV_CATEGORIES: NavigationCategoryDef[] = [
  {
    id: 'DASHBOARD',
    number: 1,
    title: 'Dashboard',
    description: 'Executive overview, real-time KPI metrics & active alerts',
    icon: LayoutDashboard,
  },
  {
    id: 'COMPANIES',
    number: 2,
    title: 'Companies & Tenants',
    description: 'Multi-tenant provisioning, subscription tiers & module licensing',
    icon: Building2,
  },
  {
    id: 'ORGANIZATION_MASTER',
    number: 3,
    title: 'Organization Master',
    description: 'Branches, sites, departments, designations & shift master definitions',
    icon: MapPin,
  },
  {
    id: 'PEOPLE_WORKFORCE',
    number: 4,
    title: 'People / Workforce',
    description: 'HCM staff directory, ID badges, ATS recruiting & LMS training',
    icon: Users,
  },
  {
    id: 'OPERATIONS',
    number: 5,
    title: 'Operations',
    description: 'Daily muster, attendance, roster, work orders & guard patrol',
    icon: ShieldCheck,
  },
  {
    id: 'ASSETS_INVENTORY',
    number: 6,
    title: 'Assets & Inventory',
    description: 'EAM asset lifecycle tracking & SCM warehouse inventory control',
    icon: Boxes,
  },
  {
    id: 'FINANCE',
    number: 7,
    title: 'Finance',
    description: 'ERP payroll, salary registers, PF/ESI compliance & billing',
    icon: DollarSign,
  },
  {
    id: 'PROCUREMENT',
    number: 8,
    title: 'Procurement',
    description: 'SRM vendor directory, RFQ bidding, PO issuance & 3-way invoice match',
    icon: ShoppingCart,
  },
  {
    id: 'CRM',
    number: 9,
    title: 'CRM & Client Accounts',
    description: 'Client contracts, post mapping, billing rates & business leads',
    icon: Briefcase,
  },
  {
    id: 'COMPLIANCE_RISK',
    number: 10,
    title: 'Compliance & Risk',
    description: 'GRC statutory compliance, audit registers & legal policies',
    icon: Scale,
  },
  {
    id: 'APPROVALS_WORKFLOWS',
    number: 11,
    title: 'Approvals & Workflows',
    description: 'BPM approval inbox, multi-tier authorizations & delegations',
    icon: CheckSquare,
  },
  {
    id: 'REPORTS_ANALYTICS',
    number: 12,
    title: 'Reports & Analytics',
    description: 'Operational BI analytics, muster summaries & statutory exports',
    icon: BarChart3,
  },
  {
    id: 'NOTIFICATIONS',
    number: 13,
    title: 'Notifications',
    description: 'System alerts, broadcast announcements & role-based notifications',
    icon: Bell,
  },
  {
    id: 'SECURITY_AUDIT',
    number: 14,
    title: 'Security & Audit',
    description: 'Immutable audit logs, session controls & TOTP 2FA authentication',
    icon: Shield,
  },
  {
    id: 'SETTINGS',
    number: 15,
    title: 'Settings',
    description: 'Tenant organization settings, diagnostic cache & device preferences',
    icon: Settings,
  },
];

export const ENTERPRISE_NAV_ITEMS: NavigationItemDef[] = [
  // 1. DASHBOARD
  {
    screen: 'SUPER_ADMIN_DASHBOARD',
    label: 'Dashboard',
    shortLabel: 'Overview',
    description: 'Multi-tenant cloud platform analytics and system health metrics',
    icon: LayoutDashboard,
    category: 'DASHBOARD',
    dataType: 'ANALYTICS',
    isSuperAdminOnly: true,
  },
  {
    screen: 'ENTERPRISE_DASHBOARD',
    label: 'Dashboard',
    shortLabel: 'Dashboard',
    description: 'Real-time operational KPIs, active muster metrics and pending tasks',
    icon: LayoutDashboard,
    category: 'DASHBOARD',
    dataType: 'ANALYTICS',
    rolesAllowed: ['COMPANY_ADMIN', 'HR_ADMIN', 'OPS_MANAGER', 'SUPERVISOR', 'GUARD', 'EMPLOYEE', 'OWNER_PROMOTER', 'DIRECTOR_CEO', 'GENERAL_MANAGER', 'REGIONAL_MANAGER', 'AREA_MANAGER', 'SITE_IN_CHARGE', 'HR', 'FINANCE', 'ADMIN', 'PROCUREMENT', 'EHS', 'QUALITY', 'COMMERCIAL', 'MIS', 'CLIENT_MANAGEMENT', 'IT', 'OPERATIONS_OFFICE'],
  },
  {
    screen: 'ANNOUNCEMENTS',
    label: 'Announcements',
    shortLabel: 'Broadcasts',
    description: 'Company-wide notices, safety bulletins and emergency advisories',
    icon: Megaphone,
    category: 'DASHBOARD',
    dataType: 'SYSTEM',
  },

  // 2. COMPANIES
  {
    screen: 'SUPER_ADMIN_COMPANIES',
    label: 'Companies',
    shortLabel: 'Tenants',
    description: 'List and manage all onboarded enterprise tenant organizations',
    icon: Building2,
    category: 'COMPANIES',
    dataType: 'MASTER_DATA',
    isSuperAdminOnly: true,
  },
  {
    screen: 'SUPER_ADMIN_CREATE_COMPANY',
    label: 'Add Company',
    shortLabel: 'New Tenant',
    description: 'Step-by-step company registration, initial admin setup and licensing',
    icon: PlusCircle,
    category: 'COMPANIES',
    dataType: 'MASTER_DATA',
    isSuperAdminOnly: true,
  },
  {
    screen: 'SUPER_ADMIN_SUBSCRIPTIONS',
    label: 'Subscription Plans',
    shortLabel: 'Plans',
    description: 'Tiered SaaS packages, feature limits, quotas and pricing rules',
    icon: Award,
    category: 'COMPANIES',
    dataType: 'MASTER_DATA',
    isSuperAdminOnly: true,
  },
  {
    screen: 'SUPER_ADMIN_MODULES',
    label: 'Entitlements',
    shortLabel: 'Modules',
    description: 'Enable or restrict enterprise modules per client contract',
    icon: Layers,
    category: 'COMPANIES',
    dataType: 'SYSTEM',
    isSuperAdminOnly: true,
  },
  {
    screen: 'SUPER_ADMIN_SUPPORT',
    label: 'Support Access',
    shortLabel: 'Support Access',
    description: 'Time-bounded, auditable support sessions for tenant troubleshooting',
    icon: LifeBuoy,
    category: 'COMPANIES',
    dataType: 'SYSTEM',
    isSuperAdminOnly: true,
  },
  {
    screen: 'COMPANY_BILLING',
    label: 'Billing',
    shortLabel: 'Billing',
    description: 'Tenant billing details, payment methods, renewal history and invoices',
    icon: Receipt,
    category: 'COMPANIES',
    dataType: 'TRANSACTION',
    rolesAllowed: ['COMPANY_ADMIN', 'OWNER_PROMOTER', 'DIRECTOR_CEO', 'FINANCE_MANAGER', 'FINANCE'],
  },

  // 3. ORGANIZATION MASTER
  {
    screen: 'COMPANY_MANAGEMENT',
    label: 'Organization',
    shortLabel: 'Org Master',
    description: 'Configure company profile, legal entities, branches, sites and departments',
    icon: Building2,
    category: 'ORGANIZATION_MASTER',
    dataType: 'MASTER_DATA',
  },
  {
    screen: 'ORG_CONTROL',
    label: 'Assignments',
    shortLabel: 'Org Control',
    description: 'Manage hierarchy assignments, transfers, and integrity',
    icon: Network,
    category: 'ORGANIZATION_MASTER',
    dataType: 'MASTER_DATA',
    rolesAllowed: ['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER_PROMOTER', 'DIRECTOR_CEO', 'GENERAL_MANAGER', 'ADMIN', 'HR_ADMIN'],
  },
  {
    screen: 'DEPLOYMENT_MANAGEMENT',
    label: 'Sites & Posts',
    shortLabel: 'Sites / Posts',
    description: 'Geofenced client locations, post requirements and duty allocations',
    icon: MapPin,
    category: 'ORGANIZATION_MASTER',
    dataType: 'MASTER_DATA',
    rolesAllowed: ['SUPER_ADMIN', 'COMPANY_ADMIN', 'OPS_MANAGER', 'AREA_MANAGER', 'REGIONAL_MANAGER', 'SITE_IN_CHARGE'],
  },

  // 4. PEOPLE / WORKFORCE
  {
    screen: 'EMPLOYEES',
    label: 'Employees',
    shortLabel: 'Staff Directory',
    description: 'Complete employee lifecycle, biometric records, KYC and contacts',
    icon: Users,
    category: 'PEOPLE_WORKFORCE',
    dataType: 'MASTER_DATA',
    rolesAllowed: ['SUPER_ADMIN', 'COMPANY_ADMIN', 'HR_ADMIN', 'OPS_MANAGER', 'HR', 'GENERAL_MANAGER', 'ADMIN'],
  },
  {
    screen: 'ID_BADGES',
    label: 'ID Badges',
    shortLabel: 'ID Badges',
    description: 'Digital Smart QR badges, print passes and physical badge issuance',
    icon: IdCard,
    category: 'PEOPLE_WORKFORCE',
    dataType: 'MASTER_DATA',
    rolesAllowed: ['SUPER_ADMIN', 'COMPANY_ADMIN', 'HR_ADMIN', 'ADMIN', 'SAFETY_OFFICER'],
  },
  {
    screen: 'TALENT_ACQUISITION',
    label: 'Recruitment',
    shortLabel: 'Recruit ATS',
    description: 'Job requisitions, applicant pipeline, candidate scoring and offer generation',
    icon: UserCheck,
    category: 'PEOPLE_WORKFORCE',
    dataType: 'TRANSACTION',
    rolesAllowed: ['SUPER_ADMIN', 'COMPANY_ADMIN', 'HR_ADMIN', 'HR'],
  },
  {
    screen: 'PERFORMANCE_MANAGEMENT',
    label: 'Performance (PMS)',
    shortLabel: 'Performance',
    description: 'Goals, OKRs, 360 appraisal cycles, rating calibration and PIP tracking',
    icon: Target,
    category: 'PEOPLE_WORKFORCE',
    dataType: 'TRANSACTION',
    rolesAllowed: ['SUPER_ADMIN', 'COMPANY_ADMIN', 'HR_ADMIN', 'OPS_MANAGER', 'HR', 'GENERAL_MANAGER', 'ADMIN', 'OWNER_PROMOTER', 'DIRECTOR_CEO', 'SUPERVISOR', 'SITE_IN_CHARGE', 'REGIONAL_MANAGER', 'AREA_MANAGER', 'EMPLOYEE', 'GUARD', 'WORKER'],
  },
  {
    screen: 'TALENT_MANAGEMENT',
    label: 'Talent & Succession',
    shortLabel: 'Talent Suite',
    description: '9-Box succession planning, skills matrix, digital offer letters, Kirkpatrick training ROI and rewards wallet',
    icon: Award,
    category: 'PEOPLE_WORKFORCE',
    dataType: 'TRANSACTION',
    rolesAllowed: ['SUPER_ADMIN', 'COMPANY_ADMIN', 'HR_ADMIN', 'OPS_MANAGER', 'HR', 'GENERAL_MANAGER', 'ADMIN', 'OWNER_PROMOTER', 'DIRECTOR_CEO', 'SUPERVISOR', 'SITE_IN_CHARGE', 'REGIONAL_MANAGER', 'AREA_MANAGER'],
  },
  {
    screen: 'TRAINING_LMS',
    label: 'Training',
    shortLabel: 'LMS Training',
    description: 'PSARA compliance curriculum, training modules, quizzes and tracking',
    icon: GraduationCap,
    category: 'PEOPLE_WORKFORCE',
    dataType: 'MASTER_DATA',
  },
  {
    screen: 'MANDATORY_REFRESHERS',
    label: 'Refreshers',
    shortLabel: 'Refreshers',
    description: 'Mandatory annual safety, fire drill and SOP refreshers schedule',
    icon: ShieldAlert,
    category: 'PEOPLE_WORKFORCE',
    dataType: 'TRANSACTION',
  },
  {
    screen: 'CERTIFICATION_TRACKING',
    label: 'Certifications',
    shortLabel: 'Certifications',
    description: 'PSARA licenses, First Aid, Fire Safety certificates and renewal alerts',
    icon: Award,
    category: 'PEOPLE_WORKFORCE',
    dataType: 'MASTER_DATA',
  },

  // 5. OPERATIONS
  {
    screen: 'ATTENDANCE_SHIFTS',
    label: 'Attendance',
    shortLabel: 'Attendance',
    description: 'Geo-verified punches, biometric facial scans and live muster check-in',
    icon: Clock,
    category: 'OPERATIONS',
    dataType: 'TRANSACTION',
  },
  {
    screen: 'SHIFT_ROSTER',
    label: 'Roster',
    shortLabel: 'Shift Roster',
    description: 'Monthly and weekly shift scheduling matrix, rotations and swaps',
    icon: Calendar,
    category: 'OPERATIONS',
    dataType: 'MASTER_DATA',
    rolesAllowed: ['SUPER_ADMIN', 'COMPANY_ADMIN', 'OPS_MANAGER', 'HR_ADMIN', 'SUPERVISOR', 'SITE_IN_CHARGE'],
  },
  {
    screen: 'WORKFORCE_CAPACITY',
    label: 'Capacity',
    shortLabel: 'Capacity Planning',
    description: 'Predictive shortage detection, skill floors, supervisor alerts & replacement approval workflow',
    icon: Network,
    category: 'OPERATIONS',
    dataType: 'ANALYTICS',
    rolesAllowed: ['SUPER_ADMIN', 'COMPANY_ADMIN', 'OPS_MANAGER', 'HR_ADMIN', 'SUPERVISOR', 'SITE_IN_CHARGE', 'GENERAL_MANAGER', 'REGIONAL_MANAGER', 'AREA_MANAGER'],
  },
  {
    screen: 'CONFLICT_DETECTION',
    label: 'Conflict Checks',
    shortLabel: 'Conflict Engine',
    description: 'Deterministic prevention of overlapping shifts, multi-site collisions, SoD violations & controlled overrides',
    icon: ShieldAlert,
    category: 'OPERATIONS',
    dataType: 'TRANSACTION',
    rolesAllowed: ['SUPER_ADMIN', 'COMPANY_ADMIN', 'OPS_MANAGER', 'HR_ADMIN', 'SUPERVISOR', 'SITE_IN_CHARGE', 'GENERAL_MANAGER', 'REGIONAL_MANAGER', 'AREA_MANAGER'],
  },
  {
    screen: 'LEAVE_MANAGEMENT',
    label: 'Leave',
    shortLabel: 'Leaves',
    description: 'Leave request applications, approval workflows and accrual balances',
    icon: Calendar,
    category: 'OPERATIONS',
    dataType: 'TRANSACTION',
  },
  {
    screen: 'WORK_ORDERS',
    label: 'Work Orders',
    shortLabel: 'Work Orders',
    description: 'Dispatch tickets, maintenance tasks, SLAs and field repair progress',
    icon: ListTodo,
    category: 'OPERATIONS',
    dataType: 'TRANSACTION',
  },
  {
    screen: 'TASK_MANAGEMENT',
    label: 'Tasks',
    shortLabel: 'Tasks',
    description: 'Organizational task allocation, Kanban boards and status milestones',
    icon: CheckSquare,
    category: 'OPERATIONS',
    dataType: 'TRANSACTION',
  },
  {
    screen: 'MY_TASKS',
    label: 'My Tasks',
    shortLabel: 'My Tasks',
    description: 'Individual employee task checklist, checklists and daily activities',
    icon: CheckSquare,
    category: 'OPERATIONS',
    dataType: 'TRANSACTION',
  },
  {
    screen: 'SITE_OPERATIONS',
    label: 'Operations',
    shortLabel: 'Site Ops',
    description: 'QR checkpoint patrols, Incident reporting, Visitor gate pass & Material muster',
    icon: ShieldCheck,
    category: 'OPERATIONS',
    dataType: 'TRANSACTION',
  },
  {
    screen: 'SAFETY_MANAGEMENT',
    label: 'Inspections',
    shortLabel: 'Safety Checks',
    description: 'EHS hazard inspections, equipment checks and safety protocol audits',
    icon: ShieldAlert,
    category: 'OPERATIONS',
    dataType: 'TRANSACTION',
  },
  {
    screen: 'CLIENT_PORTAL',
    label: 'Client Portal',
    shortLabel: 'Client Portal',
    description: 'Real-time live attendance, patrol verification transparency, invoice viewer and SLA metrics',
    icon: Building2,
    category: 'OPERATIONS',
    dataType: 'TRANSACTION',
  },
  {
    screen: 'MULTI_MODE_PATROL',
    label: 'Multi-Mode Patrols',
    shortLabel: 'NFC/QR Patrols',
    description: 'Hardware NFC UID, dynamic QR tokens & GPS geofencing with cryptographic HMAC proof-of-presence',
    icon: ShieldCheck,
    category: 'OPERATIONS',
    dataType: 'TRANSACTION',
  },
  {
    screen: 'AI_SCHEDULING',
    label: 'AI Scheduling & Relievers',
    shortLabel: 'AI Relievers',
    description: 'Transparent rule-based scoring (fatigue index, transit distance, absenteeism) and auto-reliever dispatch',
    icon: Activity,
    category: 'OPERATIONS',
    dataType: 'TRANSACTION',
  },

  // 6. ASSETS & INVENTORY
  {
    screen: 'ASSET_TRACKING',
    label: 'Assets',
    shortLabel: 'Asset Register',
    description: 'Fixed assets register, QR tracking, custodian assignment and maintenance history',
    icon: QrCode,
    category: 'ASSETS_INVENTORY',
    dataType: 'MASTER_DATA',
  },
  {
    screen: 'INVENTORY_STOCK',
    label: 'Inventory',
    shortLabel: 'Stock & Items',
    description: 'Uniforms, gear, spare parts, GRN receipt and warehouse stock ledger',
    icon: Boxes,
    category: 'ASSETS_INVENTORY',
    dataType: 'TRANSACTION',
  },

  // 7. FINANCE
  {
    screen: 'PAYROLL_COMPENSATION',
    label: 'Payroll',
    shortLabel: 'Payroll',
    description: 'Salary structures, wage registers, statutory PF/ESI/PT deductions and payslips',
    icon: DollarSign,
    category: 'FINANCE',
    dataType: 'TRANSACTION',
    rolesAllowed: ['SUPER_ADMIN', 'COMPANY_ADMIN', 'HR_ADMIN', 'FINANCE_MANAGER', 'FINANCE', 'OWNER_PROMOTER'],
  },
  {
    screen: 'EXPENSE_TRAVEL',
    label: 'Expenses & Travel',
    shortLabel: 'Expense Claims',
    description: 'AI receipt OCR scanner, travel pre-authorization and reimbursement approval workflows',
    icon: Receipt,
    category: 'FINANCE',
    dataType: 'TRANSACTION',
  },
  {
    screen: 'CLIENT_BILLING',
    label: 'Client Billing & Contracts',
    shortLabel: 'Billing & Contracts',
    description: 'Contract profitability, versioned rate cards, idempotent invoicing and SLA shortfall penalties',
    icon: FileText,
    category: 'FINANCE',
    dataType: 'TRANSACTION',
    rolesAllowed: ['SUPER_ADMIN', 'COMPANY_ADMIN', 'FINANCE_MANAGER', 'FINANCE', 'OWNER_PROMOTER'],
  },


  // 8. PROCUREMENT
  {
    screen: 'PROCUREMENT_SRM',
    label: 'Procurement',
    shortLabel: 'Procurement Hub',
    description: 'Supplier relationship overview, requisition analytics and spend dashboards',
    icon: ShoppingCart,
    category: 'PROCUREMENT',
    dataType: 'ANALYTICS',
    rolesAllowed: ['SUPER_ADMIN', 'COMPANY_ADMIN', 'PROCUREMENT', 'FINANCE_MANAGER', 'FINANCE', 'ADMIN'],
  },
  {
    screen: 'VENDOR_MANAGEMENT',
    label: 'Vendors',
    shortLabel: 'Vendors',
    description: 'Vendor master register, onboarding documents, tax compliance and ratings',
    icon: Building2,
    category: 'PROCUREMENT',
    dataType: 'MASTER_DATA',
    rolesAllowed: ['SUPER_ADMIN', 'COMPANY_ADMIN', 'PROCUREMENT', 'ADMIN', 'FINANCE'],
  },
  {
    screen: 'RFQ_MANAGEMENT',
    label: 'Quotations',
    shortLabel: 'RFQs & Bids',
    description: 'Request for quotation tenders, supplier bid comparison and awards',
    icon: FileSignature,
    category: 'PROCUREMENT',
    dataType: 'TRANSACTION',
    rolesAllowed: ['SUPER_ADMIN', 'COMPANY_ADMIN', 'PROCUREMENT', 'ADMIN'],
  },
  {
    screen: 'PURCHASE_ORDERS',
    label: 'Purchase Orders',
    shortLabel: 'Purchase Orders',
    description: 'PO creation, line-item specs, approval workflows and supplier dispatch',
    icon: ShoppingCart,
    category: 'PROCUREMENT',
    dataType: 'TRANSACTION',
    rolesAllowed: ['SUPER_ADMIN', 'COMPANY_ADMIN', 'PROCUREMENT', 'FINANCE_MANAGER', 'ADMIN'],
  },
  {
    screen: 'THREE_WAY_MATCH',
    label: 'Invoices',
    shortLabel: '3-Way Match',
    description: 'PO, Goods Receipt (GRN) and Vendor Invoice verification audit',
    icon: Receipt,
    category: 'PROCUREMENT',
    dataType: 'TRANSACTION',
    rolesAllowed: ['SUPER_ADMIN', 'COMPANY_ADMIN', 'PROCUREMENT', 'FINANCE_MANAGER', 'FINANCE'],
  },

  // 9. CRM
  {
    screen: 'CLIENT_MANAGEMENT',
    label: 'Clients',
    shortLabel: 'Clients & Contracts',
    description: 'Client master, service contracts, billing rates and SLA agreements',
    icon: Briefcase,
    category: 'CRM',
    dataType: 'MASTER_DATA',
    rolesAllowed: ['SUPER_ADMIN', 'COMPANY_ADMIN', 'CLIENT_MANAGEMENT', 'COMMERCIAL', 'OPS_MANAGER', 'OWNER_PROMOTER'],
  },
  {
    screen: 'SUPER_ADMIN_LEADS',
    label: 'Sales Pipeline',
    shortLabel: 'Lead Pipeline',
    description: 'Enterprise inquiry tracking, demo scheduling and tenant onboarding conversion',
    icon: UserCheck,
    category: 'CRM',
    dataType: 'TRANSACTION',
    isSuperAdminOnly: true,
  },

  // 10. COMPLIANCE & RISK
  {
    screen: 'COMPLIANCE',
    label: 'Compliance',
    shortLabel: 'GRC Dashboard',
    description: 'Labor law registers, minimum wage compliance, PF/ESIC returns and audits',
    icon: Scale,
    category: 'COMPLIANCE_RISK',
    dataType: 'ANALYTICS',
    rolesAllowed: ['SUPER_ADMIN', 'COMPANY_ADMIN', 'HR_ADMIN', 'EHS', 'QUALITY', 'ADMIN'],
  },
  {
    screen: 'DOCUMENT_LIFECYCLE',
    label: 'Documents',
    shortLabel: 'Document Lifecycle',
    description: 'Statutory licenses, contracts, compliance certificates & renewal workflows',
    icon: FileSpreadsheet,
    category: 'COMPLIANCE_RISK',
    dataType: 'TRANSACTION',
    rolesAllowed: ['SUPER_ADMIN', 'COMPANY_ADMIN', 'HR_ADMIN', 'FINANCE_MANAGER', 'QUALITY', 'ADMIN', 'OWNER_PROMOTER', 'DIRECTOR_CEO'],
  },
  {
    screen: 'COMPLIANCE_EXPIRY',
    label: 'Licensing & Expiries',
    shortLabel: 'PSARA & Expiry',
    description: 'Statutory guard licensing (PSARA, Arms, Police Verification) with 30/15/7-day alerts and shift blocking',
    icon: Shield,
    category: 'COMPLIANCE_RISK',
    dataType: 'TRANSACTION',
  },
  {
    screen: 'LEGAL_POLICIES',
    label: 'Policies',
    shortLabel: 'Legal & Privacy',
    description: 'DPDP Act data privacy, confidentiality agreements and terms of service',
    icon: FileText,
    category: 'COMPLIANCE_RISK',
    dataType: 'SYSTEM',
  },

  // 11. APPROVALS & WORKFLOWS
  {
    screen: 'APPROVAL_MANAGEMENT',
    label: 'My Approvals',
    shortLabel: 'Approvals Inbox',
    description: 'Centralized workflow approval queue for leaves, expenses, overtime and onboarding',
    icon: CheckSquare,
    category: 'APPROVALS_WORKFLOWS',
    dataType: 'TRANSACTION',
    rolesAllowed: ['SUPER_ADMIN', 'COMPANY_ADMIN', 'HR_ADMIN', 'OPS_MANAGER', 'FINANCE_MANAGER', 'SUPERVISOR', 'OWNER_PROMOTER', 'GENERAL_MANAGER', 'SITE_IN_CHARGE'],
  },
  {
    screen: 'APPROVAL_CENTER',
    label: 'Approvals Center',
    shortLabel: 'BPM Rules',
    description: 'Configurable multi-level approval hierarchies, delegation and escalations',
    icon: Award,
    category: 'APPROVALS_WORKFLOWS',
    dataType: 'SYSTEM',
    rolesAllowed: ['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER_PROMOTER', 'ADMIN'],
  },
  {
    screen: 'SUPER_ADMIN_PENDING_APPROVALS',
    label: 'Global Approvals',
    shortLabel: 'Global Approvals',
    description: 'Super Admin approval inbox for new tenant registrations and global requests',
    icon: UserCheck,
    category: 'APPROVALS_WORKFLOWS',
    dataType: 'TRANSACTION',
    isSuperAdminOnly: true,
  },

  // 12. REPORTS & ANALYTICS
  {
    screen: 'SUPER_ADMIN_REPORTS',
    label: 'Analytics',
    shortLabel: 'Platform BI',
    description: 'Multi-tenant licensing analytics, module adoption and platform usage reports',
    icon: FileBarChart,
    category: 'REPORTS_ANALYTICS',
    dataType: 'ANALYTICS',
    isSuperAdminOnly: true,
  },
  {
    screen: 'OPERATIONAL_INTELLIGENCE',
    label: 'Intelligence',
    shortLabel: 'Ops Intelligence',
    description: 'Hierarchical cost, overtime, maintenance, procurement & risk anomaly detection',
    icon: BarChart3,
    category: 'REPORTS_ANALYTICS',
    dataType: 'ANALYTICS',
    rolesAllowed: ['SUPER_ADMIN', 'COMPANY_ADMIN', 'FINANCE_MANAGER', 'OPS_MANAGER', 'OWNER_PROMOTER', 'DIRECTOR_CEO', 'GENERAL_MANAGER', 'REGIONAL_MANAGER', 'AREA_MANAGER'],
  },
  {
    screen: 'REPORTS_ANALYTICS',
    label: 'Reports',
    shortLabel: 'BI Reports',
    description: 'Muster registers, payroll summaries, incident analytics and PDF/Excel downloads',
    icon: BarChart3,
    category: 'REPORTS_ANALYTICS',
    dataType: 'ANALYTICS',
  },
  {
    screen: 'SERVICE_DESK',
    label: 'Service Desk',
    shortLabel: 'Service Desk',
    description: 'Internal ticketing, incident resolution timelines and client satisfaction metrics',
    icon: LifeBuoy,
    category: 'REPORTS_ANALYTICS',
    dataType: 'TRANSACTION',
  },

  // 13. NOTIFICATIONS
  {
    screen: 'NOTIFICATIONS',
    label: 'Notifications',
    shortLabel: 'Notifications',
    description: 'Real-time push alerts, duty reminders and system event feed',
    icon: Bell,
    category: 'NOTIFICATIONS',
    dataType: 'SYSTEM',
    badgeKey: 'unreadNotifCount',
  },

  // 14. SECURITY & AUDIT
  {
    screen: 'SUPER_ADMIN_ADMINS',
    label: 'Admins',
    shortLabel: 'Platform Admins',
    description: 'Manage platform Super Admins, Support Auditors and Platform Ops users',
    icon: UserCog,
    category: 'SECURITY_AUDIT',
    dataType: 'SYSTEM',
    isSuperAdminOnly: true,
  },
  {
    screen: 'SUPER_ADMIN_SECURITY',
    label: 'Security',
    shortLabel: 'Platform Security',
    description: 'Custom claims enforcement, security anomaly feed and access audit',
    icon: ShieldAlert,
    category: 'SECURITY_AUDIT',
    dataType: 'SYSTEM',
    isSuperAdminOnly: true,
  },
  {
    screen: 'SUPER_ADMIN_AUDIT',
    label: 'Audit Log',
    shortLabel: 'Platform Audit',
    description: 'Cryptographically ordered platform mutation logs with before/after diffs',
    icon: History,
    category: 'SECURITY_AUDIT',
    dataType: 'SYSTEM',
    isSuperAdminOnly: true,
  },
  {
    screen: 'SUPER_ADMIN_MONITORING',
    label: 'Health',
    shortLabel: 'Telemetry',
    description: 'Live latency tests, Firestore health, error rates and cloud storage status',
    icon: Activity,
    category: 'SECURITY_AUDIT',
    dataType: 'SYSTEM',
    isSuperAdminOnly: true,
  },
  {
    screen: 'SETUP_AUDIT',
    label: 'Setup Cross-Check',
    shortLabel: 'Setup Audit',
    description: 'Verify hierarchy, accounts, claims, and organization completeness',
    icon: ShieldCheck,
    category: 'SECURITY_AUDIT',
    dataType: 'SYSTEM',
    rolesAllowed: ['SUPER_ADMIN', 'COMPANY_ADMIN'],
  },
  {
    screen: 'HISTORICAL_TRACEABILITY',
    label: 'Traceability',
    shortLabel: 'Traceability',
    description: 'Reconstruct complete immutable timelines for Employees, Sites, Contracts, Assets and Transactions',
    icon: History,
    category: 'SECURITY_AUDIT',
    dataType: 'SYSTEM',
    rolesAllowed: ['SUPER_ADMIN', 'COMPANY_ADMIN', 'HR_ADMIN', 'FINANCE_MANAGER', 'OPS_MANAGER', 'QUALITY', 'ADMIN', 'OWNER_PROMOTER', 'DIRECTOR_CEO'],
  },
  {
    screen: 'SCALABILITY_ASSESSMENT',
    label: 'Scalability',
    shortLabel: '500-Site Scale',
    description: 'Real 500-site and 50k-workforce scalability assessment, load benchmarking, and bottleneck fixes',
    icon: Server,
    category: 'SECURITY_AUDIT',
    dataType: 'SYSTEM',
    rolesAllowed: ['SUPER_ADMIN', 'COMPANY_ADMIN', 'HR_ADMIN', 'OPS_MANAGER', 'ADMIN', 'OWNER_PROMOTER', 'DIRECTOR_CEO'],
  },
  {
    screen: 'PROFILE',
    label: 'MFA Setup',
    shortLabel: 'Security & Profile',
    description: 'KYC identity details, emergency contacts and RFC 6238 2FA setup',
    icon: Lock,
    category: 'SECURITY_AUDIT',
    dataType: 'SYSTEM',
  },
  {
    screen: 'SESSION_LOCK',
    label: 'Lock Session',
    shortLabel: 'Lock Screen',
    description: 'Quick-lock terminal to prevent unauthorized workstation access',
    icon: Lock,
    category: 'SECURITY_AUDIT',
    dataType: 'SYSTEM',
  },

  // 15. SETTINGS
  {
    screen: 'SUPER_ADMIN_CONFIG',
    label: 'Settings',
    shortLabel: 'Global Config',
    description: 'Multi-tenant global parameters, maintenance mode & feature flags',
    icon: Sliders,
    category: 'SETTINGS',
    dataType: 'SYSTEM',
    isSuperAdminOnly: true,
  },
  {
    screen: 'BIOMETRIC_DEVICES',
    label: 'Biometrics',
    shortLabel: 'Biometrics',
    description: '1-Minute zero-config IT auto-connect for ZKTeco, eSSL, Hikvision and RFID machines',
    icon: Fingerprint,
    category: 'SETTINGS',
    dataType: 'SYSTEM',
    rolesAllowed: ['SUPER_ADMIN', 'COMPANY_ADMIN', 'HR_ADMIN', 'OPS_MANAGER', 'ADMIN', 'IT', 'OWNER_PROMOTER', 'DIRECTOR_CEO'],
  },
  {
    screen: 'ENTERPRISE_INTEGRATIONS',
    label: 'APIs & Webhooks',
    shortLabel: 'Integrations',
    description: 'REST API keys, outbound webhooks, SAML/OIDC SSO and Tally ERP connectors',
    icon: Sliders,
    category: 'SETTINGS',
    dataType: 'SYSTEM',
    rolesAllowed: ['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER_PROMOTER', 'DIRECTOR_CEO', 'IT', 'ADMIN'],
  },
  {
    screen: 'SETTINGS',
    label: 'Settings',
    shortLabel: 'Settings',
    description: 'Storage quota, offline sync queue, theme configuration and system diagnostics',
    icon: Settings,
    category: 'SETTINGS',
    dataType: 'SYSTEM',
  },
];

/**
 * Filter navigation items based on the active user role and whether user is Super Admin
 */
export function getNavItemsForRole(
  role: UserRole | string | undefined,
  isSuperAdmin: boolean
): NavigationItemDef[] {
  return ENTERPRISE_NAV_ITEMS.filter((item) => {
    if (isSuperAdmin) {
      return item.isSuperAdminOnly === true || item.screen === 'SETTINGS' || item.screen === 'PROFILE' || item.screen === 'SESSION_LOCK';
    }
    if (item.isSuperAdminOnly) {
      return false;
    }
    if (item.rolesAllowed && role) {
      return item.rolesAllowed.includes(role as UserRole);
    }
    return true;
  });
}

/**
 * Group accessible navigation items into the 15 enterprise categories
 */
export function getGroupedNavForRole(
  role: UserRole | string | undefined,
  isSuperAdmin: boolean
): { category: NavigationCategoryDef; items: NavigationItemDef[] }[] {
  const allowedItems = getNavItemsForRole(role, isSuperAdmin);

  return ENTERPRISE_NAV_CATEGORIES.map((cat) => {
    const items = allowedItems.filter((item) => item.category === cat.id);
    return { category: cat, items };
  }).filter((group) => group.items.length > 0);
}
