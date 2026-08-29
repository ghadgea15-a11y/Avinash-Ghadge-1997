import React from 'react';
import { PhaseAScreen } from '../../types';
import { navigateToUrl } from '../../utils/publicRouter';
import { PlayCircle } from 'lucide-react';

export const DemoTermsPage: React.FC<{ onNavigate: (screen: PhaseAScreen) => void }> = ({ onNavigate }) => {
  return (
    <div className="space-y-16">
      
      {/* Hero */}
      <section className="relative pt-16 pb-8 overflow-hidden">
        <div className="max-w-4xl mx-auto px-4 relative z-10 text-center space-y-4">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 mb-2">
            <PlayCircle className="w-6 h-6" />
          </div>
          <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight leading-tight">
            Trial & Demo Terms
          </h1>
          <p className="text-slate-400 max-w-2xl mx-auto text-lg">
            Terms applicable to the 3-Month Free Demo and trial accounts.
          </p>
        </div>
      </section>

      {/* Content */}
      <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">
        <div className="space-y-8">
          
          <div className="p-6 rounded-2xl bg-white/5 border border-white/10 space-y-3">
            <h2 className="text-xl font-bold text-white">Trial Period</h2>
            <div className="text-slate-300 leading-relaxed space-y-2">
              <p>The 3-Month Free Demo provides access to selected modules of the Log Sheet Muster platform for evaluation purposes only.</p>
            </div>
          </div>
        
          <div className="p-6 rounded-2xl bg-white/5 border border-white/10 space-y-3">
            <h2 className="text-xl font-bold text-white">Data Retention</h2>
            <div className="text-slate-300 leading-relaxed space-y-2">
              <p>At the end of the trial period, if you do not convert to a paid subscription, your trial data may be permanently deleted after a grace period.</p>
            </div>
          </div>
        
          <div className="p-6 rounded-2xl bg-white/5 border border-white/10 space-y-3">
            <h2 className="text-xl font-bold text-white">Service Level</h2>
            <div className="text-slate-300 leading-relaxed space-y-2">
              <p>Trial accounts do not include guaranteed uptime SLAs or dedicated account management, although standard support is provided.</p>
            </div>
          </div>
        
          <div className="p-6 rounded-2xl bg-white/5 border border-white/10 space-y-3">
            <h2 className="text-xl font-bold text-white">Conversion</h2>
            <div className="text-slate-300 leading-relaxed space-y-2">
              <p>You may convert your trial account to a production account at any time by selecting a subscription plan and executing a commercial agreement.</p>
            </div>
          </div>
        
        </div>
      </section>

    </div>
  );
};
