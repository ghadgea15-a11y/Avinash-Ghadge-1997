import React, { useState } from 'react';
import { UserSession, SiteRecord, EmployeeRecord, AssetRecord, AssetCondition } from '../../types';
import { EamService } from '../../services/eamService';
import { X, Send, AlertTriangle } from 'lucide-react';

interface ModalProps {
  session: UserSession;
  asset: AssetRecord;
  sites: SiteRecord[];
  employees: EmployeeRecord[];
  onClose: () => void;
}

export function AssetDeploymentModal({ session, asset, sites, employees, onClose }: ModalProps) {
  const [submitting, setSubmitting] = useState(false);
  const [siteId, setSiteId] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [condition, setCondition] = useState<AssetCondition>(asset.condition);
  const [expectedReturnDate, setExpectedReturnDate] = useState('');

  const handleDeploy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!siteId || !employeeId) return;

    setSubmitting(true);
    const emp = employees.find(e => e.id === employeeId);
    const empName = emp ? `${emp.firstName} ${emp.lastName}` : '';
    
    const success = await EamService.deployAsset(
      session.companyId,
      asset,
      employeeId,
      empName,
      siteId,
      session.userId,
      session.fullName,
      condition,
      expectedReturnDate
    );
    
    setSubmitting(false);
    if (success) {
      onClose();
    } else {
      alert('Failed to deploy asset.');
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-indigo-600 text-white">
          <div>
            <h3 className="font-bold">Deploy Asset</h3>
            <p className="text-xs text-indigo-100">{asset.assetName} ({asset.assetCode})</p>
          </div>
          <button onClick={onClose} className="hover:bg-indigo-700 p-1 rounded transition-colors"><X className="w-5 h-5" /></button>
        </div>

        <form onSubmit={handleDeploy} className="p-6 overflow-y-auto flex-1 space-y-5">
          <div className="bg-indigo-50 p-3 rounded-lg flex items-start gap-3 border border-indigo-100">
            <AlertTriangle className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
            <p className="text-sm text-indigo-800">
              Deploying an asset will immediately assign custody to the selected employee. They must acknowledge receipt.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Target Site/Location *</label>
            <select 
              required
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              value={siteId}
              onChange={e => setSiteId(e.target.value)}
            >
              <option value="">Select a location</option>
              {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Assign to Custodian (Employee) *</label>
            <select 
              required
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              value={employeeId}
              onChange={e => setEmployeeId(e.target.value)}
            >
              <option value="">Select an employee</option>
              {employees.filter(e => e.assignedSiteId === siteId || !siteId).map(emp => (
                <option key={emp.id} value={emp.id}>{emp.firstName} {emp.lastName} ({emp.employeeId})</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Handover Condition *</label>
              <select 
                required
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                value={condition}
                onChange={e => setCondition(e.target.value as AssetCondition)}
              >
                <option value="NEW">New</option>
                <option value="GOOD">Good</option>
                <option value="FAIR">Fair</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Expected Return Date</label>
              <input 
                type="date" 
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                value={expectedReturnDate}
                onChange={e => setExpectedReturnDate(e.target.value)}
              />
            </div>
          </div>
        </form>
        
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3 shrink-0">
          <button type="button" onClick={onClose} className="px-4 py-2 font-medium text-slate-700 hover:bg-slate-100 rounded-lg">
            Cancel
          </button>
          <button 
            onClick={handleDeploy} 
            disabled={submitting || !siteId || !employeeId}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg font-medium flex items-center gap-2"
          >
            {submitting ? 'Deploying...' : <><Send className="w-4 h-4" /> Deploy Asset</>}
          </button>
        </div>
      </div>
    </div>
  );
}
