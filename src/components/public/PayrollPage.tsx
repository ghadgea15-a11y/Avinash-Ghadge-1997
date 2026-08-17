import React from 'react';
import { 
  CreditCard, 
  FileText, 
  Download, 
  ShieldCheck, 
  Building2, 
  CheckCircle2, 
  ArrowRight, 
  Calculator,
  Percent,
  Banknote
} from 'lucide-react';
import { PhaseAScreen } from '../../types';
import { navigateToUrl } from '../../utils/publicRouter';

interface PayrollPageProps {
  onNavigate: (screen: PhaseAScreen) => void;
}

export const PayrollPage: React.FC<PayrollPageProps> = ({ onNavigate }) => {
  const handleLinkClick = (e: React.MouseEvent<HTMLAnchorElement>, path: string) => {
    e.preventDefault();
    navigateToUrl(path);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <article className="space-y-16 py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      
      {/* Hero Section */}
      <section aria-labelledby="payroll-hero-heading" className="text-center space-y-6 max-w-4xl mx-auto pt-6 pb-4">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-mono font-bold tracking-wide">
          <CreditCard className="w-3.5 h-3.5 text-emerald-600" />
          INDIAN STATUTORY PAYROLL & BANK DISBURSEMENT ENGINE
        </div>

        <h1 id="payroll-hero-heading" className="text-3xl sm:text-4xl lg:text-5xl font-display font-bold text-[#0A0D14] tracking-tight leading-tight">
          Enterprise Statutory Payroll Software with One-Click Bank Payouts
        </h1>

        <p className="text-base sm:text-lg text-slate-600 leading-relaxed">
          Automate complex workforce salary processing in minutes. Log Sheet Muster connects Form II attendance muster directly into EPF, ESIC, State Professional Tax (PT), Overtime multipliers, advance deductions, and HDFC/SBI/ICICI bank disbursement files.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
          <a
            href="/contact"
            onClick={(e) => handleLinkClick(e, '/contact')}
            className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-[#0A0D14] hover:bg-slate-800 text-white text-xs font-bold font-mono uppercase tracking-wider transition-all shadow-md flex items-center justify-center gap-2"
          >
            Schedule Payroll Demo
            <ArrowRight className="w-4 h-4" />
          </a>
          <a
            href="/attendance-management"
            onClick={(e) => handleLinkClick(e, '/attendance-management')}
            className="w-full sm:w-auto px-6 py-3.5 rounded-xl border border-slate-300 hover:border-slate-400 bg-white text-slate-800 hover:bg-slate-50 text-xs font-bold font-mono uppercase tracking-wider transition-all shadow-xs"
          >
            Explore Attendance Muster &rarr;
          </a>
        </div>
      </section>

      {/* Statutory Compliances Grid */}
      <section aria-labelledby="statutory-heading" className="space-y-8">
        <div className="text-center space-y-2 max-w-2xl mx-auto">
          <h2 id="statutory-heading" className="text-2xl sm:text-3xl font-display font-bold text-[#0A0D14]">
            100% Compliant with Indian Statutory Wage Regulations
          </h2>
          <p className="text-xs sm:text-sm text-slate-600">
            Pre-configured rules for EPF, ESIC, Professional Tax, Minimum Wages, and Labor Welfare Fund.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 rounded-2xl bg-white border border-[#E8E7E3] space-y-3 shadow-xs">
            <div className="text-xs font-mono font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded inline-block">
              EPF & EPS (12%)
            </div>
            <h3 className="text-base font-bold text-[#0A0D14]">Employees' Provident Fund</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Automated 12% employee contribution, employer PF & EPS breakdown, statutory wage ceiling caps (₹15,000), and monthly ECR file preparation.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white border border-[#E8E7E3] space-y-3 shadow-xs">
            <div className="text-xs font-mono font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded inline-block">
              ESIC (0.75% / 3.25%)
            </div>
            <h3 className="text-base font-bold text-[#0A0D14]">Employees' State Insurance</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Exact calculations for employee (0.75%) and employer (3.25%) contributions with automatic exemption for gross wages exceeding ₹21,000/month.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white border border-[#E8E7E3] space-y-3 shadow-xs">
            <div className="text-xs font-mono font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded inline-block">
              PROFESSIONAL TAX (PT)
            </div>
            <h3 className="text-base font-bold text-[#0A0D14]">State PT Slabs (Maharashtra)</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Native support for Maharashtra State Professional Tax slab rules (including ₹200 standard and ₹300 February month adjustments) and gender exemptions.
            </p>
          </div>
        </div>
      </section>

      {/* Bank Disbursement Workflow */}
      <section aria-labelledby="bank-heading" className="bg-white border border-[#E8E7E3] rounded-3xl p-8 sm:p-12 space-y-8 shadow-sm">
        <div className="max-w-3xl space-y-2">
          <span className="text-xs font-mono font-bold text-emerald-700 uppercase tracking-widest">
            ONE-CLICK SALARY DISBURSEMENT
          </span>
          <h2 id="bank-heading" className="text-2xl sm:text-3xl font-display font-bold text-[#0A0D14]">
            Export Compatible NEFT / RTGS Bank Batches
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            Generate pre-formatted bank upload files ready for direct corporate banking portal processing (SBI, HDFC, ICICI, Axis, Bank of Maharashtra).
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[
            { title: '1. Lock Monthly Muster', desc: 'Verify roll-calls, approve remaining leaves, and lock final attendance.' },
            { title: '2. Run Payroll Engine', desc: 'Compute gross earnings, overtime, PF/ESI/PT deductions and net pay.' },
            { title: '3. Download Bank File', desc: 'Export formatted CSV/Excel bank batch file for corporate disbursement.' },
            { title: '4. Distribute Payslips', desc: 'Publish password-protected digital PDF payslips to employee mobile portal.' }
          ].map((step) => (
            <div key={step.title} className="p-4 rounded-xl bg-[#FBFBFA] border border-[#E8E7E3] space-y-2">
              <h3 className="text-xs font-bold text-[#0A0D14]">{step.title}</h3>
              <p className="text-[11px] text-slate-600">{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

    </article>
  );
};
