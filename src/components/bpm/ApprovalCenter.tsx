import React, { useState, useEffect } from 'react';
import { UserSession } from '../../types';
import { BpmService } from '../../services/bpmService';
import { BpmEscalationService } from '../../services/bpmEscalationService';
import { BpmDelegationService } from '../../services/bpmDelegationService';
import { RbacService } from '../../services/rbacService';
import { BpmApprovalInstance } from '../../types/bpm';
import { EscalationTimelineModal } from './EscalationTimelineModal';
import { EscalationPolicyManager } from './EscalationPolicyManager';
import { DelegationManager } from './DelegationManager';
import { ThresholdRuleManager } from './ThresholdRuleManager';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertTriangle, 
  User, 
  FileText, 
  Share, 
  ShieldAlert, 
  Sliders, 
  UserCheck, 
  RefreshCw, 
  Bell, 
  History,
  CornerUpLeft,
  ChevronRight,
  ListFilter,
  Share2,
  GitFork
} from 'lucide-react';
import { format } from 'date-fns';
import { useFeedback } from '../../context/ActionFeedbackContext';

interface ApprovalCenterProps {
  session: UserSession;
}

export const ApprovalCenter: React.FC<ApprovalCenterProps> = ({ session }) => {
  const { showSuccess, showError, showLoading, showCancelled, showValidationFailed, handleError, confirm } = useFeedback();
  const [activeTab, setActiveTab] = useState<'PENDING' | 'DELEGATIONS' | 'POLICIES' | 'THRESHOLDS'>('PENDING');
  const [filterType, setFilterType] = useState<'ALL' | 'DIRECT' | 'DELEGATED'>('ALL');
  const [approvals, setApprovals] = useState<BpmApprovalInstance[]>([]);
  const [loading, setLoading] = useState(true);
  const [actioningId, setActioningId] = useState<string | null>(null);
  const [selectedTimelineInstance, setSelectedTimelineInstance] = useState<BpmApprovalInstance | null>(null);

  // Quick Delegation Modal State
  const [delegatingInstance, setDelegatingInstance] = useState<BpmApprovalInstance | null>(null);
  const [delegateUserId, setDelegateUserId] = useState('');
  const [delegating, setDelegating] = useState(false);

  // Return Modal State
  const [returningInstance, setReturningInstance] = useState<BpmApprovalInstance | null>(null);
  const [returnReason, setReturnReason] = useState('');
  const [returning, setReturning] = useState(false);

  const canManagePolicies = RbacService.canManageEscalationPolicy(session);

  useEffect(() => {
    loadApprovals();
  }, [session.companyId, session.userId]);

  const loadApprovals = async () => {
    setLoading(true);
    try {
      await BpmDelegationService.refreshCompanyDelegationStatuses(session.companyId);
      const list = await BpmService.getMyApprovals(session);
      setApprovals(list);
    } catch (err) {
      console.error('Failed to load approvals', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (instanceId: string, action: 'APPROVE' | 'REJECT') => {
    let reason = '';
    if (action === 'REJECT') {
      reason = window.prompt('Please provide a reason for rejection:') || '';
      if (!reason) return;
    }
    
    setActioningId(instanceId);
    const dismiss = showLoading(`Processing ${action.toLowerCase()}...`);
    try {
      await BpmService.performAction(session, instanceId, action, reason);
      dismiss();
      showSuccess(`✓ Approval action "${action}" completed successfully.`);
      await loadApprovals();
    } catch (err: any) {
      dismiss();
      console.error('Action failed:', err);
      handleError(err, `✕ Action failed`);
    } finally {
      setActioningId(null);
    }
  };

  const handleConfirmReturn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!returningInstance || !returnReason.trim()) return;

    setReturning(true);
    const dismiss = showLoading('Returning approval for clarification...');
    try {
      await BpmService.performAction(session, returningInstance.id, 'RETURN', returnReason.trim());
      dismiss();
      setReturningInstance(null);
      setReturnReason('');
      showSuccess('✓ Approval returned for clarification.');
      await loadApprovals();
    } catch (err: any) {
      dismiss();
      handleError(err, '✕ Return failed');
    } finally {
      setReturning(false);
    }
  };

  const handleConfirmDelegation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!delegatingInstance || !delegateUserId.trim()) return;

    setDelegating(true);
    const dismiss = showLoading('Delegating approval authority...');
    try {
      await BpmService.performAction(
        session, 
        delegatingInstance.id, 
        'DELEGATE', 
        'Delegated approval authority', 
        delegateUserId.trim()
      );
      dismiss();
      setDelegatingInstance(null);
      setDelegateUserId('');
      showSuccess('✓ Approval delegated successfully.');
      await loadApprovals();
    } catch (err: any) {
      dismiss();
      handleError(err, '✕ Delegation failed');
    } finally {
      setDelegating(false);
    }
  };

  const renderEscalationBadge = (instance: BpmApprovalInstance) => {
    const isDirect = instance.currentApprovers.includes(session.userId);

    return (
      <div className="flex flex-col items-end gap-1">
        {!isDirect && (
          <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-400 border border-indigo-300 dark:border-indigo-800 flex items-center gap-1">
            <Share2 className="w-3 h-3 text-indigo-600" />
            <span>Acting as Proxy</span>
          </span>
        )}

        {instance.escalationLevel && instance.escalationLevel > 0 ? (
          <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1 ${
            instance.escalationLevel >= 2 
              ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-400 border border-rose-300 dark:border-rose-800' 
              : 'bg-orange-100 text-orange-800 dark:bg-orange-950/60 dark:text-orange-400 border border-orange-300 dark:border-orange-800'
          }`}>
            <AlertTriangle className="w-3 h-3" />
            <span>Escalation L{instance.escalationLevel}</span>
          </span>
        ) : instance.isOverdue ? (
          <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-400 border border-rose-200 dark:border-rose-800 flex items-center gap-1">
            <Clock className="w-3 h-3 text-rose-600" />
            <span>Overdue</span>
          </span>
        ) : instance.lastReminderAt ? (
          <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-400 border border-sky-200 dark:border-sky-800 flex items-center gap-1">
            <Bell className="w-3 h-3 text-sky-600" />
            <span>Reminder Sent</span>
          </span>
        ) : (
          <span className="text-xs font-medium px-2.5 py-0.5 bg-amber-100 text-amber-800 rounded-full dark:bg-amber-950/50 dark:text-amber-400 border border-amber-200 dark:border-amber-900 flex items-center gap-1">
            <Clock className="w-3 h-3" /> Pending
          </span>
        )}
      </div>
    );
  };

  const filteredApprovals = approvals.filter(inst => {
    const isDirect = inst.currentApprovers.includes(session.userId);
    if (filterType === 'DIRECT') return isDirect;
    if (filterType === 'DELEGATED') return !isDirect;
    return true;
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      
      {/* Top Header with Navigation Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-black dark:text-white">Enterprise BPM Approval Center</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Central multi-tier approval engine with proxy delegations, automated escalation timers, and SLA governance.
          </p>
        </div>

        <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-700">
          <button
            onClick={() => setActiveTab('PENDING')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === 'PENDING'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-black dark:hover:text-white'
            }`}
          >
            <ListFilter className="w-3.5 h-3.5" />
            <span>Approvals ({approvals.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('DELEGATIONS')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === 'DELEGATIONS'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-black dark:hover:text-white'
            }`}
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>Proxy Delegations</span>
          </button>

          {canManagePolicies && (
            <>
              <button
                onClick={() => setActiveTab('POLICIES')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                  activeTab === 'POLICIES'
                    ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-black dark:hover:text-white'
                }`}
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>Escalation Policies</span>
              </button>

              <button
                onClick={() => setActiveTab('THRESHOLDS')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                  activeTab === 'THRESHOLDS'
                    ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-black dark:hover:text-white'
                }`}
              >
                <GitFork className="w-3.5 h-3.5" />
                <span>Threshold Rules</span>
              </button>
            </>
          )}
        </div>
      </div>

      {activeTab === 'THRESHOLDS' ? (
        <ThresholdRuleManager session={session} />
      ) : activeTab === 'POLICIES' ? (
        <EscalationPolicyManager session={session} />
      ) : activeTab === 'DELEGATIONS' ? (
        <DelegationManager session={session} onDelegationChanged={loadApprovals} />
      ) : (
        <>
          {/* Filter sub-bar */}
          <div className="flex items-center justify-between gap-2 bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Filter Queue:</span>
              <button
                onClick={() => setFilterType('ALL')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${
                  filterType === 'ALL'
                    ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                All ({approvals.length})
              </button>
              <button
                onClick={() => setFilterType('DIRECT')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${
                  filterType === 'DIRECT'
                    ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                Direct Assigned ({approvals.filter(a => a.currentApprovers.includes(session.userId)).length})
              </button>
              <button
                onClick={() => setFilterType('DELEGATED')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${
                  filterType === 'DELEGATED'
                    ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                Proxy Delegated ({approvals.filter(a => !a.currentApprovers.includes(session.userId)).length})
              </button>
            </div>

            <button
              onClick={loadApprovals}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-white dark:bg-slate-950 dark:hover:bg-slate-800"
              title="Refresh Queue"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center p-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
          ) : filteredApprovals.length === 0 ? (
            <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm p-6">
              <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
              <h3 className="text-lg font-bold text-black dark:text-white">All Caught Up!</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
                {filterType === 'DELEGATED' 
                  ? 'You have no proxy-delegated approvals in your queue.' 
                  : 'You have no pending approvals requiring your authorization at this time.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {filteredApprovals.map((instance) => {
                const isProxy = !instance.currentApprovers.includes(session.userId);

                return (
                  <div 
                    key={instance.id} 
                    className={`bg-white dark:bg-slate-900 p-6 rounded-3xl border transition duration-200 shadow-sm space-y-4 ${
                      instance.escalationLevel && instance.escalationLevel > 0
                        ? 'border-orange-300 dark:border-orange-900/60 ring-1 ring-orange-500/20'
                        : instance.isOverdue
                          ? 'border-rose-300 dark:border-rose-900/60'
                          : isProxy
                            ? 'border-indigo-300 dark:border-indigo-900/60'
                            : 'border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    {/* Card Header */}
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center">
                          <FileText className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                        </div>
                        <div>
                          <h4 className="font-bold text-black dark:text-white text-base">
                            {instance.sourceModule} Request
                          </h4>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                              Tier {instance.currentTier} Approval Step
                            </span>
                            {instance.reassignedFrom && (
                              <span className="text-[10px] px-2 py-0.5 rounded font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                                Reassigned by Escalation
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      {renderEscalationBadge(instance)}
                    </div>
                    
                    {/* Card Metrics & Dates */}
                    <div className="space-y-2 bg-white dark:bg-slate-950/60 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Record ID:</span>
                        <span className="font-mono font-medium text-black dark:text-white">{instance.sourceRecordId}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Submitted:</span>
                        <span className="font-medium text-slate-900 dark:text-slate-300">
                          {format(new Date(instance.submittedAt), 'PP p')}
                        </span>
                      </div>
                      {instance.dueAt && (
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">SLA Due Target:</span>
                          <span className={`font-semibold ${instance.isOverdue ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-slate-300'}`}>
                            {format(new Date(instance.dueAt), 'PP p')}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Secondary Actions (Timeline, Return, Delegate) */}
                    <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800 text-xs">
                      <button
                        onClick={() => setSelectedTimelineInstance(instance)}
                        className="text-indigo-600 dark:text-indigo-400 hover:underline font-bold flex items-center gap-1 py-1"
                      >
                        <History className="w-3.5 h-3.5" />
                        <span>View Escalation Trail</span>
                      </button>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setReturningInstance(instance);
                            setReturnReason('');
                          }}
                          className="text-amber-600 dark:text-amber-400 hover:text-amber-700 font-semibold px-2 py-1 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-950/30 transition flex items-center gap-1"
                        >
                          <CornerUpLeft className="w-3.5 h-3.5" />
                          <span>Return</span>
                        </button>

                        <button
                          onClick={() => {
                            setDelegatingInstance(instance);
                            setDelegateUserId('');
                          }}
                          className="text-slate-600 dark:text-slate-400 hover:text-black dark:text-white dark:hover:text-white font-semibold px-2 py-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition flex items-center gap-1"
                        >
                          <Share className="w-3.5 h-3.5" />
                          <span>Delegate</span>
                        </button>
                      </div>
                    </div>

                    {/* Primary Decision Actions (Reject & Approve) */}
                    <div className="flex items-center gap-3 pt-1">
                      <button 
                        onClick={() => handleAction(instance.id, 'REJECT')}
                        disabled={actioningId === instance.id}
                        className="flex-1 py-2.5 rounded-2xl border border-rose-200 dark:border-rose-900/50 text-rose-600 dark:text-rose-400 font-bold hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors disabled:opacity-50 text-xs"
                      >
                        Reject {isProxy && '(as Proxy)'}
                      </button>
                      <button 
                        onClick={() => handleAction(instance.id, 'APPROVE')}
                        disabled={actioningId === instance.id}
                        className="flex-1 py-2.5 rounded-2xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 shadow-sm transition-colors disabled:opacity-50 text-xs"
                      >
                        {actioningId === instance.id ? 'Processing...' : `Approve ${isProxy ? '(as Proxy)' : ''}`}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Escalation Timeline Modal */}
      {selectedTimelineInstance && (
        <EscalationTimelineModal
          companyId={session.companyId}
          instance={selectedTimelineInstance}
          onClose={() => setSelectedTimelineInstance(null)}
        />
      )}

      {/* Delegate Modal */}
      {delegatingInstance && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form
            onSubmit={handleConfirmDelegation}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-md p-6 space-y-4 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h4 className="font-bold text-black dark:text-white text-base flex items-center gap-2">
                <Share className="w-4 h-4 text-indigo-600" />
                <span>Delegate Approval Authority</span>
              </h4>
              <button
                type="button"
                onClick={() => setDelegatingInstance(null)}
                className="text-xs text-slate-400 hover:text-slate-600 dark:text-slate-400 dark:hover:text-white"
              >
                Cancel
              </button>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400">
              Assign a colleague or supervisor as an authorized delegate for approval request <strong>{delegatingInstance.sourceRecordId}</strong>.
            </p>

            <div>
              <label className="text-xs font-bold text-slate-900 dark:text-slate-300 block mb-1">
                Delegate User ID or Email *
              </label>
              <input
                type="text"
                required
                value={delegateUserId}
                onChange={(e) => setDelegateUserId(e.target.value)}
                placeholder="e.g. user_123 or supervisor@company.com"
                className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-black dark:text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDelegatingInstance(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={delegating || !delegateUserId.trim()}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50"
              >
                {delegating ? 'Delegating...' : 'Confirm Delegation'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Return Modal */}
      {returningInstance && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form
            onSubmit={handleConfirmReturn}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-md p-6 space-y-4 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h4 className="font-bold text-black dark:text-white text-base flex items-center gap-2">
                <CornerUpLeft className="w-4 h-4 text-amber-500" />
                <span>Return Approval Request</span>
              </h4>
              <button
                type="button"
                onClick={() => setReturningInstance(null)}
                className="text-xs text-slate-400 hover:text-slate-600 dark:text-slate-400 dark:hover:text-white"
              >
                Cancel
              </button>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400">
              Return request <strong>{returningInstance.sourceRecordId}</strong> back to the submitter for revision or clarification.
            </p>

            <div>
              <label className="text-xs font-bold text-slate-900 dark:text-slate-300 block mb-1">
                Reason for Return *
              </label>
              <textarea
                required
                rows={3}
                value={returnReason}
                onChange={(e) => setReturnReason(e.target.value)}
                placeholder="Explain what changes or clarifications are needed..."
                className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-black dark:text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setReturningInstance(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={returning || !returnReason.trim()}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white disabled:opacity-50"
              >
                {returning ? 'Returning...' : 'Confirm Return'}
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
};
