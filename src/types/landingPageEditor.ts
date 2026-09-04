export interface LandingPageThemeConfig {
  primaryColor: string; // e.g. '#2563eb' (blue-600)
  secondaryColor: string; // e.g. '#4f46e5' (indigo-600)
  accentColor: string; // e.g. '#06b6d4' (cyan-500)
  backgroundColor: string; // e.g. '#060B19'
  fontFamily: string; // 'Plus Jakarta Sans' | 'Inter' | 'Outfit' | 'Poppins' | 'Roboto' | 'Montserrat'
  heroFontSize: 'sm' | 'base' | 'lg' | 'xl';
  spacingDensity: 'compact' | 'comfortable' | 'spacious';
  borderRadius: 'none' | 'sm' | 'md' | 'lg' | 'xl' | 'full';
  headerBackground: 'blur-dark' | 'solid-dark' | 'transparent';
}

export interface LandingPageHeaderConfig {
  logoTitle: string;
  logoSubtitle: string;
  logoIconType: 'monitor' | 'shield' | 'building' | 'layers';
  customLogoUrl?: string;
  ctaButtonText: string;
  loginButtonText: string;
}

export interface LandingPageHeroConfig {
  badgeText: string;
  badgeEnabled: boolean;
  headlineMain: string;
  headlineHighlight: string;
  subheadline: string;
  primaryButtonText: string;
  secondaryButtonText: string;
  companyHighlightName: string;
  bulletItems: string[];
}

export interface LandingPageStatItem {
  id: string;
  value: string;
  label: string;
  subtext?: string;
  icon?: string;
}

export interface LandingPageStatsConfig {
  enabled: boolean;
  items: LandingPageStatItem[];
}

export interface LandingPageShowcaseItem {
  id: string;
  tabLabel: string;
  badge: string;
  title: string;
  description: string;
  bulletPoints: string[];
}

export interface LandingPageShowcaseConfig {
  enabled: boolean;
  sectionTitle: string;
  sectionSubtitle: string;
  items: LandingPageShowcaseItem[];
}

export interface LandingPageModuleItem {
  id: string;
  title: string;
  code: string;
  description: string;
  color: string;
  tags: string[];
}

export interface LandingPageModulesConfig {
  enabled: boolean;
  sectionTitle: string;
  sectionSubtitle: string;
  badge: string;
  items: LandingPageModuleItem[];
}

export interface LandingPageIndustryItem {
  id: string;
  title: string;
  summary: string;
  bulletPoints: string[];
  color: string;
}

export interface LandingPageIndustriesConfig {
  enabled: boolean;
  sectionTitle: string;
  sectionSubtitle: string;
  items: LandingPageIndustryItem[];
}

export interface LandingPageDemoSectionConfig {
  enabled: boolean;
  badge: string;
  title: string;
  subtitle: string;
  buttonText: string;
  features: string[];
}

export interface LandingPageAboutConfig {
  enabled: boolean;
  sectionTitle: string;
  companyName: string;
  description: string;
  headquarters: string;
  supportEmail: string;
  supportPhone: string;
  officeAddress: string;
}

export interface LandingPageSecurityConfig {
  enabled: boolean;
  sectionTitle: string;
  sectionSubtitle: string;
  features: Array<{
    title: string;
    description: string;
    badge: string;
  }>;
}

export interface LandingPageFaqItem {
  id: string;
  question: string;
  answer: string;
}

export interface LandingPageFaqConfig {
  enabled: boolean;
  sectionTitle: string;
  sectionSubtitle: string;
  items: LandingPageFaqItem[];
}

export interface LandingPageFooterConfig {
  enabled: boolean;
  copyrightText: string;
  tagline: string;
  showSocials: boolean;
  supportPhone: string;
  supportEmail: string;
}

export interface LandingPageSectionVisibility {
  header: boolean;
  hero: boolean;
  statsStrip: boolean;
  productShowcase: boolean;
  modules: boolean;
  industrySolutions: boolean;
  demoSection: boolean;
  aboutUs: boolean;
  securitySection: boolean;
  faqSection: boolean;
  footer: boolean;
}

export interface LandingPageSeoConfig {
  metaTitle: string;
  metaDescription: string;
  metaKeywords: string;
  faviconUrl?: string;
  ogImageUrl?: string;
}

export interface LandingPageConfig {
  id: 'published' | 'draft' | string;
  theme: LandingPageThemeConfig;
  seo: LandingPageSeoConfig;
  header: LandingPageHeaderConfig;
  hero: LandingPageHeroConfig;
  stats: LandingPageStatsConfig;
  sections: LandingPageSectionVisibility;
  sectionOrder: string[]; // Order of sections by their key
  showcase: LandingPageShowcaseConfig;
  modules: LandingPageModulesConfig;
  industries: LandingPageIndustriesConfig;
  demo: LandingPageDemoSectionConfig;
  about: LandingPageAboutConfig;
  security: LandingPageSecurityConfig;
  faq: LandingPageFaqConfig;
  footer: LandingPageFooterConfig;
  updatedAt: string;
  updatedBy: {
    userId: string;
    userName: string;
    userEmail: string;
  };
  version: number;
  status: 'DRAFT' | 'PUBLISHED';
}

export interface LandingPageVersionRecord {
  versionId: string;
  versionNumber: number;
  publishedAt: string;
  publishedBy: {
    userId: string;
    userName: string;
    userEmail: string;
  };
  notes: string;
  configSnapshot: LandingPageConfig;
}

export const DEFAULT_LANDING_PAGE_CONFIG: LandingPageConfig = {
  id: 'published',
  theme: {
    primaryColor: '#2563eb', // blue-600
    secondaryColor: '#4f46e5', // indigo-600
    accentColor: '#06b6d4', // cyan-500
    backgroundColor: '#060B19',
    fontFamily: 'Plus Jakarta Sans',
    heroFontSize: 'base',
    spacingDensity: 'comfortable',
    borderRadius: 'xl',
    headerBackground: 'blur-dark'
  },
  seo: {
    metaTitle: 'Log Sheet Muster - Enterprise Workforce Platform',
    metaDescription: 'Unified platform for Form II statutory attendance, QR guard patrols, equipment log sheets, and asset maintenance.',
    metaKeywords: 'attendance, muster, log sheet, enterprise, security, EAM, facility operations',
  },
  header: {
    logoTitle: 'LOG SHEET',
    logoSubtitle: 'MUSTER',
    logoIconType: 'monitor',
    customLogoUrl: '',
    ctaButtonText: 'Get 3 Months Free Demo',
    loginButtonText: 'Login to Web App'
  },
  hero: {
    badgeText: 'Enterprise Workforce, Facility Operations & Statutory Muster Platform',
    badgeEnabled: true,
    headlineMain: 'Command Your Workforce.',
    headlineHighlight: 'Guarantee Every Operation.',
    subheadline: 'Built by Shourya Enterprises Pvt. Ltd., Log Sheet Muster replaces fragmented paper logbooks and manual punch cards with a unified platform for Form II statutory attendance, QR guard patrols, equipment log sheets, EAM asset maintenance, and automated PF/ESI payroll.',
    primaryButtonText: 'Get 3 Months Free Demo',
    secondaryButtonText: 'Login to Web App',
    companyHighlightName: 'Shourya Enterprises Pvt. Ltd.',
    bulletItems: [
      'Form II Statutory Attendance Muster',
      'QR & Geo Guard Patrol Verification',
      'Preventive EAM Equipment Maintenance',
      '1-Click PF/ESI Statutory Payroll'
    ]
  },
  stats: {
    enabled: true,
    items: [
      { id: 'stat-1', value: '100%', label: 'Statutory Form II Muster Compliance', subtext: 'Factories Act 1948 certified' },
      { id: 'stat-2', value: 'Zero', label: 'Paper Register Dependency', subtext: 'End-to-end digital muster roll' },
      { id: 'stat-3', value: '99.98%', label: 'Platform Availability SLA', subtext: 'Real-time multi-site synchronization' },
      { id: 'stat-4', value: '100%', label: 'Auditable Digital Trail', subtext: 'Instant CSV / PDF muster export' }
    ]
  },
  sections: {
    header: true,
    hero: true,
    statsStrip: true,
    productShowcase: true,
    modules: true,
    industrySolutions: true,
    demoSection: true,
    aboutUs: true,
    securitySection: true,
    faqSection: true,
    footer: true
  },
  sectionOrder: [
    'hero',
    'statsStrip',
    'productShowcase',
    'modules',
    'industrySolutions',
    'demoSection',
    'aboutUs',
    'securitySection',
    'faqSection'
  ],
  showcase: {
    enabled: true,
    sectionTitle: 'Explore the Core Operation Command Systems',
    sectionSubtitle: 'Replace fragmented registers with purpose-engineered live modules designed for high-consequence enterprise facilities.',
    items: [
      {
        id: 'patrol',
        tabLabel: 'Guard Patrol & Guard Muster',
        badge: 'Security Operations Command',
        title: 'Real-Time QR / NFC Patrol & Shift Guard Tracking',
        description: 'Enforce active perimeter verification with GPS geofencing, QR checkpoint scanning, incident flagging, and SOS dispatches directly from mobile devices.',
        bulletPoints: [
          'GPS geofence containment & anti-spoof biometric muster',
          'Instant SOS alert broadcasting with exact coordinates',
          'Automated daily security shift turnover reports',
          'Real-time missed-checkpoint alarms'
        ]
      },
      {
        id: 'attendance',
        tabLabel: 'Statutory Muster & HRMS',
        badge: 'Statutory Compliance',
        title: 'Form II Statutory Registers & PF / ESI Automated Payroll',
        description: 'Zero manual transcription. Generate government-compliant muster rolls with overtime formulas, wage registers, leave deductions, and PF/ESIC summaries.',
        bulletPoints: [
          'Factories Act Form II auto-calculated muster roll',
          'OT calculations with customized client rate-cards',
          'Direct PF (EPF) and ESI contribution statements',
          'Biometric and mobile facial clock-in reconciliation'
        ]
      },
      {
        id: 'assets',
        tabLabel: 'EAM Asset & Equipment Logs',
        badge: 'Facility Engineering',
        title: 'Equipment Log Sheets, DG Running Hours & Preventive PPM',
        description: 'Digitize DG sets, chillers, water treatment, fire suppression, and HVAC operating logs. Auto-schedule preventive maintenance before critical equipment fails.',
        bulletPoints: [
          'Digital running hour meter logs with fuel consumption metrics',
          'Automated recurring PPM work-orders and technician sign-offs',
          'Spare parts inventory stock tracking and replenishment alerts',
          'Direct asset breakdown incident escalation flow'
        ]
      },
      {
        id: 'operations',
        tabLabel: 'Facility & Visitor Management',
        badge: 'Building Operations',
        title: 'Digital Gate Pass, Visitor Passes & Material Movement',
        description: 'Track inbound/outbound visitors, vendor badges, returnable material gate-passes, and daily housekeeping checklists on an integrated command console.',
        bulletPoints: [
          'Visitor badge generation with host notification and OTP checkout',
          'Returnable & non-returnable digital material gate passes',
          'Shift checklist audits for housekeeping and deep cleaning',
          'Vendor SLA compliance scorecards and verification'
        ]
      }
    ]
  },
  modules: {
    enabled: true,
    badge: '14 Deeply Integrated Modules',
    sectionTitle: 'Everything Your Operations Demand in One Architecture',
    sectionSubtitle: 'Eliminate silos between HR, Security, Facility Engineering, and Finance with an interconnected multi-tenant enterprise core.',
    items: [
      { id: 'm1', title: 'Workforce & Muster Roll', code: 'M-01', description: 'Real-time daily attendance, overtime, shifts, and digital muster records.', color: '#3b82f6', tags: ['HRMS', 'Compliance'] },
      { id: 'm2', title: 'Security & Guard Patrol', code: 'M-02', description: 'QR checkpoint verification, GPS geofencing, guard tours, and SOS alerts.', color: '#6366f1', tags: ['Security', 'Field Ops'] },
      { id: 'm3', title: 'EAM Asset Maintenance', code: 'M-03', description: 'Preventive PPM schedules, DG meter tracking, breakdown tickets, and spares.', color: '#06b6d4', tags: ['Engineering', 'Facility'] },
      { id: 'm4', title: 'Statutory Payroll & Invoicing', code: 'M-04', description: 'Auto-calculate wages, EPF, ESIC, professional tax, and client billing.', color: '#10b981', tags: ['Finance', 'Legal'] },
      { id: 'm5', title: 'Visitor & Gate Pass', code: 'M-05', description: 'QR pass generation, host approvals, visitor logbook, and parking tracking.', color: '#f59e0b', tags: ['Access Control'] },
      { id: 'm6', title: 'Material Movement & Delivery', code: 'M-06', description: 'Returnable / Non-returnable material tracking with electronic sign-offs.', color: '#ec4899', tags: ['Logistics', 'Gatehouse'] }
    ]
  },
  industries: {
    enabled: true,
    sectionTitle: 'Tailored for High-Consequence Operational Environments',
    sectionSubtitle: 'Whether protecting corporate campuses or running heavy industrial manufacturing, Log Sheet Muster adapts to your specific standard operating procedures.',
    items: [
      {
        id: 'security-agencies',
        title: 'Manned Guarding & Security Agencies',
        summary: 'Guard tour verification, proof of presence, automated client muster delivery, and guard wage calculations.',
        bulletPoints: ['Eliminate missed guard tours with QR/NFC confirmation', 'Transparent client billing backed by tamper-proof data', 'Statutory compliance for guard minimum wages and PF/ESI'],
        color: 'from-blue-600 to-indigo-600'
      },
      {
        id: 'facility-management',
        title: 'Integrated Facility Management (IFM)',
        summary: 'PPM work orders, DG fuel and power logs, vendor SLA scorecards, and housekeeping checklists.',
        bulletPoints: ['Prevent asset downtime with automated PPM work orders', 'Digital daily facility log sheets with photo proof', 'Consolidated multi-site service level management'],
        color: 'from-indigo-600 to-violet-600'
      },
      {
        id: 'manufacturing-industrial',
        title: 'Manufacturing Plants & Industrial Sites',
        summary: 'Strict statutory compliance with Factories Act Form II registers, contractor management, and EHS safety audits.',
        bulletPoints: ['Full statutory compliance with Factories Act Form II', 'Contractor workforce onboarding and biometric muster', 'Incident and near-miss safety reporting workflows'],
        color: 'from-cyan-600 to-blue-600'
      },
      {
        id: 'commercial-tech-parks',
        title: 'Tech Parks & Commercial Real Estate',
        summary: 'Multi-tenant building security, vendor gate passes, digital visitor management, and lobby access control.',
        bulletPoints: ['Fast visitor check-ins with QR badge and host SMS notifications', 'Material gate pass approval by tenant authorized signatories', 'Emergency evacuation headcount roll-call in real-time'],
        color: 'from-emerald-600 to-teal-600'
      }
    ]
  },
  demo: {
    enabled: true,
    badge: 'Exclusive Enterprise Program',
    title: 'Experience Full Platform Power with 3 Months Free Access',
    subtitle: 'Deploy across up to 3 of your active facilities or client sites. We handle complete master data import, guard app setup, and supervisory training at zero upfront cost.',
    buttonText: 'Request 3 Months Free Demo',
    features: [
      'Unlimited users, guards, and supervisors for 90 days',
      'Free master data import (employees, assets, checkpoints)',
      'Dedicated onboarding manager & training sessions',
      'Zero credit card or payment commitment required'
    ]
  },
  about: {
    enabled: true,
    sectionTitle: 'Engineered by Industry Veterans',
    companyName: 'Shourya Enterprises Pvt. Ltd.',
    description: 'Headquartered in Pune, Maharashtra, Shourya Enterprises Pvt. Ltd. develops mission-critical operational management software for security providers, facility management conglomerates, and industrial organizations across India.',
    headquarters: 'Pune, Maharashtra, India',
    supportEmail: 'support@logsheetmuster.com',
    supportPhone: '+91 98765 43210',
    officeAddress: 'Shourya Enterprises Pvt. Ltd., Tech Boulevard, Pune, MH 411014'
  },
  security: {
    enabled: true,
    sectionTitle: 'Enterprise Trust & Security Architecture',
    sectionSubtitle: 'Designed from the ground up for strict data confidentiality, ISO 27001 readiness, and multi-tenant isolation.',
    features: [
      {
        title: 'Multi-Tenant Isolation',
        description: 'Every organization data partition is strictly guarded with server-enforced role claims and cryptographic tokens.',
        badge: 'Zero Bleed'
      },
      {
        title: 'Tamper-Proof Audit Trail',
        description: 'Every clock-in, checkpoint scan, and status change is logged with immutable timestamp, GPS coordinate, and device hash.',
        badge: 'Forensic Grade'
      },
      {
        title: 'Statutory Compliance Ready',
        description: 'Pre-configured formulas for Indian labor codes, Factories Act Form II registers, PF/ESI limits, and GST invoicing.',
        badge: 'Labor Code Compliant'
      }
    ]
  },
  faq: {
    enabled: true,
    sectionTitle: 'Frequently Asked Questions',
    sectionSubtitle: 'Everything you need to know about migrating from paper logbooks to Log Sheet Muster.',
    items: [
      {
        id: 'faq-1',
        question: 'How quickly can our organization onboard our sites?',
        answer: 'Most organizations are fully operational within 24 to 48 hours. Our onboarding team imports your employee rosters, guard shifts, and equipment lists directly from Excel.'
      },
      {
        id: 'faq-2',
        question: 'Does the mobile app work in basement areas with poor network connectivity?',
        answer: 'Yes. The Android mobile application is built offline-first. Checkpoint scans, photos, and incident notes are stored encrypted locally and automatically synchronize as soon as connectivity resumes.'
      },
      {
        id: 'faq-3',
        question: 'Are the attendance and wage registers accepted by labor inspectors?',
        answer: 'Absolutely. Our Form II statutory muster roll format is designed strictly according to Factories Act 1948 and state-specific Shops & Establishments Act rules.'
      },
      {
        id: 'faq-4',
        question: 'What happens after the 3-month free demo expires?',
        answer: 'You can transition to our flexible monthly or annual SaaS subscription with zero data loss. If you decide not to continue, we provide complete data exports in Excel/CSV at no charge.'
      }
    ]
  },
  footer: {
    enabled: true,
    copyrightText: '© 2025-2026 Shourya Enterprises Pvt. Ltd. All rights reserved.',
    tagline: 'Enterprise Workforce, Facility Operations & Statutory Muster Platform',
    showSocials: true,
    supportPhone: '+91 98765 43210',
    supportEmail: 'support@logsheetmuster.com'
  },
  updatedAt: new Date().toISOString(),
  updatedBy: {
    userId: 'system_default',
    userName: 'Platform System',
    userEmail: 'system@logsheetmuster.com'
  },
  version: 1,
  status: 'PUBLISHED'
};
