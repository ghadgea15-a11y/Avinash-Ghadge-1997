import React, { useState, useEffect } from 'react';
import { UserSession, CompanyTenant, ContractRecord, ClientRecord, ContractStatus } from '../../types';
import { crmService } from '../../services/crmService';
import { Search, Plus, FileText, AlertCircle, Edit, CheckCircle, Clock } from 'lucide-react';
import { contractExpiryEngine } from '../../services/contractExpiryEngine';

interface Props {
  session: UserSession;
  company: CompanyTenant;
}

export const ContractRegisterTab: React.FC<Props> = ({ session, company }) => {
  const [contracts, setContracts] = useState<ContractRecord[]>([]);
  const [clients, setClients] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [calculating, setCalculating] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [editingContract, setEditingContract] = useState<Partial<ContractRecord> | null>(null);

  useEffect(() => {
    loadData();
  }, [company.companyId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const cls = await crmService.getClients(company.companyId);
      const clientMap: Record<string, string> = {};
      cls.forEach(c => { clientMap[c.id] = c.legalName; });
      setClients(clientMap);

      const ctrs = await crmService.getContracts(company.companyId);
      setContracts(ctrs);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const runExpiryCheck = async () => {
    setCalculating(true);
    try {
      await contractExpiryEngine.generateExpiryAlerts(company.companyId, contracts);
      await loadData();
    } catch (e) {
      console.error(e);
    } finally {
      setCalculating(false);
    }
  };

  const filteredContracts = contracts.filter(c => {
    const s = search.toLowerCase();
    const matchSearch = c.contractTitle.toLowerCase().includes(s) || c.contractNumber.toLowerCase().includes(s) || (clients[c.clientId] || '').toLowerCase().includes(s);
    if (!matchSearch) return false;
    
    if (statusFilter !== 'ALL' && c.status !== statusFilter) return false;
    
    return true;
  });

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingContract || !editingContract.clientId || !editingContract.contractNumber) return;

    try {
      if (editingContract.id) {
        await crmService.updateContract(company.companyId, editingContract.id, editingContract.clientId, editingContract, session.userId, session.fullName || session.email);
      } else {
        const newContract = {
          ...editingContract,
          id: crypto.randomUUID(),
          companyId: company.companyId,
          createdByUid: session.userId,
          createdByName: session.fullName || session.email,
        } as Omit<ContractRecord, 'createdAt' | 'updatedAt'>;
        
        await crmService.createContract(company.companyId, newContract);
      }
      setShowModal(false);
      loadData();
    } catch (err) {
      console.error(err);
      alert('Failed to save contract');
    }
  };

  const openNewContract = () => {
    setEditingContract({
      contractNumber: 'CTR-' + Math.floor(1000 + Math.random() * 9000),
      contractTitle: '',
      clientId: '',
      contractType: 'MASTER_SERVICES',
      status: 'DRAFT',
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date(Date.now() + 31536000000).toISOString().split('T')[0], // +1 year
      renewalType: 'AUTO'
    });
    setShowModal(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'DRAFT': return 'bg-slate-100 text-slate-600 border-slate-200';
      case 'UNDER_REVIEW': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'EXPIRING': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'RENEWAL_PENDING': return 'bg-red-100 text-red-800 border-red-200';
      case 'EXPIRED': return 'bg-rose-100 text-rose-800 border-rose-200';
      default: return 'bg-indigo-100 text-indigo-800 border-indigo-200';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="relative w-full md:w-96 flex gap-2 flex-col sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-5 w-5 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search contracts..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 w-full"
            />
          </div>
          <select 
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border border-slate-200 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-900"
          >
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="EXPIRING">Expiring Soon</option>
            <option value="RENEWAL_PENDING">Renewal Pending</option>
            <option value="EXPIRED">Expired</option>
            <option value="TERMINATED">Terminated</option>
            <option value="CLOSED">Closed</option>
          </select>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={runExpiryCheck} 
            disabled={calculating}
            className="btn-secondary py-1.5 text-sm flex items-center gap-1"
          >
            {calculating ? 'Checking...' : <><Clock className="w-4 h-4" /> Run Expiry Check</>}
          </button>
          <button onClick={openNewContract} className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors font-medium">
            <Plus className="w-4 h-4" /> New Contract
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-white dark:bg-slate-950">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Contract Details</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Client</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Period</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Type / Value</th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-slate-900 divide-y divide-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-500 dark:text-slate-400 animate-pulse">Loading contracts...</td>
                </tr>
              ) : filteredContracts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-500 dark:text-slate-400 flex flex-col items-center">
                    <FileText className="w-12 h-12 text-slate-300 mb-2" />
                    No contracts found
                  </td>
                </tr>
              ) : (
                filteredContracts.map(contract => (
                  <tr key={contract.id} className="hover:bg-white dark:bg-slate-950 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-semibold text-black dark:text-white">{contract.contractTitle || "Untitled"}</span>
                        <span className="text-sm text-slate-500 dark:text-slate-400">{contract.contractNumber}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-black dark:text-slate-200">{clients[contract.clientId] || 'Unknown Client'}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-slate-600 dark:text-slate-400">
                        <div>{new Date(contract.startDate).toLocaleDateString()}</div>
                        <div className="text-slate-400">to {new Date(contract.endDate).toLocaleDateString()}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded-full border ${getStatusColor(contract.status)}`}>
                        {contract.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-slate-600 dark:text-slate-400">
                        {contract.contractType.replace(/_/g, ' ')}
                      </div>
                      <div className="text-sm font-medium text-black dark:text-white">
                        {contract.currency} {contract.contractValue?.toLocaleString() || '0'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button 
                        onClick={() => { setEditingContract(contract); setShowModal(true); }}
                        className="text-indigo-600 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 p-2 rounded-lg transition-colors inline-flex items-center"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-white dark:bg-slate-950">
              <h3 className="text-xl font-bold text-black dark:text-slate-200">
                {editingContract?.id ? 'Edit Contract' : 'New Contract'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 dark:text-slate-400">
                <AlertCircle className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto">
              <form id="contractForm" onSubmit={handleSave} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-900 dark:text-slate-300 mb-1">Contract Number</label>
                    <input 
                      type="text" 
                      required
                      value={editingContract?.contractNumber || ''}
                      onChange={e => setEditingContract({...editingContract, contractNumber: e.target.value})}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-900 dark:text-slate-300 mb-1">Contract Title</label>
                    <input 
                      type="text" 
                      required
                      value={editingContract?.contractTitle || ''}
                      onChange={e => setEditingContract({...editingContract, contractTitle: e.target.value})}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-900 dark:text-slate-300 mb-1">Client</label>
                    <select
                      required
                      value={editingContract?.clientId || ''}
                      onChange={e => setEditingContract({...editingContract, clientId: e.target.value})}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-900"
                    >
                      <option value="">Select Client...</option>
                      {Object.entries(clients).map(([id, name]) => (
                        <option key={id} value={id}>{name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-900 dark:text-slate-300 mb-1">Status</label>
                    <select
                      value={editingContract?.status || 'DRAFT'}
                      onChange={e => setEditingContract({...editingContract, status: e.target.value as ContractStatus})}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-900"
                    >
                      <option value="DRAFT">Draft</option>
                      <option value="SUBMITTED">Submitted</option>
                      <option value="UNDER_REVIEW">Under Review</option>
                      <option value="APPROVED">Approved</option>
                      <option value="ACTIVE">Active</option>
                      <option value="EXPIRING">Expiring Soon</option>
                      <option value="RENEWAL_PENDING">Renewal Pending</option>
                      <option value="RENEWED">Renewed</option>
                      <option value="EXPIRED">Expired</option>
                      <option value="TERMINATED">Terminated</option>
                      <option value="CLOSED">Closed</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-900 dark:text-slate-300 mb-1">Start Date</label>
                    <input 
                      type="date" 
                      required
                      value={editingContract?.startDate || ''}
                      onChange={e => setEditingContract({...editingContract, startDate: e.target.value})}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-900 dark:text-slate-300 mb-1">End Date</label>
                    <input 
                      type="date" 
                      required
                      value={editingContract?.endDate || ''}
                      onChange={e => setEditingContract({...editingContract, endDate: e.target.value})}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-900 dark:text-slate-300 mb-1">Contract Type</label>
                    <select
                      value={editingContract?.contractType || 'MASTER_SERVICES'}
                      onChange={e => setEditingContract({...editingContract, contractType: e.target.value as any})}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-900"
                    >
                      <option value="MASTER_SERVICES">Master Services</option>
                      <option value="SITE_SPECIFIC">Site Specific</option>
                      <option value="SUBCONTRACT">Subcontract</option>
                      <option value="ONE_OFF">One Off</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-900 dark:text-slate-300 mb-1">Renewal Type</label>
                    <select
                      value={editingContract?.renewalType || 'AUTO'}
                      onChange={e => setEditingContract({...editingContract, renewalType: e.target.value as any})}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-900"
                    >
                      <option value="AUTO">Automatic</option>
                      <option value="MANUAL">Manual</option>
                      <option value="NON_RENEWABLE">Non-Renewable</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-900 dark:text-slate-300 mb-1">Contract Value</label>
                    <input 
                      type="number" 
                      value={editingContract?.contractValue || 0}
                      onChange={e => setEditingContract({...editingContract, contractValue: parseFloat(e.target.value)})}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-900 dark:text-slate-300 mb-1">Currency</label>
                    <select
                      value={editingContract?.currency || 'USD'}
                      onChange={e => setEditingContract({...editingContract, currency: e.target.value})}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-900"
                    >
                      <option value="USD">USD</option>
                      <option value="EUR">EUR</option>
                      <option value="GBP">GBP</option>
                      <option value="AUD">AUD</option>
                    </select>
                  </div>
                </div>
              </form>
            </div>
            
            <div className="p-6 border-t border-slate-200 bg-white dark:bg-slate-950 flex justify-end gap-3">
              <button 
                type="button" 
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-900 border border-slate-300 rounded-lg hover:bg-white dark:bg-slate-950 transition-colors"
              >
                Cancel
              </button>
              <button 
                type="submit" 
                form="contractForm"
                className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
              >
                Save Contract
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
