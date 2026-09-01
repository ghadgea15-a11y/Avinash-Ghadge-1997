import React, { useState } from 'react';
import { 
  Mail, Phone, MapPin, Send, CheckCircle2, Building2, Clock, ShieldCheck 
} from 'lucide-react';
import { PhaseAScreen } from '../../types';
import { COMPANY_INFO } from '../../utils/seo';

export const ContactPage: React.FC<{ onNavigate: (screen: PhaseAScreen) => void }> = ({ onNavigate }) => {
  const [formData, setFormData] = useState({
    name: '',
    company: '',
    email: '',
    phone: '',
    workforceSize: '50-200',
    primaryInterest: 'Full HRMS & Form II Muster',
    message: ''
  });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const leadId = `lead_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const newLead = {
      id: leadId,
      name: formData.name,
      company: formData.company,
      email: formData.email,
      phone: formData.phone,
      workforceSize: formData.workforceSize,
      interestedModules: formData.primaryInterest,
      message: formData.message,
      status: 'NEW' as const,
      createdAt: new Date().toISOString()
    };
    
    const { FirestoreService } = await import('../../services/firestoreService');
    const success = await FirestoreService.createLead(newLead);
    if (success) {
      setSubmitted(true);
    } else {
      alert("There was an error saving your request. Please try again.");
    }
  };

  return (
    <div className="space-y-16">
      
      {/* Hero */}
      <section className="relative pt-16 pb-8 overflow-hidden">
        <div className="absolute inset-0 bg-blue-600/5 blur-[100px] rounded-full w-[800px] h-[400px] left-1/2 -translate-x-1/2 -top-20 pointer-events-none" />
        <div className="max-w-4xl mx-auto px-4 relative z-10 text-center space-y-4">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-blue-500/20 border border-blue-500/30 text-blue-400 mb-2">
            <Mail className="w-6 h-6" />
          </div>
          <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight leading-tight">
            Contact Enterprise Sales
          </h1>
          <p className="text-slate-400 max-w-2xl mx-auto text-lg">
            Discuss your requirements, request a custom demonstration, or get answers to your questions.
          </p>
        </div>
      </section>

      {/* Content */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">
        <div className="grid lg:grid-cols-12 gap-12 items-start">
          
          <div className="lg:col-span-7 p-8 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-sm">
            <h2 className="text-2xl font-bold text-white mb-6">Request Information</h2>
            
            {submitted ? (
              <div className="flex flex-col items-center justify-center py-16 space-y-4 text-center">
                <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h3 className="text-2xl font-bold text-white">Request Received</h3>
                <p className="text-slate-400 max-w-md mx-auto">
                  Thank you for reaching out to Shourya Enterprises Pvt. Ltd. Our enterprise team will review your requirements and contact you shortly.
                </p>
                <button 
                  onClick={() => setSubmitted(false)}
                  className="mt-6 px-6 py-2.5 rounded-lg border border-white/10 text-white hover:bg-white/5 transition-colors"
                >
                  Submit Another Request
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-300">Full Name *</label>
                    <input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-4 py-3 rounded-xl bg-black/50 border border-white/10 text-white focus:outline-none focus:border-blue-500 transition-colors" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-300">Company Name *</label>
                    <input required value={formData.company} onChange={e => setFormData({...formData, company: e.target.value})} className="w-full px-4 py-3 rounded-xl bg-black/50 border border-white/10 text-white focus:outline-none focus:border-blue-500 transition-colors" />
                  </div>
                </div>
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-300">Work Email *</label>
                    <input required type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full px-4 py-3 rounded-xl bg-black/50 border border-white/10 text-white focus:outline-none focus:border-blue-500 transition-colors" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-300">Mobile Phone *</label>
                    <input required type="tel" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full px-4 py-3 rounded-xl bg-black/50 border border-white/10 text-white focus:outline-none focus:border-blue-500 transition-colors" />
                  </div>
                </div>
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-300">Workforce Size</label>
                    <select value={formData.workforceSize} onChange={e => setFormData({...formData, workforceSize: e.target.value})} className="w-full px-4 py-3 rounded-xl bg-black/50 border border-white/10 text-white focus:outline-none focus:border-blue-500 transition-colors appearance-none">
                      <option value="1-50">1 - 50 employees</option>
                      <option value="50-200">50 - 200 employees</option>
                      <option value="200-500">200 - 500 employees</option>
                      <option value="500+">500+ enterprise scale</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-300">Primary Interest</label>
                    <select value={formData.primaryInterest} onChange={e => setFormData({...formData, primaryInterest: e.target.value})} className="w-full px-4 py-3 rounded-xl bg-black/50 border border-white/10 text-white focus:outline-none focus:border-blue-500 transition-colors appearance-none">
                      <option value="Full HRMS & Form II Muster">Full HRMS & Form II Muster</option>
                      <option value="Statutory Payroll">Statutory Payroll</option>
                      <option value="QR Guard Patrol Tours">QR Guard Patrol Tours</option>
                      <option value="Facility Log Sheets">Facility Log Sheets</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-300">Requirements / Notes</label>
                  <textarea rows={4} value={formData.message} onChange={e => setFormData({...formData, message: e.target.value})} className="w-full px-4 py-3 rounded-xl bg-black/50 border border-white/10 text-white focus:outline-none focus:border-blue-500 transition-colors resize-none"></textarea>
                </div>
                <button type="submit" className="w-full py-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold tracking-wide hover:from-blue-500 hover:to-indigo-500 transition-all shadow-[0_0_20px_rgba(79,70,229,0.3)] flex justify-center items-center gap-2">
                  <Send className="w-5 h-5" />
                  Submit Request
                </button>
              </form>
            )}
          </div>

          <div className="lg:col-span-5 space-y-6">
            <div className="p-8 rounded-3xl bg-white/5 border border-white/10 space-y-8 backdrop-blur-sm">
              <h2 className="text-2xl font-bold text-white">Contact Information</h2>
              
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center shrink-0">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white">{COMPANY_INFO.legalName}</h3>
                    <p className="text-sm text-slate-300">Founder: {COMPANY_INFO.founder}</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center shrink-0">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white">Pune Headquarters</h3>
                    <p className="text-sm text-slate-300 leading-relaxed mt-1">
                      {COMPANY_INFO.address.streetAddress},<br />
                      {COMPANY_INFO.address.addressLocality}, {COMPANY_INFO.address.addressRegion} - {COMPANY_INFO.address.postalCode}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center shrink-0">
                    <Mail className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white">Email Address</h3>
                    <a href={`mailto:${COMPANY_INFO.email}`} className="text-sm text-blue-400 hover:text-blue-300 block mt-1">
                      {COMPANY_INFO.email}
                    </a>
                  </div>
                </div>
                
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center shrink-0">
                    <Phone className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white">Telephone</h3>
                    <a href={`tel:${COMPANY_INFO.telephone}`} className="text-sm text-blue-400 hover:text-blue-300 block mt-1">
                      {COMPANY_INFO.telephone}
                    </a>
                  </div>
                </div>
                
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center shrink-0">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white">Working Hours</h3>
                    <p className="text-sm text-slate-400 mt-1">Mon-Sat: 09:00 AM - 07:00 PM IST</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="p-6 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex gap-4">
              <ShieldCheck className="w-6 h-6 text-blue-400 shrink-0" />
              <div>
                <h3 className="font-bold text-blue-200">Existing Customers</h3>
                <p className="text-sm text-blue-200/80 mt-1">
                  Active subscribers can log in directly to their workstation or contact their assigned technical account manager for support.
                </p>
              </div>
            </div>
          </div>

        </div>
      </section>
    </div>
  );
};
