import React from 'react';
import { 
  Building2, 
  MapPin, 
  Mail, 
  Phone, 
  ShieldCheck, 
  Award, 
  CheckCircle2, 
  ArrowRight,
  User,
  HeartHandshake
} from 'lucide-react';
import { PhaseAScreen } from '../../types';
import { navigateToUrl } from '../../utils/publicRouter';
import { COMPANY_INFO } from '../../utils/seo';

interface AboutPageProps {
  onNavigate: (screen: PhaseAScreen) => void;
}

export const AboutPage: React.FC<AboutPageProps> = ({ onNavigate }) => {
  const handleLinkClick = (e: React.MouseEvent<HTMLAnchorElement>, path: string) => {
    e.preventDefault();
    navigateToUrl(path);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <article className="space-y-16 py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      
      {/* Hero Section */}
      <section aria-labelledby="about-hero-heading" className="text-center space-y-6 max-w-4xl mx-auto pt-6 pb-4">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-mono font-bold tracking-wide">
          <Building2 className="w-3.5 h-3.5 text-emerald-600" />
          ABOUT SHOURYA ENTERPRISES PVT. LTD.
        </div>

        <h1 id="about-hero-heading" className="text-3xl sm:text-4xl lg:text-5xl font-display font-bold text-[#0A0D14] tracking-tight leading-tight">
          Empowering India's Operational & Field Workforces
        </h1>

        <p className="text-base sm:text-lg text-slate-600 leading-relaxed">
          Log Sheet Muster is built and maintained by Shourya Enterprises Pvt. Ltd., headquartered in Pune, Maharashtra. Our mission is to eliminate paper-based operational friction and bring modern digital governance to security guarding, facility management, and industrial workforce operations.
        </p>
      </section>

      {/* Corporate Details Grid */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        <div className="p-8 rounded-3xl bg-white border border-[#E8E7E3] space-y-6 shadow-xs">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-100">
            <User className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-display font-bold text-[#0A0D14]">Leadership & Vision</h2>
          <p className="text-xs text-slate-600 leading-relaxed">
            Founded by <strong>{COMPANY_INFO.founder}</strong>, Shourya Enterprises Pvt. Ltd. focuses on practical, real-world operational software tailored to the stringent compliance and execution requirements of Indian enterprise environments.
          </p>
          <div className="p-4 rounded-xl bg-[#FBFBFA] border border-[#E8E7E3] text-xs font-mono text-slate-700 space-y-1">
            <div><strong>Company:</strong> {COMPANY_INFO.legalName}</div>
            <div><strong>Founder:</strong> {COMPANY_INFO.founder}</div>
            <div><strong>Platform:</strong> Log Sheet Muster SaaS</div>
          </div>
        </div>

        <div className="p-8 rounded-3xl bg-white border border-[#E8E7E3] space-y-6 shadow-xs">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-100">
            <MapPin className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-display font-bold text-[#0A0D14]">Headquarters & Operations</h2>
          <p className="text-xs text-slate-600 leading-relaxed">
            Headquartered in Pune's industrial and IT hub, our solutions architecture and engineering teams serve clients across Maharashtra and India.
          </p>
          <div className="p-4 rounded-xl bg-[#FBFBFA] border border-[#E8E7E3] text-xs font-mono text-slate-700 space-y-1">
            <div><strong>Address:</strong> {COMPANY_INFO.address.streetAddress}, {COMPANY_INFO.address.addressLocality}, {COMPANY_INFO.address.addressRegion} - {COMPANY_INFO.address.postalCode}</div>
            <div><strong>Email:</strong> <a href={`mailto:${COMPANY_INFO.email}`} className="text-emerald-700 underline">{COMPANY_INFO.email}</a></div>
            <div><strong>Direct Contact:</strong> <a href={`tel:${COMPANY_INFO.telephone}`} className="text-emerald-700 underline">{COMPANY_INFO.telephone}</a></div>
          </div>
        </div>

      </section>

      {/* Core Engineering Principles */}
      <section className="bg-white border border-[#E8E7E3] rounded-3xl p-8 sm:p-12 space-y-6 shadow-sm">
        <h2 className="text-2xl font-display font-bold text-[#0A0D14]">
          Our Core Engineering Principles
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
          <div className="space-y-2">
            <h3 className="text-sm font-bold text-slate-900">1. Single Source of Truth</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              No fragmented spreadsheets. Attendance, payroll, guard tours, and log sheets share one atomic Firestore database backend.
            </p>
          </div>
          <div className="space-y-2">
            <h3 className="text-sm font-bold text-slate-900">2. Zero Tolerance for Data Loss</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Production data is treated as mission-critical. Strict tenant isolation ensures Company A never touches Company B records.
            </p>
          </div>
          <div className="space-y-2">
            <h3 className="text-sm font-bold text-slate-900">3. Practical Field Usability</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Optimized for low-bandwidth 4G connectivity, offline caching, fast supervisor roll-calls, and high readability in bright sunlight.
            </p>
          </div>
        </div>
      </section>

      {/* CTA Footer */}
      <section className="p-8 rounded-3xl bg-[#0A0D14] text-white text-center space-y-4 shadow-xl">
        <h2 className="text-2xl font-display font-bold">Have Questions for Our Leadership?</h2>
        <p className="text-xs text-slate-400 max-w-xl mx-auto">
          Contact our team directly to discuss custom enterprise requirements, API integrations, or regional deployments.
        </p>
        <a
          href="/contact"
          onClick={(e) => handleLinkClick(e, '/contact')}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-mono font-bold text-xs uppercase tracking-wider transition-all"
        >
          Contact Pune Office &rarr;
        </a>
      </section>

    </article>
  );
};
