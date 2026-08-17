import React, { useState } from 'react';
import { ChevronDown, HelpCircle } from 'lucide-react';

export const FaqSection: React.FC = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const faqs = [
    {
      q: 'How does Log Sheet Muster enforce guard patrol accountability?',
      a: 'Log Sheet Muster utilizes cryptographically generated QR code checkpoints positioned at physical site locations. Guards scan each checkpoint using the Android app, which records the exact GPS coordinates, timestamp, and device ID, comparing it against the defined route sequence and time limits.'
    },
    {
      q: 'Does the mobile application work in basement areas with zero cellular signal?',
      a: 'Yes. The Android application features offline queue resilience. When guards or technicians log muster roll-calls, patrol checkpoints, or DG set readings in underground basements, records are encrypted locally and automatically synchronized as soon as network connectivity is restored.'
    },
    {
      q: 'How is company data isolated in the multi-tenant architecture?',
      a: 'Tenant isolation is enforced strictly at the database security rules layer. Every document, query, and session token is cryptographically partitioned by company ID, guaranteeing that Company A can never access, query, or view data from Company B.'
    },
    {
      q: 'Can we generate statutory Form II Muster Registers for labor compliance?',
      a: 'Yes. Log Sheet Muster provides one-click export of statutory Form II attendance registers, complete with daily employee muster status, overtime hours, and wage calculations formatted to meet statutory labor inspection requirements.'
    },
    {
      q: 'What equipment types are supported in the operations log sheet module?',
      a: 'The operations module supports Diesel Generator (DG) sets, HVAC chillers, transformers, water treatment and sewage plants (WTP/STP), fire fighting pumps, and electrical distribution panels with customizable parameter thresholds and violation alarms.'
    },
    {
      q: 'How does the system prevent ghost workers on shift rosters?',
      a: 'Muster roll-calls require GPS geofencing verification within the authorized site perimeter (typically 150m) and supervisor authentication, preventing attendance marking from unauthorized remote locations.'
    },
    {
      q: 'Is there any software installation required for administrative users?',
      a: 'No. Administrative users, HR personnel, and operations executives access the full Log Sheet Muster Web Workstation through standard modern web browsers (Chrome, Firefox, Safari, Edge) without installing any local software.'
    },
    {
      q: 'How do material gate passes handle returnable versus non-returnable goods?',
      a: 'The system provides dedicated workflows for Inward, Outward Returnable (with expected return date tracking and auto-reminders), and Non-Returnable goods, capturing vehicle numbers, driver IDs, and digital security gate sign-offs.'
    },
    {
      q: 'Can we configure multi-level approval hierarchies for leave and expenses?',
      a: 'Yes. The Business Process Management (BPM) module enables configurable approval hierarchies (e.g., Site Supervisor → Operations Manager → Company Admin) with automated time-based escalations if requests remain pending.'
    },
    {
      q: 'How quickly can Log Sheet Muster be deployed across our facilities?',
      a: 'Standard enterprise onboarding takes less than 48 hours. Sites, employee records, QR checkpoints, and equipment parameters can be bulk imported via CSV templates, enabling immediate field rollout.'
    }
  ];

  return (
    <section className="py-24 lg:py-32 bg-[#FBFBFA] border-b border-[#E8E7E3]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
        
        {/* Section Header */}
        <div className="text-center space-y-4">
          <span className="font-mono text-xs font-bold uppercase tracking-widest text-emerald-600">
            Frequently Asked Questions
          </span>
          <h2 className="font-display text-3xl sm:text-5xl font-extrabold text-[#0A0D14] tracking-tight">
            FREQUENTLY ASKED QUESTIONS
          </h2>
          <p className="font-body text-sm sm:text-base text-[#52525B] leading-relaxed max-w-xl mx-auto">
            Everything you need to know about the Log Sheet Muster platform architecture and deployment.
          </p>
        </div>

        {/* Minimal Accordion List */}
        <div className="divide-y divide-[#E8E7E3] border-y border-[#E8E7E3]">
          {faqs.map((faq, idx) => {
            const isOpen = openIndex === idx;
            return (
              <div key={idx} className="py-6">
                <button
                  onClick={() => setOpenIndex(isOpen ? null : idx)}
                  className="w-full flex items-center justify-between text-left gap-4 cursor-pointer group"
                >
                  <span className="font-display text-base sm:text-lg font-bold text-[#0A0D14] group-hover:text-emerald-700 transition-colors">
                    {faq.q}
                  </span>
                  <div className={`w-8 h-8 rounded-full border border-[#D4D4D8] flex items-center justify-center flex-shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180 bg-[#0A0D14] text-white border-[#0A0D14]' : 'bg-white text-[#52525B]'}`}>
                    <ChevronDown className="w-4 h-4" />
                  </div>
                </button>

                {isOpen && (
                  <div className="pt-4 pr-12 font-body text-sm text-[#52525B] leading-relaxed">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
};
