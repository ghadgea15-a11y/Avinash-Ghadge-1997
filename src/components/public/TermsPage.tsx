import React from 'react';
import { PhaseAScreen } from '../../types';
import { navigateToUrl } from '../../utils/publicRouter';
import { FileText } from 'lucide-react';

export const TermsPage: React.FC<{ onNavigate: (screen: PhaseAScreen) => void }> = ({ onNavigate }) => {
  return (
    <div className="space-y-16">
      
      {/* Hero */}
      <section className="relative pt-16 pb-8 overflow-hidden">
        <div className="max-w-4xl mx-auto px-4 relative z-10 text-center space-y-4">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 mb-2">
            <FileText className="w-6 h-6" />
          </div>
          <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight leading-tight">
            Terms of Service
          </h1>
          <p className="text-slate-400 max-w-2xl mx-auto text-lg">
            The legal agreement governing your use of the Log Sheet Muster platform.
          </p>
        </div>
      </section>

      {/* Content */}
      <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">
        <div className="space-y-8">
          
          <div className="p-6 rounded-2xl bg-white/5 border border-white/10 space-y-3">
            <h2 className="text-xl font-bold text-white">Acceptance of Terms</h2>
            <div className="text-slate-300 leading-relaxed space-y-2">
              <p>By accessing or using the Log Sheet Muster platform, you agree to be bound by these terms of service and all applicable laws and regulations.</p>
            </div>
          </div>
        
          <div className="p-6 rounded-2xl bg-white/5 border border-white/10 space-y-3">
            <h2 className="text-xl font-bold text-white">License to Use</h2>
            <div className="text-slate-300 leading-relaxed space-y-2">
              <p>We grant you a non-exclusive, non-transferable license to use the platform for your internal business operations in accordance with your subscription plan.</p>
            </div>
          </div>
        
          <div className="p-6 rounded-2xl bg-white/5 border border-white/10 space-y-3">
            <h2 className="text-xl font-bold text-white">User Responsibilities</h2>
            <div className="text-slate-300 leading-relaxed space-y-2">
              <p>You are responsible for maintaining the confidentiality of your account credentials and for ensuring that all data entered into the platform complies with applicable laws.</p>
            </div>
          </div>
        
          <div className="p-6 rounded-2xl bg-white/5 border border-white/10 space-y-3">
            <h2 className="text-xl font-bold text-white">Limitation of Liability</h2>
            <div className="text-slate-300 leading-relaxed space-y-2">
              <p>Shourya Enterprises Pvt. Ltd. shall not be liable for any indirect, incidental, or consequential damages arising out of your use of the platform.</p>
            </div>
          </div>
        
        </div>
      </section>

    </div>
  );
};
