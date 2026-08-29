import React from 'react';
import { PhaseAScreen } from '../../types';
import { navigateToUrl } from '../../utils/publicRouter';
import { BookOpen } from 'lucide-react';

export const DocumentationPage: React.FC<{ onNavigate: (screen: PhaseAScreen) => void }> = ({ onNavigate }) => {
  return (
    <div className="space-y-16">
      
      {/* Hero */}
      <section className="relative pt-16 pb-8 overflow-hidden">
        <div className="max-w-4xl mx-auto px-4 relative z-10 text-center space-y-4">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 mb-2">
            <BookOpen className="w-6 h-6" />
          </div>
          <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight leading-tight">
            Platform Documentation
          </h1>
          <p className="text-slate-400 max-w-2xl mx-auto text-lg">
            Technical resources and user guides for administrators and supervisors.
          </p>
        </div>
      </section>

      {/* Content */}
      <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">
        <div className="space-y-8">
          
          <div className="p-6 rounded-2xl bg-white/5 border border-white/10 space-y-3">
            <h2 className="text-xl font-bold text-white">User Guides</h2>
            <div className="text-slate-300 leading-relaxed space-y-2">
              <p>Step-by-step documentation for everyday tasks: managing employees, generating attendance reports, and creating shift rosters.</p>
            </div>
          </div>
        
          <div className="p-6 rounded-2xl bg-white/5 border border-white/10 space-y-3">
            <h2 className="text-xl font-bold text-white">Administrator Manuals</h2>
            <div className="text-slate-300 leading-relaxed space-y-2">
              <p>Detailed instructions on configuring company settings, managing roles and permissions, and setting up complex payroll structures.</p>
            </div>
          </div>
        
          <div className="p-6 rounded-2xl bg-white/5 border border-white/10 space-y-3">
            <h2 className="text-xl font-bold text-white">API Reference</h2>
            <div className="text-slate-300 leading-relaxed space-y-2">
              <p>For enterprise clients requiring custom integrations, we provide detailed REST API documentation for pushing and pulling workforce data.</p>
            </div>
          </div>
        
          <div className="p-6 rounded-2xl bg-white/5 border border-white/10 space-y-3">
            <h2 className="text-xl font-bold text-white">Security Whitepapers</h2>
            <div className="text-slate-300 leading-relaxed space-y-2">
              <p>Comprehensive overviews of our cloud architecture, data encryption standards, and compliance certifications.</p>
            </div>
          </div>
        
        </div>
      </section>

    </div>
  );
};
