const fs = require('fs');

const content = `import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowRight, Shield, ShieldCheck, Users, Activity, Clock, 
  Smartphone, Lock, LayoutDashboard, FileText, CheckCircle2, 
  ChevronDown, Building, Server, Globe, Fingerprint, ChevronRight, Menu, X, Play,
  Briefcase, BarChart, HardHat, Settings, BookOpen, AlertTriangle
} from 'lucide-react';
import { PhaseAScreen } from '../../types';
import { navigateToUrl } from '../../utils/publicRouter';

const PremiumNavigation: React.FC<{ onNavigate: (screen: PhaseAScreen) => void }> = ({ onNavigate }) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav className={\`fixed top-0 left-0 right-0 z-50 transition-all duration-300 \${isScrolled ? 'bg-white/80 backdrop-blur-md shadow-sm border-b border-slate-200' : 'bg-transparent'}\`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          {/* Logo */}
          <div className="flex-shrink-0 flex items-center gap-2 cursor-pointer" onClick={() => window.scrollTo(0,0)}>
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-lg shadow-lg shadow-emerald-600/20">
              LM
            </div>
            <span className={\`font-bold text-xl tracking-tight \${isScrolled ? 'text-slate-900' : 'text-slate-900'}\`}>
              Log Sheet <span className="text-emerald-600">Muster</span>
            </span>
          </div>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center space-x-8">
            <a href="#platform" className="text-sm font-medium text-slate-600 hover:text-emerald-600 transition-colors">Platform</a>
            <a href="#capabilities" className="text-sm font-medium text-slate-600 hover:text-emerald-600 transition-colors">Capabilities</a>
            <a href="#security" className="text-sm font-medium text-slate-600 hover:text-emerald-600 transition-colors">Security</a>
            <a href="#about" className="text-sm font-medium text-slate-600 hover:text-emerald-600 transition-colors">About Us</a>
          </div>

          {/* Desktop Actions */}
          <div className="hidden md:flex items-center space-x-4">
            <button 
              onClick={() => onNavigate('LOGIN')}
              className="text-sm font-medium text-slate-700 hover:text-emerald-600 transition-colors px-4 py-2"
            >
              Login
            </button>
            <button 
              onClick={() => onNavigate('COMPANY_CODE')}
              className="bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium px-6 py-2.5 rounded-full transition-all shadow-md hover:shadow-lg"
            >
              Get Started
            </button>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            <button 
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="text-slate-600 hover:text-slate-900 p-2"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-white border-b border-slate-100 shadow-xl overflow-hidden"
          >
            <div className="px-4 pt-2 pb-6 space-y-1">
              <a href="#platform" onClick={() => setMobileMenuOpen(false)} className="block px-3 py-3 text-base font-medium text-slate-700 hover:bg-slate-50 hover:text-emerald-600 rounded-lg">Platform</a>
              <a href="#capabilities" onClick={() => setMobileMenuOpen(false)} className="block px-3 py-3 text-base font-medium text-slate-700 hover:bg-slate-50 hover:text-emerald-600 rounded-lg">Capabilities</a>
              <a href="#security" onClick={() => setMobileMenuOpen(false)} className="block px-3 py-3 text-base font-medium text-slate-700 hover:bg-slate-50 hover:text-emerald-600 rounded-lg">Security</a>
              <a href="#about" onClick={() => setMobileMenuOpen(false)} className="block px-3 py-3 text-base font-medium text-slate-700 hover:bg-slate-50 hover:text-emerald-600 rounded-lg">About Us</a>
              <div className="mt-6 pt-6 border-t border-slate-100 flex flex-col gap-3 px-3">
                <button onClick={() => { setMobileMenuOpen(false); onNavigate('LOGIN'); }} className="w-full text-center text-slate-700 font-medium py-3 border border-slate-200 rounded-xl hover:bg-slate-50">
                  Login
                </button>
                <button onClick={() => { setMobileMenuOpen(false); onNavigate('COMPANY_CODE'); }} className="w-full text-center text-white font-medium py-3 bg-slate-900 rounded-xl hover:bg-slate-800 shadow-md">
                  Get Started
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

const HeroSection: React.FC<{ onNavigate: (screen: PhaseAScreen) => void }> = ({ onNavigate }) => {
  return (
    <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden bg-slate-50">
      {/* Background decorations */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
        <div className="absolute -top-[20%] -right-[10%] w-[70%] h-[70%] rounded-full bg-emerald-100/50 blur-[120px]" />
        <div className="absolute top-[40%] -left-[10%] w-[50%] h-[50%] rounded-full bg-blue-100/50 blur-[100px]" />
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <div className="text-center max-w-4xl mx-auto">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm font-medium mb-8 shadow-sm"
          >
            <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Enterprise Production Ready
          </motion.div>
          
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight text-slate-900 mb-8 leading-[1.1]"
          >
            Enterprise Workforce, Facility & Security Operations
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-500 pb-2">
              Connected in One Platform.
            </span>
          </motion.h1>
          
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-lg md:text-xl text-slate-600 mb-10 max-w-2xl mx-auto leading-relaxed"
          >
            Replace fragmented records, manual attendance, and disconnected operational processes with a secure, unified operating system designed for multi-site enterprise environments.
          </motion.p>
          
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <button 
              onClick={() => onNavigate('COMPANY_CODE')}
              className="w-full sm:w-auto px-8 py-4 bg-slate-900 hover:bg-slate-800 text-white rounded-full font-medium text-lg transition-all shadow-lg shadow-slate-900/20 flex items-center justify-center gap-2"
            >
              Get Started <ArrowRight className="w-5 h-5" />
            </button>
            <button 
              onClick={() => {
                document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="w-full sm:w-auto px-8 py-4 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-full font-medium text-lg transition-all flex items-center justify-center gap-2 shadow-sm"
            >
              Request Demo
            </button>
          </motion.div>
        </div>

        {/* Hero Visual Mockup */}
        <motion.div 
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.5 }}
          className="mt-20 relative mx-auto max-w-5xl"
        >
          <div className="relative rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl shadow-slate-900/40 overflow-hidden aspect-[16/10] sm:aspect-[16/9]">
            {/* Fake Browser Header */}
            <div className="h-10 bg-slate-950 flex items-center px-4 gap-2 border-b border-slate-800">
              <div className="w-3 h-3 rounded-full bg-slate-700" />
              <div className="w-3 h-3 rounded-full bg-slate-700" />
              <div className="w-3 h-3 rounded-full bg-slate-700" />
              <div className="ml-4 flex-1 flex justify-center">
                <div className="w-1/2 h-5 rounded bg-slate-800/50" />
              </div>
            </div>
            
            {/* Animated Inner App View */}
            <div className="flex h-[calc(100%-40px)]">
              {/* Sidebar */}
              <div className="hidden sm:block w-48 border-r border-slate-800 bg-slate-900/50 p-4 space-y-4">
                <div className="h-6 w-32 bg-slate-800 rounded animate-pulse" />
                <div className="space-y-2 mt-8">
                  {[1,2,3,4,5].map(i => (
                    <div key={i} className="h-8 w-full bg-slate-800/50 rounded flex items-center px-2 gap-2">
                      <div className="h-4 w-4 rounded bg-slate-700" />
                      <div className="h-3 w-20 bg-slate-700 rounded" />
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Main Content */}
              <div className="flex-1 p-6 flex flex-col gap-6 relative overflow-hidden bg-slate-900">
                {/* Header */}
                <div className="flex justify-between items-center">
                  <div className="h-8 w-48 bg-slate-800 rounded" />
                  <div className="flex gap-3">
                    <div className="h-8 w-8 bg-slate-800 rounded-full" />
                    <div className="h-8 w-8 bg-slate-800 rounded-full" />
                  </div>
                </div>
                
                {/* Dashboard Widgets */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {[1,2,3].map(i => (
                    <motion.div 
                      key={i}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.5, delay: 0.8 + (i * 0.1) }}
                      className="h-28 rounded-xl border border-slate-800 bg-slate-800/30 p-4 flex flex-col justify-between"
                    >
                      <div className="h-8 w-8 rounded bg-emerald-500/20 flex items-center justify-center">
                        <Activity className="w-4 h-4 text-emerald-400" />
                      </div>
                      <div className="space-y-2">
                        <div className="h-6 w-16 bg-slate-700 rounded" />
                        <div className="h-3 w-24 bg-slate-800 rounded" />
                      </div>
                    </motion.div>
                  ))}
                </div>
                
                {/* List View */}
                <div className="flex-1 rounded-xl border border-slate-800 bg-slate-800/20 p-4 flex flex-col gap-3">
                  <div className="h-6 w-32 bg-slate-800 rounded mb-2" />
                  {[1,2,3,4].map(i => (
                    <motion.div 
                      key={i}
                      initial={{ x: -20, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ duration: 0.4, delay: 1.2 + (i * 0.1) }}
                      className="h-12 w-full rounded border border-slate-800 bg-slate-900/50 flex items-center justify-between px-4"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-6 w-6 rounded-full bg-slate-700" />
                        <div className="h-3 w-32 bg-slate-700 rounded" />
                      </div>
                      <div className="h-4 w-16 bg-emerald-500/20 rounded border border-emerald-500/30" />
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>
          </div>
          
          {/* Floating Mobile Device */}
          <motion.div 
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.8, delay: 1 }}
            className="absolute -bottom-10 -right-4 sm:-right-10 w-48 sm:w-64 aspect-[9/19] rounded-[2rem] border-8 border-slate-900 bg-slate-950 shadow-2xl overflow-hidden z-20"
          >
            {/* Mobile Notch */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/3 h-5 bg-slate-900 rounded-b-xl z-30" />
            
            {/* Mobile Content */}
            <div className="p-4 pt-8 h-full flex flex-col gap-4">
              <div className="flex justify-between items-center mb-2">
                <div className="h-4 w-20 bg-slate-800 rounded" />
                <div className="h-6 w-6 bg-emerald-500 rounded-full flex items-center justify-center">
                  <CheckCircle2 className="w-3 h-3 text-white" />
                </div>
              </div>
              
              <div className="h-32 w-full bg-slate-800/50 border border-slate-800 rounded-xl relative overflow-hidden flex items-center justify-center">
                <QrCodeIcon className="w-12 h-12 text-slate-600" />
              </div>
              
              <div className="space-y-3 flex-1">
                <div className="h-3 w-3/4 bg-slate-700 rounded" />
                <div className="h-3 w-1/2 bg-slate-800 rounded" />
              </div>
              
              <div className="h-12 w-full bg-emerald-600 rounded-xl flex items-center justify-center">
                <div className="h-4 w-16 bg-white/20 rounded" />
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};

// SVG Fallback for Hero
const QrCodeIcon = (props: any) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="5" height="5" x="3" y="3" rx="1"/><rect width="5" height="5" x="16" y="3" rx="1"/><rect width="5" height="5" x="3" y="16" rx="1"/><path d="M21 16h-3a2 2 0 0 0-2 2v3"/><path d="M21 21v.01"/><path d="M12 7v3a2 2 0 0 1-2 2H7"/><path d="M3 12h.01"/><path d="M12 3h.01"/><path d="M12 16v.01"/><path d="M16 12h1"/><path d="M21 12v.01"/><path d="M12 21v-1"/>
  </svg>
);


const PlatformIntro: React.FC = () => {
  return (
    <section id="platform" className="py-24 bg-white relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-sm font-bold tracking-wider text-emerald-600 uppercase mb-3">Platform Introduction</h2>
            <h3 className="text-3xl md:text-4xl font-bold text-slate-900 mb-6 leading-tight">
              A Unified Operations Ecosystem
            </h3>
            <p className="text-lg text-slate-600 mb-6 leading-relaxed">
              Log Sheet Muster is designed specifically to bring workforce, facility, security, operational and administrative processes into one connected platform.
            </p>
            <p className="text-lg text-slate-600 mb-8 leading-relaxed">
              Eliminate information silos and disjointed systems. Manage multiple companies and sites with enterprise-grade role-based access control, ensuring everyone has exactly the information they need—no more, no less.
            </p>
            <ul className="space-y-4">
              {[
                'Centralized multi-company and multi-site management',
                'Real-time workforce attendance and deployment tracking',
                'Automated HR, payroll workflows, and statutory compliance',
                'Digital facility log sheets and security muster'
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-3">
                  <div className="mt-1 bg-emerald-100 p-1 rounded-full">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  </div>
                  <span className="text-slate-700">{item}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="relative">
            <div className="aspect-square rounded-2xl bg-slate-50 border border-slate-200 p-8 flex flex-col justify-center items-center relative overflow-hidden">
               <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-100 rounded-full blur-3xl opacity-50 -translate-y-1/2 translate-x-1/4"></div>
               <div className="grid grid-cols-2 gap-4 w-full relative z-10">
                 <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex flex-col gap-3">
                   <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center"><Users className="w-5 h-5 text-blue-600"/></div>
                   <h4 className="font-semibold text-slate-900">Workforce</h4>
                 </div>
                 <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex flex-col gap-3 translate-y-6">
                   <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center"><ShieldCheck className="w-5 h-5 text-emerald-600"/></div>
                   <h4 className="font-semibold text-slate-900">Security</h4>
                 </div>
                 <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex flex-col gap-3">
                   <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center"><Building className="w-5 h-5 text-amber-600"/></div>
                   <h4 className="font-semibold text-slate-900">Facilities</h4>
                 </div>
                 <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex flex-col gap-3 translate-y-6">
                   <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center"><BarChart className="w-5 h-5 text-purple-600"/></div>
                   <h4 className="font-semibold text-slate-900">Operations</h4>
                 </div>
               </div>
               <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
                 <div className="w-20 h-20 bg-white rounded-full shadow-lg border border-slate-100 flex items-center justify-center">
                    <div className="w-12 h-12 bg-emerald-600 text-white rounded-full flex items-center justify-center font-bold text-xl">
                      LM
                    </div>
                 </div>
               </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

const WhyUsSection: React.FC = () => {
  const problems = [
    {
      title: "Fragmented Records",
      desc: "Information scattered across paper logs, spreadsheets, and disconnected apps.",
      icon: <FileText className="w-6 h-6 text-slate-400" />
    },
    {
      title: "Manual Processes",
      desc: "Time-consuming manual attendance tracking and paper-based approvals.",
      icon: <Clock className="w-6 h-6 text-slate-400" />
    },
    {
      title: "Poor Visibility",
      desc: "Lack of real-time insight into multi-site operations and workforce deployment.",
      icon: <AlertTriangle className="w-6 h-6 text-slate-400" />
    }
  ];

  const solutions = [
    {
      title: "Centralized Data",
      desc: "A single source of truth for all operational, HR, and facility records securely stored.",
      icon: <Server className="w-6 h-6 text-emerald-600" />
    },
    {
      title: "Automated Workflows",
      desc: "Streamlined BPM for leaves, payroll, and incident management.",
      icon: <Settings className="w-6 h-6 text-emerald-600" />
    },
    {
      title: "Enterprise Visibility",
      desc: "Real-time dashboards providing exact situational awareness across all sites.",
      icon: <LayoutDashboard className="w-6 h-6 text-emerald-600" />
    }
  ];

  return (
    <section className="py-24 bg-slate-50 border-t border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl font-bold text-slate-900 mb-4">Why Log Sheet Muster?</h2>
          <p className="text-lg text-slate-600">Addressing the operational friction that slows down modern enterprises.</p>
        </div>

        <div className="grid lg:grid-cols-2 gap-16 items-start">
          <div className="space-y-8">
            <h3 className="text-xl font-semibold text-slate-800 border-b border-slate-200 pb-2">The Challenge</h3>
            {problems.map((p, i) => (
              <div key={i} className="flex gap-4 opacity-75">
                <div className="mt-1">{p.icon}</div>
                <div>
                  <h4 className="font-medium text-slate-900">{p.title}</h4>
                  <p className="text-sm text-slate-600 mt-1">{p.desc}</p>
                </div>
              </div>
            ))}
          </div>
          
          <div className="space-y-8 relative">
            <div className="absolute -left-8 top-0 bottom-0 w-px bg-emerald-200 hidden lg:block">
              <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-emerald-100 border-2 border-emerald-500 flex items-center justify-center">
                <ArrowRight className="w-4 h-4 text-emerald-600" />
              </div>
            </div>
            <h3 className="text-xl font-semibold text-emerald-900 border-b border-emerald-100 pb-2">The Solution</h3>
            {solutions.map((s, i) => (
              <div key={i} className="flex gap-4">
                <div className="mt-1 bg-emerald-100 p-2 rounded-lg">{s.icon}</div>
                <div>
                  <h4 className="font-medium text-slate-900">{s.title}</h4>
                  <p className="text-sm text-slate-600 mt-1">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

const AnimatedProductShowcase: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);
  
  const tabs = [
    { label: 'Dashboard', color: 'bg-blue-500' },
    { label: 'Attendance', color: 'bg-emerald-500' },
    { label: 'Workforce', color: 'bg-indigo-500' },
    { label: 'Maintenance', color: 'bg-amber-500' },
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveTab((prev) => (prev + 1) % tabs.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [tabs.length]);

  return (
    <section className="py-24 bg-slate-950 text-white overflow-hidden relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Experience the Product</h2>
          <p className="text-lg text-slate-400">A unified interface designed for clarity and speed.</p>
        </div>

        <div className="flex justify-center gap-2 sm:gap-4 mb-12 flex-wrap">
          {tabs.map((tab, idx) => (
            <button
              key={idx}
              onClick={() => setActiveTab(idx)}
              className={\`px-4 py-2 rounded-full text-sm font-medium transition-all \${
                activeTab === idx 
                  ? 'bg-white text-slate-900 shadow-lg' 
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              }\`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative max-w-5xl mx-auto h-[400px] sm:h-[500px] lg:h-[600px] rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="h-12 border-b border-slate-800 flex items-center px-4 bg-slate-950">
             <div className="flex gap-2">
                <div className="w-3 h-3 rounded-full bg-slate-800" />
                <div className="w-3 h-3 rounded-full bg-slate-800" />
                <div className="w-3 h-3 rounded-full bg-slate-800" />
             </div>
             <div className="ml-4 text-xs font-mono text-slate-500">app.logsheetmuster.online</div>
          </div>
          
          <div className="p-6 h-[calc(100%-48px)] relative">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
                className="w-full h-full flex flex-col gap-4"
              >
                {/* Simulated UI based on active tab */}
                <div className="flex justify-between items-center pb-4 border-b border-slate-800">
                  <h3 className="text-xl font-semibold">{tabs[activeTab].label} Overview</h3>
                  <div className="h-8 w-24 rounded bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center text-xs font-medium">
                    Export Report
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {[1,2,3].map(i => (
                    <div key={i} className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 h-24 flex flex-col justify-between">
                      <div className="flex justify-between items-start">
                         <div className={\`w-8 h-8 rounded-lg \${tabs[activeTab].color}/20 flex items-center justify-center\`}>
                            <div className={\`w-4 h-4 \${tabs[activeTab].color.replace('bg-', 'text-')}\`} />
                         </div>
                         <span className="text-xs text-emerald-400 font-medium">+12%</span>
                      </div>
                      <div className="h-2 w-16 bg-slate-700 rounded mt-2" />
                      <div className="h-4 w-10 bg-slate-600 rounded mt-1" />
                    </div>
                  ))}
                </div>

                <div className="flex-1 bg-slate-800/30 border border-slate-700/50 rounded-xl mt-4 p-4">
                   <div className="space-y-3">
                     {[1,2,3,4,5].map(row => (
                       <div key={row} className="h-10 w-full bg-slate-800/80 rounded border border-slate-700/50 flex items-center px-4 justify-between">
                         <div className="flex gap-4">
                           <div className="h-4 w-4 rounded bg-slate-600" />
                           <div className="h-4 w-32 bg-slate-700 rounded" />
                         </div>
                         <div className="h-4 w-20 bg-slate-600 rounded" />
                       </div>
                     ))}
                   </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  );
};

const CoreCapabilities: React.FC = () => {
  const capabilities = [
    { icon: <Users />, title: "Workforce & HRMS", desc: "Complete employee lifecycle, digital records, and onboarding management." },
    { icon: <Clock />, title: "Attendance & Shifts", desc: "Complex 24/7 rostering, live punching, and overtime rules." },
    { icon: <Building />, title: "Facility Management", desc: "Digital log sheets, equipment registers, and facility health tracking." },
    { icon: <ShieldCheck />, title: "Security Operations", desc: "Guard patrol muster, visitor management, and incident reporting." },
    { icon: <Settings />, title: "Preventive Maintenance", desc: "Scheduled asset maintenance, work orders, and breakdown logs." },
    { icon: <FileText />, title: "Payroll Workflows", desc: "Automated leave impact, earnings, deductions, and payslip generation." },
  ];

  return (
    <section id="capabilities" className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl font-bold text-slate-900 mb-4">Core Platform Capabilities</h2>
          <p className="text-lg text-slate-600">Built to handle the complexity of large-scale operations.</p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {capabilities.map((cap, i) => (
            <div key={i} className="p-6 rounded-2xl border border-slate-200 bg-slate-50 hover:bg-white hover:shadow-xl hover:shadow-slate-200/50 transition-all group">
              <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                {React.cloneElement(cap.icon as React.ReactElement, { className: 'w-6 h-6' })}
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-2">{cap.title}</h3>
              <p className="text-slate-600 text-sm leading-relaxed">{cap.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

const EnterpriseArchitecture: React.FC = () => {
  return (
    <section className="py-24 bg-slate-50 border-t border-slate-200 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <div className="order-2 lg:order-1 relative">
            {/* Architecture Diagram abstract */}
            <div className="relative aspect-square max-w-md mx-auto">
              <div className="absolute inset-0 bg-gradient-to-tr from-slate-200 to-transparent rounded-full opacity-50" />
              
              {/* Central Node */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-slate-900 rounded-2xl shadow-xl z-20 flex flex-col items-center justify-center text-white border-4 border-slate-800">
                <Server className="w-8 h-8 text-emerald-400 mb-2" />
                <span className="text-xs font-bold font-mono">CORE API</span>
              </div>

              {/* Orbiting Nodes */}
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 30, repeat: Infinity, ease: "linear" }} className="absolute inset-4 border border-dashed border-slate-300 rounded-full z-10">
                <div className="absolute -top-6 left-1/2 -translate-x-1/2 w-12 h-12 bg-white rounded-xl shadow-md border border-slate-200 flex items-center justify-center"><Smartphone className="w-5 h-5 text-slate-700" /></div>
                <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 w-12 h-12 bg-white rounded-xl shadow-md border border-slate-200 flex items-center justify-center"><Globe className="w-5 h-5 text-slate-700" /></div>
                <div className="absolute top-1/2 -left-6 -translate-y-1/2 w-12 h-12 bg-white rounded-xl shadow-md border border-slate-200 flex items-center justify-center"><Shield className="w-5 h-5 text-emerald-600" /></div>
                <div className="absolute top-1/2 -right-6 -translate-y-1/2 w-12 h-12 bg-white rounded-xl shadow-md border border-slate-200 flex items-center justify-center"><DatabaseIcon className="w-5 h-5 text-blue-600" /></div>
              </motion.div>
            </div>
          </div>

          <div className="order-1 lg:order-2">
            <h2 className="text-sm font-bold tracking-wider text-emerald-600 uppercase mb-3">Architecture</h2>
            <h3 className="text-3xl md:text-4xl font-bold text-slate-900 mb-6 leading-tight">
              Enterprise-Grade Foundation
            </h3>
            <p className="text-lg text-slate-600 mb-8 leading-relaxed">
              Designed from the ground up to support multi-tenant isolation, cross-platform availability, and strict security compliance.
            </p>
            
            <div className="space-y-6">
              <div>
                <h4 className="font-semibold text-slate-900 flex items-center gap-2"><Globe className="w-4 h-4 text-emerald-600" /> Multi-Company & Multi-Site</h4>
                <p className="text-sm text-slate-600 mt-1">Complete logical isolation for different organizational units and physical locations within the same deployment.</p>
              </div>
              <div>
                <h4 className="font-semibold text-slate-900 flex items-center gap-2"><Fingerprint className="w-4 h-4 text-emerald-600" /> Role-Based Access Control (RBAC)</h4>
                <p className="text-sm text-slate-600 mt-1">Strict hierarchical permissions ensuring users only access data necessary for their specific role and site.</p>
              </div>
              <div>
                <h4 className="font-semibold text-slate-900 flex items-center gap-2"><Smartphone className="w-4 h-4 text-emerald-600" /> Web & Mobile Ecosystem</h4>
                <p className="text-sm text-slate-600 mt-1">Responsive web dashboards paired with specialized mobile experiences for on-the-ground operational execution.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

const DatabaseIcon = (props: any) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5V19A9 3 0 0 0 21 19V5"/><path d="M3 12A9 3 0 0 0 21 12"/>
  </svg>
);

const SecuritySection: React.FC = () => {
  return (
    <section id="security" className="py-24 bg-slate-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <Shield className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
          <h2 className="text-3xl font-bold mb-4">Security by Design</h2>
          <p className="text-lg text-slate-400">Protecting your operational data with strict enforcement layers.</p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-8">
            <h3 className="text-xl font-semibold mb-4 text-emerald-400">Tenant & Site Isolation</h3>
            <p className="text-slate-300 text-sm leading-relaxed mb-4">
              Cryptographic boundary enforcement ensures that data from one company or site cannot bleed into another. Backend security rules strictly validate every read and write request against the authenticated user's custom claims.
            </p>
          </div>
          <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-8">
            <h3 className="text-xl font-semibold mb-4 text-emerald-400">Comprehensive Audit Trails</h3>
            <p className="text-slate-300 text-sm leading-relaxed mb-4">
              Every critical action—from shift deployments to payroll finalizations—generates an immutable audit record capturing the actor, timestamp, and precise changes made, ensuring complete accountability.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

const HowItWorks: React.FC = () => {
  const steps = [
    { num: "01", title: "Organization Setup", desc: "Configure your company, regions, sites, and departments." },
    { num: "02", title: "Workforce Config", desc: "Import employee records, assign roles, and define shift rosters." },
    { num: "03", title: "Daily Execution", desc: "Staff punch in, guards patrol, and maintenance is logged via mobile/web." },
    { num: "04", title: "Automated Approvals", desc: "BPM engine routes leaves and anomalies to correct managers." },
    { num: "05", title: "Analytics & Export", desc: "Generate payslips, compliance reports, and operational insights." }
  ];

  return (
    <section className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl font-bold text-slate-900 mb-4">How It Works</h2>
          <p className="text-lg text-slate-600">A streamlined path from setup to operational excellence.</p>
        </div>

        <div className="relative max-w-4xl mx-auto">
          {/* Vertical Line */}
          <div className="absolute left-[27px] top-4 bottom-4 w-0.5 bg-slate-100 md:left-1/2 md:-ml-[1px]" />
          
          <div className="space-y-12">
            {steps.map((step, i) => (
              <div key={i} className={\`relative flex items-center md:justify-between \${i % 2 === 0 ? 'md:flex-row-reverse' : ''}\`}>
                <div className="hidden md:block md:w-5/12" />
                
                {/* Node */}
                <div className="absolute left-0 md:left-1/2 -ml-0 md:-ml-[28px] w-14 h-14 rounded-full bg-white border-4 border-emerald-500 shadow-md flex items-center justify-center z-10">
                  <span className="font-bold text-emerald-700">{step.num}</span>
                </div>
                
                {/* Content */}
                <div className="ml-20 md:ml-0 md:w-5/12 bg-slate-50 border border-slate-200 p-6 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
                  <h3 className="text-lg font-bold text-slate-900 mb-2">{step.title}</h3>
                  <p className="text-slate-600 text-sm">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

const TargetAudience: React.FC = () => {
  const audiences = [
    { title: "Facility Managers", icon: <Building />, desc: "Oversee multiple sites, track maintenance schedules, and manage vendors." },
    { title: "Security Teams", icon: <ShieldCheck />, desc: "Execute digital guard patrols, manage visitor gates, and log incidents." },
    { title: "HR Departments", icon: <Users />, desc: "Manage employee lifecycles, attendance regularization, and leave policies." },
    { title: "Operations Directors", icon: <BarChart />, desc: "Get real-time visibility into workforce deployment and site health." }
  ];

  return (
    <section className="py-24 bg-slate-50 border-t border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl font-bold text-slate-900 mb-4">Built For Operational Teams</h2>
          <p className="text-lg text-slate-600">Empowering every role in the facility management ecosystem.</p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {audiences.map((aud, i) => (
            <div key={i} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm text-center">
              <div className="w-12 h-12 mx-auto bg-slate-100 text-slate-700 rounded-full flex items-center justify-center mb-4">
                {React.cloneElement(aud.icon as React.ReactElement, { className: 'w-6 h-6' })}
              </div>
              <h3 className="font-semibold text-slate-900 mb-2">{aud.title}</h3>
              <p className="text-xs text-slate-600 leading-relaxed">{aud.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

const BenefitsSection: React.FC = () => {
  return (
    <section className="py-24 bg-emerald-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="text-3xl font-bold mb-12">Platform Benefits</h2>
        <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-8">
          <div>
            <div className="text-4xl font-light text-emerald-400 mb-2">100%</div>
            <div className="font-medium mb-1">Centralized</div>
            <div className="text-sm text-emerald-200/70">All operational records in one secure system.</div>
          </div>
          <div>
            <div className="text-4xl font-light text-emerald-400 mb-2">Real-time</div>
            <div className="font-medium mb-1">Visibility</div>
            <div className="text-sm text-emerald-200/70">Instant updates across all facilities and sites.</div>
          </div>
          <div>
            <div className="text-4xl font-light text-emerald-400 mb-2">Automated</div>
            <div className="font-medium mb-1">Workflows</div>
            <div className="text-sm text-emerald-200/70">Faster approvals with strict audit trails.</div>
          </div>
          <div>
            <div className="text-4xl font-light text-emerald-400 mb-2">Mobile</div>
            <div className="font-medium mb-1">Execution</div>
            <div className="text-sm text-emerald-200/70">Empower ground staff with native-like tools.</div>
          </div>
        </div>
      </div>
    </section>
  );
};

const AboutUs: React.FC = () => {
  return (
    <section id="about" className="py-24 bg-white">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div className="w-16 h-16 bg-slate-900 text-white rounded-2xl flex items-center justify-center font-bold text-2xl mx-auto mb-6 shadow-xl">
          SE
        </div>
        <h2 className="text-3xl font-bold text-slate-900 mb-4">About Shourya Enterprises</h2>
        <p className="text-lg text-slate-600 mb-6 leading-relaxed">
          Log Sheet Muster is developed and maintained by Shourya Enterprises Pvt. Ltd. Our vision is to eliminate the operational friction inherent in managing large-scale facilities, distributed workforces, and security operations.
        </p>
        <p className="text-slate-600 leading-relaxed">
          We believe that enterprise software should be secure by default, intuitive to use, and capable of handling the complex realities of on-the-ground operations without compromising on administrative control.
        </p>
      </div>
    </section>
  );
};

const FaqSection: React.FC = () => {
  const faqs = [
    {
      q: "What is Log Sheet Muster?",
      a: "An enterprise SaaS platform connecting workforce management, facility log sheets, security patrol muster, and statutory compliance into a single unified system."
    },
    {
      q: "Does it support multiple sites and companies?",
      a: "Yes. The architecture is inherently multi-tenant and multi-site. A single organization can manage multiple regional sites with strict data isolation and role-based access."
    },
    {
      q: "How are permissions handled?",
      a: "Permissions use a strict Role-Based Access Control (RBAC) system combined with Custom Claims, ensuring users can only view and mutate records within their authorized scope (e.g., a site supervisor only sees their site)."
    },
    {
      q: "Is it available on mobile?",
      a: "Yes, the platform offers a responsive mobile-first web experience and supports Android application deployment for ground operational execution like guard patrols and attendance punching."
    }
  ];

  const [openIdx, setOpenIdx] = useState<number | null>(0);

  return (
    <section className="py-24 bg-slate-50 border-t border-slate-200">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-slate-900 mb-4">Frequently Asked Questions</h2>
        </div>
        
        <div className="space-y-4">
          {faqs.map((faq, idx) => (
            <div key={idx} className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
              <button 
                onClick={() => setOpenIdx(openIdx === idx ? null : idx)}
                className="w-full px-6 py-4 text-left flex justify-between items-center font-medium text-slate-900 hover:bg-slate-50 focus:outline-none"
              >
                {faq.q}
                <ChevronDown className={\`w-5 h-5 text-slate-400 transition-transform \${openIdx === idx ? 'rotate-180' : ''}\`} />
              </button>
              <AnimatePresence>
                {openIdx === idx && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="px-6 pb-4 text-slate-600 text-sm leading-relaxed border-t border-slate-100 pt-4">
                      {faq.a}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

const CtaSection: React.FC<{ onNavigate: (screen: PhaseAScreen) => void }> = ({ onNavigate }) => {
  return (
    <section id="contact" className="py-24 bg-slate-900 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-full h-full overflow-hidden -z-10 pointer-events-none opacity-20">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-3xl aspect-square rounded-full bg-emerald-500 blur-[150px]" />
      </div>
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
        <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">Ready to Transform Your Operations?</h2>
        <p className="text-xl text-slate-300 mb-10 max-w-2xl mx-auto">
          Join modern enterprises managing their workforce, security, and facilities on Log Sheet Muster.
        </p>
        
        <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
          <button 
            onClick={() => onNavigate('COMPANY_CODE')}
            className="w-full sm:w-auto px-8 py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-full font-bold text-lg transition-all shadow-lg shadow-emerald-900/50"
          >
            Get Started Now
          </button>
          <a 
            href="mailto:ghadgea162@gmail.com"
            className="w-full sm:w-auto px-8 py-4 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white rounded-full font-medium text-lg transition-all"
          >
            Contact Sales
          </a>
        </div>
      </div>
    </section>
  );
};

const PremiumFooter: React.FC<{ onNavigate: (screen: PhaseAScreen) => void }> = ({ onNavigate }) => {
  return (
    <footer className="bg-slate-950 text-slate-400 py-16 border-t border-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8 mb-12">
          
          <div className="col-span-2 lg:col-span-2 space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-600/20 text-emerald-500 flex items-center justify-center font-bold text-xs border border-emerald-500/30">
                LM
              </div>
              <span className="font-bold text-white tracking-tight">LOG SHEET MUSTER</span>
            </div>
            <p className="text-sm max-w-xs leading-relaxed">
              The unified operational operating system connecting enterprise workforce management, facility log sheets, and security muster.
            </p>
            <div className="text-xs space-y-1 pt-4">
              <div>Shourya Enterprises Pvt. Ltd.</div>
              <div>Pune, Maharashtra, India</div>
              <div><a href="mailto:ghadgea162@gmail.com" className="text-emerald-400 hover:text-emerald-300">ghadgea162@gmail.com</a></div>
            </div>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-4 text-sm">Platform</h4>
            <ul className="space-y-2 text-sm">
              <li><a href="#capabilities" className="hover:text-emerald-400 transition-colors">Features</a></li>
              <li><a href="#security" className="hover:text-emerald-400 transition-colors">Security</a></li>
              <li><button onClick={() => onNavigate('LOGIN')} className="hover:text-emerald-400 transition-colors">Enterprise Login</button></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-4 text-sm">Company</h4>
            <ul className="space-y-2 text-sm">
              <li><a href="#about" className="hover:text-emerald-400 transition-colors">About Us</a></li>
              <li><a href="mailto:ghadgea162@gmail.com" className="hover:text-emerald-400 transition-colors">Contact</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-4 text-sm">Legal</h4>
            <ul className="space-y-2 text-sm">
              <li><button onClick={() => onNavigate('LEGAL_POLICIES')} className="hover:text-emerald-400 transition-colors">Privacy Policy</button></li>
              <li><button onClick={() => onNavigate('LEGAL_POLICIES')} className="hover:text-emerald-400 transition-colors">Terms & Conditions</button></li>
            </ul>
          </div>

        </div>
        
        <div className="border-t border-slate-900 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-xs">
          <p>&copy; {new Date().getFullYear()} Shourya Enterprises Pvt. Ltd. All rights reserved.</p>
          <div className="flex gap-4">
            <span>Enterprise Grade</span>
            <span>&bull;</span>
            <span>Secure by Design</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
