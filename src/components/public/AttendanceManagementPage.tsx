import React from 'react';
import { PhaseAScreen } from '../../types';
import { navigateToUrl } from '../../utils/publicRouter';
import { Clock, ArrowRight, CheckCircle2 } from 'lucide-react';

export const AttendanceManagementPage: React.FC<{ onNavigate: (screen: PhaseAScreen) => void }> = ({ onNavigate }) => {
  return (
    <div className="space-y-24">
      
      {/* Hero */}
      <section className="relative pt-20 pb-12 overflow-hidden">
        <div className="absolute inset-0 bg-blue-600/5 blur-[100px] rounded-full w-[800px] h-[400px] left-1/2 -translate-x-1/2 -top-20" />
        <div className="max-w-4xl mx-auto px-4 relative z-10 text-center space-y-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400 mb-4">
            <Clock className="w-8 h-8" />
          </div>
          <h1 className="text-4xl md:text-6xl font-black text-white tracking-tight leading-tight">
            Form II Statutory Attendance Muster
          </h1>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Automate compliance-ready attendance capture with biometric integration and supervisor verifications.
          </p>
        </div>
      </section>

      {/* Content Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">
        <div className="grid md:grid-cols-2 gap-12 lg:gap-24 items-start">
          
          <div className="space-y-12">
            <div className="space-y-4">
              <h3 className="text-sm font-black tracking-widest text-blue-400 uppercase">The Challenge</h3>
              <p className="text-slate-300 leading-relaxed text-lg border-l-2 border-slate-700 pl-4">Manual attendance registers and disconnected biometric machines result in delayed payroll, manipulation, and labor compliance risks.</p>
            </div>
            
            <div className="space-y-4">
              <h3 className="text-sm font-black tracking-widest text-emerald-400 uppercase">The Solution</h3>
              <p className="text-slate-300 leading-relaxed text-lg">A unified cloud muster roll that ingests data from biometric devices, mobile apps, and supervisor roll-calls in real-time.</p>
            </div>
            
            <div className="p-6 rounded-2xl bg-blue-500/5 border border-blue-500/10 space-y-4">
              <h3 className="text-sm font-black tracking-widest text-white uppercase">Business Value</h3>
              <p className="text-blue-200 font-medium">Achieve 100% labor compliance and cut payroll processing time from days to hours.</p>
            </div>
          </div>

          <div className="space-y-8">
            <h3 className="text-2xl font-bold text-white">Key Capabilities</h3>
            <div className="grid gap-4">
              <div className="flex items-start gap-3 p-4 rounded-xl bg-white/5 border border-white/10"><CheckCircle2 className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" /><span className="text-slate-300">Hardware Integration (Biometric, RFID)</span></div>
<div className="flex items-start gap-3 p-4 rounded-xl bg-white/5 border border-white/10"><CheckCircle2 className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" /><span className="text-slate-300">Mobile Selfie & Geo-fenced Punch</span></div>
<div className="flex items-start gap-3 p-4 rounded-xl bg-white/5 border border-white/10"><CheckCircle2 className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" /><span className="text-slate-300">Automated Form II Register Generation</span></div>
<div className="flex items-start gap-3 p-4 rounded-xl bg-white/5 border border-white/10"><CheckCircle2 className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" /><span className="text-slate-300">Overtime & Late Approval Workflows</span></div>
            </div>
          </div>

        </div>
      </section>

    </div>
  );
};
