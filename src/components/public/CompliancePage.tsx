import React from 'react';
import { 
  ShieldCheck, 
  FileCheck, 
  Scale, 
  FileSpreadsheet, 
  Lock, 
  CheckCircle2, 
  ArrowRight,
  BookOpen
} from 'lucide-react';
import { PhaseAScreen } from '../../types';
import { navigateToUrl } from '../../utils/publicRouter';

interface CompliancePageProps {
  onNavigate: (screen: PhaseAScreen) => void;
}

export const CompliancePage: React.FC<CompliancePageProps> = ({ onNavigate }) => {
  const handleLinkClick = (e: React.MouseEvent<HTMLAnchorElement>, path: string) => {
    e.preventDefault();
    navigateToUrl(path);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <article className="space-y-16 py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      
      {/* Hero Section */}
      <section aria-labelledby="compliance-hero-heading" className="text-center space-y-6 max-w-4xl mx-auto pt-6 pb-4">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-mono font-bold tracking-wide">
          <Scale className="w-3.5 h-3.5 text-emerald-600" />
          STATUTORY LABOR LAWS & FORM II COMPLIANCE
        </div>

        <h1 id="compliance-hero-heading" className="text-3xl sm:text-4xl lg:text-5xl font-display font-bold text-[#0A0D14] tracking-tight leading-tight">
          100% Audit-Ready Statutory Labor Law & Form II Compliance
        </h1>

        <p className="text-base sm:text-lg text-slate-600 leading-relaxed">
          Never fail a labor department inspection. Log Sheet Muster maintains immutable, timestamped registers for Form II Attendance Muster, Form B Wage Register, Form D Overtime Register, EPF/ESIC inspection files, and Minimum Wage adherence.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
          <a
            href="/contact"
            onClick={(e) => handleLinkClick(e, '/contact')}
            className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-[#0A0D14] hover:bg-slate-800 text-white text-xs font-bold font-mono uppercase tracking-wider transition-all shadow-md flex items-center justify-center gap-2"
          >
            Schedule Compliance Audit Demo
            <ArrowRight className="w-4 h-4" />
          </a>
          <a
            href="/payroll"
            onClick={(e) => handleLinkClick(e, '/payroll')}
            className="w-full sm:w-auto px-6 py-3.5 rounded-xl border border-slate-300 hover:border-slate-400 bg-white text-slate-800 hover:bg-slate-50 text-xs font-bold font-mono uppercase tracking-wider transition-all shadow-xs"
          >
            View Statutory Payroll &rarr;
          </a>
        </div>
      </section>

      {/* Grid of Key Features */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 rounded-2xl bg-white border border-[#E8E7E3] space-y-3 shadow-xs">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-[#0A0D14]">Form II Muster Register</h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            Standard government format for monthly attendance muster roll with present/absent counts, shift codes, and supervisor approvals.
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-white border border-[#E8E7E3] space-y-3 shadow-xs">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
            <Scale className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-[#0A0D14]">CLRA & Minimum Wages</h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            Contract Labour (Regulation and Abolition) Act audit readiness with minimum wage rate enforcement for Skilled, Semi-Skilled, and Unskilled roles.
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-white border border-[#E8E7E3] space-y-3 shadow-xs">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
            <Lock className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-[#0A0D14]">Immutable Audit Trail</h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            Every roll-call update, supervisor correction, and salary adjustment is recorded with user ID, IP address, and cryptographic timestamps.
          </p>
        </div>
      </section>

    </article>
  );
};
