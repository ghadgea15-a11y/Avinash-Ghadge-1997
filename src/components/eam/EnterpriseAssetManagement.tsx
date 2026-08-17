import React, { useState, useEffect, useMemo } from 'react';
import { 
  UserSession, SiteRecord, EmployeeRecord, AssetRecord, 
  AssetCategory, AssetStatus, AssetCondition 
} from '../../types';
import { EamAssetTransferRecord, EamAssetCustodyRecord } from '../../types/eam';
import { FirestoreService } from '../../services/firestoreService';
import { EamService } from '../../services/eamService';
import { 
  Boxes, ShieldCheck, ArrowRightLeft, AlertTriangle, 
  Search, Plus, Filter, QrCode, HardDrive
} from 'lucide-react';
import { AssetRegister } from './AssetRegister';
import { CustodyManagement } from './CustodyManagement';
import { TransferManagement } from './TransferManagement';
import { AssetDeploymentModal } from './AssetDeploymentModal';

interface EamProps {
  session: UserSession;
  sites: SiteRecord[];
  employees: EmployeeRecord[];
  companyId: string;
}

export function EnterpriseAssetManagement({ session, sites, employees, companyId }: EamProps) {
  const [activeTab, setActiveTab] = useState<'REGISTER' | 'CUSTODY' | 'TRANSFERS'>('REGISTER');
  
  const [assets, setAssets] = useState<AssetRecord[]>([]);
  const [transfers, setTransfers] = useState<EamAssetTransferRecord[]>([]);
  const [custodyRecords, setCustodyRecords] = useState<EamAssetCustodyRecord[]>([]);
  
  const [deployAsset, setDeployAsset] = useState<AssetRecord | null>(null);

  useEffect(() => {
    if (!companyId) return;

    const unsubAssets = FirestoreService.subscribeToAssets(session, companyId, setAssets);
    const unsubTransfers = EamService.subscribeToTransfers(companyId, setTransfers);
    const unsubCustody = EamService.subscribeToCustodyRecords(companyId, setCustodyRecords);
    
    return () => {
      unsubAssets();
      unsubTransfers();
      unsubCustody();
    };
  }, [companyId, session]);

  const stats = useMemo(() => {
    return {
      total: assets.length,
      available: assets.filter(a => a.status === 'AVAILABLE').length,
      deployed: assets.filter(a => a.status === 'DEPLOYED' || a.status === 'IN_CUSTODY' || a.status === 'ASSIGNED').length,
      maintenance: assets.filter(a => a.status === 'UNDER_MAINTENANCE').length,
      exceptions: assets.filter(a => a.status === 'LOST' || a.status === 'DAMAGED').length,
      pendingTransfers: transfers.filter(t => t.status === 'TRANSFER_REQUESTED' || t.status === 'DISPATCHED').length
    };
  }, [assets, transfers]);

  return (
    <div className="space-y-6">
      {/* KPI Dashboard */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        {[
          { label: 'Total Assets', value: stats.total, color: 'text-slate-900 bg-slate-100' },
          { label: 'Available', value: stats.available, color: 'text-emerald-700 bg-emerald-100' },
          { label: 'Deployed/Custody', value: stats.deployed, color: 'text-blue-700 bg-blue-100' },
          { label: 'Maintenance', value: stats.maintenance, color: 'text-amber-700 bg-amber-100' },
          { label: 'Lost/Damaged', value: stats.exceptions, color: 'text-red-700 bg-red-100' },
          { label: 'Pending Transfers', value: stats.pendingTransfers, color: 'text-purple-700 bg-purple-100' }
        ].map((s, i) => (
          <div key={i} className="p-4 rounded-xl border border-slate-200 bg-white shadow-sm flex flex-col justify-center items-center text-center">
            <span className={`text-2xl font-bold ${s.color.split(' ')[0]}`}>{s.value}</span>
            <span className="text-xs font-medium text-slate-500 mt-1">{s.label}</span>
          </div>
        ))}
      </div>

      {/* Navigation Tabs */}
      <div className="flex space-x-2 border-b border-slate-200">
        {[
          { id: 'REGISTER', label: 'Asset Register', icon: HardDrive },
          { id: 'CUSTODY', label: 'My Custody', icon: ShieldCheck },
          { id: 'TRANSFERS', label: 'Transfers', icon: ArrowRightLeft }
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                isActive 
                  ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50' 
                  : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
              {tab.id === 'CUSTODY' && custodyRecords.filter(c => c.toCustodianId === session.employeeId && c.acknowledgementStatus === 'PENDING').length > 0 && (
                <span className="ml-1 px-1.5 py-0.5 rounded-full bg-red-100 text-red-600 text-[10px] font-bold">
                  {custodyRecords.filter(c => c.toCustodianId === session.employeeId && c.acknowledgementStatus === 'PENDING').length}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm min-h-[500px]">
        {activeTab === 'REGISTER' && (
          <AssetRegister 
            session={session} 
            assets={assets} 
            sites={sites} 
            employees={employees} 
            onDeploy={(asset) => setDeployAsset(asset)}
          />
        )}
        
        {activeTab === 'CUSTODY' && (
          <CustodyManagement 
            session={session} 
            assets={assets} 
            sites={sites} 
            employees={employees} 
            custodyRecords={custodyRecords}
          />
        )}

        {activeTab === 'TRANSFERS' && (
          <TransferManagement 
            session={session} 
            assets={assets} 
            sites={sites} 
            employees={employees} 
            transfers={transfers}
          />
        )}
      </div>

      {/* Modals */}
      {deployAsset && (
        <AssetDeploymentModal 
          session={session}
          asset={deployAsset}
          sites={sites}
          employees={employees}
          onClose={() => setDeployAsset(null)}
        />
      )}
    </div>
  );
}
