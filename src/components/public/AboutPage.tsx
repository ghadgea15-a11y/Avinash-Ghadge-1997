import React from 'react';
import { PhaseAScreen } from '../../types';
import { COMPANY_INFO } from '../../utils/seo';
import { Building2, MapPin, User, CheckCircle2 } from 'lucide-react';

export const AboutPage: React.FC<{ onNavigate: (screen: PhaseAScreen) => void }> = ({ onNavigate }) => {
  return (
    <div className="space-y-24">
      <section className="relative pt-20 pb-12 overflow-hidden">
        <div className="absolute inset-0 bg-blue-600/5 blur-[100px] rounded-full w-[800px] h-[400px] left-1/2 -translate-x-1/2 -top-20" />
        <div className="max-w-4xl mx-auto px-4 relative z-10 text-center space-y-6">
          <div className="inline-flex items-center justify-center px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 mb-4 font-mono text-xs uppercase tracking-wider font-bold">
            <Building2 className="w-4 h-4 mr-2 inline" />
            ABOUT {COMPANY_INFO.legalName.toUpperCase()}
          </div>
          <h1 className="text-4xl md:text-6xl font-black text-white tracking-tight leading-tight">
            Empowering India's Operational & Field Workforces
          </h1>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Log Sheet Muster is built and maintained by Shourya Enterprises Pvt. Ltd. Our mission is to eliminate paper-based operational friction and bring modern digital governance to facility management, security, and industrial workforces.
          </p>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">
        <div className="grid md:grid-cols-2 gap-8">
          
          <div className="p-8 rounded-3xl bg-white/5 border border-white/10 space-y-6 backdrop-blur-sm">
            <div className="w-12 h-12 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center border border-blue-500/30">
              <User className="w-6 h-6" />
            </div>
            <h2 className="text-2xl font-bold text-white">Leadership & Vision</h2>
            <p className="text-slate-400 leading-relaxed">
              Founded by <strong>{COMPANY_INFO.founder}</strong>, Shourya Enterprises Pvt. Ltd. focuses on practical, real-world operational software tailored to the stringent compliance and execution requirements of Indian enterprise environments.
            </p>
            <div className="p-4 rounded-xl bg-black/40 border border-white/5 text-sm font-mono text-slate-300 space-y-2">
              <div><strong className="text-blue-400">Company:</strong> {COMPANY_INFO.legalName}</div>
              <div><strong className="text-blue-400">Founder:</strong> {COMPANY_INFO.founder}</div>
              <div><strong className="text-blue-400">Platform:</strong> Log Sheet Muster SaaS</div>
            </div>
          </div>

          <div className="p-8 rounded-3xl bg-white/5 border border-white/10 space-y-6 backdrop-blur-sm">
            <div className="w-12 h-12 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center border border-blue-500/30">
              <MapPin className="w-6 h-6" />
            </div>
            <h2 className="text-2xl font-bold text-white">Headquarters & Operations</h2>
            <p className="text-slate-400 leading-relaxed">
              Headquartered in Pune's industrial and IT hub, our solutions architecture and engineering teams serve clients across Maharashtra and India.
            </p>
            <div className="p-4 rounded-xl bg-black/40 border border-white/5 text-sm font-mono text-slate-300 space-y-2">
              <div><strong className="text-blue-400">Address:</strong> {COMPANY_INFO.address.streetAddress}, {COMPANY_INFO.address.addressLocality}, {COMPANY_INFO.address.addressRegion} - {COMPANY_INFO.address.postalCode}</div>
              <div><strong className="text-blue-400">Email:</strong> <a href={`mailto:${COMPANY_INFO.email}`} className="text-white hover:text-blue-400 transition-colors">{COMPANY_INFO.email}</a></div>
              <div><strong className="text-blue-400">Direct Contact:</strong> <a href={`tel:${COMPANY_INFO.telephone}`} className="text-white hover:text-blue-400 transition-colors">{COMPANY_INFO.telephone}</a></div>
            </div>
          </div>

        </div>

        <div className="mt-16 bg-white/5 border border-white/10 rounded-3xl p-8 sm:p-12 space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-4">
            <h2 className="text-3xl font-bold text-white">Our Core Engineering Principles</h2>
            <p className="text-slate-400">We build mission-critical software for the physical world.</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { title: "Single Source of Truth", desc: "No fragmented spreadsheets. Attendance, payroll, guard tours, and log sheets share one atomic Firestore database backend." },
              { title: "Zero Data Loss", desc: "Production data is treated as mission-critical. Strict tenant isolation ensures Company A never touches Company B records." },
              { title: "Practical Field Usability", desc: "Optimized for low-bandwidth 4G connectivity, offline caching, fast supervisor roll-calls, and high readability in bright sunlight." }
            ].map(principle => (
              <div key={principle.title} className="space-y-4 text-center md:text-left">
                <div className="w-10 h-10 mx-auto md:mx-0 rounded-full bg-blue-500/10 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5 text-blue-400" />
                </div>
                <h3 className="text-lg font-bold text-white">{principle.title}</h3>
                <p className="text-slate-400 leading-relaxed">{principle.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};
