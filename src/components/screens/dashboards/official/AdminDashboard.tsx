import React, { useState, useEffect } from 'react';
import { Package, ShieldAlert, MonitorSmartphone } from 'lucide-react';
import { CompanyTenant, UserSession, PhaseAScreen, AssetRecord, InventoryItemRecord } from '../../../../types';
import { FirestoreService } from '../../../../services/firestoreService';
import { RbacService } from '../../../../services/rbacService';

interface DashboardProps {
  userSession: UserSession;
  company: CompanyTenant;
  onNavigate: (screen: PhaseAScreen) => void;
}

export const AdminDashboard: React.FC<DashboardProps> = ({ userSession, company, onNavigate }) => {
  const [assets, setAssets] = useState<AssetRecord[]>([]);
  const [inventory, setInventory] = useState<InventoryItemRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubAssets = FirestoreService.subscribeToAssets(userSession, company.companyId, setAssets);
    let unsubInventory = FirestoreService.subscribeToInventoryItems(userSession, company.companyId, setInventory);
    
    setTimeout(() => setLoading(false), 800);

    return () => {
      unsubAssets();
      unsubInventory();
    };
  }, [company.companyId]);

  if (loading) {
    return <div className="p-8 text-center text-slate-500 dark:text-slate-400">Loading Admin Metrics...</div>;
  }

  const activeAssets = assets.filter(a => a.status === 'AVAILABLE' || a.status === 'ASSIGNED').length;
  const lowStockItems = inventory.filter(i => (i.currentStock || 0) <= (i.minStockThreshold || 0)).length;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-slate-900 dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700/50">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400">Tracked Assets</h3>
            <MonitorSmartphone className="w-5 h-5 text-indigo-500" />
          </div>
          <p className="text-3xl font-black text-black dark:text-white">{activeAssets}</p>
          {RbacService.hasModuleAccess(userSession, 'ASSETS') && (
            <button 
              onClick={() => onNavigate('ASSET_TRACKING')}
              className="text-xs text-indigo-600 hover:text-indigo-700 mt-2 font-semibold flex items-center"
            >
              Manage Assets &rarr;
            </button>
          )}
        </div>

        <div className="bg-white dark:bg-slate-900 dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700/50">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400">Low Stock Inventory</h3>
            <Package className="w-5 h-5 text-amber-500" />
          </div>
          <p className="text-3xl font-black text-black dark:text-white">{lowStockItems}</p>
          {RbacService.hasModuleAccess(userSession, 'INVENTORY') && (
            <button 
              onClick={() => onNavigate('INVENTORY_STOCK')}
              className="text-xs text-indigo-600 hover:text-indigo-700 mt-2 font-semibold flex items-center"
            >
              Review Stock &rarr;
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
