import React from 'react';
import { 
  Users, 
  ShieldCheck, 
  FileCheck, 
  QrCode, 
  Award, 
  Building, 
  ArrowRight, 
  CheckCircle2, 
  Smartphone,
  CreditCard
} from 'lucide-react';
import { PhaseAScreen } from '../../types';
import { navigateToUrl } from '../../utils/publicRouter';

interface EmployeeManagementPageProps {
  onNavigate: (screen: PhaseAScreen) => void;
}

export const EmployeeManagementPage: React.FC<EmployeeManagementPageProps> = ({ onNavigate }) => {
  const handleLinkClick = (e: React.MouseEvent<HTMLAnchorElement>, path: string) => {
    e.preventDefault();
    navigateToUrl(path);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <article className="space-y-16 py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      
      {/* Hero Section */}
      <section aria-labelledby="employee-hero-heading" className="text-center space-y-6 max-w-4xl mx-auto pt-6 pb-4">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-mono font-bold tracking-wide">
          <Users className="w-3.5 h-3.5 text-emerald-600" />
          DIGITAL EMPLOYEE MASTER & KYC DIRECTORY
        </div>

        <h1 id="employee-hero-heading" className="text-3xl sm:text-4xl lg:text-5xl font-display font-bold text-black tracking-tight leading-tight">
          Centralized Employee Management & Digital KYC Registry
        </h1>

        <p className="text-base sm:text-lg text-slate-600 dark:text-slate-400 leading-relaxed">
          Maintain full operational control over distributed field staff, security personnel, technicians, and corporate staff. Verify Aadhaar/PAN KYC, issue digital QR identity badges, track skill grades, and enforce RBAC across all branches.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
          <a
            href="/contact"
            onClick={(e) => handleLinkClick(e, '/contact')}
            className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-black hover:bg-slate-800 text-white text-xs font-bold font-mono uppercase tracking-wider transition-all shadow-md flex items-center justify-center gap-2"
          >
            Schedule KYC Demo
            <ArrowRight className="w-4 h-4" />
          </a>
          <a
            href="/attendance-management"
            onClick={(e) => handleLinkClick(e, '/attendance-management')}
            className="w-full sm:w-auto px-6 py-3.5 rounded-xl border border-slate-300 hover:border-slate-400 bg-white dark:bg-slate-900 text-black dark:text-slate-200 hover:bg-white dark:bg-slate-950 text-xs font-bold font-mono uppercase tracking-wider transition-all shadow-xs"
          >
            View Attendance Roll-Call &rarr;
          </a>
        </div>
      </section>

      {/* Grid of Key Features */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 space-y-3 shadow-xs">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
            <FileCheck className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-black">Aadhaar & PAN KYC Audits</h3>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            Verify identity documents with uploaded scanned copies, bank passbook proofs, emergency contact directories, and automated audit trails.
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 space-y-3 shadow-xs">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
            <QrCode className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-black">Digital ID Badges with QR</h3>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            Generate and issue verifiable digital employee ID cards with photo badges, QR scan verification, and emergency medical information.
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 space-y-3 shadow-xs">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
            <Award className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-black">10-Tier Authority Hierarchy</h3>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            Structure roles from A0 Owner down to A9 Support Staff with strict multi-tenant data scope isolating company and branch records.
          </p>
        </div>
      </section>

    </article>
  );
};
