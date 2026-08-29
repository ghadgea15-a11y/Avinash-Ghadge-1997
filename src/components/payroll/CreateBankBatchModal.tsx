import React, { useState, useEffect } from 'react';
import { 
  PayrollCycleRecord, 
  SalarySlipRecord, 
  CompanyBankAccountRecord, 
  PaymentBatchMethod, 
  PaymentBatchRecord, 
  UserSession 
} from '../../types';
import { BankExportEngine } from '../../services/bankExportEngine';
import { FirestoreService } from '../../services/firestoreService';
import { 
  X, 
  Plus, 
  CheckCircle2, 
  AlertCircle, 
  AlertTriangle, 
  CreditCard, 
  Building2, 
  ShieldCheck, 
  Clock, 
  Layers,
  ArrowRight,
  Info
} from 'lucide-react';

interface CreateBankBatchModalProps {
  companyId: string;
  payrollCycles: PayrollCycleRecord[];
  companyBanks: CompanyBankAccountRecord[];
  session: UserSession;
  existingBatches: PaymentBatchRecord[];
  onClose: () => void;
  onSuccess: (newBatchId: string) => void;
}

export const CreateBankBatchModal: React.FC<CreateBankBatchModalProps> = ({
  companyId,
  payrollCycles,
  companyBanks,
  session,
  existingBatches,
  onClose,
  onSuccess
}) => {
  // Only APPROVED or LOCKED or DISBURSED cycles are eligible
  const eligibleCycles = payrollCycles.filter(c => ['APPROVED', 'LOCKED', 'DISBURSED'].includes(c.status));

  const [selectedCycleId, setSelectedCycleId] = useState<string>(eligibleCycles[0]?.id || '');
  const [selectedMethod, setSelectedMethod] = useState<PaymentBatchMethod>('AUTO');
  const [selectedBankId, setSelectedBankId] = useState<string>(
    companyBanks.find(b => b.isDefault)?.id || companyBanks[0]?.id || ''
  );
  
  const [slips, setSlips] = useState<SalarySlipRecord[]>([]);
  const [loadingSlips, setLoadingSlips] = useState(false);
  const [creating, setCreating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Fetch salary slips when selected cycle changes
  useEffect(() => {
    if (!selectedCycleId) {
      setSlips([]);
      return;
    }
    setLoadingSlips(true);
    setErrorMessage(null);
    FirestoreService.getSalarySlips(companyId, selectedCycleId)
      .then(res => {
        setSlips(res);
      })
      .catch(err => {
        console.error('Failed to load salary slips:', err);
        setErrorMessage('Failed to load salary slips for this payroll cycle.');
      })
      .finally(() => setLoadingSlips(false));
  }, [companyId, selectedCycleId]);

  // Set of already exported slip IDs in active batches for this cycle
  const existingExportedSlipIds = React.useMemo(() => {
    const exportedIds = new Set<string>();
    existingBatches
      .filter(b => b.payrollCycleId === selectedCycleId && b.status !== 'CANCELLED')
      .forEach(b => {
        b.items.filter((item: any) => item.validationStatus === 'VALID').forEach((item: any) => {
          exportedIds.add(item.salarySlipId);
        });
      });
    return exportedIds;
  }, [existingBatches, selectedCycleId]);

  // Run BankExportEngine pre-validation
  const { items, summary } = React.useMemo(() => {
    if (slips.length === 0) {
      return { 
        items: [], 
        summary: { totalItems: 0, totalValid: 0, totalInvalid: 0, totalAmount: 0, isValid: false, errors: [], warnings: [], validatedAt: '' } 
      };
    }
    return BankExportEngine.prepareBatchItems(slips, companyId, selectedMethod, existingExportedSlipIds);
  }, [slips, companyId, selectedMethod, existingExportedSlipIds]);

  const selectedCycle = eligibleCycles.find(c => c.id === selectedCycleId);
  const selectedBank = companyBanks.find(b => b.id === selectedBankId);

  const handleCreateBatch = async () => {
    if (!selectedCycle) {
      setErrorMessage('Please select an approved payroll cycle.');
      return;
    }
    if (summary.totalValid === 0) {
      setErrorMessage('Cannot create payment batch with 0 valid beneficiaries.');
      return;
    }

    setCreating(true);
    setErrorMessage(null);

    try {
      const now = new Date();
      const monthNames = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
      const mStr = monthNames[(selectedCycle.month || 1) - 1] || 'MTH';
      const count = existingBatches.filter(b => b.payrollCycleId === selectedCycleId).length + 1;
      const batchNum = `PAY-${selectedCycle.year}-${mStr}-${selectedMethod}-${String(count).padStart(2, '0')}`;
      const batchId = `BATCH_${selectedCycleId}_${Date.now()}`;

      const newBatch: PaymentBatchRecord = {
        id: batchId,
        batchNumber: batchNum,
        companyId,
        payrollCycleId: selectedCycle.id,
        month: selectedCycle.month,
        year: selectedCycle.year,
        payrollCycleLabel: selectedCycle.cycleLabel || `${mStr} ${selectedCycle.year}`,
        paymentMethod: selectedMethod,
        companyBankAccountId: selectedBank?.id,
        companyBankName: selectedBank?.bankName || 'Default Company Account',
        companyMaskedAccount: selectedBank?.maskedAccountNumber,
        debitAccountReference: selectedBank?.accountNumber || 'COMPANY_DISBURSEMENT_ACC',
        beneficiaryCount: slips.length,
        validBeneficiaryCount: summary.totalValid,
        totalAmount: summary.totalAmount,
        currency: 'INR',
        status: summary.totalInvalid > 0 ? 'VALIDATION_FAILED' : 'READY_FOR_APPROVAL',
        items,
        validationSummary: summary,
        createdBy: session.userId,
        createdByName: session.fullName || session.email || 'Finance Admin',
        createdAt: now.toISOString(),
        validatedAt: now.toISOString(),
        exportCount: 0,
        exportVersion: 1,
        updatedAt: now.toISOString()
      };

      const success = await FirestoreService.createPaymentBatch(companyId, newBatch);

      if (success) {
        onSuccess(newBatch.id);
      } else {
        setErrorMessage('Failed to create payment batch.');
      }
    } catch (err: any) {
      console.error('Create payment batch error:', err);
      setErrorMessage(err?.message || 'Unexpected error while creating payment batch.');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-white dark:bg-slate-950/80">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl border border-indigo-100">
              <Plus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-black dark:text-white">Prepare New NEFT / RTGS Payment Batch</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Consumes authoritative Net Pay from locked payroll cycles
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:text-slate-400 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {errorMessage && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-start space-x-3 text-rose-700 text-sm">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Batch Preparation Alert</p>
                <p className="text-xs text-rose-600 mt-0.5">{errorMessage}</p>
              </div>
            </div>
          )}

          {eligibleCycles.length === 0 ? (
            <div className="p-6 text-center bg-amber-50 rounded-xl border border-amber-200 text-amber-800">
              <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-amber-600" />
              <h4 className="text-sm font-bold">No Approved Payroll Cycles Available</h4>
              <p className="text-xs text-amber-700 mt-1 max-w-md mx-auto">
                Payment batches can only be prepared from <strong>APPROVED</strong> or <strong>LOCKED</strong> monthly payroll runs. Please approve a payroll cycle first.
              </p>
            </div>
          ) : (
            <>
              {/* Step 1: Select Cycle */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-300 mb-1.5">
                  1. Authoritative Payroll Cycle
                </label>
                <select
                  value={selectedCycleId}
                  onChange={e => setSelectedCycleId(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm bg-white dark:bg-slate-950 border border-slate-200 rounded-xl font-medium text-black dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                >
                  {eligibleCycles.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.cycleLabel || `Month ${c.month} ${c.year}`} • {c.totalEmployees} Employees • Total ₹{c.totalNetPay?.toLocaleString('en-IN')} [{c.status}]
                    </option>
                  ))}
                </select>
              </div>

              {/* Step 2: Select Payment Method & Company Bank */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-300 mb-1.5">
                    2. Payment Routing Method
                  </label>
                  <select
                    value={selectedMethod}
                    onChange={e => setSelectedMethod(e.target.value as PaymentBatchMethod)}
                    className="w-full px-3.5 py-2.5 text-sm bg-white dark:bg-slate-950 border border-slate-200 rounded-xl font-medium text-black dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  >
                    <option value="AUTO">AUTO (Smart NEFT / RTGS routing)</option>
                    <option value="NEFT">NEFT (All amounts)</option>
                    <option value="RTGS">RTGS (High value transfers)</option>
                  </select>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                    AUTO routes transfers &gt;= ₹2,00,000 to RTGS, remainder to NEFT.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-300 mb-1.5">
                    3. Company Debit Account
                  </label>
                  <select
                    value={selectedBankId}
                    onChange={e => setSelectedBankId(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm bg-white dark:bg-slate-950 border border-slate-200 rounded-xl font-medium text-black dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  >
                    {companyBanks.length === 0 ? (
                      <option value="">Default Corporate Account</option>
                    ) : (
                      companyBanks.map(b => (
                        <option key={b.id} value={b.id}>
                          {b.bankName} ({b.maskedAccountNumber}) {b.isDefault ? '• Default' : ''}
                        </option>
                      ))
                    )}
                  </select>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono mt-1">
                    Source: {selectedBank?.ifscCode ? `IFSC ${selectedBank.ifscCode}` : 'Disbursement Master'}
                  </p>
                </div>
              </div>

              {/* Pre-validation Summary */}
              {loadingSlips ? (
                <div className="py-8 text-center text-slate-500 dark:text-slate-400 text-xs">
                  Loading and validating locked salary slips...
                </div>
              ) : (
                <div className="p-4 bg-white dark:bg-slate-950 rounded-xl border border-slate-200/80 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-300">
                      Validation Summary
                    </span>
                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                      {slips.length} Total Slips
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div className="p-2.5 bg-white dark:bg-slate-900 rounded-lg border border-slate-200">
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold uppercase">Eligible</span>
                      <p className="text-base font-bold text-emerald-600">{summary.totalValid}</p>
                    </div>
                    <div className="p-2.5 bg-white dark:bg-slate-900 rounded-lg border border-slate-200">
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold uppercase">Issues / Duplicates</span>
                      <p className="text-base font-bold text-rose-600">{summary.totalInvalid}</p>
                    </div>
                    <div className="p-2.5 bg-white dark:bg-slate-900 rounded-lg border border-slate-200">
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold uppercase">Batch Total</span>
                      <p className="text-base font-bold text-black dark:text-white">₹{summary.totalAmount.toLocaleString('en-IN')}</p>
                    </div>
                  </div>

                  {summary.errors.length > 0 && (
                    <div className="p-2.5 bg-rose-50 rounded-lg border border-rose-200 text-xs text-rose-700 max-h-28 overflow-y-auto space-y-1">
                      <p className="font-semibold flex items-center">
                        <AlertCircle className="w-3.5 h-3.5 mr-1" />
                        Ineligible Records ({summary.errors.length}):
                      </p>
                      {summary.errors.map((err: any, i: number) => (
                        <p key={i} className="text-[11px] text-rose-600">• {err}</p>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center space-x-2 text-xs text-slate-600 dark:text-slate-400 pt-1">
                    <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    <span>
                      Authoritative Net Pay verified directly from locked calculation records.
                    </span>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-white dark:bg-slate-950 border-t border-slate-100 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-black dark:text-slate-200 hover:bg-slate-200/60 rounded-xl transition-colors"
          >
            Cancel
          </button>
          
          <button
            type="button"
            onClick={handleCreateBatch}
            disabled={creating || eligibleCycles.length === 0 || summary.totalValid === 0 || loadingSlips}
            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white text-xs font-semibold rounded-xl shadow-md transition-all flex items-center space-x-2"
          >
            <CreditCard className="w-4 h-4" />
            <span>{creating ? 'Creating Batch...' : 'Generate Bank Batch'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
