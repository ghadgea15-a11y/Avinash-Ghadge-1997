import React, { useState, useEffect } from 'react';
import { UserSession, CompanyTenant, ClientRecord } from '../../types';
import { crmService } from '../../services/crmService';
import { Search, Plus, Building2, MapPin, Phone, Mail, Edit } from 'lucide-react';

interface Props {
  session: UserSession;
  company: CompanyTenant;
}

export const ClientDirectoryTab: React.FC<Props> = ({ session, company }) => {
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  const [showModal, setShowModal] = useState(false);
  const [editingClient, setEditingClient] = useState<Partial<ClientRecord> | null>(null);

  useEffect(() => {
    loadClients();
  }, [company.companyId]);

  const loadClients = async () => {
    setLoading(true);
    try {
      const cls = await crmService.getClients(company.companyId);
      setClients(cls);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filteredClients = clients.filter(c => 
    c.legalName.toLowerCase().includes(search.toLowerCase()) ||
    c.clientCode.toLowerCase().includes(search.toLowerCase())
  );

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingClient || !editingClient.legalName) return;

    try {
      if (editingClient.id) {
        await crmService.updateClient(company.companyId, editingClient.id, editingClient, session.userId, session.fullName || session.email);
      } else {
        const newClient = {
          ...editingClient,
          id: crypto.randomUUID(),
          companyId: company.companyId,
          createdByUid: session.userId,
          createdByName: session.fullName || session.email,
        } as Omit<ClientRecord, 'createdAt' | 'updatedAt'>;
        
        await crmService.createClient(company.companyId, newClient);
      }
      setShowModal(false);
      loadClients();
    } catch (err) {
      console.error(err);
      alert('Failed to save client');
    }
  };

  const openNewClient = () => {
    setEditingClient({
      legalName: '',
      displayName: '',
      clientCode: 'CLI-' + Math.floor(1000 + Math.random() * 9000),
      clientType: 'CORPORATE',
      status: 'ONBOARDING'
    });
    setShowModal(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-2.5 h-5 w-5 text-slate-400" />
          <input
            type="text"
            placeholder="Search clients by name or code..."
            className="pl-10 pr-4 py-2 w-full border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <button 
          onClick={openNewClient}
          className="w-full md:w-auto flex items-center justify-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <Plus className="w-4 h-4" /> Add Client
        </button>
      </div>

      {loading ? (
        <div className="py-12 text-center text-slate-500">Loading directory...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredClients.map(client => (
            <div key={client.id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-shadow">
              <div className="p-5 border-b border-slate-100 flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 line-clamp-1" title={client.legalName}>{client.legalName}</h3>
                    <p className="text-xs text-slate-500">{client.clientCode} • {client.clientType}</p>
                  </div>
                </div>
                <button 
                  onClick={() => { setEditingClient(client); setShowModal(true); }}
                  className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"
                >
                  <Edit className="w-4 h-4" />
                </button>
              </div>
              <div className="p-5 space-y-3 bg-slate-50/50">
                {client.billingAddress && (
                  <div className="flex items-start gap-2 text-sm text-slate-600">
                    <MapPin className="w-4 h-4 mt-0.5 text-slate-400 shrink-0" />
                    <span className="line-clamp-2">{client.billingAddress}</span>
                  </div>
                )}
                {client.primaryContactEmail && (
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Mail className="w-4 h-4 text-slate-400 shrink-0" />
                    <span className="truncate">{client.primaryContactEmail}</span>
                  </div>
                )}
                <div className="pt-2 flex items-center justify-between">
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                    client.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' :
                    client.status === 'ONBOARDING' ? 'bg-blue-100 text-blue-700' :
                    'bg-slate-200 text-slate-700'
                  }`}>
                    {client.status}
                  </span>
                  <span className="text-xs text-slate-500">
                    Created {new Date(client.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
          ))}
          
          {filteredClients.length === 0 && (
            <div className="col-span-full py-12 text-center text-slate-500 border-2 border-dashed rounded-xl">
              No clients found matching your search.
            </div>
          )}
        </div>
      )}

      {/* Editor Modal */}
      {showModal && editingClient && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-slate-50 rounded-t-xl">
              <h3 className="text-lg font-bold text-slate-800">
                {editingClient.id ? 'Edit Client Profile' : 'New Client Profile'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 text-2xl leading-none">&times;</button>
            </div>
            
            <div className="p-6 overflow-y-auto">
              <form id="clientForm" onSubmit={handleSave} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Legal Name *</label>
                    <input required type="text" className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" 
                      value={editingClient.legalName || ''} onChange={e => setEditingClient({...editingClient, legalName: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Display Name</label>
                    <input type="text" className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" 
                      value={editingClient.displayName || ''} onChange={e => setEditingClient({...editingClient, displayName: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Client Code *</label>
                    <input required type="text" className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" 
                      value={editingClient.clientCode || ''} onChange={e => setEditingClient({...editingClient, clientCode: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Client Type *</label>
                    <select className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                      value={editingClient.clientType} onChange={e => setEditingClient({...editingClient, clientType: e.target.value as any})}>
                      <option value="CORPORATE">Corporate</option>
                      <option value="GOVERNMENT">Government</option>
                      <option value="INDUSTRIAL">Industrial</option>
                      <option value="RESIDENTIAL">Residential</option>
                      <option value="INSTITUTIONAL">Institutional</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Industry</label>
                    <input type="text" className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" 
                      value={editingClient.industry || ''} onChange={e => setEditingClient({...editingClient, industry: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Status *</label>
                    <select className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                      value={editingClient.status} onChange={e => setEditingClient({...editingClient, status: e.target.value as any})}>
                      <option value="ONBOARDING">Onboarding</option>
                      <option value="ACTIVE">Active</option>
                      <option value="INACTIVE">Inactive</option>
                      <option value="CLOSED">Closed</option>
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-1">Registration / Tax Details (e.g. GST)</label>
                    <input type="text" className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" 
                      value={editingClient.registrationDetails || ''} onChange={e => setEditingClient({...editingClient, registrationDetails: e.target.value})} />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-1">Billing Address</label>
                    <textarea className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" rows={2}
                      value={editingClient.billingAddress || ''} onChange={e => setEditingClient({...editingClient, billingAddress: e.target.value})} />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-1">Primary Contact Email</label>
                    <input type="email" className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" 
                      value={editingClient.primaryContactEmail || ''} onChange={e => setEditingClient({...editingClient, primaryContactEmail: e.target.value})} />
                  </div>
                </div>
              </form>
            </div>
            
            <div className="p-6 border-t border-slate-200 flex justify-end gap-3 bg-slate-50 rounded-b-xl">
              <button 
                type="button" 
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button 
                type="submit" 
                form="clientForm"
                className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
              >
                Save Client
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
