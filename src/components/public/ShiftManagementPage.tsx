import React from 'react';
import { 
  Clock, 
  RotateCw, 
  Users, 
  Calendar, 
  AlertCircle, 
  CheckCircle2, 
  ArrowRight,
  ShieldCheck
} from 'lucide-react';
import { PhaseAScreen } from '../../types';
import { navigateToUrl } from '../../utils/publicRouter';

interface ShiftManagementPageProps {
  onNavigate: (screen: PhaseAScreen) => void;
}

export const ShiftManagementPage: React.FC<ShiftManagementPageProps> = ({ onNavigate }) => {
  const handleLinkClick = (e: React.MouseEvent<HTMLAnchorElement>, path: string) => {
    e.preventDefault();
    navigateToUrl(path);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <article className="space-y-16 py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      
      {/* Hero Section */}
      <section aria-labelledby="shift-hero-heading" className="text-center space-y-6 max-w-4xl mx-auto pt-6 pb-4">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-mono font-bold tracking-wide">
          <Clock className="w-3.5 h-3.5 text-emerald-600" />
          24/7 ROTATIONAL SHIFT & ROSTER SCHEDULER
        </div>

        <h1 id="shift-hero-heading" className="text-3xl sm:text-4xl lg:text-5xl font-display font-bold text-[#0A0D14] tracking-tight leading-tight">
          Intelligent Shift Management & 24/7 Rotational Roster Planning
        </h1>

        <p className="text-base sm:text-lg text-slate-600 leading-relaxed">
          Manage 24/7 complex rotational rosters across multiple customer sites. Prevent short-staffing, manage shift swaps, enforce mandatory rest intervals, and log digital supervisor handovers.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
          <a
            href="/contact"
            onClick={(e) => handleLinkClick(e, '/contact')}
            className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-[#0A0D14] hover:bg-slate-800 text-white text-xs font-bold font-mono uppercase tracking-wider transition-all shadow-md flex items-center justify-center gap-2"
          >
            Schedule Roster Demo
            <ArrowRight className="w-4 h-4" />
          </a>
          <a
            href="/workforce-management"
            onClick={(e) => handleLinkClick(e, '/workforce-management')}
            className="w-full sm:w-auto px-6 py-3.5 rounded-xl border border-slate-300 hover:border-slate-400 bg-white text-slate-800 hover:bg-slate-50 text-xs font-bold font-mono uppercase tracking-wider transition-all shadow-xs"
          >
            Explore Workforce Ops &rarr;
          </a>
        </div>
      </section>

      {/* Grid of Key Features */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 rounded-2xl bg-white border border-[#E8E7E3] space-y-3 shadow-xs">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
            <RotateCw className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-[#0A0D14]">Rotational 3-Shift Patterns</h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            Automate Morning (A), Afternoon (B), Night (C), and General shifts with customizable grace periods and rest breaks.
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-white border border-[#E8E7E3] space-y-3 shadow-xs">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
            <AlertCircle className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-[#0A0D14]">Short-Staffing Alerts</h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            Immediate visual alerts when required guard or technician headcount drops below customer SLA minimum requirements.
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-white border border-[#E8E7E3] space-y-3 shadow-xs">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-[#0A0D14]">Digital Handover Sign-Off</h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            Outgoing and incoming site supervisors sign digital handover checklists for key assets, incidents, and equipment status.
          </p>
        </div>
      </section>

    </article>
  );
};
