import React, { useState, useEffect } from 'react';
import { UserSession, CompanyTenant, ClientRecord, ContractRecord } from '../../types';
import { crmService } from '../../services/crmService';
import { Building2, FileText, AlertCircle, Clock, CheckCircle } from 'lucide-react';
import { CrmExpiryAlerts } from './CrmExpiryAlerts';

interface Props {
  session: UserSession;
  company: CompanyTenant;
  onNavigate: (tab: 'CLIENTS' | 'CONTRACTS') => void;
}

export const CrmDashboardTab: React.FC<Props> = ({ session, company, onNavigate }) => {
  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [contracts, setContracts] = useState<ContractRecord[]>([]);

  useEffect(() => {
    loadData();
  }, [company.companyId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const cls = await crmService.getClients(company.companyId);
      const ctrs = await crmService.getContracts(company.companyId);
      setClients(cls);
      setContracts(ctrs);
    } catch (err) {
      console.error('Failed to load CRM dashboard', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-8 text-center text-slate-500 animate-pulse">Loading CRM Dashboard...</div>;

  const activeClients = clients.filter(c => c.status === 'ACTIVE').length;
  const activeContracts = contracts.filter(c => c.status === 'ACTIVE').length;
  const underReview = contracts.filter(c => c.status === 'UNDER_REVIEW' || c.status === 'SUBMITTED').length;
  const renewalPending = contracts.filter(c => c.status === 'RENEWAL_PENDING' || c.status === 'EXPIRING').length;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div 
          onClick={() => onNavigate('CLIENTS')}
          className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm cursor-pointer hover:border-indigo-300 transition-colors"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-700">Active Clients</h3>
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
              <Building2 className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-bold text-slate-800">{activeClients}</div>
          <div className="text-xs text-slate-500 mt-2">Out of {clients.length} total clients</div>
        </div>

        <div 
          onClick={() => onNavigate('CONTRACTS')}
          className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm cursor-pointer hover:border-emerald-300 transition-colors"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-700">Active Contracts</h3>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
              <CheckCircle className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-bold text-slate-800">{activeContracts}</div>
          <div className="text-xs text-slate-500 mt-2">Currently delivering services</div>
        </div>

        <div 
          onClick={() => onNavigate('CONTRACTS')}
          className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm cursor-pointer hover:border-amber-300 transition-colors"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-700">Under Review</h3>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-bold text-slate-800">{underReview}</div>
          <div className="text-xs text-slate-500 mt-2">Pending BPM approval</div>
        </div>

        <div 
          onClick={() => onNavigate('CONTRACTS')}
          className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm cursor-pointer hover:border-red-300 transition-colors"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-700">Renewal / Expiring</h3>
            <div className="p-2 bg-red-50 text-red-600 rounded-lg">
              <AlertCircle className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-bold text-slate-800">{renewalPending}</div>
          <div className="text-xs text-slate-500 mt-2">Requires immediate attention</div>
        </div>

      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
          <h3 className="font-bold text-lg mb-4 text-slate-800">Recent Clients</h3>
          <div className="space-y-3">
            {clients.slice(0, 5).map(c => (
              <div key={c.id} className="flex justify-between items-center p-3 hover:bg-slate-50 rounded-lg border border-transparent hover:border-slate-100 transition-colors">
                <div>
                  <p className="font-medium text-slate-800">{c.legalName}</p>
                  <p className="text-xs text-slate-500">{c.clientCode} • {c.clientType}</p>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${c.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                  {c.status}
                </span>
              </div>
            ))}
            {clients.length === 0 && <p className="text-sm text-slate-500 text-center py-4">No clients yet.</p>}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
          <h3 className="font-bold text-lg mb-4 text-slate-800">Expiring & Renewing Contracts</h3>
          <div className="space-y-3">
            {contracts.filter(c => c.status === 'EXPIRING' || c.status === 'RENEWAL_PENDING').slice(0, 5).map(c => (
              <div key={c.id} className="flex justify-between items-center p-3 hover:bg-slate-50 rounded-lg border border-transparent hover:border-slate-100 transition-colors">
                <div>
                  <p className="font-medium text-slate-800">{c.contractTitle}</p>
                  <p className="text-xs text-slate-500">{c.contractNumber} • Ends: {new Date(c.endDate).toLocaleDateString()}</p>
                </div>
                <span className="text-xs px-2 py-1 rounded-full font-medium bg-red-100 text-red-700">
                  {c.status}
                </span>
              </div>
            ))}
            {contracts.filter(c => c.status === 'EXPIRING' || c.status === 'RENEWAL_PENDING').length === 0 && (
              <p className="text-sm text-slate-500 text-center py-4">No urgent contract renewals.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
