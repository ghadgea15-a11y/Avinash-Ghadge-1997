import React, { useState } from 'react';
import { UserSession, CompanyTenant, ContractRecord, BillingRateMatrixRecord, BillingRateType } from '../../types';
import { billingRateService } from '../../services/billingRateService';
import { X, Save, Calculator } from 'lucide-react';

interface Props {
  session: UserSession;
  company: CompanyTenant;
  contracts: ContractRecord[];
  onClose: () => void;
  onSaved: () => void;
}

export const CreateBillingRateModal: React.FC<Props> = ({ session, company, contracts, onClose, onSaved }) => {
  const activeContracts = contracts.filter(c => c.status === 'ACTIVE' || c.status === 'APPROVED');
  
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    contractId: activeContracts.length > 0 ? activeContracts[0].id : '',
    siteId: '',
    rateType: 'PER_SHIFT' as BillingRateType,
    unit: 'Shift',
    rate: 0,
    currency: 'USD',
    effectiveFrom: new Date().toISOString().split('T')[0]
  });

  const handleSave = async () => {
    if (!formData.contractId || formData.rate <= 0) return;
    setSaving(true);
    try {
      const contract = activeContracts.find(c => c.id === formData.contractId);
      if (!contract) throw new Error('Contract not found');

      const rate: BillingRateMatrixRecord = {
        id: `RATE-${Date.now()}`,
        companyId: company.companyId,
        clientId: contract.clientId,
        contractId: contract.id,
        siteId: formData.siteId || undefined,
        rateType: formData.rateType,
        unit: formData.unit,
        rate: formData.rate,
        currency: formData.currency,
        effectiveFrom: new Date(formData.effectiveFrom).toISOString(),
        status: 'ACTIVE',
        createdBy: session.userId,
        createdAt: new Date().toISOString(),
        updatedBy: session.userId,
        updatedAt: new Date().toISOString()
      };

      await billingRateService.saveRate(company.companyId, rate);
      onSaved();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-2xl">
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Calculator className="w-5 h-5 text-indigo-600" />
            Create Rate Matrix
          </h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 dark:text-slate-400 hover:bg-slate-100 rounded-full">
            <X className="w-5 h-5" />
          </button>
        </div>

        {activeContracts.length === 0 ? (
           <div className="p-6 text-center text-red-500">No active contracts found. Please approve a contract first.</div>
        ) : (
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-900 dark:text-slate-300 mb-1">Contract</label>
                <select
                  value={formData.contractId}
                  onChange={e => setFormData({ ...formData, contractId: e.target.value })}
                  className="w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                >
                  {activeContracts.map(c => (
                    <option key={c.id} value={c.id}>{c.contractNumber} - {c.contractTitle}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-900 dark:text-slate-300 mb-1">Site Scope (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. SITE-001 or leave blank for all"
                  value={formData.siteId}
                  onChange={e => setFormData({ ...formData, siteId: e.target.value })}
                  className="w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                />
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Leave blank to apply to all sites in contract.</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-900 dark:text-slate-300 mb-1">Rate Type</label>
                <select
                  value={formData.rateType}
                  onChange={e => setFormData({ ...formData, rateType: e.target.value as BillingRateType })}
                  className="w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                >
                  <option value="PER_SHIFT">Per Shift</option>
                  <option value="PER_HOUR">Per Hour</option>
                  <option value="PER_DAY">Per Day</option>
                  <option value="PER_EMPLOYEE">Per Employee</option>
                  <option value="PER_SERVICE">Per Service / Work Order</option>
                  <option value="FIXED_MONTHLY">Fixed Monthly</option>
                  <option value="VARIABLE_QUANTITY">Variable Quantity</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-900 dark:text-slate-300 mb-1">Unit Description</label>
                <input
                  type="text"
                  placeholder="e.g. Shift, Hour, Month"
                  value={formData.unit}
                  onChange={e => setFormData({ ...formData, unit: e.target.value })}
                  className="w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-900 dark:text-slate-300 mb-1">Rate Amount</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.rate}
                  onChange={e => setFormData({ ...formData, rate: parseFloat(e.target.value) })}
                  className="w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm font-semibold"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-900 dark:text-slate-300 mb-1">Currency</label>
                <select
                  value={formData.currency}
                  onChange={e => setFormData({ ...formData, currency: e.target.value })}
                  className="w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                >
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="GBP">GBP</option>
                  <option value="AUD">AUD</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-900 dark:text-slate-300 mb-1">Effective From</label>
              <input
                type="date"
                value={formData.effectiveFrom}
                onChange={e => setFormData({ ...formData, effectiveFrom: e.target.value })}
                className="w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              />
            </div>
          </div>
        )}

        <div className="p-6 border-t border-slate-200 flex justify-end gap-3 bg-white dark:bg-slate-950 rounded-b-xl">
          <button onClick={onClose} className="btn-secondary">Cancel</button>
          <button 
            onClick={handleSave} 
            disabled={saving || !formData.contractId || formData.rate <= 0} 
            className="btn-primary flex items-center gap-2"
          >
            {saving ? 'Saving...' : <><Save className="w-4 h-4" /> Save Rate</>}
          </button>
        </div>
      </div>
    </div>
  );
};
