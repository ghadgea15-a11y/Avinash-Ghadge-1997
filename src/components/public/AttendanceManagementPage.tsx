import React from 'react';
import { 
  CalendarCheck, 
  Clock, 
  MapPin, 
  QrCode, 
  FileText, 
  ShieldCheck, 
  CheckCircle2, 
  ArrowRight, 
  Download,
  AlertTriangle,
  Fingerprint
} from 'lucide-react';
import { PhaseAScreen } from '../../types';
import { navigateToUrl } from '../../utils/publicRouter';

interface AttendanceManagementPageProps {
  onNavigate: (screen: PhaseAScreen) => void;
}

export const AttendanceManagementPage: React.FC<AttendanceManagementPageProps> = ({ onNavigate }) => {
  const handleLinkClick = (e: React.MouseEvent<HTMLAnchorElement>, path: string) => {
    e.preventDefault();
    navigateToUrl(path);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <article className="space-y-16 py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      
      {/* Hero Section */}
      <section aria-labelledby="attendance-hero-heading" className="text-center space-y-6 max-w-4xl mx-auto pt-6 pb-4">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-mono font-bold tracking-wide">
          <CalendarCheck className="w-3.5 h-3.5 text-emerald-600" />
          STATUTORY ATTENDANCE MUSTER & DAILY ROLL-CALL
        </div>

        <h1 id="attendance-hero-heading" className="text-3xl sm:text-4xl lg:text-5xl font-display font-bold text-[#0A0D14] tracking-tight leading-tight">
          Automated Attendance Management & Statutory Form II Muster Software
        </h1>

        <p className="text-base sm:text-lg text-slate-600 leading-relaxed">
          Eliminate paper muster books and attendance fraud. Log Sheet Muster enables supervisors to conduct digital daily roll-calls, verify geo-fenced punches, compute overtime, and generate government-compliant Form II registers instantly.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
          <a
            href="/contact"
            onClick={(e) => handleLinkClick(e, '/contact')}
            className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-[#0A0D14] hover:bg-slate-800 text-white text-xs font-bold font-mono uppercase tracking-wider transition-all shadow-md flex items-center justify-center gap-2"
          >
            Schedule Attendance Demo
            <ArrowRight className="w-4 h-4" />
          </a>
          <a
            href="/payroll"
            onClick={(e) => handleLinkClick(e, '/payroll')}
            className="w-full sm:w-auto px-6 py-3.5 rounded-xl border border-slate-300 hover:border-slate-400 bg-white text-slate-800 hover:bg-slate-50 text-xs font-bold font-mono uppercase tracking-wider transition-all shadow-xs"
          >
            Explore Payroll Integration &rarr;
          </a>
        </div>
      </section>

      {/* Feature Deep Dive */}
      <section aria-labelledby="features-heading" className="space-y-8">
        <div className="text-center space-y-2 max-w-2xl mx-auto">
          <h2 id="features-heading" className="text-2xl sm:text-3xl font-display font-bold text-[#0A0D14]">
            Why Enterprises Rely on Log Sheet Muster for Attendance
          </h2>
          <p className="text-xs sm:text-sm text-slate-600">
            Engineered specifically for field supervisors, security guards, housekeeping, and multi-site facility staff.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 rounded-2xl bg-white border border-[#E8E7E3] space-y-4 shadow-xs">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <CalendarCheck className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-[#0A0D14]">Supervisor Digital Roll-Call</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Supervisors mark Present, Absent, Half-Day, or On-Duty (OD) for their allocated site team in seconds. Automatically blocks duplicate entries and tracks roll-call time.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white border border-[#E8E7E3] space-y-4 shadow-xs">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <MapPin className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-[#0A0D14]">Geofenced Mobile Punch</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Employees and security personnel punch check-in/out via mobile with precise GPS coordinate verification, ensuring employees are physically on site.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white border border-[#E8E7E3] space-y-4 shadow-xs">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-[#0A0D14]">Statutory Form II Registers</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              One-click export of official Form II Attendance Muster registers compliant with Maharashtra Factories and Shops & Establishments labor inspection guidelines.
            </p>
          </div>
        </div>
      </section>

      {/* Comparison Grid */}
      <section aria-labelledby="comparison-heading" className="bg-white border border-[#E8E7E3] rounded-3xl p-8 sm:p-12 space-y-8">
        <h2 id="comparison-heading" className="text-2xl font-display font-bold text-[#0A0D14]">
          Traditional Paper Registers vs. Log Sheet Muster Digital Attendance
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="py-3 px-4 font-mono uppercase text-slate-500">Capability</th>
                <th className="py-3 px-4 font-mono uppercase text-rose-600 bg-rose-50/50">Traditional Paper Register</th>
                <th className="py-3 px-4 font-mono uppercase text-emerald-700 bg-emerald-50/50 font-bold">Log Sheet Muster</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              <tr>
                <td className="py-3 px-4 font-sans font-medium text-slate-900">Roll-Call Speed</td>
                <td className="py-3 px-4 text-slate-600">Manual physical book signing (15-30 mins)</td>
                <td className="py-3 px-4 text-emerald-800 font-bold bg-emerald-50/30">1-touch digital roll-call (under 60s)</td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-sans font-medium text-slate-900">Fraud & Ghost Guards</td>
                <td className="py-3 px-4 text-rose-600 font-medium">High risk of proxy attendance and tampering</td>
                <td className="py-3 px-4 text-emerald-800 font-bold bg-emerald-50/30">GPS verification & tamper-proof audit log</td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-sans font-medium text-slate-900">Statutory Form II Reporting</td>
                <td className="py-3 px-4 text-slate-600">Days of manual Excel re-entry at month-end</td>
                <td className="py-3 px-4 text-emerald-800 font-bold bg-emerald-50/30">Instant 1-click PDF/Excel export</td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-sans font-medium text-slate-900">Payroll Synchronization</td>
                <td className="py-3 px-4 text-slate-600">Manual calculation prone to errors & disputes</td>
                <td className="py-3 px-4 text-emerald-800 font-bold bg-emerald-50/30">Live automatic feed into payroll engine</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Connected Modules Strip */}
      <section className="p-6 rounded-2xl bg-[#F4F3EF] border border-[#E8E7E3] flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="space-y-1">
          <h3 className="text-sm font-bold text-[#0A0D14]">Synchronized with Multi-Tier Payroll Engine</h3>
          <p className="text-xs text-slate-600">
            Attendance roll-calls feed directly into EPF/ESIC/PT payroll deductions and overtime computations.
          </p>
        </div>
        <a
          href="/payroll"
          onClick={(e) => handleLinkClick(e, '/payroll')}
          className="px-4 py-2.5 rounded-xl bg-[#0A0D14] text-white text-xs font-mono font-bold uppercase tracking-wider whitespace-nowrap hover:bg-slate-800 transition"
        >
          View Payroll Engine &rarr;
        </a>
      </section>

    </article>
  );
};
