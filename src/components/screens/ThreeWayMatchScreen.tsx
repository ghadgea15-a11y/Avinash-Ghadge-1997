import React, { useState, useEffect } from 'react';
import { db, functions } from '../../firebase';
import { collection, query, onSnapshot, doc } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { 
  Search, CheckCircle, AlertTriangle, XCircle, ChevronRight, X, UserX, FileCheck, Receipt
} from 'lucide-react';

interface ThreeWayMatchScreenProps {
  userSession: any;
  activeCompany: any;
  onNavigate?: (screen: string) => void;
}

export const ThreeWayMatchScreen: React.FC<ThreeWayMatchScreenProps> = ({
  userSession,
  activeCompany,
  onNavigate
}) => {
  const [matchRecords, setMatchRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [selectedMatch, setSelectedMatch] = useState<any>(null);
  const [resolutionComment, setResolutionComment] = useState('');

  useEffect(() => {
    if (!activeCompany?.id) return;
    
    const matchRef = collection(db, 'companies', activeCompany.id, 'three_way_match_records');
    const q = query(matchRef);
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => doc.data());
      setMatchRecords(data);
      setLoading(false);
    });
    
    return () => unsubscribe();
  }, [activeCompany?.id]);

  const filteredRecords = matchRecords.filter(record => {
    const matchesSearch = record.poId.includes(searchQuery) || record.invoiceId.includes(searchQuery);
    const matchesStatus = statusFilter === 'ALL' || record.matchStatus === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleResolve = async (action: 'OVERRIDE' | 'REQUEST_CREDIT_NOTE' | 'REJECT') => {
     if (!activeCompany?.id || !selectedMatch) return;
     try {
       const resolveVariance = httpsCallable(functions, 'resolveMatchVariance');
       await resolveVariance({ 
          companyId: activeCompany.id, 
          matchId: selectedMatch.id,
          action,
          resolutionComments: resolutionComment
       });
       alert('Variance resolution processed successfully.');
       setSelectedMatch(null);
       setResolutionComment('');
     } catch (err) {
       console.error(err);
       alert('Failed to process variance resolution.');
     }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PERFECT_MATCH': return 'bg-green-100 text-green-800 border border-green-200';
      case 'TOLERANCE_PASSED': return 'bg-emerald-100 text-emerald-800 border border-emerald-200';
      case 'VARIANCE_DETECTED': return 'bg-red-100 text-red-800 border border-red-200';
      case 'MANUALLY_OVERRIDDEN': return 'bg-blue-100 text-blue-800 border border-blue-200';
      case 'REJECTED': return 'bg-slate-100 text-slate-800 border border-slate-200';
      default: return 'bg-slate-100 text-slate-800 border border-slate-200';
    }
  };

  const getVarianceBadge = (type: string) => {
    if (type === 'NONE') return null;
    return (
       <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-red-50 text-red-700 border border-red-200 ml-2">
          {type.replace(/_/g, ' ')}
       </span>
    );
  };

  return (
    <div className="p-6 bg-slate-50 min-h-screen">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">3-Way Matching Engine</h1>
            <p className="text-sm text-slate-500">Reconcile POs, Gate Inwards (GRN), and Vendor Invoices</p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-wrap gap-4 items-center justify-between">
          <div className="flex items-center bg-slate-50 rounded-lg px-3 py-2 border border-slate-200 flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 mr-2" />
            <input
              type="text"
              placeholder="Search by PO or Invoice ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent border-none outline-none text-sm w-full"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20"
          >
            <option value="ALL">All Match Records</option>
            <option value="PERFECT_MATCH">Perfect Match</option>
            <option value="TOLERANCE_PASSED">Tolerance Passed</option>
            <option value="VARIANCE_DETECTED">Variance Detected (HOLD)</option>
            <option value="MANUALLY_OVERRIDDEN">Manually Overridden</option>
          </select>
        </div>

        {/* Records List */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">PO Ref</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">GRN Ref</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Invoice Ref</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Variance Amount</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Status</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredRecords.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                      No matching records found.
                    </td>
                  </tr>
                ) : (
                  filteredRecords.map((record) => (
                    <tr key={record.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <span className="text-sm font-medium text-slate-900">{record.poId}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-slate-600">{record.grnId || 'N/A'}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm font-medium text-indigo-700">{record.invoiceId}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                           <span className={`text-sm font-medium \${record.varianceAmount > 0 ? 'text-red-600' : 'text-slate-900'}`}>
                             ₹{record.varianceAmount.toLocaleString()}
                           </span>
                           {getVarianceBadge(record.varianceType)}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-[11px] font-semibold tracking-wide \${getStatusBadge(record.matchStatus)}`}>
                          {record.matchStatus.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => setSelectedMatch(record)}
                          className="text-indigo-600 hover:text-indigo-900 text-sm font-medium bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-md transition-colors"
                        >
                          Inspect Matrix
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Inspection Drawer */}
        {selectedMatch && (
          <div className="fixed inset-y-0 right-0 w-full max-w-4xl bg-white shadow-2xl z-50 border-l border-slate-200 flex flex-col transform transition-transform">
             <div className="flex items-center justify-between p-6 border-b border-slate-200 bg-slate-50">
               <div>
                 <div className="flex items-center gap-3 mb-1">
                    <h2 className="text-xl font-bold text-slate-900">3-Way Reconciliation Matrix</h2>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-bold \${getStatusBadge(selectedMatch.matchStatus)}`}>
                       {selectedMatch.matchStatus.replace(/_/g, ' ')}
                    </span>
                 </div>
                 <p className="text-sm text-slate-500">Invoice: {selectedMatch.invoiceId} | PO: {selectedMatch.poId}</p>
               </div>
               <button onClick={() => {setSelectedMatch(null); setResolutionComment('');}} className="p-2 text-slate-400 hover:bg-slate-200 rounded-full transition-colors">
                 <X className="w-5 h-5" />
               </button>
             </div>
             
             <div className="flex-1 overflow-y-auto p-6 space-y-8 bg-white">
                
                {/* Financial Summary */}
                <div className="grid grid-cols-4 gap-4">
                   <div className="p-4 rounded-xl border border-slate-200 bg-white">
                      <div className="text-xs text-slate-500 font-medium mb-1">Purchase Order (Agreed)</div>
                      <div className="text-lg font-bold text-slate-900">₹{selectedMatch.totalPoAmount.toLocaleString()}</div>
                   </div>
                   <div className="p-4 rounded-xl border border-slate-200 bg-white">
                      <div className="text-xs text-slate-500 font-medium mb-1">GRN / Gate Inward (Received)</div>
                      <div className="text-lg font-bold text-slate-900">₹{selectedMatch.totalGrnAmount.toLocaleString()}</div>
                   </div>
                   <div className="p-4 rounded-xl border border-indigo-200 bg-indigo-50">
                      <div className="text-xs text-indigo-700 font-medium mb-1">Vendor Invoice (Billed)</div>
                      <div className="text-lg font-bold text-indigo-900">₹{selectedMatch.totalInvoiceAmount.toLocaleString()}</div>
                   </div>
                   <div className={`p-4 rounded-xl border \${selectedMatch.varianceAmount > 0 ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'}`}>
                      <div className={`text-xs font-medium mb-1 \${selectedMatch.varianceAmount > 0 ? 'text-red-700' : 'text-green-700'}`}>Total Variance</div>
                      <div className={`text-lg font-bold \${selectedMatch.varianceAmount > 0 ? 'text-red-900' : 'text-green-900'}`}>
                         ₹{selectedMatch.varianceAmount.toLocaleString()}
                      </div>
                   </div>
                </div>

                {/* Line Item Matrix */}
                <div>
                   <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center">
                      <FileCheck className="w-4 h-4 mr-2 text-indigo-600" /> 
                      Line-Level Inspection
                   </h3>
                   <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                     <table className="w-full text-left text-sm">
                       <thead className="bg-slate-100 border-b border-slate-200">
                         <tr>
                           <th className="px-4 py-3 font-semibold text-slate-700">Item Name</th>
                           <th className="px-4 py-3 font-semibold text-slate-700 border-l border-slate-200 text-center bg-slate-50/50" colSpan={3}>Quantity Verification</th>
                           <th className="px-4 py-3 font-semibold text-slate-700 border-l border-slate-200 text-center bg-slate-50/50" colSpan={2}>Rate Verification</th>
                           <th className="px-4 py-3 font-semibold text-slate-700 border-l border-slate-200 text-center">Flags</th>
                         </tr>
                         <tr className="bg-white border-t border-slate-200 text-xs">
                            <th className="px-4 py-2 font-medium text-slate-500"></th>
                            <th className="px-4 py-2 font-medium text-slate-500 border-l border-slate-200 text-right">PO Qty</th>
                            <th className="px-4 py-2 font-medium text-slate-500 text-right">GRN Qty</th>
                            <th className="px-4 py-2 font-medium text-indigo-600 text-right">Inv Qty</th>
                            <th className="px-4 py-2 font-medium text-slate-500 border-l border-slate-200 text-right">PO Rate</th>
                            <th className="px-4 py-2 font-medium text-indigo-600 text-right">Inv Rate</th>
                            <th className="px-4 py-2 font-medium text-slate-500 border-l border-slate-200 text-center">Discrepancy Notes</th>
                         </tr>
                       </thead>
                       <tbody className="divide-y divide-slate-100">
                         {selectedMatch.lineItemMatches?.map((item: any, idx: number) => (
                           <tr key={idx} className={(!item.qtyMatch || !item.rateMatch) ? 'bg-red-50/30' : 'hover:bg-slate-50'}>
                             <td className="px-4 py-3 font-medium text-slate-900">{item.itemName || item.itemId}</td>
                             <td className="px-4 py-3 text-right text-slate-600 border-l border-slate-200">{item.poQty}</td>
                             <td className="px-4 py-3 text-right font-medium text-slate-900">{item.grnQty}</td>
                             <td className={`px-4 py-3 text-right font-bold \${!item.qtyMatch ? 'text-red-600' : 'text-indigo-700'}`}>
                               {item.invQty}
                             </td>
                             <td className="px-4 py-3 text-right text-slate-600 border-l border-slate-200">₹{item.poRate}</td>
                             <td className={`px-4 py-3 text-right font-bold \${!item.rateMatch ? 'text-red-600' : 'text-indigo-700'}`}>
                               ₹{item.invRate}
                             </td>
                             <td className="px-4 py-3 text-xs text-red-600 text-center border-l border-slate-200">
                               {item.varianceNotes || '-'}
                             </td>
                           </tr>
                         ))}
                       </tbody>
                     </table>
                   </div>
                </div>

                {/* Resolution Controls (Only if Variance Detected) */}
                {selectedMatch.matchStatus === 'VARIANCE_DETECTED' && (
                   <div className="bg-amber-50 border border-amber-200 rounded-xl p-6">
                      <h3 className="text-sm font-bold text-amber-900 flex items-center mb-4">
                         <AlertTriangle className="w-4 h-4 mr-2" />
                         Discrepancy Resolution (Requires A1/A2 Authority)
                      </h3>
                      <div className="space-y-4">
                         <div>
                           <label className="block text-sm font-medium text-amber-800 mb-1">Resolution Comments / Justification</label>
                           <textarea
                              value={resolutionComment}
                              onChange={(e) => setResolutionComment(e.target.value)}
                              rows={3}
                              className="w-full border border-amber-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-amber-500/20 outline-none bg-white"
                              placeholder="Explain the reason for overriding or rejecting..."
                           />
                         </div>
                         <div className="flex gap-3 pt-2">
                            <button 
                               onClick={() => handleResolve('REQUEST_CREDIT_NOTE')}
                               className="px-4 py-2 border border-amber-300 text-amber-800 bg-amber-100 hover:bg-amber-200 rounded-lg text-sm font-semibold transition-colors"
                            >
                               Request Credit Note from Vendor
                            </button>
                            <button 
                               onClick={() => handleResolve('REJECT')}
                               className="px-4 py-2 border border-red-300 text-red-700 bg-red-50 hover:bg-red-100 rounded-lg text-sm font-semibold transition-colors"
                            >
                               Reject Invoice Completely
                            </button>
                            <div className="flex-1" />
                            <button 
                               onClick={() => handleResolve('OVERRIDE')}
                               disabled={!resolutionComment}
                               className="px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-semibold hover:bg-amber-700 disabled:opacity-50 transition-colors"
                            >
                               Override & Pass for Payment
                            </button>
                         </div>
                      </div>
                   </div>
                )}
             </div>
          </div>
        )}
      </div>
    </div>
  );
};
