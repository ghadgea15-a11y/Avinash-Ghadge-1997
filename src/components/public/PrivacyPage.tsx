import React from 'react';
import { PhaseAScreen } from '../../types';
import { navigateToUrl } from '../../utils/publicRouter';
import { Shield } from 'lucide-react';

export const PrivacyPage: React.FC<{ onNavigate: (screen: PhaseAScreen) => void }> = ({ onNavigate }) => {
  return (
    <div className="space-y-16">
      
      {/* Hero */}
      <section className="relative pt-16 pb-8 overflow-hidden">
        <div className="max-w-4xl mx-auto px-4 relative z-10 text-center space-y-4">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 mb-2">
            <Shield className="w-6 h-6" />
          </div>
          <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight leading-tight">
            Privacy Policy
          </h1>
          <p className="text-slate-400 max-w-2xl mx-auto text-lg">
            How we collect, use, and protect your personal and operational data.
          </p>
        </div>
      </section>

      {/* Content */}
      <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">
        <div className="space-y-8">
          
          <div className="p-6 rounded-2xl bg-white/5 border border-white/10 space-y-3">
            <h2 className="text-xl font-bold text-white">Data Collection</h2>
            <div className="text-slate-300 leading-relaxed space-y-2">
              <p>We collect data necessary to provide our workforce management services, including employee details, attendance logs, location data (when using mobile punches), and operational records.</p>
            </div>
          </div>
        
          <div className="p-6 rounded-2xl bg-white/5 border border-white/10 space-y-3">
            <h2 className="text-xl font-bold text-white">Data Usage</h2>
            <div className="text-slate-300 leading-relaxed space-y-2">
              <p>The data is used exclusively to generate attendance reports, process payroll, and facilitate operational workflows as directed by the employer (our client).</p>
            </div>
          </div>
        
          <div className="p-6 rounded-2xl bg-white/5 border border-white/10 space-y-3">
            <h2 className="text-xl font-bold text-white">Data Sharing</h2>
            <div className="text-slate-300 leading-relaxed space-y-2">
              <p>We do not sell personal data to third parties. Data is only shared with authorized sub-processors necessary for providing the cloud service (e.g., hosting providers) under strict confidentiality agreements.</p>
            </div>
          </div>
        
          <div className="p-6 rounded-2xl bg-white/5 border border-white/10 space-y-3">
            <h2 className="text-xl font-bold text-white">Data Security</h2>
            <div className="text-slate-300 leading-relaxed space-y-2">
              <p>We implement robust security measures, including encryption at rest and in transit, to protect data against unauthorized access or disclosure.</p>
            </div>
          </div>
        
        </div>
      </section>

    </div>
  );
};
