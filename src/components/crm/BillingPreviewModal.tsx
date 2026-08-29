import React, { useState } from 'react';
import { UserSession, CompanyTenant, ContractRecord, BillingPreviewRecord } from '../../types';
import { billingRateService } from '../../services/billingRateService';
import { X, Calculator, Loader2, AlertCircle } from 'lucide-react';

interface Props {
  session: UserSession;
  company: CompanyTenant;
  contracts: ContractRecord[];
  onClose: () => void;
}

export const BillingPreviewModal: React.FC<Props> = ({ session, company, contracts, onClose }) => {
  const activeContracts = contracts.filter(c => c.status === 'ACTIVE' || c.status === 'APPROVED');
  
  const [calculating, setCalculating] = useState(false);
  const [previews, setPreviews] = useState<BillingPreviewRecord[] | null>(null);
  
  const [formData, setFormData] = useState({
    contractId: activeContracts.length > 0 ? activeContracts[0].id : '',
    startDate: new Date(new Date().setDate(1)).toISOString().split('T')[0], // First day of month
    endDate: new Date().toISOString().split('T')[0]
  });

  const handleCalculate = async () => {
    if (!formData.contractId || !formData.startDate || !formData.endDate) return;
    setCalculating(true);
    try {
      const contract = activeContracts.find(c => c.id === formData.contractId);
      if (!contract) throw new Error('Contract not found');

      const start = new Date(formData.startDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(formData.endDate);
      end.setHours(23, 59, 59, 999);

      const results = await billingRateService.calculateBillingPreview(
        company.companyId,
        contract,
        start,
        end
      );
      
      setPreviews(results);
    } catch (err) {
      console.error(err);
    } finally {
      setCalculating(false);
    }
  };

  const totalAmount = previews?.reduce((sum, p) => sum + p.grossAmount, 0) || 0;
  const currency = previews && previews.length > 0 ? previews[0].currency : 'USD';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Calculator className="w-5 h-5 text-indigo-600" />
            Billing Matrix Calculation Preview
          </h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 dark:text-slate-400 hover:bg-slate-100 rounded-full">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 bg-white dark:bg-slate-950 border-b border-slate-200 grid grid-cols-1 md:grid-cols-4 gap-4 flex-shrink-0">
           <div className="md:col-span-2">
             <label className="block text-sm font-medium text-slate-900 dark:text-slate-300 mb-1">Select Contract</label>
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
              <label className="block text-sm font-medium text-slate-900 dark:text-slate-300 mb-1">Period Start</label>
              <input
                type="date"
                value={formData.startDate}
                onChange={e => setFormData({ ...formData, startDate: e.target.value })}
                className="w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              />
           </div>
           <div>
              <label className="block text-sm font-medium text-slate-900 dark:text-slate-300 mb-1">Period End</label>
              <div className="flex gap-2">
                <input
                  type="date"
                  value={formData.endDate}
                  onChange={e => setFormData({ ...formData, endDate: e.target.value })}
                  className="w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                />
                <button 
                  onClick={handleCalculate}
                  disabled={calculating || !formData.contractId}
                  className="btn-primary flex-shrink-0"
                >
                  {calculating ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Run'}
                </button>
              </div>
           </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {!previews ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 space-y-3">
               <Calculator className="w-12 h-12 text-slate-200" />
               <p>Select a contract and period, then click Run to generate a preview.</p>
               <p className="text-xs max-w-md text-center">This will query real operational data (Work Orders, Attendance) across the selected period and multiply by the prioritized active rates.</p>
            </div>
          ) : previews.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-amber-500 space-y-3">
               <AlertCircle className="w-12 h-12 text-amber-200" />
               <p className="font-medium">No billable operational quantities found for this period.</p>
               <p className="text-sm text-slate-500 dark:text-slate-400">Ensure active rates exist and operational records (attendance/work orders) are marked as complete/present.</p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-4 flex justify-between items-center">
                <div>
                  <h3 className="font-semibold text-indigo-900">Total Projected Billing</h3>
                  <p className="text-sm text-indigo-700">Preview generated successfully. No financial records were created.</p>
                </div>
                <div className="text-2xl font-bold text-indigo-900">
                  {currency} {totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>

              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-white dark:bg-slate-950">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Rate Type / Site</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Applicable Rate</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Quantity (Unit)</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Source Reference</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Gross Amount</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-slate-900 divide-y divide-slate-200">
                    {previews.map((p, idx) => (
                      <tr key={idx} className="hover:bg-white dark:bg-slate-950">
                        <td className="px-6 py-4">
                          <div className="font-medium text-black dark:text-white">{(p.rateType || 'Standard').replace(/_/g, ' ')}</div>
                          <div className="text-xs text-slate-500 dark:text-slate-400">{p.siteId ? `Site: ${p.siteId}` : 'All Sites'}</div>
                        </td>
                        <td className="px-6 py-4 text-sm text-black dark:text-white">
                           {p.currency} {(p.applicableRate ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="px-6 py-4 text-sm font-medium text-black dark:text-white">
                           {p.quantity} {p.unit}
                        </td>
                        <td className="px-6 py-4 text-xs text-slate-500 dark:text-slate-400 font-mono">
                           {p.sourceReference}
                        </td>
                        <td className="px-6 py-4 text-sm font-bold text-black dark:text-white text-right">
                           {p.currency} {p.grossAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
