import React from 'react';
import { PhaseAScreen } from '../../types';
import { navigateToUrl } from '../../utils/publicRouter';
import { HelpCircle } from 'lucide-react';

export const FaqPage: React.FC<{ onNavigate: (screen: PhaseAScreen) => void }> = ({ onNavigate }) => {
  return (
    <div className="space-y-16">
      
      {/* Hero */}
      <section className="relative pt-16 pb-8 overflow-hidden">
        <div className="max-w-4xl mx-auto px-4 relative z-10 text-center space-y-4">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 mb-2">
            <HelpCircle className="w-6 h-6" />
          </div>
          <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight leading-tight">
            Frequently Asked Questions
          </h1>
          <p className="text-slate-400 max-w-2xl mx-auto text-lg">
            Find answers to the most common questions about the Log Sheet Muster enterprise platform.
          </p>
        </div>
      </section>

      {/* Content */}
      <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">
        <div className="space-y-8">
          
          <div className="p-6 rounded-2xl bg-white/5 border border-white/10 space-y-3">
            <h2 className="text-xl font-bold text-white">What is Log Sheet Muster?</h2>
            <div className="text-slate-300 leading-relaxed space-y-2">
              <p>Log Sheet Muster is a comprehensive cloud-based SaaS platform designed for enterprise workforce management, security guarding, and facility operations. It digitizes attendance, payroll, shift scheduling, log sheets, and compliance tracking into a single unified system.</p>
            </div>
          </div>
        
          <div className="p-6 rounded-2xl bg-white/5 border border-white/10 space-y-3">
            <h2 className="text-xl font-bold text-white">Who uses this platform?</h2>
            <div className="text-slate-300 leading-relaxed space-y-2">
              <p>Our clients include large security guarding agencies, facility management service (FMS) providers, manufacturing plants, retail chains, and corporate office parks who need to manage distributed workforces and physical operations.</p>
            </div>
          </div>
        
          <div className="p-6 rounded-2xl bg-white/5 border border-white/10 space-y-3">
            <h2 className="text-xl font-bold text-white">Does it support offline operations?</h2>
            <div className="text-slate-300 leading-relaxed space-y-2">
              <p>Yes. The mobile application for supervisors and guards is built with an offline-first architecture. Attendance punches, patrol QR scans, and log entries are cached locally and automatically synced to the server when network connectivity is restored.</p>
            </div>
          </div>
        
          <div className="p-6 rounded-2xl bg-white/5 border border-white/10 space-y-3">
            <h2 className="text-xl font-bold text-white">How do you handle data security and tenant isolation?</h2>
            <div className="text-slate-300 leading-relaxed space-y-2">
              <p>We employ strict multi-tenant isolation at the database level using Firestore Security Rules. A user belonging to Company A is mathematically restricted from reading or writing Company B data. All data in transit and at rest is encrypted.</p>
            </div>
          </div>
        
          <div className="p-6 rounded-2xl bg-white/5 border border-white/10 space-y-3">
            <h2 className="text-xl font-bold text-white">Can it integrate with our existing biometric machines?</h2>
            <div className="text-slate-300 leading-relaxed space-y-2">
              <p>Yes. Log Sheet Muster provides hardware integration modules that can ingest attendance logs from IP-based biometric devices (fingerprint/face recognition) and map them to the unified attendance engine.</p>
            </div>
          </div>
        
          <div className="p-6 rounded-2xl bg-white/5 border border-white/10 space-y-3">
            <h2 className="text-xl font-bold text-white">What are the pricing plans?</h2>
            <div className="text-slate-300 leading-relaxed space-y-2">
              <p>We offer tier-based enterprise licensing depending on the modules activated and the volume of active employees/users. Please contact our sales team to request a demo and customized pricing quotation.</p>
            </div>
          </div>
        
        </div>
      </section>

    </div>
  );
};
