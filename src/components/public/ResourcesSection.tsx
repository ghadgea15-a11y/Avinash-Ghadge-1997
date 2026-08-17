import React from 'react';
import { 
  BookOpen, 
  Layers, 
  FileText, 
  ShieldCheck, 
  HelpCircle, 
  Sparkles, 
  ArrowRight,
  Download,
  ExternalLink
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { PhaseAScreen } from '../../types';

interface ResourcesSectionProps {
  onNavigate: (screen: PhaseAScreen) => void;
}

export const ResourcesSection: React.FC<ResourcesSectionProps> = ({ onNavigate }) => {
  const { isDark } = useTheme();

  const resources = [
    {
      title: 'Product Overview Guide',
      category: 'Documentation',
      icon: BookOpen,
      desc: 'High-level summary of Log Sheet Muster architecture, operational domain coverage, and client ecosystems.',
      actionText: 'Read Overview',
      hash: '#platform'
    },
    {
      title: 'Platform Architecture',
      category: 'Technical Whitepaper',
      icon: Layers,
      desc: 'In-depth review of the unified Web + Android multi-tenant Firebase backend and real-time synchronization pipelines.',
      actionText: 'Explore Architecture',
      hash: '#platform'
    },
    {
      title: 'Enterprise Feature Guide',
      category: 'Module Specifications',
      icon: FileText,
      desc: 'Complete functional breakdown of all 14 enterprise modules covering HCM, WFM, EAM, SCM, GRC, and BI.',
      actionText: 'View Modules',
      hash: '#modules'
    },
    {
      title: 'Security & Compliance Matrix',
      category: 'Data Protection',
      icon: ShieldCheck,
      desc: 'Details on Firebase authentication, role-based access control, company isolation, and immutable audit logs.',
      actionText: 'Review Security',
      hash: '#security'
    },
    {
      title: 'Interactive Live Sandbox',
      category: 'Interactive Preview',
      icon: Sparkles,
      desc: 'Hands-on simulator for shift muster roll-call, QR patrol checkpoint scans, visitor badges, and incident reporting.',
      actionText: 'Launch Sandbox',
      hash: '#demo'
    },
    {
      title: 'Legal & Policy Documentation',
      category: 'Compliance & Legal',
      icon: FileText,
      desc: 'Privacy Policy, Terms of Service, Data Processing Addendum (DPA), and corporate governance notices.',
      actionText: 'View Legal Policies',
      onClick: () => onNavigate('LEGAL_POLICIES')
    },
  ];

  return (
    <section id="resources" className="py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
          <span className="text-xs font-bold uppercase tracking-widest text-emerald-500 font-mono">
            Knowledge & Governance Hub
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight">
            Enterprise Resources & Documentation
          </h2>
          <p className={`text-sm sm:text-base ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
            Explore technical guides, module specifications, interactive sandboxes, and corporate governance documentation.
          </p>
        </div>

        {/* Resources 6-Card Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {resources.map((res, idx) => {
            const Icon = res.icon;
            return (
              <div 
                key={idx}
                className={`p-6 rounded-3xl border transition-all duration-200 flex flex-col justify-between group hover:border-indigo-500/50 ${
                  isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                      {res.category}
                    </span>
                    <div className={`p-2.5 rounded-xl transition group-hover:scale-110 ${
                      isDark ? 'bg-slate-800 text-indigo-400' : 'bg-indigo-50 text-indigo-600'
                    }`}>
                      <Icon className="w-5 h-5" />
                    </div>
                  </div>

                  <h3 className="text-base font-bold text-slate-900 dark:text-white mb-2">
                    {res.title}
                  </h3>
                  <p className={`text-xs leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                    {res.desc}
                  </p>
                </div>

                <div className="pt-5 mt-5 border-t border-slate-800/60">
                  {res.onClick ? (
                    <button
                      onClick={res.onClick}
                      className="w-full flex items-center justify-between text-xs font-bold text-indigo-400 hover:text-indigo-300 transition cursor-pointer"
                    >
                      <span>{res.actionText}</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                  ) : (
                    <a
                      href={res.hash}
                      className="w-full flex items-center justify-between text-xs font-bold text-indigo-400 hover:text-indigo-300 transition"
                    >
                      <span>{res.actionText}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
};
