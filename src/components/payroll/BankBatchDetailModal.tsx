import React, { useState } from 'react';
import { 
  PaymentBatchRecord, 
  CompanyBankAccountRecord,
  UserSession 
} from '../../types';
import { BankExportEngine } from '../../services/bankExportEngine';
import { FirestoreService } from '../../services/firestoreService';
import { 
  X, 
  CheckCircle2, 
  AlertCircle, 
  AlertTriangle, 
  Download, 
  ShieldCheck, 
  Building2, 
  CreditCard, 
  UserCheck, 
  FileText, 
  Lock,
  ArrowRight,
  Ban,
  Clock
} from 'lucide-react';

interface BankBatchDetailModalProps {
  batch: PaymentBatchRecord;
  companyBank: CompanyBankAccountRecord | null;
  session: UserSession;
  canApprove: boolean;
  canExport: boolean;
  onClose: () => void;
  onApprove: (batch: PaymentBatchRecord) => void;
  onOpenExport: (batch: PaymentBatchRecord) => void;
  onRefresh: () => void;
}

export const BankBatchDetailModal: React.FC<BankBatchDetailModalProps> = ({
  batch,
  companyBank,
  session,
  canApprove,
  canExport,
  onClose,
  onApprove,
  onOpenExport,
  onRefresh
}) => {
  const [filter, setFilter] = useState<'ALL' | 'VALID' | 'INVALID'>('ALL');
  const [search, setSearch] = useState('');
  const [processing, setProcessing] = useState(false);
  const [showCancelPrompt, setShowCancelPrompt] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  // Total integrity check
  const integrity = React.useMemo(() => {
    return BankExportEngine.verifyTotalIntegrity(batch);
  }, [batch]);

  const filteredItems = batch.items.filter((item: any) => {
    if (filter === 'VALID' && item.validationStatus !== 'VALID') return false;
    if (filter === 'INVALID' && item.validationStatus !== 'INVALID') return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        item.employeeName.toLowerCase().includes(q) ||
        (item.employeeCode || '').toLowerCase().includes(q) ||
        item.bankName.toLowerCase().includes(q) ||
        item.ifscCode.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleCancelBatch = async () => {
    if (!cancelReason.trim()) return;
    setProcessing(true);
    try {
      await FirestoreService.cancelPaymentBatch(
        batch.companyId,
        batch.id,
        session.userId,
        cancelReason
      );
      onRefresh();
      onClose();
    } catch (err) {
      console.error('Cancel batch error:', err);
    } finally {
      setProcessing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Approved for Export
          </span>
        );
      case 'EXPORTED':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
            <Download className="w-3.5 h-3.5 mr-1" /> Exported (v{batch.exportVersion || 1})
          </span>
        );
      case 'VALIDATION_FAILED':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <AlertCircle className="w-3.5 h-3.5 mr-1" /> Validation Failed
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 dark:text-slate-400 border border-slate-300">
            <Ban className="w-3.5 h-3.5 mr-1" /> Cancelled
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <Clock className="w-3.5 h-3.5 mr-1" /> Ready for Approval
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-white dark:bg-slate-950/80">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl border border-indigo-100">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-lg font-bold text-black dark:text-white">{batch.batchNumber}</h3>
                {getStatusBadge(batch.status)}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Payroll Cycle: <span className="font-semibold text-slate-900 dark:text-slate-300">{batch.payrollCycleLabel}</span> • Method: <span className="font-bold text-indigo-600">{batch.paymentMethod}</span>
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

        {/* Top Metric Cards */}
        <div className="p-6 pb-4 grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white dark:bg-slate-900 border-b border-slate-100">
          <div className="p-3.5 bg-white dark:bg-slate-950 rounded-xl border border-slate-200/80">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Total Disbursement</span>
            <p className="text-xl font-bold text-black dark:text-white mt-0.5">₹{batch.totalAmount.toLocaleString('en-IN')}</p>
            <p className="text-[10px] text-slate-500 dark:text-slate-400">Authoritative Net Pay</p>
          </div>
          <div className="p-3.5 bg-white dark:bg-slate-950 rounded-xl border border-slate-200/80">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Beneficiaries</span>
            <p className="text-xl font-bold text-black dark:text-white mt-0.5">
              <span className="text-emerald-600">{batch.validBeneficiaryCount}</span> / {batch.beneficiaryCount}
            </p>
            <p className="text-[10px] text-slate-500 dark:text-slate-400">Valid accounts</p>
          </div>
          <div className="p-3.5 bg-white dark:bg-slate-950 rounded-xl border border-slate-200/80">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Debit Bank Source</span>
            <p className="text-sm font-bold text-black dark:text-white mt-0.5 truncate">
              {companyBank?.bankName || batch.companyBankName || 'Company Account'}
            </p>
            <p className="text-[10px] font-mono text-slate-500 dark:text-slate-400 truncate">
              {companyBank?.maskedAccountNumber || batch.companyMaskedAccount || '••••••••1234'}
            </p>
          </div>
          <div className="p-3.5 bg-white dark:bg-slate-950 rounded-xl border border-slate-200/80">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Created By</span>
            <p className="text-sm font-bold text-black dark:text-white mt-0.5 truncate">{batch.createdByName || 'Finance Admin'}</p>
            <p className="text-[10px] text-slate-500 dark:text-slate-400">{new Date(batch.createdAt).toLocaleDateString('en-IN')}</p>
          </div>
        </div>

        {/* Total Integrity Banner */}
        <div className="px-6 py-2.5 bg-white dark:bg-slate-950/50 border-b border-slate-100 flex items-center justify-between text-xs">
          <div className="flex items-center space-x-2">
            {integrity.isValid ? (
              <span className="text-emerald-700 flex items-center font-medium">
                <ShieldCheck className="w-4 h-4 mr-1 text-emerald-600" />
                Total Amount Integrity Verified: Sum(Items) ₹{integrity.calculatedTotal.toLocaleString('en-IN')} = Batch ₹{integrity.batchTotal.toLocaleString('en-IN')}
              </span>
            ) : (
              <span className="text-rose-700 flex items-center font-medium">
                <AlertTriangle className="w-4 h-4 mr-1 text-rose-600" />
                Integrity Mismatch Detected: Sum(Items) ₹{integrity.calculatedTotal} ≠ Batch ₹{integrity.batchTotal} (Diff: ₹{integrity.difference})
              </span>
            )}
          </div>
          <div className="flex items-center space-x-2 text-[11px] text-slate-500 dark:text-slate-400">
            {batch.approvedByName && (
              <span>Approved by <strong className="text-slate-900 dark:text-slate-300">{batch.approvedByName}</strong></span>
            )}
            {batch.exportedAt && (
              <span>• Last exported {new Date(batch.exportedAt).toLocaleDateString('en-IN')}</span>
            )}
          </div>
        </div>

        {/* Beneficiaries Table Section */}
        <div className="p-6 pt-4 flex-1 overflow-y-auto space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            {/* Filter Tabs */}
            <div className="flex items-center space-x-1 p-1 bg-slate-100 rounded-xl w-fit">
              <button
                type="button"
                onClick={() => setFilter('ALL')}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                  filter === 'ALL' ? 'bg-white text-black shadow-xs' : 'text-slate-600 hover:text-black'
                }`}
              >
                All ({batch.items.length})
              </button>
              <button
                type="button"
                onClick={() => setFilter('VALID')}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                  filter === 'VALID' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-600 hover:text-black'
                }`}
              >
                Valid ({batch.items.filter((i: any) => i.validationStatus === 'VALID').length})
              </button>
              <button
                type="button"
                onClick={() => setFilter('INVALID')}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                  filter === 'INVALID' ? 'bg-white text-rose-700 shadow-xs' : 'text-slate-600 hover:text-black'
                }`}
              >
                Errors / Ineligible ({batch.items.filter((i: any) => i.validationStatus === 'INVALID').length})
              </button>
            </div>

            {/* Search Input */}
            <input
              type="text"
              placeholder="Search employee, IFSC, bank..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="px-3.5 py-1.5 text-xs bg-white dark:bg-slate-950 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 w-full sm:w-64"
            />
          </div>

          {/* Table */}
          <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
            <table className="w-full text-left text-xs">
              <thead className="bg-white dark:bg-slate-950 border-b border-slate-200 text-slate-600 dark:text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-4 py-3">#</th>
                  <th className="px-4 py-3">Employee</th>
                  <th className="px-4 py-3">Bank & Account</th>
                  <th className="px-4 py-3">IFSC Code</th>
                  <th className="px-4 py-3">Net Pay (INR)</th>
                  <th className="px-4 py-3">Payment Mode</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                      No matching beneficiaries found.
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((item: any, idx: number) => (
                    <tr key={item.id} className={item.validationStatus === 'INVALID' ? 'bg-rose-50/40' : 'hover:bg-white/60'}>
                      <td className="px-4 py-3 text-slate-400 font-mono">{idx + 1}</td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-black dark:text-white">{item.employeeName}</div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">{item.employeeCode} • {item.departmentName}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-black dark:text-slate-200 font-medium">{item.bankName}</div>
                        <div className="font-mono text-slate-500 dark:text-slate-400 text-[11px]">{item.maskedAccountNumber}</div>
                      </td>
                      <td className="px-4 py-3 font-mono font-medium text-slate-900 dark:text-slate-300">
                        {item.ifscCode || 'MISSING'}
                      </td>
                      <td className="px-4 py-3 font-bold text-black dark:text-white">
                        ₹{item.netPay.toLocaleString('en-IN')}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-0.5 rounded-md font-bold text-[10px] ${
                          item.paymentMethod === 'RTGS' 
                            ? 'bg-purple-100 text-purple-700' 
                            : 'bg-blue-100 text-blue-700'
                        }`}>
                          {item.paymentMethod}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {item.validationStatus === 'VALID' ? (
                          <span className="inline-flex items-center text-emerald-600 font-semibold text-[11px]">
                            <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Eligible
                          </span>
                        ) : (
                          <div>
                            <span className="inline-flex items-center text-rose-600 font-semibold text-[11px]">
                              <AlertCircle className="w-3.5 h-3.5 mr-1" /> Ineligible
                            </span>
                            {item.validationErrors && item.validationErrors.length > 0 && (
                              <p className="text-[10px] text-rose-600 font-medium mt-0.5 max-w-xs">
                                {item.validationErrors.join(' • ')}
                              </p>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Cancellation Form if toggled */}
          {showCancelPrompt && (
            <div className="p-4 bg-rose-50 rounded-xl border border-rose-200 space-y-3">
              <h4 className="text-xs font-bold text-rose-900 uppercase tracking-wider">Cancel Payment Batch</h4>
              <p className="text-xs text-rose-700">
                Are you sure you want to cancel this batch? The salary slips will become available again for new batch creation.
              </p>
              <input
                type="text"
                placeholder="Reason for cancellation (e.g. Bank account correction required)..."
                value={cancelReason}
                onChange={e => setCancelReason(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-rose-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-rose-500/20"
              />
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={handleCancelBatch}
                  disabled={processing || !cancelReason.trim()}
                  className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 disabled:bg-slate-300 text-white text-xs font-semibold rounded-lg"
                >
                  {processing ? 'Cancelling...' : 'Confirm Cancellation'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowCancelPrompt(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 dark:text-slate-400 hover:bg-rose-100 rounded-lg"
                >
                  Go Back
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-white dark:bg-slate-950 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            {batch.status !== 'CANCELLED' && (
              <button
                type="button"
                onClick={() => setShowCancelPrompt(true)}
                className="text-xs font-semibold text-rose-600 hover:text-rose-800 hover:underline"
              >
                Cancel this Batch
              </button>
            )}
          </div>

          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 rounded-xl transition-colors"
            >
              Close
            </button>

            {batch.status !== 'APPROVED' && batch.status !== 'EXPORTED' && batch.status !== 'CANCELLED' && canApprove && (
              <button
                type="button"
                onClick={() => onApprove(batch)}
                disabled={batch.validBeneficiaryCount === 0 || !integrity.isValid}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white text-xs font-semibold rounded-xl shadow-xs flex items-center space-x-1.5 transition-all"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Authorize & Approve Batch</span>
              </button>
            )}

            {(batch.status === 'APPROVED' || batch.status === 'EXPORTED') && canExport && (
              <button
                type="button"
                onClick={() => onOpenExport(batch)}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-xs flex items-center space-x-1.5 transition-all"
              >
                <Download className="w-4 h-4" />
                <span>Export Bank Payment File</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
