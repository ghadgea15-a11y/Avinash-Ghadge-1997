import React from 'react';
import { 
  CheckCircle2, 
  ArrowRight, 
  Sparkles, 
  ShieldCheck, 
  Building2, 
  Zap, 
  HelpCircle
} from 'lucide-react';
import { PhaseAScreen } from '../../types';
import { navigateToUrl } from '../../utils/publicRouter';

interface PricingPageProps {
  onNavigate: (screen: PhaseAScreen) => void;
}

export const PricingPage: React.FC<PricingPageProps> = ({ onNavigate }) => {
  const handleLinkClick = (e: React.MouseEvent<HTMLAnchorElement>, path: string) => {
    e.preventDefault();
    navigateToUrl(path);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const plans = [
    {
      name: 'Starter Agency',
      tagline: 'Ideal for small security agencies and local service contractors.',
      price: '₹2,499',
      period: '/ month',
      badge: 'COMMENCING TIER',
      features: [
        'Up to 50 active employees/guards',
        'Form II Attendance Muster Roll-Call',
        'Basic QR Checkpoint Patrols',
        'Digital Employee ID Badges',
        'Leave Management System',
        'Standard Email Support',
        'Multi-tenant data isolation'
      ],
      ctaText: 'Start with Starter',
      popular: false
    },
    {
      name: 'Professional Enterprise',
      tagline: 'Designed for growing facility & security operators with multi-site operations.',
      price: '₹5,999',
      period: '/ month',
      badge: 'MOST POPULAR',
      features: [
        'Up to 200 active employees/guards',
        'Full HRMS + Form II Muster Registers',
        'Automated Indian Statutory Payroll Engine',
        'PF, ESIC, State PT & Bank Batch Files',
        '24/7 Rotational Shift Scheduler',
        'QR Guard Patrol Tours with GPS Tracking',
        'Digital Visitor Gate Pass & Material RGP',
        'PPM Maintenance Work Orders',
        'Priority Phone & WhatsApp Support'
      ],
      ctaText: 'Deploy Professional',
      popular: true
    },
    {
      name: 'Industrial Scale',
      tagline: 'For large enterprises, manufacturing plants, and multi-state workforce deployments.',
      price: 'Custom',
      period: 'tailored pricing',
      badge: 'UNLIMITED SCALE',
      features: [
        'Unlimited employees & multi-branch hierarchy',
        'Dedicated Cloud Firestore Instance',
        'Custom Labor Law compliance templates',
        'Biometric Device API Sync',
        'Executive MIS & Custom Report Builder',
        'Dedicated Solution Architect & SLA',
        'Custom On-Premise / Hybrid Deployment options'
      ],
      ctaText: 'Request Custom Proposal',
      popular: false
    }
  ];

  return (
    <article className="space-y-16 py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      
      {/* Hero Section */}
      <section aria-labelledby="pricing-hero-heading" className="text-center space-y-6 max-w-4xl mx-auto pt-6 pb-4">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-mono font-bold tracking-wide">
          <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
          TRANSPARENT ENTERPRISE PRICING
        </div>

        <h1 id="pricing-hero-heading" className="text-3xl sm:text-4xl lg:text-5xl font-display font-bold text-black tracking-tight leading-tight">
          Transparent, Scalable Plans for Every Stage of Growth
        </h1>

        <p className="text-base sm:text-lg text-slate-600 dark:text-slate-400 leading-relaxed">
          No hidden onboarding fees or surprise charges. All plans include secure cloud infrastructure, unlimited customer sites, role-based security, and ongoing statutory updates.
        </p>
      </section>

      {/* Pricing Cards Grid */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch">
        {plans.map((plan) => (
          <div 
            key={plan.name}
            className={`rounded-3xl p-8 flex flex-col justify-between space-y-8 relative transition-all ${
              plan.popular 
                ? 'bg-black text-white border-2 border-emerald-500 shadow-2xl ring-4 ring-emerald-500/10' 
                : 'bg-white text-black border border-slate-200 shadow-sm'
            }`}
          >
            {plan.popular && (
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3.5 py-1 rounded-full bg-emerald-500 text-slate-950 font-mono font-bold text-[11px] tracking-widest uppercase shadow-md">
                RECOMMENDED BY OPERATORS
              </div>
            )}

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className={`text-xs font-mono font-bold tracking-wider uppercase px-2.5 py-1 rounded-md ${
                  plan.popular ? 'bg-slate-800 text-emerald-400' : 'bg-slate-100 text-slate-900'
                }`}>
                  {plan.badge}
                </span>
              </div>

              <h2 className="text-2xl font-display font-bold">{plan.name}</h2>
              <p className={`text-xs leading-relaxed ${plan.popular ? 'text-slate-400' : 'text-slate-600'}`}>
                {plan.tagline}
              </p>

              <div className="pt-4 pb-2 border-b border-slate-200 dark:border-slate-800 flex items-baseline gap-2">
                <span className="text-3xl sm:text-4xl font-display font-bold">{plan.price}</span>
                <span className={`text-xs font-mono ${plan.popular ? 'text-slate-400' : 'text-slate-500'}`}>{plan.period}</span>
              </div>

              <ul className="space-y-3 pt-4 text-xs">
                {plan.features.map((feat) => (
                  <li key={feat} className="flex items-start gap-2.5">
                    <CheckCircle2 className={`w-4 h-4 shrink-0 mt-0.5 ${plan.popular ? 'text-emerald-400' : 'text-emerald-600'}`} />
                    <span className={plan.popular ? 'text-slate-300' : 'text-slate-900'}>{feat}</span>
                  </li>
                ))}
              </ul>
            </div>

            <a
              href="/contact"
              onClick={(e) => handleLinkClick(e, '/contact')}
              className={`w-full py-3.5 rounded-xl font-mono font-bold text-xs uppercase tracking-wider text-center transition-all flex items-center justify-center gap-2 ${
                plan.popular 
                  ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-md' 
                  : 'bg-black hover:bg-slate-800 text-white shadow-xs'
              }`}
            >
              {plan.ctaText}
              <ArrowRight className="w-4 h-4" />
            </a>
          </div>
        ))}
      </section>

    </article>
  );
};
