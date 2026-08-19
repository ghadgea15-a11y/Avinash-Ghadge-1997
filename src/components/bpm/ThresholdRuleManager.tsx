import React, { useState, useEffect } from 'react';
import { 
  ThresholdRule, 
  ThresholdOperator, 
  SecondaryCondition, 
  BpmApprovalWorkflow 
} from '../../types/bpm';
import { UserSession } from '../../types';
import { BpmThresholdRoutingService } from '../../services/bpmThresholdRoutingService';
import { db } from '../../firebase';
import { collection, getDocs } from 'firebase/firestore';
import { 
  Sliders, 
  Plus, 
  Play, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Edit2, 
  Trash2, 
  ToggleLeft, 
  ToggleRight, 
  Layers, 
  FileText, 
  Search, 
  HelpCircle,
  Clock,
  ArrowRight,
  ShieldAlert,
  Sparkles
} from 'lucide-react';

interface ThresholdRuleManagerProps {
  session: UserSession;
}

const MODULE_OPTIONS = [
  { value: 'ALL', label: 'All Modules' },
  { value: 'SCM', label: 'Supply Chain / Purchase Orders' },
  { value: 'PURCHASE_ORDER', label: 'Purchase Orders' },
  { value: 'PAYROLL', label: 'Payroll & Salary Advances' },
  { value: 'BILLING', label: 'Billing & Commercial Rates' },
  { value: 'LEAVE', label: 'Leave Requests' },
  { value: 'OVERTIME', label: 'Overtime Requests' },
  { value: 'WORK_ORDER', label: 'Work Orders' },
  { value: 'CONTRACTS', label: 'Client Contracts' },
  { value: 'STOCK_TRANSFER', label: 'Stock / Material Transfers' }
];

const OPERATORS: { value: ThresholdOperator; label: string; desc: string }[] = [
  { value: '>', label: '> (Greater Than)', desc: 'Value is strictly greater' },
  { value: '>=', label: '>= (Greater Than or Equal)', desc: 'Value is greater or equal' },
  { value: '<', label: '< (Less Than)', desc: 'Value is strictly less' },
  { value: '<=', label: '<= (Less Than or Equal)', desc: 'Value is less or equal' },
  { value: '=', label: '= (Equals)', desc: 'Value matches exactly' },
  { value: '!=', label: '!= (Not Equals)', desc: 'Value does not match' },
  { value: 'IN', label: 'IN (Contained In List)', desc: 'Value is inside comma-separated list' },
  { value: 'NOT_IN', label: 'NOT_IN (Excluded From List)', desc: 'Value is not in comma-separated list' }
];

export const ThresholdRuleManager: React.FC<ThresholdRuleManagerProps> = ({ session }) => {
  const [activeTab, setActiveTab] = useState<'RULES' | 'SIMULATOR'>('RULES');
  const [rules, setRules] = useState<ThresholdRule[]>([]);
  const [workflows, setWorkflows] = useState<BpmApprovalWorkflow[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedModuleFilter, setSelectedModuleFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingRule, setEditingRule] = useState<ThresholdRule | null>(null);

  // Form Fields
  const [ruleName, setRuleName] = useState<string>('');
  const [moduleKey, setModuleKey] = useState<string>('SCM');
  const [transactionType, setTransactionType] = useState<string>('PURCHASE_ORDER');
  const [workflowId, setWorkflowId] = useState<string>('');
  const [field, setField] = useState<string>('amount');
  const [operator, setOperator] = useState<ThresholdOperator>('>');
  const [thresholdValue, setThresholdValue] = useState<string>('50000');
  const [priority, setPriority] = useState<number>(50);
  const [effectiveFrom, setEffectiveFrom] = useState<string>(new Date().toISOString().split('T')[0]);
  const [effectiveTo, setEffectiveTo] = useState<string>('');
  const [secondaryConditions, setSecondaryConditions] = useState<SecondaryCondition[]>([]);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Simulator State
  const [simModule, setSimModule] = useState<string>('SCM');
  const [simType, setSimType] = useState<string>('PURCHASE_ORDER');
  const [simPayloadJson, setSimPayloadJson] = useState<string>(
    JSON.stringify({ amount: 75000, departmentId: 'PROCUREMENT', siteId: 'SITE_MUMBAI_01' }, null, 2)
  );
  const [simResult, setSimResult] = useState<any>(null);

  useEffect(() => {
    loadData();
  }, [session.companyId]);

  const loadData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Rules
      const rulesList = await BpmThresholdRoutingService.getThresholdRules(session.companyId);
      setRules(rulesList);

      // 2. Fetch Workflows for selection
      const wfSnap = await getDocs(collection(db, 'companies', session.companyId, 'bpm_workflows'));
      const wfList: BpmApprovalWorkflow[] = [];
      wfSnap.forEach(d => wfList.push(d.data() as BpmApprovalWorkflow));
      setWorkflows(wfList);
      
      if (wfList.length > 0 && !workflowId) {
        setWorkflowId(wfList[0].workflowId);
      }
    } catch (err) {
      console.error('[ThresholdRuleManager] loadData error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (rule?: ThresholdRule) => {
    setFormError(null);
    if (rule) {
      setEditingRule(rule);
      setRuleName(rule.ruleName);
      setModuleKey(rule.module);
      setTransactionType(rule.transactionType);
      setWorkflowId(rule.workflowId);
      setField(rule.field);
      setOperator(rule.operator);
      setThresholdValue(String(rule.thresholdValue));
      setPriority(rule.priority);
      setEffectiveFrom(rule.effectiveFrom ? rule.effectiveFrom.split('T')[0] : '');
      setEffectiveTo(rule.effectiveTo ? rule.effectiveTo.split('T')[0] : '');
      setSecondaryConditions(rule.secondaryConditions || []);
    } else {
      setEditingRule(null);
      setRuleName('');
      setModuleKey('SCM');
      setTransactionType('PURCHASE_ORDER');
      setWorkflowId(workflows[0]?.workflowId || '');
      setField('amount');
      setOperator('>');
      setThresholdValue('50000');
      setPriority(50);
      setEffectiveFrom(new Date().toISOString().split('T')[0]);
      setEffectiveTo('');
      setSecondaryConditions([]);
    }
    setIsModalOpen(true);
  };

  const handleAddSecondaryCondition = () => {
    setSecondaryConditions([
      ...secondaryConditions,
      { field: 'department', operator: '=', value: '' }
    ]);
  };

  const handleRemoveSecondaryCondition = (index: number) => {
    setSecondaryConditions(secondaryConditions.filter((_, i) => i !== index));
  };

  const handleUpdateSecondaryCondition = (index: number, key: keyof SecondaryCondition, val: any) => {
    const updated = [...secondaryConditions];
    updated[index] = { ...updated[index], [key]: val };
    setSecondaryConditions(updated);
  };

  const handleSaveRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ruleName.trim()) {
      setFormError('Rule Name is required.');
      return;
    }
    if (!field.trim()) {
      setFormError('Comparison field is required.');
      return;
    }
    if (!workflowId) {
      setFormError('A target workflow must be selected.');
      return;
    }

    setIsSaving(true);
    setFormError(null);

    try {
      const selectedWf = workflows.find(w => w.workflowId === workflowId);
      const parsedValue = isNaN(Number(thresholdValue)) ? thresholdValue : Number(thresholdValue);

      await BpmThresholdRoutingService.saveThresholdRule(
        session.companyId,
        {
          ruleId: editingRule?.ruleId,
          ruleName: ruleName.trim(),
          module: moduleKey,
          transactionType: transactionType.trim(),
          workflowId,
          workflowVersion: selectedWf?.version || 1,
          field: field.trim(),
          operator,
          thresholdValue: parsedValue,
          secondaryConditions,
          priority: Number(priority) || 0,
          active: editingRule ? editingRule.active : true,
          effectiveFrom: effectiveFrom ? new Date(effectiveFrom).toISOString() : new Date().toISOString(),
          effectiveTo: effectiveTo ? new Date(effectiveTo).toISOString() : undefined,
          policyVersion: editingRule?.policyVersion || 1,
          createdAt: editingRule?.createdAt
        },
        session.userId,
        session.fullName || session.email || 'Admin'
      );

      setIsModalOpen(false);
      await loadData();
    } catch (err: any) {
      setFormError(err?.message || 'Failed to save threshold rule');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleStatus = async (rule: ThresholdRule) => {
    try {
      await BpmThresholdRoutingService.toggleRuleStatus(
        session.companyId,
        rule.id,
        !rule.active,
        session.userId,
        session.fullName || session.email || 'Admin'
      );
      await loadData();
    } catch (err) {
      console.error('[ThresholdRuleManager] handleToggleStatus error:', err);
    }
  };

  const handleDeleteRule = async (rule: ThresholdRule) => {
    if (!window.confirm(`Are you sure you want to delete rule "${rule.ruleName}"?`)) return;
    try {
      await BpmThresholdRoutingService.deleteThresholdRule(
        session.companyId,
        rule.id,
        session.userId,
        session.fullName || session.email || 'Admin'
      );
      await loadData();
    } catch (err) {
      console.error('[ThresholdRuleManager] handleDeleteRule error:', err);
    }
  };

  const handleRunSimulator = () => {
    try {
      const parsed = JSON.parse(simPayloadJson);
      const res = BpmThresholdRoutingService.simulateRouting(
        simModule,
        simType,
        parsed,
        rules,
        workflows
      );
      setSimResult(res);
    } catch (err: any) {
      alert(`Invalid JSON payload format: ${err.message}`);
    }
  };

  const filteredRules = rules.filter(r => {
    const matchesModule = selectedModuleFilter === 'ALL' || r.module === selectedModuleFilter || r.module === 'ALL';
    const matchesSearch = !searchQuery || 
      r.ruleName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.field.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.workflowId.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesModule && matchesSearch;
  });

  return (
    <div id="bpm-threshold-rules-root" className="space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2.5 bg-indigo-500/10 border border-indigo-500/30 rounded-lg text-indigo-400">
                <Sliders className="w-6 h-6" />
              </div>
              <h1 className="text-2xl font-bold text-white tracking-tight">Threshold Routing Engine</h1>
              <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                BPM Point 4 Active
              </span>
            </div>
            <p className="text-sm text-slate-400 max-w-2xl">
              Define deterministic business rules to route transactions (Purchase Orders, Advances, Overtime, Contracts) to specific multi-tier approval workflows based on amount, quantity, or organizational attributes.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              id="btn-tab-rules"
              onClick={() => setActiveTab('RULES')}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                activeTab === 'RULES'
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                  : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
              }`}
            >
              <span className="flex items-center gap-2">
                <Layers className="w-4 h-4" />
                Active Rules ({rules.length})
              </span>
            </button>
            <button
              id="btn-tab-simulator"
              onClick={() => setActiveTab('SIMULATOR')}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                activeTab === 'SIMULATOR'
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                  : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
              }`}
            >
              <span className="flex items-center gap-2">
                <Play className="w-4 h-4" />
                Rule Simulator
              </span>
            </button>
          </div>
        </div>
      </div>

      {activeTab === 'RULES' ? (
        <div className="space-y-4">
          {/* Controls Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-900/60 p-4 border border-slate-800 rounded-xl">
            <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search rules..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <select
                value={selectedModuleFilter}
                onChange={e => setSelectedModuleFilter(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
              >
                {MODULE_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            <button
              id="btn-create-rule"
              onClick={() => handleOpenModal()}
              className="w-full sm:w-auto px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-lg shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2 transition-all"
            >
              <Plus className="w-4 h-4" />
              Create Threshold Rule
            </button>
          </div>

          {/* Rules Table / Cards */}
          {loading ? (
            <div className="p-12 text-center text-slate-400">Loading threshold rules...</div>
          ) : filteredRules.length === 0 ? (
            <div className="p-12 text-center bg-slate-900/40 border border-slate-800 rounded-xl space-y-3">
              <Sliders className="w-12 h-12 text-slate-600 mx-auto mb-2" />
              <h3 className="text-lg font-semibold text-slate-300">No Threshold Rules Configured</h3>
              <p className="text-sm text-slate-500 max-w-md mx-auto">
                Transactions without matched threshold rules will automatically route through default module approval workflows.
              </p>
              <button
                onClick={() => handleOpenModal()}
                className="px-4 py-2 bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 rounded-lg hover:bg-indigo-600/30 text-sm font-medium transition-all"
              >
                Configure First Rule
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {filteredRules.map(rule => {
                const targetWf = workflows.find(w => w.workflowId === rule.workflowId || w.id === rule.workflowId);
                return (
                  <div
                    key={rule.id}
                    className={`bg-slate-900 border ${rule.active ? 'border-slate-800 hover:border-slate-700' : 'border-slate-800/50 opacity-60'} rounded-xl p-5 transition-all shadow-md`}
                  >
                    <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                      {/* Left: Rule Meta */}
                      <div className="space-y-1.5 flex-1">
                        <div className="flex items-center gap-3">
                          <h3 className="text-base font-bold text-white tracking-wide">{rule.ruleName}</h3>
                          <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${
                            rule.active 
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                              : 'bg-slate-800 text-slate-500 border border-slate-700'
                          }`}>
                            {rule.active ? 'ACTIVE' : 'INACTIVE'}
                          </span>
                          <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                            Priority {rule.priority}
                          </span>
                          <span className="px-2 py-0.5 text-xs font-medium rounded bg-slate-800 text-slate-300">
                            {rule.module}
                          </span>
                        </div>

                        {/* Condition Formula Box */}
                        <div className="flex flex-wrap items-center gap-2 pt-1 text-sm">
                          <span className="text-slate-400">Condition:</span>
                          <span className="px-2 py-0.5 bg-slate-950 border border-slate-800 rounded font-mono text-indigo-300 font-semibold">
                            {rule.field} {rule.operator} {String(rule.thresholdValue)}
                          </span>

                          {rule.secondaryConditions && rule.secondaryConditions.length > 0 && (
                            <>
                              <span className="text-xs text-slate-500 font-bold uppercase">AND</span>
                              {rule.secondaryConditions.map((sc, i) => (
                                <span key={i} className="px-2 py-0.5 bg-slate-950 border border-slate-800 rounded font-mono text-amber-300 text-xs">
                                  {sc.field} {sc.operator} {String(sc.value)}
                                </span>
                              ))}
                            </>
                          )}
                        </div>

                        {/* Workflow target & dates */}
                        <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 pt-1">
                          <div className="flex items-center gap-1 text-slate-300">
                            <ArrowRight className="w-3.5 h-3.5 text-indigo-400" />
                            <span>Routes to: <strong className="text-white">{targetWf?.workflowName || rule.workflowId}</strong></span>
                            {targetWf && (
                              <span className="text-slate-500">({targetWf.steps.length} Tiers)</span>
                            )}
                          </div>

                          <div className="flex items-center gap-1 text-slate-500">
                            <Clock className="w-3.5 h-3.5" />
                            <span>Effective: {rule.effectiveFrom ? new Date(rule.effectiveFrom).toLocaleDateString() : 'Immediate'}</span>
                            {rule.effectiveTo && <span> - {new Date(rule.effectiveTo).toLocaleDateString()}</span>}
                          </div>
                        </div>
                      </div>

                      {/* Right: Actions */}
                      <div className="flex items-center gap-2 self-end lg:self-center">
                        <button
                          onClick={() => handleToggleStatus(rule)}
                          className={`p-2 rounded-lg border transition-all ${
                            rule.active 
                              ? 'border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10' 
                              : 'border-slate-700 text-slate-500 hover:bg-slate-800'
                          }`}
                          title={rule.active ? 'Deactivate Rule' : 'Activate Rule'}
                        >
                          {rule.active ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
                        </button>
                        <button
                          onClick={() => handleOpenModal(rule)}
                          className="p-2 rounded-lg border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800 transition-all"
                          title="Edit Rule"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteRule(rule)}
                          className="p-2 rounded-lg border border-rose-500/20 text-rose-400 hover:bg-rose-500/10 transition-all"
                          title="Delete Rule"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* SIMULATOR TAB */
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-6 shadow-xl">
          <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
            <Sparkles className="w-6 h-6 text-indigo-400" />
            <div>
              <h2 className="text-lg font-bold text-white">Rule Simulator (Dry Run)</h2>
              <p className="text-xs text-slate-400">
                Safely test threshold rules against sample payload values without creating live approval instances or modifying business records.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left: Input Payload */}
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Module</label>
                  <select
                    value={simModule}
                    onChange={e => setSimModule(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                  >
                    {MODULE_OPTIONS.filter(o => o.value !== 'ALL').map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Transaction Type</label>
                  <input
                    type="text"
                    value={simType}
                    onChange={e => setSimType(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Transaction Sample Payload (JSON)</label>
                <textarea
                  rows={8}
                  value={simPayloadJson}
                  onChange={e => setSimPayloadJson(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs font-mono text-emerald-300 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <button
                id="btn-run-sim"
                onClick={handleRunSimulator}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-lg shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 transition-all"
              >
                <Play className="w-4 h-4" />
                Run Simulation
              </button>
            </div>

            {/* Right: Simulation Output */}
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-4">
              <h3 className="text-sm font-bold text-slate-300 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                Simulation Output & Trace
              </h3>

              {simResult ? (
                <div className="space-y-4">
                  {/* Outcome Banner */}
                  <div className={`p-4 rounded-lg border ${
                    simResult.matched 
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' 
                      : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                  }`}>
                    <div className="font-bold text-sm">
                      {simResult.matched 
                        ? `✓ Matched Rule: ${simResult.matchedRule?.ruleName}` 
                        : 'ℹ Default Workflow Fallback'}
                    </div>
                    <div className="text-xs mt-1">
                      Target Workflow: <strong className="text-white">{simResult.selectedWorkflow?.workflowName || simResult.decision?.selectedWorkflowId}</strong>
                      {simResult.selectedWorkflow?.steps && (
                        <span> ({simResult.selectedWorkflow.steps.length} sequential tiers)</span>
                      )}
                    </div>
                  </div>

                  {/* Decision Object */}
                  <div className="space-y-1">
                    <span className="text-xs text-slate-400 font-semibold">Persisted Routing Decision Object:</span>
                    <pre className="p-3 bg-slate-900 border border-slate-800 rounded-lg text-xs font-mono text-slate-300 overflow-x-auto max-h-48">
                      {JSON.stringify(simResult.decision, null, 2)}
                    </pre>
                  </div>

                  {/* Trace Logs */}
                  <div className="space-y-1">
                    <span className="text-xs text-slate-400 font-semibold">Evaluation Trace:</span>
                    <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg text-xs font-mono text-slate-400 space-y-1 max-h-36 overflow-y-auto">
                      {simResult.trace.map((t: string, i: number) => (
                        <div key={i} className={t.startsWith('✓') ? 'text-emerald-400' : t.startsWith('✗') ? 'text-slate-500' : 'text-slate-300'}>
                          {t}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center text-slate-500 text-xs">
                  Configure sample inputs and click "Run Simulation" to inspect threshold route resolution.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* CREATE / EDIT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2">
                <Sliders className="w-5 h-5 text-indigo-400" />
                <h2 className="text-lg font-bold text-white">
                  {editingRule ? 'Edit Threshold Rule' : 'Create Threshold Rule'}
                </h2>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            {formError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg text-xs text-rose-400">
                {formError}
              </div>
            )}

            <form onSubmit={handleSaveRule} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Rule Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g., High-Value PO Approval Route"
                    value={ruleName}
                    onChange={e => setRuleName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Module *</label>
                  <select
                    value={moduleKey}
                    onChange={e => setModuleKey(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                  >
                    {MODULE_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Transaction Type</label>
                  <input
                    type="text"
                    placeholder="e.g. PURCHASE_ORDER, SALARY_ADVANCE, or ALL"
                    value={transactionType}
                    onChange={e => setTransactionType(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Target BPM Workflow *</label>
                  <select
                    value={workflowId}
                    onChange={e => setWorkflowId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                  >
                    {workflows.map(wf => (
                      <option key={wf.workflowId} value={wf.workflowId}>
                        {wf.workflowName} ({wf.module} - {wf.steps?.length || 0} Tiers)
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Primary Condition Builder */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
                <div className="text-xs font-bold text-indigo-400 uppercase tracking-wider">
                  Primary Threshold Condition
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Field Key</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. amount, quantity"
                      value={field}
                      onChange={e => setField(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Operator</label>
                    <select
                      value={operator}
                      onChange={e => setOperator(e.target.value as ThresholdOperator)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                    >
                      {OPERATORS.map(op => (
                        <option key={op.value} value={op.value}>{op.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Threshold Value</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 50000"
                      value={thresholdValue}
                      onChange={e => setThresholdValue(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>
              </div>

              {/* Secondary Conditions */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-400">Secondary Conditions (Optional AND logic)</label>
                  <button
                    type="button"
                    onClick={handleAddSecondaryCondition}
                    className="text-xs text-indigo-400 hover:text-indigo-300 font-medium"
                  >
                    + Add Condition
                  </button>
                </div>

                {secondaryConditions.map((sc, idx) => (
                  <div key={idx} className="flex items-center gap-2 bg-slate-950 p-2 rounded-lg border border-slate-800">
                    <input
                      type="text"
                      placeholder="Field"
                      value={sc.field}
                      onChange={e => handleUpdateSecondaryCondition(idx, 'field', e.target.value)}
                      className="w-1/3 bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs text-slate-200"
                    />
                    <select
                      value={sc.operator}
                      onChange={e => handleUpdateSecondaryCondition(idx, 'operator', e.target.value as ThresholdOperator)}
                      className="w-1/3 bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs text-slate-200"
                    >
                      {OPERATORS.map(op => (
                        <option key={op.value} value={op.value}>{op.value}</option>
                      ))}
                    </select>
                    <input
                      type="text"
                      placeholder="Value"
                      value={sc.value}
                      onChange={e => handleUpdateSecondaryCondition(idx, 'value', e.target.value)}
                      className="w-1/3 bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs text-slate-200"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveSecondaryCondition(idx)}
                      className="text-rose-400 hover:text-rose-300 px-1"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>

              {/* Priority & Validity */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Priority (Higher = Evaluated First)</label>
                  <input
                    type="number"
                    value={priority}
                    onChange={e => setPriority(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Effective From</label>
                  <input
                    type="date"
                    value={effectiveFrom}
                    onChange={e => setEffectiveFrom(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Effective To (Optional)</label>
                  <input
                    type="date"
                    value={effectiveTo}
                    onChange={e => setEffectiveTo(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium rounded-lg transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-semibold rounded-lg shadow-lg shadow-indigo-600/30 transition-all"
                >
                  {isSaving ? 'Saving...' : editingRule ? 'Update Rule' : 'Create Rule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
