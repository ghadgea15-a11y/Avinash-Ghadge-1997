import React from 'react';
import { 
  FileText, 
  CheckCircle2, 
  Clock, 
  ArrowRight, 
  Calendar, 
  BellRing, 
  Layers
} from 'lucide-react';
import { PhaseAScreen } from '../../types';
import { navigateToUrl } from '../../utils/publicRouter';

interface LeaveManagementPageProps {
  onNavigate: (screen: PhaseAScreen) => void;
}

export const LeaveManagementPage: React.FC<LeaveManagementPageProps> = ({ onNavigate }) => {
  const handleLinkClick = (e: React.MouseEvent<HTMLAnchorElement>, path: string) => {
    e.preventDefault();
    navigateToUrl(path);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <article className="space-y-16 py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      
      {/* Hero Section */}
      <section aria-labelledby="leave-hero-heading" className="text-center space-y-6 max-w-4xl mx-auto pt-6 pb-4">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-mono font-bold tracking-wide">
          <FileText className="w-3.5 h-3.5 text-emerald-600" />
          LEAVE ADMINISTRATION & MULTI-TIER APPROVALS
        </div>

        <h1 id="leave-hero-heading" className="text-3xl sm:text-4xl lg:text-5xl font-display font-bold text-black tracking-tight leading-tight">
          Automated Leave Management & Approval Workflows
        </h1>

        <p className="text-base sm:text-lg text-slate-600 dark:text-slate-400 leading-relaxed">
          Manage casual leave (CL), paid privilege leave (PL), sick leave (SL), compensatory off (CO), and maternity leaves with multi-tier approval chains and instant muster ledger updates.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
          <a
            href="/contact"
            onClick={(e) => handleLinkClick(e, '/contact')}
            className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-black hover:bg-slate-800 text-white text-xs font-bold font-mono uppercase tracking-wider transition-all shadow-md flex items-center justify-center gap-2"
          >
            Schedule Leave Demo
            <ArrowRight className="w-4 h-4" />
          </a>
          <a
            href="/hrms"
            onClick={(e) => handleLinkClick(e, '/hrms')}
            className="w-full sm:w-auto px-6 py-3.5 rounded-xl border border-slate-300 hover:border-slate-400 bg-white dark:bg-slate-900 text-black dark:text-slate-200 hover:bg-white dark:bg-slate-950 text-xs font-bold font-mono uppercase tracking-wider transition-all shadow-xs"
          >
            Explore HRMS Suite &rarr;
          </a>
        </div>
      </section>

      {/* Grid of Key Features */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 space-y-3 shadow-xs">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
            <Layers className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-black">Multi-Tier Approval Chains</h3>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            Configure automated routing from Site Supervisor to Area Manager and HR Admin with real-time push notifications.
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 space-y-3 shadow-xs">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
            <Calendar className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-black">Live Balance Ledgers</h3>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            Real-time tracking of accrued, availed, encashed, and lapsed leaves across financial years with statutory audit compliance.
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 space-y-3 shadow-xs">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-black">Auto Payroll LOP Deduction</h3>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            Unapproved leaves and Loss of Pay (LOP) are automatically deducted from the monthly payroll engine without manual calculation.
          </p>
        </div>
      </section>

    </article>
  );
};
