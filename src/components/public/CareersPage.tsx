import React from 'react';
import { PhaseAScreen } from '../../types';
import { navigateToUrl } from '../../utils/publicRouter';
import { Briefcase } from 'lucide-react';

export const CareersPage: React.FC<{ onNavigate: (screen: PhaseAScreen) => void }> = ({ onNavigate }) => {
  return (
    <div className="space-y-16">
      
      {/* Hero */}
      <section className="relative pt-16 pb-8 overflow-hidden">
        <div className="max-w-4xl mx-auto px-4 relative z-10 text-center space-y-4">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 mb-2">
            <Briefcase className="w-6 h-6" />
          </div>
          <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight leading-tight">
            Careers at Shourya Enterprises
          </h1>
          <p className="text-slate-400 max-w-2xl mx-auto text-lg">
            Join the team building the operating system for India's physical workforce.
          </p>
        </div>
      </section>

      {/* Content */}
      <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">
        <div className="space-y-8">
          
          <div className="p-6 rounded-2xl bg-white/5 border border-white/10 space-y-3">
            <h2 className="text-xl font-bold text-white">Our Mission</h2>
            <div className="text-slate-300 leading-relaxed space-y-2">
              <p>We are solving hard engineering problems to bring dignity, compliance, and efficiency to blue-collar and gray-collar operational workforces.</p>
            </div>
          </div>
        
          <div className="p-6 rounded-2xl bg-white/5 border border-white/10 space-y-3">
            <h2 className="text-xl font-bold text-white">Engineering Culture</h2>
            <div className="text-slate-300 leading-relaxed space-y-2">
              <p>We value pragmatism, robust architecture, and a deep understanding of our users' real-world constraints. We build resilient software that works in low-bandwidth environments.</p>
            </div>
          </div>
        
          <div className="p-6 rounded-2xl bg-white/5 border border-white/10 space-y-3">
            <h2 className="text-xl font-bold text-white">Current Openings</h2>
            <div className="text-slate-300 leading-relaxed space-y-2">
              <p>We are currently hiring for: </p><p>- Senior Full-Stack Engineer (React/Firebase)</p><p>- Android Developer (Kotlin)</p><p>- Enterprise Sales Executive</p><p></p><p>Please send your resume to hr@shouryaenterprises.com.</p>
            </div>
          </div>
        
        </div>
      </section>

    </div>
  );
};
