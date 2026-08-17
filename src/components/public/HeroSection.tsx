import React, { useState } from 'react';
import { 
  ArrowRight, 
  Sparkles, 
  ShieldCheck, 
  Users, 
  Building2, 
  Boxes, 
  QrCode, 
  BarChart3, 
  Layers, 
  CheckCircle2, 
  Cpu,
  Activity,
  Globe2
} from 'lucide-react';
import { PhaseAScreen } from '../../types';

interface HeroSectionProps {
  onNavigate: (screen: PhaseAScreen) => void;
  onRequestDemoClick: () => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  onNavigate,
  onRequestDemoClick
}) => {
  const [activeHoverNode, setActiveHoverNode] = useState<string | null>(null);

  const ecosystemNodes = [
    {
      id: 'workforce',
      label: 'WORKFORCE',
      tag: 'HCM & Shift Muster',
      desc: 'Real-time roll-call muster, Aadhaar KYC, and statutory wage calculation.',
      icon: Users,
      coords: { x: '18%', y: '22%' },
      angle: 'top-left'
    },
    {
      id: 'operations',
      label: 'OPERATIONS',
      tag: 'Facility & Site Logs',
      desc: 'DG sets, HVAC telemetry, water pumps, and automated SLA escalations.',
      icon: Building2,
      coords: { x: '82%', y: '20%' },
      angle: 'top-right'
    },
    {
      id: 'security',
      label: 'SECURITY',
      tag: 'Guard Patrols & QR Checkpoints',
      desc: 'Geotagged patrol tour sequences, visitor badges, and material gate passes.',
      icon: ShieldCheck,
      coords: { x: '12%', y: '68%' },
      angle: 'bottom-left'
    },
    {
      id: 'assets',
      label: 'ASSETS',
      tag: 'EAM Lifecycle & QR',
      desc: 'Waterproof QR tag tracking, custody allocation, and preventive schedules.',
      icon: QrCode,
      coords: { x: '85%', y: '72%' },
      angle: 'bottom-right'
    },
    {
      id: 'inventory',
      label: 'INVENTORY',
      tag: 'Stock & Procurement',
      desc: 'Real-time store balances, supplier rates, POs, and Goods Receipt Notes.',
      icon: Boxes,
      coords: { x: '50%', y: '12%' },
      angle: 'top-center'
    },
    {
      id: 'analytics',
      label: 'ANALYTICS',
      tag: 'Executive BI & Form II',
      desc: 'One-click Form II statutory ledgers, patrol SLA audits, and MTTR metrics.',
      icon: BarChart3,
      coords: { x: '50%', y: '88%' },
      angle: 'bottom-center'
    }
  ];

  return (
    <section className="relative pt-32 pb-24 lg:pt-40 lg:pb-32 overflow-hidden bg-[#FBFBFA]">
      
      {/* Subtle Architectural Grid Background */}
      <div className="absolute inset-0 pointer-events-none opacity-40">
        <div className="absolute inset-0 [background-image:linear-gradient(to_right,#E7E6E1_1px,transparent_1px),linear-gradient(to_bottom,#E7E6E1_1px,transparent_1px)] [background-size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_40%,#000_70%,transparent_100%)]" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 space-y-16">
        
        {/* Editorial Hero Statement & Narrative */}
        <div className="max-w-4xl mx-auto text-center space-y-6">
          
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-[#E2E0D8] bg-[#F4F3EF] text-[11px] font-mono font-bold tracking-widest text-[#0A0D14] uppercase">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Unified Operational Operating System</span>
          </div>

          <h1 className="font-display text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-[#0A0D14] leading-[1.08]">
            RUN EVERY SITE.<br />
            <span className="text-[#52525B]">CONNECT EVERY OPERATION.</span>
          </h1>

          <p className="font-body text-base sm:text-lg lg:text-xl text-[#52525B] max-w-2xl mx-auto font-normal leading-relaxed">
            Log Sheet Muster brings workforce, facility operations, security, assets, inventory, and business intelligence into one connected operational platform.
          </p>

          {/* Action CTAs */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={() => {
                const target = document.getElementById('platform');
                if (target) target.scrollIntoView({ behavior: 'smooth' });
              }}
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-[#0A0D14] hover:bg-[#18221E] text-white text-sm font-bold font-body transition-all duration-200 shadow-sm flex items-center justify-center gap-2 cursor-pointer group"
            >
              <span>Explore the Platform</span>
              <ArrowRight className="w-4 h-4 text-emerald-400 transition-transform group-hover:translate-x-1" />
            </button>

            <button
              onClick={onRequestDemoClick}
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl border border-[#D4D4D8] hover:border-[#0A0D14] bg-white hover:bg-[#F4F3EF] text-[#0A0D14] text-sm font-bold font-body transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Request a Demo</span>
            </button>
          </div>

        </div>

        {/* Hero Abstract Technology Ecosystem Visualizer (NOT a dashboard mockup!) */}
        <div className="max-w-5xl mx-auto pt-6">
          <div className="relative p-6 sm:p-12 lg:p-16 rounded-3xl border border-[#E7E6E1] bg-white shadow-[0_20px_50px_-20px_rgba(0,0,0,0.06)] overflow-hidden">
            
            {/* Background Circular Field Grid & Radial Waves */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-25">
              <div className="w-[300px] sm:w-[500px] h-[300px] sm:h-[500px] rounded-full border border-[#D4D4D8] animate-pulse-glow" />
              <div className="absolute w-[450px] sm:w-[700px] h-[450px] sm:h-[700px] rounded-full border border-dashed border-[#E4E4E7]" />
            </div>

            {/* Central Node: LOG SHEET MUSTER */}
            <div className="relative z-20 flex flex-col items-center justify-center text-center my-16 sm:my-20">
              <div className="relative group">
                <div className="absolute -inset-2 bg-emerald-500/15 rounded-3xl blur-md" />
                <div className="relative px-6 sm:px-10 py-5 rounded-2xl bg-[#0A0D14] text-white border border-[#27272A] shadow-xl flex items-center gap-3.5">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
                    <Cpu className="w-5 h-5" />
                  </div>
                  <div className="text-left">
                    <span className="font-mono text-[10px] uppercase font-bold tracking-widest text-emerald-400 block">
                      CENTRAL ENGINE
                    </span>
                    <strong className="font-display text-base sm:text-xl font-bold tracking-tight text-white block leading-tight">
                      LOG SHEET MUSTER
                    </strong>
                  </div>
                </div>
              </div>
              <span className="text-[11px] font-mono font-medium text-[#71717A] mt-3">
                Real-Time Event Bus &bull; Multi-Tenant Cloud Architecture
              </span>
            </div>

            {/* Orbiting Ecosystem Nodes with Spatial Thin Connecting Vectors */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 pt-6 border-t border-[#F0EFEB]">
              {ecosystemNodes.map((node) => {
                const Icon = node.icon;
                const isHovered = activeHoverNode === node.id;
                return (
                  <div
                    key={node.id}
                    onMouseEnter={() => setActiveHoverNode(node.id)}
                    onMouseLeave={() => setActiveHoverNode(null)}
                    className={`p-4 rounded-xl border transition-all duration-200 cursor-default ${
                      isHovered 
                        ? 'bg-[#F4F3EF] border-[#0A0D14] shadow-sm' 
                        : 'bg-[#FBFBFA] border-[#E8E7E3] hover:border-[#D4D4D8]'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="p-1.5 rounded-lg bg-white border border-[#E8E7E3] text-[#0A0D14]">
                        <Icon className="w-4 h-4" />
                      </div>
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    </div>
                    <strong className="font-display text-xs font-bold text-[#0A0D14] block tracking-wide">
                      {node.label}
                    </strong>
                    <span className="font-body text-[11px] text-[#71717A] block mt-0.5 leading-snug">
                      {node.tag}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Bottom Connectivity Status Strip */}
            <div className="mt-8 pt-4 border-t border-[#F0EFEB] flex flex-wrap items-center justify-between gap-4 text-xs font-body text-[#71717A]">
              <div className="flex items-center gap-2">
                <Globe2 className="w-4 h-4 text-emerald-600" />
                <span>Distributed Multi-Site Synchronization</span>
              </div>
              <div className="flex items-center gap-4 font-mono text-[11px]">
                <span>ENCRYPTION: TLS 1.3 / AES-256</span>
                <span className="text-emerald-600 font-semibold">&bull; 100% AUDITABLE</span>
              </div>
            </div>

          </div>
        </div>

      </div>
    </section>
  );
};
