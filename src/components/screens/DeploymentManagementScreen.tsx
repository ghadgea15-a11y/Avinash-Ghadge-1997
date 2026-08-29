import React, { useState, useEffect } from 'react';
import { CompanyTenant, UserSession, DeploymentRecord, ClientRecord, EmployeeRecord, SiteRecord } from '../../types';
import { FirestoreService } from '../../services/firestoreService';
import { Layers, Plus, MapPin, Edit } from 'lucide-react';
import { useFeedback } from '../../context/ActionFeedbackContext';

interface Props {
  userSession: UserSession;
  activeCompany: CompanyTenant;
}

export const DeploymentManagementScreen: React.FC<Props> = ({ userSession, activeCompany }) => {
  const { showSuccess, showError, showLoading, showCancelled, showValidationFailed, handleError } = useFeedback();
  const [deployments, setDeployments] = useState<DeploymentRecord[]>([]);
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [employees, setEmployees] = useState<EmployeeRecord[]>([]);
  const [sites, setSites] = useState<SiteRecord[]>([]);
  const [shifts, setShifts] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  
  const [formData, setFormData] = useState<Partial<DeploymentRecord>>({
    employeeId: '', employeeName: '', siteId: '', siteName: '', clientId: '', clientName: '',
    startDate: new Date().toISOString().split('T')[0], status: 'ACTIVE', deploymentType: 'PERMANENT_POSTING',
    billingRateType: 'PER_SHIFT', billingRate: 0, assignedShiftTypeId: ''
  });

  useEffect(() => {
    let unsubs: (() => void)[] = [];
    
    const u1 = FirestoreService.subscribeToDeployments(userSession, activeCompany.companyId, (data: any) => setDeployments(data));
    const u2 = FirestoreService.subscribeToClients(userSession, activeCompany.companyId, (data: any) => setClients(data));
    const u3 = FirestoreService.subscribeToEmployees(userSession, activeCompany.companyId, (data: any) => setEmployees(data));
    const u4 = FirestoreService.subscribeToSites(activeCompany.companyId, (data: any) => setSites(data));
    const u5 = FirestoreService.subscribeToShifts(userSession, activeCompany.companyId, (data: any) => setShifts(data));
    
    unsubs.push(u1, u2, u3, u4, u5);
    setTimeout(() => setLoading(false), 1000); // Simple wait

    return () => unsubs.forEach(u => u());
  }, [userSession, activeCompany.companyId]);

  const handleSave = async () => {
    if (!formData.employeeId || !formData.siteId || !formData.clientId) {
      showValidationFailed("Employee, Site, and Client are required.");
      return;
    }
    
    const emp = employees.find(e => e.id === formData.employeeId);
    const site = sites.find(s => s.id === formData.siteId);
    const client = clients.find(c => c.id === formData.clientId);
    
    const oldDeployment = deployments.find(d => d.id === formData.id);

    const deployment: DeploymentRecord = {
      ...formData,
      id: formData.id || crypto.randomUUID(),
      companyId: activeCompany.companyId,
      employeeName: emp ? (emp.firstName + " " + emp.lastName) : "",
      siteName: site?.name || '',
      clientName: client?.legalName || '',
      createdAt: formData.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    } as DeploymentRecord;

    const dismiss = showLoading(formData.id ? 'Updating deployment...' : 'Creating new deployment...');
    try {
      await FirestoreService.saveDeployment(userSession, activeCompany.companyId, deployment, oldDeployment);
      dismiss();
      setShowCreate(false);
      setFormData({
        employeeId: '', siteId: '', clientId: '', startDate: new Date().toISOString().split('T')[0],
        status: 'ACTIVE', deploymentType: 'PERMANENT_POSTING', billingRateType: 'PER_SHIFT', billingRate: 0, assignedShiftTypeId: ''
      });
      showSuccess(`✓ Deployment for ${deployment.employeeName} saved successfully!`);
    } catch (err: any) {
      dismiss();
      handleError(err, '✕ Failed to save deployment');
    }
  };

  if (loading) return <div className="p-8 text-center">Loading Deployments...</div>;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Layers className="w-6 h-6 text-indigo-600" /> Deployment Management
          </h2>
          <p className="text-slate-500 dark:text-slate-400">Map employees to client sites and billing rates.</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700">
          <Plus className="w-4 h-4" /> New Deployment
        </button>
      </div>

      {showCreate && (
        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border mb-6">
          <h3 className="font-bold mb-4">{formData.id ? 'Edit Deployment' : 'New Deployment'}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <select className="p-2 border rounded" value={formData.employeeId} onChange={e => setFormData({...formData, employeeId: e.target.value})}>
              <option value="">Select Employee</option>
              {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.firstName + " " + emp.lastName} ({emp.employeeId || 'No ID'})</option>)}
            </select>
            
            <select className="p-2 border rounded" value={formData.clientId} onChange={e => setFormData({...formData, clientId: e.target.value})}>
              <option value="">Select Client</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.legalName}</option>)}
            </select>
            
            
            <select className="p-2 border rounded" value={formData.assignedShiftTypeId || ''} onChange={e => setFormData({...formData, assignedShiftTypeId: e.target.value})}>
              <option value="">Select Primary Shift</option>
              {shifts.map(shift => <option key={shift.id} value={shift.id}>{shift.name} ({shift.startTime}-{shift.endTime})</option>)}
            </select>
<select className="p-2 border rounded" value={formData.siteId} onChange={e => setFormData({...formData, siteId: e.target.value})}>
              <option value="">Select Site</option>
              {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>

            <select className="p-2 border rounded" value={formData.deploymentType} onChange={e => setFormData({...formData, deploymentType: e.target.value as any})}>
              <option value="PERMANENT_POSTING">Permanent Posting</option>
              <option value="TEMPORARY">Temporary</option>
              <option value="RELIEF">Relief</option>
            </select>

            <div className="flex items-center gap-2">
              <select className="p-2 border rounded" value={formData.billingRateType} onChange={e => setFormData({...formData, billingRateType: e.target.value as any})}>
                <option value="PER_SHIFT">Per Shift</option>
                <option value="MONTHLY_FIXED">Monthly Fixed</option>
                <option value="HOURLY">Hourly</option>
              </select>
              <input type="number" placeholder="Billing Rate" className="p-2 border rounded w-full" value={formData.billingRate || ''} onChange={e => setFormData({...formData, billingRate: Number(e.target.value)})} />
            </div>

            <input type="date" className="p-2 border rounded" value={formData.startDate} onChange={e => setFormData({...formData, startDate: e.target.value})} title="Start Date" />
            
            <select className="p-2 border rounded" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value as any})}>
              <option value="ACTIVE">Active</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
              <option value="ON_HOLD">On Hold</option>
            </select>

            {(formData.status === 'COMPLETED' || formData.status === 'CANCELLED') && (
               <input type="text" placeholder="End Reason (Required)" className="p-2 border rounded md:col-span-2" value={formData.endReason || ''} onChange={e => setFormData({...formData, endReason: e.target.value})} />
            )}
          </div>
          <div className="flex gap-2 mt-6">
            <button onClick={handleSave} className="bg-indigo-600 text-white px-4 py-2 rounded">Save Deployment</button>
            <button onClick={() => { setShowCreate(false); setFormData({}); }} className="bg-slate-200 px-4 py-2 rounded text-slate-900 dark:text-slate-300">Cancel</button>
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white dark:bg-slate-950 border-b border-slate-200 text-slate-600 dark:text-slate-400 text-sm">
                <th className="p-4 font-semibold">Employee</th>
                <th className="p-4 font-semibold">Client & Site</th>
                <th className="p-4 font-semibold">Type</th>
                <th className="p-4 font-semibold">Billing Rate</th>
                <th className="p-4 font-semibold">Status</th>
                <th className="p-4 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {deployments.map(dep => (
                <tr key={dep.id} className="hover:bg-white dark:bg-slate-950">
                  <td className="p-4 font-medium text-black dark:text-white">{dep.employeeName}</td>
                  <td className="p-4">
                    <div className="font-medium text-black dark:text-white">{dep.clientName}</div>
                    <div className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-1">
                      <MapPin className="w-3 h-3" /> {dep.siteName}
                    </div>
                  </td>
                  <td className="p-4">
                    <span className="text-sm bg-slate-100 text-slate-900 dark:text-slate-300 px-2 py-1 rounded">{dep.deploymentType.replace('_', ' ')}</span>
                  </td>
                  <td className="p-4">
                    <div className="font-medium">₹{dep.billingRate}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">{dep.billingRateType.replace('_', ' ')}</div>
                  </td>
                  <td className="p-4">
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      dep.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' :
                      dep.status === 'COMPLETED' ? 'bg-blue-100 text-blue-700' :
                      'bg-slate-100 text-slate-900'
                    }`}>
                      {dep.status}
                    </span>
                  </td>
                  <td className="p-4">
                    <button onClick={() => { setFormData(dep); setShowCreate(true); }} className="text-indigo-600 hover:text-indigo-900">
                      <Edit className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {deployments.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500 dark:text-slate-400">No deployments found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
