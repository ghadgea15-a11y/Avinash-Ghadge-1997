import React, { useState, useEffect } from 'react';
import { UserSession } from '../../types';
import { 
  ThresholdRule, 
  ThresholdOperator, 
  BpmApprovalWorkflow, 
  SecondaryCondition,
  ProxyScopeModule
} from '../../types/bpm';
import { BpmThresholdRoutingService } from '../../services/bpmThresholdRoutingService';
import { BpmService } from '../../services/bpmService';
import { 
  GitFork, 
  Plus, 
  Search, 
  Trash2, 
  Edit3, 
  AlertCircle, 
  CheckCircle, 
  Play, 
  Info, 
  Filter, 
  Settings2, 
  ToggleLeft, 
  ToggleRight,
  Database,
  ArrowRight,
  HelpCircle,
  X,
  PlusCircle,
  Terminal
} from 'lucide-react';
import { format } from 'date-fns';
import { useFeedback } from '../../context/ActionFeedbackContext';

interface ThresholdRuleManagerProps {
  session: UserSession;
  companyId: string;
}

const OPERATORS: { value: ThresholdOperator; label: string }[] = [
  { value: '>', label: 'Greater Than (>)' },
  { value: '>=', label: 'Greater or Equal (>=)' },
  { value: '<', label: 'Less Than (<)' },
  { value: '<=', label: 'Less or Equal (<=)' },
  { value: '=', label: 'Equals (=)' },
  { value: '!=', label: 'Not Equals (!=)' },
  { value: 'IN', label: 'In List (Comma separated)' },
  { value: 'NOT_IN', label: 'Not In List' },
];

const MODULES: { value: ProxyScopeModule; label: string }[] = [
  { value: 'ALL', label: 'Global / All Modules' },
  { value: 'LEAVE', label: 'Leave Requests' },
  { value: 'OVERTIME', label: 'Overtime' },
  { value: 'SCM', label: 'Purchase Orders / SCM' },
  { value: 'PAYROLL', label: 'Payroll' },
  { value: 'WORK_ORDER', label: 'Work Orders' },
  { value: 'ASSET_MANAGEMENT', label: 'Assets' },
];

export const ThresholdRuleManager: React.FC<ThresholdRuleManagerProps> = ({ session, companyId }) => {
  const { showSuccess, showError, showLoading, handleError, confirm } = useFeedback();
  
  const [rules, setRules] = useState<ThresholdRule[]>([]);
  const [workflows, setWorkflows] = useState<BpmApprovalWorkflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal states
  const [showEditor, setShowEditor] = useState(false);
  const [editingRule, setEditingRule] = useState<Partial<ThresholdRule> | null>(null);
  const [showSimulator, setShowSimulator] = useState(false);

  // Simulator state
  const [simModule, setSimModule] = useState<ProxyScopeModule>('SCM');
  const [simType, setSimType] = useState('PURCHASE_ORDER');
  const [simPayload, setSimPayload] = useState('{\n  "amount": 55000,\n  "dept": "ENGINEERING",\n  "urgency": "HIGH"\n}');
  const [simResult, setSimResult] = useState<any>(null);

  useEffect(() => {
    loadData();
  }, [companyId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [rulesList, wfList] = await Promise.all([
        BpmThresholdRoutingService.getThresholdRules(companyId),
        BpmService.getCompanyWorkflows(companyId)
      ]);
      setRules(rulesList);
      setWorkflows(wfList);
    } catch (err) {
      console.error('Failed to load threshold data:', err);
      handleError(err, '✕ Failed to load threshold configuration');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRule || !editingRule.ruleName || !editingRule.field || !editingRule.workflowId) {
      showError('Please fill in all mandatory fields.');
      return;
    }

    const dismiss = showLoading('Saving threshold rule...');
    try {
      await BpmThresholdRoutingService.saveThresholdRule(
        companyId,
        editingRule as any,
        session.userId,
        session.fullName || 'User'
      );
      dismiss();
      showSuccess('✓ Threshold rule saved and activated.');
      setShowEditor(false);
      setEditingRule(null);
      await loadData();
    } catch (err) {
      dismiss();
      handleError(err, '✕ Failed to save rule');
    }
  };

  const handleDeleteRule = async (ruleId: string) => {
    if (await confirm('Are you sure you want to delete this threshold rule? This will revert the module to default routing for these criteria.')) {
      const dismiss = showLoading('Deleting rule...');
      try {
        await BpmThresholdRoutingService.deleteThresholdRule(companyId, ruleId, session.userId, session.fullName || 'User');
        dismiss();
        showSuccess('✓ Rule deleted.');
        await loadData();
      } catch (err) {
        dismiss();
        handleError(err, '✕ Deletion failed');
      }
    }
  };

  const handleToggleStatus = async (ruleId: string, currentStatus: boolean) => {
    try {
      await BpmThresholdRoutingService.toggleRuleStatus(
        companyId, 
        ruleId, 
        !currentStatus, 
        session.userId, 
        session.fullName || 'User'
      );
      showSuccess(`✓ Rule ${!currentStatus ? 'activated' : 'deactivated'}.`);
      await loadData();
    } catch (err) {
      handleError(err, '✕ Failed to toggle status');
    }
  };

  const runSimulation = () => {
    try {
      const payload = JSON.parse(simPayload);
      const result = BpmThresholdRoutingService.simulateRouting(
        simModule,
        simType,
        payload,
        rules,
        workflows
      );
      setSimResult(result);
    } catch (err: any) {
      showError(`Invalid JSON payload: ${err.message}`);
    }
  };

  const filteredRules = rules.filter(r => 
    r.ruleName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.module.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.field.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      
      {/* Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search rules..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSimulator(true)}
            className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition flex items-center gap-2"
          >
            <Terminal className="w-4 h-4" />
            <span>Rule Simulator</span>
          </button>
          <button
            onClick={() => {
              setEditingRule({
                ruleName: '',
                module: 'SCM',
                transactionType: 'PURCHASE_ORDER',
                field: 'amount',
                operator: '>',
                thresholdValue: 0,
                priority: 10,
                active: true,
                secondaryConditions: []
              });
              setShowEditor(true);
            }}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm transition flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Create Threshold Rule</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center p-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      ) : filteredRules.length === 0 ? (
        <div className="text-center py-24 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
          <GitFork className="w-12 h-12 text-slate-300 dark:text-slate-800 mx-auto" />
          <h3 className="text-base font-bold text-black dark:text-white">No Threshold Rules Configured</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
            Threshold rules allow you to dynamically route approval requests to different workflows based on transaction values (e.g., amount, department, or risk).
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredRules.map((rule) => (
            <div 
              key={rule.id}
              className={`bg-white dark:bg-slate-900 p-5 rounded-3xl border transition shadow-sm ${
                rule.active ? 'border-slate-200 dark:border-slate-800' : 'border-slate-100 dark:border-slate-900 opacity-60'
              }`}
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-sm text-black dark:text-white">{rule.ruleName}</h4>
                    {!rule.active && (
                      <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 text-[10px] font-bold uppercase">Disabled</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-slate-400">
                    <span className="font-medium text-indigo-600 dark:text-indigo-400 uppercase tracking-tighter">{rule.module}</span>
                    <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                    <span>{rule.transactionType}</span>
                    <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                    <span className="font-medium">Priority: {rule.priority}</span>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="bg-slate-50 dark:bg-slate-950 px-4 py-2 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center gap-3">
                    <div className="text-center">
                      <p className="text-[10px] text-slate-400 font-bold uppercase">Logic</p>
                      <p className="text-xs font-mono font-bold text-black dark:text-slate-200">
                        {rule.field} {rule.operator} {rule.thresholdValue}
                      </p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-300" />
                    <div className="text-center">
                      <p className="text-[10px] text-slate-400 font-bold uppercase">Target Workflow</p>
                      <p className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                        {workflows.find(w => w.workflowId === rule.workflowId || w.id === rule.workflowId)?.workflowName || rule.workflowId}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleToggleStatus(rule.id, rule.active)}
                      className={`p-2 rounded-xl transition ${
                        rule.active 
                          ? 'text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/20' 
                          : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                      title={rule.active ? 'Deactivate' : 'Activate'}
                    >
                      {rule.active ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
                    </button>
                    <button
                      onClick={() => {
                        setEditingRule(rule);
                        setShowEditor(true);
                      }}
                      className="p-2 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                      title="Edit Rule"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteRule(rule.id)}
                      className="p-2 rounded-xl text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition"
                      title="Delete Rule"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* RULE EDITOR MODAL */}
      {showEditor && editingRule && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form 
            onSubmit={handleSaveRule}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 space-y-6 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-bold text-base text-black dark:text-white flex items-center gap-2">
                <Settings2 className="w-5 h-5 text-indigo-600" />
                <span>{editingRule.id ? 'Edit Threshold Rule' : 'Create New Threshold Rule'}</span>
              </h3>
              <button type="button" onClick={() => setShowEditor(false)} className="text-slate-400 hover:text-black dark:hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-900 dark:text-slate-300">Rule Name *</label>
                <input
                  type="text"
                  required
                  value={editingRule.ruleName}
                  onChange={e => setEditingRule({...editingRule, ruleName: e.target.value})}
                  placeholder="e.g. High Value Purchase PO Routing"
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-black dark:text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-900 dark:text-slate-300">Target Module *</label>
                <select
                  required
                  value={editingRule.module}
                  onChange={e => setEditingRule({...editingRule, module: e.target.value as any})}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-black dark:text-white"
                >
                  {MODULES.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-900 dark:text-slate-300">Transaction Type</label>
                <input
                  type="text"
                  value={editingRule.transactionType}
                  onChange={e => setEditingRule({...editingRule, transactionType: e.target.value})}
                  placeholder="e.g. PURCHASE_ORDER or ALL"
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-black dark:text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-900 dark:text-slate-300">Evaluation Priority (1-100) *</label>
                <input
                  type="number"
                  required
                  min={1}
                  max={100}
                  value={editingRule.priority}
                  onChange={e => setEditingRule({...editingRule, priority: parseInt(e.target.value, 10)})}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-black dark:text-white"
                />
              </div>
            </div>

            <div className="bg-indigo-50/50 dark:bg-indigo-950/20 p-5 rounded-2xl border border-indigo-100 dark:border-indigo-900/40 space-y-4">
              <div className="flex items-center gap-2 mb-1">
                <Database className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <h5 className="text-xs font-bold text-indigo-900 dark:text-indigo-300 uppercase tracking-wider">Primary Comparison Logic</h5>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-indigo-800 dark:text-indigo-400">Context Field</label>
                  <input
                    type="text"
                    required
                    value={editingRule.field}
                    onChange={e => setEditingRule({...editingRule, field: e.target.value})}
                    placeholder="e.g. amount, totalVal"
                    className="w-full bg-white dark:bg-slate-950 border border-indigo-200 dark:border-indigo-800 rounded-xl px-3 py-2 text-xs text-black dark:text-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-indigo-800 dark:text-indigo-400">Operator</label>
                  <select
                    required
                    value={editingRule.operator}
                    onChange={e => setEditingRule({...editingRule, operator: e.target.value as any})}
                    className="w-full bg-white dark:bg-slate-950 border border-indigo-200 dark:border-indigo-800 rounded-xl px-3 py-2 text-xs text-black dark:text-white"
                  >
                    {OPERATORS.map(op => <option key={op.value} value={op.value}>{op.label}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-indigo-800 dark:text-indigo-400">Threshold Value</label>
                  <input
                    type="text"
                    required
                    value={editingRule.thresholdValue}
                    onChange={e => setEditingRule({...editingRule, thresholdValue: e.target.value})}
                    placeholder="Value or Comma List"
                    className="w-full bg-white dark:bg-slate-950 border border-indigo-200 dark:border-indigo-800 rounded-xl px-3 py-2 text-xs text-black dark:text-white"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-900 dark:text-slate-300">Route to Approval Workflow *</label>
              <select
                required
                value={editingRule.workflowId}
                onChange={e => setEditingRule({...editingRule, workflowId: e.target.value})}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-black dark:text-white font-bold"
              >
                <option value="">-- Select Target Workflow --</option>
                {workflows.map(wf => (
                  <option key={wf.id} value={wf.workflowId || wf.id}>{wf.workflowName} ({wf.steps?.length || 0} tiers)</option>
                ))}
              </select>
              <p className="text-[10px] text-slate-400 mt-1">If this rule matches, the transaction will bypass the standard route and use this specific multi-tier workflow.</p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
              <button type="button" onClick={() => setShowEditor(false)} className="px-5 py-2 text-xs font-bold text-slate-500 hover:text-black dark:hover:text-white transition">Cancel</button>
              <button type="submit" className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md transition">
                {editingRule.id ? 'Update Rule' : 'Save & Publish Rule'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* SIMULATOR MODAL */}
      {showSimulator && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Terminal className="w-6 h-6 text-indigo-600" />
                <div>
                  <h3 className="font-bold text-base text-black dark:text-white">BPM Routing Simulator</h3>
                  <p className="text-xs text-slate-500">Test how transactions will be routed based on your current rule priority and logic.</p>
                </div>
              </div>
              <button onClick={() => setShowSimulator(false)} className="text-slate-400 hover:text-black dark:hover:text-white">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Input side */}
              <div className="space-y-4">
                <h5 className="text-xs font-bold uppercase tracking-wider text-slate-400">Simulation Input</h5>
                
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500">Module</label>
                    <select
                      value={simModule}
                      onChange={e => setSimModule(e.target.value as any)}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs"
                    >
                      {MODULES.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500">Tx Type</label>
                    <input
                      type="text"
                      value={simType}
                      onChange={e => setSimType(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500">JSON Payload Context</label>
                  <textarea
                    rows={8}
                    value={simPayload}
                    onChange={e => setSimPayload(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-[11px] font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <button
                  onClick={runSimulation}
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold text-xs shadow-md transition flex items-center justify-center gap-2"
                >
                  <Play className="w-4 h-4 fill-current" />
                  Run Routing Simulation
                </button>
              </div>

              {/* Output side */}
              <div className="space-y-4">
                <h5 className="text-xs font-bold uppercase tracking-wider text-slate-400">Resolution Result</h5>
                
                {!simResult ? (
                  <div className="h-full min-h-[300px] flex flex-col items-center justify-center border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-3xl text-slate-300">
                    <Info className="w-10 h-10 mb-2 opacity-20" />
                    <p className="text-xs">Configure input and run simulation</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className={`p-4 rounded-2xl border ${simResult.matched ? 'bg-emerald-50/50 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-900/40' : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800'}`}>
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Decision Outcome</span>
                        {simResult.matched ? (
                          <span className="px-2 py-0.5 bg-emerald-600 text-white rounded text-[10px] font-bold">RULE MATCHED</span>
                        ) : (
                          <span className="px-2 py-0.5 bg-slate-400 text-white rounded text-[10px] font-bold">DEFAULT ROUTE</span>
                        )}
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-xs text-slate-500">Routed Workflow:</span>
                          <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                            {simResult.selectedWorkflow?.workflowName || 'Default Workflow'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-xs text-slate-500">Matched Rule:</span>
                          <span className="text-xs font-bold text-black dark:text-white">
                            {simResult.matchedRule?.ruleName || 'None (Fallback)'}
                          </span>
                        </div>
                        <div className="flex justify-between border-t border-black/5 dark:border-white/5 pt-2 mt-2">
                          <span className="text-xs text-slate-500">Tiers to process:</span>
                          <span className="text-xs font-bold text-black dark:text-white">{simResult.selectedWorkflow?.steps?.length || 0}</span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Evaluation Trace Log</p>
                      <div className="bg-slate-900 rounded-2xl p-4 overflow-x-auto max-h-[180px] overflow-y-auto">
                        {simResult.trace.map((line: string, i: number) => (
                          <p key={i} className={`text-[10px] font-mono py-0.5 ${
                            line.includes('✓ MATCH') ? 'text-emerald-400' :
                            line.includes('✗ SKIP') ? 'text-slate-500' :
                            'text-indigo-300'
                          }`}>
                            {line}
                          </p>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
