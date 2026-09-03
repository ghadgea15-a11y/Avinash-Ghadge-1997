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
  Globe2,
  Lock,
  Zap,
  MonitorSmartphone
} from 'lucide-react';
import { PhaseAScreen } from '../../types';
import { motion } from 'motion/react';

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
    },
    {
      id: 'operations',
      label: 'OPERATIONS',
      tag: 'Facility & Site Logs',
      desc: 'DG sets, HVAC telemetry, water pumps, and automated SLA escalations.',
      icon: Building2,
    },
    {
      id: 'security',
      label: 'SECURITY',
      tag: 'Guard Patrols',
      desc: 'Geotagged patrol tour sequences, visitor badges, and material gate passes.',
      icon: ShieldCheck,
    },
    {
      id: 'assets',
      label: 'ASSETS',
      tag: 'EAM Lifecycle & QR',
      desc: 'Waterproof QR tag tracking, custody allocation, and preventive schedules.',
      icon: QrCode,
    },
    {
      id: 'inventory',
      label: 'INVENTORY',
      tag: 'Stock & Procurement',
      desc: 'Real-time store balances, supplier rates, POs, and Goods Receipt Notes.',
      icon: Boxes,
    },
    {
      id: 'analytics',
      label: 'ANALYTICS',
      tag: 'Executive BI',
      desc: 'One-click Form II statutory ledgers, patrol SLA audits, and MTTR metrics.',
      icon: BarChart3,
    }
  ];

  return (
    <section className="relative pt-20 pb-24 lg:pt-32 lg:pb-32 overflow-hidden bg-white">
      
      {/* Subtle Architectural Grid Background */}
      <div className="absolute inset-0 pointer-events-none opacity-40">
        <div className="absolute inset-0 [background-image:linear-gradient(to_right,#E7E6E1_1px,transparent_1px),linear-gradient(to_bottom,#E7E6E1_1px,transparent_1px)] [background-size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_40%,#000_70%,transparent_100%)]" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 space-y-16">
        
        {/* Editorial Hero Statement & Narrative */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="max-w-4xl mx-auto text-center space-y-8"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-slate-300 bg-white dark:bg-slate-900/50 backdrop-blur-sm text-xs font-mono font-bold tracking-widest text-black uppercase shadow-sm">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Unified Operational Operating System</span>
          </div>

          <h1 className="font-display text-5xl sm:text-6xl lg:text-7xl font-bold text-black leading-[1.1] tracking-tight">
            Run Every Site. <br />
            <span className="italic text-emerald-600 font-normal">Connect Every Operation.</span>
          </h1>

          <p className="font-body text-base sm:text-lg lg:text-xl text-black max-w-2xl mx-auto font-medium leading-relaxed">
            Log Sheet Muster brings workforce, facility operations, security, assets, inventory, and business intelligence into one connected, highly secure platform.
          </p>

          {/* Action CTAs */}
          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={() => onNavigate('LOGIN')}
              className="w-full sm:w-auto px-8 py-4 rounded-full bg-black hover:bg-emerald-600 text-white text-sm font-bold font-body transition-colors duration-300 shadow-xl shadow-emerald-900/10 flex items-center justify-center gap-2 group"
            >
              <span>Login to Workspace</span>
              <ArrowRight className="w-4 h-4 text-emerald-400 group-hover:text-white transition-colors" />
            </button>

            <button
              onClick={onRequestDemoClick}
              className="w-full sm:w-auto px-8 py-4 rounded-full border border-[#D4D4D8] hover:border-[#0A0D14] bg-white dark:bg-slate-900 text-black text-sm font-bold font-body transition-all duration-300 shadow-sm hover:shadow-md flex items-center justify-center gap-2"
            >
              <span>Contact for Demo</span>
            </button>
          </div>

        </motion.div>

        {/* Jaw-Dropping 3D Product Showcase Visualization */}
        <motion.div 
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.3, ease: "easeOut" }}
          className="max-w-6xl mx-auto pt-8 pb-12 perspective-[2000px]"
        >
          <div className="relative w-full h-[500px] sm:h-[650px] flex items-center justify-center transform-style-3d">
            
            {/* Ethereal Background Glows */}
            <motion.div 
              animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.5, 0.3] }}
              transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60%] h-[60%] bg-emerald-500/30 blur-[120px] rounded-full pointer-events-none"
            />
            <motion.div 
              animate={{ scale: [1, 1.2, 1], opacity: [0.2, 0.4, 0.2] }}
              transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 2 }}
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] h-[40%] bg-blue-500/20 blur-[150px] rounded-full pointer-events-none"
            />

            {/* 3D Web Dashboard Mockup */}
            <motion.div
              initial={{ rotateX: 20, rotateY: 0, rotateZ: 0, y: 50, opacity: 0 }}
              animate={{ rotateX: 15, rotateY: -15, rotateZ: 5, y: 0, opacity: 1 }}
              transition={{ duration: 1.5, ease: "easeOut" }}
              className="absolute z-10 w-[85%] max-w-[800px] aspect-[16/10] rounded-2xl bg-black/90 backdrop-blur-2xl border border-white/10 shadow-[0_50px_100px_-20px_rgba(0,0,0,0.5),0_0_40px_rgba(16,185,129,0.2)] overflow-hidden flex flex-col"
            >
              {/* Fake Browser/App Header */}
              <div className="h-10 sm:h-12 border-b border-white/10 flex items-center px-4 justify-between bg-white dark:bg-slate-900/5">
                <div className="flex gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
                  <div className="w-2.5 h-2.5 rounded-full bg-green-500/80" />
                </div>
                {/* Branding Logo inside the Web App */}
                <div className="flex items-center gap-2">
                  <MonitorSmartphone className="w-4 h-4 text-emerald-400" />
                  <span className="font-display font-bold text-white text-xs tracking-wider">Log Sheet <span className="text-emerald-500">Muster</span></span>
                </div>
                <div className="w-16" /> {/* Spacer for centering */}
              </div>
              
              {/* Fake Dashboard Content */}
              <div className="flex-1 p-4 sm:p-6 flex gap-4 sm:gap-6 bg-gradient-to-b from-transparent to-black/40">
                {/* Sidebar */}
                <div className="w-1/4 h-full rounded-xl border border-white/5 bg-white dark:bg-slate-900/5 p-3 flex flex-col gap-3">
                  <div className="w-full h-8 rounded-md bg-white dark:bg-slate-900/10 animate-pulse" />
                  <div className="w-3/4 h-4 rounded-md bg-white dark:bg-slate-900/5 mt-4" />
                  <div className="w-5/6 h-4 rounded-md bg-white dark:bg-slate-900/5" />
                  <div className="w-4/6 h-4 rounded-md bg-white dark:bg-slate-900/5" />
                  <div className="w-full h-24 rounded-md bg-emerald-500/10 border border-emerald-500/20 mt-auto" />
                </div>
                {/* Main Content Area */}
                <div className="flex-1 flex flex-col gap-4 sm:gap-6">
                  {/* Top Stats */}
                  <div className="flex gap-4 h-20 sm:h-24">
                    <div className="flex-1 rounded-xl border border-white/5 bg-white dark:bg-slate-900/5 p-4 flex flex-col justify-between">
                      <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center">
                        <Users className="w-4 h-4 text-blue-400" />
                      </div>
                      <div className="w-16 h-6 rounded-md bg-white dark:bg-slate-900/20" />
                    </div>
                    <div className="flex-1 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 flex flex-col justify-between shadow-[0_0_20px_rgba(16,185,129,0.1)]">
                      <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
                        <Activity className="w-4 h-4 text-emerald-400" />
                      </div>
                      <div className="w-20 h-6 rounded-md bg-emerald-400/30" />
                    </div>
                    <div className="flex-1 rounded-xl border border-white/5 bg-white dark:bg-slate-900/5 p-4 flex flex-col justify-between">
                      <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center">
                        <ShieldCheck className="w-4 h-4 text-purple-400" />
                      </div>
                      <div className="w-14 h-6 rounded-md bg-white dark:bg-slate-900/20" />
                    </div>
                  </div>
                  {/* Big Chart Area */}
                  <div className="flex-1 rounded-xl border border-white/5 bg-white dark:bg-slate-900/5 p-4 relative overflow-hidden">
                    <div className="absolute bottom-0 left-0 right-0 h-3/4 bg-gradient-to-t from-emerald-500/20 to-transparent" />
                    <svg className="absolute bottom-0 left-0 right-0 w-full h-full" preserveAspectRatio="none" viewBox="0 0 100 100">
                      <path d="M0,100 L0,50 Q25,30 50,60 T100,20 L100,100 Z" fill="rgba(16,185,129,0.2)" />
                      <path d="M0,50 Q25,30 50,60 T100,20" fill="none" stroke="#10B981" strokeWidth="1" />
                    </svg>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* 3D Mobile App Mockup (Overlapping) */}
            <motion.div
              initial={{ rotateX: 20, rotateY: 0, rotateZ: 0, y: 100, x: 0, opacity: 0 }}
              animate={{ rotateX: 10, rotateY: -10, rotateZ: 8, y: 40, x: '25%', opacity: 1 }}
              transition={{ duration: 1.5, delay: 0.4, ease: "easeOut" }}
              className="absolute z-20 right-[15%] sm:right-[20%] w-[160px] sm:w-[220px] aspect-[9/19] rounded-[2rem] bg-black border-[6px] border-[#18181B] shadow-[0_30px_60px_rgba(0,0,0,0.6),-20px_20px_40px_rgba(16,185,129,0.15)] overflow-hidden flex flex-col"
            >
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/3 h-5 bg-[#18181B] rounded-b-xl z-30" /> {/* Notch */}
              <div className="flex-1 bg-black p-4 pt-8 flex flex-col gap-4 relative">
                {/* Mobile Header */}
                <div className="flex justify-between items-center">
                  <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center shadow-[0_0_15px_rgba(16,185,129,0.5)]">
                    <QrCode className="w-4 h-4 text-black dark:text-white" />
                  </div>
                  <div className="w-10 h-10 rounded-full bg-white dark:bg-slate-900/10" />
                </div>
                {/* Mobile Content */}
                <div className="w-3/4 h-6 rounded-md bg-white dark:bg-slate-900/90 mt-2" />
                <div className="w-1/2 h-4 rounded-md bg-white dark:bg-slate-900/40" />
                
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="aspect-square rounded-xl bg-white dark:bg-slate-900/10 border border-white/5" />
                  <div className="aspect-square rounded-xl bg-emerald-500/20 border border-emerald-500/30" />
                  <div className="aspect-square rounded-xl bg-white dark:bg-slate-900/10 border border-white/5" />
                  <div className="aspect-square rounded-xl bg-white dark:bg-slate-900/10 border border-white/5" />
                </div>
                
                <div className="absolute bottom-4 left-4 right-4 h-12 rounded-full bg-emerald-500 flex items-center justify-center">
                  <span className="font-bold text-black dark:text-white text-sm">Scan Now</span>
                </div>
              </div>
            </motion.div>
            
            {/* Floating Badges */}
            <motion.div 
              animate={{ y: [-10, 10, -10] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              className="absolute z-30 top-[20%] left-[10%] px-4 py-2 rounded-xl bg-white dark:bg-slate-900/10 backdrop-blur-md border border-white/20 shadow-xl flex items-center gap-3"
            >
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-white text-xs font-bold tracking-widest font-mono">LIVE SYNC</span>
            </motion.div>

            <motion.div 
              animate={{ y: [10, -10, 10] }}
              transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
              className="absolute z-30 bottom-[30%] left-[5%] px-4 py-2 rounded-xl bg-black/80 backdrop-blur-md border border-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.2)] flex items-center gap-3"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span className="text-white text-xs font-bold">Patrol Verified</span>
            </motion.div>

          </div>
        </motion.div>

      </div>
    </section>
  );
};
