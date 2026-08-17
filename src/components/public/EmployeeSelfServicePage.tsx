import React from 'react';
import { 
  Smartphone, 
  CalendarCheck, 
  FileText, 
  CreditCard, 
  Bell, 
  CheckCircle2, 
  ArrowRight,
  ShieldCheck
} from 'lucide-react';
import { PhaseAScreen } from '../../types';
import { navigateToUrl } from '../../utils/publicRouter';

interface EmployeeSelfServicePageProps {
  onNavigate: (screen: PhaseAScreen) => void;
}

export const EmployeeSelfServicePage: React.FC<EmployeeSelfServicePageProps> = ({ onNavigate }) => {
  const handleLinkClick = (e: React.MouseEvent<HTMLAnchorElement>, path: string) => {
    e.preventDefault();
    navigateToUrl(path);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <article className="space-y-16 py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      
      {/* Hero Section */}
      <section aria-labelledby="ess-hero-heading" className="text-center space-y-6 max-w-4xl mx-auto pt-6 pb-4">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-mono font-bold tracking-wide">
          <Smartphone className="w-3.5 h-3.5 text-emerald-600" />
          MOBILE EMPLOYEE SELF-SERVICE (ESS) APP
        </div>

        <h1 id="ess-hero-heading" className="text-3xl sm:text-4xl lg:text-5xl font-display font-bold text-[#0A0D14] tracking-tight leading-tight">
          Mobile-First Employee Self-Service (ESS) Portal
        </h1>

        <p className="text-base sm:text-lg text-slate-600 leading-relaxed">
          Empower your deskless workers, guards, and technicians with a lightweight mobile self-service app. Staff can punch attendance, view upcoming duty shifts, apply for leaves, download payslips, and check company announcements.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
          <a
            href="/contact"
            onClick={(e) => handleLinkClick(e, '/contact')}
            className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-[#0A0D14] hover:bg-slate-800 text-white text-xs font-bold font-mono uppercase tracking-wider transition-all shadow-md flex items-center justify-center gap-2"
          >
            Schedule ESS Demo
            <ArrowRight className="w-4 h-4" />
          </a>
          <a
            href="/hrms"
            onClick={(e) => handleLinkClick(e, '/hrms')}
            className="w-full sm:w-auto px-6 py-3.5 rounded-xl border border-slate-300 hover:border-slate-400 bg-white text-slate-800 hover:bg-slate-50 text-xs font-bold font-mono uppercase tracking-wider transition-all shadow-xs"
          >
            Explore HRMS Suite &rarr;
          </a>
        </div>
      </section>

      {/* Grid of Key Features */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 rounded-2xl bg-white border border-[#E8E7E3] space-y-3 shadow-xs">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
            <CalendarCheck className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-[#0A0D14]">Geotagged Mobile Punch</h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            One-touch check-in and check-out with GPS location detection and offline queue synchronization when connection is restored.
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-white border border-[#E8E7E3] space-y-3 shadow-xs">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
            <CreditCard className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-[#0A0D14]">Digital Payslips Download</h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            Staff can securely access and download their monthly salary slips with complete breakdown of earnings, deductions, PF, and ESI.
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-white border border-[#E8E7E3] space-y-3 shadow-xs">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
            <FileText className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-[#0A0D14]">Leave Requests & Balance</h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            Submit leave requests with reasons and dates directly to supervisors with instant status alerts on approval or rejection.
          </p>
        </div>
      </section>

    </article>
  );
};
