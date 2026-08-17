import React, { useState } from 'react';
import { 
  Users, 
  Clock, 
  DollarSign, 
  Building2, 
  QrCode, 
  Boxes, 
  Briefcase, 
  BarChart3, 
  Workflow, 
  ShieldCheck, 
  Headphones, 
  UserCheck, 
  GraduationCap, 
  ShoppingBag,
  ArrowRight,
  CheckCircle2,
  FileSpreadsheet
} from 'lucide-react';

export const ModuleExplorer: React.FC = () => {
  const [activeDomainIndex, setActiveDomainIndex] = useState(0);

  const domains = [
    {
      num: '01',
      code: 'HCM',
      name: 'Human Capital Management',
      icon: Users,
      tagline: 'Employee Master, Biometrics & KYC Validation',
      desc: 'Centralized employee lifecycle management containing verified Aadhaar/PAN records, bank details, designation hierarchies, and emergency contact registries.',
      features: [
        'Aadhaar KYC & digital credential storage',
        'Multi-department hierarchy and reporting managers',
        'Automated onboarding & site deployment logs'
      ],
      rules: 'Enforces mandatory identity verification before any employee can be assigned to a field site muster roster.',
      exports: 'Employee Master Registry, ID Card Generator, KYC Audit Sheet'
    },
    {
      num: '02',
      code: 'WFM',
      name: 'Workforce Management',
      icon: Clock,
      tagline: 'Shift Rostering, Muster Roll-Calls & Attendance',
      desc: 'Real-time shift management system supporting 24/7 rotational rosters, grace period configurations, overtime calculation, and statutory muster logging.',
      features: [
        'Multi-shift schedules (Morning, General, Afternoon, Night)',
        'GPS geofenced roll-call muster validation (150m)',
        'Shift swap requests & automated supervisor approval'
      ],
      rules: 'Automatically checks minimum rest intervals between shifts and restricts unauthorized overtime.',
      exports: 'Daily Shift Muster, Monthly Attendance Summary, Overtime Ledger'
    },
    {
      num: '03',
      code: 'FIN',
      name: 'Financial Management',
      icon: DollarSign,
      tagline: 'Payroll Sync, Wage Ledgers & Cost Centers',
      desc: 'Automated conversion of validated shift muster records into statutory payroll ledgers, overtime wage calculations, and site-wise operational cost allocations.',
      features: [
        'Daily wage rate matrices per designation tier',
        'Statutory deduction calculation (PF, ESI, PT)',
        'Cost-center tagging by client site and project'
      ],
      rules: 'Direct payroll generation locked strictly to approved muster attendance records.',
      exports: 'Wage Register (Form X), Payslip Batch PDF, Bank Transfer Format'
    },
    {
      num: '04',
      code: 'OPS',
      name: 'Operations Management',
      icon: Building2,
      tagline: 'Facility Equipment Telemetry & Log Sheets',
      desc: 'Standardized operational monitoring for facility machinery including DG sets, HVAC chillers, transformers, water treatment plants, and electrical panels.',
      features: [
        'Hourly & shift equipment parameter logging',
        'Automated tolerance & threshold violation alerts',
        'Diesel consumption vs. running hours auditing'
      ],
      rules: 'Out-of-tolerance readings trigger immediate escalation work orders to maintenance engineers.',
      exports: 'DG Operational Log Sheet, Utility Energy Ledger, Equipment Health Index'
    },
    {
      num: '05',
      code: 'EAM',
      name: 'Enterprise Asset Management',
      icon: QrCode,
      tagline: 'Weatherproof QR Tagging & Maintenance Schedules',
      desc: 'Complete asset lifecycle tracking from procurement to decommissioning. Affix durable QR codes to physical equipment for instant scan-to-inspect capabilities.',
      features: [
        'Unique QR code generation per asset instance',
        'Preventive Maintenance (PM) schedules and SLA timers',
        'Custody assignment and departmental transfers'
      ],
      rules: 'Asset transfers require digital sign-off from both releasing and receiving department heads.',
      exports: 'Fixed Asset Register (FAR), PM Calendar, Breakdown MTTR Report'
    },
    {
      num: '06',
      code: 'SCM',
      name: 'Supply Chain Management',
      icon: Boxes,
      tagline: 'Consumable Stock, POs & Goods Receipt Notes',
      desc: 'Multi-site inventory tracking for diesel, spare parts, housekeeping consumables, and security gear with automated reorder levels.',
      features: [
        'Real-time store balance tracking across site warehouses',
        'Purchase Requisition to Purchase Order (PO) workflow',
        'Goods Receipt Notes (GRN) with physical inspection'
      ],
      rules: 'GRN stock inward updates inventory balances only after quality inspection approval.',
      exports: 'Stock Balance Statement, Reorder Alert Sheet, Consumption Summary'
    },
    {
      num: '07',
      code: 'CRM',
      name: 'Customer Relationship Management',
      icon: Briefcase,
      tagline: 'Client Site Contracts & SLA Performance',
      desc: 'Management of client accounts, service agreements, contracted manpower quotas, and site escalation contact directories.',
      features: [
        'Contracted vs. deployed manpower monitoring',
        'Client SLA scorecards and inspection sign-offs',
        'Billing rate contracts linked to muster records'
      ],
      rules: 'Alerts account managers if deployed site strength falls below agreed SLA quota.',
      exports: 'Client SLA Performance Certificate, Contract Deployment Summary'
    },
    {
      num: '08',
      code: 'BI',
      name: 'Business Intelligence',
      icon: BarChart3,
      tagline: 'Executive Analytics & Form II Statutory Ledgers',
      desc: 'Cross-functional operational dashboards providing macro visibility into workforce attendance, guard patrol SLAs, asset uptime, and statutory compliance.',
      features: [
        'Form II statutory muster register export',
        'Patrol route compliance percentage matrices',
        'Operational anomaly heatmaps across nationwide sites'
      ],
      rules: 'Role-based data masking ensures site managers see only their authorized branch data.',
      exports: 'Statutory Form II Muster, Executive Board Deck, Operational CSV Export'
    },
    {
      num: '09',
      code: 'BPM',
      name: 'Business Process Management',
      icon: Workflow,
      tagline: 'Multi-Level Approval Chains & Escalations',
      desc: 'Configurable approval workflows for leave requests, material gate passes, equipment breakdown tickets, and purchase requisitions.',
      features: [
        'Multi-stage approval hierarchies (Supervisor → Ops Head → Admin)',
        'Automated time-based escalation if approval is stalled',
        'Digital signature and timestamp capture'
      ],
      rules: 'Critical requests auto-escalate to regional heads if unaddressed within 4 hours.',
      exports: 'Workflow Audit Trail, Pending Approval Queue Report'
    },
    {
      num: '10',
      code: 'GRC',
      name: 'Governance, Risk & Compliance',
      icon: ShieldCheck,
      tagline: 'Statutory Audits, Labor Laws & Security Rules',
      desc: 'Comprehensive compliance engine ensuring all operational activities adhere to local labor laws, safety mandates, and ISO audit requirements.',
      features: [
        'Immutable, append-only security audit log',
        'Statutory labor register format compliance',
        'EHS incident tracking and root cause analysis'
      ],
      rules: 'Audit logs cannot be deleted or modified, even by system administrators.',
      exports: 'Statutory Compliance Register, Safety Audit Report, Incident Register'
    },
    {
      num: '11',
      code: 'ITSM',
      name: 'Service Management',
      icon: Headphones,
      tagline: 'Facility Helpdesk, Breakdown Tickets & SLAs',
      desc: 'Internal service desk for logging facility complaints, electrical faults, plumbing issues, and IT support tickets with defined turnaround SLAs.',
      features: [
        'Ticket creation with photo attachment and priority level',
        'Automated routing to assigned technician or vendor',
        'Resolution sign-off and Mean Time to Repair (MTTR) tracking'
      ],
      rules: 'High-severity tickets auto-trigger SMS and email alerts to duty engineers.',
      exports: 'Helpdesk SLA Performance, Incident Log, MTTR Summary'
    },
    {
      num: '12',
      code: 'TA',
      name: 'Talent Acquisition',
      icon: UserCheck,
      tagline: 'Security Guard & Technician Deployment',
      desc: 'Candidate onboarding and deployment pipeline for security personnel, facility technicians, and housekeeping staff across client sites.',
      features: [
        'Skill and certification verification (PSARA, Fire Safety)',
        'Uniform and gear issuance tracking',
        'Site deployment and post-allocation workflow'
      ],
      rules: 'Candidates cannot be assigned to armed posts without verified PSARA/firearms certification.',
      exports: 'Deployment Roster, Gear Issuance Register, Skill Matrix'
    },
    {
      num: '13',
      code: 'LMS',
      name: 'Learning Management',
      icon: GraduationCap,
      tagline: 'SOP Training, Fire Drill Records & Refresher Tests',
      desc: 'Field staff training tracker covering standard operating procedures, fire evacuation protocols, first-aid training, and equipment operating manuals.',
      features: [
        'Digital SOP distribution and read-receipt tracking',
        'Fire drill and emergency response exercise logging',
        'Certification validity tracking and renewal alerts'
      ],
      rules: 'Staff with expired safety certifications are flagged on shift muster rosters.',
      exports: 'Training Completion Record, Fire Drill Log, Certification Expiry List'
    },
    {
      num: '14',
      code: 'SRM',
      name: 'Procurement & Vendor Management',
      icon: ShoppingBag,
      tagline: 'Vendor Registries, Rate Contracts & Evaluations',
      desc: 'Centralized directory of verified suppliers for facility equipment, diesel delivery, housekeeping chemicals, and security uniforms.',
      features: [
        'Vendor rate contract repository and price comparison',
        'Supplier performance scoring based on delivery SLA and quality',
        'Invoice matching against approved Purchase Orders and GRNs'
      ],
      rules: 'Purchase orders exceeding site budgets require additional finance head approval.',
      exports: 'Approved Vendor Directory, Vendor Performance Scorecard, Rate Contract Sheet'
    }
  ];

  const activeDomain = domains[activeDomainIndex];
  const ActiveIcon = activeDomain.icon;

  return (
    <section id="domains" className="py-24 lg:py-32 border-b border-[#E8E7E3] bg-[#F4F3EF]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
        
        {/* Section Header */}
        <div className="max-w-3xl mx-auto text-center space-y-4">
          <span className="font-mono text-xs font-bold uppercase tracking-widest text-emerald-600">
            Enterprise Scope
          </span>
          <h2 className="font-display text-3xl sm:text-5xl font-extrabold text-[#0A0D14] tracking-tight">
            14 ENTERPRISE DOMAINS
          </h2>
          <p className="font-body text-sm sm:text-base text-[#52525B] leading-relaxed">
            A comprehensive operational matrix engineered to orchestrate every facet of modern enterprise workforce and facility management.
          </p>
        </div>

        {/* Editorial Vertical Explorer Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left: Vertical Typographic Domain Selector */}
          <div className="lg:col-span-5 bg-white rounded-3xl border border-[#E7E6E1] p-3 sm:p-4 shadow-sm space-y-1 max-h-[620px] overflow-y-auto">
            {domains.map((domain, index) => {
              const isSelected = activeDomainIndex === index;
              return (
                <button
                  key={domain.num}
                  onClick={() => setActiveDomainIndex(index)}
                  className={`w-full text-left px-4 py-3 rounded-xl transition-all duration-150 flex items-center justify-between cursor-pointer ${
                    isSelected 
                      ? 'bg-[#0A0D14] text-white shadow-xs' 
                      : 'text-[#52525B] hover:bg-[#F4F3EF] hover:text-[#0A0D14]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className={`font-mono text-xs font-bold ${isSelected ? 'text-emerald-400' : 'text-[#71717A]'}`}>
                      {domain.num}
                    </span>
                    <span className="font-display text-xs sm:text-sm font-bold tracking-tight">
                      {domain.name}
                    </span>
                  </div>
                  <span className={`font-mono text-[10px] px-2 py-0.5 rounded font-semibold ${
                    isSelected ? 'bg-[#27272A] text-emerald-400' : 'bg-[#F4F3EF] text-[#71717A]'
                  }`}>
                    {domain.code}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Right: Detailed Editorial Disclosure */}
          <div className="lg:col-span-7 bg-white rounded-3xl border border-[#E7E6E1] p-8 sm:p-10 shadow-sm space-y-6">
            
            <div className="flex items-center justify-between pb-6 border-b border-[#E8E7E3]">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-[#0A0D14] text-emerald-400 flex items-center justify-center">
                  <ActiveIcon className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-emerald-600">DOMAIN {activeDomain.num}</span>
                    <span className="font-mono text-xs bg-[#F4F3EF] px-2 py-0.5 rounded font-bold text-[#0A0D14]">{activeDomain.code}</span>
                  </div>
                  <h3 className="font-display text-xl sm:text-2xl font-extrabold text-[#0A0D14]">
                    {activeDomain.name}
                  </h3>
                </div>
              </div>
            </div>

            <div className="space-y-4 font-body">
              <div>
                <span className="font-mono text-[11px] uppercase font-bold text-[#71717A] block">CORE OBJECTIVE</span>
                <p className="text-sm font-semibold text-[#0A0D14] mt-1">{activeDomain.tagline}</p>
                <p className="text-xs sm:text-sm text-[#52525B] mt-1.5 leading-relaxed">{activeDomain.desc}</p>
              </div>

              <div className="pt-3 border-t border-[#F0EFEB]">
                <span className="font-mono text-[11px] uppercase font-bold text-[#71717A] block mb-2">KEY CAPABILITIES</span>
                <div className="space-y-2">
                  {activeDomain.features.map((feat, i) => (
                    <div key={i} className="flex items-start gap-2.5 text-xs text-[#27272A]">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 mt-0.5 flex-shrink-0" />
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-4 rounded-xl bg-[#FBFBFA] border border-[#E8E7E3] space-y-2 text-xs">
                <div>
                  <strong className="font-mono text-[11px] uppercase text-[#0A0D14] block">BUSINESS LOGIC & ENFORCEMENT:</strong>
                  <p className="text-[#52525B] mt-0.5">{activeDomain.rules}</p>
                </div>
                <div className="pt-2 border-t border-[#E8E7E3]">
                  <strong className="font-mono text-[11px] uppercase text-[#0A0D14] block">AUDITABLE OUTPUTS:</strong>
                  <p className="text-emerald-700 font-medium mt-0.5">{activeDomain.exports}</p>
                </div>
              </div>
            </div>

          </div>

        </div>

      </div>
    </section>
  );
};
