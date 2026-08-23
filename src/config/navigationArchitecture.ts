import { 
  LayoutDashboard, 
  Building2, 
  MapPin, 
  Users, 
  IdCard, 
  GraduationCap, 
  ShieldAlert, 
  Award, 
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
  FileSpreadsheet
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
    label: 'Global Overview',
    shortLabel: 'Overview',
    description: 'Multi-tenant cloud platform analytics and system health metrics',
    icon: LayoutDashboard,
    category: 'DASHBOARD',
    dataType: 'ANALYTICS',
    isSuperAdminOnly: true,
  },
  {
    screen: 'ENTERPRISE_DASHBOARD',
    label: 'Enterprise Dashboard',
    shortLabel: 'Dashboard',
    description: 'Real-time operational KPIs, active muster metrics and pending tasks',
    icon: LayoutDashboard,
    category: 'DASHBOARD',
    dataType: 'ANALYTICS',
    rolesAllowed: ['COMPANY_ADMIN', 'HR_ADMIN', 'OPS_MANAGER', 'SUPERVISOR', 'GUARD', 'EMPLOYEE', 'OWNER_PROMOTER', 'DIRECTOR_CEO', 'GENERAL_MANAGER', 'REGIONAL_MANAGER', 'AREA_MANAGER', 'SITE_IN_CHARGE', 'HR', 'FINANCE', 'ADMIN', 'PROCUREMENT', 'EHS', 'QUALITY', 'COMMERCIAL', 'MIS', 'CLIENT_MANAGEMENT', 'IT', 'OPERATIONS_OFFICE'],
  },
  {
    screen: 'ANNOUNCEMENTS',
    label: 'Broadcast Announcements',
    shortLabel: 'Broadcasts',
    description: 'Company-wide notices, safety bulletins and emergency advisories',
    icon: Megaphone,
    category: 'DASHBOARD',
    dataType: 'SYSTEM',
  },

  // 2. COMPANIES
  {
    screen: 'SUPER_ADMIN_COMPANIES',
    label: 'Tenant Directory',
    shortLabel: 'Tenants',
    description: 'List and manage all onboarded enterprise tenant organizations',
    icon: Building2,
    category: 'COMPANIES',
    dataType: 'MASTER_DATA',
    isSuperAdminOnly: true,
  },
  {
    screen: 'SUPER_ADMIN_CREATE_COMPANY',
    label: 'Provision New Tenant',
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
    label: 'Module Entitlements',
    shortLabel: 'Modules',
    description: 'Enable or restrict enterprise modules per client contract',
    icon: Layers,
    category: 'COMPANIES',
    dataType: 'SYSTEM',
    isSuperAdminOnly: true,
  },
  {
    screen: 'COMPANY_BILLING',
    label: 'Subscription & Billing',
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
    label: 'Organization Master Setup',
    shortLabel: 'Org Master',
    description: 'Configure company profile, legal entities, branches, sites and departments',
    icon: Building2,
    category: 'ORGANIZATION_MASTER',
    dataType: 'MASTER_DATA',
    rolesAllowed: ['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER_PROMOTER', 'DIRECTOR_CEO', 'GENERAL_MANAGER', 'ADMIN'],
  },
  {
    screen: 'DEPLOYMENT_MANAGEMENT',
    label: 'Site & Post Deployment',
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
    label: 'Workforce Staff Directory',
    shortLabel: 'Staff Directory',
    description: 'Complete employee lifecycle, biometric records, KYC and contacts',
    icon: Users,
    category: 'PEOPLE_WORKFORCE',
    dataType: 'MASTER_DATA',
    rolesAllowed: ['SUPER_ADMIN', 'COMPANY_ADMIN', 'HR_ADMIN', 'OPS_MANAGER', 'HR', 'GENERAL_MANAGER', 'ADMIN'],
  },
  {
    screen: 'ID_BADGES',
    label: 'Identity Badge Master',
    shortLabel: 'ID Badges',
    description: 'Digital Smart QR badges, print passes and physical badge issuance',
    icon: IdCard,
    category: 'PEOPLE_WORKFORCE',
    dataType: 'MASTER_DATA',
    rolesAllowed: ['SUPER_ADMIN', 'COMPANY_ADMIN', 'HR_ADMIN', 'ADMIN', 'SAFETY_OFFICER'],
  },
  {
    screen: 'TALENT_ACQUISITION',
    label: 'Talent Acquisition & ATS',
    shortLabel: 'Recruit ATS',
    description: 'Job requisitions, applicant pipeline, candidate scoring and offer generation',
    icon: UserCheck,
    category: 'PEOPLE_WORKFORCE',
    dataType: 'TRANSACTION',
    rolesAllowed: ['SUPER_ADMIN', 'COMPANY_ADMIN', 'HR_ADMIN', 'HR'],
  },
  {
    screen: 'TRAINING_LMS',
    label: 'LMS & Security Training',
    shortLabel: 'LMS Training',
    description: 'PSARA compliance curriculum, training modules, quizzes and tracking',
    icon: GraduationCap,
    category: 'PEOPLE_WORKFORCE',
    dataType: 'MASTER_DATA',
  },
  {
    screen: 'MANDATORY_REFRESHERS',
    label: 'Mandatory Refreshers',
    shortLabel: 'Refreshers',
    description: 'Mandatory annual safety, fire drill and SOP refreshers schedule',
    icon: ShieldAlert,
    category: 'PEOPLE_WORKFORCE',
    dataType: 'TRANSACTION',
  },
  {
    screen: 'CERTIFICATION_TRACKING',
    label: 'Certifications & Expiry',
    shortLabel: 'Certifications',
    description: 'PSARA licenses, First Aid, Fire Safety certificates and renewal alerts',
    icon: Award,
    category: 'PEOPLE_WORKFORCE',
    dataType: 'MASTER_DATA',
  },

  // 5. OPERATIONS
  {
    screen: 'ATTENDANCE_SHIFTS',
    label: 'Daily Attendance & Muster',
    shortLabel: 'Attendance',
    description: 'Geo-verified punches, biometric facial scans and live muster check-in',
    icon: Clock,
    category: 'OPERATIONS',
    dataType: 'TRANSACTION',
  },
  {
    screen: 'SHIFT_ROSTER',
    label: 'Shift Roster Planner',
    shortLabel: 'Shift Roster',
    description: 'Monthly and weekly shift scheduling matrix, rotations and swaps',
    icon: Calendar,
    category: 'OPERATIONS',
    dataType: 'MASTER_DATA',
    rolesAllowed: ['SUPER_ADMIN', 'COMPANY_ADMIN', 'OPS_MANAGER', 'HR_ADMIN', 'SUPERVISOR', 'SITE_IN_CHARGE'],
  },
  {
    screen: 'LEAVE_MANAGEMENT',
    label: 'Leave Management',
    shortLabel: 'Leaves',
    description: 'Leave request applications, approval workflows and accrual balances',
    icon: Calendar,
    category: 'OPERATIONS',
    dataType: 'TRANSACTION',
  },
  {
    screen: 'WORK_ORDERS',
    label: 'Work Orders & Facility Maintenance',
    shortLabel: 'Work Orders',
    description: 'Dispatch tickets, maintenance tasks, SLAs and field repair progress',
    icon: ListTodo,
    category: 'OPERATIONS',
    dataType: 'TRANSACTION',
  },
  {
    screen: 'TASK_MANAGEMENT',
    label: 'BPM Task Management',
    shortLabel: 'Tasks',
    description: 'Organizational task allocation, Kanban boards and status milestones',
    icon: CheckSquare,
    category: 'OPERATIONS',
    dataType: 'TRANSACTION',
  },
  {
    screen: 'MY_TASKS',
    label: 'My Assigned Tasks',
    shortLabel: 'My Tasks',
    description: 'Individual employee task checklist, checklists and daily activities',
    icon: CheckSquare,
    category: 'OPERATIONS',
    dataType: 'TRANSACTION',
  },
  {
    screen: 'SITE_OPERATIONS',
    label: 'Site Operations & Guard Patrol',
    shortLabel: 'Site Ops',
    description: 'QR checkpoint patrols, Incident reporting, Visitor gate pass & Material muster',
    icon: ShieldCheck,
    category: 'OPERATIONS',
    dataType: 'TRANSACTION',
  },
  {
    screen: 'SAFETY_MANAGEMENT',
    label: 'Safety Inspections & PPE Checks',
    shortLabel: 'Safety Checks',
    description: 'EHS hazard inspections, equipment checks and safety protocol audits',
    icon: ShieldAlert,
    category: 'OPERATIONS',
    dataType: 'TRANSACTION',
  },

  // 6. ASSETS & INVENTORY
  {
    screen: 'ASSET_TRACKING',
    label: 'EAM Asset Lifecycle Management',
    shortLabel: 'Asset Register',
    description: 'Fixed assets register, QR tracking, custodian assignment and maintenance history',
    icon: QrCode,
    category: 'ASSETS_INVENTORY',
    dataType: 'MASTER_DATA',
  },
  {
    screen: 'INVENTORY_STOCK',
    label: 'SCM Inventory & Stock Control',
    shortLabel: 'Stock & Items',
    description: 'Uniforms, gear, spare parts, GRN receipt and warehouse stock ledger',
    icon: Boxes,
    category: 'ASSETS_INVENTORY',
    dataType: 'TRANSACTION',
  },

  // 7. FINANCE
  {
    screen: 'PAYROLL_COMPENSATION',
    label: 'ERP Payroll & Compensation',
    shortLabel: 'Payroll',
    description: 'Salary structures, wage registers, statutory PF/ESI/PT deductions and payslips',
    icon: DollarSign,
    category: 'FINANCE',
    dataType: 'TRANSACTION',
    rolesAllowed: ['SUPER_ADMIN', 'COMPANY_ADMIN', 'HR_ADMIN', 'FINANCE_MANAGER', 'FINANCE', 'OWNER_PROMOTER'],
  },

  // 8. PROCUREMENT
  {
    screen: 'PROCUREMENT_SRM',
    label: 'Procurement SRM Hub',
    shortLabel: 'Procurement Hub',
    description: 'Supplier relationship overview, requisition analytics and spend dashboards',
    icon: ShoppingCart,
    category: 'PROCUREMENT',
    dataType: 'ANALYTICS',
    rolesAllowed: ['SUPER_ADMIN', 'COMPANY_ADMIN', 'PROCUREMENT', 'FINANCE_MANAGER', 'FINANCE', 'ADMIN'],
  },
  {
    screen: 'VENDOR_MANAGEMENT',
    label: 'Approved Vendor Directory',
    shortLabel: 'Vendors',
    description: 'Vendor master register, onboarding documents, tax compliance and ratings',
    icon: Building2,
    category: 'PROCUREMENT',
    dataType: 'MASTER_DATA',
    rolesAllowed: ['SUPER_ADMIN', 'COMPANY_ADMIN', 'PROCUREMENT', 'ADMIN', 'FINANCE'],
  },
  {
    screen: 'RFQ_MANAGEMENT',
    label: 'RFQ & Quotation Bids',
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
    label: '3-Way Match & Invoice Audit',
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
    label: 'CRM Client Accounts & Contracts',
    shortLabel: 'Clients & Contracts',
    description: 'Client master, service contracts, billing rates and SLA agreements',
    icon: Briefcase,
    category: 'CRM',
    dataType: 'MASTER_DATA',
    rolesAllowed: ['SUPER_ADMIN', 'COMPANY_ADMIN', 'CLIENT_MANAGEMENT', 'COMMERCIAL', 'OPS_MANAGER', 'OWNER_PROMOTER'],
  },
  {
    screen: 'SUPER_ADMIN_LEADS',
    label: 'Sales Pipeline & Leads CRM',
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
    label: 'GRC Compliance Dashboard',
    shortLabel: 'GRC Dashboard',
    description: 'Labor law registers, minimum wage compliance, PF/ESIC returns and audits',
    icon: Scale,
    category: 'COMPLIANCE_RISK',
    dataType: 'ANALYTICS',
    rolesAllowed: ['SUPER_ADMIN', 'COMPANY_ADMIN', 'HR_ADMIN', 'EHS', 'QUALITY', 'ADMIN'],
  },
  {
    screen: 'LEGAL_POLICIES',
    label: 'Legal & Privacy Policies',
    shortLabel: 'Legal & Privacy',
    description: 'DPDP Act data privacy, confidentiality agreements and terms of service',
    icon: FileText,
    category: 'COMPLIANCE_RISK',
    dataType: 'SYSTEM',
  },

  // 11. APPROVALS & WORKFLOWS
  {
    screen: 'APPROVAL_MANAGEMENT',
    label: 'Approval Inbox & Requests',
    shortLabel: 'Approvals Inbox',
    description: 'Centralized workflow approval queue for leaves, expenses, overtime and onboarding',
    icon: CheckSquare,
    category: 'APPROVALS_WORKFLOWS',
    dataType: 'TRANSACTION',
    rolesAllowed: ['SUPER_ADMIN', 'COMPANY_ADMIN', 'HR_ADMIN', 'OPS_MANAGER', 'FINANCE_MANAGER', 'SUPERVISOR', 'OWNER_PROMOTER', 'GENERAL_MANAGER', 'SITE_IN_CHARGE'],
  },
  {
    screen: 'APPROVAL_CENTER',
    label: 'Multi-Tier BPM Approval Center',
    shortLabel: 'BPM Rules',
    description: 'Configurable multi-level approval hierarchies, delegation and escalations',
    icon: Award,
    category: 'APPROVALS_WORKFLOWS',
    dataType: 'SYSTEM',
    rolesAllowed: ['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER_PROMOTER', 'ADMIN'],
  },
  {
    screen: 'SUPER_ADMIN_PENDING_APPROVALS',
    label: 'Global Tenant Approvals',
    shortLabel: 'Global Approvals',
    description: 'Super Admin approval inbox for new tenant registrations and global requests',
    icon: UserCheck,
    category: 'APPROVALS_WORKFLOWS',
    dataType: 'TRANSACTION',
    isSuperAdminOnly: true,
  },

  // 12. REPORTS & ANALYTICS
  {
    screen: 'REPORTS_ANALYTICS',
    label: 'BI Reports & Statutory Exports',
    shortLabel: 'BI Reports',
    description: 'Muster registers, payroll summaries, incident analytics and PDF/Excel downloads',
    icon: BarChart3,
    category: 'REPORTS_ANALYTICS',
    dataType: 'ANALYTICS',
  },
  {
    screen: 'SERVICE_DESK',
    label: 'Service Desk & SLA Analytics',
    shortLabel: 'Service Desk',
    description: 'Internal ticketing, incident resolution timelines and client satisfaction metrics',
    icon: LifeBuoy,
    category: 'REPORTS_ANALYTICS',
    dataType: 'TRANSACTION',
  },

  // 13. NOTIFICATIONS
  {
    screen: 'NOTIFICATIONS',
    label: 'System Alerts & Notifications',
    shortLabel: 'Notifications',
    description: 'Real-time push alerts, duty reminders and system event feed',
    icon: Bell,
    category: 'NOTIFICATIONS',
    dataType: 'SYSTEM',
    badgeKey: 'unreadNotifCount',
  },

  // 14. SECURITY & AUDIT
  {
    screen: 'PROFILE',
    label: 'User Security & TOTP MFA',
    shortLabel: 'Security & Profile',
    description: 'KYC identity details, emergency contacts and RFC 6238 2FA setup',
    icon: Lock,
    category: 'SECURITY_AUDIT',
    dataType: 'SYSTEM',
  },
  {
    screen: 'SESSION_LOCK',
    label: 'Session Lock & PIN Protection',
    shortLabel: 'Lock Screen',
    description: 'Quick-lock terminal to prevent unauthorized workstation access',
    icon: Lock,
    category: 'SECURITY_AUDIT',
    dataType: 'SYSTEM',
  },

  // 15. SETTINGS
  {
    screen: 'SETTINGS',
    label: 'Settings & Diagnostics',
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
      return item.isSuperAdminOnly === true || item.screen === 'SETTINGS';
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
