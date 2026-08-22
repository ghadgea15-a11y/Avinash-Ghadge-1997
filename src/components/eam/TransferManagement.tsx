import React, { useState } from 'react';
import { UserSession, SiteRecord, EmployeeRecord, AssetRecord } from '../../types';
import { EamAssetTransferRecord } from '../../types/eam';
import { ArrowRightLeft, Check, Navigation } from 'lucide-react';
import { EamService } from '../../services/eamService';

interface TransferProps {
  session: UserSession;
  assets: AssetRecord[];
  sites: SiteRecord[];
  employees: EmployeeRecord[];
  transfers: EamAssetTransferRecord[];
}

export function TransferManagement({ session, assets, sites, employees, transfers }: TransferProps) {
  const [submitting, setSubmitting] = useState<string | null>(null);

  const pendingTransfers = transfers.filter(t => t.status === 'TRANSFER_REQUESTED' || t.status === 'DISPATCHED');

  const handleReceive = async (transfer: EamAssetTransferRecord) => {
    const asset = assets.find(a => a.id === transfer.assetId);
    if (!asset) return;
    
    setSubmitting(transfer.id);
    await EamService.receiveAsset(
      session.companyId,
      transfer,
      asset,
      session.userId,
      session.fullName,
      asset.condition,
      'Received via Transfer'
    );
    setSubmitting(null);
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <ArrowRightLeft className="w-5 h-5 text-purple-600" />
          Active Transfers
        </h3>
        <button className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition flex items-center gap-2">
          <Navigation className="w-4 h-4" />
          New Transfer Request
        </button>
      </div>

      <div className="bg-slate-50 border border-slate-200 rounded-xl overflow-hidden">
        {pendingTransfers.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <ArrowRightLeft className="w-8 h-8 text-slate-300 mx-auto mb-3" />
            <p>No active transfers in progress.</p>
          </div>
        ) : (
          <table className="w-full text-sm text-left">
            <thead className="bg-white border-b border-slate-200 text-slate-600 font-medium">
              <tr>
                <th className="px-4 py-3">Asset</th>
                <th className="px-4 py-3">From</th>
                <th className="px-4 py-3">To</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Requested</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {pendingTransfers.map(trf => {
                const asset = assets.find(a => a.id === trf.assetId);
                const fromSite = sites.find(s => s.id === trf.fromLocationId)?.name || 'Unknown';
                const toSite = sites.find(s => s.id === trf.toLocationId)?.name || 'Unknown';
                
                return (
                  <tr key={trf.id} className="hover:bg-white transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-bold text-slate-900">{asset?.assetName || 'Unknown Asset'}</div>
                      <div className="font-mono text-xs text-slate-500">{asset?.assetCode}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{fromSite}</td>
                    <td className="px-4 py-3 text-slate-600">{toSite}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 bg-purple-100 text-purple-800 text-xs font-bold rounded">
                        {trf.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs">
                      {new Date(trf.requestedAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {['COMPANY_ADMIN', 'HR_ADMIN', 'OPS_MANAGER', 'SUPERVISOR'].includes(session.role) || session.employeeId === trf.toCustodianId ? (
                        <button 
                          onClick={() => handleReceive(trf)}
                          disabled={submitting === trf.id}
                          className="px-3 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded text-xs font-medium transition flex items-center gap-1 ml-auto disabled:opacity-50"
                        >
                          <Check className="w-3.5 h-3.5" />
                          {submitting === trf.id ? 'Receiving...' : 'Receive'}
                        </button>
                      ) : (
                        <span className="text-xs text-slate-400">View Only</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
