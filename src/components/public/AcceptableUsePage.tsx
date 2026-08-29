import React from 'react';
import { PhaseAScreen } from '../../types';
import { navigateToUrl } from '../../utils/publicRouter';
import { CheckSquare } from 'lucide-react';

export const AcceptableUsePage: React.FC<{ onNavigate: (screen: PhaseAScreen) => void }> = ({ onNavigate }) => {
  return (
    <div className="space-y-16">
      
      {/* Hero */}
      <section className="relative pt-16 pb-8 overflow-hidden">
        <div className="max-w-4xl mx-auto px-4 relative z-10 text-center space-y-4">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 mb-2">
            <CheckSquare className="w-6 h-6" />
          </div>
          <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight leading-tight">
            Acceptable Use Policy
          </h1>
          <p className="text-slate-400 max-w-2xl mx-auto text-lg">
            Guidelines for appropriate and lawful use of our services.
          </p>
        </div>
      </section>

      {/* Content */}
      <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">
        <div className="space-y-8">
          
          <div className="p-6 rounded-2xl bg-white/5 border border-white/10 space-y-3">
            <h2 className="text-xl font-bold text-white">Prohibited Activities</h2>
            <div className="text-slate-300 leading-relaxed space-y-2">
              <p>You may not use the platform for any illegal purpose, to transmit malicious code, or to attempt unauthorized access to other tenants' data.</p>
            </div>
          </div>
        
          <div className="p-6 rounded-2xl bg-white/5 border border-white/10 space-y-3">
            <h2 className="text-xl font-bold text-white">System Integrity</h2>
            <div className="text-slate-300 leading-relaxed space-y-2">
              <p>You must not attempt to bypass our security measures, overload our infrastructure, or reverse-engineer the platform.</p>
            </div>
          </div>
        
          <div className="p-6 rounded-2xl bg-white/5 border border-white/10 space-y-3">
            <h2 className="text-xl font-bold text-white">Content Standards</h2>
            <div className="text-slate-300 leading-relaxed space-y-2">
              <p>Any content uploaded to the platform must not be defamatory, obscene, or infringe on intellectual property rights.</p>
            </div>
          </div>
        
          <div className="p-6 rounded-2xl bg-white/5 border border-white/10 space-y-3">
            <h2 className="text-xl font-bold text-white">Enforcement</h2>
            <div className="text-slate-300 leading-relaxed space-y-2">
              <p>Violation of these guidelines may result in immediate suspension or termination of your account.</p>
            </div>
          </div>
        
        </div>
      </section>

    </div>
  );
};
