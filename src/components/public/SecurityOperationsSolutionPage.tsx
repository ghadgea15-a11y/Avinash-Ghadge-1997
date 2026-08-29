import React from 'react';
import { PhaseAScreen } from '../../types';
import { navigateToUrl } from '../../utils/publicRouter';
import { ShieldCheck, ArrowRight, CheckCircle2 } from 'lucide-react';

export const SecurityOperationsSolutionPage: React.FC<{ onNavigate: (screen: PhaseAScreen) => void }> = ({ onNavigate }) => {
  return (
    <div className="space-y-24">
      
      {/* Hero */}
      <section className="relative pt-20 pb-12 overflow-hidden">
        <div className="absolute inset-0 bg-indigo-600/5 blur-[100px] rounded-full w-[800px] h-[400px] left-1/2 -translate-x-1/2 -top-20" />
        <div className="max-w-4xl mx-auto px-4 relative z-10 text-center space-y-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 mb-4">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h1 className="text-4xl md:text-6xl font-black text-white tracking-tight leading-tight">
            Security Guarding Companies
          </h1>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
            A purpose-built command center for security agencies managing hundreds of distributed sites and thousands of guards.
          </p>
        </div>
      </section>

      {/* Content Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">
        <div className="grid md:grid-cols-2 gap-12 lg:gap-24 items-start">
          
          <div className="space-y-12">
            <div className="space-y-4">
              <h3 className="text-sm font-black tracking-widest text-indigo-400 uppercase">The Challenge</h3>
              <p className="text-slate-300 leading-relaxed text-lg border-l-2 border-slate-700 pl-4">Security companies struggle with unverified guard patrols, phantom attendance, and complex billing cycles based on actual deployment versus contracted strength.</p>
            </div>
            
            <div className="space-y-4">
              <h3 className="text-sm font-black tracking-widest text-emerald-400 uppercase">The Solution</h3>
              <p className="text-slate-300 leading-relaxed text-lg">A specialized operational suite connecting mobile patrol verification, biometric attendance, and automated client billing into a single pane of glass.</p>
            </div>
            
            <div className="p-6 rounded-2xl bg-indigo-500/5 border border-indigo-500/10 space-y-4">
              <h3 className="text-sm font-black tracking-widest text-white uppercase">Business Value</h3>
              <p className="text-indigo-200 font-medium">Prove service delivery to clients, win enterprise contracts with tech-enabled guarding, and eliminate deployment leakages.</p>
            </div>
          </div>

          <div className="space-y-8">
            <h3 className="text-2xl font-bold text-white">Solution Capabilities</h3>
            <div className="grid gap-4">
              <div className="flex items-start gap-3 p-4 rounded-xl bg-white/5 border border-white/10"><CheckCircle2 className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" /><span className="text-slate-300">Real-time Control Room Dashboard</span></div>
<div className="flex items-start gap-3 p-4 rounded-xl bg-white/5 border border-white/10"><CheckCircle2 className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" /><span className="text-slate-300">QR-verified Guard Patrols</span></div>
<div className="flex items-start gap-3 p-4 rounded-xl bg-white/5 border border-white/10"><CheckCircle2 className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" /><span className="text-slate-300">Automated Reliever Scheduling</span></div>
<div className="flex items-start gap-3 p-4 rounded-xl bg-white/5 border border-white/10"><CheckCircle2 className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" /><span className="text-slate-300">Incident Management & Escalation</span></div>
            </div>
          </div>

        </div>
      </section>

    </div>
  );
};
