import React from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  Download, 
  PieChart, 
  Layers, 
  CheckCircle2, 
  ArrowRight,
  FileSpreadsheet
} from 'lucide-react';
import { PhaseAScreen } from '../../types';
import { navigateToUrl } from '../../utils/publicRouter';

interface ReportsAnalyticsPageProps {
  onNavigate: (screen: PhaseAScreen) => void;
}

export const ReportsAnalyticsPage: React.FC<ReportsAnalyticsPageProps> = ({ onNavigate }) => {
  const handleLinkClick = (e: React.MouseEvent<HTMLAnchorElement>, path: string) => {
    e.preventDefault();
    navigateToUrl(path);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <article className="space-y-16 py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      
      {/* Hero Section */}
      <section aria-labelledby="reports-hero-heading" className="text-center space-y-6 max-w-4xl mx-auto pt-6 pb-4">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-mono font-bold tracking-wide">
          <BarChart3 className="w-3.5 h-3.5 text-emerald-600" />
          EXECUTIVE MIS & OPERATIONAL ANALYTICS
        </div>

        <h1 id="reports-hero-heading" className="text-3xl sm:text-4xl lg:text-5xl font-display font-bold text-[#0A0D14] tracking-tight leading-tight">
          Executive Reports, MIS Dashboards & Workforce Analytics
        </h1>

        <p className="text-base sm:text-lg text-slate-600 leading-relaxed">
          Gain deep visibility into your manpower deployment, site billing realization, guard patrol compliance, overtime expenditure, and facility PPM resolution across all customer branches.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
          <a
            href="/contact"
            onClick={(e) => handleLinkClick(e, '/contact')}
            className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-[#0A0D14] hover:bg-slate-800 text-white text-xs font-bold font-mono uppercase tracking-wider transition-all shadow-md flex items-center justify-center gap-2"
          >
            Schedule Analytics Demo
            <ArrowRight className="w-4 h-4" />
          </a>
          <a
            href="/features"
            onClick={(e) => handleLinkClick(e, '/features')}
            className="w-full sm:w-auto px-6 py-3.5 rounded-xl border border-slate-300 hover:border-slate-400 bg-white text-slate-800 hover:bg-slate-50 text-xs font-bold font-mono uppercase tracking-wider transition-all shadow-xs"
          >
            Explore Platform Features &rarr;
          </a>
        </div>
      </section>

      {/* Grid of Key Features */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 rounded-2xl bg-white border border-[#E8E7E3] space-y-3 shadow-xs">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
            <PieChart className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-[#0A0D14]">Manpower Billing MIS</h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            Compare contracted post strength against actual daily roll-call attendance to eliminate unbilled guard hours.
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-white border border-[#E8E7E3] space-y-3 shadow-xs">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
            <TrendingUp className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-[#0A0D14]">Overtime & Cost Control</h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            Track double-shift overtime multipliers across sites to prevent burnout and keep monthly wage bill within budget.
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-white border border-[#E8E7E3] space-y-3 shadow-xs">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
            <Download className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-[#0A0D14]">Multi-Format Export</h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            Export any report to PDF, Excel, and CSV with customized header stamps, company logo, and digital signature tags.
          </p>
        </div>
      </section>

    </article>
  );
};
