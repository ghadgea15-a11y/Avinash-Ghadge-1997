import React from 'react';
import { UserSession, SiteRecord, EmployeeRecord, AssetRecord } from '../../types';
import { EamAssetCustodyRecord } from '../../types/eam';
import { ShieldCheck, AlertCircle, CheckCircle, XCircle } from 'lucide-react';
import { EamService } from '../../services/eamService';

interface CustodyProps {
  session: UserSession;
  assets: AssetRecord[];
  sites: SiteRecord[];
  employees: EmployeeRecord[];
  custodyRecords: EamAssetCustodyRecord[];
}

export function CustodyManagement({ session, assets, sites, employees, custodyRecords }: CustodyProps) {
  
  // Show assets assigned to current employee OR pending acknowledgement
  const myPendingRecords = custodyRecords.filter(c => c.toCustodianId === session.employeeId && c.acknowledgementStatus === 'PENDING');
  
  const myCurrentAssets = assets.filter(a => a.currentCustodianId === session.employeeId && a.status === 'IN_CUSTODY');

  const handleAcknowledge = async (recordId: string, assetId: string, isAccepted: boolean) => {
    const asset = assets.find(a => a.id === assetId);
    if (!asset) return;
    
    // Simplification for UI demo: automatically passing current condition
    await EamService.acknowledgeCustody(
      session.companyId,
      assetId,
      recordId,
      session.employeeId || '',
      isAccepted,
      asset.condition,
      isAccepted ? 'Accepted in good order' : 'Rejected assignment'
    );
  };

  return (
    <div className="p-6 space-y-8">
      {/* Pending Acknowledgements */}
      <div>
        <h3 className="text-base font-bold text-black dark:text-white mb-4 flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-amber-500" />
          Pending Acknowledgements
        </h3>
        
        {myPendingRecords.length === 0 ? (
          <div className="bg-white dark:bg-slate-950 border border-slate-200 rounded-xl p-8 text-center text-slate-500 dark:text-slate-400">
            <CheckCircle className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
            <p>You have no pending asset assignments.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {myPendingRecords.map(record => {
              const asset = assets.find(a => a.id === record.assetId);
              if (!asset) return null;
              
              return (
                <div key={record.id} className="bg-white dark:bg-slate-900 border-2 border-amber-200 shadow-sm rounded-xl p-4 flex flex-col">
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-bold text-black dark:text-white">{asset.assetName}</span>
                    <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-xs font-bold rounded">PENDING</span>
                  </div>
                  <p className="font-mono text-xs text-slate-500 dark:text-slate-400 mb-4">{asset.assetCode}</p>
                  
                  <div className="mt-auto pt-4 flex gap-2 border-t border-slate-100">
                    <button 
                      onClick={() => handleAcknowledge(record.id, record.assetId, false)}
                      className="flex-1 py-1.5 border border-red-200 text-red-600 bg-red-50 hover:bg-red-100 rounded text-sm font-medium transition"
                    >
                      Reject
                    </button>
                    <button 
                      onClick={() => handleAcknowledge(record.id, record.assetId, true)}
                      className="flex-1 py-1.5 border border-transparent text-white bg-emerald-600 hover:bg-emerald-700 rounded text-sm font-medium transition"
                    >
                      Accept
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Current Custody */}
      <div>
        <h3 className="text-base font-bold text-black dark:text-white mb-4 flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-indigo-600" />
          Assets In My Custody
        </h3>
        
        {myCurrentAssets.length === 0 ? (
          <div className="bg-white dark:bg-slate-950 border border-slate-200 rounded-xl p-8 text-center text-slate-500 dark:text-slate-400">
            <p>You are not currently responsible for any assets.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {myCurrentAssets.map(asset => (
              <div key={asset.id} className="bg-white dark:bg-slate-900 border border-slate-200 shadow-sm rounded-xl p-4 flex flex-col">
                <div className="flex justify-between items-start mb-2">
                  <span className="font-bold text-black dark:text-white line-clamp-1">{asset.assetName}</span>
                  <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-[11px] font-bold rounded">IN CUSTODY</span>
                </div>
                <p className="font-mono text-xs text-slate-500 dark:text-slate-400">{asset.assetCode}</p>
                <div className="mt-3 text-xs text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-950 p-2 rounded">
                  <p><strong>Condition:</strong> {asset.condition}</p>
                  <p><strong>Location:</strong> {sites.find(s => s.id === asset.siteId)?.name || 'Unknown'}</p>
                </div>
                <div className="mt-4 pt-3 flex gap-2 border-t border-slate-100">
                  <button className="flex-1 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-900 dark:text-slate-300 rounded text-xs font-medium transition">
                    Report Issue
                  </button>
                  <button className="flex-1 py-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded text-xs font-medium transition">
                    Transfer / Return
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
