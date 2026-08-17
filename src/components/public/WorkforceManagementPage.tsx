import React from 'react';
import { 
  Building2, 
  Users, 
  MapPin, 
  Layers, 
  FileSpreadsheet, 
  CheckCircle2, 
  ArrowRight,
  TrendingUp
} from 'lucide-react';
import { PhaseAScreen } from '../../types';
import { navigateToUrl } from '../../utils/publicRouter';

interface WorkforceManagementPageProps {
  onNavigate: (screen: PhaseAScreen) => void;
}

export const WorkforceManagementPage: React.FC<WorkforceManagementPageProps> = ({ onNavigate }) => {
  const handleLinkClick = (e: React.MouseEvent<HTMLAnchorElement>, path: string) => {
    e.preventDefault();
    navigateToUrl(path);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <article className="space-y-16 py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      
      {/* Hero Section */}
      <section aria-labelledby="wfm-hero-heading" className="text-center space-y-6 max-w-4xl mx-auto pt-6 pb-4">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-mono font-bold tracking-wide">
          <Building2 className="w-3.5 h-3.5 text-emerald-600" />
          ENTERPRISE WORKFORCE & SITE DEPLOYMENT SYSTEM
        </div>

        <h1 id="wfm-hero-heading" className="text-3xl sm:text-4xl lg:text-5xl font-display font-bold text-[#0A0D14] tracking-tight leading-tight">
          Enterprise Workforce Management (WFM) for Field & Site Operations
        </h1>

        <p className="text-base sm:text-lg text-slate-600 leading-relaxed">
          Coordinate large-scale field teams across security agencies, facility management firms, and industrial manufacturing plants. Monitor live site deployments, roll-call attendance, and task execution in real-time.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
          <a
            href="/contact"
            onClick={(e) => handleLinkClick(e, '/contact')}
            className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-[#0A0D14] hover:bg-slate-800 text-white text-xs font-bold font-mono uppercase tracking-wider transition-all shadow-md flex items-center justify-center gap-2"
          >
            Schedule WFM Demo
            <ArrowRight className="w-4 h-4" />
          </a>
          <a
            href="/facility-management"
            onClick={(e) => handleLinkClick(e, '/facility-management')}
            className="w-full sm:w-auto px-6 py-3.5 rounded-xl border border-slate-300 hover:border-slate-400 bg-white text-slate-800 hover:bg-slate-50 text-xs font-bold font-mono uppercase tracking-wider transition-all shadow-xs"
          >
            Explore Facility Operations &rarr;
          </a>
        </div>
      </section>

      {/* Grid of Key Features */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 rounded-2xl bg-white border border-[#E8E7E3] space-y-3 shadow-xs">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
            <MapPin className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-[#0A0D14]">Client Site Deployments</h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            Organize staff deployment across multiple client locations with dedicated post assignments and billing rates.
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-white border border-[#E8E7E3] space-y-3 shadow-xs">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
            <TrendingUp className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-[#0A0D14]">Manpower Utilization BI</h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            Real-time analytics comparing budgeted deployment vs actual muster roll-call numbers to maximize billing realization.
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-white border border-[#E8E7E3] space-y-3 shadow-xs">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
            <Layers className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-[#0A0D14]">Unified Single Source of Truth</h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            Zero duplicate entries: roster allocations instantly update roll-call screens, guard patrols, and monthly payroll batches.
          </p>
        </div>
      </section>

    </article>
  );
};
