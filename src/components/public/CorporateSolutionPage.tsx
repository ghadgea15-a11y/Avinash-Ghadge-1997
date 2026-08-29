import React from 'react';
import { PhaseAScreen } from '../../types';
import { navigateToUrl } from '../../utils/publicRouter';
import { Briefcase, ArrowRight, CheckCircle2 } from 'lucide-react';

export const CorporateSolutionPage: React.FC<{ onNavigate: (screen: PhaseAScreen) => void }> = ({ onNavigate }) => {
  return (
    <div className="space-y-24">
      
      {/* Hero */}
      <section className="relative pt-20 pb-12 overflow-hidden">
        <div className="absolute inset-0 bg-indigo-600/5 blur-[100px] rounded-full w-[800px] h-[400px] left-1/2 -translate-x-1/2 -top-20" />
        <div className="max-w-4xl mx-auto px-4 relative z-10 text-center space-y-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 mb-4">
            <Briefcase className="w-8 h-8" />
          </div>
          <h1 className="text-4xl md:text-6xl font-black text-white tracking-tight leading-tight">
            Corporate Office Parks
          </h1>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Deliver a premium, seamless experience for tenants, employees, and visitors in modern corporate environments.
          </p>
        </div>
      </section>

      {/* Content Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">
        <div className="grid md:grid-cols-2 gap-12 lg:gap-24 items-start">
          
          <div className="space-y-12">
            <div className="space-y-4">
              <h3 className="text-sm font-black tracking-widest text-indigo-400 uppercase">The Challenge</h3>
              <p className="text-slate-300 leading-relaxed text-lg border-l-2 border-slate-700 pl-4">Managing multiple sub-contractors (security, housekeeping, maintenance) in a corporate park leads to siloed data and poor tenant experiences.</p>
            </div>
            
            <div className="space-y-4">
              <h3 className="text-sm font-black tracking-widest text-emerald-400 uppercase">The Solution</h3>
              <p className="text-slate-300 leading-relaxed text-lg">A unified platform for the Principal Employer to monitor all vendors, track SLAs, and ensure compliance across the entire campus.</p>
            </div>
            
            <div className="p-6 rounded-2xl bg-indigo-500/5 border border-indigo-500/10 space-y-4">
              <h3 className="text-sm font-black tracking-widest text-white uppercase">Business Value</h3>
              <p className="text-indigo-200 font-medium">Ensure all outsourced vendors deliver on their contracts and maintain a premium, uninterrupted corporate environment.</p>
            </div>
          </div>

          <div className="space-y-8">
            <h3 className="text-2xl font-bold text-white">Solution Capabilities</h3>
            <div className="grid gap-4">
              <div className="flex items-start gap-3 p-4 rounded-xl bg-white/5 border border-white/10"><CheckCircle2 className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" /><span className="text-slate-300">Principal Employer Dashboard</span></div>
<div className="flex items-start gap-3 p-4 rounded-xl bg-white/5 border border-white/10"><CheckCircle2 className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" /><span className="text-slate-300">Cross-vendor Headcount Verification</span></div>
<div className="flex items-start gap-3 p-4 rounded-xl bg-white/5 border border-white/10"><CheckCircle2 className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" /><span className="text-slate-300">Digital Visitor Management</span></div>
<div className="flex items-start gap-3 p-4 rounded-xl bg-white/5 border border-white/10"><CheckCircle2 className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" /><span className="text-slate-300">Helpdesk & Ticketing</span></div>
            </div>
          </div>

        </div>
      </section>

    </div>
  );
};
