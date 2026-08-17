import React, { useState } from 'react';
import { 
  X, 
  Download, 
  Printer, 
  CheckCircle2, 
  ShieldCheck, 
  Building2, 
  Calendar, 
  User, 
  CreditCard, 
  FileText, 
  Send,
  EyeOff,
  AlertCircle
} from 'lucide-react';
import { SalarySlipRecord, CompanyRecord, UserSession } from '../../types';
import { PayslipService } from '../../services/payslipService';
import { FirestoreService } from '../../services/firestoreService';

interface PayslipModalProps {
  slip: SalarySlipRecord | null;
  company: Partial<CompanyRecord> | null;
  userSession: UserSession;
  onClose: () => void;
  onStatusChange?: () => void;
}

export const PayslipModal: React.FC<PayslipModalProps> = ({
  slip,
  company,
  userSession,
  onClose,
  onStatusChange
}) => {
  const [publishing, setPublishing] = useState(false);
  const [downloading, setDownloading] = useState(false);

  if (!slip) return null;

  const isAdmin = ['SUPER_ADMIN', 'COMPANY_ADMIN', 'HR_ADMIN', 'ADMIN'].includes(userSession.role);
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const monthLabel = monthNames[(slip.month || 1) - 1] || 'Month';
  const companyName = company?.name || company?.legalName || 'LOG SHEET MUSTER ENTERPRISE';
  const verificationHash = slip.verificationHash || PayslipService.generateVerificationCode(slip);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      PayslipService.downloadPDF(slip, company);
      if (company?.companyId) {
        await FirestoreService.logPayslipDownload(
          company.companyId,
          slip.id,
          { uid: userSession.userId, name: userSession.fullName || userSession.email }
        );
      }
    } catch (err) {
      console.error('Download error:', err);
    } finally {
      setDownloading(false);
    }
  };

  const handlePrint = () => {
    PayslipService.printPDF(slip, company);
  };

  const handleTogglePublish = async () => {
    if (!company?.companyId || !isAdmin) return;
    setPublishing(true);
    try {
      if (slip.isPublished) {
        await FirestoreService.unpublishSalarySlips(
          company.companyId,
          slip.payrollCycleId,
          [slip.id],
          { uid: userSession.userId, name: userSession.fullName || userSession.email }
        );
      } else {
        await FirestoreService.publishSalarySlips(
          company.companyId,
          slip.payrollCycleId,
          [slip.id],
          { uid: userSession.userId, name: userSession.fullName || userSession.email }
        );
      }
      if (onStatusChange) onStatusChange();
      onClose();
    } catch (err) {
      console.error('Publish toggle error:', err);
    } finally {
      setPublishing(false);
    }
  };

  const earningsList = [
    { label: 'Basic Salary', val: slip.earnings?.basic || 0 },
    { label: 'House Rent Allowance (HRA)', val: slip.earnings?.hra || 0 },
    { label: 'Dearness Allowance (DA)', val: slip.earnings?.da || 0 },
    { label: 'Conveyance Allowance', val: slip.earnings?.conveyance || 0 },
    { label: 'Medical Allowance', val: slip.earnings?.medical || 0 },
    { label: 'Special Allowance', val: slip.earnings?.specialAllowance || 0 },
    { label: 'Overtime Pay', val: slip.earnings?.overtimePay || 0 },
    { label: 'Bonus / Performance Incentive', val: slip.earnings?.bonus || 0 },
  ];

  const deductionsList = [
    { label: 'Provident Fund (PF - Employee Share)', val: slip.deductions?.pf || 0 },
    { label: 'Employee State Insurance (ESIC)', val: slip.deductions?.esic || 0 },
    { label: 'Professional Tax (PT)', val: slip.deductions?.pt || 0 },
    { label: 'Tax Deducted at Source (TDS)', val: slip.deductions?.tds || 0 },
    { label: 'Advance / Loan Recovery', val: slip.deductions?.advanceDeduction || 0 },
    { label: 'Loss of Pay (LOP) Deduction', val: slip.deductions?.lopDeduction || 0 },
    { label: 'Other Deductions', val: slip.deductions?.otherDeductions || 0 },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-6">
        {/* Modal Top Action Bar */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white tracking-wide">
                  Payslip Preview — {monthLabel} {slip.year}
                </h3>
                {slip.isPublished ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    <CheckCircle2 className="w-3 h-3" /> Published
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    <AlertCircle className="w-3 h-3" /> Draft (Unpublished)
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 font-mono">
                {slip.employeeName} ({slip.employeeCode || slip.employeeId})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isAdmin && (
              <button
                type="button"
                onClick={handleTogglePublish}
                disabled={publishing}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  slip.isPublished
                    ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm'
                }`}
              >
                {slip.isPublished ? (
                  <>
                    <EyeOff className="w-3.5 h-3.5" />
                    {publishing ? 'Updating...' : 'Unpublish'}
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    {publishing ? 'Publishing...' : 'Publish to Employee'}
                  </>
                )}
              </button>
            )}

            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              Print
            </button>

            <button
              type="button"
              onClick={handleDownload}
              disabled={downloading}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              {downloading ? 'Exporting...' : 'Download PDF'}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors ml-2"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Payslip Document Body */}
        <div className="p-6 max-h-[80vh] overflow-y-auto bg-slate-50/50 dark:bg-slate-900/50">
          <div className="bg-white dark:bg-slate-950 p-6 md:p-8 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
            
            {/* Header / Company Letterhead */}
            <div className="border-b border-slate-200 dark:border-slate-800 pb-5 text-center space-y-1.5">
              <div className="inline-flex items-center justify-center gap-2 text-slate-900 dark:text-white">
                <Building2 className="w-5 h-5 text-emerald-600" />
                <h2 className="text-xl font-black tracking-tight">{companyName}</h2>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {company?.address || 'Industrial Security & Facility Management Services'}
              </p>
              <div className="flex flex-wrap items-center justify-center gap-4 text-xs font-mono text-slate-400">
                <span>CIN: {company?.cinNumber || 'U74999MH2023PTC123456'}</span>
                <span>•</span>
                <span>GSTIN: {company?.gstNumber || '27AAAAA0000A1Z5'}</span>
              </div>
              <div className="pt-2">
                <span className="inline-block px-4 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-bold tracking-wider uppercase">
                  Payslip for the month of {monthLabel} {slip.year}
                </span>
              </div>
            </div>

            {/* Employee Information Grid */}
            <div className="bg-slate-50 dark:bg-slate-900/60 p-4 rounded-xl border border-slate-200 dark:border-slate-800 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="space-y-2.5">
                <div className="flex justify-between pb-1.5 border-b border-slate-200 dark:border-slate-800">
                  <span className="text-slate-500 font-medium">Employee Name</span>
                  <span className="font-bold text-slate-900 dark:text-white">{slip.employeeName}</span>
                </div>
                <div className="flex justify-between pb-1.5 border-b border-slate-200 dark:border-slate-800">
                  <span className="text-slate-500 font-medium">Employee ID / Code</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-white">{slip.employeeCode || slip.employeeId}</span>
                </div>
                <div className="flex justify-between pb-1.5 border-b border-slate-200 dark:border-slate-800">
                  <span className="text-slate-500 font-medium">Designation</span>
                  <span className="font-medium text-slate-800 dark:text-slate-200">{slip.designation || 'Staff'}</span>
                </div>
                <div className="flex justify-between pb-1.5 border-b border-slate-200 dark:border-slate-800">
                  <span className="text-slate-500 font-medium">Department</span>
                  <span className="font-medium text-slate-800 dark:text-slate-200">{slip.departmentName || 'Operations'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Bank Name</span>
                  <span className="font-medium text-slate-800 dark:text-slate-200">{slip.bankName || 'Direct Transfer'}</span>
                </div>
              </div>

              <div className="space-y-2.5">
                <div className="flex justify-between pb-1.5 border-b border-slate-200 dark:border-slate-800">
                  <span className="text-slate-500 font-medium">Bank Account No</span>
                  <span className="font-mono font-medium text-slate-800 dark:text-slate-200">{slip.accountNumber || '••••••••'}</span>
                </div>
                <div className="flex justify-between pb-1.5 border-b border-slate-200 dark:border-slate-800">
                  <span className="text-slate-500 font-medium">IFSC Code</span>
                  <span className="font-mono font-medium text-slate-800 dark:text-slate-200">{slip.ifscCode || 'N/A'}</span>
                </div>
                <div className="flex justify-between pb-1.5 border-b border-slate-200 dark:border-slate-800">
                  <span className="text-slate-500 font-medium">PAN Number</span>
                  <span className="font-mono font-medium text-slate-800 dark:text-slate-200">{slip.panNumber || 'N/A'}</span>
                </div>
                <div className="flex justify-between pb-1.5 border-b border-slate-200 dark:border-slate-800">
                  <span className="text-slate-500 font-medium">UAN / PF Number</span>
                  <span className="font-mono font-medium text-slate-800 dark:text-slate-200">{slip.uanNumber || slip.pfNumber || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">ESIC Number</span>
                  <span className="font-mono font-medium text-slate-800 dark:text-slate-200">{slip.esicNumber || 'N/A'}</span>
                </div>
              </div>
            </div>

            {/* Attendance & Days Summary Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 bg-slate-100 dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 text-center">
              <div>
                <p className="text-[11px] text-slate-500 font-medium">Calendar Days</p>
                <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{slip.totalMonthDays || 30}</p>
              </div>
              <div>
                <p className="text-[11px] text-slate-500 font-medium">Worked Days</p>
                <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{slip.workedDays || 0}</p>
              </div>
              <div>
                <p className="text-[11px] text-slate-500 font-medium">Paid Leaves</p>
                <p className="text-sm font-bold text-blue-600 dark:text-blue-400">{slip.paidLeaveDays || 0}</p>
              </div>
              <div>
                <p className="text-[11px] text-slate-500 font-medium">Loss of Pay (LOP)</p>
                <p className="text-sm font-bold text-rose-600 dark:text-rose-400">{slip.lopDays || 0}</p>
              </div>
              <div>
                <p className="text-[11px] text-slate-500 font-medium">Payable Days</p>
                <p className="text-sm font-bold text-slate-900 dark:text-white">{slip.payableDays || 0}</p>
              </div>
            </div>

            {/* Dual Grid: Earnings & Deductions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Earnings Column */}
              <div className="border border-emerald-200 dark:border-emerald-900/40 rounded-xl overflow-hidden">
                <div className="bg-emerald-50 dark:bg-emerald-950/30 px-4 py-2.5 border-b border-emerald-200 dark:border-emerald-900/40 flex justify-between items-center">
                  <h4 className="text-xs font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider">
                    Earnings
                  </h4>
                  <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">Amount (INR)</span>
                </div>
                <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                  {earningsList.map((item, idx) => (
                    <div key={idx} className="px-4 py-2 flex justify-between items-center hover:bg-slate-50/60 dark:hover:bg-slate-900/40">
                      <span className="text-slate-600 dark:text-slate-400">{item.label}</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {item.val > 0 ? `₹ ${item.val.toLocaleString('en-IN')}` : '—'}
                      </span>
                    </div>
                  ))}
                  <div className="px-4 py-3 bg-emerald-50/50 dark:bg-emerald-950/20 flex justify-between items-center font-bold text-emerald-900 dark:text-emerald-300">
                    <span>Total Gross Earnings</span>
                    <span>₹ {(slip.earnings?.totalGross || 0).toLocaleString('en-IN')}</span>
                  </div>
                </div>
              </div>

              {/* Deductions Column */}
              <div className="border border-rose-200 dark:border-rose-900/40 rounded-xl overflow-hidden">
                <div className="bg-rose-50 dark:bg-rose-950/30 px-4 py-2.5 border-b border-rose-200 dark:border-rose-900/40 flex justify-between items-center">
                  <h4 className="text-xs font-bold text-rose-800 dark:text-rose-300 uppercase tracking-wider">
                    Deductions
                  </h4>
                  <span className="text-xs font-semibold text-rose-700 dark:text-rose-400">Amount (INR)</span>
                </div>
                <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                  {deductionsList.map((item, idx) => (
                    <div key={idx} className="px-4 py-2 flex justify-between items-center hover:bg-slate-50/60 dark:hover:bg-slate-900/40">
                      <span className="text-slate-600 dark:text-slate-400">{item.label}</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {item.val > 0 ? `₹ ${item.val.toLocaleString('en-IN')}` : '—'}
                      </span>
                    </div>
                  ))}
                  <div className="px-4 py-3 bg-rose-50/50 dark:bg-rose-950/20 flex justify-between items-center font-bold text-rose-900 dark:text-rose-300">
                    <span>Total Deductions</span>
                    <span>₹ {(slip.deductions?.totalDeductions || 0).toLocaleString('en-IN')}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Net Pay Highlight Card */}
            <div className="bg-slate-900 text-white p-5 rounded-xl flex flex-col md:flex-row items-center justify-between gap-4 shadow-md">
              <div>
                <p className="text-xs uppercase tracking-widest text-slate-400 font-semibold">Net Take-Home Salary</p>
                <p className="text-xs text-slate-300 italic mt-1">
                  In Words: {slip.netPayInWords || 'Zero Rupees Only'}
                </p>
              </div>
              <div className="text-right">
                <span className="text-2xl md:text-3xl font-black text-emerald-400 tracking-tight">
                  ₹ {(slip.netPay || 0).toLocaleString('en-IN')}
                </span>
                <p className="text-[11px] text-slate-400">Credited to Bank Account</p>
              </div>
            </div>

            {/* Verification Footer & Signatory */}
            <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                <div>
                  <p className="font-mono font-semibold text-slate-700 dark:text-slate-300">{verificationHash}</p>
                  <p className="text-[10px]">Computer generated digital document • No physical signature required</p>
                </div>
              </div>
              <div className="text-center sm:text-right">
                <p className="font-bold text-slate-800 dark:text-slate-200">For {companyName.slice(0, 30)}</p>
                <p className="text-[11px] text-slate-400 mt-4">Authorized Signatory / HR Dept</p>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};
