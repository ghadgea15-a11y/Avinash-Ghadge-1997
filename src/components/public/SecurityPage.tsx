import React from 'react';
import { 
  ShieldCheck, 
  Lock, 
  Key, 
  Server, 
  EyeOff, 
  FileCheck, 
  CheckCircle2, 
  ArrowRight,
  Database
} from 'lucide-react';
import { PhaseAScreen } from '../../types';
import { navigateToUrl } from '../../utils/publicRouter';

interface SecurityPageProps {
  onNavigate: (screen: PhaseAScreen) => void;
}

export const SecurityPage: React.FC<SecurityPageProps> = ({ onNavigate }) => {
  const handleLinkClick = (e: React.MouseEvent<HTMLAnchorElement>, path: string) => {
    e.preventDefault();
    navigateToUrl(path);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <article className="space-y-16 py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      
      {/* Hero Section */}
      <section aria-labelledby="security-hero-heading" className="text-center space-y-6 max-w-4xl mx-auto pt-6 pb-4">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-mono font-bold tracking-wide">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          ENTERPRISE SECURITY & TENANT ISOLATION
        </div>

        <h1 id="security-hero-heading" className="text-3xl sm:text-4xl lg:text-5xl font-display font-bold text-[#0A0D14] tracking-tight leading-tight">
          Enterprise Security Architecture & Multi-Tenant Data Isolation
        </h1>

        <p className="text-base sm:text-lg text-slate-600 leading-relaxed">
          Log Sheet Muster is built from the ground up on production-grade Google Cloud Firestore security rules, cryptographic timestamping, multi-tenant workspace isolation, and granular 10-tier Role-Based Access Control (RBAC).
        </p>
      </section>

      {/* Security Pillars Grid */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 rounded-2xl bg-white border border-[#E8E7E3] space-y-3 shadow-xs">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
            <Lock className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-[#0A0D14]">Strict Multi-Tenant Isolation</h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            Every database query is constrained by the company identifier. User belonging to Company A can never read, modify, or leak data into Company B under any circumstances.
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-white border border-[#E8E7E3] space-y-3 shadow-xs">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
            <Key className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-[#0A0D14]">10-Tier Authority Hierarchy</h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            Strict RBAC tiers from A0 (Platform Owner) to A9 (Field Support Staff). Supervisors can only view their allocated branch staff and duty shifts.
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-white border border-[#E8E7E3] space-y-3 shadow-xs">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
            <Server className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-[#0A0D14]">Data Protection & DPDP Act</h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            Fully compliant with Indian Digital Personal Data Protection (DPDP) Act requirements, TLS 1.3 encryption in transit, and AES-256 encryption at rest.
          </p>
        </div>
      </section>

    </article>
  );
};
