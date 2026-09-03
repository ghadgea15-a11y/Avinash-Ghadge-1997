import React, { useState, useEffect } from 'react';
import { useBackNavigation } from '../../hooks/useBackNavigation';
import { 
  Plus, 
  Edit2, 
  Trash2, 
  Save, 
  X, 
  AlertCircle, 
  Clock, 
  ShieldCheck, 
  CheckCircle2, 
  AlertTriangle, 
  Layers, 
  PlayCircle,
  HelpCircle,
  RotateCcw
} from 'lucide-react';
import { slaService } from '../../services/slaService';
import { ServiceSlaEngine } from '../../services/serviceSlaEngine';
import { 
  ServiceSlaPolicyRecord, 
  UserSession, 
  ServiceTicketPriority, 
  TicketCategoryRecord, 
  ClientRecord, 
  SiteRecord, 
  ContractRecord 
} from '../../types';

interface ServiceDeskSlaPolicyManagerProps {
  userSession: UserSession;
  activeCompany: { companyId: string };
  onClose: () => void;
  categories: TicketCategoryRecord[];
  clients: ClientRecord[];
  sites: SiteRecord[];
  contracts?: ContractRecord[];
}

export function ServiceDeskSlaPolicyManager({
  userSession,
  activeCompany,
  onClose,
  categories,
  clients,
  sites,
  contracts = []
}: ServiceDeskSlaPolicyManagerProps) {
  const [policies, setPolicies] = useState<ServiceSlaPolicyRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [editingPolicy, setEditingPolicy] = useState<Partial<ServiceSlaPolicyRecord> | null>(null);
  useBackNavigation(!!editingPolicy, () => setEditingPolicy(null as any), 'editingPolicy');
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string>('');

  // Simulator State
  const [simClient, setSimClient] = useState<string>('*');
  const [simContract, setSimContract] = useState<string>('*');
  const [simSite, setSimSite] = useState<string>('*');
  const [simCategory, setSimCategory] = useState<string>('*');
  const [simPriority, setSimPriority] = useState<ServiceTicketPriority>('MEDIUM');

  useEffect(() => {
    const unsub = slaService.subscribeToServiceSlaPolicies(activeCompany.companyId, (data) => {
      setPolicies(data);
      setLoading(false);
    });
    return () => unsub();
  }, [activeCompany.companyId]);

  const handleInitDefaults = async () => {
    try {
      setLoading(true);
      await slaService.initializeDefaultServiceSlaPolicies(activeCompany.companyId, userSession.userId);
      setSuccessMsg('Initialized default SLA policies successfully.');
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (e: any) {
      setError(e.message || 'Failed to initialize default SLA policies');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!editingPolicy?.policyName || !editingPolicy?.code) {
      setError('Policy Name and Code are required.');
      return;
    }

    if (!editingPolicy.responseTargetMinutes || editingPolicy.responseTargetMinutes <= 0) {
      setError('Response target minutes must be greater than 0.');
      return;
    }

    if (!editingPolicy.resolutionTargetMinutes || editingPolicy.resolutionTargetMinutes <= 0) {
      setError('Resolution target minutes must be greater than 0.');
      return;
    }

    setSaving(true);
    setError('');

    const payload: Partial<ServiceSlaPolicyRecord> = {
      ...editingPolicy,
      responseTargetMinutes: Number(editingPolicy.responseTargetMinutes),
      resolutionTargetMinutes: Number(editingPolicy.resolutionTargetMinutes),
      warningThresholdPercentage: Number(editingPolicy.warningThresholdPercentage) || 75,
      status: editingPolicy.status || 'ACTIVE'
    };

    const res = await slaService.saveServiceSlaPolicy(userSession, activeCompany.companyId, payload);
    setSaving(false);

    if (res.success) {
      setEditingPolicy(null);
      setSuccessMsg('SLA Policy saved successfully.');
      setTimeout(() => setSuccessMsg(''), 3000);
    } else {
      setError(res.error || 'Failed to save SLA policy.');
    }
  };

  const handleDelete = async (policy: ServiceSlaPolicyRecord) => {
    if (!confirm(`Are you sure you want to delete policy "${policy.policyName}" (${policy.code})?`)) return;
    const res = await slaService.deleteServiceSlaPolicy(userSession, activeCompany.companyId, policy.id);
    if (!res.success) {
      setError(res.error || 'Failed to delete policy.');
    } else {
      setSuccessMsg(`Deleted policy ${policy.code}.`);
      setTimeout(() => setSuccessMsg(''), 3000);
    }
  };

  // Test match calculation
  const testMatch = ServiceSlaEngine.matchPolicy(
    {
      clientId: simClient === '*' ? undefined : simClient,
      contractId: simContract === '*' ? undefined : simContract,
      siteId: simSite === '*' ? undefined : simSite,
      category: simCategory === '*' ? undefined : simCategory,
      priority: simPriority
    },
    policies
  );

  const isDark = document.documentElement.classList.contains('dark');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className={`w-full max-w-5xl max-h-[92vh] flex flex-col rounded-2xl shadow-2xl border ${isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-black'}`}>
        
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-5 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight">SLA Policies & Service Level Targets</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Configure deterministic response & resolution deadlines, 24x7 coverage, business hours, and warnings.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {policies.length === 0 && !loading && (
              <button
                onClick={handleInitDefaults}
                className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 transition-colors flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Initialize Standard SLAs
              </button>
            )}
            <button
              onClick={() => {
                setEditingPolicy({
                  policyName: '',
                  code: '',
                  description: '',
                  clientId: '*',
                  contractId: '*',
                  siteId: '*',
                  category: '*',
                  priority: '*',
                  responseTargetMinutes: 60,
                  resolutionTargetMinutes: 480,
                  warningThresholdPercentage: 75,
                  coverageType: '24X7',
                  businessHoursStart: '09:00',
                  businessHoursEnd: '18:00',
                  businessDays: [1, 2, 3, 4, 5],
                  status: 'ACTIVE',
                  escalateOnBreach: true,
                  escalateOnWarning: false
                });
              }}
              className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1.5 shadow-sm transition-all"
            >
              <Plus className="w-4 h-4" />
              Add Policy
            </button>
            <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500 dark:text-slate-400">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {error && (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl flex items-center gap-2 text-sm border border-red-200 dark:border-red-800">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-xl flex items-center gap-2 text-sm border border-emerald-200 dark:border-emerald-800">
              <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Form Modal / Panel */}
          {editingPolicy && (
            <div className="p-6 rounded-xl border border-blue-200 dark:border-blue-900/50 bg-blue-50/40 dark:bg-blue-950/20 space-y-5">
              <div className="flex justify-between items-center">
                <h3 className="text-base font-bold text-blue-900 dark:text-blue-300">
                  {editingPolicy.id ? `Edit SLA Policy: ${editingPolicy.code}` : 'Create New SLA Policy'}
                </h3>
                <button 
                  onClick={() => setEditingPolicy(null)}
                  className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:text-slate-300 dark:hover:text-slate-300"
                >
                  Cancel
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold mb-1 text-slate-900 dark:text-slate-300">Policy Name *</label>
                  <input
                    type="text"
                    placeholder="e.g. Critical 24x7 Facility Outage"
                    value={editingPolicy.policyName || ''}
                    onChange={e => setEditingPolicy({ ...editingPolicy, policyName: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1 text-slate-900 dark:text-slate-300">Policy Code *</label>
                  <input
                    type="text"
                    placeholder="e.g. SLA-CRIT-24X7"
                    value={editingPolicy.code || ''}
                    onChange={e => setEditingPolicy({ ...editingPolicy, code: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 dark:bg-slate-800 uppercase font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1 text-slate-900 dark:text-slate-300">Status</label>
                  <select
                    value={editingPolicy.status || 'ACTIVE'}
                    onChange={e => setEditingPolicy({ ...editingPolicy, status: e.target.value as any })}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="DRAFT">DRAFT</option>
                    <option value="INACTIVE">INACTIVE</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1 text-slate-900 dark:text-slate-300">Description</label>
                <input
                  type="text"
                  placeholder="Summary of terms, obligations, and coverage criteria"
                  value={editingPolicy.description || ''}
                  onChange={e => setEditingPolicy({ ...editingPolicy, description: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Scoping / Matching Criteria */}
              <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">
                  Scope & Applicability Filters (Leave as * for all)
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
                  <div>
                    <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">Client</label>
                    <select
                      value={editingPolicy.clientId || '*'}
                      onChange={e => setEditingPolicy({ ...editingPolicy, clientId: e.target.value })}
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 dark:bg-slate-800"
                    >
                      <option value="*">* All Clients</option>
                      {clients.map(c => (
                        <option key={c.id} value={c.id}>{c.legalName || c.displayName || c.id}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">Contract</label>
                    <select
                      value={editingPolicy.contractId || '*'}
                      onChange={e => setEditingPolicy({ ...editingPolicy, contractId: e.target.value })}
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 dark:bg-slate-800"
                    >
                      <option value="*">* All Contracts</option>
                      {contracts.map(cnt => (
                        <option key={cnt.id} value={cnt.id}>{cnt.contractTitle || cnt.contractNumber || cnt.id}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">Site</label>
                    <select
                      value={editingPolicy.siteId || '*'}
                      onChange={e => setEditingPolicy({ ...editingPolicy, siteId: e.target.value })}
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 dark:bg-slate-800"
                    >
                      <option value="*">* All Sites</option>
                      {sites.map(s => (
                        <option key={s.id} value={s.id}>{s.name || s.siteName || s.id}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">Category</label>
                    <select
                      value={editingPolicy.category || '*'}
                      onChange={e => setEditingPolicy({ ...editingPolicy, category: e.target.value })}
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 dark:bg-slate-800"
                    >
                      <option value="*">* All Categories</option>
                      {categories.map(cat => (
                        <option key={cat.id} value={cat.id}>{cat.name} ({cat.code})</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">Priority</label>
                    <select
                      value={editingPolicy.priority || '*'}
                      onChange={e => setEditingPolicy({ ...editingPolicy, priority: e.target.value as any })}
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 dark:bg-slate-800"
                    >
                      <option value="*">* All Priorities</option>
                      <option value="CRITICAL">CRITICAL</option>
                      <option value="HIGH">HIGH</option>
                      <option value="MEDIUM">MEDIUM</option>
                      <option value="LOW">LOW</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Target Deadlines & Coverage */}
              <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">
                  SLA Target Deadlines & Coverage Windows
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs font-semibold mb-1 text-slate-900 dark:text-slate-300">
                      Response Target (Minutes) *
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={editingPolicy.responseTargetMinutes || ''}
                      onChange={e => setEditingPolicy({ ...editingPolicy, responseTargetMinutes: Number(e.target.value) })}
                      className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 dark:bg-slate-800"
                    />
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 block">
                      {Math.round((editingPolicy.responseTargetMinutes || 0) / 60 * 10) / 10} hours
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold mb-1 text-slate-900 dark:text-slate-300">
                      Resolution Target (Minutes) *
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={editingPolicy.resolutionTargetMinutes || ''}
                      onChange={e => setEditingPolicy({ ...editingPolicy, resolutionTargetMinutes: Number(e.target.value) })}
                      className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 dark:bg-slate-800"
                    />
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 block">
                      {Math.round((editingPolicy.resolutionTargetMinutes || 0) / 60 * 10) / 10} hours
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold mb-1 text-slate-900 dark:text-slate-300">
                      Warning Threshold %
                    </label>
                    <input
                      type="number"
                      min={10}
                      max={95}
                      value={editingPolicy.warningThresholdPercentage || 75}
                      onChange={e => setEditingPolicy({ ...editingPolicy, warningThresholdPercentage: Number(e.target.value) })}
                      className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 dark:bg-slate-800"
                    />
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 block">
                      Triggers warning at {editingPolicy.warningThresholdPercentage || 75}% elapsed time
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold mb-1 text-slate-900 dark:text-slate-300">
                      Coverage Window
                    </label>
                    <select
                      value={editingPolicy.coverageType || '24X7'}
                      onChange={e => setEditingPolicy({ ...editingPolicy, coverageType: e.target.value as any })}
                      className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 dark:bg-slate-800"
                    >
                      <option value="24X7">24x7 Continuous</option>
                      <option value="BUSINESS_HOURS">Business Hours Only</option>
                    </select>
                  </div>
                </div>

                {editingPolicy.coverageType === 'BUSINESS_HOURS' && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3 p-3 rounded-lg bg-slate-100 dark:bg-slate-800/80">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Start Time</label>
                      <input
                        type="time"
                        value={editingPolicy.businessHoursStart || '09:00'}
                        onChange={e => setEditingPolicy({ ...editingPolicy, businessHoursStart: e.target.value })}
                        className="w-full px-2 py-1 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 dark:bg-slate-800"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">End Time</label>
                      <input
                        type="time"
                        value={editingPolicy.businessHoursEnd || '18:00'}
                        onChange={e => setEditingPolicy({ ...editingPolicy, businessHoursEnd: e.target.value })}
                        className="w-full px-2 py-1 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 dark:bg-slate-800"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Working Days</label>
                      <span className="text-xs text-slate-900 dark:text-slate-300">Monday - Friday (Standard Business Week)</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end items-center gap-3 pt-3 border-t border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setEditingPolicy(null)}
                  className="px-4 py-2 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="px-5 py-2 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1.5 shadow transition-all disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  {saving ? 'Saving Policy...' : 'Save SLA Policy'}
                </button>
              </div>
            </div>
          )}

          {/* SLA Policies List */}
          <div>
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 dark:text-slate-300">
                Configured Policies ({policies.length})
              </h3>
            </div>

            {loading ? (
              <div className="py-12 text-center text-sm text-slate-500 dark:text-slate-400">Loading SLA policies...</div>
            ) : policies.length === 0 ? (
              <div className="py-12 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                <Clock className="w-10 h-10 mx-auto text-slate-400 mb-3" />
                <p className="text-sm font-medium text-slate-900 dark:text-slate-300">No SLA policies defined yet.</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 mb-4">Initialize the default policies or create custom SLAs tailored to specific clients, sites, or categories.</p>
                <button
                  onClick={handleInitDefaults}
                  className="px-4 py-2 text-xs font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700"
                >
                  Initialize Standard SLA Set
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {policies.map(pol => {
                  const clientObj = clients.find(c => c.id === pol.clientId);
                  const siteObj = sites.find(s => s.id === pol.siteId);
                  const catObj = categories.find(c => c.id === pol.category);

                  return (
                    <div
                      key={pol.id}
                      className={`p-5 rounded-xl border transition-all ${
                        pol.status === 'ACTIVE' 
                          ? 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 hover:border-blue-400 dark:hover:border-blue-700' 
                          : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 opacity-70'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-300">
                              {pol.code}
                            </span>
                            <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                              pol.status === 'ACTIVE'
                                ? 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400'
                                : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
                            }`}>
                              {pol.status}
                            </span>
                            <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
                              {pol.coverageType === '24X7' ? '24x7 Coverage' : 'Business Hours'}
                            </span>
                          </div>
                          <h4 className="text-sm font-bold mt-1 text-black dark:text-white">{pol.policyName}</h4>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setEditingPolicy(pol)}
                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                            title="Edit Policy"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(pol)}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                            title="Delete Policy"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {pol.description && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">{pol.description}</p>
                      )}

                      {/* Targets Grid */}
                      <div className="grid grid-cols-3 gap-2 py-2.5 px-3 rounded-lg bg-white dark:bg-slate-950 dark:bg-slate-800/60 mb-3 text-center">
                        <div>
                          <span className="text-[11px] text-slate-500 dark:text-slate-400 block">Response</span>
                          <span className="text-xs font-bold text-black dark:text-white">
                            {pol.responseTargetMinutes >= 60 
                              ? `${Math.round(pol.responseTargetMinutes / 60 * 10) / 10}h` 
                              : `${pol.responseTargetMinutes}m`}
                          </span>
                        </div>
                        <div>
                          <span className="text-[11px] text-slate-500 dark:text-slate-400 block">Resolution</span>
                          <span className="text-xs font-bold text-black dark:text-white">
                            {pol.resolutionTargetMinutes >= 60 
                              ? `${Math.round(pol.resolutionTargetMinutes / 60 * 10) / 10}h` 
                              : `${pol.resolutionTargetMinutes}m`}
                          </span>
                        </div>
                        <div>
                          <span className="text-[11px] text-slate-500 dark:text-slate-400 block">Warning At</span>
                          <span className="text-xs font-bold text-amber-600 dark:text-amber-400">
                            {pol.warningThresholdPercentage || 75}%
                          </span>
                        </div>
                      </div>

                      {/* Scoping Tags */}
                      <div className="flex flex-wrap gap-1.5 text-xs text-slate-600 dark:text-slate-400">
                        <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800">
                          Priority: <strong>{pol.priority || 'ALL'}</strong>
                        </span>
                        {pol.category && pol.category !== '*' && (
                          <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800">
                            Cat: <strong>{catObj?.name || pol.category}</strong>
                          </span>
                        )}
                        {pol.clientId && pol.clientId !== '*' && (
                          <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800">
                            Client: <strong>{clientObj?.legalName || pol.clientId}</strong>
                          </span>
                        )}
                        {pol.siteId && pol.siteId !== '*' && (
                          <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800">
                            Site: <strong>{siteObj?.name || pol.siteId}</strong>
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Precedence Simulator / Rule Tester */}
          <div className="mt-8 p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/70 dark:bg-slate-800/40">
            <div className="flex items-center gap-2 mb-3">
              <PlayCircle className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <h3 className="text-sm font-bold text-black dark:text-white">
                SLA Precedence Tester & Due Time Simulator
              </h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Select ticket parameters below to test real-time deterministic SLA policy matching.
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Test Client</label>
                <select
                  value={simClient}
                  onChange={e => setSimClient(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 dark:bg-slate-800"
                >
                  <option value="*">* Generic Client</option>
                  {clients.map(c => (
                    <option key={c.id} value={c.id}>{c.legalName || c.displayName || c.id}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Test Site</label>
                <select
                  value={simSite}
                  onChange={e => setSimSite(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 dark:bg-slate-800"
                >
                  <option value="*">* Generic Site</option>
                  {sites.map(s => (
                    <option key={s.id} value={s.id}>{s.name || s.siteName || s.id}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Test Category</label>
                <select
                  value={simCategory}
                  onChange={e => setSimCategory(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 dark:bg-slate-800"
                >
                  <option value="*">* Generic Category</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name} ({cat.code})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Test Priority</label>
                <select
                  value={simPriority}
                  onChange={e => setSimPriority(e.target.value as ServiceTicketPriority)}
                  className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 dark:bg-slate-800 font-semibold"
                >
                  <option value="CRITICAL">CRITICAL</option>
                  <option value="HIGH">HIGH</option>
                  <option value="MEDIUM">MEDIUM</option>
                  <option value="LOW">LOW</option>
                </select>
              </div>
            </div>

            {/* Test Match Output */}
            <div className="p-4 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <span className="text-[11px] uppercase font-bold tracking-wider text-slate-500 dark:text-slate-400 block">Matched Policy</span>
                <span className="text-sm font-bold text-black dark:text-white">
                  {testMatch.policy ? testMatch.policy.policyName : 'Default Priority-Based Fallback'}
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400 block">
                  {testMatch.policy ? `Matched Code: ${testMatch.policy.code} (Specificity Score: ${testMatch.score})` : 'Standard default priority matrix'}
                </span>
              </div>

              <div className="flex items-center gap-6">
                <div>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 block">Target Response</span>
                  <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
                    {testMatch.policy 
                      ? `${testMatch.policy.responseTargetMinutes} mins` 
                      : `${ServiceSlaEngine.getDefaultTargetsByPriority(simPriority).responseMinutes} mins`}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 block">Target Resolution</span>
                  <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                    {testMatch.policy 
                      ? `${Math.round(testMatch.policy.resolutionTargetMinutes / 60 * 10) / 10} hours` 
                      : `${Math.round(ServiceSlaEngine.getDefaultTargetsByPriority(simPriority).resolutionMinutes / 60 * 10) / 10} hours`}
                  </span>
                </div>
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
