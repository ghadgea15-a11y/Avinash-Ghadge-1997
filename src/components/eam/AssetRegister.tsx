import React, { useState, useMemo } from 'react';
import { UserSession, SiteRecord, EmployeeRecord, AssetRecord } from '../../types';
import { Search, Filter, ShieldCheck, AlertTriangle, Play, Settings, HardDrive } from 'lucide-react';

interface AssetRegisterProps {
  session: UserSession;
  assets: AssetRecord[];
  sites: SiteRecord[];
  employees: EmployeeRecord[];
  onDeploy: (asset: AssetRecord) => void;
  onReportIncident?: (asset: AssetRecord) => void;
  onViewIncidents?: (asset: AssetRecord) => void;
}

export function AssetRegister({ session, assets, sites, employees, onDeploy, onReportIncident, onViewIncidents }: AssetRegisterProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const filteredAssets = useMemo(() => {
    return assets.filter(a => {
      const matchSearch = search ? 
        (a.assetName.toLowerCase().includes(search.toLowerCase()) || a.assetCode.toLowerCase().includes(search.toLowerCase())) 
        : true;
      const matchStatus = statusFilter ? a.status === statusFilter : true;
      return matchSearch && matchStatus;
    });
  }, [assets, search, statusFilter]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'AVAILABLE': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'DEPLOYED':
      case 'IN_CUSTODY':
      case 'ASSIGNED': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'UNDER_MAINTENANCE': return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'LOST':
      case 'DAMAGED': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row justify-between gap-4">
        <div className="flex flex-1 gap-2 max-w-2xl">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text" 
              placeholder="Search asset name, code, serial..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <select 
            className="px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
          >
            <option value="">All Statuses</option>
            <option value="AVAILABLE">Available</option>
            <option value="DEPLOYED">Deployed/Assigned</option>
            <option value="UNDER_MAINTENANCE">Maintenance</option>
            <option value="LOST">Lost</option>
            <option value="DAMAGED">Damaged</option>
          </select>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50 text-slate-600 font-medium sticky top-0 shadow-sm z-10">
            <tr>
              <th className="px-4 py-3">Asset Identity</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Status & Condition</th>
              <th className="px-4 py-3">Current Location</th>
              <th className="px-4 py-3">Custodian</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredAssets.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-slate-500">
                  <HardDrive className="w-8 h-8 mx-auto mb-3 opacity-20" />
                  No assets found matching the criteria.
                </td>
              </tr>
            ) : (
              filteredAssets.map(asset => (
                <tr key={asset.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-bold text-slate-900">{asset.assetName}</div>
                    <div className="font-mono text-xs text-slate-500 mt-0.5">{asset.assetCode}</div>
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {asset.category || asset.categoryId || 'N/A'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-1.5 items-start">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${getStatusBadge(asset.status || 'AVAILABLE')}`}>
                        {(asset.status || 'AVAILABLE').replace(/_/g, ' ')}
                      </span>
                      <span className="text-xs text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                        Cond: {asset.condition}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {asset.siteId ? sites.find(s => s.id === asset.siteId)?.name || asset.siteName : 'Warehouse / Unassigned'}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {asset.assignedEmployeeId ? employees.find(e => e.id === asset.assignedEmployeeId)?.firstName + ' ' + (employees.find(e => e.id === asset.assignedEmployeeId)?.lastName || '') : 'None'}
                  </td>
                  <td className="px-4 py-3 text-right space-x-2 whitespace-nowrap">
                    {(!asset.status || asset.status === 'AVAILABLE') && (
                      <button 
                        onClick={() => onDeploy(asset)}
                        className="px-3 py-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg text-xs font-medium transition-colors"
                      >
                        Deploy
                      </button>
                    )}
                    {onReportIncident && asset.status !== 'RETIRED' && asset.status !== 'LOST' && (
                      <button 
                        onClick={() => onReportIncident(asset)}
                        className="px-3 py-1.5 bg-red-50 text-red-700 hover:bg-red-100 rounded-lg text-xs font-medium transition-colors"
                        title="Report Loss or Damage"
                      >
                        <AlertTriangle className="w-4 h-4 inline-block" />
                      </button>
                    )}
                    {onViewIncidents && (
                      <button 
                        onClick={() => onViewIncidents(asset)}
                        className="px-3 py-1.5 bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-100 rounded-lg text-xs font-medium transition-colors"
                        title="View Incident History"
                      >
                        History
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
