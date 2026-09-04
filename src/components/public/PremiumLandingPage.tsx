import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowRight, ShieldCheck, Users, Activity, Clock, 
  Building2, Lock, LayoutDashboard, ChevronDown, 
  Mail, Phone, CheckCircle2, Sparkles, Send, 
  MapPin, Fingerprint, Database, Zap, ArrowUpRight,
  MonitorSmartphone, Briefcase, BarChart3, Shield,
  QrCode, FileCheck2, Cpu, Wrench, Package,
  AlertCircle, Smartphone, Award, Server, ExternalLink,
  MessageSquare
} from 'lucide-react';
import { PhaseAScreen } from '../../types';
import { PremiumHeader } from './PremiumHeader';
import { PremiumFooter } from './PremiumFooter';
import { FirestoreService } from '../../services/firestoreService';
import { RequestDemoModal } from './RequestDemoModal';
import { LandingPageConfig, DEFAULT_LANDING_PAGE_CONFIG } from '../../types/landingPageEditor';
import { LandingPageEditorService } from '../../services/landingPageEditorService';

interface PremiumLandingPageProps {
  onNavigate: (screen: PhaseAScreen) => void;
  config?: LandingPageConfig; // Used for live preview in the editor
}

export const PremiumLandingPage: React.FC<PremiumLandingPageProps> = ({ onNavigate, config: propConfig }) => {
  const [isDemoModalOpen, setIsDemoModalOpen] = useState(false);
  const [liveConfig, setLiveConfig] = useState<LandingPageConfig>(DEFAULT_LANDING_PAGE_CONFIG);
  const [isLoading, setIsLoading] = useState(!propConfig);

  useEffect(() => {
    if (propConfig) {
      setLiveConfig(propConfig);
      setIsLoading(false);
      return;
    }

    // Subscribe to published config if not in editor preview
    const unsubscribe = LandingPageEditorService.subscribeToPublishedConfig((newConfig) => {
      setLiveConfig(newConfig);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [propConfig]);

  useEffect(() => {
    if (liveConfig.seo) {
      document.title = liveConfig.seo.metaTitle || 'Log Sheet Muster';
      const metaDesc = document.querySelector('meta[name="description"]');
      if (metaDesc) {
        metaDesc.setAttribute('content', liveConfig.seo.metaDescription || '');
      } else {
        const meta = document.createElement('meta');
        meta.name = 'description';
        meta.content = liveConfig.seo.metaDescription || '';
        document.head.appendChild(meta);
      }
    }
  }, [liveConfig.seo]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#060B19] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  const { theme, sections, sectionOrder = DEFAULT_LANDING_PAGE_CONFIG.sectionOrder } = liveConfig;

  // Map component references dynamically
  const renderSection = (key: string) => {
    if (!sections[key as keyof typeof sections]) return null;
    
    switch (key) {
      case 'hero': return <HeroSection key="hero" onNavigate={onNavigate} onOpenDemo={() => setIsDemoModalOpen(true)} config={liveConfig} />;
      case 'statsStrip': return <EnterpriseCapabilityStrip key="statsStrip" config={liveConfig} />;
      case 'productShowcase': return <InteractiveProductShowcase key="productShowcase" onNavigate={onNavigate} onOpenDemo={() => setIsDemoModalOpen(true)} config={liveConfig} />;
      case 'modules': return <ModulesSection key="modules" config={liveConfig} />;
      case 'industrySolutions': return <IndustrySolutionsSection key="industrySolutions" onNavigate={onNavigate} onOpenDemo={() => setIsDemoModalOpen(true)} config={liveConfig} />;
      case 'demoSection': return <DemoSection key="demoSection" onNavigate={onNavigate} config={liveConfig} />;
      case 'aboutUs': return <AboutUsSection key="aboutUs" config={liveConfig} />;
      case 'securitySection': return <SecuritySection key="securitySection" config={liveConfig} />;
      case 'faqSection': return <FaqSection key="faqSection" onOpenDemo={() => setIsDemoModalOpen(true)} config={liveConfig} />;
      default: return null;
    }
  };

  return (
    <div 
      className="min-h-screen text-slate-50 font-sans selection:bg-blue-500/30 selection:text-blue-200 overflow-x-hidden"
      style={{ backgroundColor: theme.backgroundColor, fontFamily: theme.fontFamily }}
    >
      {sections.header && (
        <PremiumHeader onNavigate={onNavigate} onOpenDemo={() => setIsDemoModalOpen(true)} config={liveConfig} />
      )}
      
      <main>
        {sectionOrder.map((key) => renderSection(key))}
      </main>

      {sections.footer && (
        <PremiumFooter onNavigate={onNavigate} onOpenDemo={() => setIsDemoModalOpen(true)} />
      )}
      
      <RequestDemoModal isOpen={isDemoModalOpen} onClose={() => setIsDemoModalOpen(false)} />
    </div>
  );
};

// --- HERO SECTION ---
const HeroSection: React.FC<{ onNavigate: (screen: PhaseAScreen) => void; onOpenDemo: () => void; config: LandingPageConfig }> = ({ onNavigate, onOpenDemo, config }) => {
  const { hero, theme } = config;
  
  return (
    <section className="relative pt-32 pb-20 lg:pt-44 lg:pb-32 overflow-hidden">
      {/* Dynamic Ambient Background Glows */}
      <div className="absolute top-0 right-0 w-[700px] h-[700px] bg-blue-600/10 rounded-full blur-[140px] pointer-events-none translate-x-1/3 -translate-y-1/4"></div>
      <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-indigo-600/10 rounded-full blur-[140px] pointer-events-none -translate-x-1/3 translate-y-1/4"></div>
      
      {/* Tech Grid Pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b0f_1px,transparent_1px),linear-gradient(to_bottom,#1e293b0f_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          
          {/* Left: Content (7 cols on lg) */}
          <div className="lg:col-span-7 flex flex-col items-start text-left">
            {hero.badgeEnabled && (
              <motion.div 
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-blue-950/60 border border-blue-700/40 text-blue-300 font-semibold text-xs mb-6 backdrop-blur-md shadow-sm"
              >
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                </span>
                <span>{hero.badgeText}</span>
              </motion.div>
            )}

            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className={`font-black tracking-tight text-white leading-[1.12] mb-6 ${
                theme.heroFontSize === 'sm' ? 'text-3xl sm:text-4xl md:text-5xl' :
                theme.heroFontSize === 'lg' ? 'text-5xl sm:text-6xl md:text-7xl' :
                theme.heroFontSize === 'xl' ? 'text-6xl sm:text-7xl md:text-8xl' :
                'text-4xl sm:text-5xl md:text-6xl'
              }`}
            >
              {hero.headlineMain} <br />
              <span className="text-transparent bg-clip-text" style={{ backgroundImage: `linear-gradient(to right, ${theme.primaryColor}, ${theme.accentColor})` }}>
                {hero.headlineHighlight}
              </span>
            </motion.h1>
            
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="text-base sm:text-lg text-slate-300 max-w-2xl font-normal leading-relaxed mb-8"
            >
              Built by <strong className="text-white font-semibold">{hero.companyHighlightName}</strong>, 
              {hero.subheadline.split(hero.companyHighlightName)[1] || hero.subheadline}
            </motion.p>
            
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto"
            >
              <button 
                onClick={onOpenDemo}
                className="px-8 py-4 text-white rounded-xl font-bold text-base transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg"
                style={{ backgroundImage: `linear-gradient(to right, ${theme.primaryColor}, ${theme.secondaryColor})` }}
              >
                <span>{hero.primaryButtonText}</span>
                <ArrowRight className="w-5 h-5" />
              </button>
              <button 
                onClick={() => onNavigate('LOGIN')}
                className="px-8 py-4 bg-slate-900/80 hover:bg-slate-800/90 text-white border border-slate-700/80 hover:border-slate-600 rounded-xl font-bold text-base transition-all flex items-center justify-center gap-2 cursor-pointer backdrop-blur-md"
              >
                <span>{hero.secondaryButtonText}</span>
                <ArrowUpRight className="w-5 h-5 text-slate-400" />
              </button>
            </motion.div>

            {/* Quick Metrics Bar */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.5 }}
              className="mt-10 grid grid-cols-2 sm:grid-cols-4 gap-4 w-full pt-8 border-t border-slate-800/80 text-left"
            >
              <div>
                <div className="text-2xl font-black text-white font-mono">100%</div>
                <div className="text-xs text-slate-400 font-medium mt-0.5">Form II Statutory Muster</div>
              </div>
              <div>
                <div className="text-2xl font-black text-blue-400 font-mono">99.98%</div>
                <div className="text-xs text-slate-400 font-medium mt-0.5">Cloud Uptime SLA</div>
              </div>
              <div>
                <div className="text-2xl font-black text-emerald-400 font-mono">&lt; 15 min</div>
                <div className="text-xs text-slate-400 font-medium mt-0.5">New Site Deployment</div>
              </div>
              <div>
                <div className="text-2xl font-black text-indigo-400 font-mono">Zero-Trust</div>
                <div className="text-xs text-slate-400 font-medium mt-0.5">Multi-Tenant Isolation</div>
              </div>
            </motion.div>
          </div>

          {/* Right: Realistic Web & Mobile Workstation Preview (5 cols on lg) */}
          <motion.div 
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="lg:col-span-5 relative hidden lg:block"
          >
             {/* Realistic Web Workstation Mockup */}
             <div className="w-full bg-[#0B1120] border border-slate-700/80 rounded-2xl shadow-[0_25px_60px_rgba(0,0,0,0.6)] overflow-hidden">
                {/* Window Frame Bar */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-[#070D1A]">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500/80"></div>
                    <div className="w-3 h-3 rounded-full bg-amber-500/80"></div>
                    <div className="w-3 h-3 rounded-full bg-emerald-500/80"></div>
                    <span className="ml-2 text-[11px] font-mono font-medium text-slate-400">
                      app.logsheetmuster.online &bull; Live Workstation
                    </span>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-800/60 text-emerald-400 font-bold">
                    ONLINE &bull; REALTIME SYNC
                  </span>
                </div>

                {/* Dashboard Header Bar */}
                <div className="p-4 border-b border-slate-800/80 bg-[#0D1527] flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center font-black text-xs text-white shadow-md">
                      LM
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white leading-tight">Shourya Enterprises - Ops Control</div>
                      <div className="text-[10px] text-slate-400">Site: Pune Industrial Zone 1 &bull; General Shift</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[11px] font-mono font-bold text-emerald-400">Shift A: 98.4% Present</div>
                    <div className="text-[9px] text-slate-400">1,248 / 1,268 Checked In</div>
                  </div>
                </div>

                {/* Main Metrics KPI Row */}
                <div className="p-4 grid grid-cols-3 gap-3 bg-[#0A101F]">
                  <div className="bg-slate-900/90 p-3 rounded-xl border border-slate-800">
                    <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                      <span>MUSTER</span>
                      <Users className="w-3 h-3 text-blue-400" />
                    </div>
                    <div className="text-lg font-black text-white font-mono">1,248</div>
                    <div className="text-[10px] text-emerald-400 font-medium">&bull; Form II Verified</div>
                  </div>
                  <div className="bg-slate-900/90 p-3 rounded-xl border border-slate-800">
                    <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                      <span>PATROLS</span>
                      <QrCode className="w-3 h-3 text-indigo-400" />
                    </div>
                    <div className="text-lg font-black text-white font-mono">100%</div>
                    <div className="text-[10px] text-indigo-300 font-medium">38/38 Checkpoints</div>
                  </div>
                  <div className="bg-slate-900/90 p-3 rounded-xl border border-slate-800">
                    <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                      <span>EQUIPMENT</span>
                      <Activity className="w-3 h-3 text-emerald-400" />
                    </div>
                    <div className="text-lg font-black text-emerald-400 font-mono">NORMAL</div>
                    <div className="text-[10px] text-slate-400 font-medium">DG/HVAC Logged</div>
                  </div>
                </div>

                {/* Real-time Event Stream */}
                <div className="px-4 py-3 bg-[#070D1A] border-t border-slate-800">
                  <div className="text-[10px] font-mono uppercase text-slate-400 tracking-wider mb-2.5 flex items-center justify-between">
                    <span>Live Operational Audit Stream</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  </div>
                  <div className="space-y-2 text-[11px]">
                    <div className="p-2 rounded-lg bg-slate-900/80 border border-slate-800/80 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded-full bg-blue-900/50 text-blue-300 flex items-center justify-center text-[9px] font-bold">
                          GP
                        </div>
                        <div>
                          <span className="font-semibold text-white">Guard S. Patil</span>
                          <span className="text-slate-400 ml-1.5">&bull; Checkpoint #14 (DG Room)</span>
                        </div>
                      </div>
                      <span className="text-[10px] font-mono text-emerald-400">09:14 AM Verified</span>
                    </div>

                    <div className="p-2 rounded-lg bg-slate-900/80 border border-slate-800/80 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded-full bg-indigo-900/50 text-indigo-300 flex items-center justify-center text-[9px] font-bold">
                          TD
                        </div>
                        <div>
                          <span className="font-semibold text-white">Tech R. Deshmukh</span>
                          <span className="text-slate-400 ml-1.5">&bull; Chiller 2 Temperature Log</span>
                        </div>
                      </div>
                      <span className="text-[10px] font-mono text-blue-400">09:10 AM Normal</span>
                    </div>

                    <div className="p-2 rounded-lg bg-slate-900/80 border border-slate-800/80 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded-full bg-emerald-900/50 text-emerald-300 flex items-center justify-center text-[9px] font-bold">
                          SK
                        </div>
                        <div>
                          <span className="font-semibold text-white">Supervisor Kulkarni</span>
                          <span className="text-slate-400 ml-1.5">&bull; Shift Handover Approved</span>
                        </div>
                      </div>
                      <span className="text-[10px] font-mono text-emerald-400">09:00 AM Form II</span>
                    </div>
                  </div>
                </div>
             </div>

             {/* Floating Mobile Android/PWA Mockup */}
             <motion.div 
                animate={{ y: [0, -8, 0] }}
                transition={{ repeat: Infinity, duration: 4.5, ease: "easeInOut" }}
                className="absolute -right-6 -bottom-10 w-[220px] bg-[#070D1A] border-2 border-slate-700 rounded-3xl shadow-[0_20px_45px_rgba(0,0,0,0.8)] z-20 overflow-hidden"
             >
                {/* Phone Speaker Notch */}
                <div className="h-4 bg-slate-900 flex justify-center items-center">
                  <div className="w-12 h-1 bg-slate-700 rounded-full"></div>
                </div>
                <div className="p-3.5 space-y-3">
                  <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                    <span>Field App</span>
                    <span className="text-emerald-400 font-bold">GPS LOCK</span>
                  </div>
                  
                  {/* Punch Status Box */}
                  <div className="p-2.5 rounded-xl bg-blue-950/60 border border-blue-800/60 text-center">
                    <div className="text-[10px] font-mono text-blue-300 uppercase">Shift Attendance</div>
                    <div className="text-sm font-black text-white mt-0.5">PUNCHED IN</div>
                    <div className="text-[9px] text-emerald-400 font-mono mt-0.5">07:01 AM &bull; Geofenced</div>
                  </div>

                  {/* Scan Patrol Button */}
                  <div className="p-2 rounded-xl bg-indigo-600 text-white text-center cursor-default shadow-sm">
                    <div className="flex items-center justify-center gap-1.5 text-xs font-bold">
                      <QrCode className="w-3.5 h-3.5" />
                      <span>Scan QR Point</span>
                    </div>
                    <div className="text-[9px] text-indigo-200 mt-0.5">Next: Substation 03</div>
                  </div>

                  {/* Offline Ready Indicator */}
                  <div className="text-[9px] font-mono text-slate-400 text-center flex items-center justify-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    <span>Offline Cache Ready</span>
                  </div>
                </div>
             </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

// --- ENTERPRISE CAPABILITY STRIP ---
const EnterpriseCapabilityStrip: React.FC = () => {
  const capabilities = [
    { label: 'MULTI-TENANT ISOLATION', desc: 'Row-level partition' },
    { label: 'STATUTORY FORM II', desc: 'Labor Act compliant' },
    { label: 'ZERO-TRUST RBAC', desc: 'A0 to A9 roles' },
    { label: 'QR GUARD PATROLS', desc: 'GPS & photo proof' },
    { label: 'OFFLINE FIELD SYNC', desc: 'IndexedDB engine' },
    { label: 'AUTO STATUTORY PAYROLL', desc: 'PF, ESI & PT export' }
  ];

  return (
    <section className="py-7 border-y border-white/10 bg-[#080D1E]">
      <div className="max-w-7xl mx-auto px-4 text-center">
        <p className="text-[11px] font-bold text-slate-400 mb-4 uppercase tracking-widest font-mono">
          Architected for India&apos;s Multi-Site Physical Operations &amp; Statutory Compliance
        </p>
        <div className="flex flex-wrap justify-center items-center gap-x-8 gap-y-3">
          {capabilities.map((cap, idx) => (
            <div key={idx} className="flex items-center gap-8">
              <div className="text-left">
                <span className="text-xs sm:text-sm font-mono font-bold tracking-wider text-slate-200 hover:text-blue-400 transition-colors">
                  {cap.label}
                </span>
                <span className="hidden md:inline-block text-[10px] text-slate-500 ml-2 font-mono">
                  ({cap.desc})
                </span>
              </div>
              {idx < capabilities.length - 1 && (
                <span className="w-1.5 h-1.5 rounded-full bg-slate-700 hidden sm:inline-block" />
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

// --- INTERACTIVE PRODUCT SHOWCASE (DEEP DIVE) ---
const InteractiveProductShowcase: React.FC<{ onNavigate: (screen: PhaseAScreen) => void; onOpenDemo: () => void }> = ({ onNavigate, onOpenDemo }) => {
  const [activeTab, setActiveTab] = useState<'attendance' | 'facility' | 'patrol' | 'compliance'>('attendance');

  const showcaseData = {
    attendance: {
      title: 'Real-Time Attendance & Statutory Form II Muster',
      subtitle: 'Eliminate attendance spoofing and automate statutory labor register generation with geofenced mobile clocking.',
      bullets: [
        'Geofenced mobile punch with selfie/facial verification for field and remote staff',
        'Automatic late-mark rules, overtime calculation, and multi-shift roster allocation',
        'Single-click export of Indian Statutory Form II Attendance Register (Daily, Monthly, Annual)',
        'Biometric punch station integration with live synchronization across all branches'
      ],
      kpis: [
        { label: 'Time Theft Reduction', value: '100%' },
        { label: 'Form II Generation', value: 'Instant' },
        { label: 'Punch Latency', value: '< 400ms' }
      ],
      tag: 'Workforce & WFM'
    },
    facility: {
      title: 'Digital Facility Log Sheets & Equipment Monitoring',
      subtitle: 'Replace paper clipboards with verifiable, timestamped digital checklists for critical building infrastructure.',
      bullets: [
        'Equipment log sheets for Diesel Generators (DG), HVAC Chillers, Transformers & HT Panels',
        'Housekeeping checksheets with photo uploads and supervisor signature acknowledgment',
        'Preventive maintenance schedules with automatic alert triggers for filter and oil changes',
        'Water treatment plant, STP/ETP daily meter readings and consumption trends'
      ],
      kpis: [
        { label: 'Audit Trail', value: 'Immutable' },
        { label: 'Equipment Downtime', value: '-38%' },
        { label: 'Paper Elimination', value: '100%' }
      ],
      tag: 'Facility & Maintenance'
    },
    patrol: {
      title: 'Guard Tour Patrol Verification & Security Muster',
      subtitle: 'Verify guard patrol checkpoints in real time with NFC/QR codes, geo-coordinates, and photographic incident logs.',
      bullets: [
        'Dynamic patrol routes with sequence enforcement and checkpoint timeout alerts',
        'Immediate security incident reporting with live photo evidence and severity classification',
        'Visitor management with QR visitor passes, badge printing, and host notifications',
        'Site security handover protocol with biometric shift confirmation'
      ],
      kpis: [
        { label: 'Patrol Adherence', value: '99.4%' },
        { label: 'Incident Resolution', value: '4x Faster' },
        { label: 'Checkpoint Tampering', value: 'Zero' }
      ],
      tag: 'Security Operations'
    },
    compliance: {
      title: 'Statutory Labor Compliance, PF/ESI & Payroll',
      subtitle: 'Seamlessly compute wages directly from verified muster data with built-in statutory deductions.',
      bullets: [
        'Automated PF (Provident Fund), ESI, Professional Tax (PT), and TDS computation',
        'Bank batch payment file generation (NEFT/RTGS format compliant with major Indian banks)',
        'Employee self-service portal (ESS) for pay slips, Form 16, and leave applications',
        'Full historical audit trail of salary revisions, wage adjustments, and approvals'
      ],
      kpis: [
        { label: 'Payroll Processing Time', value: '-85%' },
        { label: 'Statutory Penalty Risk', value: '0%' },
        { label: 'Bank Direct Export', value: 'Supported' }
      ],
      tag: 'Payroll & Statutory'
    }
  };

  const active = showcaseData[activeTab];

  return (
    <section className="py-24 bg-[#050914] border-b border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-xs font-mono font-bold uppercase tracking-widest text-blue-400 bg-blue-950/60 border border-blue-800/50 px-3 py-1 rounded-full">
            Engineered For Physical Workplaces
          </span>
          <h2 className="text-3xl sm:text-5xl font-black text-white mt-4 tracking-tight">
            How Log Sheet Muster Solves <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">
              Real Ground Operations
            </span>
          </h2>
          <p className="text-slate-400 text-base mt-4">
            Select an operational pillar below to see how our unified software replaces manual friction with auditable proof.
          </p>
        </div>

        {/* Tab Selection Buttons */}
        <div className="flex flex-wrap justify-center gap-2 sm:gap-3 mb-12">
          {[
            { id: 'attendance', label: 'Attendance & Form II Muster', icon: Clock },
            { id: 'facility', label: 'Facility Log Sheets (DG/HVAC)', icon: Activity },
            { id: 'patrol', label: 'Guard Patrol & Security Checkpoints', icon: QrCode },
            { id: 'compliance', label: 'Statutory Labor & Payroll', icon: FileCheck2 }
          ].map((tab) => {
            const Icon = tab.icon;
            const isSelected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2.5 px-5 py-3 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer ${
                  isSelected 
                    ? 'bg-blue-600 text-white shadow-[0_0_20px_rgba(37,99,235,0.4)] border border-blue-400/50'
                    : 'bg-slate-900/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-slate-800'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Detail Card */}
        <div className="bg-[#0A1020] border border-slate-800 rounded-3xl p-8 sm:p-12 shadow-2xl">
          <div className="grid lg:grid-cols-12 gap-10 items-center">
            
            {/* Left: Detail Description */}
            <div className="lg:col-span-7 space-y-6">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-blue-400">
                {active.tag}
              </span>
              <h3 className="text-2xl sm:text-3xl font-black text-white leading-snug">
                {active.title}
              </h3>
              <p className="text-slate-300 text-base leading-relaxed">
                {active.subtitle}
              </p>

              <div className="space-y-3 pt-2">
                {active.bullets.map((bullet, idx) => (
                  <div key={idx} className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-blue-900/40 text-blue-400 flex items-center justify-center shrink-0 mt-0.5 border border-blue-800/60">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-sm text-slate-300 font-medium leading-relaxed">
                      {bullet}
                    </span>
                  </div>
                ))}
              </div>

              <div className="pt-4 flex flex-wrap gap-4 items-center">
                <button
                  onClick={onOpenDemo}
                  className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm transition-all shadow-md flex items-center gap-2 cursor-pointer"
                >
                  <span>Request Live Walkthrough</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  onClick={() => onNavigate('LOGIN')}
                  className="px-6 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 font-bold text-sm transition-all cursor-pointer"
                >
                  Explore in Sandbox
                </button>
              </div>
            </div>

            {/* Right: Key Performance Impact Metrics */}
            <div className="lg:col-span-5 bg-[#060B19] rounded-2xl border border-slate-800 p-6 sm:p-8 space-y-6">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <span className="text-xs font-mono uppercase text-slate-400 font-bold">Operational Impact</span>
                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-2 py-0.5 rounded">
                  VERIFIED AUDIT
                </span>
              </div>

              <div className="space-y-5">
                {active.kpis.map((kpi, idx) => (
                  <div key={idx} className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-300">{kpi.label}</span>
                    <span className="text-xl font-black text-white font-mono">{kpi.value}</span>
                  </div>
                ))}
              </div>

              <div className="p-4 rounded-xl bg-blue-950/40 border border-blue-900/50 text-xs text-slate-300 space-y-1">
                <div className="font-bold text-blue-300">Shourya Enterprise Guarantee:</div>
                <p className="text-slate-400 leading-relaxed">
                  Every log entry is cryptographically anchored with GPS coordinates, actor UID, and timestamp.
                </p>
              </div>
            </div>

          </div>
        </div>
      </div>
    </section>
  );
};

// --- MODULES SECTION ---
const ModulesSection: React.FC = () => {
  const modules = [
    { 
      icon: Users, 
      title: 'Workforce Management (HCM)', 
      desc: 'Complete employee lifecycle management, digital KYC & Aadhaar verification, skill tagging, and document expiration governance.',
      features: ['Aadhaar/PAN KYC validation', 'Document lifecycle management', 'Direct onboarding workflows']
    },
    { 
      icon: Clock, 
      title: 'Attendance & WFM Muster', 
      desc: 'Mobile GPS-geofenced clocking, facial match validation, dynamic shift rosters, and automated Form II statutory registers.',
      features: ['Geofenced mobile check-in', 'Form II labor register export', 'Overtime & late calculation']
    },
    { 
      icon: Activity, 
      title: 'Facility Ops & Log Sheets', 
      desc: 'Verifiable digital log sheets for DG sets, HVAC chillers, transformers, STP/ETP, and housekeeping checksheets.',
      features: ['DG & HVAC parameter logs', 'Checksheet supervisor sign-off', 'Housekeeping photo audits']
    },
    { 
      icon: ShieldCheck, 
      title: 'Security & Guard Patrols', 
      desc: 'Real-time QR/NFC checkpoint patrol verification, incident reporting with photo proof, and visitor gate pass control.',
      features: ['Live QR checkpoint route tracking', 'Photo incident escalation', 'Visitor badge passes']
    },
    { 
      icon: Wrench, 
      title: 'Assets & Maintenance (EAM)', 
      desc: 'Full lifecycle asset tracking with QR labels, preventive maintenance schedules, breakdown work orders, and warranty alerts.',
      features: ['QR code asset tagging', 'Breakdown ticket dispatch', 'Warranty expiry warnings']
    },
    { 
      icon: Package, 
      title: 'Inventory & Supply Chain (SCM)', 
      desc: 'Multi-warehouse stock ledger, minimum threshold reorder alerts, material consumption, and returnable gate passes.',
      features: ['Stock ledger & transfer orders', 'Returnable gate passes', 'Low-stock automated alerts']
    },
    { 
      icon: Briefcase, 
      title: 'Payroll & Statutory Compliance', 
      desc: 'Automated salary calculation directly linked to muster logs, PF, ESI, Professional Tax, TDS deductions, and bank NEFT batches.',
      features: ['Automated PF/ESIC deductions', 'Direct NEFT/RTGS bank batch', 'Employee payslip self-service']
    },
    { 
      icon: BarChart3, 
      title: 'Reports & Executive BI', 
      desc: 'Real-time operational dashboards, cross-site productivity heatmaps, predictive workforce capacity, and automated audit reports.',
      features: ['Multi-site executive heatmap', 'Cost per site analytics', 'Audit-ready compliance export']
    }
  ];

  return (
    <section id="features" className="py-24 bg-[#060B19]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-xs font-mono font-bold uppercase tracking-widest text-blue-400 bg-blue-950/60 border border-blue-800/50 px-3 py-1 rounded-full">
            Modular Enterprise Architecture
          </span>
          <h2 className="text-3xl md:text-5xl font-black text-white mt-4 mb-4">
            One Unified Platform. <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">
              Every Operational Department.
            </span>
          </h2>
          <p className="text-base sm:text-lg text-slate-400 font-medium">
            Activate the specific modules your company needs today, and scale seamlessly as your site count grows.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {modules.map((mod, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className="p-6 rounded-2xl border border-slate-800 bg-[#0A1020] hover:bg-[#0E162B] hover:border-blue-500/50 transition-all group flex flex-col justify-between"
            >
              <div>
                <div className="w-12 h-12 rounded-xl bg-slate-800 group-hover:bg-blue-600/30 flex items-center justify-center mb-5 transition-colors border border-slate-700/50">
                  <mod.icon className="w-6 h-6 text-blue-400 group-hover:text-blue-300" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2.5">{mod.title}</h3>
                <p className="text-xs sm:text-sm text-slate-400 leading-relaxed mb-4">{mod.desc}</p>
              </div>

              <div className="pt-4 border-t border-slate-800/80 space-y-2">
                {mod.features.map((feat, fIdx) => (
                  <div key={fIdx} className="flex items-center gap-2 text-xs text-slate-300">
                    <CheckCircle2 className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                    <span className="truncate">{feat}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

// --- INDUSTRY SOLUTIONS SECTION ---
const IndustrySolutionsSection: React.FC<{ onNavigate: (screen: PhaseAScreen) => void; onOpenDemo: () => void }> = ({ onNavigate, onOpenDemo }) => {
  const industries = [
    {
      title: 'Facility Management Companies',
      desc: 'Deploy across hundreds of corporate client sites. Standardize guard shifts, equipment logs, and statutory Form II client billing.',
      stats: '100% Billing Accuracy'
    },
    {
      title: 'Security Agencies & Guard Ops',
      desc: 'Real-time QR/NFC checkpoint patrol verification, instant incident escalation, guard muster rosters, and uniform/asset tracking.',
      stats: 'Zero Unverified Patrols'
    },
    {
      title: 'Manufacturing & Industrial Plants',
      desc: 'Digital DG & boiler log sheets, shift handovers, contractor labor muster compliance, and plant breakdown work orders.',
      stats: 'Complete Safety Compliance'
    },
    {
      title: 'Corporate IT Parks & Real Estate',
      desc: 'Centralized tenant management, visitor QR passes, HVAC chiller energy monitoring, and preventive maintenance workorders.',
      stats: 'Multi-Tenant Partitioned'
    }
  ];

  return (
    <section className="py-20 bg-[#080D1F] border-t border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-14">
          <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            Tailored For Your Specific Industry
          </h2>
          <p className="text-slate-400 text-sm sm:text-base mt-3">
            Proven architectures deployed across commercial, industrial, and specialized service verticals.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {industries.map((ind, i) => (
            <div key={i} className="p-6 rounded-2xl bg-[#0B1226] border border-slate-800 flex flex-col justify-between hover:border-slate-700 transition-colors">
              <div>
                <h3 className="text-lg font-bold text-white mb-2">{ind.title}</h3>
                <p className="text-xs sm:text-sm text-slate-400 leading-relaxed mb-6">{ind.desc}</p>
              </div>
              <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
                <span className="text-xs font-mono text-emerald-400 font-bold">{ind.stats}</span>
                <button onClick={onOpenDemo} className="text-xs font-bold text-blue-400 hover:text-blue-300 flex items-center gap-1 cursor-pointer">
                  <span>Details</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

// --- DEMO SECTION (Light Background with Clear Contact Details) ---
const DemoSection: React.FC<{ onNavigate: (screen: PhaseAScreen) => void }> = ({ onNavigate }) => {
  const [formData, setFormData] = useState({
    fullName: '', workEmail: '', companyName: '', phone: '', designation: '', employees: '1-50', message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg('');
    try {
      const leadId = `lead_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const timestamp = new Date().toISOString();
      const newLead = {
        id: leadId,
        name: formData.fullName.trim(),
        company: formData.companyName.trim(),
        email: formData.workEmail.trim(),
        phone: formData.phone.trim(),
        designation: formData.designation.trim(),
        workforceSize: formData.employees,
        interestedModules: 'All Modules (Landing Page Demo)',
        message: formData.message.trim(),
        status: 'NEW',
        createdAt: timestamp,
        updatedAt: timestamp,
        activityHistory: [{
          id: `act_${Date.now()}`,
          action: 'LEAD_CREATED',
          actorName: 'Website Visitor',
          timestamp: timestamp,
          details: 'Requested 3-month demo via landing page inline form'
        }]
      };
      
      const success = await FirestoreService.createLead(newLead);
      if (success) {
        setIsSuccess(true);
        setFormData({ fullName: '', workEmail: '', companyName: '', phone: '', designation: '', employees: '1-50', message: '' });
      } else {
        setErrorMsg('Failed to submit request. Please try again or call us directly.');
      }
    } catch (err) {
      setErrorMsg('An error occurred. Please contact us directly at +91 90963 45456.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section id="demo" className="py-24 bg-white text-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-12 gap-12 lg:gap-16 items-center">
          
          {/* Left: Commercial Offer & Direct Contact Details (5 cols) */}
          <div className="lg:col-span-5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-700 font-bold text-xs uppercase tracking-wider mb-6">
              <span className="w-2 h-2 rounded-full bg-blue-600"></span>
              Risk-Free Enterprise Evaluation
            </div>
            
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-slate-900 mb-6 leading-tight">
              Get <span className="text-blue-600">3 Months</span> Free Enterprise Trial
            </h2>
            
            <p className="text-slate-600 font-medium mb-8 leading-relaxed">
              Experience the full power of Log Sheet Muster in your active operations with zero upfront investment.
            </p>

            <ul className="space-y-3.5 mb-10">
              {[
                'Full unrestricted access to all 8 operational modules',
                'Unlimited sites, checkpoints, and employees during trial',
                'Complimentary site onboarding & custom QR stickers provided',
                'Dedicated Technical Account Manager & WhatsApp support',
                'No credit card required &bull; Keep your data if you continue'
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-3 font-semibold text-slate-700 text-sm">
                  <div className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center shrink-0 mt-0.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                  </div>
                  <span>{item}</span>
                </li>
              ))}
            </ul>

            {/* Direct Contact Box */}
            <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
              <div className="text-xs font-mono uppercase text-slate-500 font-bold">Direct Corporate Inquiries</div>
              <div className="text-sm font-bold text-slate-900">Shourya Enterprises Pvt. Ltd.</div>
              <div className="text-xs text-slate-600">Founder &amp; Director: <strong className="text-slate-800">Avinash Shivaji Ghadge</strong></div>
              <div className="text-xs text-slate-600">HQ: Ajanthanagar, Chinchwad, Pune, Maharashtra 411019</div>
              <div className="pt-2 flex flex-col gap-2">
                <a href="tel:+919096345456" className="inline-flex items-center gap-2 text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors">
                  <Phone className="w-4 h-4 text-blue-500" /> +91 90963 45456 (Call / WhatsApp)
                </a>
                <a href="mailto:ghadgea15@gmail.com" className="inline-flex items-center gap-2 text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors">
                  <Mail className="w-4 h-4 text-blue-500" /> ghadgea15@gmail.com
                </a>
                <a href="mailto:ghadgea162@gmail.com" className="inline-flex items-center gap-2 text-xs text-slate-500 hover:text-slate-800 transition-colors">
                  <Mail className="w-4 h-4 text-slate-400" /> ghadgea162@gmail.com (Support Desk)
                </a>
              </div>
            </div>
          </div>

          {/* Right: Request Form (7 cols) */}
          <div className="lg:col-span-7 bg-white rounded-3xl p-8 sm:p-10 shadow-[0_20px_50px_rgba(0,0,0,0.08)] border border-slate-200">
            <h3 className="text-2xl font-bold text-slate-900 mb-2">Request Your <span className="text-blue-600">3-Month</span> Demo</h3>
            <p className="text-slate-500 text-sm font-medium mb-8">Our enterprise engineering team will connect with you within 24 hours.</p>

            {isSuccess ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mb-6">
                  <CheckCircle2 className="w-8 h-8 text-emerald-600" />
                </div>
                <h4 className="text-xl font-bold text-slate-900 mb-2">Demo Request Received!</h4>
                <p className="text-slate-600 font-medium max-w-md">
                  Thank you! Our Director Avinash Ghadge and the technical deployment team will contact you shortly to configure your customized workspace.
                </p>
                <div className="mt-6 flex flex-col sm:flex-row gap-3">
                  <a 
                    href="https://wa.me/919096345456?text=Hello%20Shourya%20Enterprises,%20I%20requested%20a%20demo%20for%20Log%20Sheet%20Muster"
                    target="_blank"
                    rel="noreferrer"
                    className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2"
                  >
                    <MessageSquare className="w-4 h-4" /> Message on WhatsApp
                  </a>
                  <button onClick={() => setIsSuccess(false)} className="px-5 py-2.5 text-xs font-bold text-blue-600 hover:text-blue-700 border border-slate-200 rounded-xl">
                    Submit Another Request
                  </button>
                </div>
              </motion.div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                {errorMsg && <div className="p-4 bg-red-50 text-red-600 text-sm font-bold rounded-xl">{errorMsg}</div>}
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">Full Name <span className="text-red-500">*</span></label>
                    <input required type="text" value={formData.fullName} onChange={e => setFormData({...formData, fullName: e.target.value})} className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-slate-900" placeholder="e.g. Ramesh Kulkarni" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">Work Email <span className="text-red-500">*</span></label>
                    <input required type="email" value={formData.workEmail} onChange={e => setFormData({...formData, workEmail: e.target.value})} className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-slate-900" placeholder="e.g. ramesh@company.com" />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">Company / Organization <span className="text-red-500">*</span></label>
                    <input required type="text" value={formData.companyName} onChange={e => setFormData({...formData, companyName: e.target.value})} className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-slate-900" placeholder="e.g. Vertex Facilities Pvt. Ltd." />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">Phone Number (Calling / WhatsApp) <span className="text-red-500">*</span></label>
                    <input required type="tel" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-slate-900" placeholder="+91 98765 43210" />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">Your Designation</label>
                    <input type="text" value={formData.designation} onChange={e => setFormData({...formData, designation: e.target.value})} className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-slate-900" placeholder="e.g. General Manager / Director" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">Workforce Strength</label>
                    <select value={formData.employees} onChange={e => setFormData({...formData, employees: e.target.value})} className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-slate-900">
                      <option>1-50 Employees</option>
                      <option>51-200 Employees</option>
                      <option>201-500 Employees</option>
                      <option>500-1000 Employees</option>
                      <option>1000+ Enterprise</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Operational Requirements (Optional)</label>
                  <textarea rows={3} value={formData.message} onChange={e => setFormData({...formData, message: e.target.value})} className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-slate-900" placeholder="Describe your sites, attendance punch setup, or compliance needs..."></textarea>
                </div>

                <button type="submit" disabled={isSubmitting} className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-bold text-sm transition-all shadow-[0_0_15px_rgba(79,70,229,0.3)] flex justify-center items-center gap-2 cursor-pointer">
                  {isSubmitting ? 'Submitting Details...' : <>Submit Free Demo Request <Send className="w-4 h-4" /></>}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

// --- ABOUT US ---
const AboutUsSection: React.FC = () => {
  return (
    <section id="about" className="py-24 bg-slate-50 text-slate-900 border-t border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row gap-16 items-center">
          
          <div className="lg:w-1/2 space-y-6">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-blue-600 bg-blue-100 px-3 py-1 rounded-full">
              Corporate Stewardship &amp; Leadership
            </span>
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900 leading-tight">
              About <span className="text-blue-600">Shourya Enterprises Pvt. Ltd.</span>
            </h2>
            <p className="text-slate-600 font-medium leading-relaxed">
              Founded in Pune, Maharashtra by <strong className="text-slate-900">Avinash Shivaji Ghadge</strong>, 
              Shourya Enterprises Pvt. Ltd. is on a mission to modernize physical operations for India&apos;s 
              workforce-intensive industries.
            </p>
            <p className="text-slate-600 text-sm leading-relaxed">
              We recognized that while corporate offices enjoy modern software, field operations—guards, 
              technicians, facility supervisors, and factory workers—were still burdened by paper logbooks, 
              unverified muster registers, and statutory non-compliance penalties. Log Sheet Muster bridges 
              this divide with an industrial-grade, offline-resilient platform built for Indian regulatory standards.
            </p>

            {/* Founder Card */}
            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-600 text-white font-bold flex items-center justify-center shrink-0 text-lg">
                AG
              </div>
              <div className="space-y-1">
                <div className="text-xs font-mono uppercase text-slate-400 font-bold">Founder &amp; Managing Director</div>
                <div className="text-base font-bold text-slate-900">Avinash Shivaji Ghadge</div>
                <div className="text-xs text-slate-500">Ajanthanagar, Chinchwad, Pune - 411019, MH, India</div>
                <div className="pt-1 flex flex-wrap gap-4 text-xs font-semibold">
                  <a href="mailto:ghadgea15@gmail.com" className="text-blue-600 hover:text-blue-800">
                    ghadgea15@gmail.com
                  </a>
                  <a href="tel:+919096345456" className="text-slate-700 hover:text-blue-600">
                    +91 90963 45456
                  </a>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:w-1/2 grid grid-cols-1 sm:grid-cols-2 gap-5">
            {[
              { 
                icon: Shield, 
                title: 'Multi-Tenant Isolation', 
                desc: 'Strict row-level tenant partitioning guarantees company data is never intermingled.',
                color: 'text-blue-600', 
                bg: 'bg-blue-100' 
              },
              { 
                icon: Users, 
                title: 'Granular RBAC Hierarchy', 
                desc: '10-tier authority matrix from A0 Super Admin to A9 Field Support.',
                color: 'text-emerald-600', 
                bg: 'bg-emerald-100' 
              },
              { 
                icon: Clock, 
                title: 'Indian Statutory Form II', 
                desc: 'Automated wage register compliant with Factories & Contract Labour Acts.',
                color: 'text-indigo-600', 
                bg: 'bg-indigo-100' 
              },
              { 
                icon: Smartphone, 
                title: 'Offline Field Resilience', 
                desc: 'Basement & field clocking with local IndexedDB storage and auto-sync.',
                color: 'text-amber-600', 
                bg: 'bg-amber-100' 
              }
            ].map((pillar, i) => (
              <div key={i} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
                <div>
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${pillar.bg}`}>
                    <pillar.icon className={`w-6 h-6 ${pillar.color}`} />
                  </div>
                  <h4 className="text-base font-bold text-slate-900 mb-1.5">{pillar.title}</h4>
                  <p className="text-xs text-slate-500 font-medium leading-relaxed">{pillar.desc}</p>
                </div>
              </div>
            ))}
          </div>

        </div>
      </div>
    </section>
  );
};

// --- SECURITY ---
const SecuritySection: React.FC = () => {
  return (
    <section id="security" className="py-24 bg-[#060B19] border-t border-white/5 relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-indigo-600/5 rounded-full blur-[140px] pointer-events-none"></div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-xs font-mono font-bold uppercase tracking-widest text-blue-400 bg-blue-950/60 border border-blue-800/50 px-3 py-1 rounded-full">
            Bank-Grade Governance
          </span>
          <h2 className="text-3xl md:text-5xl font-black text-white mt-4 mb-4">
            Enterprise-Grade <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">Security Architecture</span>
          </h2>
          <p className="text-base sm:text-lg text-slate-400 font-medium">
            Zero-Trust data isolation and cryptographic audit trails engineered to satisfy strict enterprise ISO &amp; SOC2 compliance demands.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {[
            { 
              title: 'Multi-Tenant Partitioning', 
              desc: 'Cryptographic company isolation ensures no organization can ever inspect, access, or mutate another organization’s records.' 
            },
            { 
              title: 'Role-Based Access Control (RBAC)', 
              desc: 'Granular permissions based on cryptographic token claims. Site Supervisors cannot view company-wide financial or unassigned branch records.' 
            },
            { 
              title: 'Statutory Audit Logging', 
              desc: 'Every approval, punch mutation, wage override, and gate pass generates an immutable audit record with actor UID, IP, and timestamp.' 
            },
            { 
              title: 'AES-256 Encryption', 
              desc: 'End-to-end data encryption across all transport layers (TLS 1.3) and database storage volumes with automated zero-knowledge snapshots.' 
            },
            { 
              title: 'Geofence Anti-Spoofing', 
              desc: 'Multi-layered GPS coordinate verification, mock location detection, and network telemetry prevents unauthorized off-site punching.' 
            },
            { 
              title: 'Disaster Recovery & Redundancy', 
              desc: 'Multi-region cloud database failover with sub-second replication ensuring continuous uninterrupted operational availability.' 
            }
          ].map((sec, i) => (
            <div key={i} className="p-6 bg-slate-900/50 rounded-2xl border border-slate-800 hover:border-blue-500/50 transition-colors">
              <Shield className="w-8 h-8 text-blue-500 mb-4" />
              <h3 className="text-lg font-bold text-white mb-2">{sec.title}</h3>
              <p className="text-xs sm:text-sm text-slate-400 font-medium leading-relaxed">{sec.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

// --- FAQ ---
const FaqSection: React.FC<{ onOpenDemo: () => void }> = ({ onOpenDemo }) => {
  const faqsLeft = [
    { 
      q: 'What is Log Sheet Muster and who is it designed for?', 
      a: 'Log Sheet Muster is a comprehensive enterprise SaaS platform designed for facility management firms, security agencies, manufacturing plants, and corporate campuses with distributed physical workforces. It connects attendance muster, guard patrols, equipment log sheets, and statutory payroll into one verified platform.' 
    },
    { 
      q: 'Does it support Indian Statutory Form II Attendance Muster?', 
      a: 'Yes! Log Sheet Muster is natively engineered for Indian labor statutory compliance. You can generate and export complete Form II registers (daily, monthly, and annual) compliant with the Factories Act and Contract Labour Regulations in one click.' 
    },
    { 
      q: 'How does it function in basements or low-connectivity zones?', 
      a: 'Our Progressive Web App (PWA) and Android app feature an offline-first IndexedDB engine. Field officers and guards can continue punching and scanning QR checkpoints offline. Data automatically synchronizes and resolves conflicts as soon as connectivity resumes.' 
    },
    { 
      q: 'Can we configure custom shift rosters and overtime rules?', 
      a: 'Yes. You can configure multi-shift rosters, rotational patterns, Grace Period allowances, late-mark penalty deductions, and double-shift overtime rules tailored to your site contracts.' 
    }
  ];

  const faqsRight = [
    { 
      q: 'What is included in the 3-month free enterprise demo?', 
      a: 'You receive full, unrestricted access to all 8 operational modules (Workforce, Attendance, Operations, Assets, Inventory, Payroll, Compliance, and Analytics) for up to unlimited sites. There are zero feature paywalls and no credit card required.' 
    },
    { 
      q: 'How long does it take to roll out a new site?', 
      a: 'A new facility site can be deployed in under 15 minutes. Create the site profile, print the auto-generated QR checkpoint tags for equipment or patrol routes, and invite your site supervisors via phone number or email.' 
    },
    { 
      q: 'Can we import our existing employees from Excel?', 
      a: 'Yes. Our platform provides standardized bulk Excel/CSV import templates for employee profiles, master asset inventories, and historical leave balances.' 
    },
    { 
      q: 'Who develops and supports Log Sheet Muster?', 
      a: 'Log Sheet Muster is proudly developed and maintained by Shourya Enterprises Pvt. Ltd. (Pune, Maharashtra, India) led by Director Avinash Shivaji Ghadge. We provide direct phone and WhatsApp support.' 
    }
  ];

  return (
    <section id="faq" className="py-24 bg-slate-50 text-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-blue-600 bg-blue-100 px-3 py-1 rounded-full">
            Knowledge Base
          </span>
          <h2 className="text-3xl md:text-4xl font-black text-slate-900 mt-4">
            Frequently Asked <span className="text-blue-600">Questions</span>
          </h2>
          <p className="text-slate-600 text-sm mt-2">
            Everything you need to know about deployment, statutory compliance, and enterprise trial.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-x-8 gap-y-4">
          <div className="space-y-4">
            {faqsLeft.map((faq, i) => (
              <FaqItem key={`left-${i}`} question={faq.q} answer={faq.a} />
            ))}
          </div>
          <div className="space-y-4">
            {faqsRight.map((faq, i) => (
              <FaqItem key={`right-${i}`} question={faq.q} answer={faq.a} />
            ))}
            
            {/* Quick Contact Box */}
            <div className="mt-8 p-8 rounded-3xl bg-gradient-to-br from-[#0B1122] to-[#060B19] border border-slate-800 text-white relative overflow-hidden shadow-xl">
              <div className="relative z-10 space-y-4">
                <span className="text-[10px] font-mono uppercase font-bold text-blue-400 tracking-wider">
                  Direct Founder Contact
                </span>
                <h3 className="text-xl font-bold">Have Specific Operational Needs?</h3>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  Speak directly with Director Avinash Ghadge to discuss custom site workflows, integration with legacy biometric devices, or custom compliance registers.
                </p>
                <div className="pt-2 space-y-2 text-xs">
                  <a href="tel:+919096345456" className="flex items-center gap-3 text-slate-300 hover:text-white transition-colors">
                    <Phone className="w-4 h-4 text-blue-400" /> +91 90963 45456 (Calling / WhatsApp)
                  </a>
                  <a href="mailto:ghadgea15@gmail.com" className="flex items-center gap-3 text-slate-300 hover:text-white transition-colors">
                    <Mail className="w-4 h-4 text-blue-400" /> ghadgea15@gmail.com
                  </a>
                  <div className="flex items-center gap-3 text-slate-400">
                    <MapPin className="w-4 h-4 text-blue-400" /> Ajanthanagar, Chinchwad, Pune - 411019
                  </div>
                </div>
                <div className="pt-2">
                  <button 
                    onClick={onOpenDemo}
                    className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all cursor-pointer"
                  >
                    Schedule Platform Demo
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

const FaqItem: React.FC<{ question: string, answer: string }> = ({ question, answer }) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden hover:border-slate-300 transition-colors">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-6 py-4 text-left flex justify-between items-center bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer"
      >
        <span className="font-bold text-slate-800 text-sm leading-snug">{question}</span>
        <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform shrink-0 ml-3 ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden bg-white">
            <div className="px-6 py-4 text-xs sm:text-sm text-slate-600 font-medium leading-relaxed border-t border-slate-100">
              {answer}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
