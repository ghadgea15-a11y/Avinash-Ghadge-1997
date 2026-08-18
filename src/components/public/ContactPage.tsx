import React, { useState } from 'react';
import { 
  Mail, 
  Phone, 
  MapPin, 
  Send, 
  CheckCircle2, 
  Building2, 
  Clock, 
  ShieldCheck,
  Sparkles
} from 'lucide-react';
import { PhaseAScreen } from '../../types';
import { COMPANY_INFO } from '../../utils/seo';

interface ContactPageProps {
  onNavigate: (screen: PhaseAScreen) => void;
}

export const ContactPage: React.FC<ContactPageProps> = ({ onNavigate }) => {
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
      alert("There was an error submitting your request. Please try again.");
    }
  };

  return (
    <article className="space-y-16 py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      
      {/* Hero Section */}
      <section aria-labelledby="contact-hero-heading" className="text-center space-y-6 max-w-4xl mx-auto pt-6 pb-4">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-mono font-bold tracking-wide">
          <Mail className="w-3.5 h-3.5 text-emerald-600" />
          ENTERPRISE CONSULTATION & DEMO
        </div>

        <h1 id="contact-hero-heading" className="text-3xl sm:text-4xl lg:text-5xl font-display font-bold text-[#0A0D14] tracking-tight leading-tight">
          Schedule a Live Enterprise Demo with Our Solutions Team
        </h1>

        <p className="text-base sm:text-lg text-slate-600 leading-relaxed">
          See how Log Sheet Muster can digitize your Form II attendance muster, automate statutory payroll, and monitor guard patrols across all customer sites.
        </p>
      </section>

      {/* Main Grid: Form + Office Details */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Col: Contact Form */}
        <div className="lg:col-span-7 bg-white border border-[#E8E7E3] rounded-3xl p-8 shadow-sm space-y-6">
          <div>
            <h2 className="text-xl font-display font-bold text-[#0A0D14]">Request Platform Walkthrough</h2>
            <p className="text-xs text-slate-600 mt-1">
              Our Pune engineering team will prepare a customized sandbox demonstration for your specific workflow.
            </p>
          </div>

          {submitted ? (
            <div className="p-8 rounded-2xl bg-emerald-50 border border-emerald-200 text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-emerald-900">Demo Request Received</h3>
              <p className="text-xs text-emerald-800 leading-relaxed max-w-md mx-auto">
                Thank you, <strong>{formData.name}</strong>. Our enterprise team at Shourya Enterprises Pvt. Ltd. will contact you at <strong>{formData.email}</strong> / <strong>{formData.phone}</strong> within 2 business hours.
              </p>
              <button
                onClick={() => setSubmitted(false)}
                className="text-xs font-mono font-bold text-emerald-700 underline"
              >
                Send another message
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4 text-xs font-body">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="font-mono font-bold text-slate-700">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Rahul Sharma"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-[#FBFBFA]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-mono font-bold text-slate-700">Company / Agency Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.company}
                    onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                    placeholder="e.g. Apex Security & Facility Services"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-[#FBFBFA]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="font-mono font-bold text-slate-700">Work Email *</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="name@company.com"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-[#FBFBFA]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-mono font-bold text-slate-700">Mobile Phone Number *</label>
                  <input
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+91-9876543210"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-[#FBFBFA]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="font-mono font-bold text-slate-700">Active Workforce Size</label>
                  <select
                    value={formData.workforceSize}
                    onChange={(e) => setFormData({ ...formData, workforceSize: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-[#FBFBFA]"
                  >
                    <option value="1-50">1 - 50 employees / guards</option>
                    <option value="50-200">50 - 200 employees / guards</option>
                    <option value="200-500">200 - 500 employees / guards</option>
                    <option value="500+">500+ enterprise scale</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="font-mono font-bold text-slate-700">Primary Module Interest</label>
                  <select
                    value={formData.primaryInterest}
                    onChange={(e) => setFormData({ ...formData, primaryInterest: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-[#FBFBFA]"
                  >
                    <option value="Full HRMS & Form II Muster">Full HRMS & Form II Muster</option>
                    <option value="Statutory Payroll & Bank Disbursement">Statutory Payroll & Bank Disbursement</option>
                    <option value="QR Guard Patrol Tours & Visitor Pass">QR Guard Patrol Tours & Visitor Pass</option>
                    <option value="Facility Log Sheets & PPM Work Orders">Facility Log Sheets & PPM Work Orders</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="font-mono font-bold text-slate-700">Operational Requirements / Notes</label>
                <textarea
                  rows={4}
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  placeholder="Share details about your branches, client sites, or specific compliance challenges..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-[#FBFBFA]"
                ></textarea>
              </div>

              <button
                type="submit"
                className="w-full py-3.5 rounded-xl bg-[#0A0D14] hover:bg-slate-800 text-white font-mono font-bold text-xs uppercase tracking-wider transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
              >
                <Send className="w-4 h-4" />
                Submit Live Demo Request
              </button>
            </form>
          )}
        </div>

        {/* Right Col: Pune Headquarters & Direct Contact */}
        <div className="lg:col-span-5 space-y-6">
          <div className="p-8 rounded-3xl bg-white border border-[#E8E7E3] space-y-6 shadow-xs">
            <h2 className="text-xl font-display font-bold text-[#0A0D14]">Direct Contact Coordinates</h2>

            <div className="space-y-4 text-xs font-mono text-slate-700">
              <div className="flex items-start gap-3">
                <Building2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-slate-900">{COMPANY_INFO.legalName}</div>
                  <div className="text-slate-500">Founder: {COMPANY_INFO.founder}</div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-slate-900">Pune Headquarters</div>
                  <div className="text-slate-500 leading-relaxed">
                    {COMPANY_INFO.address.streetAddress}, {COMPANY_INFO.address.addressLocality}, {COMPANY_INFO.address.addressRegion} - {COMPANY_INFO.address.postalCode}, India
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Mail className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-slate-900">Email Inquiries</div>
                  <a href={`mailto:${COMPANY_INFO.email}`} className="text-emerald-700 hover:underline">
                    {COMPANY_INFO.email}
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Phone className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-slate-900">Telephone / WhatsApp</div>
                  <a href={`tel:${COMPANY_INFO.telephone}`} className="text-emerald-700 hover:underline">
                    {COMPANY_INFO.telephone}
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Clock className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-slate-900">Support Working Hours</div>
                  <div className="text-slate-500">Monday - Saturday: 09:00 AM - 07:00 PM IST</div>
                </div>
              </div>
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-2">
            <h3 className="text-sm font-bold text-emerald-900 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              Existing Client Support
            </h3>
            <p className="text-xs text-emerald-800 leading-relaxed">
              If you are an active Log Sheet Muster subscriber requiring workstation assistance, you can log in directly or contact your assigned account manager.
            </p>
          </div>
        </div>

      </section>

    </article>
  );
};
