import React, { useState } from 'react';
import { 
  Users, 
  ShieldCheck, 
  FileCheck2, 
  Settings,
  ArrowRight,
  Activity,
  QrCode,
  MapPin,
  Clock,
  Briefcase
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const features = [
  {
    id: 'workforce',
    title: 'Workforce & Muster',
    subtitle: 'Precision Shift Roll-Call',
    icon: Users,
    color: 'from-blue-500/20 to-blue-600/5',
    accent: 'text-blue-400',
    borderHover: 'hover:border-blue-500/50',
    summary: 'Eliminate paper attendance registers and ghost workers with live geo-verified shift roll-calls.',
    deepDive: [
      { icon: Clock, text: 'Multi-shift rotations & grace-period logic' },
      { icon: MapPin, text: 'Geo-fenced attendance verification' },
      { icon: Briefcase, text: 'Automated overtime & wage calculation' }
    ]
  },
  {
    id: 'security',
    title: 'Security & VMS',
    subtitle: 'Patrol SLA Integrity',
    icon: ShieldCheck,
    color: 'from-emerald-500/20 to-emerald-600/5',
    accent: 'text-emerald-400',
    borderHover: 'hover:border-emerald-500/50',
    summary: 'Enforce strict security SLAs with QR checkpoints, guard patrol sequences, and live visitor logs.',
    deepDive: [
      { icon: QrCode, text: 'NFC & QR-based checkpoint scanning' },
      { icon: Activity, text: 'Real-time patrol sequence telemetry' },
      { icon: Users, text: 'Visitor ID badging & gate passes' }
    ]
  },
  {
    id: 'compliance',
    title: 'Intelligence & Compliance',
    subtitle: 'Statutory Auditing',
    icon: FileCheck2,
    color: 'from-purple-500/20 to-purple-600/5',
    accent: 'text-purple-400',
    borderHover: 'hover:border-purple-500/50',
    summary: 'Consolidate field logs into executive dashboards and audit-ready statutory registers (Form II).',
    deepDive: [
      { icon: FileCheck2, text: 'Form II statutory wage ledger exports' },
      { icon: ShieldCheck, text: 'Guard patrol SLA compliance metrics' },
      { icon: Settings, text: 'Automated executive BI consolidations' }
    ]
  },
  {
    id: 'operations',
    title: 'Operations & Assets',
    subtitle: 'Facility Telemetry',
    icon: Settings,
    color: 'from-amber-500/20 to-amber-600/5',
    accent: 'text-amber-400',
    borderHover: 'hover:border-amber-500/50',
    summary: 'Track DG sets, HVAC, pumps, and enterprise assets with unified lifecycle tracking.',
    deepDive: [
      { icon: Activity, text: 'Real-time DG & HVAC log sheets' },
      { icon: QrCode, text: 'Waterproof QR asset tags' },
      { icon: Briefcase, text: 'Consumable stock & PO tracking' }
    ]
  }
];

export const FeaturesSection: React.FC = () => {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  return (
    <section id="capabilities" className="py-24 lg:py-32 bg-[#0A0D14] relative overflow-hidden">
      {/* Background ambient elements */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-emerald-500/5 blur-[120px] rounded-full" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-blue-500/5 blur-[100px] rounded-full" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 space-y-20">
        
        {/* Section Header */}
        <div className="max-w-3xl mx-auto text-center space-y-6">
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/10 bg-white/5 backdrop-blur-sm text-xs font-mono font-bold tracking-widest text-white uppercase"
          >
            Module Highlights
          </motion.div>
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="font-display text-4xl sm:text-5xl font-bold text-white tracking-tight"
          >
            Interactive Capability <span className="italic font-normal text-emerald-400">Deep-Dive</span>
          </motion.h2>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="font-body text-base sm:text-lg text-[#A1A1AA] leading-relaxed max-w-2xl mx-auto"
          >
            Hover over the core modules below to reveal micro-animations and architectural deep-dive details of the Log Sheet Muster platform.
          </motion.p>
        </div>

        {/* Interactive Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
          {features.map((feature, idx) => {
            const Icon = feature.icon;
            const isHovered = hoveredId === feature.id;

            return (
              <motion.div
                key={feature.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: idx * 0.1 }}
                onMouseEnter={() => setHoveredId(feature.id)}
                onMouseLeave={() => setHoveredId(null)}
                className={`relative rounded-3xl p-8 cursor-pointer overflow-hidden transition-all duration-500 border border-[#27272A] bg-[#18181B]/50 backdrop-blur-md shadow-lg ${feature.borderHover} hover:shadow-2xl hover:shadow-${feature.color.split('-')[1]}/10 group`}
              >
                {/* Dynamic Gradient Background on Hover */}
                <div 
                  className={`absolute inset-0 bg-gradient-to-br ${feature.color} opacity-0 transition-opacity duration-500 ease-in-out ${isHovered ? 'opacity-100' : ''}`} 
                />

                <div className="relative z-10 flex flex-col h-full min-h-[300px]">
                  
                  {/* Card Header */}
                  <div className="flex items-start justify-between mb-6">
                    <div className="flex items-center gap-4">
                      <div className={`p-4 rounded-2xl bg-[#0A0D14] border border-[#27272A] transition-colors duration-500 ${isHovered ? 'border-white/20' : ''}`}>
                        <Icon className={`w-8 h-8 ${isHovered ? feature.accent : 'text-white'}`} />
                      </div>
                      <div>
                        <span className="font-mono text-xs font-bold uppercase tracking-widest text-[#71717A] group-hover:text-white/70 transition-colors duration-300">
                          {feature.subtitle}
                        </span>
                        <h3 className="font-display text-2xl font-bold text-white mt-1">
                          {feature.title}
                        </h3>
                      </div>
                    </div>
                    
                    <motion.div 
                      animate={{ rotate: isHovered ? 45 : 0, scale: isHovered ? 1.1 : 1 }}
                      transition={{ type: 'spring', stiffness: 200, damping: 10 }}
                      className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center bg-white/5 text-white/50 group-hover:text-white group-hover:border-white/30"
                    >
                      <ArrowRight className="w-5 h-5" />
                    </motion.div>
                  </div>

                  {/* Summary Text */}
                  <p className="font-body text-[#A1A1AA] leading-relaxed mb-8 group-hover:text-white/90 transition-colors duration-300">
                    {feature.summary}
                  </p>

                  {/* Deep Dive Reveal */}
                  <div className="mt-auto overflow-hidden">
                    <AnimatePresence>
                      {isHovered && (
                        <motion.div
                          initial={{ opacity: 0, height: 0, y: 20 }}
                          animate={{ opacity: 1, height: 'auto', y: 0 }}
                          exit={{ opacity: 0, height: 0, y: 20 }}
                          transition={{ duration: 0.4, ease: "easeOut" }}
                          className="pt-6 border-t border-white/10 space-y-4"
                        >
                          <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-emerald-400 block mb-2">
                            Deep Dive Capabilities
                          </span>
                          {feature.deepDive.map((item, i) => {
                            const ItemIcon = item.icon;
                            return (
                              <motion.div 
                                key={i}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ duration: 0.3, delay: 0.1 + (i * 0.1) }}
                                className="flex items-center gap-3 text-sm text-white/80 font-body bg-black/20 p-3 rounded-xl border border-white/5"
                              >
                                <div className="p-1.5 rounded-lg bg-white/10 text-white">
                                  <ItemIcon className="w-4 h-4" />
                                </div>
                                {item.text}
                              </motion.div>
                            );
                          })}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                </div>
              </motion.div>
            );
          })}
        </div>

      </div>
    </section>
  );
};
