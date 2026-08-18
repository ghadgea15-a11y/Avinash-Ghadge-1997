import React from 'react';
import { BillingRateMatrixRecord, ContractRecord } from '../../types';
import { Receipt, AlertCircle } from 'lucide-react';

export const BillingRateList: React.FC<{ rates: BillingRateMatrixRecord[], contracts: ContractRecord[] }> = ({ rates, contracts }) => {
  if (rates.length === 0) {
    return (
      <div className="py-12 flex flex-col items-center justify-center text-slate-500 bg-white rounded-lg border border-slate-200 shadow-sm">
        <Receipt className="w-12 h-12 text-slate-300 mb-3" />
        <p>No Billing Rate Matrices configured.</p>
        <p className="text-sm mt-1">Create a rate matrix to start generating billing calculations.</p>
      </div>
    );
  }

  const getContractName = (id: string) => {
    return contracts.find(c => c.id === id)?.contractNumber || id;
  };

  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Contract / Site</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Rate Details</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Amount</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Effective Period</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-200">
            {rates.map(r => (
              <tr key={r.id} className="hover:bg-slate-50">
                <td className="px-6 py-4">
                  <div className="font-medium text-slate-900">{getContractName(r.contractId)}</div>
                  <div className="text-xs text-slate-500">{r.siteId || 'All Sites'}</div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm text-slate-900 font-medium">{r.rateType.replace(/_/g, ' ')}</div>
                  <div className="text-xs text-slate-500">Unit: {r.unit}</div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm font-semibold text-slate-900">
                    {r.currency} {r.rate.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm text-slate-900 flex items-center gap-1">
                     {new Date(r.effectiveFrom).toLocaleDateString()} 
                     {r.effectiveTo ? ` - ${new Date(r.effectiveTo).toLocaleDateString()}` : ' - Onwards'}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    r.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 
                    r.status === 'PENDING_APPROVAL' ? 'bg-amber-100 text-amber-800' :
                    'bg-slate-100 text-slate-800'
                  }`}>
                    {r.status.replace(/_/g, ' ')}
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
