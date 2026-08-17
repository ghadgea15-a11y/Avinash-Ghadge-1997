import React from 'react';
import { 
  ShieldCheck, 
  QrCode, 
  MapPin, 
  UserCheck, 
  PackageCheck, 
  AlertOctagon, 
  CheckCircle2, 
  ArrowRight,
  ScanLine
} from 'lucide-react';
import { PhaseAScreen } from '../../types';
import { navigateToUrl } from '../../utils/publicRouter';

interface SecurityManagementPageProps {
  onNavigate: (screen: PhaseAScreen) => void;
}

export const SecurityManagementPage: React.FC<SecurityManagementPageProps> = ({ onNavigate }) => {
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
          PHYSICAL SECURITY OPERATIONS & GUARD PATROL MUSTER
        </div>

        <h1 id="security-hero-heading" className="text-3xl sm:text-4xl lg:text-5xl font-display font-bold text-[#0A0D14] tracking-tight leading-tight">
          Guard Patrols, QR Checkpoints & Digital Gate Pass System
        </h1>

        <p className="text-base sm:text-lg text-slate-600 leading-relaxed">
          Modernize physical security guarding operations. Track QR perimeter patrol tours with GPS verification, issue digital visitor badges with host approval OTPs, record material gate passes, and log security incident registers.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
          <a
            href="/contact"
            onClick={(e) => handleLinkClick(e, '/contact')}
            className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-[#0A0D14] hover:bg-slate-800 text-white text-xs font-bold font-mono uppercase tracking-wider transition-all shadow-md flex items-center justify-center gap-2"
          >
            Schedule Security Demo
            <ArrowRight className="w-4 h-4" />
          </a>
          <a
            href="/attendance-management"
            onClick={(e) => handleLinkClick(e, '/attendance-management')}
            className="w-full sm:w-auto px-6 py-3.5 rounded-xl border border-slate-300 hover:border-slate-400 bg-white text-slate-800 hover:bg-slate-50 text-xs font-bold font-mono uppercase tracking-wider transition-all shadow-xs"
          >
            Explore Guard Muster Roll-Call &rarr;
          </a>
        </div>
      </section>

      {/* Grid of Key Features */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 rounded-2xl bg-white border border-[#E8E7E3] space-y-3 shadow-xs">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
            <ScanLine className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-[#0A0D14]">QR Checkpoint Patrol Tours</h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            Guards scan QR checkpoint codes located along fences, server rooms, and gates. Real-time proximity checking prevents missed or simulated patrol rounds.
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-white border border-[#E8E7E3] space-y-3 shadow-xs">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
            <UserCheck className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-[#0A0D14]">Digital Visitor Gate Passes</h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            Record visitor photos, Aadhaar verification, purpose of visit, host approval, and generate digital exit badges with instant host notifications.
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-white border border-[#E8E7E3] space-y-3 shadow-xs">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
            <PackageCheck className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-[#0A0D14]">Material Inward / Outward (RGP)</h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            Track Returnable Gate Passes (RGP) and Non-Returnable (NRGP) material dispatches with vehicle number, challan upload, and supervisor sign-offs.
          </p>
        </div>
      </section>

    </article>
  );
};
