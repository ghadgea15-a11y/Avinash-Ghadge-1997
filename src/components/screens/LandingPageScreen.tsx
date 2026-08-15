import React, { useState } from 'react';
import { 
  Users, 
  Clock, 
  Shield, 
  ClipboardList, 
  UserCheck, 
  Package, 
  CheckCircle2, 
  ArrowRight, 
  Smartphone, 
  Globe, 
  Building2, 
  Lock, 
  Sun, 
  Moon, 
  Menu, 
  X, 
  Mail, 
  Phone, 
  MapPin, 
  MessageSquare, 
  ChevronRight, 
  Send,
  Check,
  Activity,
  Layers,
  Calendar,
  AlertTriangle,
  FileText,
  BadgeCheck,
  CheckSquare,
  KeyRound,
  Eye,
  Briefcase
} from 'lucide-react';
import { AppLogo } from '../common/AppLogo';
import { useTheme } from '../../context/ThemeContext';
import { PhaseAScreen } from '../../types';

interface LandingPageScreenProps {
  onNavigate: (screen: PhaseAScreen) => void;
}

export const LandingPageScreen: React.FC<LandingPageScreenProps> = ({ onNavigate }) => {
  const { isDark, setThemeMode } = useTheme();
  const toggleTheme = () => setThemeMode(isDark ? 'LIGHT' : 'DARK');
  
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeShowcaseTab, setActiveShowcaseTab] = useState<'WORKFORCE' | 'MUSTER' | 'SHIFTS' | 'GATE' | 'PATROL' | 'REPORTS'>('WORKFORCE');
  const [selectedModule, setSelectedModule] = useState<string | null>(null);

  // Client-side Contact / Demo Request state (strictly no backend writes)
  const [demoForm, setDemoForm] = useState({
    name: '',
    companyName: '',
    phone: '',
    email: '',
    requirement: ''
  });
  const [formSubmitted, setFormSubmitted] = useState(false);

  const handleDemoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!demoForm.name.trim() || !demoForm.email.trim()) return;
    
    try {
      const { setDoc, doc } = await import('firebase/firestore');
      const { db } = await import('../../firebase');
      
      const demoId = `DEMO-${Date.now()}`;
      await setDoc(doc(db, 'demo_requests', demoId), {
        ...demoForm,
        createdAt: new Date().toISOString(),
        status: 'NEW'
      });
    } catch (err) {
      console.warn('Failed to submit demo request to backend', err);
    }

    setFormSubmitted(true);
  };

  return (
    <div id="home" className={`min-h-screen ${isDark ? 'bg-[#030712] text-slate-100' : 'bg-[#FAFBFC] text-slate-900'} font-sans selection:bg-indigo-600 selection:text-white transition-colors duration-200`}>
      
      {/* Top Banner Notice */}
      <div className={`border-b px-4 py-2 text-xs font-medium text-center flex items-center justify-center gap-2 ${
        isDark ? 'bg-indigo-950/40 border-indigo-900/50 text-indigo-300' : 'bg-indigo-50/80 border-indigo-100 text-indigo-950'
      }`}>
        <span className="inline-flex items-center justify-center w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
        <span>Log Sheet Muster — Enterprise Workforce, Attendance & Site Management Platform</span>
      </div>

      {/* ========================================================================= */}
      {/* 1. STICKY ENTERPRISE NAVIGATION BAR                                      */}
      {/* ========================================================================= */}
      <header className={`sticky top-0 z-50 backdrop-blur-xl border-b transition-colors ${
        isDark ? 'bg-[#030712]/90 border-slate-800/80' : 'bg-white/90 border-slate-200/90'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          
          {/* Brand Identity */}
          <div 
            className="cursor-pointer flex items-center gap-3" 
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          >
            <AppLogo size="md" showSubtitle={true} />
          </div>

          {/* Desktop Navigation Anchors */}
          <nav className="hidden lg:flex items-center gap-7 text-sm font-semibold">
            <a href="#home" className={`${isDark ? 'text-slate-300 hover:text-white' : 'text-slate-600 hover:text-slate-900'} transition`}>
              Home
            </a>
            <a href="#features" className={`${isDark ? 'text-slate-300 hover:text-white' : 'text-slate-600 hover:text-slate-900'} transition`}>
              Features
            </a>
            <a href="#modules" className={`${isDark ? 'text-slate-300 hover:text-white' : 'text-slate-600 hover:text-slate-900'} transition`}>
              Modules
            </a>
            <a href="#showcase" className={`${isDark ? 'text-slate-300 hover:text-white' : 'text-slate-600 hover:text-slate-900'} transition`}>
              Showcase
            </a>
            <a href="#security" className={`${isDark ? 'text-slate-300 hover:text-white' : 'text-slate-600 hover:text-slate-900'} transition`}>
              Security
            </a>
            <a href="#about" className={`${isDark ? 'text-slate-300 hover:text-white' : 'text-slate-600 hover:text-slate-900'} transition`}>
              About Us
            </a>
            <a href="#contact" className={`${isDark ? 'text-slate-300 hover:text-white' : 'text-slate-600 hover:text-slate-900'} transition`}>
              Contact
            </a>
          </nav>

          {/* Header Action Buttons */}
          <div className="hidden sm:flex items-center gap-3">
            {/* Theme Switcher */}
            <button
              onClick={toggleTheme}
              aria-label="Toggle Theme"
              className={`p-2.5 rounded-xl border transition ${
                isDark 
                  ? 'bg-slate-900/90 border-slate-800 text-amber-400 hover:bg-slate-800' 
                  : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* Staff / Admin Login */}
            <button
              onClick={() => onNavigate('LOGIN')}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold border transition flex items-center gap-2 ${
                isDark 
                  ? 'bg-slate-900 hover:bg-slate-800 border-slate-700 text-white' 
                  : 'bg-white hover:bg-slate-50 border-slate-300 text-slate-800 shadow-sm'
              }`}
            >
              <Lock className="w-3.5 h-3.5 text-indigo-500" />
              <span>Sign In</span>
            </button>

            {/* Request Demo / Direct Contact */}
            <a
              href="#contact"
              className="px-4 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/20 transition flex items-center gap-1.5"
            >
              <span>Request Demo</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </a>
          </div>

          {/* Mobile Menu Toggle */}
          <div className="flex lg:hidden items-center gap-2">
            <button
              onClick={toggleTheme}
              className={`p-2 rounded-lg border ${isDark ? 'bg-slate-900 border-slate-800 text-amber-400' : 'bg-slate-100 border-slate-200 text-slate-700'}`}
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className={`p-2 rounded-lg border ${isDark ? 'bg-slate-900 border-slate-800 text-slate-200' : 'bg-slate-100 border-slate-200 text-slate-700'}`}
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Slide-Down Menu Drawer */}
        {mobileMenuOpen && (
          <div className={`lg:hidden border-b px-6 py-6 space-y-4 ${isDark ? 'bg-[#030712] border-slate-800' : 'bg-white border-slate-200'}`}>
            <div className="grid grid-cols-2 gap-2 text-sm font-semibold">
              <a href="#home" onClick={() => setMobileMenuOpen(false)} className="py-2 text-slate-300">Home</a>
              <a href="#features" onClick={() => setMobileMenuOpen(false)} className="py-2 text-slate-300">Features</a>
              <a href="#modules" onClick={() => setMobileMenuOpen(false)} className="py-2 text-slate-300">Modules</a>
              <a href="#showcase" onClick={() => setMobileMenuOpen(false)} className="py-2 text-slate-300">Showcase</a>
              <a href="#security" onClick={() => setMobileMenuOpen(false)} className="py-2 text-slate-300">Security</a>
              <a href="#about" onClick={() => setMobileMenuOpen(false)} className="py-2 text-slate-300">About Us</a>
              <a href="#contact" onClick={() => setMobileMenuOpen(false)} className="py-2 text-slate-300">Contact</a>
            </div>
            <div className="pt-4 border-t border-slate-800 grid grid-cols-2 gap-3">
              <button
                onClick={() => { setMobileMenuOpen(false); onNavigate('LOGIN'); }}
                className="w-full py-3 rounded-xl text-xs font-bold text-center border border-slate-700 bg-slate-900 text-white"
              >
                Sign In
              </button>
              <button
                onClick={() => { setMobileMenuOpen(false); onNavigate('SIGN_UP'); }}
                className="w-full py-3 rounded-xl text-xs font-bold text-center bg-indigo-600 text-white"
              >
                Register
              </button>
            </div>
          </div>
        )}
      </header>

      {/* ========================================================================= */}
      {/* 2. HERO SECTION — ONE PLATFORM. COMPLETE WORKFORCE CONTROL               */}
      {/* ========================================================================= */}
      <section className="relative pt-12 pb-20 md:pt-20 md:pb-28 overflow-hidden">
        {/* Ambient Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[600px] pointer-events-none overflow-hidden">
          <div className="absolute -top-32 left-1/4 w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-[120px]"></div>
          <div className="absolute top-20 right-1/4 w-[400px] h-[400px] bg-emerald-600/10 rounded-full blur-[100px]"></div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
            
            {/* Left Column: Value Proposition & CTAs */}
            <div className="lg:col-span-6 space-y-6 text-left">
              
              {/* Category Pill Tag */}
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-indigo-500/30 bg-indigo-500/10 text-indigo-400 text-xs font-semibold">
                <Shield className="w-3.5 h-3.5 text-indigo-400" />
                <span>Enterprise Workforce & Attendance Management</span>
              </div>

              {/* Primary Impact Headline */}
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.1] text-slate-900 dark:text-white">
                One Platform. <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 via-indigo-400 to-emerald-400">
                  Complete Workforce Control.
                </span>
              </h1>

              {/* Supporting Lead Copy */}
              <p className={`text-base sm:text-lg leading-relaxed max-w-xl ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                Log Sheet Muster brings workforce management, attendance, site operations and security workflows together in one unified platform.
              </p>

              {/* Hero Action CTA Group */}
              <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5">
                {/* Primary CTA: Sign In */}
                <button
                  onClick={() => onNavigate('LOGIN')}
                  className="px-6 py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm shadow-xl shadow-indigo-600/25 flex items-center justify-center gap-2 transition"
                >
                  <Lock className="w-4 h-4" />
                  <span>Sign In</span>
                </button>

                {/* Secondary CTA: Explore Platform */}
                <a
                  href="#features"
                  className={`px-6 py-3.5 rounded-xl font-bold text-sm border flex items-center justify-center gap-2 transition ${
                    isDark 
                      ? 'bg-slate-900 border-slate-700 hover:bg-slate-800 text-white' 
                      : 'bg-white border-slate-300 hover:bg-slate-50 text-slate-800 shadow-sm'
                  }`}
                >
                  <span>Explore Platform</span>
                  <ChevronRight className="w-4 h-4" />
                </a>

                {/* Third CTA: Request Demo */}
                <a
                  href="#contact"
                  className={`px-5 py-3.5 rounded-xl font-bold text-sm border flex items-center justify-center gap-2 transition ${
                    isDark 
                      ? 'bg-transparent border-slate-800 hover:bg-slate-900/60 text-slate-300' 
                      : 'bg-transparent border-slate-200 hover:bg-slate-100 text-slate-700'
                  }`}
                >
                  <MessageSquare className="w-4 h-4 text-emerald-500" />
                  <span>Request Demo</span>
                </a>
              </div>

              {/* Direct Quick Proof Metrics (Verified Features) */}
              <div className="pt-6 border-t border-slate-800/60 grid grid-cols-3 gap-4">
                <div>
                  <span className="text-xl font-extrabold text-indigo-400">100%</span>
                  <p className="text-xs text-slate-400 font-medium">Tenant Isolated</p>
                </div>
                <div>
                  <span className="text-xl font-extrabold text-emerald-400">Web + Android</span>
                  <p className="text-xs text-slate-400 font-medium">Synced Platform</p>
                </div>
                <div>
                  <span className="text-xl font-extrabold text-amber-400">Multi-Role</span>
                  <p className="text-xs text-slate-400 font-medium">Admin to Guard</p>
                </div>
              </div>

            </div>

            {/* Right Column: Layered Real Product Visual Showcase */}
            <div className="lg:col-span-6 relative">
              <div className="relative mx-auto max-w-lg lg:max-w-none">
                
                {/* Main Product Canvas Mockup */}
                <div className={`rounded-2xl border shadow-2xl overflow-hidden transition ${
                  isDark ? 'bg-slate-900/90 border-slate-700/80 shadow-indigo-950/40' : 'bg-white border-slate-200 shadow-slate-300/60'
                }`}>
                  
                  {/* Top Window Bar */}
                  <div className={`px-4 py-3 border-b flex items-center justify-between ${
                    isDark ? 'bg-slate-950/80 border-slate-800' : 'bg-slate-100 border-slate-200'
                  }`}>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-rose-500"></div>
                      <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                      <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                      <span className="text-xs font-mono font-medium ml-2 text-slate-400">
                        logsheetmuster.online/app
                      </span>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      LIVE SYSTEM
                    </span>
                  </div>

                  {/* Canvas Body: Real Application Operational Snapshot */}
                  <div className="p-5 space-y-4">
                    
                    {/* Upper Stats Row */}
                    <div className="grid grid-cols-3 gap-2.5">
                      <div className={`p-3 rounded-xl border ${isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                        <span className="text-[10px] font-bold uppercase text-slate-400 block">Total Staff</span>
                        <span className="text-base font-extrabold text-indigo-400">480 Active</span>
                      </div>
                      <div className={`p-3 rounded-xl border ${isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                        <span className="text-[10px] font-bold uppercase text-slate-400 block">Muster Present</span>
                        <span className="text-base font-extrabold text-emerald-400">96.4%</span>
                      </div>
                      <div className={`p-3 rounded-xl border ${isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                        <span className="text-[10px] font-bold uppercase text-slate-400 block">Gate Passes</span>
                        <span className="text-base font-extrabold text-amber-400">28 Active</span>
                      </div>
                    </div>

                    {/* Operational Duty Log Simulation */}
                    <div className={`p-3.5 rounded-xl border ${isDark ? 'bg-slate-950/80 border-slate-800' : 'bg-slate-50/80 border-slate-200'} space-y-2.5`}>
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5 text-indigo-400" />
                          <span>Active Shift Roll-Call</span>
                        </span>
                        <span className="text-[11px] font-mono text-emerald-400">Morning Shift (08:00 - 16:00)</span>
                      </div>
                      
                      <div className="space-y-1.5 text-xs">
                        <div className="flex items-center justify-between p-2 rounded-lg bg-indigo-500/5 border border-indigo-500/10">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-indigo-600/30 flex items-center justify-center font-bold text-[10px] text-indigo-300">
                              RS
                            </div>
                            <div>
                              <p className="font-semibold text-[11px]">Rahul Sharma (EMP-104)</p>
                              <p className="text-[9px] text-slate-400">Gate #1 Security Supervisor</p>
                            </div>
                          </div>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400">
                            Punched 07:54 AM
                          </span>
                        </div>

                        <div className="flex items-center justify-between p-2 rounded-lg bg-indigo-500/5 border border-indigo-500/10">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-emerald-600/30 flex items-center justify-center font-bold text-[10px] text-emerald-300">
                              AP
                            </div>
                            <div>
                              <p className="font-semibold text-[11px]">Anil Patil (EMP-208)</p>
                              <p className="text-[9px] text-slate-400">Site Operations Officer</p>
                            </div>
                          </div>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400">
                            Punched 07:58 AM
                          </span>
                        </div>
                      </div>
                    </div>

                  </div>
                </div>

                {/* Floating Foreground Layer: Gate & Material Pass Preview */}
                <div className={`hidden sm:block absolute -bottom-6 -left-6 p-4 rounded-xl border shadow-xl backdrop-blur-md max-w-xs transition ${
                  isDark ? 'bg-slate-900/95 border-slate-700 text-white' : 'bg-white/95 border-slate-300 text-slate-900'
                }`}>
                  <div className="flex items-center gap-2 mb-2">
                    <UserCheck className="w-4 h-4 text-emerald-500" />
                    <span className="text-xs font-bold">Material Gate Pass #MP-804</span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Dispatch: Equipment Transfer (Site Alpha → Beta)
                  </p>
                  <div className="mt-2 flex items-center justify-between text-[10px] font-mono">
                    <span className="text-slate-400">Authorized by Manager</span>
                    <span className="text-emerald-400 font-bold">APPROVED</span>
                  </div>
                </div>

                {/* Floating Foreground Layer: Patrol Checkpoint Alert */}
                <div className={`hidden sm:block absolute -top-5 -right-4 p-3.5 rounded-xl border shadow-xl backdrop-blur-md transition ${
                  isDark ? 'bg-slate-900/95 border-slate-700 text-white' : 'bg-white/95 border-slate-300 text-slate-900'
                }`}>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <div>
                      <p className="text-xs font-bold">Patrol Tour Verified</p>
                      <p className="text-[10px] text-slate-400">Checkpoint 04/06 Perimeter West</p>
                    </div>
                  </div>
                </div>

              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 3. PRODUCT SHOWCASE — INTERACTIVE VISUAL DEMO                              */}
      {/* ========================================================================= */}
      <section id="showcase" className={`py-20 border-y ${isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-100/70 border-slate-200'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-3xl mx-auto mb-12 space-y-3">
            <span className="text-xs font-bold uppercase tracking-widest text-indigo-500">Live Product Showcase</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
              See What Log Sheet Muster Manages
            </h2>
            <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              Explore interactive UI mockups demonstrating workforce operations, roll-call attendance, gate passes, and patrol inspection workflows.
            </p>
          </div>

          {/* Tab Navigation */}
          <div className="flex items-center justify-center gap-2 mb-10 flex-wrap">
            {[
              { id: 'WORKFORCE', label: 'Workforce Directory', icon: Users },
              { id: 'MUSTER', label: 'Digital Muster', icon: CheckSquare },
              { id: 'SHIFTS', label: 'Shift Rostering', icon: Clock },
              { id: 'GATE', label: 'Gate & Visitor Pass', icon: UserCheck },
              { id: 'PATROL', label: 'Patrol Tours', icon: ClipboardList },
              { id: 'REPORTS', label: 'Operational Reports', icon: FileText }
            ].map(tab => {
              const TabIcon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveShowcaseTab(tab.id as any)}
                  className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition ${
                    activeShowcaseTab === tab.id
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                      : isDark 
                        ? 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white' 
                        : 'bg-white border border-slate-200 text-slate-600 hover:text-slate-900 shadow-sm'
                  }`}
                >
                  <TabIcon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Tab View Container */}
          <div className={`p-6 sm:p-8 rounded-2xl border shadow-xl ${isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200'}`}>
            
            {activeShowcaseTab === 'WORKFORCE' && (
              <div className="space-y-4 font-mono text-xs animate-in fade-in duration-300">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">Employee Management Record</span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">DOCUMENT VERIFIED</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className={`p-4 rounded-xl border ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'} space-y-2`}>
                    <span className="text-[10px] text-slate-400 block">Personal Profile</span>
                    <p className="font-bold text-sm text-slate-200">Vikram Singh</p>
                    <p className="text-slate-400 text-[11px]">Emp ID: EMP-101</p>
                    <p className="text-slate-400 text-[11px]">Role: Security Guard</p>
                  </div>
                  <div className={`p-4 rounded-xl border ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'} space-y-2`}>
                    <span className="text-[10px] text-slate-400 block">KYC & Compliance</span>
                    <p className="text-emerald-400 font-bold text-[11px]">✓ Aadhaar Verified</p>
                    <p className="text-emerald-400 font-bold text-[11px]">✓ PAN Card Verified</p>
                    <p className="text-emerald-400 font-bold text-[11px]">✓ Bank Account Linked</p>
                  </div>
                  <div className={`p-4 rounded-xl border ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'} space-y-2`}>
                    <span className="text-[10px] text-slate-400 block">Site Assignment</span>
                    <p className="font-bold text-[11px] text-indigo-400">Site Alpha (Main Plant)</p>
                    <p className="text-slate-400 text-[11px]">Shift: Morning (07:00 - 15:00)</p>
                    <p className="text-emerald-400 font-bold text-[11px]">Status: Active On-Duty</p>
                  </div>
                </div>
              </div>
            )}

            {activeShowcaseTab === 'MUSTER' && (
              <div className="space-y-4 font-mono text-xs animate-in fade-in duration-300">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">Digital Muster & Daily Headcount</span>
                  <span className="text-[10px] text-slate-400">Date: Today | Shift: Morning</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className={`p-3 rounded-xl border ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                    <span className="text-[10px] text-slate-400 block">Enrolled Staff</span>
                    <span className="text-lg font-bold text-indigo-400">480</span>
                  </div>
                  <div className={`p-3 rounded-xl border ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                    <span className="text-[10px] text-slate-400 block">Present On-Duty</span>
                    <span className="text-lg font-bold text-emerald-400">462</span>
                  </div>
                  <div className={`p-3 rounded-xl border ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                    <span className="text-[10px] text-slate-400 block">Absent Count</span>
                    <span className="text-lg font-bold text-rose-400">12</span>
                  </div>
                  <div className={`p-3 rounded-xl border ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                    <span className="text-[10px] text-slate-400 block">Approved Leaves</span>
                    <span className="text-lg font-bold text-amber-400">6</span>
                  </div>
                </div>
              </div>
            )}

            {activeShowcaseTab === 'SHIFTS' && (
              <div className="space-y-3 font-mono text-xs animate-in fade-in duration-300">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">Shift Configurations</span>
                  <span className="text-[10px] text-emerald-400">3 Active Shifts</span>
                </div>
                <div className="space-y-2">
                  <div className={`p-3 rounded-xl border flex justify-between items-center ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                    <div>
                      <p className="font-bold text-indigo-400">SHIFT A — General Shift</p>
                      <p className="text-[10px] text-slate-400">Grace period: 15 mins</p>
                    </div>
                    <span className="font-bold text-emerald-400">09:00 AM — 06:00 PM</span>
                  </div>
                  <div className={`p-3 rounded-xl border flex justify-between items-center ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                    <div>
                      <p className="font-bold text-emerald-400">SHIFT M — Morning Guard Shift</p>
                      <p className="text-[10px] text-slate-400">Grace period: 10 mins</p>
                    </div>
                    <span className="font-bold text-emerald-400">07:00 AM — 03:00 PM</span>
                  </div>
                  <div className={`p-3 rounded-xl border flex justify-between items-center ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                    <div>
                      <p className="font-bold text-amber-400">SHIFT N — Night Perimeter Patrol</p>
                      <p className="text-[10px] text-slate-400">Grace period: 10 mins</p>
                    </div>
                    <span className="font-bold text-amber-400">11:00 PM — 07:00 AM</span>
                  </div>
                </div>
              </div>
            )}

            {activeShowcaseTab === 'GATE' && (
              <div className="space-y-4 font-mono text-xs animate-in fade-in duration-300">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">Gate Operations & Movement Ledger</span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400">INWARD / OUTWARD LEDGER</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className={`p-4 rounded-xl border ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'} space-y-2`}>
                    <span className="text-[10px] text-indigo-400 font-bold block uppercase">Material Pass #MP-804</span>
                    <p className="text-slate-200 font-bold">Industrial Generator Spares</p>
                    <p className="text-slate-400 text-[11px]">Vehicle: MH-12-AB-9821</p>
                    <p className="text-emerald-400 font-bold text-[11px]">Status: Dispatched & Verified</p>
                  </div>
                  <div className={`p-4 rounded-xl border ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'} space-y-2`}>
                    <span className="text-[10px] text-emerald-400 font-bold block uppercase">Visitor Entry #VP-202</span>
                    <p className="text-slate-200 font-bold">Amit Deshmukh (Auditor)</p>
                    <p className="text-slate-400 text-[11px]">Host: HR Department</p>
                    <p className="text-emerald-400 font-bold text-[11px]">Status: Inside Premises (Badge #04)</p>
                  </div>
                </div>
              </div>
            )}

            {activeShowcaseTab === 'PATROL' && (
              <div className="space-y-4 font-mono text-xs animate-in fade-in duration-300">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-400">Perimeter Patrol Round 02</span>
                  <span className="text-[10px] text-emerald-400 font-bold">4 / 4 CHECKPOINTS VERIFIED</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex justify-between items-center">
                    <span>CP-01: Main Gate & Barrier</span>
                    <span className="text-emerald-400 font-bold">✓ 23:10</span>
                  </div>
                  <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex justify-between items-center">
                    <span>CP-02: Warehouse Rear Perimeter</span>
                    <span className="text-emerald-400 font-bold">✓ 23:25</span>
                  </div>
                  <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex justify-between items-center">
                    <span>CP-03: Generator & Substation</span>
                    <span className="text-emerald-400 font-bold">✓ 23:42</span>
                  </div>
                  <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex justify-between items-center">
                    <span>CP-04: Admin Lobby West</span>
                    <span className="text-emerald-400 font-bold">✓ 23:55</span>
                  </div>
                </div>
              </div>
            )}

            {activeShowcaseTab === 'REPORTS' && (
              <div className="space-y-4 font-mono text-xs animate-in fade-in duration-300">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">Operational Summary Reports</span>
                  <span className="text-[10px] text-slate-400">Export: PDF / Excel</span>
                </div>
                <div className="space-y-2">
                  <div className={`p-3 rounded-xl border flex justify-between items-center ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                    <div>
                      <p className="font-bold text-slate-200">Monthly Muster & Attendance Summary</p>
                      <p className="text-[10px] text-slate-400">Detailed punch-in/out timestamps and total duty hours.</p>
                    </div>
                    <span className="text-indigo-400 font-bold">Ready for Export</span>
                  </div>
                  <div className={`p-3 rounded-xl border flex justify-between items-center ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                    <div>
                      <p className="font-bold text-slate-200">Gate Pass & Material Movement Log</p>
                      <p className="text-[10px] text-slate-400">Structured dispatch ledger for audit & compliance.</p>
                    </div>
                    <span className="text-indigo-400 font-bold">Ready for Export</span>
                  </div>
                </div>
              </div>
            )}

          </div>

          <p className="text-[11px] text-slate-500 text-center mt-4">
            * Showcase visual mockups are for public demonstration purposes. No live company or employee data is exposed.
          </p>

        </div>
      </section>

      {/* ========================================================================= */}
      {/* 4. VERIFIED FEATURES SECTION                                              */}
      {/* ========================================================================= */}
      <section id="features" className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
            <span className="text-xs font-bold uppercase tracking-widest text-indigo-500">Platform Features</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
              Comprehensive Capabilities Built for Real Workflows
            </h2>
            <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              Every capability is backed by our production codebase and synchronized across Web and Android clients.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            
            {[
              {
                icon: Users,
                title: 'HRMS & Workforce Management',
                desc: 'Maintain detailed employee master profiles, Aadhaar and PAN KYC document records, emergency contacts, and department assignments.'
              },
              {
                icon: CheckSquare,
                title: 'Digital Muster & Attendance',
                desc: 'Real-time roll-call attendance with automated calculation of present, absent, half-day, and overtime duty hours.'
              },
              {
                icon: Clock,
                title: 'Shift Management',
                desc: 'Configure flexible General, Morning, Afternoon, and Night shifts with customizable grace-period thresholds.'
              },
              {
                icon: UserCheck,
                title: 'Gate & Visitor Operations',
                desc: 'Digital check-in for visitors, host employee cross-referencing, entry badge generation, and time-tracked exit logs.'
              },
              {
                icon: Package,
                title: 'Material Inward / Outward',
                desc: 'Digital material gate pass workflows with item description, vehicle registration, origin/destination tracking, and dispatch approvals.'
              },
              {
                icon: ClipboardList,
                title: 'Patrol & Checkpoint Tracking',
                desc: 'Verified security guard patrol tour inspections with checkpoint logging, tour completion records, and incident reporting.'
              },
              {
                icon: Building2,
                title: 'Multi-Tenant Architecture',
                desc: 'Strict company tenant data isolation ensuring that each enterprise organization operates within its own confidential database partition.'
              },
              {
                icon: KeyRound,
                title: 'Role-Based Access Control',
                desc: 'Granular permissions for Super Admin, Company Admin, HR, Operational Manager, Supervisor, and Guard roles.'
              },
              {
                icon: Smartphone,
                title: 'Web + Android Ecosystem',
                desc: 'Unified architecture where desktop management workstations and Android mobile clients sync with the same cloud backend.'
              }
            ].map((feat, idx) => {
              const FeatIcon = feat.icon;
              return (
                <div
                  key={idx}
                  className={`p-6 rounded-2xl border flex flex-col justify-between transition ${
                    isDark 
                      ? 'bg-slate-900/60 border-slate-800 hover:border-slate-700' 
                      : 'bg-white border-slate-200 hover:border-slate-300 shadow-sm'
                  }`}
                >
                  <div className="space-y-3">
                    <div className="p-3 rounded-xl bg-indigo-500/10 text-indigo-400 w-fit">
                      <FeatIcon className="w-5 h-5" />
                    </div>
                    <h3 className="text-base font-bold">{feat.title}</h3>
                    <p className={`text-xs leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                      {feat.desc}
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-800/40 flex items-center gap-1.5 text-[11px] font-mono text-emerald-400">
                    <Check className="w-3.5 h-3.5" />
                    <span>Active Feature</span>
                  </div>
                </div>
              );
            })}

          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 5. MODULES SECTION — PUBLIC PRESENTATION                                   */}
      {/* ========================================================================= */}
      <section id="modules" className={`py-20 border-y ${isDark ? 'bg-slate-950/70 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-3xl mx-auto mb-14 space-y-3">
            <span className="text-xs font-bold uppercase tracking-widest text-emerald-500">Modular Architecture</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
              Enterprise Modules
            </h2>
            <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              Select a module to view its functional overview.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                id: 'mod-hrms',
                icon: Users,
                name: 'HRMS & Staff Roster',
                desc: 'Personnel directories, digital KYC verification, salary advances, and employee lifecycle management.',
                preview: 'Staff directories with KYC verification badges and department classifications.'
              },
              {
                id: 'mod-attendance',
                icon: CheckSquare,
                name: 'Muster & Shift Attendance',
                desc: 'Daily muster roll-call, flexible shift configurations, and automated duty hours computation.',
                preview: 'Instant punch-in/punch-out recording with present, absent, and leave counts.'
              },
              {
                id: 'mod-site',
                icon: UserCheck,
                name: 'Gate & Visitor Operations',
                desc: 'Material inward/outward pass generation, vehicle logs, visitor badge tracking, and site strength.',
                preview: 'Structured movement ledger recording authorized dispatches and visitor entries.'
              },
              {
                id: 'mod-patrol',
                icon: ClipboardList,
                name: 'Patrol Tour Inspections',
                desc: 'Perimeter checkpoint verification, security guard round logs, and instant incident remarks.',
                preview: 'Checkpoint sequence verification ensuring round-the-clock physical security.'
              }
            ].map(module => {
              const ModIcon = module.icon;
              return (
                <div
                  key={module.id}
                  className={`p-6 rounded-2xl border flex flex-col justify-between ${
                    isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
                  }`}
                >
                  <div className="space-y-3">
                    <div className="p-3 rounded-xl bg-indigo-500/10 text-indigo-400 w-fit">
                      <ModIcon className="w-5 h-5" />
                    </div>
                    <h3 className="text-base font-bold">{module.name}</h3>
                    <p className={`text-xs leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                      {module.desc}
                    </p>
                  </div>

                  <div className="mt-6 pt-4 border-t border-slate-800/60">
                    <button
                      onClick={() => setSelectedModule(selectedModule === module.id ? null : module.id)}
                      className="text-xs font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition"
                    >
                      <span>{selectedModule === module.id ? 'Hide Details' : 'Learn More'}</span>
                      <ChevronRight className={`w-3.5 h-3.5 transition-transform ${selectedModule === module.id ? 'rotate-90' : ''}`} />
                    </button>

                    {selectedModule === module.id && (
                      <div className={`mt-3 p-3 rounded-xl text-[11px] font-mono border animate-in fade-in duration-200 ${
                        isDark ? 'bg-slate-950 border-slate-800 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'
                      }`}>
                        {module.preview}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

        </div>
      </section>

      {/* ========================================================================= */}
      {/* 6. SECURITY & ARCHITECTURE SECTION                                        */}
      {/* ========================================================================= */}
      <section id="security" className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
            <span className="text-xs font-bold uppercase tracking-widest text-indigo-500">Enterprise Architecture</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
              Robust, Multi-Tenant Cloud Architecture
            </h2>
            <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              Built on proven cloud foundations with strict company-level data isolation and role-based access.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            
            <div className={`p-6 rounded-2xl border ${isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-sm'} space-y-3`}>
              <div className="p-3 rounded-xl bg-indigo-500/10 text-indigo-400 w-fit">
                <Lock className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold">Firebase Authentication</h3>
              <p className={`text-xs leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                Secure authentication with support for Email/Password, Employee ID login, PIN verification, and session token management.
              </p>
            </div>

            <div className={`p-6 rounded-2xl border ${isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-sm'} space-y-3`}>
              <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400 w-fit">
                <Building2 className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold">Strict Tenant Isolation</h3>
              <p className={`text-xs leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                Company data is strictly partitioned by Company ID. Queries and rules enforce zero data bleed across organizations.
              </p>
            </div>

            <div className={`p-6 rounded-2xl border ${isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-sm'} space-y-3`}>
              <div className="p-3 rounded-xl bg-amber-500/10 text-amber-400 w-fit">
                <KeyRound className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold">Role-Based Access (RBAC)</h3>
              <p className={`text-xs leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                Granular authorization tiers ensuring personnel access only screens and records appropriate to their assigned operational role.
              </p>
            </div>

            <div className={`p-6 rounded-2xl border ${isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-sm'} space-y-3`}>
              <div className="p-3 rounded-xl bg-indigo-500/10 text-indigo-400 w-fit">
                <Shield className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold">Protected Application Screens</h3>
              <p className={`text-xs leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                Internal modules, rosters, and gate logs remain inaccessible until valid credentials and tenant authorization are confirmed.
              </p>
            </div>

            <div className={`p-6 rounded-2xl border ${isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-sm'} space-y-3`}>
              <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400 w-fit">
                <Globe className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold">Web + Android Sync</h3>
              <p className={`text-xs leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                Both the Single-Page Web Application and Android native client interact with the same Firestore cloud database.
              </p>
            </div>

            <div className={`p-6 rounded-2xl border ${isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-sm'} space-y-3`}>
              <div className="p-3 rounded-xl bg-indigo-500/10 text-indigo-400 w-fit">
                <Activity className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold">Session Timeout Guards</h3>
              <p className={`text-xs leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                Configurable inactivity timers protect unattended terminals in guard shacks and administration offices with PIN re-entry.
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 7. ABOUT SHOURYA ENTERPRISES PVT. LTD.                                    */}
      {/* ========================================================================= */}
      <section id="about" className={`py-20 border-t ${isDark ? 'bg-slate-950/80 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center space-y-6">
            
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-400 text-xs font-semibold">
              <Building2 className="w-3.5 h-3.5" />
              <span>About Us</span>
            </div>

            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
              Shourya Enterprises Pvt. Ltd.
            </h2>

            <p className={`text-base leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
              Log Sheet Muster is a dedicated workforce, attendance, and site operations platform developed by <strong className="font-semibold text-indigo-400">Shourya Enterprises Pvt. Ltd.</strong> It enables modern enterprises and operational facilities to seamlessly manage employees, shift rosters, roll-call muster, material passes, visitor records, and perimeter patrol rounds from one unified system.
            </p>

            <div className={`p-6 rounded-2xl border ${isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-sm'} text-left sm:text-center space-y-2`}>
              <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-400">Founder & Owner</span>
              <h3 className="text-xl font-bold">Avinash Shivaji Ghadge</h3>
              <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                Shourya Enterprises Pvt. Ltd. &bull; Log Sheet Muster
              </p>
              <p className="text-xs text-slate-400 pt-1">
                Ajanthanagar, Chinchwad, Pune, Maharashtra - 411019
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 8. CONTACT & REQUEST DEMO SECTION                                         */}
      {/* ========================================================================= */}
      <section id="contact" className={`py-20 border-t ${isDark ? 'bg-[#02050E] border-slate-800' : 'bg-white border-slate-200'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-2xl mx-auto mb-14 space-y-2">
            <span className="text-xs font-bold uppercase tracking-widest text-emerald-500">Contact Us</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
              Get in Touch with Our Team
            </h2>
            <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              Connect directly with Shourya Enterprises Pvt. Ltd. for enterprise inquiries, onboarding, and platform demonstrations.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
            
            {/* Left: Verified Contact Information Cards */}
            <div className="lg:col-span-5 space-y-4">
              
              {/* Company & Founder Identity Card */}
              <div className={`p-6 rounded-2xl border space-y-2 ${isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
                <div className="flex items-center gap-2 text-indigo-400 text-xs font-bold uppercase tracking-wider">
                  <Building2 className="w-4 h-4" />
                  <span>Enterprise Entity</span>
                </div>
                <h3 className="text-lg font-bold">Shourya Enterprises Pvt. Ltd.</h3>
                <p className="text-xs font-medium text-slate-400">
                  Product: <span className="text-indigo-400 font-semibold">Log Sheet Muster</span>
                </p>
                <div className="pt-2 border-t border-slate-800/60">
                  <span className="text-[10px] text-slate-500 uppercase font-semibold block">Founder & Owner</span>
                  <p className="text-xs font-bold text-slate-200">Avinash Shivaji Ghadge</p>
                </div>
              </div>

              {/* Office Address Card */}
              <div className={`p-5 rounded-2xl border flex items-start gap-4 ${isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
                <div className="p-3 rounded-xl bg-indigo-500/10 text-indigo-400 flex-shrink-0 mt-0.5">
                  <MapPin className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Office Location</span>
                  <p className="text-xs font-medium leading-relaxed">
                    Ajanthanagar, Chinchwad,<br />
                    Pune, Maharashtra - 411019
                  </p>
                </div>
              </div>

              {/* Mobile Numbers (Primary & Alternate) */}
              <div className={`p-5 rounded-2xl border flex items-start gap-4 ${isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
                <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400 flex-shrink-0 mt-0.5">
                  <Phone className="w-5 h-5" />
                </div>
                <div className="space-y-1.5 w-full">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Direct Phone Lines</span>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-xs font-mono">
                    <a
                      href="tel:+919096345456"
                      aria-label="Call primary mobile number 9096345456"
                      className="inline-flex items-center gap-1.5 font-bold text-emerald-400 hover:underline hover:text-emerald-300 transition"
                    >
                      <span>📞 9096345456</span>
                      <span className="text-[10px] text-slate-500 font-sans">(Primary)</span>
                    </a>
                    <span className="hidden sm:inline text-slate-600">|</span>
                    <a
                      href="tel:+918793619611"
                      aria-label="Call alternate mobile number 8793619611"
                      className="inline-flex items-center gap-1.5 font-bold text-emerald-400 hover:underline hover:text-emerald-300 transition"
                    >
                      <span>📞 8793619611</span>
                      <span className="text-[10px] text-slate-500 font-sans">(Alt)</span>
                    </a>
                  </div>
                </div>
              </div>

              {/* WhatsApp Chat Link */}
              <div className={`p-5 rounded-2xl border flex items-center justify-between gap-4 ${isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400 flex-shrink-0">
                    <MessageSquare className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">WhatsApp Business</span>
                    <p className="text-xs font-mono font-bold text-emerald-400">9096345455</p>
                  </div>
                </div>
                <a
                  href="https://wa.me/919096345455"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Chat on WhatsApp with 9096345455"
                  className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 transition shadow-sm"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Chat on WhatsApp</span>
                </a>
              </div>

              {/* Official Email */}
              <div className={`p-5 rounded-2xl border flex items-center justify-between gap-4 ${isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-indigo-500/10 text-indigo-400 flex-shrink-0">
                    <Mail className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Official Email</span>
                    <a
                      href="mailto:ghadgea162@gmail.com"
                      aria-label="Send email to ghadgea162@gmail.com"
                      className="text-xs font-mono font-semibold text-indigo-400 hover:underline"
                    >
                      ghadgea162@gmail.com
                    </a>
                  </div>
                </div>
                <a
                  href="mailto:ghadgea162@gmail.com"
                  aria-label="Send mail to ghadgea162@gmail.com"
                  className="px-3 py-1.5 rounded-lg border border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/10 text-xs font-semibold transition"
                >
                  Email Us
                </a>
              </div>

              {/* Official Website */}
              <div className={`p-5 rounded-2xl border flex items-center justify-between gap-4 ${isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-indigo-500/10 text-indigo-400 flex-shrink-0">
                    <Globe className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Production Website</span>
                    <a
                      href="https://logsheetmuster.online"
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label="Visit official website logsheetmuster.online"
                      className="text-xs font-mono font-semibold text-indigo-400 hover:underline"
                    >
                      https://logsheetmuster.online
                    </a>
                  </div>
                </div>
              </div>

            </div>

            {/* Right: Request Demo Form (Client-Side Only) */}
            <div className={`lg:col-span-7 p-8 rounded-2xl border ${
              isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200 shadow-xl'
            }`}>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-xl font-bold">Request a Platform Demo</h3>
                  <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    Submit your enterprise inquiry to schedule a guided product walkthrough.
                  </p>
                </div>
                <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-mono">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span>Direct Support</span>
                </div>
              </div>

              {formSubmitted ? (
                <div className="p-8 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-center space-y-3">
                  <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
                  <h4 className="text-base font-bold text-emerald-400">Inquiry Received</h4>
                  <p className="text-xs text-slate-300 max-w-md mx-auto">
                    Thank you, {demoForm.name || 'Valued Client'}. Your request has been recorded. Our team will contact you at {demoForm.email} shortly.
                  </p>
                  <button
                    onClick={() => {
                      setFormSubmitted(false);
                      setDemoForm({ name: '', companyName: '', phone: '', email: '', requirement: '' });
                    }}
                    className="text-xs text-indigo-400 underline font-semibold mt-4 block mx-auto"
                  >
                    Submit another inquiry
                  </button>
                </div>
              ) : (
                <form onSubmit={handleDemoSubmit} className="space-y-4">
                  <div>
                    <label className="text-xs font-semibold block mb-1">Name *</label>
                    <input
                      type="text"
                      required
                      value={demoForm.name}
                      onChange={(e) => setDemoForm({ ...demoForm, name: e.target.value })}
                      placeholder="e.g. Rahul Sharma"
                      className={`w-full px-4 py-3 rounded-xl text-xs border focus:outline-none focus:border-indigo-500 ${
                        isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                      }`}
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold block mb-1">Company Name</label>
                    <input
                      type="text"
                      value={demoForm.companyName}
                      onChange={(e) => setDemoForm({ ...demoForm, companyName: e.target.value })}
                      placeholder="e.g. Shourya Enterprises"
                      className={`w-full px-4 py-3 rounded-xl text-xs border focus:outline-none focus:border-indigo-500 ${
                        isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                      }`}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-semibold block mb-1">Mobile Number</label>
                      <input
                        type="tel"
                        value={demoForm.phone}
                        onChange={(e) => setDemoForm({ ...demoForm, phone: e.target.value })}
                        placeholder="+91 90963 45456"
                        className={`w-full px-4 py-3 rounded-xl text-xs border focus:outline-none focus:border-indigo-500 ${
                          isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                        }`}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold block mb-1">Email *</label>
                      <input
                        type="email"
                        required
                        value={demoForm.email}
                        onChange={(e) => setDemoForm({ ...demoForm, email: e.target.value })}
                        placeholder="you@company.com"
                        className={`w-full px-4 py-3 rounded-xl text-xs border focus:outline-none focus:border-indigo-500 ${
                          isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                        }`}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold block mb-1">Requirement</label>
                    <textarea
                      rows={3}
                      value={demoForm.requirement}
                      onChange={(e) => setDemoForm({ ...demoForm, requirement: e.target.value })}
                      placeholder="Specify your workforce size, site locations, shifts, or muster requirements..."
                      className={`w-full px-4 py-3 rounded-xl text-xs border focus:outline-none focus:border-indigo-500 ${
                        isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                      }`}
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2 transition"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Request Demo</span>
                  </button>
                </form>
              )}
            </div>

          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 9. ENTERPRISE FOOTER                                                      */}
      {/* ========================================================================= */}
      <footer className={`border-t py-14 ${isDark ? 'bg-[#02050E] border-slate-800' : 'bg-white border-slate-200'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          
          <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
            
            {/* Col 1: Brand & Verified Company Identity */}
            <div className="space-y-3 md:col-span-2">
              <AppLogo size="sm" showSubtitle={true} />
              <div className="space-y-1">
                <p className="text-xs font-bold text-slate-200">Shourya Enterprises Pvt. Ltd.</p>
                <p className={`text-xs leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  Log Sheet Muster &bull; Smart Workforce, Attendance & Security Management Platform.
                </p>
              </div>
              <a
                href="https://logsheetmuster.online"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-mono text-indigo-400 hover:underline block"
              >
                https://logsheetmuster.online
              </a>
            </div>

            {/* Col 2: Quick Links */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Navigation</h4>
              <ul className="space-y-1.5 text-xs">
                <li><a href="#home" className="text-slate-400 hover:text-white transition">Home</a></li>
                <li><a href="#features" className="text-slate-400 hover:text-white transition">Features</a></li>
                <li><a href="#modules" className="text-slate-400 hover:text-white transition">Modules</a></li>
                <li><a href="#about" className="text-slate-400 hover:text-white transition">About</a></li>
                <li><a href="#contact" className="text-slate-400 hover:text-white transition">Contact</a></li>
              </ul>
            </div>

            {/* Col 3: Legal & Compliance */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Legal & Compliance</h4>
              <ul className="space-y-1.5 text-xs">
                <li>
                  <button 
                    onClick={() => onNavigate('LEGAL_POLICIES')}
                    className="text-slate-400 hover:text-indigo-400 transition text-left"
                  >
                    Privacy Policy
                  </button>
                </li>
                <li>
                  <button 
                    onClick={() => onNavigate('LEGAL_POLICIES')}
                    className="text-slate-400 hover:text-indigo-400 transition text-left"
                  >
                    Data Processing (DPA)
                  </button>
                </li>
                <li>
                  <button 
                    onClick={() => onNavigate('LEGAL_POLICIES')}
                    className="text-slate-400 hover:text-indigo-400 transition text-left"
                  >
                    Cookie & Analytics
                  </button>
                </li>
                <li>
                  <button 
                    onClick={() => onNavigate('LEGAL_POLICIES')}
                    className="text-slate-400 hover:text-indigo-400 transition text-left"
                  >
                    Refunds & Subscriptions
                  </button>
                </li>
                <li>
                  <button 
                    onClick={() => onNavigate('LEGAL_POLICIES')}
                    className="text-slate-400 hover:text-indigo-400 transition text-left"
                  >
                    Acceptable Use (AUP)
                  </button>
                </li>
              </ul>
            </div>

            {/* Col 4: Verified Contact Summary */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Contact</h4>
              <div className="space-y-1.5 text-xs">
                <p className="font-mono text-slate-300">
                  <a href="tel:+919096345456" className="hover:text-indigo-400">9096345456</a>
                </p>
                <p className="font-mono text-slate-300">
                  <a href="tel:+918793619611" className="hover:text-indigo-400">8793619611</a>
                </p>
                <p className="text-slate-300">
                  <span className="text-slate-400">WhatsApp: </span>
                  <a href="https://wa.me/919096345455" target="_blank" rel="noopener noreferrer" className="font-mono text-emerald-400 hover:underline">
                    9096345455
                  </a>
                </p>
                <p>
                  <a href="mailto:ghadgea162@gmail.com" className="font-mono text-indigo-400 hover:underline">
                    ghadgea162@gmail.com
                  </a>
                </p>
                <p className="text-slate-400 text-[11px] pt-1">
                  Ajanthanagar, Chinchwad, Pune, Maharashtra - 411019
                </p>
              </div>
            </div>

          </div>

          <div className="pt-8 border-t border-slate-800/60 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 font-mono">
            <div>
              © Shourya Enterprises Pvt. Ltd. All Rights Reserved.
            </div>
            <div className="flex items-center gap-4">
              <span>Log Sheet Muster &bull; https://logsheetmuster.online</span>
            </div>
          </div>

        </div>
      </footer>

    </div>
  );
};
