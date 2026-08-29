import React, { useState, useEffect } from 'react';
import { UserSession, CompanyTenant, StockTransactionRecord } from '../../types';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '../../firebase';
import { ClipboardList, ArrowUpRight, ArrowDownLeft, RefreshCcw } from 'lucide-react';

export function StockLedgerTab({ session, company }: { session: UserSession, company: CompanyTenant }) {
  const [transactions, setTransactions] = useState<StockTransactionRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const loadTransactions = async () => {
    try {
      setLoading(true);
      const q = query(
        collection(db, 'companies', company.companyId, 'stock_transactions'),
        orderBy('timestamp', 'desc'),
        limit(100)
      );
      const snap = await getDocs(q);
      setTransactions(snap.docs.map(d => ({ id: d.id, ...d.data() } as StockTransactionRecord)));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadTransactions(); }, [company.companyId]);

  return (
    <div className="flex h-full flex-col space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-black dark:text-white">Stock Ledger (Recent Transactions)</h3>
        <button 
          onClick={loadTransactions}
          className="p-2 text-slate-500 hover:text-blue-600 transition-colors"
          title="Refresh"
        >
          <RefreshCcw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="flex-1 rounded-md border border-slate-200 bg-white dark:bg-slate-900 shadow-sm overflow-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-white dark:bg-slate-950 text-slate-600 dark:text-slate-400 sticky top-0">
            <tr>
              <th className="px-4 py-3 font-medium">Timestamp</th>
              <th className="px-4 py-3 font-medium">Item</th>
              <th className="px-4 py-3 font-medium">Location</th>
              <th className="px-4 py-3 font-medium">Type</th>
              <th className="px-4 py-3 font-medium text-right">Quantity</th>
              <th className="px-4 py-3 font-medium">Reason</th>
              <th className="px-4 py-3 font-medium">Performed By</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {transactions.map(tx => (
              <tr key={tx.id} className="hover:bg-white dark:bg-slate-950">
                <td className="px-4 py-3 text-slate-500 dark:text-slate-400 whitespace-nowrap">
                  {new Date(tx.timestamp).toLocaleString()}
                </td>
                <td className="px-4 py-3 font-medium text-black dark:text-white">{tx.itemId}</td>
                <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{tx.locationId}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold 
                    ${tx.type === 'RECEIVE' || tx.type === 'TRANSFER_IN' ? 'bg-green-100 text-green-700' : 
                      tx.type === 'ISSUE' || tx.type === 'TRANSFER_OUT' ? 'bg-red-100 text-red-700' : 
                      'bg-slate-100 text-slate-700'}`}>
                    {tx.type === 'RECEIVE' || tx.type === 'TRANSFER_IN' ? <ArrowDownLeft className="h-3 w-3" /> : <ArrowUpRight className="h-3 w-3" />}
                    {tx.type}
                  </span>
                </td>
                <td className={`px-4 py-3 text-right font-bold ${tx.quantity > 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {tx.quantity > 0 ? '+' : ''}{tx.quantity}
                </td>
                <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{tx.reason}</td>
                <td className="px-4 py-3 text-slate-500 dark:text-slate-400 text-xs">{tx.performedBy}</td>
              </tr>
            ))}
            {transactions.length === 0 && !loading && (
              <tr><td colSpan={7} className="text-center py-8 text-slate-500 dark:text-slate-400">No transactions found</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
