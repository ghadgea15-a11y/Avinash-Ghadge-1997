import React, { useState } from 'react';
import { 
  Users, 
  ShieldCheck, 
  Building2, 
  QrCode, 
  Boxes, 
  BarChart3, 
  CheckCircle2, 
  ArrowRight,
  Shield,
  FileText,
  Clock,
  Smartphone,
  ChevronDown,
  Layers,
  Sparkles,
  GitBranch,
  Cpu
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

export const ProductDetails: React.FC = () => {
  const { isDark } = useTheme();
  const [activeTab, setActiveTab] = useState<number>(0);
  const [expandedDetail, setExpandedDetail] = useState<number | null>(0);

  const pillars = [
    {
      id: 'workforce',
      title: 'Workforce Operations',
      icon: Users,
      badge: 'HCM & ATTENDANCE MUSTER',
      summary: 'Complete human capital administration and shift muster automation from entry-level security guards to facility directors.',
      details: [
        {
          name: 'Employee Master Records',
          desc: 'Aadhaar, PAN, bank details, emergency contacts, digital photo IDs, and KYC audit statuses in a centralized registry.'
        },
        {
          name: 'Attendance & Muster Roll-Call',
          desc: 'Live digital roll-call with Present, Absent, Half-Day, and On-Duty markings, eliminating paper registers.'
        },
        {
          name: 'Shift Management & Rosters',
          desc: 'Flexible multi-shift schedules, 24/7 rotational rosters, grace periods, and automated shift-change handovers.'
        },
        {
          name: 'Leave Administration',
          desc: 'Self-service leave requests, supervisor multi-tier approval chains, and real-time leave balance computation.'
        },
        {
          name: 'Statutory Payroll Engine',
          desc: 'Muster-synchronized salary calculations, overtime allowances, advance deductions, and PDF payslip distribution.'
        },
        {
          name: 'Supervisor Governance',
          desc: 'Field supervisor sign-offs, daily roll-call verification, and automated shift-completion alerts.'
        }
      ]
    },
    {
      id: 'security',
      title: 'Security Operations',
      icon: ShieldCheck,
      badge: 'GUARD PATROLS & GATE PASSES',
      summary: 'End-to-end physical security governance with QR checkpoint patrol verification, digital visitor gate passes, and incident registers.',
      details: [
        {
          name: 'Guard & Post Management',
          desc: 'Deployment quota tracking, post assignments, guard ID badges, and emergency contact directories.'
        },
        {
          name: 'QR Checkpoint Patrol Engine',
          desc: 'Geotagged physical QR code checkpoints placed along patrol routes requiring physical on-ground scans.'
        },
        {
          name: 'Patrol Tour Scheduling',
          desc: 'Mandatory patrol frequency (e.g. hourly tours), route sequence adherence, and maximum time thresholds.'
        },
        {
          name: 'Incident Register & RCA',
          desc: 'Immediate reporting of security anomalies, broken seals, unauthorized entries, with photo proof and priority tags.'
        },
        {
          name: 'Visitor Gate Pass Management',
          desc: 'Digital visitor check-in, host notification, purpose logging, badge printing, and timestamped exit tracking.'
        },
        {
          name: 'Material Gate Pass (Inward/Outward)',
          desc: 'Material dispatch validation, vehicle plate logging, returnable/non-returnable tracking, and supervisor sign-offs.'
        }
      ]
    },
    {
      id: 'operations',
      title: 'Facility Operations',
      icon: Building2,
      badge: 'SITE & LOG MANAGEMENT',
      summary: 'Centralized facility management overseeing multiple branches, daily site log sheets, and proactive task escalations.',
      details: [
        {
          name: 'Multi-Site Facility Hierarchy',
          desc: 'Multi-tiered company structure (Headquarters → Regional Branches → Client Sites → Sub-Zones).'
        },
        {
          name: 'Daily Equipment Log Sheets',
          desc: 'Digital parameter logs for Diesel Generators (DG), HVAC chillers, water pumps, electrical panels, and energy meters.'
        },
        {
          name: 'Task & Work Order Routing',
          desc: 'Digital assignment of maintenance and housekeeping tasks with due dates, priority tags, and photo sign-offs.'
        },
        {
          name: 'Supervisor Approval Workflows',
          desc: 'Streamlined operational review chains for daily site logs, incident resolutions, and leave requests.'
        },
        {
          name: 'Operational Escalation Timers',
          desc: 'Automated notification alerts when critical equipment parameters exceed normal thresholds or tasks breach SLAs.'
        },
        {
          name: 'Digital Log Sheet Archives',
          desc: 'Historical log sheet search, parameter trend graphs, and exportable maintenance history for audit compliance.'
        }
      ]
    },
    {
      id: 'assets',
      title: 'Enterprise Assets',
      icon: QrCode,
      badge: 'LIFECYCLE & MAINTENANCE',
      summary: 'Centralized asset registry with unique QR code tagging, custody allocations, and preventive maintenance tracking.',
      details: [
        {
          name: 'Centralized Asset Registry',
          desc: 'Master inventory of all physical machinery, equipment, tools, furniture, and safety devices.'
        },
        {
          name: 'Unique QR Code Tagging',
          desc: 'Instant asset lookup on mobile devices by scanning waterproof QR code asset tags attached to physical equipment.'
        },
        {
          name: 'Custody Allocation & Tracking',
          desc: 'Detailed sign-off logs recording which employee, guard, or department is currently in possession of specific tools.'
        },
        {
          name: 'Preventive Maintenance Schedules',
          desc: 'Automated recurring maintenance calendars with task checklists for technicians and automated service alerts.'
        },
        {
          name: 'Breakdown & Repair History',
          desc: 'Complete service logs capturing technician notes, replacement parts used, costs, and equipment downtime hours.'
        },
        {
          name: 'Decommissioning & Auditing',
          desc: 'End-of-life asset disposal logs, physical verification audits, and depreciation history reports.'
        }
      ]
    },
    {
      id: 'inventory',
      title: 'Inventory & Supplies',
      icon: Boxes,
      badge: 'STOCK & PROCUREMENT',
      summary: 'Real-time stock balance tracking, supplier rate registers, purchase orders, and goods receipt verification.',
      details: [
        {
          name: 'Real-Time Stock Balances',
          desc: 'Live tracking of consumables (cleaning supplies, safety gear, uniform accessories, batteries) across site stores.'
        },
        {
          name: 'Supplier & Vendor Database',
          desc: 'Centralized vendor contact cards, contracted rate sheets, tax IDs, and vendor performance history.'
        },
        {
          name: 'Purchase Order (PO) Management',
          desc: 'Standardized PO creation with multi-level budget approval workflows and PDF dispatch to suppliers.'
        },
        {
          name: 'Goods Receipt Notes (GRN)',
          desc: 'On-ground verification of delivered quantities, physical quality inspections, and variance rejection logs.'
        },
        {
          name: 'Inter-Site Stock Transfers',
          desc: 'Tracked dispatch and receipt of materials transferred between headquarters and regional branch sites.'
        },
        {
          name: 'Physical Stock Audits',
          desc: 'Scheduled stock reconciliation audits, shrinkage variance adjustments, and reorder point threshold alerts.'
        }
      ]
    },
    {
      id: 'analytics',
      title: 'Management Intelligence',
      icon: BarChart3,
      badge: 'EXECUTIVE BI & COMPLIANCE',
      summary: 'Real-time executive performance dashboards, statutory Form II muster ledgers, and comprehensive data export.',
      details: [
        {
          name: 'Executive KPI Dashboards',
          desc: 'Live high-level visibility into shift muster percentages, active patrol counts, open tickets, and compliance scores.'
        },
        {
          name: 'Form II Statutory Muster Ledgers',
          desc: 'One-click generation of legally compliant monthly attendance muster sheets ready for labor commissioner inspections.'
        },
        {
          name: 'Patrol Compliance Reports',
          desc: 'Audit summaries calculating percentage of scheduled checkpoints scanned on time versus missed patrol tours.'
        },
        {
          name: 'Equipment Downtime Analytics',
          desc: 'Mean time to repair (MTTR) metrics, recurring breakdown frequency charts, and facility maintenance cost trends.'
        },
        {
          name: 'Multi-Tenant Company Reports',
          desc: 'Consolidated performance comparisons across multiple client accounts, branches, and regional managers.'
        },
        {
          name: 'Structured Data Exports',
          desc: 'Comprehensive export capability to CSV, Excel, and PDF formats for payroll processing and enterprise reporting.'
        }
      ]
    }
  ];

  const currentPillar = pillars[activeTab];

  return (
    <section id="details" className={`py-20 border-y transition-colors ${
      isDark ? 'bg-slate-950/80 border-slate-800' : 'bg-slate-50 border-slate-200'
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <span className="text-xs font-bold uppercase tracking-widest text-indigo-500 font-mono">
            Platform Specifications
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Deep-Dive Product Details &amp; Workflows
          </h2>
          <p className={`text-sm sm:text-base ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
            Explore the granular technical specifications and field-tested workflows powering each operational pillar.
          </p>
        </div>

        {/* Pillar Tabs Bar */}
        <div className="flex flex-wrap items-center justify-center gap-2 max-w-5xl mx-auto">
          {pillars.map((p, idx) => {
            const Icon = p.icon;
            const isSelected = activeTab === idx;
            return (
              <button
                key={p.id}
                onClick={() => {
                  setActiveTab(idx);
                  setExpandedDetail(0);
                }}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                    : isDark 
                      ? 'bg-slate-900 border border-slate-800 text-slate-300 hover:text-white' 
                      : 'bg-white border border-slate-200 text-slate-700 hover:text-slate-950 shadow-xs'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{p.title}</span>
              </button>
            );
          })}
        </div>

        {/* Selected Pillar Content Card */}
        <div className={`p-6 sm:p-10 rounded-3xl border shadow-2xl transition ${
          isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200'
        }`}>
          
          {/* Pillar Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-4">
              <div className="p-3.5 rounded-2xl bg-indigo-500/10 text-indigo-500 border border-indigo-500/20">
                {React.createElement(currentPillar.icon, { className: 'w-7 h-7' })}
              </div>
              <div>
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-500">
                  {currentPillar.badge}
                </span>
                <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white">
                  {currentPillar.title}
                </h3>
              </div>
            </div>
            <p className={`text-xs sm:text-sm max-w-md ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
              {currentPillar.summary}
            </p>
          </div>

          {/* Granular Sub-Features Accordion / Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-8">
            {currentPillar.details.map((detail, dIdx) => (
              <div
                key={dIdx}
                className={`p-5 rounded-2xl border transition-all ${
                  isDark ? 'bg-slate-950/60 border-slate-800 hover:border-slate-700' : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 className="w-4 h-4 text-indigo-500 shrink-0" />
                  <strong className="text-xs font-bold text-slate-900 dark:text-white">
                    {detail.name}
                  </strong>
                </div>
                <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                  {detail.desc}
                </p>
              </div>
            ))}
          </div>

        </div>

      </div>
    </section>
  );
};
