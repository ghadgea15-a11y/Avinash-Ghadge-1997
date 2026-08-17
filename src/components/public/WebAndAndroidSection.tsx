import React from 'react';
import { 
  Laptop, 
  Smartphone, 
  ArrowLeftRight, 
  ShieldCheck, 
  CheckCircle2, 
  Cpu, 
  Globe2, 
  Layers, 
  Wifi, 
  WifiOff, 
  RefreshCw,
  Database
} from 'lucide-react';

export const WebAndAndroidSection: React.FC = () => {
  return (
    <section id="technology" className="py-24 lg:py-32 bg-[#FBFBFA] border-b border-[#E8E7E3]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
        
        {/* Section Header */}
        <div className="max-w-3xl mx-auto text-center space-y-4">
          <span className="font-mono text-xs font-bold uppercase tracking-widest text-emerald-600">
            Multi-Platform Cohesion
          </span>
          <h2 className="font-display text-3xl sm:text-5xl font-extrabold text-[#0A0D14] tracking-tight">
            WEB + ANDROID
          </h2>
          <p className="font-body text-sm sm:text-base text-[#52525B] leading-relaxed">
            One unified backend powering both desktop administrative workstations and rugged Android mobile devices in the field.
          </p>
        </div>

        {/* Unified Connectivity Architecture Diagram */}
        <div className="p-8 sm:p-12 rounded-3xl border border-[#E7E6E1] bg-white shadow-sm space-y-12">
          
          {/* Main 3-Pillar Visual: Web <-> Central Cloud <-> Android */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
            
            {/* Left: Web App Workstation */}
            <div className="p-6 rounded-2xl bg-[#FBFBFA] border border-[#E8E7E3] space-y-4 text-center">
              <div className="w-12 h-12 rounded-xl bg-[#0A0D14] text-white mx-auto flex items-center justify-center">
                <Laptop className="w-6 h-6 text-emerald-400" />
              </div>
              <div>
                <span className="font-mono text-[10px] uppercase font-bold text-emerald-600 tracking-wider block">
                  MANAGEMENT CONSOLE
                </span>
                <strong className="font-display text-base font-bold text-[#0A0D14] block mt-1">
                  Web Workstation
                </strong>
              </div>
              <p className="font-body text-xs text-[#52525B] leading-relaxed">
                Designed for HR Directors, Operations Heads, and Finance Managers. Full-screen master configuration, bulk rosters, Form II export, and cross-site analytics.
              </p>
              <div className="pt-2 border-t border-[#E8E7E3] font-mono text-[11px] text-[#71717A]">
                BROWSER-BASED &bull; ZERO INSTALL
              </div>
            </div>

            {/* Center: Central Engine */}
            <div className="p-6 rounded-2xl bg-[#0A0D14] text-white border border-[#27272A] space-y-4 text-center shadow-lg relative">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/20 text-emerald-400 mx-auto flex items-center justify-center border border-emerald-500/30">
                <Database className="w-6 h-6" />
              </div>
              <div>
                <span className="font-mono text-[10px] uppercase font-bold text-emerald-400 tracking-wider block">
                  SINGLE SOURCE OF TRUTH
                </span>
                <strong className="font-display text-base font-bold text-white block mt-1">
                  Log Sheet Muster Cloud
                </strong>
              </div>
              <p className="font-body text-xs text-slate-300 leading-relaxed">
                Real-time multi-tenant database ensuring immediate state synchronization. Every mobile muster entry is instantly visible on the corporate desktop.
              </p>
              <div className="pt-2 border-t border-[#27272A] font-mono text-[11px] text-emerald-400">
                TLS 1.3 &bull; REAL-TIME REPLICATION
              </div>
            </div>

            {/* Right: Android Field App */}
            <div className="p-6 rounded-2xl bg-[#FBFBFA] border border-[#E8E7E3] space-y-4 text-center">
              <div className="w-12 h-12 rounded-xl bg-[#0A0D14] text-white mx-auto flex items-center justify-center">
                <Smartphone className="w-6 h-6 text-emerald-400" />
              </div>
              <div>
                <span className="font-mono text-[10px] uppercase font-bold text-emerald-600 tracking-wider block">
                  FIELD OPERATIONS APP
                </span>
                <strong className="font-display text-base font-bold text-[#0A0D14] block mt-1">
                  Android Native App
                </strong>
              </div>
              <p className="font-body text-xs text-[#52525B] leading-relaxed">
                Engineered for Field Supervisors and Security Guards. Fast camera QR scanning, GPS location geofencing, offline muster logging, and instant photo capture.
              </p>
              <div className="pt-2 border-t border-[#E8E7E3] font-mono text-[11px] text-[#71717A]">
                OFFLINE-CAPABLE &bull; ANDROID 8.0+
              </div>
            </div>

          </div>

          {/* Key Multi-Platform Technical Guarantees */}
          <div className="pt-8 border-t border-[#E8E7E3] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 font-body text-xs">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 font-display font-bold text-[#0A0D14]">
                <RefreshCw className="w-4 h-4 text-emerald-600" />
                <span>Bi-Directional Sync</span>
              </div>
              <p className="text-[#52525B]">Roster changes made in the web app reflect instantly on supervisor mobile devices.</p>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center gap-2 font-display font-bold text-[#0A0D14]">
                <WifiOff className="w-4 h-4 text-emerald-600" />
                <span>Offline Queue Resilience</span>
              </div>
              <p className="text-[#52525B]">Patrol and muster scans in basement areas sync automatically upon regaining cellular network.</p>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center gap-2 font-display font-bold text-[#0A0D14]">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Strict Tenant Isolation</span>
              </div>
              <p className="text-[#52525B]">Guards and supervisors can only query site data belonging to their assigned company ID.</p>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center gap-2 font-display font-bold text-[#0A0D14]">
                <Cpu className="w-4 h-4 text-emerald-600" />
                <span>Zero Parallel DBs</span>
              </div>
              <p className="text-[#52525B]">Web and Android clients access the exact same data schema with zero duplication.</p>
            </div>
          </div>

        </div>

      </div>
    </section>
  );
};
