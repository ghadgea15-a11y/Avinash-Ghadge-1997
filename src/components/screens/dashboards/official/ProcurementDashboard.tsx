import React, { useState, useEffect } from 'react';
import { Package, Truck } from 'lucide-react';
import { CompanyTenant, UserSession, PhaseAScreen, InventoryVendorRecord } from '../../../../types';
import { FirestoreService } from '../../../../services/firestoreService';
import { RbacService } from '../../../../services/rbacService';

interface DashboardProps {
  userSession: UserSession;
  company: CompanyTenant;
  onNavigate: (screen: PhaseAScreen) => void;
}

export const ProcurementDashboard: React.FC<DashboardProps> = ({ userSession, company, onNavigate }) => {
  const [vendors, setVendors] = useState<InventoryVendorRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubVendors = FirestoreService.subscribeToInventoryVendors(userSession, company.companyId, setVendors);
    setTimeout(() => setLoading(false), 800);
    return () => unsubVendors();
  }, [company.companyId]);

  if (loading) {
    return <div className="p-8 text-center text-slate-500">Loading Procurement Metrics...</div>;
  }

  const activeVendors = vendors.filter(v => v.status === 'ACTIVE').length;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700/50">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-500">Active Vendors</h3>
            <Truck className="w-5 h-5 text-indigo-500" />
          </div>
          <p className="text-3xl font-black text-slate-900 dark:text-white">{activeVendors}</p>
          {RbacService.hasModuleAccess(userSession, 'INVENTORY') && (
            <button 
              onClick={() => onNavigate('INVENTORY_STOCK')}
              className="text-xs text-indigo-600 hover:text-indigo-700 mt-2 font-semibold flex items-center"
            >
              Manage Inventory & Vendors &rarr;
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
