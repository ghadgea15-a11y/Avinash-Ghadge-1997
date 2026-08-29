import React from 'react';
import { PhaseAScreen } from '../../types';
import { navigateToUrl } from '../../utils/publicRouter';
import { GitCommit } from 'lucide-react';

export const ReleaseNotesPage: React.FC<{ onNavigate: (screen: PhaseAScreen) => void }> = ({ onNavigate }) => {
  return (
    <div className="space-y-16">
      
      {/* Hero */}
      <section className="relative pt-16 pb-8 overflow-hidden">
        <div className="max-w-4xl mx-auto px-4 relative z-10 text-center space-y-4">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 mb-2">
            <GitCommit className="w-6 h-6" />
          </div>
          <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight leading-tight">
            Release Notes
          </h1>
          <p className="text-slate-400 max-w-2xl mx-auto text-lg">
            Track the latest feature updates and platform improvements.
          </p>
        </div>
      </section>

      {/* Content */}
      <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">
        <div className="space-y-8">
          
          <div className="p-6 rounded-2xl bg-white/5 border border-white/10 space-y-3">
            <h2 className="text-xl font-bold text-white">Continuous Improvement</h2>
            <div className="text-slate-300 leading-relaxed space-y-2">
              <p>The Log Sheet Muster platform is updated continuously with new modules, performance optimizations, and security patches without requiring downtime.</p>
            </div>
          </div>
        
          <div className="p-6 rounded-2xl bg-white/5 border border-white/10 space-y-3">
            <h2 className="text-xl font-bold text-white">Recent Updates</h2>
            <div className="text-slate-300 leading-relaxed space-y-2">
              <p>- Introduced advanced geo-fencing for mobile attendance.</p><p>- Added custom claim-based role resolution for fine-grained access control.</p><p>- Upgraded the offline sync engine for faster conflict resolution.</p>
            </div>
          </div>
        
          <div className="p-6 rounded-2xl bg-white/5 border border-white/10 space-y-3">
            <h2 className="text-xl font-bold text-white">Upcoming Features</h2>
            <div className="text-slate-300 leading-relaxed space-y-2">
              <p>Our roadmap includes enhanced AI predictive analytics for workforce attrition and automated compliance risk scoring.</p>
            </div>
          </div>
        
        </div>
      </section>

    </div>
  );
};
