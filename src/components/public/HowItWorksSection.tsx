import React, { useState } from 'react';
import { 
  CheckCircle2, 
  ArrowRight, 
  ShieldCheck, 
  Cpu, 
  Smartphone, 
  Database, 
  BarChart3, 
  Workflow, 
  FileCheck2 
} from 'lucide-react';

export const HowItWorksSection: React.FC = () => {
  const [activeStep, setActiveStep] = useState(0);

  const pipelineSteps = [
    {
      num: '01',
      title: 'ACTION',
      role: 'Field Capture',
      desc: 'Guard scans QR checkpoint, supervisor marks shift muster, or technician logs DG equipment reading.',
      detail: 'Timestamp, device signature, and exact GPS coordinates are captured at point of execution.'
    },
    {
      num: '02',
      title: 'VALIDATION',
      role: 'Hardware & Geo-Fence',
      desc: 'System verifies device integrity, geofence radius (150m), and cryptographic token validity.',
      detail: 'Rejects spoofed coordinates and flags unauthorized attempts in real time.'
    },
    {
      num: '03',
      title: 'BUSINESS RULES',
      role: 'Policy Engine',
      desc: 'Evaluates shift grace periods, mandatory rest intervals, equipment operating thresholds, and inventory levels.',
      detail: 'Auto-flags overtime violations or equipment parameter deviations.'
    },
    {
      num: '04',
      title: 'APPROVAL',
      role: 'Workflow Routing',
      desc: 'Material gate passes, leave applications, or breakdown work orders route to assigned managers for sign-off.',
      detail: 'Multi-level approval chains with auto-escalation for stalled requests.'
    },
    {
      num: '05',
      title: 'DATA',
      role: 'Immutable Sync',
      desc: 'Event writes to single-source-of-truth multi-tenant database and appends to non-repudiable audit ledger.',
      detail: 'Instant bi-directional replication to Web Management Console and mobile devices.'
    },
    {
      num: '06',
      title: 'INTELLIGENCE',
      role: 'Executive BI & Form II',
      desc: 'Generates real-time compliance dashboards, patrol SLA scorecards, and statutory Form II muster ledgers.',
      detail: 'Empowers leadership with actionable cross-site insights and 100% audit readiness.'
    }
  ];

  return (
    <section className="py-24 lg:py-32 bg-[#FBFBFA] border-b border-[#E8E7E3]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
        
        {/* Section Header */}
        <div className="max-w-3xl mx-auto text-center space-y-4">
          <span className="font-mono text-xs font-bold uppercase tracking-widest text-emerald-600">
            Execution Lifecycle
          </span>
          <h2 className="font-display text-3xl sm:text-5xl font-extrabold text-[#0A0D14] tracking-tight">
            HOW OPERATIONS FLOW
          </h2>
          <p className="font-body text-sm sm:text-base text-[#52525B] leading-relaxed">
            From the initial field interaction to executive business intelligence, every operational event follows an automated, auditable six-stage lifecycle.
          </p>
        </div>

        {/* Horizontal Pipeline on Desktop / Vertical on Mobile */}
        <div className="p-8 sm:p-12 rounded-3xl border border-[#E7E6E1] bg-white shadow-sm space-y-8">
          
          {/* Horizontal Step Sequence */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {pipelineSteps.map((step, idx) => {
              const isSelected = activeStep === idx;
              return (
                <button
                  key={step.num}
                  onClick={() => setActiveStep(idx)}
                  className={`p-4 rounded-2xl border text-left transition-all duration-200 cursor-pointer ${
                    isSelected
                      ? 'bg-[#0A0D14] text-white border-[#0A0D14] shadow-sm'
                      : 'bg-[#FBFBFA] border-[#E8E7E3] text-[#52525B] hover:border-[#D4D4D8]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className={`font-mono text-xs font-bold ${isSelected ? 'text-emerald-400' : 'text-emerald-600'}`}>
                      {step.num}
                    </span>
                    {idx < pipelineSteps.length - 1 && (
                      <ArrowRight className={`w-3 h-3 hidden lg:block ${isSelected ? 'text-slate-400' : 'text-[#A1A1AA]'}`} />
                    )}
                  </div>
                  <strong className={`font-display text-sm font-bold block ${isSelected ? 'text-white' : 'text-[#0A0D14]'}`}>
                    {step.title}
                  </strong>
                  <span className={`font-body text-[11px] block mt-0.5 ${isSelected ? 'text-slate-300' : 'text-[#71717A]'}`}>
                    {step.role}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Active Step Detailed Card */}
          <div className="p-6 sm:p-8 rounded-2xl bg-[#F4F3EF] border border-[#E2E0D8] space-y-3 font-body">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="font-mono text-xs font-bold text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded">
                  STAGE {pipelineSteps[activeStep].num}
                </span>
                <h3 className="font-display text-lg font-bold text-[#0A0D14]">
                  {pipelineSteps[activeStep].title} &bull; {pipelineSteps[activeStep].role}
                </h3>
              </div>
            </div>
            <p className="text-sm font-semibold text-[#0A0D14]">
              {pipelineSteps[activeStep].desc}
            </p>
            <p className="text-xs text-[#52525B] leading-relaxed">
              {pipelineSteps[activeStep].detail}
            </p>
          </div>

        </div>

      </div>
    </section>
  );
};
