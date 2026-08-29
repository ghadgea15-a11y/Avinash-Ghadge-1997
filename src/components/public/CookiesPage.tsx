import React from 'react';
import { PhaseAScreen } from '../../types';
import { navigateToUrl } from '../../utils/publicRouter';
import { Cookie } from 'lucide-react';

export const CookiesPage: React.FC<{ onNavigate: (screen: PhaseAScreen) => void }> = ({ onNavigate }) => {
  return (
    <div className="space-y-16">
      
      {/* Hero */}
      <section className="relative pt-16 pb-8 overflow-hidden">
        <div className="max-w-4xl mx-auto px-4 relative z-10 text-center space-y-4">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 mb-2">
            <Cookie className="w-6 h-6" />
          </div>
          <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight leading-tight">
            Cookie Policy
          </h1>
          <p className="text-slate-400 max-w-2xl mx-auto text-lg">
            Information about how we use cookies and similar technologies.
          </p>
        </div>
      </section>

      {/* Content */}
      <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">
        <div className="space-y-8">
          
          <div className="p-6 rounded-2xl bg-white/5 border border-white/10 space-y-3">
            <h2 className="text-xl font-bold text-white">What are Cookies?</h2>
            <div className="text-slate-300 leading-relaxed space-y-2">
              <p>Cookies are small text files placed on your device to help the website provide a better user experience.</p>
            </div>
          </div>
        
          <div className="p-6 rounded-2xl bg-white/5 border border-white/10 space-y-3">
            <h2 className="text-xl font-bold text-white">How We Use Cookies</h2>
            <div className="text-slate-300 leading-relaxed space-y-2">
              <p>We use cookies to maintain your authenticated session, remember your preferences, and analyze anonymized platform usage to improve performance.</p>
            </div>
          </div>
        
          <div className="p-6 rounded-2xl bg-white/5 border border-white/10 space-y-3">
            <h2 className="text-xl font-bold text-white">Managing Cookies</h2>
            <div className="text-slate-300 leading-relaxed space-y-2">
              <p>You can control and/or delete cookies as you wish using your browser settings, but disabling cookies may affect the functionality of the platform.</p>
            </div>
          </div>
        
        </div>
      </section>

    </div>
  );
};
