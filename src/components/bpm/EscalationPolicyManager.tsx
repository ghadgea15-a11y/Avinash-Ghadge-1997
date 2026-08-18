import React, { useState, useEffect } from 'react';
import { UserSession } from '../../types';
import { EscalationPolicy, EscalationLevelConfig, EscalationTargetType } from '../../types/bpm';
import { BpmEscalationService } from '../../services/bpmEscalationService';
import { RbacService } from '../../services/rbacService';
import { 
  ShieldCheck, 
  Clock, 
  Plus, 
  Check, 
  AlertTriangle, 
  Settings2, 
  ArrowRight, 
  Layers, 
  Bell, 
  Users, 
  RefreshCw,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Play
} from 'lucide-react';
import { format } from 'date-fns';

interface EscalationPolicyManagerProps {
  session: UserSession;
}

export const EscalationPolicyManager: React.FC<EscalationPolicyManagerProps> = ({ session }) => {
  const [policies, setPolicies] = useState<EscalationPolicy[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingPolicy, setEditingPolicy] = useState<Partial<EscalationPolicy> | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [testProcessing, setTestProcessing] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  const canManage = RbacService.canManageEscalationPolicy(session);

  useEffect(() => {
    loadPolicies();
  }, [session.companyId]);

  const loadPolicies = async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await BpmEscalationService.getPolicies(session.companyId);
      setPolicies(list);
    } catch (err: any) {
      setError(err?.message || 'Failed to load escalation policies');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNew = () => {
    setEditingPolicy({
      policyName: 'Standard Approval Escalation Policy',
      module: 'ALL',
      transactionType: 'ALL',
      reminderAfterMinutes: 120, // 2 hours
      dueAfterMinutes: 1440, // 24 hours
      maximumEscalations: 2,
      reassignmentAllowed: false,
      active: true,
      levels: [
        {
          level: 1,
          escalationAfterMinutes: 2880, // 48 hours
          escalationTargetType: 'MANAGER',
          reassignmentAllowed: false,
          notifyTarget: true,
          customNotificationMessage: 'Escalation Level 1: Approval request requires manager attention.'
        },
        {
          level: 2,
          escalationAfterMinutes: 4320, // 72 hours
          escalationTargetType: 'DEPARTMENT_HEAD',
          reassignmentAllowed: true,
          notifyTarget: true,
          customNotificationMessage: 'Final Escalation: Reassigned to Department Head for resolution.'
        }
      ]
    });
  };

  const handleSavePolicy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPolicy || !editingPolicy.policyName) return;

    setSaving(true);
    setError(null);
    setSuccessMsg(null);

    try {
      if (editingPolicy.id) {
        await BpmEscalationService.updatePolicy(session, editingPolicy.id, editingPolicy);
        setSuccessMsg(`Successfully updated policy '${editingPolicy.policyName}'.`);
      } else {
        await BpmEscalationService.createPolicy(session, editingPolicy as any);
        setSuccessMsg(`Successfully created policy '${editingPolicy.policyName}'.`);
      }
      setEditingPolicy(null);
      await loadPolicies();
    } catch (err: any) {
      setError(err?.message || 'Failed to save escalation policy.');
    } finally {
      setSaving(false);
    }
  };

  const handleRunTestCheck = async () => {
    setTestProcessing(true);
    setTestResult(null);
    try {
      const response = await fetch('/api/bpm/escalation/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyId: session.companyId })
      });
      
      if (!response.ok) {
        throw new Error(`Server returned ${response.status}`);
      }
      
      const data = await response.json();
      if (data.success) {
        setTestResult(`Evaluated ${data.result.totalChecked} instances. Reminders sent: ${data.result.totalReminders}, Escalations triggered: ${data.result.totalEscalated}.`);
        await loadPolicies();
      } else {
        setTestResult(`Error: ${data.error}`);
      }
    } catch (err: any) {
      setTestResult(`Failed to execute timer check: ${err.message || 'Error processing'}`);
    } finally {
      setTestProcessing(false);
    }
  };

  const addLevel = () => {
    if (!editingPolicy) return;
    const currentLevels = editingPolicy.levels || [];
    const nextLevelNum = currentLevels.length + 1;
    const lastMinutes = currentLevels.length > 0 
      ? currentLevels[currentLevels.length - 1].escalationAfterMinutes 
      : (editingPolicy.dueAfterMinutes || 1440);

    const newLevel: EscalationLevelConfig = {
      level: nextLevelNum,
      escalationAfterMinutes: lastMinutes + 1440,
      escalationTargetType: 'SUPER_ADMIN',
      reassignmentAllowed: false,
      notifyTarget: true
    };

    setEditingPolicy({
      ...editingPolicy,
      levels: [...currentLevels, newLevel],
      maximumEscalations: nextLevelNum
    });
  };

  const removeLevel = (index: number) => {
    if (!editingPolicy || !editingPolicy.levels) return;
    const updated = editingPolicy.levels.filter((_, idx) => idx !== index).map((lvl, idx) => ({
      ...lvl,
      level: idx + 1
    }));
    setEditingPolicy({
      ...editingPolicy,
      levels: updated,
      maximumEscalations: updated.length
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">BPM Escalation Policies</h3>
            <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
              Module 9 / Point 2
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Configure server-authoritative reminders, SLA due timers, and multi-tier approval escalations.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleRunTestCheck}
            disabled={testProcessing}
            className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center gap-1.5 transition disabled:opacity-50"
            title="Evaluate timers and escalations now"
          >
            {testProcessing ? (
              <RefreshCw className="w-4 h-4 animate-spin text-indigo-600" />
            ) : (
              <Play className="w-4 h-4 text-emerald-500" />
            )}
            <span>Run Timer Evaluation</span>
          </button>

          {canManage && (
            <button
              onClick={handleCreateNew}
              className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-1.5 transition shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Create Policy</span>
            </button>
          )}
        </div>
      </div>

      {/* Notifications / Alerts */}
      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-600 dark:text-emerald-400 hover:opacity-75">Dismiss</button>
        </div>
      )}

      {testResult && (
        <div className="p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 text-indigo-900 dark:text-indigo-300 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-indigo-500" />
            <span>{testResult}</span>
          </div>
          <button onClick={() => setTestResult(null)} className="text-indigo-600 dark:text-indigo-400 hover:opacity-75">Dismiss</button>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-500" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-rose-600 dark:text-rose-400 hover:opacity-75">Dismiss</button>
        </div>
      )}

      {/* Policy Editor Modal / Form */}
      {editingPolicy && (
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-indigo-200 dark:border-indigo-900 shadow-xl space-y-6">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
            <div className="flex items-center gap-2">
              <Settings2 className="w-5 h-5 text-indigo-600" />
              <h4 className="text-base font-bold text-slate-900 dark:text-white">
                {editingPolicy.id ? `Edit Policy (v${editingPolicy.version || 1})` : 'New BPM Escalation Policy'}
              </h4>
            </div>
            <button
              onClick={() => setEditingPolicy(null)}
              className="text-xs text-slate-500 hover:text-slate-900 dark:hover:text-white"
            >
              Cancel
            </button>
          </div>

          <form onSubmit={handleSavePolicy} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Policy Name *
                </label>
                <input
                  type="text"
                  required
                  value={editingPolicy.policyName || ''}
                  onChange={(e) => setEditingPolicy({ ...editingPolicy, policyName: e.target.value })}
                  placeholder="e.g. HR Leave Escalation Policy"
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Target Module
                </label>
                <select
                  value={editingPolicy.module || 'ALL'}
                  onChange={(e) => setEditingPolicy({ ...editingPolicy, module: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="ALL">ALL (Global Fallback)</option>
                  <option value="HRMS">HRMS & Lifecycle</option>
                  <option value="PAYROLL">Payroll & Salary Advances</option>
                  <option value="INVENTORY">Inventory & Stock Requisitions</option>
                  <option value="BILLING">Billing & Commercial</option>
                  <option value="PATROL">Patrol & Incidents</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Transaction Type
                </label>
                <input
                  type="text"
                  value={editingPolicy.transactionType || 'ALL'}
                  onChange={(e) => setEditingPolicy({ ...editingPolicy, transactionType: e.target.value })}
                  placeholder="e.g. LEAVE_REQUEST, ADVANCE_REQUEST or ALL"
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Timers & Intervals */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 dark:bg-slate-950/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1 flex items-center gap-1.5">
                  <Bell className="w-3.5 h-3.5 text-sky-500" />
                  <span>Reminder Interval (Minutes)</span>
                </label>
                <input
                  type="number"
                  min={5}
                  value={editingPolicy.reminderAfterMinutes ?? 120}
                  onChange={(e) => setEditingPolicy({ ...editingPolicy, reminderAfterMinutes: parseInt(e.target.value) || 0 })}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                />
                <p className="text-[10px] text-slate-400 mt-1">e.g. 120 mins (2 hours) before reminder notice</p>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-amber-500" />
                  <span>SLA Due Duration (Minutes)</span>
                </label>
                <input
                  type="number"
                  min={15}
                  value={editingPolicy.dueAfterMinutes ?? 1440}
                  onChange={(e) => setEditingPolicy({ ...editingPolicy, dueAfterMinutes: parseInt(e.target.value) || 0 })}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                />
                <p className="text-[10px] text-slate-400 mt-1">e.g. 1440 mins (24 hours) SLA deadline</p>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Reassignment Policy</span>
                </label>
                <div className="flex items-center gap-3 pt-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editingPolicy.reassignmentAllowed ?? false}
                      onChange={(e) => setEditingPolicy({ ...editingPolicy, reassignmentAllowed: e.target.checked })}
                      className="rounded border-slate-700 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                    />
                    <span className="text-xs text-slate-700 dark:text-slate-300 font-medium">Allow Auto-Reassignment on Escalation</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Escalation Levels */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h5 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  Escalation Levels Sequence
                </h5>
                <button
                  type="button"
                  onClick={addLevel}
                  className="text-xs text-indigo-600 dark:text-indigo-400 font-bold hover:underline flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Level</span>
                </button>
              </div>

              {(editingPolicy.levels || []).map((lvl, index) => (
                <div key={index} className="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-400 font-bold text-xs flex items-center justify-center">
                        {lvl.level}
                      </span>
                      <span className="text-xs font-bold text-slate-900 dark:text-white">
                        Level {lvl.level} {index === (editingPolicy.levels?.length || 0) - 1 ? '(Final Escalation)' : ''}
                      </span>
                    </div>
                    {(editingPolicy.levels?.length || 0) > 1 && (
                      <button
                        type="button"
                        onClick={() => removeLevel(index)}
                        className="text-rose-500 hover:text-rose-700 text-xs font-semibold p-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="text-[11px] font-semibold text-slate-500 block mb-1">
                        Trigger After (Total Mins)
                      </label>
                      <input
                        type="number"
                        min={1}
                        value={lvl.escalationAfterMinutes}
                        onChange={(e) => {
                          const updated = [...(editingPolicy.levels || [])];
                          updated[index].escalationAfterMinutes = parseInt(e.target.value) || 0;
                          setEditingPolicy({ ...editingPolicy, levels: updated });
                        }}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-slate-500 block mb-1">
                        Escalate Target
                      </label>
                      <select
                        value={lvl.escalationTargetType}
                        onChange={(e) => {
                          const updated = [...(editingPolicy.levels || [])];
                          updated[index].escalationTargetType = e.target.value as EscalationTargetType;
                          setEditingPolicy({ ...editingPolicy, levels: updated });
                        }}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                      >
                        <option value="MANAGER">Reporting Manager</option>
                        <option value="DEPARTMENT_HEAD">Department Head</option>
                        <option value="SUPER_ADMIN">Super / Company Admin</option>
                        <option value="ROLE">Specific Role</option>
                        <option value="USER">Specific User ID</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-slate-500 block mb-1">
                        Reassign Approver
                      </label>
                      <div className="pt-2">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={lvl.reassignmentAllowed ?? false}
                            onChange={(e) => {
                              const updated = [...(editingPolicy.levels || [])];
                              updated[index].reassignmentAllowed = e.target.checked;
                              setEditingPolicy({ ...editingPolicy, levels: updated });
                            }}
                            className="rounded border-slate-700 text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5"
                          />
                          <span className="text-xs text-slate-700 dark:text-slate-300">Reassign to target</span>
                        </label>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-500 block mb-1">
                      Custom Notification Message (Optional)
                    </label>
                    <input
                      type="text"
                      value={lvl.customNotificationMessage || ''}
                      onChange={(e) => {
                        const updated = [...(editingPolicy.levels || [])];
                        updated[index].customNotificationMessage = e.target.value;
                        setEditingPolicy({ ...editingPolicy, levels: updated });
                      }}
                      placeholder="e.g. Action required: Escalated to department authority due to pending SLA"
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setEditingPolicy(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs shadow-md flex items-center gap-1.5 transition"
              >
                {saving ? 'Saving Policy...' : 'Save Escalation Policy'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Policies Grid */}
      {loading ? (
        <div className="flex items-center justify-center p-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      ) : policies.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6">
          <Clock className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
          <h4 className="text-base font-bold text-slate-900 dark:text-white">No Escalation Policies Configured</h4>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
            Create your first escalation policy to automate reminders, enforce SLAs, and establish structured multi-tier approval escalations.
          </p>
          {canManage && (
            <button
              onClick={handleCreateNew}
              className="mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition inline-flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Create Initial Policy</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {policies.map((policy) => (
            <div
              key={policy.id}
              className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 hover:border-indigo-500/50 transition duration-200"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-slate-900 dark:text-white text-base">{policy.policyName}</h4>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                      v{policy.version}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Module: <span className="font-semibold text-slate-700 dark:text-slate-300">{policy.module}</span> • Transaction: <span className="font-semibold text-slate-700 dark:text-slate-300">{policy.transactionType || 'ALL'}</span>
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                    policy.active 
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800' 
                      : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                  }`}>
                    {policy.active ? 'Active' : 'Inactive'}
                  </span>
                  {canManage && (
                    <button
                      onClick={() => setEditingPolicy(policy)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                      title="Edit Policy"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Policy Timing Metrics */}
              <div className="grid grid-cols-3 gap-2 bg-slate-50 dark:bg-slate-950/60 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs">
                <div>
                  <span className="text-slate-400 text-[10px] block">Reminder</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {policy.reminderAfterMinutes}m ({Math.round(policy.reminderAfterMinutes / 60)}h)
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block">Due SLA</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {policy.dueAfterMinutes}m ({Math.round(policy.dueAfterMinutes / 60)}h)
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block">Levels</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {policy.levels.length} Tiers
                  </span>
                </div>
              </div>

              {/* Levels Overview */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Escalation Ladder
                </span>
                <div className="space-y-1.5">
                  {policy.levels.map((lvl) => (
                    <div
                      key={lvl.level}
                      className="flex items-center justify-between text-xs p-2 rounded-xl bg-slate-50/60 dark:bg-slate-950/30 border border-slate-100 dark:border-slate-800/80"
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-800 text-[10px] font-bold text-slate-700 dark:text-slate-300 flex items-center justify-center">
                          {lvl.level}
                        </span>
                        <span className="font-medium text-slate-700 dark:text-slate-300">
                          Target: {lvl.escalationTargetType}
                        </span>
                        {lvl.reassignmentAllowed && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold bg-indigo-100 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-400">
                            Reassigns
                          </span>
                        )}
                      </div>
                      <span className="text-slate-400 text-[11px] font-mono">
                        +{lvl.escalationAfterMinutes}m
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
                <span>Updated: {format(new Date(policy.updatedAt), 'PP')}</span>
                <span className="font-mono">{policy.policyId}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
