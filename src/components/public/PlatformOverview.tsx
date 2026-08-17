import React, { useState } from 'react';
import { 
  Building2, 
  ShieldCheck, 
  Users, 
  Boxes, 
  QrCode, 
  BarChart3, 
  Layers, 
  CheckCircle2, 
  ArrowRight, 
  Cpu, 
  Globe2, 
  Network,
  Laptop,
  Smartphone,
  Server,
  Workflow
} from 'lucide-react';

export const PlatformOverview: React.FC = () => {
  const [selectedArchNode, setSelectedArchNode] = useState<string>('core');

  const archNodes = [
    {
      id: 'people',
      label: 'PEOPLE',
      subtitle: 'Workforce & Guards',
      desc: 'Centralized employee master records, Aadhaar KYC verification, digital ID badges, and emergency contact registries.'
    },
    {
      id: 'sites',
      label: 'SITES',
      subtitle: 'Multi-Branch Hierarchy',
      desc: 'Enterprise multi-level site structure: Headquarters → Regional Hubs → Client Premises → Operational Zones.'
    },
    {
      id: 'workforce',
      label: 'WORKFORCE',
      subtitle: 'Attendance & Muster',
      desc: 'Live shift muster roll-calls, 24/7 rotational rosters, grace periods, and automated statutory wage computations.'
    },
    {
      id: 'security',
      label: 'SECURITY',
      subtitle: 'Guard Patrols & QR',
      desc: 'Geotagged QR checkpoint route verification, visitor photo badges, and inward/outward material gate passes.'
    },
    {
      id: 'operations',
      label: 'OPERATIONS',
      subtitle: 'Facility Telemetry',
      desc: 'Equipment parameter logs for DG sets, HVAC chillers, water pumps, and proactive SLA escalation timers.'
    },
    {
      id: 'assets',
      label: 'ASSETS',
      subtitle: 'EAM Lifecycle',
      desc: 'Waterproof QR code tagging, custody allocation records, preventive maintenance calendars, and downtime logs.'
    },
    {
      id: 'inventory',
      label: 'INVENTORY',
      subtitle: 'Stock & POs',
      desc: 'Real-time site consumable balances, vendor rate registers, Purchase Orders, and Goods Receipt Notes (GRN).'
    },
    {
      id: 'analytics',
      label: 'ANALYTICS',
      subtitle: 'Executive Intelligence',
      desc: 'One-click Form II statutory muster ledgers, guard patrol SLA audits, MTTR equipment metrics, and CSV exports.'
    }
  ];

  return (
    <div id="platform" className="bg-[#FBFBFA]">
      
      {/* SECTION 2: THE OPERATING SYSTEM FOR YOUR SITES (Editorial Split Layout) */}
      <section className="py-24 lg:py-32 border-b border-[#E8E7E3]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
            
            {/* Left: Huge Editorial Typography */}
            <div className="lg:col-span-6 space-y-6">
              <span className="font-mono text-xs font-bold uppercase tracking-widest text-emerald-600">
                Centralized Governance
              </span>
              
              <h2 className="font-display text-3xl sm:text-5xl lg:text-6xl font-extrabold text-[#0A0D14] tracking-tight leading-[1.08]">
                THE OPERATING SYSTEM FOR YOUR SITES.
              </h2>
              
              <p className="font-body text-base sm:text-lg text-[#52525B] leading-relaxed">
                Whether overseeing a flagship corporate headquarters or a distributed network of fifty industrial plants, Log Sheet Muster unifies every facility under a single operational standard.
              </p>

              <div className="space-y-4 pt-4 border-t border-[#E8E7E3] font-body text-sm text-[#27272A]">
                <div className="flex items-start gap-3">
                  <span className="font-mono text-xs font-bold text-emerald-600 mt-1">01</span>
                  <p><strong>Multi-Tiered Branch Structure:</strong> Manage Headquarters, Regional Offices, Client Sites, and Guard Checkpoints with strict tenant data isolation.</p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="font-mono text-xs font-bold text-emerald-600 mt-1">02</span>
                  <p><strong>Universal Compliance Standard:</strong> Enforce standardized SOPs, muster roll-call verification, and incident logging across all field locations.</p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="font-mono text-xs font-bold text-emerald-600 mt-1">03</span>
                  <p><strong>Instant Executive Oversight:</strong> Real-time visibility into active guard patrols, equipment log sheets, and muster attendance from any browser.</p>
                </div>
              </div>
            </div>

            {/* Right: Abstract Connected Facility Illustration (NOT a card grid or dashboard mockup) */}
            <div className="lg:col-span-6">
              <div className="relative p-8 sm:p-12 rounded-3xl border border-[#E2E0D8] bg-[#F4F3EF] overflow-hidden">
                
                {/* SVG Visual Flow: Sites connecting to Log Sheet Muster */}
                <div className="space-y-4 relative z-10">
                  <div className="flex items-center justify-between pb-4 border-b border-[#E2E0D8]">
                    <span className="font-mono text-xs font-bold uppercase tracking-wider text-[#52525B]">
                      DISTRIBUTED TOPOLOGY
                    </span>
                    <span className="font-mono text-[11px] text-emerald-600 font-semibold flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      LIVE SYNC ACTIVE
                    </span>
                  </div>

                  {/* Connected Entity Nodes */}
                  <div className="space-y-3 font-body">
                    
                    <div className="p-4 rounded-xl bg-white border border-[#E8E7E3] flex items-center justify-between shadow-2xs">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-[#0A0D14] text-white flex items-center justify-center font-display font-bold text-xs">
                          HQ
                        </div>
                        <div>
                          <strong className="text-xs font-bold text-[#0A0D14] block">Corporate Headquarters</strong>
                          <span className="text-[11px] text-[#71717A]">Executive BI &bull; Consolidated Payroll Auditing</span>
                        </div>
                      </div>
                      <span className="font-mono text-[10px] bg-[#F4F3EF] px-2 py-1 rounded text-[#0A0D14] font-semibold">
                        PRIMARY DESK
                      </span>
                    </div>

                    <div className="p-4 rounded-xl bg-white border border-[#E8E7E3] flex items-center justify-between shadow-2xs">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-emerald-700 text-white flex items-center justify-center font-display font-bold text-xs">
                          PL
                        </div>
                        <div>
                          <strong className="text-xs font-bold text-[#0A0D14] block">Manufacturing Plant &bull; Pune Zone</strong>
                          <span className="text-[11px] text-[#71717A]">DG Log Sheets &bull; Material Gate Passes</span>
                        </div>
                      </div>
                      <span className="font-mono text-[10px] bg-emerald-50 text-emerald-700 px-2 py-1 rounded font-semibold border border-emerald-200">
                        14 LOGS / HR
                      </span>
                    </div>

                    <div className="p-4 rounded-xl bg-white border border-[#E8E7E3] flex items-center justify-between shadow-2xs">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-[#27272A] text-white flex items-center justify-center font-display font-bold text-xs">
                          SEC
                        </div>
                        <div>
                          <strong className="text-xs font-bold text-[#0A0D14] block">Manned Security Posts (12 Gates)</strong>
                          <span className="text-[11px] text-[#71717A]">QR Checkpoint Patrols &bull; Visitor ID Badges</span>
                        </div>
                      </div>
                      <span className="font-mono text-[10px] bg-emerald-50 text-emerald-700 px-2 py-1 rounded font-semibold border border-emerald-200">
                        100% MUSTER
                      </span>
                    </div>

                    <div className="p-4 rounded-xl bg-white border border-[#E8E7E3] flex items-center justify-between shadow-2xs">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-[#52525B] text-white flex items-center justify-center font-display font-bold text-xs">
                          MOB
                        </div>
                        <div>
                          <strong className="text-xs font-bold text-[#0A0D14] block">Field Supervisors &bull; Android Fleet</strong>
                          <span className="text-[11px] text-[#71717A]">Mobile Shift Roll-Calls &bull; Offline Sync Queue</span>
                        </div>
                      </div>
                      <span className="font-mono text-[10px] bg-[#F4F3EF] px-2 py-1 rounded text-[#0A0D14] font-semibold">
                        NATIVE ANDROID
                      </span>
                    </div>

                  </div>

                </div>

              </div>
            </div>

          </div>
        </div>
      </section>

      {/* SECTION 3: PLATFORM ARCHITECTURE (Large Full-Width Visualization) */}
      <section id="architecture" className="py-24 lg:py-32 border-b border-[#E8E7E3]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
          
          <div className="max-w-3xl mx-auto text-center space-y-4">
            <span className="font-mono text-xs font-bold uppercase tracking-widest text-emerald-600">
              System Blueprint
            </span>
            <h2 className="font-display text-3xl sm:text-5xl font-extrabold text-[#0A0D14] tracking-tight">
              CONNECTED ARCHITECTURE
            </h2>
            <p className="font-body text-sm sm:text-base text-[#52525B] leading-relaxed">
              An enterprise event-driven backbone linking people, physical sites, operational logs, and business intelligence into one continuous data pipeline.
            </p>
          </div>

          {/* Central Architecture Node & 8 Surrounding Pillars */}
          <div className="p-8 sm:p-12 rounded-3xl border border-[#E7E6E1] bg-white shadow-sm">
            
            {/* Core Engine Indicator */}
            <div className="text-center pb-8 border-b border-[#E8E7E3] mb-8">
              <div className="inline-flex items-center gap-3 px-6 py-3 rounded-2xl bg-[#0A0D14] text-white">
                <Cpu className="w-5 h-5 text-emerald-400" />
                <span className="font-display text-sm font-bold tracking-wider">
                  LOG SHEET MUSTER CORE ENGINE
                </span>
                <span className="font-mono text-[10px] bg-[#27272A] text-emerald-400 px-2 py-0.5 rounded">
                  v2.5 PROD
                </span>
              </div>
            </div>

            {/* 8 Connected Architectural Pillars */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {archNodes.map((node) => {
                const isSelected = selectedArchNode === node.id;
                return (
                  <div
                    key={node.id}
                    onClick={() => setSelectedArchNode(node.id)}
                    className={`p-5 rounded-2xl border transition-all duration-200 cursor-pointer ${
                      isSelected 
                        ? 'bg-[#F4F3EF] border-[#0A0D14] shadow-xs' 
                        : 'bg-white border-[#E8E7E3] hover:border-[#D4D4D8]'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-mono text-[11px] font-bold text-emerald-600 uppercase">
                        {node.subtitle}
                      </span>
                      <span className="w-1.5 h-1.5 rounded-full bg-[#0A0D14]" />
                    </div>
                    <h3 className="font-display text-sm font-bold text-[#0A0D14] mb-1.5">
                      {node.label}
                    </h3>
                    <p className="font-body text-xs text-[#52525B] leading-relaxed">
                      {node.desc}
                    </p>
                  </div>
                );
              })}
            </div>

            {/* Architectural Guarantees Footer */}
            <div className="mt-8 pt-6 border-t border-[#E8E7E3] flex flex-wrap items-center justify-between gap-4 font-mono text-xs text-[#71717A]">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Single Source of Truth &bull; Zero Parallel Data Stores</span>
              </div>
              <div>
                <span>MULTI-TENANT ISOLATION: STRICT FIRESTORE RBAC</span>
              </div>
            </div>

          </div>

        </div>
      </section>

    </div>
  );
};
