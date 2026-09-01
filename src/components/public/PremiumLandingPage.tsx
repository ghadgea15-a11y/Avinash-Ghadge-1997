import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, useScroll, useTransform } from 'motion/react';
import { 
  ArrowRight, ShieldCheck, Users, Activity, Clock, 
  Building2, Lock, LayoutDashboard, ChevronDown, 
  Mail, Phone, CheckCircle2, Menu, X, Sparkles, Send, 
  MapPin, Fingerprint, Database, Zap, ArrowUpRight,
  MonitorSmartphone, Briefcase, BarChart3, Shield
} from 'lucide-react';
import { PhaseAScreen } from '../../types';
import { PremiumHeader } from './PremiumHeader';
import { PremiumFooter } from './PremiumFooter';
import { FirestoreService } from '../../services/firestoreService';
import { RequestDemoModal } from './RequestDemoModal';

export const PremiumLandingPage: React.FC<{ onNavigate: (screen: PhaseAScreen) => void }> = ({ onNavigate }) => {
  const [isDemoModalOpen, setIsDemoModalOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#060B19] text-slate-50 font-sans selection:bg-blue-500/30 selection:text-blue-200 overflow-x-hidden">
      <PremiumHeader onNavigate={onNavigate} onOpenDemo={() => setIsDemoModalOpen(true)} />
      
      <main>
        <HeroSection onNavigate={onNavigate} onOpenDemo={() => setIsDemoModalOpen(true)} />
        <TrustedBySection />
        <ModulesSection />
        <DemoSection onNavigate={onNavigate} />
        <AboutUsSection />
        <SecuritySection />
        <FaqSection />
      </main>

      <PremiumFooter onNavigate={onNavigate} onOpenDemo={() => setIsDemoModalOpen(true)} />
      
      <RequestDemoModal isOpen={isDemoModalOpen} onClose={() => setIsDemoModalOpen(false)} />
    </div>
  );
};

// --- HERO SECTION ---
const HeroSection: React.FC<{ onNavigate: (screen: PhaseAScreen) => void; onOpenDemo: () => void }> = ({ onNavigate, onOpenDemo }) => {
  return (
    <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden">
      {/* Abstract Background Elements */}
      <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-blue-600/10 rounded-full blur-[120px] pointer-events-none translate-x-1/3 -translate-y-1/4"></div>
      <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none -translate-x-1/3 translate-y-1/4"></div>
      
      {/* Background Grid Lines */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHBhdGggZD0iTTAgMGg0MHY0MEgwVjB6bTIwIDIwdjIwaDIwVjIwaC0yMHptMC0yMFYwaDIwdjIwaC0yMHoiIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMiIgZmlsbC1ydWxlPSJldmVub2RkIi8+PC9zdmc+')] opacity-50 pointer-events-none"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-8 items-center">
          
          {/* Left: Content */}
          <div className="flex flex-col items-start text-left">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-900/30 border border-blue-800/50 text-blue-300 font-semibold text-xs mb-6 backdrop-blur-md"
            >
              <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
              All-in-One Workforce & Facility Management Platform
            </motion.div>

            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-5xl sm:text-6xl md:text-7xl font-black tracking-tight text-white leading-[1.1] mb-6"
            >
              Command Your Workforce. Elevate <br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">
                Every Operation.
              </span>
            </motion.h1>
            
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="text-lg sm:text-xl text-slate-400 max-w-xl font-medium leading-relaxed mb-10"
            >
              Log Sheet Muster is a next-generation platform to manage attendance, operations, assets, compliance, payroll, and more — all in one secure system.
            </motion.p>
            
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto"
            >
              <button 
                onClick={() => {
                  document.getElementById('demo')?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-lg font-bold text-base transition-all shadow-[0_0_20px_rgba(79,70,229,0.4)] flex items-center justify-center gap-2"
              >
                Get 3 Month Demo <ArrowRight className="w-5 h-5" />
              </button>
              <button 
                onClick={() => onNavigate('LOGIN')}
                className="px-8 py-4 bg-[#0A1020] hover:bg-[#111A30] text-white border border-slate-700 rounded-lg font-bold text-base transition-all flex items-center justify-center gap-2"
              >
                Login to Web App <ArrowUpRight className="w-5 h-5" />
              </button>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1, delay: 0.8 }}
              className="mt-10 flex items-center gap-6 text-sm font-semibold text-slate-400"
            >
              <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-blue-500"/> Secure</span>
              <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-blue-500"/> Reliable</span>
              <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-blue-500"/> Scalable</span>
            </motion.div>
          </div>

          {/* Right: Abstract UI Composition */}
          <motion.div 
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="relative h-[500px] w-full hidden lg:block perspective-1000"
          >
             {/* Main Dashboard Card */}
             <div className="absolute right-0 top-10 w-[600px] h-[400px] bg-[#0A1020] border border-slate-800 rounded-2xl shadow-2xl overflow-hidden z-10 transform -rotate-2 hover:rotate-0 transition-transform duration-500">
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-[#0B1121]">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded bg-blue-600"></div>
                    <div className="h-4 w-32 bg-slate-800 rounded"></div>
                  </div>
                  <div className="h-6 w-24 bg-slate-800 rounded-full"></div>
                </div>
                {/* Dashboard Body */}
                <div className="p-6 grid grid-cols-3 gap-4">
                  {/* Stats */}
                  <div className="col-span-1 bg-slate-900/50 p-4 rounded-xl border border-slate-800">
                    <div className="h-3 w-16 bg-slate-700 rounded mb-2"></div>
                    <div className="h-6 w-24 bg-white rounded mb-2"></div>
                    <div className="h-2 w-12 bg-emerald-500 rounded"></div>
                  </div>
                  <div className="col-span-1 bg-slate-900/50 p-4 rounded-xl border border-slate-800">
                    <div className="h-3 w-16 bg-slate-700 rounded mb-2"></div>
                    <div className="h-6 w-24 bg-white rounded mb-2"></div>
                    <div className="h-2 w-12 bg-emerald-500 rounded"></div>
                  </div>
                  <div className="col-span-1 bg-red-950/20 p-4 rounded-xl border border-red-900/30">
                    <div className="h-3 w-16 bg-red-500/50 rounded mb-2"></div>
                    <div className="h-6 w-12 bg-red-400 rounded mb-2"></div>
                    <div className="h-2 w-20 bg-red-500/30 rounded"></div>
                  </div>
                  
                  {/* Chart Area */}
                  <div className="col-span-2 h-40 bg-slate-900/50 rounded-xl border border-slate-800 p-4 flex items-end gap-2">
                    {[40, 70, 45, 90, 60, 85].map((h, i) => (
                      <motion.div 
                        key={i} 
                        initial={{ height: 0 }} 
                        animate={{ height: `${h}%` }} 
                        transition={{ delay: 0.5 + (i * 0.1), duration: 0.8 }}
                        className="flex-1 bg-gradient-to-t from-blue-600 to-blue-400 rounded-t-sm"
                      />
                    ))}
                  </div>

                  {/* Donut Chart placeholder */}
                  <div className="col-span-1 h-40 bg-slate-900/50 rounded-xl border border-slate-800 flex items-center justify-center relative">
                    <div className="w-24 h-24 rounded-full border-8 border-slate-800 border-t-blue-500 border-r-indigo-500 rotate-45"></div>
                    <div className="absolute text-center">
                      <div className="text-[10px] uppercase font-mono text-slate-300">Muster</div>
                      <div className="font-bold text-xs text-blue-400">Sync</div>
                    </div>
                  </div>
                </div>
             </div>

             {/* Floating Mobile App */}
             <motion.div 
                animate={{ y: [0, -10, 0] }}
                transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
                className="absolute -right-10 top-20 w-[240px] h-[480px] bg-[#0A1020] border-4 border-slate-800 rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.5)] z-20 overflow-hidden"
             >
                <div className="w-32 h-6 bg-slate-800 absolute top-0 left-1/2 -translate-x-1/2 rounded-b-xl"></div>
                <div className="p-4 pt-10 h-full flex flex-col gap-4">
                  <div className="flex justify-between items-center">
                    <div className="w-10 h-10 rounded-full bg-slate-800"></div>
                    <div className="h-4 w-20 bg-slate-800 rounded"></div>
                  </div>
                  <div className="h-8 w-3/4 bg-slate-700 rounded"></div>
                  <div className="bg-blue-900/30 border border-blue-800/50 p-4 rounded-xl">
                    <div className="h-10 w-10 bg-blue-500 rounded-full mb-2"></div>
                    <div className="h-4 w-24 bg-white rounded mb-1"></div>
                    <div className="h-3 w-16 bg-blue-300 rounded"></div>
                  </div>
                  <div className="flex-1 flex flex-col gap-3 mt-2">
                    {[1,2,3].map(i => (
                      <div key={i} className="h-12 w-full bg-slate-800/50 rounded-xl flex items-center px-3 gap-3">
                        <div className="w-8 h-8 rounded bg-slate-700"></div>
                        <div className="flex-1 space-y-2">
                          <div className="h-2 w-full bg-slate-700 rounded"></div>
                          <div className="h-2 w-1/2 bg-slate-700 rounded"></div>
                        </div>
                      </div>
                    ))}
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
const TrustedBySection: React.FC = () => {
  const pillars = [
    'MULTI-TENANT ISOLATION',
    'ZERO-TRUST RBAC',
    'REAL-TIME WEB & ANDROID',
    'STATUTORY FORM II COMPLIANCE',
    'OFFLINE FIELD LOGGING',
    'IMMUTABLE AUDIT TRAILS'
  ];

  return (
    <section className="py-8 border-y border-white/5 bg-[#080D1C]">
      <div className="max-w-7xl mx-auto px-4 text-center">
        <p className="text-xs font-semibold text-slate-400 mb-6 uppercase tracking-widest font-mono">
          Designed for Multi-Tenant Workforce Operations &amp; Facility Governance
        </p>
        <div className="flex flex-wrap justify-center items-center gap-x-8 gap-y-3">
          {pillars.map((pillar, idx) => (
            <div key={idx} className="flex items-center gap-8">
              <span className="text-xs sm:text-sm font-mono font-bold tracking-wider text-slate-300 hover:text-blue-400 transition-colors">
                {pillar}
              </span>
              {idx < pillars.length - 1 && (
                <span className="w-1.5 h-1.5 rounded-full bg-slate-700 hidden sm:inline-block" />
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

// --- MODULES ---
const ModulesSection: React.FC = () => {
  const modules = [
    { icon: Users, title: 'Workforce Management', desc: 'End-to-end employee lifecycle management' },
    { icon: Clock, title: 'Attendance & WFM', desc: 'Real-time attendance, rosters & shift planning' },
    { icon: ShieldCheck, title: 'Operations & Security', desc: 'Visitor, patrols, incidents & safety management' },
    { icon: Activity, title: 'Assets & Maintenance', desc: 'Track assets, breakdowns, maintenance & warranty' },
    { icon: Database, title: 'Inventory & SCM', desc: 'Stock, transfer, gate pass & inventory control' },
    { icon: Briefcase, title: 'Payroll & Compliance', desc: 'Automated payroll, statutory & compliance' },
    { icon: BarChart3, title: 'Reports & Intelligence', desc: 'Real-time dashboards & advanced analytics' }
  ];

  return (
    <section id="features" className="py-24 bg-[#060B19]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-black text-white mb-4">One Platform. <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">Every Operation.</span></h2>
          <p className="text-lg text-slate-400 font-medium">Power your entire organization with connected modules.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {modules.map((mod, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className={`p-6 rounded-2xl border border-slate-800 bg-[#0A1020] hover:bg-[#0D1529] hover:border-blue-500/50 transition-all group cursor-default ${i === 6 ? 'lg:col-span-2' : ''}`}
            >
              <div className="w-12 h-12 rounded-xl bg-slate-800 group-hover:bg-blue-900/50 flex items-center justify-center mb-6 transition-colors">
                <mod.icon className="w-6 h-6 text-blue-400 group-hover:text-blue-300" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">{mod.title}</h3>
              <p className="text-sm text-slate-400 leading-relaxed">{mod.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

// --- DEMO SECTION (White/Light Background) ---
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
        setErrorMsg('Failed to submit request. Please try again.');
      }
    } catch (err) {
      setErrorMsg('An error occurred. Please contact us directly.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section id="demo" className="py-24 bg-white text-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          
          {/* Left: Marketing Copy */}
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-700 font-bold text-xs uppercase tracking-wider mb-6">
              <div className="w-2 h-2 rounded-full bg-blue-500"></div>
              Try Risk-Free
            </div>
            <h2 className="text-4xl md:text-5xl font-black text-slate-900 mb-6 leading-tight">
              Get <span className="text-blue-600">3 Months</span> Free Demo
            </h2>
            
            <ul className="space-y-4 mb-10">
              {['Full platform access', 'All modules included', 'No credit card required', 'Cancel anytime'].map((item, i) => (
                <li key={i} className="flex items-center gap-3 font-semibold text-slate-700 text-lg">
                  <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center">
                    <CheckCircle2 className="w-4 h-4 text-blue-600" />
                  </div>
                  {item}
                </li>
              ))}
            </ul>

            <div className="p-6 bg-blue-50 rounded-2xl border border-blue-100 flex items-start gap-4">
              <Shield className="w-8 h-8 text-blue-600 shrink-0" />
              <div>
                <h4 className="font-bold text-slate-900">No Commitment.</h4>
                <p className="text-slate-600 font-medium mt-1">Just Results. Test our enterprise features in your own environment before deciding.</p>
              </div>
            </div>
          </div>

          {/* Right: The Form */}
          <div className="bg-white rounded-3xl p-8 shadow-[0_20px_50px_rgba(0,0,0,0.1)] border border-slate-100">
            <h3 className="text-2xl font-bold text-slate-900 mb-2">Request Your <span className="text-blue-600">3-Month Free</span> Demo</h3>
            <p className="text-slate-500 text-sm font-medium mb-8">Our team will contact you within 24 hours.</p>

            {isSuccess ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mb-6">
                  <CheckCircle2 className="w-8 h-8 text-emerald-600" />
                </div>
                <h4 className="text-xl font-bold text-slate-900 mb-2">Request Received Successfully!</h4>
                <p className="text-slate-600 font-medium">Our Super Admin will review your details and contact you shortly with platform access.</p>
                <button onClick={() => setIsSuccess(false)} className="mt-8 text-sm font-bold text-blue-600 hover:text-blue-700 transition-colors">Submit another request</button>
              </motion.div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                {errorMsg && <div className="p-4 bg-red-50 text-red-600 text-sm font-bold rounded-xl">{errorMsg}</div>}
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">Full Name <span className="text-red-500">*</span></label>
                    <input required type="text" value={formData.fullName} onChange={e => setFormData({...formData, fullName: e.target.value})} className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" placeholder="Enter your full name" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">Work Email <span className="text-red-500">*</span></label>
                    <input required type="email" value={formData.workEmail} onChange={e => setFormData({...formData, workEmail: e.target.value})} className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" placeholder="Enter your work email" />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">Company Name <span className="text-red-500">*</span></label>
                    <input required type="text" value={formData.companyName} onChange={e => setFormData({...formData, companyName: e.target.value})} className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" placeholder="Enter company name" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">Phone Number <span className="text-red-500">*</span></label>
                    <input required type="tel" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" placeholder="Enter phone number" />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">Designation</label>
                    <input type="text" value={formData.designation} onChange={e => setFormData({...formData, designation: e.target.value})} className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" placeholder="Your designation" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">Number of Employees</label>
                    <select value={formData.employees} onChange={e => setFormData({...formData, employees: e.target.value})} className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500">
                      <option>1-50</option>
                      <option>51-200</option>
                      <option>201-500</option>
                      <option>500-1000</option>
                      <option>1000+</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Your Message (Optional)</label>
                  <textarea rows={3} value={formData.message} onChange={e => setFormData({...formData, message: e.target.value})} className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" placeholder="Tell us about your requirements..."></textarea>
                </div>

                <button type="submit" disabled={isSubmitting} className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-bold text-sm transition-all shadow-[0_0_15px_rgba(79,70,229,0.3)] flex justify-center items-center gap-2">
                  {isSubmitting ? 'Submitting...' : <>Submit Request <Send className="w-4 h-4" /></>}
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
        <div className="flex flex-col lg:flex-row gap-16">
          <div className="lg:w-1/3">
            <h2 className="text-2xl font-black mb-4">About <span className="text-blue-600">Shourya Enterprises Pvt. Ltd.</span></h2>
            <p className="text-slate-600 font-medium leading-relaxed mb-8">
              Shourya Enterprises Pvt. Ltd. is committed to building technology that simplifies operations and empowers organizations to achieve excellence.
            </p>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Owner</p>
              <p className="text-xl font-bold text-slate-900 mb-2">Avinash Ghadge</p>
              <a href="mailto:ghadgea162@gmail.com" className="flex items-center gap-2 text-blue-600 font-bold hover:text-blue-800 transition-colors">
                <Mail className="w-4 h-4" /> ghadgea162@gmail.com
              </a>
            </div>
          </div>
          <div className="lg:w-2/3 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { icon: Shield, title: 'Multi-Tenant Isolation', desc: 'Cryptographic data partition across enterprise accounts', color: 'text-blue-600', bg: 'bg-blue-100' },
              { icon: Users, title: 'Role-Based Access', desc: 'Granular controls from Super Admin to Site Guards', color: 'text-emerald-600', bg: 'bg-emerald-100' },
              { icon: Activity, title: 'Real-Time Sync', desc: 'Instant synchronization across Web & Android apps', color: 'text-amber-600', bg: 'bg-amber-100' },
              { icon: Clock, title: 'Statutory Compliance', desc: 'Form II labor register & wage calculation compliance', color: 'text-indigo-600', bg: 'bg-indigo-100' }
            ].map((pillar, i) => (
              <div key={i} className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex flex-col items-center text-center justify-center">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-3 ${pillar.bg}`}>
                  <pillar.icon className={`w-6 h-6 ${pillar.color}`} />
                </div>
                <h4 className="text-sm font-bold text-slate-900 mb-1">{pillar.title}</h4>
                <p className="text-xs text-slate-500 font-medium leading-snug">{pillar.desc}</p>
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
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-indigo-600/5 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-black text-white mb-4">Enterprise-Grade <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">Security</span></h2>
          <p className="text-lg text-slate-400 font-medium max-w-2xl mx-auto">Bank-level encryption and strict access controls to keep your operational data safe.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            { title: 'Multi-Tenant Architecture', desc: 'Strict data isolation ensures your company data is completely partitioned from other organizations.' },
            { title: 'Role-Based Access (RBAC)', desc: 'Granular permissions based on custom Firebase claims. Employees only see what they are authorized to see.' },
            { title: 'Secure Infrastructure', desc: 'Powered by Firebase with robust security rules preventing unauthorized reads or writes.' },
            { title: 'Audit Trails', desc: 'Immutable logs for every critical action, approval, or data mutation within the system.' },
            { title: 'Data Isolation', desc: 'Site-level and Region-level scoping prevents supervisors from accessing unassigned territories.' }
          ].map((sec, i) => (
            <div key={i} className="p-6 bg-slate-900/50 rounded-2xl border border-slate-800 hover:border-blue-500/50 transition-colors">
              <Shield className="w-8 h-8 text-blue-500 mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">{sec.title}</h3>
              <p className="text-slate-400 font-medium leading-relaxed">{sec.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

// --- FAQ ---
const FaqSection: React.FC = () => {
  const faqsLeft = [
    { q: 'What is Log Sheet Muster?', a: 'Log Sheet Muster is a comprehensive enterprise SaaS platform designed to manage attendance, facility operations, assets, and payroll securely.' },
    { q: 'Which industries can use Log Sheet Muster?', a: 'It is ideal for Facility Management Companies, Manufacturing, Security Agencies, and large corporate campuses with distributed workforces.' },
    { q: 'Is my data secure?', a: 'Yes. We use strict Zero-Trust Firebase security rules ensuring absolute multi-tenant data isolation.' }
  ];
  const faqsRight = [
    { q: 'What is included in the 3-month demo?', a: 'You get full access to all modules including HRMS, Attendance, Assets, Inventory, and Analytics with no feature restrictions.' },
    { q: 'Can I cancel the demo anytime?', a: 'Yes, the demo is completely risk-free with no credit card required upfront.' },
    { q: 'How do I get support?', a: 'We offer dedicated account managers and technical support for all our enterprise clients during and after the trial.' }
  ];

  return (
    <section id="faq" className="py-24 bg-slate-50 text-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl md:text-4xl font-black mb-12">Frequently Asked <span className="text-blue-600">Questions</span></h2>
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
            
            {/* Embedded Contact Card (as seen in image) */}
            <div className="mt-8 p-8 rounded-3xl bg-gradient-to-br from-[#0A1020] to-[#060B19] border border-slate-800 text-white relative overflow-hidden shadow-2xl">
              <div className="relative z-10">
                <h3 className="text-xl font-bold mb-2">Contact for Demo</h3>
                <p className="text-sm text-slate-400 mb-6">Have questions? We are here to help.</p>
                <div className="space-y-3">
                  <a href="mailto:ghadgea162@gmail.com" className="flex items-center gap-3 text-sm font-medium hover:text-blue-400 transition-colors">
                    <Mail className="w-5 h-5 text-blue-500" /> ghadgea162@gmail.com
                  </a>
                  <div className="flex items-center gap-3 text-sm font-medium">
                    <MapPin className="w-5 h-5 text-blue-500" /> Pune, Maharashtra, India
                  </div>
                </div>
              </div>
              {/* Abstract Headphone Graphic Placeholder */}
              <div className="absolute right-0 bottom-0 w-32 h-32 opacity-20">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full text-blue-500"><path d="M3 18v-6a9 9 0 0 1 18 0v6"></path><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"></path></svg>
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
        className="w-full px-6 py-4 text-left flex justify-between items-center bg-slate-50 hover:bg-slate-100 transition-colors"
      >
        <span className="font-bold text-slate-800 text-sm">{question}</span>
        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden bg-white">
            <div className="px-6 py-4 text-sm text-slate-600 font-medium leading-relaxed">
              {answer}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// --- FOOTER ---
const Footer: React.FC<{ onNavigate: (screen: PhaseAScreen) => void, onOpenDemo: () => void }> = ({ onNavigate, onOpenDemo }) => {
  return (
    <footer className="bg-[#040812] text-slate-300 py-16 border-t border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-12">
          
          <div className="col-span-2 md:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded bg-blue-600 text-white flex items-center justify-center font-bold text-xs">LM</div>
              <span className="font-bold text-lg text-white">Log Sheet Muster</span>
            </div>
            <p className="text-sm leading-relaxed mb-6 max-w-xs">
              All-in-one workforce & facility management platform built for modern enterprises.
            </p>
            {/* Social Icons Placeholder */}
            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-slate-800 hover:bg-blue-600 cursor-pointer transition-colors"></div>
              <div className="w-8 h-8 rounded-full bg-slate-800 hover:bg-blue-600 cursor-pointer transition-colors"></div>
              <div className="w-8 h-8 rounded-full bg-slate-800 hover:bg-blue-600 cursor-pointer transition-colors"></div>
            </div>
          </div>
          
          <div>
            <h4 className="font-bold text-white mb-4">Product</h4>
            <ul className="space-y-3 text-sm">
              <li><a href="#features" className="hover:text-blue-400 transition-colors">Features</a></li>
              <li><a href="#solutions" className="hover:text-blue-400 transition-colors">Solutions</a></li>
              <li><a href="#security" className="hover:text-blue-400 transition-colors">Security</a></li>
              <li><a href="#" className="hover:text-blue-400 transition-colors">Integrations</a></li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-bold text-white mb-4">Company</h4>
            <ul className="space-y-3 text-sm">
              <li><a href="#about" className="hover:text-blue-400 transition-colors">About Us</a></li>
              <li><a href="#" className="hover:text-blue-400 transition-colors">Careers</a></li>
              <li><a href="#" className="hover:text-blue-400 transition-colors">Clients</a></li>
              <li><a href="#" className="hover:text-blue-400 transition-colors">Partners</a></li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-bold text-white mb-4">Support</h4>
            <ul className="space-y-3 text-sm">
              <li><button onClick={() => onNavigate('LOGIN')} className="hover:text-blue-400 transition-colors">System Login</button></li>
              <li><button onClick={() => onNavigate('PLATFORM_LOGIN')} className="hover:text-blue-400 transition-colors">Super Admin</button></li>
              <li><a href="#demo" className="hover:text-blue-400 transition-colors">Contact Us</a></li>
              <li><a href="#faq" className="hover:text-blue-400 transition-colors">FAQ</a></li>
            </ul>
          </div>
          
        </div>
        
        <div className="pt-8 border-t border-slate-800/50 flex flex-col md:flex-row justify-between items-center gap-4 text-xs">
          <div className="text-slate-400">
            &copy; {new Date().getFullYear()} Shourya Enterprises Pvt. Ltd. All rights reserved.
          </div>
          <div className="flex gap-6">
            <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-white transition-colors">Terms & Conditions</a>
          </div>
        </div>
      </div>
    </footer>
  );
};
