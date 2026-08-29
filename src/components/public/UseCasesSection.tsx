import React, { useState } from 'react';
import { 
  Building2, 
  ShieldCheck, 
  Factory, 
  Building, 
  HeartPulse, 
  Warehouse, 
  Home, 
  GraduationCap, 
  CheckCircle2, 
  ArrowRight,
  Sparkles
} from 'lucide-react';

export const UseCasesSection: React.FC = () => {
  const [activeCategoryIndex, setActiveCategoryIndex] = useState(0);

  const categories = [
    {
      id: 'facility',
      title: 'FACILITY MANAGEMENT',
      icon: Building2,
      subtitle: 'Commercial Towers, Tech Parks & Multi-Tenant Campuses',
      problem: 'Managing 20+ outsourced vendor teams across MEP, housekeeping, and security without unified daily muster or equipment telemetry verification.',
      solution: 'Consolidated attendance roll-calls, DG/HVAC hourly log sheets, breakdown ticket escalation, and client SLA compliance scorecards.',
      outcomes: [
        '99.4% contractor muster roll-call verification',
        'Zero undocumented DG fuel leakages or downtime',
        'Real-time SLA penalty auditing for service vendors'
      ]
    },
    {
      id: 'security',
      title: 'SECURITY SERVICES',
      icon: ShieldCheck,
      subtitle: 'Manned Guarding Agencies & Patrol Operations',
      problem: 'High turnover, ghost guards on night shifts, missed perimeter checkpoints, and slow paper-based incident reporting.',
      solution: 'Sequential QR patrol tours, biometric & geo-tagged shift muster, material inward/outward gate passes, and digital visitor logs.',
      outcomes: [
        '100% verifiable guard patrol route adherence',
        'Elimination of ghost guards on night shifts',
        'Immediate photo-evidence incident escalation'
      ]
    },
    {
      id: 'industrial',
      title: 'INDUSTRIAL & MANUFACTURING',
      icon: Factory,
      subtitle: 'Automotive, Chemical & Heavy Engineering Plants',
      problem: 'Strict safety mandates, hazardous area permits, high-value asset tracking, and continuous 3-shift rotational operations.',
      solution: 'Form II statutory wage muster compliance, daily machinery log sheets, hazardous area access verification, and material gate passes.',
      outcomes: [
        '100% statutory labor register compliance',
        'Full traceability for returnable material gate passes',
        'Preventive maintenance uptime exceeding 99.5%'
      ]
    },
    {
      id: 'corporate',
      title: 'CORPORATE HEADQUARTERS',
      icon: Building,
      subtitle: 'Enterprise Campuses & Financial Institutions',
      problem: 'Complex multi-floor visitor management, executive security, asset custody tracking, and high audit standards.',
      solution: 'Visitor photo badge passes, IT asset QR tagging, executive floor patrol rounds, and centralized multi-branch BI dashboards.',
      outcomes: [
        'Streamlined visitor pre-registration and NDA signing',
        'Zero unreturned IT assets or misplaced custody',
        'Consolidated executive compliance reports'
      ]
    },
    {
      id: 'healthcare',
      title: 'HEALTHCARE & HOSPITALS',
      icon: HeartPulse,
      subtitle: 'Multi-Speciality Hospitals & Medical Centers',
      problem: 'Critical 24/7 HVAC/oxygen plant monitoring, biomedical waste gate passes, and stringent hygiene/housekeeping shift audits.',
      solution: 'Continuous utility equipment logging, strict sanitization checklist verification, and restricted ward security checkpoints.',
      outcomes: [
        'Zero uninterrupted utility or chiller outages',
        'Auditable biomedical waste disposal gate passes',
        'Round-the-clock shift continuity assurance'
      ]
    },
    {
      id: 'warehouse',
      title: 'WAREHOUSING & LOGISTICS',
      icon: Warehouse,
      subtitle: 'Distribution Centers & Supply Hubs',
      problem: 'Massive yard security perimeters, heavy vehicle loading logs, and high volume material inward/outward reconciliation.',
      solution: 'Truck weighbridge gate passes, yard patrol checkpoint routes, and stock consumable inventory tracking.',
      outcomes: [
        'Automated vehicle turnaround time logging',
        'Strict yard perimeter security verification',
        'Instant GRN material receipt synchronization'
      ]
    },
    {
      id: 'residential',
      title: 'RESIDENTIAL TOWNSHIPS',
      icon: Home,
      subtitle: 'Gated Communities & High-Rise Societies',
      problem: 'Unverified domestic staff entry, recurring clubhouse asset damages, and uncoordinated security shift handovers.',
      solution: 'Domestic staff QR pass muster, visitor approval logs, perimeter security patrol routes, and maintenance fee asset registers.',
      outcomes: [
        'Verified domestic staff entry and exit logs',
        'Enhanced resident safety through audited guard patrols',
        'Rapid resolution of resident maintenance tickets'
      ]
    },
    {
      id: 'education',
      title: 'EDUCATION CAMPUSES',
      icon: GraduationCap,
      subtitle: 'Universities, Boarding Schools & Colleges',
      problem: 'Sprawling campus boundaries, student hostel roll-calls, bus fleet tracking, and multi-building facility inspections.',
      solution: 'Hostel evening muster verification, perimeter guard tours, lab equipment QR registers, and visitor passes.',
      outcomes: [
        'Automated student hostel attendance roll-calls',
        'Safe campus perimeter surveillance auditing',
        'Accreditation-ready facility maintenance records'
      ]
    }
  ];

  const activeCategory = categories[activeCategoryIndex];
  const ActiveIcon = activeCategory.icon;

  return (
    <section id="solutions" className="py-24 lg:py-32 bg-white border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
        
        {/* Section Header */}
        <div className="max-w-3xl mx-auto text-center space-y-4">
          <span className="font-mono text-xs font-bold uppercase tracking-widest text-emerald-600">
            Tailored Workflows
          </span>
          <h2 className="font-display text-3xl sm:text-5xl font-extrabold text-black tracking-tight">
            INDUSTRY SOLUTIONS
          </h2>
          <p className="font-body text-sm sm:text-base text-black leading-relaxed">
            Purpose-configured operational blueprints engineered for specialized physical environments.
          </p>
        </div>

        {/* Large Editorial Category Selector & Disclosure */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left: Category Navigation List */}
          <div className="lg:col-span-4 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 p-3 sm:p-4 shadow-sm space-y-1">
            {categories.map((cat, idx) => {
              const isSelected = activeCategoryIndex === idx;
              return (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategoryIndex(idx)}
                  className={`w-full text-left px-4 py-3 rounded-xl transition-all duration-150 flex items-center justify-between cursor-pointer ${
                    isSelected
                      ? 'bg-black text-white shadow-xs'
                      : 'text-black hover:bg-white hover:text-black'
                  }`}
                >
                  <span className="font-display text-xs sm:text-sm font-bold tracking-tight">
                    {cat.title}
                  </span>
                  <ArrowRight className={`w-3.5 h-3.5 ${isSelected ? 'text-emerald-400' : 'text-[#A1A1AA]'}`} />
                </button>
              );
            })}
          </div>

          {/* Right: Rich Workflow Showcase */}
          <div className="lg:col-span-8 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 p-8 sm:p-12 shadow-sm space-y-8">
            
            <div className="flex items-center gap-4 pb-6 border-b border-slate-200">
              <div className="w-12 h-12 rounded-2xl bg-black text-emerald-400 flex items-center justify-center">
                <ActiveIcon className="w-6 h-6" />
              </div>
              <div>
                <span className="font-mono text-xs font-bold text-emerald-600 uppercase">
                  OPERATIONAL BLUEPRINT
                </span>
                <h3 className="font-display text-2xl font-extrabold text-black">
                  {activeCategory.title}
                </h3>
                <span className="font-body text-xs text-slate-600 mt-0.5 block">
                  {activeCategory.subtitle}
                </span>
              </div>
            </div>

            <div className="space-y-6 font-body">
              <div>
                <strong className="font-mono text-xs uppercase text-slate-600 block">
                  OPERATIONAL CHALLENGE
                </strong>
                <p className="text-sm text-black mt-1 leading-relaxed">
                  {activeCategory.problem}
                </p>
              </div>

              <div>
                <strong className="font-mono text-xs uppercase text-slate-600 block">
                  LOG SHEET MUSTER SOLUTION
                </strong>
                <p className="text-sm text-black mt-1 leading-relaxed">
                  {activeCategory.solution}
                </p>
              </div>

              <div className="p-6 rounded-2xl bg-white border border-slate-200 space-y-3">
                <strong className="font-mono text-xs uppercase text-black block">
                  PROVEN BUSINESS OUTCOMES:
                </strong>
                <div className="space-y-2">
                  {activeCategory.outcomes.map((out, i) => (
                    <div key={i} className="flex items-center gap-2.5 text-xs text-black">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                      <span>{out}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

          </div>

        </div>

      </div>
    </section>
  );
};
