import React, { useState, useEffect } from 'react';
import { CompanyTenant, UserSession, ClientRecord } from '../../types';
import { FirestoreService } from '../../services/firestoreService';
import { Building2, Plus, Edit } from 'lucide-react';

interface Props {
  userSession: UserSession;
  activeCompany: CompanyTenant;
}

export const ClientManagementScreen: React.FC<Props> = ({ userSession, activeCompany }) => {
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [formData, setFormData] = useState<Partial<ClientRecord>>({
    clientName: '',
    clientType: 'CORPORATE',
    registeredAddress: '',
    gstNumber: '',
    contractStartDate: new Date().toISOString().split('T')[0],
    contractStatus: 'UNDER_NEGOTIATION',
    defaultBillingRateType: 'PER_SHIFT',
    defaultBillingRate: 0,
    primaryContactName: '',
    primaryContactPhone: '',
    primaryContactEmail: ''
  });

  useEffect(() => {
    const unsub = FirestoreService.subscribeToClients(userSession, activeCompany.companyId, (data) => {
      setClients(data);
      setLoading(false);
    });
    return () => unsub();
  }, [userSession, activeCompany.companyId]);

  const handleSave = async () => {
    if (!formData.clientName) return;
    
    const client: ClientRecord = {
      ...formData,
      id: formData.id || crypto.randomUUID(),
      companyId: activeCompany.companyId,
      createdAt: formData.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    } as ClientRecord;

    await FirestoreService.saveClient(activeCompany.companyId, client);
    setShowCreate(false);
    setFormData({
      clientName: '', clientType: 'CORPORATE', registeredAddress: '', contractStartDate: new Date().toISOString().split('T')[0],
      contractStatus: 'UNDER_NEGOTIATION', defaultBillingRateType: 'PER_SHIFT', defaultBillingRate: 0,
      primaryContactName: '', primaryContactPhone: '', primaryContactEmail: ''
    });
  };

  if (loading) return <div className="p-8 text-center">Loading Clients...</div>;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Building2 className="w-6 h-6 text-indigo-600" /> Client Management
          </h2>
          <p className="text-slate-500">Manage client organizations and contracts.</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700">
          <Plus className="w-4 h-4" /> Add Client
        </button>
      </div>

      {showCreate && (
        <div className="bg-white p-6 rounded-xl shadow-sm border mb-6">
          <h3 className="font-bold mb-4">{formData.id ? 'Edit Client' : 'New Client'}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input type="text" placeholder="Client Name" className="p-2 border rounded" value={formData.clientName} onChange={e => setFormData({...formData, clientName: e.target.value})} />
            <select className="p-2 border rounded" value={formData.clientType} onChange={e => setFormData({...formData, clientType: e.target.value as any})}>
              <option value="CORPORATE">Corporate</option>
              <option value="GOVERNMENT">Government</option>
              <option value="INDUSTRIAL">Industrial</option>
              <option value="RESIDENTIAL">Residential</option>
              <option value="INSTITUTIONAL">Institutional</option>
            </select>
            <input type="text" placeholder="Registered Address" className="p-2 border rounded md:col-span-2" value={formData.registeredAddress} onChange={e => setFormData({...formData, registeredAddress: e.target.value})} />
            <input type="text" placeholder="GST Number (Optional)" className="p-2 border rounded" value={formData.gstNumber} onChange={e => setFormData({...formData, gstNumber: e.target.value})} />
            <input type="date" className="p-2 border rounded" value={formData.contractStartDate} onChange={e => setFormData({...formData, contractStartDate: e.target.value})} title="Contract Start Date" />
            <select className="p-2 border rounded" value={formData.contractStatus} onChange={e => setFormData({...formData, contractStatus: e.target.value as any})}>
              <option value="UNDER_NEGOTIATION">Under Negotiation</option>
              <option value="ACTIVE">Active</option>
              <option value="EXPIRED">Expired</option>
              <option value="TERMINATED">Terminated</option>
            </select>
            <div className="flex items-center gap-2">
              <select className="p-2 border rounded" value={formData.defaultBillingRateType} onChange={e => setFormData({...formData, defaultBillingRateType: e.target.value as any})}>
                <option value="PER_SHIFT">Per Shift</option>
                <option value="MONTHLY_FIXED">Monthly Fixed</option>
                <option value="HOURLY">Hourly</option>
              </select>
              <input type="number" placeholder="Default Rate" className="p-2 border rounded w-full" value={formData.defaultBillingRate || ''} onChange={e => setFormData({...formData, defaultBillingRate: Number(e.target.value)})} />
            </div>
            <input type="text" placeholder="Primary Contact Name" className="p-2 border rounded" value={formData.primaryContactName} onChange={e => setFormData({...formData, primaryContactName: e.target.value})} />
            <input type="text" placeholder="Primary Contact Phone" className="p-2 border rounded" value={formData.primaryContactPhone} onChange={e => setFormData({...formData, primaryContactPhone: e.target.value})} />
            <input type="email" placeholder="Primary Contact Email" className="p-2 border rounded md:col-span-2" value={formData.primaryContactEmail} onChange={e => setFormData({...formData, primaryContactEmail: e.target.value})} />
          </div>
          <div className="flex gap-2 mt-6">
            <button onClick={handleSave} className="bg-indigo-600 text-white px-4 py-2 rounded">Save Client</button>
            <button onClick={() => { setShowCreate(false); setFormData({}); }} className="bg-slate-200 px-4 py-2 rounded text-slate-700">Cancel</button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {clients.map(client => (
          <div key={client.id} className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
            <div className="flex justify-between items-start mb-2">
              <h4 className="font-bold text-lg">{client.clientName}</h4>
              <span className={`text-xs px-2 py-1 rounded-full ${
                client.contractStatus === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' :
                client.contractStatus === 'UNDER_NEGOTIATION' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-700'
              }`}>
                {client.contractStatus}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm text-slate-600 mb-4">
              <div><span className="font-semibold text-slate-700">Type:</span> {client.clientType}</div>
              <div><span className="font-semibold text-slate-700">Start Date:</span> {new Date(client.contractStartDate).toLocaleDateString()}</div>
              <div><span className="font-semibold text-slate-700">Billing:</span> {client.defaultBillingRateType} (₹{client.defaultBillingRate})</div>
              <div><span className="font-semibold text-slate-700">Contact:</span> {client.primaryContactName}</div>
            </div>
            <div className="flex gap-2 border-t pt-4">
              <button 
                onClick={() => { setFormData(client); setShowCreate(true); }}
                className="text-xs bg-slate-100 text-slate-700 px-3 py-1.5 rounded flex items-center gap-1 hover:bg-slate-200"
              >
                <Edit className="w-3 h-3" /> Edit
              </button>
            </div>
          </div>
        ))}
        {clients.length === 0 && (
          <div className="col-span-full p-8 text-center text-slate-500 bg-slate-50 rounded-xl border border-dashed">
            No clients registered yet.
          </div>
        )}
      </div>
    </div>
  );
};
