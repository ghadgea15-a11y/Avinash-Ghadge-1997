import React from 'react';
import { 
  ShieldCheck, 
  Lock, 
  Key, 
  EyeOff, 
  FileLock2, 
  Server, 
  CheckCircle2, 
  MapPin, 
  FileText,
  UserCheck
} from 'lucide-react';

export const SecurityArchitectureSection: React.FC = () => {
  const pillars = [
    {
      icon: Key,
      title: 'Token Authentication',
      desc: 'JWT and cryptographic session tokens with automatic refresh cycles, device binding, and brute-force lockouts.'
    },
    {
      icon: UserCheck,
      title: 'Granular RBAC',
      desc: 'Hierarchical role-based access control: Super Admin, Company Admin, Operations Head, Site Supervisor, and Guard.'
    },
    {
      icon: ShieldCheck,
      title: 'Company Isolation',
      desc: 'Strict multi-tenant security rules ensuring complete cryptographic partition between competing enterprises.'
    },
    {
      icon: MapPin,
      title: 'Site Geofence Controls',
      desc: 'GPS-bounded validation enforcing that patrol scans and muster roll-calls can only originate within physical site perimeter.'
    },
    {
      icon: FileLock2,
      title: 'Immutable Audit Trails',
      desc: 'Non-repudiable timestamped event logs for every muster change, gate pass approval, and equipment alert.'
    },
    {
      icon: EyeOff,
      title: 'Controlled Access & Privacy',
      desc: 'Selective data masking for Aadhaar numbers and employee personal records ensuring complete regulatory compliance.'
    }
  ];

  return (
    <section id="security" className="py-24 lg:py-32 bg-[#080D0B] text-white border-b border-[#1B2923]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
        
        {/* Section Header */}
        <div className="max-w-3xl mx-auto text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-xs font-mono font-bold tracking-widest text-emerald-400 uppercase">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Zero-Trust Enterprise Guardrails</span>
          </div>

          <h2 className="font-display text-3xl sm:text-5xl lg:text-6xl font-extrabold text-white tracking-tight leading-[1.08]">
            CONTROL WITHOUT COMPLEXITY.
          </h2>

          <p className="font-body text-sm sm:text-base text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Enterprise-grade governance, strict tenant boundary enforcement, and immutable audit logs built directly into the core engine.
          </p>
        </div>

        {/* 6 Security Pillars Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {pillars.map((pillar, idx) => {
            const Icon = pillar.icon;
            return (
              <div 
                key={idx}
                className="p-8 rounded-3xl bg-[#0F1714] border border-[#1B2923] hover:border-emerald-500/50 transition-colors space-y-4 shadow-sm"
              >
                <div className="w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className="font-display text-lg font-bold text-white">
                  {pillar.title}
                </h3>
                <p className="font-body text-xs sm:text-sm text-slate-400 leading-relaxed">
                  {pillar.desc}
                </p>
              </div>
            );
          })}
        </div>

        {/* Security Baseline Strip */}
        <div className="p-6 rounded-2xl bg-[#0B1310] border border-[#1B2923] flex flex-wrap items-center justify-between gap-4 text-xs font-mono text-slate-400">
          <div className="flex items-center gap-2 text-emerald-400">
            <CheckCircle2 className="w-4 h-4" />
            <span>SOC-2 & ISO 27001 READY ARCHITECTURE</span>
          </div>
          <div>
            <span>DATA ENCRYPTION AT REST: AES-256 &bull; IN TRANSIT: TLS 1.3</span>
          </div>
        </div>

      </div>
    </section>
  );
};
