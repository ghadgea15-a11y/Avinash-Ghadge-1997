import React from 'react';
import { PhaseAScreen } from '../../types';
import { navigateToUrl } from '../../utils/publicRouter';
import { Handshake } from 'lucide-react';

export const PartnersPage: React.FC<{ onNavigate: (screen: PhaseAScreen) => void }> = ({ onNavigate }) => {
  return (
    <div className="space-y-16">
      
      {/* Hero */}
      <section className="relative pt-16 pb-8 overflow-hidden">
        <div className="max-w-4xl mx-auto px-4 relative z-10 text-center space-y-4">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 mb-2">
            <Handshake className="w-6 h-6" />
          </div>
          <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight leading-tight">
            Partner Ecosystem
          </h1>
          <p className="text-slate-400 max-w-2xl mx-auto text-lg">
            Collaborate with us to deliver comprehensive operational solutions.
          </p>
        </div>
      </section>

      {/* Content */}
      <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">
        <div className="space-y-8">
          
          <div className="p-6 rounded-2xl bg-white/5 border border-white/10 space-y-3">
            <h2 className="text-xl font-bold text-white">Hardware Partners</h2>
            <div className="text-slate-300 leading-relaxed space-y-2">
              <p>We integrate with leading biometric and access control manufacturers to provide seamless end-to-end attendance and security solutions.</p>
            </div>
          </div>
        
          <div className="p-6 rounded-2xl bg-white/5 border border-white/10 space-y-3">
            <h2 className="text-xl font-bold text-white">Implementation Partners</h2>
            <div className="text-slate-300 leading-relaxed space-y-2">
              <p>Consulting firms and IT integrators can partner with us to deploy the Log Sheet Muster platform for their enterprise clients.</p>
            </div>
          </div>
        
          <div className="p-6 rounded-2xl bg-white/5 border border-white/10 space-y-3">
            <h2 className="text-xl font-bold text-white">Strategic Alliances</h2>
            <div className="text-slate-300 leading-relaxed space-y-2">
              <p>We collaborate with HR consultants and compliance experts to ensure our platform constantly adheres to the latest statutory labor laws.</p>
            </div>
          </div>
        
          <div className="p-6 rounded-2xl bg-white/5 border border-white/10 space-y-3">
            <h2 className="text-xl font-bold text-white">Become a Partner</h2>
            <div className="text-slate-300 leading-relaxed space-y-2">
              <p>Interested in partnering with Shourya Enterprises? Contact our business development team at partners@shouryaenterprises.com.</p>
            </div>
          </div>
        
        </div>
      </section>

    </div>
  );
};
