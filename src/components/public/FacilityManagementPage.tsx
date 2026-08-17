import React from 'react';
import { 
  Building, 
  Wrench, 
  FileText, 
  CheckSquare, 
  Gauge, 
  CheckCircle2, 
  ArrowRight,
  ClipboardList
} from 'lucide-react';
import { PhaseAScreen } from '../../types';
import { navigateToUrl } from '../../utils/publicRouter';

interface FacilityManagementPageProps {
  onNavigate: (screen: PhaseAScreen) => void;
}

export const FacilityManagementPage: React.FC<FacilityManagementPageProps> = ({ onNavigate }) => {
  const handleLinkClick = (e: React.MouseEvent<HTMLAnchorElement>, path: string) => {
    e.preventDefault();
    navigateToUrl(path);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <article className="space-y-16 py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      
      {/* Hero Section */}
      <section aria-labelledby="facility-hero-heading" className="text-center space-y-6 max-w-4xl mx-auto pt-6 pb-4">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-mono font-bold tracking-wide">
          <Building className="w-3.5 h-3.5 text-emerald-600" />
          DIGITAL FACILITY LOG SHEETS & ASSET MAINTENANCE
        </div>

        <h1 id="facility-hero-heading" className="text-3xl sm:text-4xl lg:text-5xl font-display font-bold text-[#0A0D14] tracking-tight leading-tight">
          Enterprise Facility Management & Digital Site Log Sheet System
        </h1>

        <p className="text-base sm:text-lg text-slate-600 leading-relaxed">
          Replace physical maintenance logbooks with digital facility log sheets. Track Diesel Generator (DG) fuel logs, HVAC parameters, electrical substation readings, Planned Preventive Maintenance (PPM), and SLA work orders.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
          <a
            href="/contact"
            onClick={(e) => handleLinkClick(e, '/contact')}
            className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-[#0A0D14] hover:bg-slate-800 text-white text-xs font-bold font-mono uppercase tracking-wider transition-all shadow-md flex items-center justify-center gap-2"
          >
            Schedule Facility Demo
            <ArrowRight className="w-4 h-4" />
          </a>
          <a
            href="/security-management"
            onClick={(e) => handleLinkClick(e, '/security-management')}
            className="w-full sm:w-auto px-6 py-3.5 rounded-xl border border-slate-300 hover:border-slate-400 bg-white text-slate-800 hover:bg-slate-50 text-xs font-bold font-mono uppercase tracking-wider transition-all shadow-xs"
          >
            Explore Security Guard Patrols &rarr;
          </a>
        </div>
      </section>

      {/* Grid of Key Features */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 rounded-2xl bg-white border border-[#E8E7E3] space-y-3 shadow-xs">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
            <Gauge className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-[#0A0D14]">Digital Equipment Log Sheets</h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            Record hourly and daily meter readings for DG sets, transformers, chillers, water treatment plants, and energy meters with validation ranges.
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-white border border-[#E8E7E3] space-y-3 shadow-xs">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
            <Wrench className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-[#0A0D14]">PPM & Work Orders</h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            Schedule recurring preventive maintenance tasks, assign technicians, attach before/after photos, and track resolution against SLA deadlines.
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-white border border-[#E8E7E3] space-y-3 shadow-xs">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
            <ClipboardList className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-[#0A0D14]">Housekeeping Checklists</h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            Supervisors verify washroom cleanliness, cafeteria sanitization, and common area audits with QR checkpoint scan sign-offs.
          </p>
        </div>
      </section>

    </article>
  );
};
