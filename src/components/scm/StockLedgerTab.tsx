import React, { useState, useEffect } from 'react';
import { UserSession, CompanyTenant, StockLedgerRecord } from '../../types';
import { ScmService } from '../../services/scmService';

export function StockLedgerTab({ session, company }: { session: UserSession, company: CompanyTenant }) {
  const [ledger, setLedger] = useState<StockLedgerRecord[]>([]);

  useEffect(() => {
    ScmService.getLedger(company.companyId).then(setLedger);
  }, [company.companyId]);

  return (
    <div className="flex h-full flex-col space-y-4">
      <h3 className="text-lg font-medium text-slate-900">Stock Ledger</h3>
      
      <div className="flex-1 rounded-md border border-slate-200 bg-white shadow-sm overflow-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-600 sticky top-0">
            <tr>
              <th className="px-4 py-3 font-medium">Date</th>
              <th className="px-4 py-3 font-medium">Item ID</th>
              <th className="px-4 py-3 font-medium">Location</th>
              <th className="px-4 py-3 font-medium">Type</th>
              <th className="px-4 py-3 font-medium text-right">Quantity Change</th>
              <th className="px-4 py-3 font-medium text-right">Balance After</th>
              <th className="px-4 py-3 font-medium">Actor</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {ledger.map(entry => (
              <tr key={entry.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 text-slate-500">{new Date(entry.createdAt).toLocaleString()}</td>
                <td className="px-4 py-3 font-medium text-slate-900">{entry.itemId}</td>
                <td className="px-4 py-3 text-slate-700">{entry.locationId}</td>
                <td className="px-4 py-3">
                  <span className="rounded bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
                    {entry.transactionType}
                  </span>
                </td>
                <td className={`px-4 py-3 text-right font-medium ${entry.quantity > 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {entry.quantity > 0 ? '+' : ''}{entry.quantity}
                </td>
                <td className="px-4 py-3 text-right font-medium text-slate-900">{entry.newBalance}</td>
                <td className="px-4 py-3 text-slate-500">{entry.performedByName}</td>
              </tr>
            ))}
            {ledger.length === 0 && (
              <tr><td colSpan={7} className="text-center py-8 text-slate-500">No transactions recorded</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
