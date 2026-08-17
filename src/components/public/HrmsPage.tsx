import React from 'react';
import { 
  Users, 
  CalendarCheck, 
  CreditCard, 
  Clock, 
  ShieldCheck, 
  FileText, 
  ArrowRight, 
  CheckCircle2, 
  Layers, 
  Smartphone,
  ChevronRight,
  Sparkles,
  Award,
  BarChart3
} from 'lucide-react';
import { PhaseAScreen } from '../../types';
import { navigateToUrl } from '../../utils/publicRouter';

interface HrmsPageProps {
  onNavigate: (screen: PhaseAScreen) => void;
}

export const HrmsPage: React.FC<HrmsPageProps> = ({ onNavigate }) => {
  const handleLinkClick = (e: React.MouseEvent<HTMLAnchorElement>, path: string) => {
    e.preventDefault();
    navigateToUrl(path);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const coreModules = [
    {
      title: 'Employee Master Directory',
      path: '/employee-management',
      icon: Users,
      desc: 'Centralized repository for Aadhaar, PAN, KYC validation, digital ID generation, and multi-tier department hierarchy.',
      points: ['Digital KYC Audit Verification', 'Emergency Contact Registers', 'Role-Based Skill Grading (A0-A9)']
    },
    {
      title: 'Form II Attendance Muster',
      path: '/attendance-management',
      icon: CalendarCheck,
      desc: 'Digital daily muster roll-call replacing physical paper registers. Fully compliant with Indian statutory labor laws.',
      points: ['Daily Supervisor Roll-Call', 'Present/Absent/Half-Day/On-Duty Marking', 'One-Click Form II PDF Export']
    },
    {
      title: 'Leave Management & Approvals',
      path: '/leave-management',
      icon: FileText,
      desc: 'Automated leave application, multi-tier approval chains (Supervisor -> Area Manager -> HR), and real-time leave ledger.',
      points: ['Multi-Tier Approval Hierarchy', 'Compensatory Off & Casual Leaves', 'Payroll Loss-Of-Pay Synchronization']
    },
    {
      title: 'Statutory Payroll Engine',
      path: '/payroll',
      icon: CreditCard,
      desc: 'Muster-synchronized salary computation factoring EPF, ESIC, State Professional Tax, Overtime, and bank batch files.',
      points: ['Statutory PF, ESI & PT Slabs', 'Overtime Allowance Multipliers', 'NEFT/RTGS Bank Batch Files']
    },
    {
      title: '24/7 Shift Rostering',
      path: '/shift-management',
      icon: Clock,
      desc: 'Rotational 3-shift scheduling, shift swap workflows, minimum rest intervals, and supervisor handover logs.',
      points: ['Rotational Morning/Afternoon/Night', 'Grace Periods & Late Punch Rules', 'Supervisor Shift Handover Ledgers']
    },
    {
      title: 'Employee Self-Service (ESS)',
      path: '/employee-self-service',
      icon: Smartphone,
      desc: 'Mobile-friendly self-service portal empowering employees to punch attendance, view duty rosters, and download payslips.',
      points: ['Mobile Geotagged Self Punch', 'Digital Payslip PDF Downloads', 'Leave Requests & Approvals Tracking']
    }
  ];

  return (
    <article className="space-y-16 py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      
      {/* Hero Section */}
      <section aria-labelledby="hrms-hero-heading" className="text-center space-y-6 max-w-4xl mx-auto pt-6 pb-4">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-mono font-bold tracking-wide">
          <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
          ENTERPRISE HUMAN RESOURCE MANAGEMENT SYSTEM (HRMS)
        </div>

        <h1 id="hrms-hero-heading" className="text-3xl sm:text-4xl lg:text-5xl font-display font-bold text-[#0A0D14] tracking-tight leading-tight">
          Enterprise HRMS Software Built for Distributed & Deskless Teams
        </h1>

        <p className="text-base sm:text-lg text-slate-600 leading-relaxed">
          Log Sheet Muster unifies employee master records, statutory Form II attendance muster, 24/7 rotational shift rosters, multi-tier leave approvals, and automated Indian statutory payroll into a single high-performance cloud platform.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
          <a
            href="/contact"
            onClick={(e) => handleLinkClick(e, '/contact')}
            className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-[#0A0D14] hover:bg-slate-800 text-white text-xs font-bold font-mono uppercase tracking-wider transition-all shadow-md flex items-center justify-center gap-2"
          >
            Schedule HRMS Demo
            <ArrowRight className="w-4 h-4" />
          </a>
          <button
            onClick={() => onNavigate('LOGIN')}
            className="w-full sm:w-auto px-6 py-3.5 rounded-xl border border-slate-300 hover:border-slate-400 bg-white text-slate-800 hover:bg-slate-50 text-xs font-bold font-mono uppercase tracking-wider transition-all shadow-xs"
          >
            Launch Workstation
          </button>
        </div>
      </section>

      {/* Interactive Value Grid */}
      <section aria-labelledby="core-modules-heading" className="space-y-8">
        <div className="text-center space-y-2 max-w-2xl mx-auto">
          <h2 id="core-modules-heading" className="text-2xl sm:text-3xl font-display font-bold text-[#0A0D14]">
            6 Core Disciplines of the HRMS Suite
          </h2>
          <p className="text-xs sm:text-sm text-slate-600">
            Each module is natively interconnected with zero third-party synchronization latency.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {coreModules.map((mod) => {
            const Icon = mod.icon;
            return (
              <div 
                key={mod.title}
                className="bg-white border border-[#E8E7E3] rounded-2xl p-6 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-6 group"
              >
                <div className="space-y-4">
                  <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-100 group-hover:scale-105 transition-transform">
                    <Icon className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-display font-bold text-[#0A0D14]">
                    {mod.title}
                  </h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {mod.desc}
                  </p>
                  
                  <ul className="space-y-2 pt-2 border-t border-slate-100">
                    {mod.points.map((pt) => (
                      <li key={pt} className="flex items-center gap-2 text-xs text-slate-700">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>{pt}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <a
                  href={mod.path}
                  onClick={(e) => handleLinkClick(e, mod.path)}
                  className="inline-flex items-center gap-1.5 text-xs font-mono font-bold text-emerald-700 hover:text-emerald-800 transition-colors pt-2"
                >
                  Explore {mod.title} &rarr;
                </a>
              </div>
            );
          })}
        </div>
      </section>

      {/* Operational Workflow Showcase */}
      <section aria-labelledby="workflow-heading" className="bg-white border border-[#E8E7E3] rounded-3xl p-8 sm:p-12 shadow-sm space-y-8">
        <div className="max-w-3xl space-y-3">
          <span className="text-xs font-mono font-bold text-emerald-700 uppercase tracking-widest">
            OPERATIONAL LIFECYCLE WORKFLOW
          </span>
          <h2 id="workflow-heading" className="text-2xl sm:text-3xl font-display font-bold text-[#0A0D14]">
            How Log Sheet Muster Coordinates Field HR Operations
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            From hiring to monthly statutory bank payouts, the entire lifecycle is tracked through timestamped audit ledgers.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 relative">
          {[
            { step: '01', title: 'Onboarding & KYC', desc: 'Aadhaar, PAN, bank account validation, and role assignment with digital photo ID creation.' },
            { step: '02', title: 'Daily Shift Muster', desc: 'On-site supervisor digital roll-call with GPS radius verification and Form II register logging.' },
            { step: '03', title: 'Leave & Exceptions', desc: 'Automated leave requests with multi-tier approvals and real-time loss-of-pay calculation.' },
            { step: '04', title: 'Payroll & Bank Batch', desc: 'Statutory EPF, ESIC, PT calculation with one-click bank disbursement batch file export.' }
          ].map((st) => (
            <div key={st.step} className="p-5 rounded-xl bg-[#FBFBFA] border border-[#E8E7E3] space-y-3">
              <div className="text-xs font-mono font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-md inline-block">
                STEP {st.step}
              </div>
              <h3 className="text-sm font-bold text-[#0A0D14]">{st.title}</h3>
              <p className="text-xs text-slate-600 leading-relaxed">{st.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ Section */}
      <section aria-labelledby="faq-heading" className="space-y-6 max-w-4xl mx-auto">
        <div className="text-center space-y-2">
          <h2 id="faq-heading" className="text-2xl font-display font-bold text-[#0A0D14]">
            Frequently Asked Questions about Log Sheet Muster HRMS
          </h2>
        </div>

        <div className="space-y-4">
          {[
            {
              q: 'How does Log Sheet Muster HRMS handle Form II Statutory Attendance Registers in Maharashtra?',
              a: 'Log Sheet Muster automatically compiles all daily roll-calls into government-compliant Form II Muster registers, factoring present days, absent days, leave codes, weekly offs, and overtime hours with digital supervisor signatures.'
            },
            {
              q: 'Can our company configure custom salary structures and allowance heads?',
              a: 'Yes. The payroll compensation module allows defining Basic, HRA, Conveyance, Special Allowances, Overtime Multipliers, along with automatic statutory EPF, ESIC, and State Professional Tax slabs.'
            },
            {
              q: 'Is multi-branch and multi-site access control supported?',
              a: 'Yes. Built on 10 hierarchical authority tiers (A0 Owner to A9 Support Staff), site supervisors only view their allocated branch staff, while regional managers and HR admins have consolidated cross-branch oversight.'
            }
          ].map((faq, i) => (
            <div key={i} className="p-5 rounded-xl bg-white border border-[#E8E7E3] shadow-xs space-y-2">
              <h3 className="text-sm font-bold text-[#0A0D14] flex items-center gap-2">
                <span className="text-emerald-600 font-mono">Q.</span>
                {faq.q}
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed pl-5">
                {faq.a}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Footer Card */}
      <section className="bg-[#0A0D14] text-white rounded-3xl p-8 sm:p-12 text-center space-y-6 shadow-xl">
        <h2 className="text-2xl sm:text-3xl font-display font-bold tracking-tight">
          Ready to Modernize Your Workforce & HR Operations?
        </h2>
        <p className="text-xs sm:text-sm text-slate-400 max-w-2xl mx-auto leading-relaxed">
          Join leading facility management, security, and industrial enterprises across India running on Log Sheet Muster.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <a
            href="/contact"
            onClick={(e) => handleLinkClick(e, '/contact')}
            className="px-6 py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-mono font-bold text-xs uppercase tracking-wider transition-all shadow-md flex items-center gap-2"
          >
            Schedule Live Platform Demo &rarr;
          </a>
        </div>
      </section>

    </article>
  );
};
