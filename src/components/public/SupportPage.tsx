import React from 'react';
import { PhaseAScreen } from '../../types';
import { navigateToUrl } from '../../utils/publicRouter';
import { LifeBuoy } from 'lucide-react';

export const SupportPage: React.FC<{ onNavigate: (screen: PhaseAScreen) => void }> = ({ onNavigate }) => {
  return (
    <div className="space-y-16">
      
      {/* Hero */}
      <section className="relative pt-16 pb-8 overflow-hidden">
        <div className="max-w-4xl mx-auto px-4 relative z-10 text-center space-y-4">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 mb-2">
            <LifeBuoy className="w-6 h-6" />
          </div>
          <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight leading-tight">
            Enterprise Support
          </h1>
          <p className="text-slate-400 max-w-2xl mx-auto text-lg">
            Get help from our technical operations team.
          </p>
        </div>
      </section>

      {/* Content */}
      <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">
        <div className="space-y-8">
          
          <div className="p-6 rounded-2xl bg-white/5 border border-white/10 space-y-3">
            <h2 className="text-xl font-bold text-white">Dedicated Account Management</h2>
            <div className="text-slate-300 leading-relaxed space-y-2">
              <p>Enterprise clients are assigned a dedicated technical account manager who understands your specific operational workflows and custom configurations.</p>
            </div>
          </div>
        
          <div className="p-6 rounded-2xl bg-white/5 border border-white/10 space-y-3">
            <h2 className="text-xl font-bold text-white">Service Level Agreements (SLAs)</h2>
            <div className="text-slate-300 leading-relaxed space-y-2">
              <p>We provide guaranteed uptime SLAs and tiered response times for critical production issues affecting payroll runs or attendance capture.</p>
            </div>
          </div>
        
          <div className="p-6 rounded-2xl bg-white/5 border border-white/10 space-y-3">
            <h2 className="text-xl font-bold text-white">Implementation & Onboarding</h2>
            <div className="text-slate-300 leading-relaxed space-y-2">
              <p>Our deployment engineers assist with bulk data migration, device configuration, and supervisor training during the initial onboarding phase.</p>
            </div>
          </div>
        
          <div className="p-6 rounded-2xl bg-white/5 border border-white/10 space-y-3">
            <h2 className="text-xl font-bold text-white">Helpdesk Contact</h2>
            <div className="text-slate-300 leading-relaxed space-y-2">
              <p>For urgent support queries, please email support@shouryaenterprises.com or contact your assigned account manager directly.</p>
            </div>
          </div>
        
        </div>
      </section>

    </div>
  );
};
