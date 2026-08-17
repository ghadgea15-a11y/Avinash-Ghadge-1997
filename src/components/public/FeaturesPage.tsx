import React from 'react';
import { 
  Sparkles, 
  Users, 
  CalendarCheck, 
  CreditCard, 
  Clock, 
  Building, 
  ShieldCheck, 
  FileSpreadsheet, 
  BarChart3, 
  CheckCircle2, 
  ArrowRight,
  QrCode,
  Smartphone,
  Scale
} from 'lucide-react';
import { PhaseAScreen } from '../../types';
import { navigateToUrl } from '../../utils/publicRouter';

interface FeaturesPageProps {
  onNavigate: (screen: PhaseAScreen) => void;
}

export const FeaturesPage: React.FC<FeaturesPageProps> = ({ onNavigate }) => {
  const handleLinkClick = (e: React.MouseEvent<HTMLAnchorElement>, path: string) => {
    e.preventDefault();
    navigateToUrl(path);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const featureClusters = [
    {
      title: 'Human Resource Management (HRMS)',
      icon: Users,
      path: '/hrms',
      items: [
        'Centralized employee master database with Aadhaar & PAN KYC verification',
        'Digital photo ID badge generation with QR code scan verification',
        '10-Tier authority hierarchy (A0 Owner down to A9 Support Staff)',
        'Emergency contacts and medical dependency registers'
      ]
    },
    {
      title: 'Statutory Attendance & Form II Muster',
      icon: CalendarCheck,
      path: '/attendance-management',
      items: [
        'Digital supervisor roll-call eliminating physical muster registers',
        'Present, Absent, Half-Day, Weekly Off, and On-Duty (OD) marking',
        'One-click government-compliant Form II Muster Roll PDF/Excel exports',
        'Geofenced mobile check-in and check-out with GPS verification'
      ]
    },
    {
      title: 'Indian Statutory Payroll Engine',
      icon: CreditCard,
      path: '/payroll',
      items: [
        'Automatic EPF (12%), ESIC (0.75%/3.25%), and State PT slab calculation',
        'Overtime allowance multiplier computation synced with attendance muster',
        'Export formatted NEFT / RTGS bank transfer batch files (SBI, HDFC, ICICI, etc.)',
        'Digital password-protected PDF payslips published to mobile portal'
      ]
    },
    {
      title: '24/7 Shift Scheduling & Rotational Rosters',
      icon: Clock,
      path: '/shift-management',
      items: [
        'Rotational 3-shift scheduling (Morning A, Afternoon B, Night C, General)',
        'Short-staffing warning alerts against client SLA contract minimums',
        'Shift swap workflows with supervisor approval tracking',
        'Digital handover checklists for incoming/outgoing site supervisors'
      ]
    },
    {
      title: 'Security Guard Patrols & QR Checkpoints',
      icon: ShieldCheck,
      path: '/security-management',
      items: [
        'Perimeter guard patrol monitoring with physical QR code checkpoint scans',
        'GPS proximity verification preventing missed or simulated patrol rounds',
        'Digital Visitor Gate Pass system with host approval and photo capture',
        'Material Inward / Outward Returnable Gate Pass (RGP) tracking'
      ]
    },
    {
      title: 'Facility Management & Digital Log Sheets',
      icon: Building,
      path: '/facility-management',
      items: [
        'Hourly/Daily DG set fuel, energy meter, and HVAC equipment log sheets',
        'Planned Preventive Maintenance (PPM) work order ticket dispatch',
        'Housekeeping checklist verification with supervisor sign-offs',
        'SLA resolution tracking with before-and-after photo attachments'
      ]
    }
  ];

  return (
    <article className="space-y-16 py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      
      {/* Hero Section */}
      <section aria-labelledby="features-hero-heading" className="text-center space-y-6 max-w-4xl mx-auto pt-6 pb-4">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-mono font-bold tracking-wide">
          <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
          ENTERPRISE PLATFORM CAPABILITIES
        </div>

        <h1 id="features-hero-heading" className="text-3xl sm:text-4xl lg:text-5xl font-display font-bold text-[#0A0D14] tracking-tight leading-tight">
          Comprehensive Platform Features & Architectural Disciplines
        </h1>

        <p className="text-base sm:text-lg text-slate-600 leading-relaxed">
          Log Sheet Muster connects distributed workforce management, physical security guard tours, facility maintenance logbooks, and statutory Indian labor compliance into one cohesive cloud architecture.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
          <a
            href="/contact"
            onClick={(e) => handleLinkClick(e, '/contact')}
            className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-[#0A0D14] hover:bg-slate-800 text-white text-xs font-bold font-mono uppercase tracking-wider transition-all shadow-md flex items-center justify-center gap-2"
          >
            Schedule Full Feature Demo
            <ArrowRight className="w-4 h-4" />
          </a>
          <a
            href="/pricing"
            onClick={(e) => handleLinkClick(e, '/pricing')}
            className="w-full sm:w-auto px-6 py-3.5 rounded-xl border border-slate-300 hover:border-slate-400 bg-white text-slate-800 hover:bg-slate-50 text-xs font-bold font-mono uppercase tracking-wider transition-all shadow-xs"
          >
            View Pricing Plans &rarr;
          </a>
        </div>
      </section>

      {/* Feature Clusters Grid */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {featureClusters.map((cluster) => {
          const Icon = cluster.icon;
          return (
            <div 
              key={cluster.title}
              className="bg-white border border-[#E8E7E3] rounded-3xl p-6 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-6"
            >
              <div className="space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-100">
                  <Icon className="w-6 h-6" />
                </div>
                <h2 className="text-lg font-display font-bold text-[#0A0D14]">{cluster.title}</h2>
                
                <ul className="space-y-2.5 pt-2 border-t border-slate-100">
                  {cluster.items.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-xs text-slate-700 leading-relaxed">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <a
                href={cluster.path}
                onClick={(e) => handleLinkClick(e, cluster.path)}
                className="inline-flex items-center gap-1 text-xs font-mono font-bold text-emerald-700 hover:text-emerald-800 pt-2"
              >
                Learn more &rarr;
              </a>
            </div>
          );
        })}
      </section>

    </article>
  );
};
