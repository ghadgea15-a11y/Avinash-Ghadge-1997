import React, { useState, useEffect } from 'react';
import { UserSession, CompanyTenant, SlaDefinitionRecord, SlaMeasurementType, SlaSeverity, ContractRecord } from '../../types';
import { slaService } from '../../services/slaService';
import { crmService } from '../../services/crmService';
import { X, Target, Save } from 'lucide-react';

interface Props {
  session: UserSession;
  company: CompanyTenant;
  onClose: () => void;
  onSaved: () => void;
}

export const CreateSlaModal: React.FC<Props> = ({ session, company, onClose, onSaved }) => {
  const [contracts, setContracts] = useState<ContractRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    contractId: '',
    slaName: '',
    slaCode: '',
    description: '',
    measurementType: 'RESOLUTION_TIME' as SlaMeasurementType,
    targetValue: 24,
    targetUnit: 'HOURS' as 'MINUTES' | 'HOURS' | 'DAYS' | 'PERCENTAGE',
    severity: 'MEDIUM' as SlaSeverity,
    effectiveFrom: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    const loadContracts = async () => {
      try {
        const res = await crmService.getContracts(company.companyId);
        setContracts(res.filter(c => c.status === 'ACTIVE' || c.status === 'APPROVED'));
        if (res.length > 0) {
          setFormData(prev => ({ ...prev, contractId: res[0].id }));
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    loadContracts();
  }, [company.companyId]);

  const handleSave = async () => {
    if (!formData.contractId || !formData.slaName || !formData.slaCode) return;
    setSaving(true);
    try {
      const contract = contracts.find(c => c.id === formData.contractId);
      if (!contract) throw new Error('Contract not found');

      const sla: SlaDefinitionRecord = {
        id: `SLA-${Date.now()}`,
        companyId: company.companyId,
        clientId: contract.clientId,
        contractId: contract.id,
        slaCode: formData.slaCode.toUpperCase(),
        slaName: formData.slaName,
        description: formData.description,
        measurementType: formData.measurementType,
        targetValue: formData.targetValue,
        targetUnit: formData.targetUnit,
        severity: formData.severity,
        effectiveFrom: new Date(formData.effectiveFrom).toISOString(),
        status: 'ACTIVE',
        createdBy: session.userId,
        createdAt: new Date().toISOString(),
        updatedBy: session.userId,
        updatedAt: new Date().toISOString()
      };

      await slaService.saveSlaDefinition(company.companyId, sla);
      onSaved();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Target className="w-5 h-5 text-indigo-600" />
            Create SLA Definition
          </h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full">
            <X className="w-5 h-5" />
          </button>
        </div>

        {loading ? (
          <div className="p-6 text-center text-slate-500">Loading contracts...</div>
        ) : contracts.length === 0 ? (
           <div className="p-6 text-center text-red-500">No active contracts found. Please create a contract first.</div>
        ) : (
          <div className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Contract</label>
              <select
                value={formData.contractId}
                onChange={e => setFormData({ ...formData, contractId: e.target.value })}
                className="w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              >
                {contracts.map(c => (
                  <option key={c.id} value={c.id}>{c.contractNumber} - {c.contractTitle}</option>
                ))}
              </select>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">SLA Code</label>
                <input
                  type="text"
                  placeholder="e.g. SLA-RES-01"
                  value={formData.slaCode}
                  onChange={e => setFormData({ ...formData, slaCode: e.target.value })}
                  className="w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm uppercase"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">SLA Name</label>
                <input
                  type="text"
                  placeholder="e.g. Critical Issue Resolution"
                  value={formData.slaName}
                  onChange={e => setFormData({ ...formData, slaName: e.target.value })}
                  className="w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
              <textarea
                value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
                className="w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Measurement Type</label>
                <select
                  value={formData.measurementType}
                  onChange={e => setFormData({ ...formData, measurementType: e.target.value as SlaMeasurementType })}
                  className="w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                >
                  <option value="RESOLUTION_TIME">Resolution Time</option>
                  <option value="RESPONSE_TIME">Response Time</option>
                  <option value="ATTENDANCE_COMPLIANCE">Attendance Compliance</option>
                  <option value="TASK_COMPLETION">Task Completion</option>
                  <option value="SERVICE_AVAILABILITY">Service Availability</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Severity</label>
                <select
                  value={formData.severity}
                  onChange={e => setFormData({ ...formData, severity: e.target.value as SlaSeverity })}
                  className="w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                >
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="CRITICAL">Critical</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Target Value</label>
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={formData.targetValue}
                  onChange={e => setFormData({ ...formData, targetValue: parseFloat(e.target.value) })}
                  className="w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Target Unit</label>
                <select
                  value={formData.targetUnit}
                  onChange={e => setFormData({ ...formData, targetUnit: e.target.value as any })}
                  className="w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                >
                  <option value="MINUTES">Minutes</option>
                  <option value="HOURS">Hours</option>
                  <option value="DAYS">Days</option>
                  <option value="PERCENTAGE">Percentage (%)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Effective From</label>
              <input
                type="date"
                value={formData.effectiveFrom}
                onChange={e => setFormData({ ...formData, effectiveFrom: e.target.value })}
                className="w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              />
            </div>
          </div>
        )}

        <div className="p-6 border-t border-slate-200 flex justify-end gap-3 bg-slate-50">
          <button onClick={onClose} className="btn-secondary">Cancel</button>
          <button 
            onClick={handleSave} 
            disabled={saving || !formData.contractId || !formData.slaName || !formData.slaCode} 
            className="btn-primary flex items-center gap-2"
          >
            {saving ? 'Saving...' : <><Save className="w-4 h-4" /> Save SLA</>}
          </button>
        </div>
      </div>
    </div>
  );
};
