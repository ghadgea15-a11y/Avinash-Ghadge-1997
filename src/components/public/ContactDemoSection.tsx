import React, { useState } from 'react';
import { 
  Building2, 
  Send, 
  CheckCircle2, 
  Mail, 
  Phone, 
  MapPin, 
  ArrowRight,
  ShieldCheck,
  User,
  Layers
} from 'lucide-react';
import { PhaseAScreen } from '../../types';

interface ContactDemoSectionProps {
  onNavigate: (screen: PhaseAScreen) => void;
}

export const ContactDemoSection: React.FC<ContactDemoSectionProps> = ({ onNavigate }) => {
  const [formData, setFormData] = useState({
    fullName: '',
    workEmail: '',
    phone: '',
    companyName: '',
    siteCount: '1-5 Sites',
    primaryInterest: 'Unified Platform (All Modules)',
    message: ''
  });

  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    const leadId = `lead_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const newLead = {
      id: leadId,
      name: formData.fullName,
      company: formData.companyName,
      email: formData.workEmail,
      phone: formData.phone,
      workforceSize: formData.siteCount,
      interestedModules: formData.primaryInterest,
      message: formData.message,
      status: 'NEW' as const,
      createdAt: new Date().toISOString()
    };

    try {
      const { FirestoreService } = await import('../../services/firestoreService');
      const success = await FirestoreService.createLead(newLead);
      if (success) {
        setSubmitted(true);
      } else {
        alert("There was an error submitting your request. Please try again.");
      }
    } catch (e) {
      console.error(e);
      alert("There was an error submitting your request. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section id="contact" className="py-24 lg:py-32 bg-[#080D0B] text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
        
        {/* Section Headline */}
        <div className="max-w-3xl mx-auto text-center space-y-6">
          <span className="font-mono text-xs font-bold uppercase tracking-widest text-emerald-400">
            Next Steps
          </span>

          <h2 className="font-display text-4xl sm:text-6xl font-extrabold text-white tracking-tight leading-[1.08]">
            READY TO CONNECT YOUR OPERATIONS?
          </h2>

          <p className="font-body text-base sm:text-lg text-slate-400 leading-relaxed">
            Schedule an executive platform demonstration tailored to your facility network, workforce size, and compliance requirements.
          </p>

          {/* Quick Dual Action Buttons */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={() => {
                const el = document.getElementById('demo-form');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }}
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-[#080D0B] text-sm font-bold font-body transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer shadow-sm"
            >
              <span>Request Executive Demo</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              onClick={() => onNavigate('LOGIN')}
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl border border-slate-700 hover:border-slate-500 bg-[#0F1714] text-white text-sm font-bold font-body transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Login to Workstation</span>
            </button>
          </div>
        </div>

        {/* Demo Request Form & Corporate Contact Grid */}
        <div id="demo-form" className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start pt-8 border-t border-[#1B2923]">
          
          {/* Left: Contact Facts */}
          <div className="lg:col-span-5 space-y-8 font-body">
            <div className="space-y-3">
              <h3 className="font-display text-xl font-bold text-white">
                Direct Contact & Support
              </h3>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                Connect with our technical deployment team to discuss on-premise configurations, custom integration APIs, or nationwide facility rollouts.
              </p>
            </div>

            <div className="space-y-4 text-xs text-slate-300">
              <div className="p-4 rounded-2xl bg-[#0F1714] border border-[#1B2923] flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <Mail className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[10px] uppercase font-mono text-slate-400 block">EMAIL INQUIRIES</span>
                  <strong className="text-white font-semibold text-xs">ghadgea162@gmail.com</strong>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-[#0F1714] border border-[#1B2923] flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <Phone className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[10px] uppercase font-mono text-slate-400 block">DIRECT PHONE</span>
                  <strong className="text-white font-semibold text-xs">+91 90963 45456</strong>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-[#0F1714] border border-[#1B2923] flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <MapPin className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[10px] uppercase font-mono text-slate-400 block">HEADQUARTERS</span>
                  <strong className="text-white font-semibold text-xs">Ajanthanagar, Chinchwad, Pune 411019</strong>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Executive Request Form */}
          <div className="lg:col-span-7 bg-[#0F1714] rounded-3xl border border-[#1B2923] p-8 sm:p-10 shadow-xl font-body">
            {submitted ? (
              <div className="text-center py-12 space-y-4">
                <div className="w-14 h-14 rounded-full bg-emerald-500/20 text-emerald-400 mx-auto flex items-center justify-center border border-emerald-500/30">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h3 className="font-display text-2xl font-bold text-white">
                  Demo Request Received
                </h3>
                <p className="text-sm text-slate-400 max-w-md mx-auto">
                  Thank you for your interest in Log Sheet Muster. Our enterprise operations specialist will contact you within 24 business hours.
                </p>
                <button
                  onClick={() => setSubmitted(false)}
                  className="px-6 py-2.5 rounded-xl bg-[#1B2923] hover:bg-[#273B33] text-white text-xs font-bold font-body transition-colors cursor-pointer"
                >
                  Submit Another Inquiry
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-mono uppercase text-slate-400 block">Full Name *</label>
                    <input
                      type="text"
                      required
                      value={formData.fullName}
                      onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                      placeholder="e.g. Rajesh Sharma"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#080D0B] border border-[#1B2923] text-white text-xs placeholder:text-slate-600 focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-mono uppercase text-slate-400 block">Work Email *</label>
                    <input
                      type="email"
                      required
                      value={formData.workEmail}
                      onChange={(e) => setFormData({ ...formData, workEmail: e.target.value })}
                      placeholder="e.g. rajesh@enterprise.com"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#080D0B] border border-[#1B2923] text-white text-xs placeholder:text-slate-600 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-mono uppercase text-slate-400 block">Phone Number *</label>
                    <input
                      type="tel"
                      required
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="+91 98765 43210"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#080D0B] border border-[#1B2923] text-white text-xs placeholder:text-slate-600 focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-mono uppercase text-slate-400 block">Company / Organization *</label>
                    <input
                      type="text"
                      required
                      value={formData.companyName}
                      onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                      placeholder="e.g. Vertex Facilities Ltd."
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#080D0B] border border-[#1B2923] text-white text-xs placeholder:text-slate-600 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-mono uppercase text-slate-400 block">Operational Site Count</label>
                    <select
                      value={formData.siteCount}
                      onChange={(e) => setFormData({ ...formData, siteCount: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#080D0B] border border-[#1B2923] text-white text-xs focus:outline-none focus:border-emerald-500"
                    >
                      <option>1-5 Sites</option>
                      <option>6-20 Sites</option>
                      <option>21-50 Sites</option>
                      <option>50+ Enterprise Sites</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-mono uppercase text-slate-400 block">Primary Focus Area</label>
                    <select
                      value={formData.primaryInterest}
                      onChange={(e) => setFormData({ ...formData, primaryInterest: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#080D0B] border border-[#1B2923] text-white text-xs focus:outline-none focus:border-emerald-500"
                    >
                      <option>Unified Platform (All Modules)</option>
                      <option>Shift Muster & Attendance</option>
                      <option>Security Guard QR Patrols</option>
                      <option>Equipment Log Sheets (DG/HVAC)</option>
                      <option>Asset QR & Maintenance</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-mono uppercase text-slate-400 block">Specific Operational Requirements (Optional)</label>
                  <textarea
                    rows={3}
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    placeholder="Describe your current site setup, workforce strength, or integration requirements..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#080D0B] border border-[#1B2923] text-white text-xs placeholder:text-slate-600 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-[#080D0B] text-xs font-bold font-body transition-colors cursor-pointer flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <span>Submitting Request...</span>
                  ) : (
                    <>
                      <span>Schedule Platform Walkthrough</span>
                      <Send className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </form>
            )}
          </div>

        </div>

      </div>
    </section>
  );
};
