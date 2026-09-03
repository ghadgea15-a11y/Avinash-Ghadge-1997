/**
 * Production-Grade SEO Management Utility for Log Sheet Muster
 * Shourya Enterprises Pvt. Ltd. (https://logsheetmuster.online)
 */

export interface PageBreadcrumb {
  name: string;
  item: string;
}

export interface PageFaq {
  question: string;
  answer: string;
}

export interface SeoMetadata {
  path: string;
  title: string;
  description: string;
  keywords: string;
  canonicalUrl: string;
  ogType?: 'website' | 'article' | 'product';
  ogImage?: string;
  robots?: string;
  breadcrumbs?: PageBreadcrumb[];
  faqs?: PageFaq[];
  primaryH1: string;
  category?: string;
}

export const BASE_URL = 'https://logsheetmuster.online';

export const COMPANY_INFO = {
  name: 'Shourya Enterprises Pvt. Ltd.',
  legalName: 'Shourya Enterprises Private Limited',
  productName: 'Log Sheet Muster',
  founder: 'Avinash Shivaji Ghadge',
  email: 'ghadgea15@gmail.com',
  supportEmail: 'ghadgea162@gmail.com',
  telephone: '+91-9096345456',
  address: {
    streetAddress: 'Ajanthanagar, Chinchwad',
    addressLocality: 'Pune',
    addressRegion: 'Maharashtra',
    postalCode: '411019',
    addressCountry: 'IN'
  },
  logoUrl: `${BASE_URL}/logo.png`,
  websiteUrl: BASE_URL
};

export const SEO_REGISTRY: Record<string, SeoMetadata> = {
  '/': {
    path: '/',
    title: 'Log Sheet Muster | Enterprise HRMS, Workforce & Facility Management Platform',
    description: 'Log Sheet Muster by Shourya Enterprises connects workforce operations, Form II attendance muster, payroll, guard patrol verification, assets, and statutory compliance into one unified enterprise platform.',
    keywords: 'Log Sheet Muster, enterprise HRMS, workforce management software, facility management SaaS, attendance muster software, guard patrol muster, Form II muster, payroll software India, QR checkpoint inspection, shift roster management',
    canonicalUrl: `${BASE_URL}/`,
    ogType: 'website',
    primaryH1: 'Unified Enterprise Workforce, HRMS & Facility Operations Operating System',
    breadcrumbs: [
      { name: 'Home', item: `${BASE_URL}/` }
    ],
    faqs: [
      {
        question: 'What is Log Sheet Muster?',
        answer: 'Log Sheet Muster is a comprehensive enterprise SaaS application developed by Shourya Enterprises Pvt. Ltd. that integrates workforce management, Form II statutory attendance muster, multi-tier payroll, physical security guard patrols, facility log sheets, and compliance reporting into one unified platform.'
      },
      {
        question: 'Does Log Sheet Muster work offline on field sites?',
        answer: 'Yes. Log Sheet Muster provides offline synchronization capabilities on both web and Android mobile apps, allowing supervisors and field officers to perform roll-calls, guard patrols, and log sheet entries even in low-connectivity areas.'
      },
      {
        question: 'Is Log Sheet Muster compliant with Indian labor laws and Form II muster registers?',
        answer: 'Yes. Log Sheet Muster is built to automate Indian statutory compliance, including Maharashtra Form II muster roll registers, PF, ESIC, Professional Tax, and overtime tracking.'
      }
    ]
  },

  '/hrms': {
    path: '/hrms',
    title: 'Enterprise HRMS Software | Human Resource Management System | Log Sheet Muster',
    description: 'Modern enterprise HRMS software for end-to-end employee lifecycle management, attendance muster, automated payroll, leave tracking, shift scheduling, and statutory compliance.',
    keywords: 'HRMS software, human resource management system, enterprise HRMS India, employee management system, HR software Pune, cloud HRMS, workforce HR platform',
    canonicalUrl: `${BASE_URL}/hrms`,
    ogType: 'website',
    primaryH1: 'Enterprise HRMS Software Built for Distributed and Deskless Workforces',
    category: 'HRMS',
    breadcrumbs: [
      { name: 'Home', item: `${BASE_URL}/` },
      { name: 'HRMS Software', item: `${BASE_URL}/hrms` }
    ],
    faqs: [
      {
        question: 'What core modules are included in the Log Sheet Muster HRMS suite?',
        answer: 'The HRMS suite includes Employee Master Directory with KYC, Form II Attendance Muster, Multi-shift Roster Planner, Leave Administration with multi-tier approval chains, Automated Statutory Payroll Engine, and Employee Self-Service (ESS).'
      },
      {
        question: 'How does Log Sheet Muster support distributed and field staff?',
        answer: 'It supports multi-branch, multi-site structures with Role-Based Access Control (RBAC), geo-fenced mobile punches, biometric integration, and offline-first data sync.'
      }
    ]
  },

  '/hrms-software': {
    path: '/hrms-software',
    title: 'Enterprise HRMS Software India | Complete Workforce Management Solution',
    description: 'Transform human resource operations with Log Sheet Muster enterprise HRMS. Digitize employee onboarding, attendance, shifts, payroll, and compliance across all branches.',
    keywords: 'HRMS software India, cloud HRMS platform, HR automation software, employee lifecycle management, attendance muster system, best HRMS software',
    canonicalUrl: `${BASE_URL}/hrms`,
    ogType: 'website',
    primaryH1: 'Next-Generation Cloud HRMS Software for Indian Enterprises',
    category: 'HRMS',
    breadcrumbs: [
      { name: 'Home', item: `${BASE_URL}/` },
      { name: 'HRMS Software', item: `${BASE_URL}/hrms` }
    ]
  },

  '/employee-management': {
    path: '/employee-management',
    title: 'Employee Management Software | Digital Master Directory & KYC | Log Sheet Muster',
    description: 'Centralize employee master records, Aadhaar/PAN KYC verification, digital photo ID badges, skill grading, and role-based department hierarchies with Log Sheet Muster.',
    keywords: 'employee management software, employee database system, digital employee records, staff directory software, KYC verification HR, employee onboarding software',
    canonicalUrl: `${BASE_URL}/employee-management`,
    ogType: 'website',
    primaryH1: 'Centralized Employee Management & Digital Master Records',
    category: 'Workforce',
    breadcrumbs: [
      { name: 'Home', item: `${BASE_URL}/` },
      { name: 'HRMS', item: `${BASE_URL}/hrms` },
      { name: 'Employee Management', item: `${BASE_URL}/employee-management` }
    ],
    faqs: [
      {
        question: 'Can we manage multiple skill grades and employment categories?',
        answer: 'Yes. Log Sheet Muster categorizes staff across Skilled, Semi-Skilled, and Support roles, as well as Official Staff vs Operations Staff, with custom wage rules for each category.'
      },
      {
        question: 'How are employee digital ID badges generated?',
        answer: 'The system automatically generates digital ID cards with photo verification, QR verification codes, department tags, and emergency contact details.'
      }
    ]
  },

  '/attendance-management': {
    path: '/attendance-management',
    title: 'Attendance Management Software | Form II Muster & Roll-Call | Log Sheet Muster',
    description: 'Automate attendance tracking, daily roll-call muster, shift check-ins, overtime computation, and Form II statutory muster registers across all client sites.',
    keywords: 'attendance management software, Form II muster software, daily muster roll call, biometric attendance app, guard attendance tracker, overtime calculation software',
    canonicalUrl: `${BASE_URL}/attendance-management`,
    ogType: 'website',
    primaryH1: 'Automated Attendance Management & Statutory Form II Muster',
    category: 'Workforce',
    breadcrumbs: [
      { name: 'Home', item: `${BASE_URL}/` },
      { name: 'HRMS', item: `${BASE_URL}/hrms` },
      { name: 'Attendance Management', item: `${BASE_URL}/attendance-management` }
    ],
    faqs: [
      {
        question: 'What attendance marking methods are supported?',
        answer: 'Log Sheet Muster supports supervisor digital roll-call, QR code site checkpoints, geo-tagged mobile punch with GPS radius verification, and biometric device integration.'
      },
      {
        question: 'Does it automatically export Form II statutory registers?',
        answer: 'Yes. One-click export provides complete government-compliant Form II Muster Roll-Call reports in PDF and Excel formats.'
      }
    ]
  },

  '/leave-management': {
    path: '/leave-management',
    title: 'Leave Management Software | Multi-Tier Approvals & Policy Engine | Log Sheet Muster',
    description: 'Streamline leave applications, supervisor approval workflows, compensatory off (CO), maternity/paternity leaves, and live leave balance registers.',
    keywords: 'leave management software, leave tracking system, employee leave portal, online leave application, leave balance calculator, corporate leave management',
    canonicalUrl: `${BASE_URL}/leave-management`,
    ogType: 'website',
    primaryH1: 'Automated Leave Management & Multi-Tier Approval Workflows',
    category: 'HRMS',
    breadcrumbs: [
      { name: 'Home', item: `${BASE_URL}/` },
      { name: 'HRMS', item: `${BASE_URL}/hrms` },
      { name: 'Leave Management', item: `${BASE_URL}/leave-management` }
    ],
    faqs: [
      {
        question: 'How do leave approval chains work?',
        answer: 'Leave requests automatically route from employees to their designated Site Supervisor, Area Manager, and HR Department with real-time push and email notifications.'
      },
      {
        question: 'Are leave balances automatically synced with payroll calculation?',
        answer: 'Yes, approved paid leaves and unpaid loss of pay (LOP) days are automatically fed into the monthly payroll calculation engine.'
      }
    ]
  },

  '/payroll': {
    path: '/payroll',
    title: 'Statutory Payroll Software India | PF, ESI, PT & Bank Batches | Log Sheet Muster',
    description: 'Calculate monthly wages, statutory deductions (PF, ESIC, PT, TDS), overtime, and generate bank transfer NEFT/RTGS batch files and digital payslips in seconds.',
    keywords: 'payroll software India, statutory payroll management, PF ESIC calculation software, payslip generator, bank disbursement batch, salary processing software Pune',
    canonicalUrl: `${BASE_URL}/payroll`,
    ogType: 'website',
    primaryH1: 'Enterprise Statutory Payroll Engine with One-Click Bank Disbursement',
    category: 'Finance',
    breadcrumbs: [
      { name: 'Home', item: `${BASE_URL}/` },
      { name: 'HRMS', item: `${BASE_URL}/hrms` },
      { name: 'Payroll & Compensation', item: `${BASE_URL}/payroll` }
    ],
    faqs: [
      {
        question: 'Which statutory compliances are supported in payroll calculations?',
        answer: 'Log Sheet Muster handles Employees Provident Fund (EPF/EPS), Employee State Insurance (ESIC), State Professional Tax (PT slabs across Maharashtra and other states), and Tax Deducted at Source (TDS).'
      },
      {
        question: 'How are salary disbursements executed?',
        answer: 'The system generates standard CSV/Excel batch disbursement files compatible with HDFC, ICICI, SBI, Axis, and other major Indian commercial banking portals.'
      }
    ]
  },

  '/shift-management': {
    path: '/shift-management',
    title: 'Shift Management & Roster Planning Software | 24/7 Operations | Log Sheet Muster',
    description: 'Plan rotational shifts, 24/7 guard rosters, shift swaps, and duty handovers with real-time short-staff alerts and supervisor digital sign-offs.',
    keywords: 'shift management software, shift roster planner, 24/7 rotational roster, security guard shift scheduler, shift handover log, workforce scheduling app',
    canonicalUrl: `${BASE_URL}/shift-management`,
    ogType: 'website',
    primaryH1: 'Intelligent Shift Management & 24/7 Rotational Roster Planning',
    category: 'Workforce',
    breadcrumbs: [
      { name: 'Home', item: `${BASE_URL}/` },
      { name: 'HRMS', item: `${BASE_URL}/hrms` },
      { name: 'Shift Management', item: `${BASE_URL}/shift-management` }
    ],
    faqs: [
      {
        question: 'Can supervisors manage night shifts and rotational 3-shift schedules?',
        answer: 'Yes. The system natively supports morning, afternoon, night, and general shifts with customized grace periods, minimum rest intervals, and overtime rules.'
      }
    ]
  },

  '/workforce-management': {
    path: '/workforce-management',
    title: 'Workforce Management Software (WFM) | Field & Site Operations | Log Sheet Muster',
    description: 'End-to-end workforce management for security, housekeeping, facility maintenance, and industrial manpower. Track deployments, tasks, and productivity in real-time.',
    keywords: 'workforce management software, WFM software India, field workforce tracking, facility staff management, manpower deployment software, guard muster system',
    canonicalUrl: `${BASE_URL}/workforce-management`,
    ogType: 'website',
    primaryH1: 'Unified Workforce Management for Field, Site & Facility Teams',
    category: 'Workforce',
    breadcrumbs: [
      { name: 'Home', item: `${BASE_URL}/` },
      { name: 'Workforce Management', item: `${BASE_URL}/workforce-management` }
    ],
    faqs: [
      {
        question: 'How does Log Sheet Muster prevent ghost employees and muster fraud?',
        answer: 'Through multi-factor verification including geo-tagged muster roll-calls, real-time selfie verification, supervisor sign-offs, and biometric timestamp cross-checks.'
      }
    ]
  },

  '/facility-management': {
    path: '/facility-management',
    title: 'Facility Management Software | Digital Log Sheets & Work Orders | Log Sheet Muster',
    description: 'Digitize facility maintenance, PPM schedules, equipment log sheets, DG set readings, water/energy meter logs, and SLA ticket resolution across enterprise properties.',
    keywords: 'facility management software, digital log sheets, CAFM software India, PPM schedule software, facility maintenance app, DG set logbook, facility operations SaaS',
    canonicalUrl: `${BASE_URL}/facility-management`,
    ogType: 'website',
    primaryH1: 'Enterprise Facility Management & Digital Site Log Sheet System',
    category: 'Facility',
    breadcrumbs: [
      { name: 'Home', item: `${BASE_URL}/` },
      { name: 'Facility Management', item: `${BASE_URL}/facility-management` }
    ],
    faqs: [
      {
        question: 'Can we replace paper logbooks for DG sets, HVAC, and transformers?',
        answer: 'Yes. Log Sheet Muster allows technicians to log hourly/daily meter readings, fuel levels, temperatures, and maintenance checkpoints on mobile or tablet.'
      }
    ]
  },

  '/security-management': {
    path: '/security-management',
    title: 'Security Management & Guard Patrol Software | QR Checkpoint Muster | Log Sheet Muster',
    description: 'Enterprise physical security management with QR checkpoint guard patrol tracking, digital visitor gate passes, material inward/outward registers, and incident logging.',
    keywords: 'security management software, guard patrol monitoring, QR checkpoint guard tour, visitor gate pass software, material gate pass system, incident reporting app',
    canonicalUrl: `${BASE_URL}/security-management`,
    ogType: 'website',
    primaryH1: 'Physical Security Operations, Guard Patrol & Digital Gate Pass System',
    category: 'Security',
    breadcrumbs: [
      { name: 'Home', item: `${BASE_URL}/` },
      { name: 'Security Management', item: `${BASE_URL}/security-management` }
    ],
    faqs: [
      {
        question: 'How does the QR Checkpoint Patrol Engine operate?',
        answer: 'Security guards scan physical QR checkpoints placed across perimeter boundaries and server rooms using their smartphone. The app verifies GPS proximity and logs exact timestamps.'
      }
    ]
  },

  '/employee-self-service': {
    path: '/employee-self-service',
    title: 'Employee Self-Service (ESS) Portal & Mobile App | Log Sheet Muster',
    description: 'Empower employees with self-service mobile access to daily attendance punches, leave requests, downloadable payslips, shift schedules, and company announcements.',
    keywords: 'employee self service portal, ESS mobile app, employee payslip download, mobile attendance punch, staff self service HRMS',
    canonicalUrl: `${BASE_URL}/employee-self-service`,
    ogType: 'website',
    primaryH1: 'Mobile-First Employee Self-Service (ESS) Portal',
    category: 'HRMS',
    breadcrumbs: [
      { name: 'Home', item: `${BASE_URL}/` },
      { name: 'HRMS', item: `${BASE_URL}/hrms` },
      { name: 'Employee Self-Service', item: `${BASE_URL}/employee-self-service` }
    ]
  },

  '/reports-analytics': {
    path: '/reports-analytics',
    title: 'Workforce Reports & Business Intelligence Analytics | Log Sheet Muster',
    description: 'Generate real-time executive dashboards, Form II muster summaries, manpower billing reports, guard patrol compliance metrics, and operational audit trails.',
    keywords: 'workforce analytics, HRMS reporting software, Form II muster report, manpower utilization analytics, facility management MIS dashboard',
    canonicalUrl: `${BASE_URL}/reports-analytics`,
    ogType: 'website',
    primaryH1: 'Executive Business Intelligence & Operational Audit Analytics',
    category: 'Analytics',
    breadcrumbs: [
      { name: 'Home', item: `${BASE_URL}/` },
      { name: 'Reports & Analytics', item: `${BASE_URL}/reports-analytics` }
    ]
  },

  '/compliance': {
    path: '/compliance',
    title: 'Statutory HR & Labor Law Compliance Software | Log Sheet Muster',
    description: 'Maintain 100% statutory labor compliance with automated Form II muster registers, minimum wage adherence, PF/ESIC inspection ledgers, and tamper-proof audit trails.',
    keywords: 'statutory compliance software, labor law compliance India, Form II muster register, PF ESIC audit compliance, CLRA compliance software',
    canonicalUrl: `${BASE_URL}/compliance`,
    ogType: 'website',
    primaryH1: 'Statutory Labor Law & Form II Muster Compliance Automation',
    category: 'Compliance',
    breadcrumbs: [
      { name: 'Home', item: `${BASE_URL}/` },
      { name: 'Compliance', item: `${BASE_URL}/compliance` }
    ]
  },

  '/features': {
    path: '/features',
    title: 'Platform Features & Capabilities | Log Sheet Muster Architecture',
    description: 'Explore the full architectural capabilities of Log Sheet Muster: HRMS, Form II Muster, Guard Patrols, Asset Management, Service Desk, and Multi-Tenant Isolation.',
    keywords: 'Log Sheet Muster features, HRMS capabilities, facility management modules, security patrol features, asset tracking software',
    canonicalUrl: `${BASE_URL}/features`,
    ogType: 'website',
    primaryH1: 'Comprehensive Platform Features & Architectural Disciplines',
    breadcrumbs: [
      { name: 'Home', item: `${BASE_URL}/` },
      { name: 'Features', item: `${BASE_URL}/features` }
    ]
  },

  '/pricing': {
    path: '/pricing',
    title: 'Enterprise Pricing & Subscription Plans | Log Sheet Muster',
    description: 'Transparent, scalable SaaS pricing plans for small service agencies to large multi-site industrial enterprises. Pay per active workforce user with no hidden fees.',
    keywords: 'HRMS pricing, workforce software pricing, facility management software cost, enterprise subscription plans, Log Sheet Muster pricing',
    canonicalUrl: `${BASE_URL}/pricing`,
    ogType: 'website',
    primaryH1: 'Transparent Enterprise Subscription Plans Built to Scale',
    breadcrumbs: [
      { name: 'Home', item: `${BASE_URL}/` },
      { name: 'Pricing', item: `${BASE_URL}/pricing` }
    ]
  },

  '/about': {
    path: '/about',
    title: 'About Shourya Enterprises Pvt. Ltd. | Creators of Log Sheet Muster',
    description: 'Learn about Shourya Enterprises Pvt. Ltd., headquartered in Pune, Maharashtra, and our mission to digitize workforce, facility, and security operations across India.',
    keywords: 'about Shourya Enterprises Pvt Ltd, Log Sheet Muster founder, Avinash Shivaji Ghadge, Pune software enterprise, HRMS company India',
    canonicalUrl: `${BASE_URL}/about`,
    ogType: 'website',
    primaryH1: 'Built by Shourya Enterprises Pvt. Ltd. for Operational Excellence',
    breadcrumbs: [
      { name: 'Home', item: `${BASE_URL}/` },
      { name: 'About Us', item: `${BASE_URL}/about` }
    ]
  },
  
  '/company': {
    path: '/company',
    title: 'Shourya Enterprises Pvt. Ltd. | Corporate Profile & Contact Info',
    description: 'Corporate details for Shourya Enterprises Private Limited, based in Pune. Legal entity information, headquarters address, and contact coordinates.',
    keywords: 'Shourya Enterprises Pvt Ltd, corporate profile, Pune software company, Avinash Ghadge',
    canonicalUrl: `${BASE_URL}/about`,
    ogType: 'website',
    primaryH1: 'Shourya Enterprises Private Limited - Corporate Profile',
    breadcrumbs: [
      { name: 'Home', item: `${BASE_URL}/` },
      { name: 'Company', item: `${BASE_URL}/company` }
    ]
  },

  '/contact': {
    path: '/contact',
    title: 'Contact Shourya Enterprises | Schedule Live Demo | Log Sheet Muster',
    description: 'Get in touch with the Log Sheet Muster team in Pune, Maharashtra. Request an enterprise live demo, technical consultation, or custom deployment proposal.',
    keywords: 'contact Log Sheet Muster, schedule HRMS demo, Shourya Enterprises contact, Pune enterprise software demo, workforce software consultation',
    canonicalUrl: `${BASE_URL}/contact`,
    ogType: 'website',
    primaryH1: 'Connect with Our Operational Solutions Architecture Team',
    breadcrumbs: [
      { name: 'Home', item: `${BASE_URL}/` },
      { name: 'Contact Us', item: `${BASE_URL}/contact` }
    ]
  },

  '/security': {
    path: '/security',
    title: 'Security Architecture & Tenant Data Isolation | Log Sheet Muster',
    description: 'Discover how Log Sheet Muster guarantees enterprise security through Firebase Firestore RBAC, multi-tenant data isolation, encrypted channels, and tamper-proof logs.',
    keywords: 'enterprise security architecture, cloud tenant isolation, RBAC security, data protection India, encrypted workforce platform',
    canonicalUrl: `${BASE_URL}/security`,
    ogType: 'website',
    primaryH1: 'Enterprise Security Architecture & Multi-Tenant Data Isolation',
    breadcrumbs: [
      { name: 'Home', item: `${BASE_URL}/` },
      { name: 'Security & Trust', item: `${BASE_URL}/security` }
    ]
  },

  '/privacy': {
    path: '/privacy',
    title: 'Privacy Policy & Data Protection | Log Sheet Muster',
    description: 'Read the official Privacy Policy of Log Sheet Muster by Shourya Enterprises Pvt. Ltd., detailing personal data protection, GPS location rules, and storage security.',
    keywords: 'privacy policy, Log Sheet Muster privacy, data protection agreement, GDPR DPDP compliance',
    canonicalUrl: `${BASE_URL}/privacy`,
    ogType: 'website',
    primaryH1: 'Privacy Policy & Personal Data Governance',
    breadcrumbs: [
      { name: 'Home', item: `${BASE_URL}/` },
      { name: 'Privacy Policy', item: `${BASE_URL}/privacy` }
    ]
  },

  '/privacy-policy': {
    path: '/privacy-policy',
    title: 'Privacy Policy & Data Protection | Log Sheet Muster',
    description: 'Read the official Privacy Policy of Log Sheet Muster by Shourya Enterprises Pvt. Ltd., detailing personal data protection, GPS location rules, and storage security.',
    keywords: 'privacy policy, Log Sheet Muster privacy, data protection agreement, GDPR DPDP compliance',
    canonicalUrl: `${BASE_URL}/privacy`,
    ogType: 'website',
    primaryH1: 'Privacy Policy & Personal Data Governance',
    breadcrumbs: [
      { name: 'Home', item: `${BASE_URL}/` },
      { name: 'Privacy Policy', item: `${BASE_URL}/privacy` }
    ]
  },

  '/terms': {
    path: '/terms',
    title: 'Terms of Service & Enterprise Agreement | Log Sheet Muster',
    description: 'Review the official terms of service, subscription policies, service level agreements (SLA), and acceptable use rules for Log Sheet Muster.',
    keywords: 'terms of service, enterprise SLA, acceptable use policy, Log Sheet Muster terms',
    canonicalUrl: `${BASE_URL}/terms`,
    ogType: 'website',
    primaryH1: 'Terms of Service & Enterprise Governance',
    breadcrumbs: [
      { name: 'Home', item: `${BASE_URL}/` },
      { name: 'Terms of Service', item: `${BASE_URL}/terms` }
    ]
  },

  '/terms-of-service': {
    path: '/terms-of-service',
    title: 'Terms of Service & Enterprise Agreement | Log Sheet Muster',
    description: 'Review the official terms of service, subscription policies, service level agreements (SLA), and acceptable use rules for Log Sheet Muster.',
    keywords: 'terms of service, enterprise SLA, acceptable use policy, Log Sheet Muster terms',
    canonicalUrl: `${BASE_URL}/terms`,
    ogType: 'website',
    primaryH1: 'Terms of Service & Enterprise Governance',
    breadcrumbs: [
      { name: 'Home', item: `${BASE_URL}/` },
      { name: 'Terms of Service', item: `${BASE_URL}/terms` }
    ]
  }
};

/**
 * Generate Structured Data (JSON-LD) for a given page
 */
export function generateJsonLd(meta: SeoMetadata): Record<string, any>[] {
  const schemas: Record<string, any>[] = [];

  // 1. Organization Schema
  schemas.push({
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${BASE_URL}/#organization`,
    'name': COMPANY_INFO.name,
    'legalName': COMPANY_INFO.legalName,
    'url': COMPANY_INFO.websiteUrl,
    'logo': COMPANY_INFO.logoUrl,
    'founder': {
      '@type': 'Person',
      'name': COMPANY_INFO.founder
    },
    'address': {
      '@type': 'PostalAddress',
      'streetAddress': COMPANY_INFO.address.streetAddress,
      'addressLocality': COMPANY_INFO.address.addressLocality,
      'addressRegion': COMPANY_INFO.address.addressRegion,
      'postalCode': COMPANY_INFO.address.postalCode,
      'addressCountry': COMPANY_INFO.address.addressCountry
    },
    'contactPoint': {
      '@type': 'ContactPoint',
      'telephone': COMPANY_INFO.telephone,
      'contactType': 'customer support',
      'email': COMPANY_INFO.email,
      'areaServed': 'IN',
      'availableLanguage': ['English', 'Hindi', 'Marathi']
    }
  });

  // 2. WebSite Schema
  schemas.push({
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${BASE_URL}/#website`,
    'url': BASE_URL,
    'name': COMPANY_INFO.productName,
    'description': 'Enterprise workforce management, statutory attendance muster, payroll, and facility operations SaaS platform.',
    'publisher': {
      '@id': `${BASE_URL}/#organization`
    }
  });

  // 3. SoftwareApplication Schema
  schemas.push({
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    '@id': `${BASE_URL}/#software`,
    'name': COMPANY_INFO.productName,
    'applicationCategory': 'BusinessApplication',
    'operatingSystem': 'Web Browser, Android OS',
    'offers': {
      '@type': 'Offer',
      'price': '0',
      'priceCurrency': 'INR',
      'availability': 'https://schema.org/InStock'
    },
    'description': meta.description,
    'creator': {
      '@id': `${BASE_URL}/#organization`
    }
  });

  // 4. BreadcrumbList Schema
  if (meta.breadcrumbs && meta.breadcrumbs.length > 0) {
    schemas.push({
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      'itemListElement': meta.breadcrumbs.map((bc, index) => ({
        '@type': 'ListItem',
        'position': index + 1,
        'name': bc.name,
        'item': bc.item
      }))
    });
  }

  // 5. FAQPage Schema (only if FAQs genuinely exist)
  if (meta.faqs && meta.faqs.length > 0) {
    schemas.push({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      'mainEntity': meta.faqs.map(faq => ({
        '@type': 'Question',
        'name': faq.question,
        'acceptedAnswer': {
          '@type': 'Answer',
          'text': faq.answer
        }
      }))
    });
  }

  return schemas;
}

/**
 * Updates DOM head elements with page SEO tags dynamically
 */
export function updatePageSEO(path: string, isPrivate: boolean = false): void {
  // Normalize path
  let normalizedPath = path.toLowerCase().trim();
  if (!normalizedPath.startsWith('/')) {
    normalizedPath = '/' + normalizedPath;
  }
  if (normalizedPath.length > 1 && normalizedPath.endsWith('/')) {
    normalizedPath = normalizedPath.slice(0, -1);
  }

  const meta = SEO_REGISTRY[normalizedPath] || SEO_REGISTRY['/'] || {
    path: normalizedPath,
    title: 'Log Sheet Muster | Enterprise Workforce & Facility Management',
    description: 'Enterprise facility operations, workforce attendance muster, and security management.',
    keywords: 'Log Sheet Muster, enterprise SaaS, workforce management',
    canonicalUrl: `${BASE_URL}${normalizedPath}`,
    primaryH1: 'Log Sheet Muster Enterprise Platform'
  };

  // 1. Update Title
  document.title = meta.title;

  // Helper to set or create meta tag
  const setMetaTag = (attrName: string, attrValue: string, content: string) => {
    let el = document.querySelector(`meta[${attrName}="${attrValue}"]`);
    if (!el) {
      el = document.createElement('meta');
      el.setAttribute(attrName, attrValue);
      document.head.appendChild(el);
    }
    el.setAttribute('content', content);
  };

  // Helper to set or create link tag
  const setLinkTag = (rel: string, href: string) => {
    let el = document.querySelector(`link[rel="${rel}"]`);
    if (!el) {
      el = document.createElement('link');
      el.setAttribute('rel', rel);
      document.head.appendChild(el);
    }
    el.setAttribute('href', href);
  };

  // 2. Meta description & keywords
  setMetaTag('name', 'description', meta.description);
  setMetaTag('name', 'keywords', meta.keywords);
  setMetaTag('name', 'author', COMPANY_INFO.name);

  // 3. Robots directive
  if (isPrivate) {
    setMetaTag('name', 'robots', 'noindex, nofollow, noarchive');
  } else {
    setMetaTag('name', 'robots', meta.robots || 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1');
  }

  // 4. Canonical URL
  setLinkTag('canonical', isPrivate ? BASE_URL : meta.canonicalUrl);

  // 5. Open Graph tags
  setMetaTag('property', 'og:title', meta.title);
  setMetaTag('property', 'og:description', meta.description);
  setMetaTag('property', 'og:url', meta.canonicalUrl);
  setMetaTag('property', 'og:type', meta.ogType || 'website');
  setMetaTag('property', 'og:site_name', COMPANY_INFO.productName);
  setMetaTag('property', 'og:image', meta.ogImage || `${BASE_URL}/logo.png`);
  setMetaTag('property', 'og:locale', 'en_IN');

  // 6. Twitter card tags
  setMetaTag('name', 'twitter:card', 'summary_large_image');
  setMetaTag('name', 'twitter:title', meta.title);
  setMetaTag('name', 'twitter:description', meta.description);
  setMetaTag('name', 'twitter:image', meta.ogImage || `${BASE_URL}/logo.png`);

  // 7. JSON-LD Structured Data
  const existingScript = document.getElementById('json-ld-structured-data');
  if (existingScript) {
    existingScript.remove();
  }

  if (!isPrivate) {
    const jsonLdData = generateJsonLd(meta);
    const script = document.createElement('script');
    script.id = 'json-ld-structured-data';
    script.type = 'application/ld+json';
    script.text = JSON.stringify(jsonLdData);
    document.head.appendChild(script);
  }
}
