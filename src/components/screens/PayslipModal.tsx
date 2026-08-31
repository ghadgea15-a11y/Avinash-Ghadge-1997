import React, { useState } from 'react';
import { X, Printer, Building2, User, Calendar, CheckCircle2, ShieldCheck, Hash, Phone, Mail, Globe } from 'lucide-react';
import { PayrollRecord, CompanyTenant } from '../../types';

interface PayslipModalProps {
  record: PayrollRecord;
  company: CompanyTenant;
  onClose: () => void;
}

// Convert numbers to Indian Rupees in words
function numberToWords(num: number): string {
  if (!num || num === 0) return 'Zero Rupees Only';
  const a = [
    '', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ',
    'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '
  ];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function inWords(n: number): string {
    if (n < 20) return a[n];
    const digit = n % 10;
    return b[Math.floor(n / 10)] + (digit !== 0 ? ' ' + a[digit] : ' ');
  }

  let str = '';
  const crore = Math.floor(num / 10000000);
  num %= 10000000;
  const lakh = Math.floor(num / 100000);
  num %= 100000;
  const thousand = Math.floor(num / 1000);
  num %= 1000;
  const hundred = Math.floor(num / 100);
  num %= 100;

  if (crore > 0) str += inWords(crore) + 'Crore ';
  if (lakh > 0) str += inWords(lakh) + 'Lakh ';
  if (thousand > 0) str += inWords(thousand) + 'Thousand ';
  if (hundred > 0) str += inWords(hundred) + 'Hundred ';
  if (num > 0) {
    if (str !== '') str += 'and ';
    str += inWords(num);
  }
  return str.trim() + ' Rupees Only';
}

export const PayslipModal: React.FC<PayslipModalProps> = ({ record, company, onClose }) => {
  const [logoLoadFailed, setLogoLoadFailed] = useState(false);

  const handlePrint = () => {
    window.print();
  };

  // Dynamic Tenant Branding Extractions with safe fallbacks
  const brandName = company?.brandName || company?.companyLegalName || company?.name || 'Corporate Employer';
  const legalName = company?.companyLegalName || company?.name || company?.brandName || 'Authorized Corporate Entity';
  const companyCode = (company?.companyCode || (company as any)?.code || 'EMP').toUpperCase();
  const primaryColor = company?.primaryColorHex && /^#[0-9A-F]{6}$/i.test(company.primaryColorHex) ? company.primaryColorHex : '#4f46e5';
  
  const addressParts = [company?.address, company?.city, company?.state, company?.country].filter(Boolean);
  const fullAddress = addressParts.length > 0 ? addressParts.join(', ') : '';

  // Monogram initials for graceful fallback
  const getInitials = (name: string) => {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.slice(0, 2).toUpperCase() || 'CO';
  };

  const calc = record.calculations || ({} as any);
  const earnings = calc.earnings || {};
  const deductions = calc.deductions || {};

  // Safe extraction with legacy / fallback calculation support
  const basic = earnings.basic ?? (calc as any).basicPay ?? 0;
  const hra = earnings.hra ?? (calc as any).hra ?? 0;
  const overtimePay = earnings.overtimePay ?? 0;
  const otherAllowances = earnings.otherAllowances ?? (calc as any).allowances ?? 0;
  const grossPay = calc.totalGross ?? (basic + hra + overtimePay + otherAllowances);

  const pf = deductions.pf ?? 0;
  const esic = deductions.esic ?? 0;
  const pt = deductions.pt ?? 0;
  const tds = deductions.tds ?? (calc as any).taxDeducted ?? 0;
  const lopDeduction = deductions.lopDeduction ?? (calc as any).unpaidLeavePenalty ?? 0;
  const advanceDeduction = deductions.advanceDeduction ?? 0;
  const totalDeductions = calc.totalDeductions ?? (pf + esic + pt + tds + lopDeduction + advanceDeduction);

  const netPay = calc.netPay ?? Math.max(0, grossPay - totalDeductions);
  const payableDays = calc.payableDays ?? 30;
  const lopDays = calc.lopDays ?? 0;

  const monthName = new Date(record.year, record.month - 1).toLocaleString('default', { month: 'long', year: 'numeric' });
  const voucherToken = `${companyCode}-PAY-${record.year}${String(record.month).padStart(2, '0')}-${(record.id || 'REC').slice(-6).toUpperCase()}`;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 print:p-0 print:bg-white print:static print:flex-none print:inset-auto overflow-y-auto">
      <div className="bg-white text-slate-900 w-full max-w-4xl max-h-[92vh] overflow-y-auto rounded-2xl shadow-2xl print:shadow-none print:rounded-none print:h-auto print:max-h-none print:overflow-visible my-auto border border-slate-200 print:border-none">
        
        {/* Modal Action Header - Hidden in Print */}
        <div className="sticky top-0 bg-slate-900 text-white px-6 py-4 flex items-center justify-between rounded-t-2xl print:hidden z-10">
          <div className="flex items-center gap-3">
            <ShieldCheck className="w-5 h-5 text-indigo-400" />
            <div>
              <h2 className="font-bold text-base tracking-wide">Enterprise Salary Voucher & Payslip</h2>
              <p className="text-xs text-slate-400">Ref: {voucherToken} • {record.employeeName}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-all text-sm font-semibold shadow-md active:scale-95 cursor-pointer"
            >
              <Printer className="w-4 h-4" /> Print / Save PDF
            </button>
            <button
              onClick={onClose}
              className="p-2 bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Document Body */}
        <div className="p-8 md:p-12 print:p-6 space-y-8 bg-white text-slate-900">
          
          {/* Header Section: Dynamic Tenant Branding */}
          <div className="flex flex-col md:flex-row justify-between items-start border-b-2 pb-6 gap-6" style={{ borderColor: primaryColor }}>
            <div className="space-y-2 max-w-md">
              {company?.logoUrl && !logoLoadFailed ? (
                <div className="mb-2">
                  <img 
                    src={company.logoUrl} 
                    alt={brandName} 
                    className="h-14 max-w-[220px] object-contain"
                    referrerPolicy="no-referrer"
                    onError={() => setLogoLoadFailed(true)} 
                  />
                </div>
              ) : (
                <div className="flex items-center gap-3 mb-2">
                  <div 
                    className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-black text-lg shadow-sm"
                    style={{ backgroundColor: primaryColor }}
                  >
                    {getInitials(brandName)}
                  </div>
                  <div>
                    <h3 className="font-bold text-base leading-tight text-slate-900">{brandName}</h3>
                    <p className="text-[11px] text-slate-500 font-mono">Code: {companyCode}</p>
                  </div>
                </div>
              )}

              <h1 className="text-2xl font-bold font-serif leading-tight" style={{ color: primaryColor }}>
                {legalName}
              </h1>

              {fullAddress && (
                <p className="text-xs text-slate-600 leading-relaxed">
                  {fullAddress}
                </p>
              )}

              <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-500 pt-1">
                {company?.email && (
                  <span className="flex items-center gap-1">
                    <Mail className="w-3 h-3 text-slate-400" /> {company.email}
                  </span>
                )}
                {company?.phone && (
                  <span className="flex items-center gap-1">
                    <Phone className="w-3 h-3 text-slate-400" /> {company.phone}
                  </span>
                )}
                {company?.websiteUrl && (
                  <span className="flex items-center gap-1">
                    <Globe className="w-3 h-3 text-slate-400" /> {company.websiteUrl}
                  </span>
                )}
              </div>

              {company?.tagline && (
                <p className="text-xs italic text-slate-500 pt-1 border-t border-slate-100">
                  {company.tagline}
                </p>
              )}
            </div>

            {/* Right: Period & Voucher Details */}
            <div className="text-left md:text-right space-y-1.5 shrink-0">
              <div className="inline-block px-3 py-1 bg-slate-100 rounded-md text-xs font-bold uppercase tracking-widest text-slate-700">
                Official Salary Slip
              </div>
              <h2 className="text-2xl font-black text-slate-800 tracking-tight mt-1">{monthName}</h2>
              <p className="text-xs text-slate-500 font-mono">Voucher Ref: {voucherToken}</p>
              <p className="text-xs text-emerald-700 font-semibold flex items-center md:justify-end gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Status: {record.status || 'PROCESSED'}
              </p>
            </div>
          </div>

          {/* Employee & Attendance Overview Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs">
            <div>
              <p className="text-slate-500 uppercase font-semibold tracking-wider">Employee Name</p>
              <p className="font-bold text-sm text-slate-900 mt-0.5">{record.employeeName || 'N/A'}</p>
            </div>
            <div>
              <p className="text-slate-500 uppercase font-semibold tracking-wider">Employee Code</p>
              <p className="font-mono font-bold text-sm text-slate-800 mt-0.5">{record.employeeId || 'N/A'}</p>
            </div>
            <div>
              <p className="text-slate-500 uppercase font-semibold tracking-wider">Payable Days</p>
              <p className="font-bold text-sm text-emerald-700 mt-0.5">{payableDays} Days</p>
            </div>
            <div>
              <p className="text-slate-500 uppercase font-semibold tracking-wider">Loss of Pay (LOP)</p>
              <p className={`font-bold text-sm mt-0.5 ${lopDays > 0 ? 'text-rose-600' : 'text-slate-700'}`}>
                {lopDays} {lopDays === 1 ? 'Day' : 'Days'}
              </p>
            </div>
          </div>

          {/* Detailed Earnings & Deductions Breakdown Table */}
          <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <div className="grid grid-cols-2 bg-slate-100 text-slate-700 font-bold uppercase text-xs tracking-wider divide-x divide-slate-200 border-b border-slate-200">
              <div className="p-3.5 flex justify-between items-center">
                <span>Earnings (A)</span>
                <span className="text-[10px] text-slate-500">Amount (₹)</span>
              </div>
              <div className="p-3.5 flex justify-between items-center">
                <span>Deductions (B)</span>
                <span className="text-[10px] text-slate-500">Amount (₹)</span>
              </div>
            </div>

            <div className="grid grid-cols-2 divide-x divide-slate-200 text-sm">
              {/* Earnings Column */}
              <div className="p-4 space-y-3 bg-white">
                <div className="flex justify-between items-center py-1 border-b border-slate-100">
                  <span className="text-slate-700">Basic Salary</span>
                  <span className="font-mono font-semibold text-slate-900">₹{basic.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-slate-100">
                  <span className="text-slate-700">House Rent Allowance (HRA)</span>
                  <span className="font-mono font-semibold text-slate-900">₹{hra.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-slate-100">
                  <span className="text-slate-700">Overtime Compensation</span>
                  <span className="font-mono font-semibold text-slate-900">₹{overtimePay.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="text-slate-700">Special & Other Allowances</span>
                  <span className="font-mono font-semibold text-slate-900">₹{otherAllowances.toLocaleString('en-IN')}</span>
                </div>
              </div>

              {/* Deductions Column */}
              <div className="p-4 space-y-3 bg-white">
                <div className="flex justify-between items-center py-1 border-b border-slate-100">
                  <div>
                    <span className="text-slate-700">Provident Fund (PF - 12%)</span>
                    {(calc.isEpsExempt || calc.epsExemptionFlag || deductions.epsExemptionApplied) && (
                      <span className="block text-[10px] text-amber-700 font-semibold mt-0.5">
                        {calc.epsExemptionFlag || deductions.epsExemptionNote || 'STAT-AGE-58: EPS Exemption Applied (Age ≥ 58)'}
                      </span>
                    )}
                  </div>
                  <span className="font-mono font-semibold text-slate-900">₹{pf.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-slate-100">
                  <span className="text-slate-700">Employee State Insurance (ESIC)</span>
                  <span className="font-mono font-semibold text-slate-900">₹{esic.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-slate-100">
                  <span className="text-slate-700">Professional Tax (PT)</span>
                  <span className="font-mono font-semibold text-slate-900">₹{pt.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-slate-100">
                  <span className="text-slate-700">Income Tax (TDS)</span>
                  <span className="font-mono font-semibold text-slate-900">₹{tds.toLocaleString('en-IN')}</span>
                </div>
                {lopDeduction > 0 && (
                  <div className="flex justify-between items-center py-1 border-b border-slate-100 text-rose-600">
                    <span>Loss of Pay Penalty</span>
                    <span className="font-mono font-semibold">₹{lopDeduction.toLocaleString('en-IN')}</span>
                  </div>
                )}
                {advanceDeduction > 0 && (
                  <div className="flex justify-between items-center py-1 text-slate-700">
                    <span>Salary Advance Recovery</span>
                    <span className="font-mono font-semibold">₹{advanceDeduction.toLocaleString('en-IN')}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Totals Row */}
            <div className="grid grid-cols-2 bg-slate-50 font-bold divide-x divide-slate-200 border-t border-slate-200 text-sm">
              <div className="p-4 flex justify-between items-center">
                <span className="text-slate-800">Total Gross Earnings (A)</span>
                <span className="font-mono text-base text-slate-900">₹{grossPay.toLocaleString('en-IN')}</span>
              </div>
              <div className="p-4 flex justify-between items-center">
                <span className="text-slate-800">Total Deductions (B)</span>
                <span className="font-mono text-base text-rose-600">₹{totalDeductions.toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>

          {/* Net Pay Callout */}
          <div 
            className="p-6 rounded-2xl border-2 flex flex-col md:flex-row justify-between items-start md:items-center gap-4" 
            style={{ 
              backgroundColor: `${primaryColor}10`, 
              borderColor: `${primaryColor}40` 
            }}
          >
            <div className="space-y-1">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-600">Net Take-Home Salary (A - B)</p>
              <p className="text-xs text-slate-500 font-medium italic">
                In Words: <span className="font-semibold text-slate-800 not-italic">{numberToWords(netPay)}</span>
              </p>
            </div>
            <div className="text-right">
              <span className="text-3xl font-black tracking-tight" style={{ color: primaryColor }}>
                ₹{netPay.toLocaleString('en-IN')}
              </span>
            </div>
          </div>

          {/* Signatures & Formal Declaration */}
          <div className="pt-10 grid grid-cols-2 gap-12 text-xs border-t border-slate-200">
            <div className="space-y-8">
              <p className="text-slate-400 uppercase font-semibold tracking-wider">Employee Signature</p>
              <div className="border-b border-dashed border-slate-300 w-48" />
              <p className="text-slate-500">Date: _______________</p>
            </div>
            <div className="space-y-8 text-right flex flex-col items-end">
              <p className="text-slate-400 uppercase font-semibold tracking-wider">Authorized Signatory / Payroll Dept</p>
              <div className="border-b border-dashed border-slate-300 w-48" />
              <p className="text-slate-500">For {legalName}</p>
            </div>
          </div>

          {/* Footer Note */}
          <div className="text-center text-[11px] text-slate-400 pt-4 border-t border-slate-100">
            This is a confidential computer-generated salary voucher issued by {legalName}. Valid without physical signature under digital payroll record provisions.
          </div>

        </div>
      </div>
    </div>
  );
};
