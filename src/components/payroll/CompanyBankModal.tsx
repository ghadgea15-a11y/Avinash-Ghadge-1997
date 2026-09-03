import React, { useState } from 'react';
import { CompanyBankAccountRecord } from '../../types';
import { BankExportEngine } from '../../services/bankExportEngine';
import { FirestoreService } from '../../services/firestoreService';
import { 
  X, 
  Building2, 
  CreditCard, 
  CheckCircle2, 
  AlertCircle, 
  ShieldCheck 
} from 'lucide-react';

interface CompanyBankModalProps {
  companyId: string;
  existingAccount?: CompanyBankAccountRecord | null;
  actor: { uid: string; name: string };
  onClose: () => void;
  onSuccess: () => void;
}

export const CompanyBankModal: React.FC<CompanyBankModalProps> = ({
  companyId,
  existingAccount,
  actor,
  onClose,
  onSuccess
}) => {
  const [bankName, setBankName] = useState(existingAccount?.bankName || '');
  const [accountHolderName, setAccountHolderName] = useState(existingAccount?.accountHolderName || '');
  const [accountNumber, setAccountNumber] = useState(existingAccount?.accountNumber || '');
  const [ifscCode, setIfscCode] = useState(existingAccount?.ifscCode || '');
  const [branchName, setBranchName] = useState(existingAccount?.branchName || '');
  const [accountType, setAccountType] = useState<'CURRENT' | 'OVERDRAFT' | 'SAVINGS'>(
    existingAccount?.accountType || 'CURRENT'
  );
  const [isDefault, setIsDefault] = useState(existingAccount?.isDefault ?? true);
  
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validations
    if (!bankName.trim()) {
      setError('Please provide Bank Name');
      return;
    }
    if (!accountHolderName.trim()) {
      setError('Please provide Account Holder Name');
      return;
    }
    const accCheck = BankExportEngine.validateAccountNumber(accountNumber);
    if (!accCheck.isValid) {
      setError(accCheck.error!);
      return;
    }
    const ifscCheck = BankExportEngine.validateIfsc(ifscCode);
    if (!ifscCheck.isValid) {
      setError(ifscCheck.error!);
      return;
    }

    setSaving(true);
    try {
      const res = await FirestoreService.saveCompanyBankAccount(
        companyId,
        {
          id: existingAccount?.id,
          bankName: bankName.trim(),
          accountHolderName: accountHolderName.trim(),
          accountNumber: accountNumber.trim(),
          ifscCode: ifscCode.trim().toUpperCase(),
          branchName: branchName.trim(),
          accountType,
          isDefault,
          status: 'ACTIVE'
        },
        actor
      );

      if (res) {
        onSuccess();
      } else {
        setError('Failed to save company bank account.');
      }
    } catch (err: any) {
      setError(err?.message || 'Error saving company bank account');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-white dark:bg-slate-950/80">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl border border-indigo-100">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-black dark:text-white">
                {existingAccount ? 'Edit Company Disbursement Bank' : 'Add Corporate Disbursement Account'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Primary debit account for automated NEFT / RTGS disbursements
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

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start space-x-2.5 text-rose-700 text-xs">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-300 mb-1">
              Bank Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. HDFC Bank, State Bank of India, ICICI Bank"
              value={bankName}
              onChange={e => setBankName(e.target.value)}
              className="w-full px-3.5 py-2 text-xs bg-white dark:bg-slate-950 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-300 mb-1">
              Account Holder / Entity Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. SHOURYA ENTERPRISES PVT LTD"
              value={accountHolderName}
              onChange={e => setAccountHolderName(e.target.value)}
              className="w-full px-3.5 py-2 text-xs bg-white dark:bg-slate-950 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-300 mb-1">
                Account Number *
              </label>
              <input
                type="text"
                required
                placeholder="9-18 digit account number"
                value={accountNumber}
                onChange={e => setAccountNumber(e.target.value)}
                className="w-full px-3.5 py-2 text-xs font-mono bg-white dark:bg-slate-950 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-300 mb-1">
                IFSC Code *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. HDFC0001234"
                value={ifscCode}
                onChange={e => setIfscCode(e.target.value.toUpperCase())}
                className="w-full px-3.5 py-2 text-xs font-mono uppercase bg-white dark:bg-slate-950 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-300 mb-1">
                Account Type
              </label>
              <select
                value={accountType}
                onChange={e => setAccountType(e.target.value as any)}
                className="w-full px-3.5 py-2 text-xs bg-white dark:bg-slate-950 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              >
                <option value="CURRENT">Current Account</option>
                <option value="OVERDRAFT">Overdraft (OD) Account</option>
                <option value="SAVINGS">Savings Account</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-300 mb-1">
                Branch Name
              </label>
              <input
                type="text"
                placeholder="e.g. Nariman Point, Mumbai"
                value={branchName}
                onChange={e => setBranchName(e.target.value)}
                className="w-full px-3.5 py-2 text-xs bg-white dark:bg-slate-950 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="flex items-center space-x-2 pt-2">
            <input
              type="checkbox"
              id="isDefaultAcc"
              checked={isDefault}
              onChange={e => setIsDefault(e.target.checked)}
              className="rounded-md border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
            <label htmlFor="isDefaultAcc" className="text-xs text-slate-900 dark:text-slate-300 font-medium">
              Set as primary disbursement account for NEFT/RTGS batch files
            </label>
          </div>

          <div className="p-3 bg-white dark:bg-slate-950 rounded-xl border border-slate-200 text-xs text-slate-500 dark:text-slate-400 flex items-center space-x-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>Never enter passwords, PINs, or OTPs. Only debit account identifiers are stored.</span>
          </div>

          {/* Actions */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white text-xs font-semibold rounded-xl shadow-xs transition-all"
            >
              {saving ? 'Saving...' : 'Save Account'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
