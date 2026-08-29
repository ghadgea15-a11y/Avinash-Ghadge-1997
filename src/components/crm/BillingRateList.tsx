import React from 'react';
import { BillingRateMatrixRecord, ContractRecord } from '../../types';
import { Receipt, AlertCircle } from 'lucide-react';

export const BillingRateList: React.FC<{ rates: BillingRateMatrixRecord[], contracts: ContractRecord[] }> = ({ rates, contracts }) => {
  if (rates.length === 0) {
    return (
      <div className="py-12 flex flex-col items-center justify-center text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 shadow-sm">
        <Receipt className="w-12 h-12 text-slate-300 mb-3" />
        <p>No Billing Rate Matrices configured.</p>
        <p className="text-sm mt-1">Create a rate matrix to start generating billing calculations.</p>
      </div>
    );
  }

  const getContractName = (id?: string) => {
    if (!id) return 'All Contracts';
    return contracts.find(c => c.id === id)?.contractNumber || id;
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-white dark:bg-slate-950">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Contract / Site</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Rate Details</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Amount</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Effective Period</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Status</th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-slate-900 divide-y divide-slate-200">
            {rates.map(r => (
              <tr key={r.id} className="hover:bg-white dark:bg-slate-950">
                <td className="px-6 py-4">
                  <div className="font-medium text-black dark:text-white">{getContractName(r.contractId)}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">{r.siteId || 'All Sites'}</div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm text-black dark:text-white font-medium">{r.rateType ? r.rateType.replace(/_/g, ' ') : 'Standard'}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">Unit: {r.unit || 'Month'}</div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm font-semibold text-black dark:text-white">
                    {r.currency || 'INR'} {(r.rate ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm text-black dark:text-white flex items-center gap-1">
                     {r.effectiveFrom ? new Date(r.effectiveFrom).toLocaleDateString() : 'N/A'} 
                     {(r as any).effectiveTo ? ` - ${new Date((r as any).effectiveTo).toLocaleDateString()}` : ' - Onwards'}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    r.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 
                    r.status === 'PENDING_APPROVAL' ? 'bg-amber-100 text-amber-800' :
                    'bg-slate-100 text-black'
                  }`}>
                    {r.status ? r.status.replace(/_/g, ' ') : 'ACTIVE'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
