import React from 'react';
import { Building2, UserCheck, MapPin, Mail, Phone, Globe, ShieldCheck, CheckCircle2 } from 'lucide-react';

export const AboutSection: React.FC = () => {
  return (
    <section id="about" className="py-24 lg:py-32 bg-[#F4F3EF] border-b border-[#E8E7E3]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
        
        {/* Section Header */}
        <div className="max-w-3xl mx-auto text-center space-y-4">
          <span className="font-mono text-xs font-bold uppercase tracking-widest text-emerald-600">
            Corporate Ownership
          </span>
          <h2 className="font-display text-3xl sm:text-5xl font-extrabold text-[#0A0D14] tracking-tight">
            ABOUT LOG SHEET MUSTER
          </h2>
          <p className="font-body text-sm sm:text-base text-[#52525B] leading-relaxed">
            Built with a clear vision: replacing manual paperwork, disconnected registers, and unverified attendance with a unified enterprise operations platform.
          </p>
        </div>

        {/* Corporate Profile Card */}
        <div className="max-w-4xl mx-auto bg-white rounded-3xl border border-[#E7E6E1] p-8 sm:p-12 shadow-sm space-y-8 font-body">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center pb-8 border-b border-[#E8E7E3]">
            <div>
              <span className="font-mono text-xs font-bold text-emerald-600 uppercase">
                ENTERPRISE DEVELOPER & OWNER
              </span>
              <h3 className="font-display text-2xl font-extrabold text-[#0A0D14] mt-1">
                Shourya Enterprises Pvt. Ltd.
              </h3>
              <p className="text-xs sm:text-sm text-[#52525B] mt-2 leading-relaxed">
                Dedicated to engineering robust, scalable, and audit-compliant workforce and facility management technology for physical enterprise operations.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-[#FBFBFA] border border-[#E8E7E3] space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-[#71717A]">Director / Owner:</span>
                <strong className="text-[#0A0D14] font-semibold">Avinash Shivaji Ghadge</strong>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#71717A]">Corporate Headquarters:</span>
                <strong className="text-[#0A0D14] font-semibold">Ajanthanagar, Chinchwad, Pune</strong>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#71717A]">State & Country:</span>
                <strong className="text-[#0A0D14] font-semibold">Maharashtra, India (411019)</strong>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-xs text-[#52525B]">
            <div className="space-y-1">
              <div className="flex items-center gap-2 font-display font-bold text-[#0A0D14]">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Zero Compromise Security</span>
              </div>
              <p>End-to-end data isolation, role-based access, and immutable audit logs.</p>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2 font-display font-bold text-[#0A0D14]">
                <Building2 className="w-4 h-4 text-emerald-600" />
                <span>Field-Proven Precision</span>
              </div>
              <p>Engineered to withstand rugged field conditions and basement operations.</p>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2 font-display font-bold text-[#0A0D14]">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Statutory Compliance</span>
              </div>
              <p>Built directly around Indian labor statutory Form II and wage regulations.</p>
            </div>
          </div>

        </div>

      </div>
    </section>
  );
};
