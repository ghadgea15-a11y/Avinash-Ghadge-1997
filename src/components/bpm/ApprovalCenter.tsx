import React, { useState, useEffect } from 'react';
import { UserSession } from '../../types';
import { BpmService } from '../../services/bpmService';
import { BpmEscalationService } from '../../services/bpmEscalationService';
import { RbacService } from '../../services/rbacService';
import { BpmApprovalInstance } from '../../types/bpm';
import { EscalationTimelineModal } from './EscalationTimelineModal';
import { EscalationPolicyManager } from './EscalationPolicyManager';
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
  ListFilter
} from 'lucide-react';
import { format } from 'date-fns';

interface ApprovalCenterProps {
  session: UserSession;
}

export const ApprovalCenter: React.FC<ApprovalCenterProps> = ({ session }) => {
  const [activeTab, setActiveTab] = useState<'PENDING' | 'POLICIES'>('PENDING');
  const [approvals, setApprovals] = useState<BpmApprovalInstance[]>([]);
  const [loading, setLoading] = useState(true);
  const [actioningId, setActioningId] = useState<string | null>(null);
  const [selectedTimelineInstance, setSelectedTimelineInstance] = useState<BpmApprovalInstance | null>(null);

  // Delegation Modal State
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
    try {
      await BpmService.performAction(session, instanceId, action, reason);
      await loadApprovals();
    } catch (err: any) {
      console.error('Action failed:', err);
      alert(`Action failed: ${err.message || 'Error processing approval'}`);
    } finally {
      setActioningId(null);
    }
  };

  const handleConfirmReturn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!returningInstance || !returnReason.trim()) return;

    setReturning(true);
    try {
      await BpmService.performAction(session, returningInstance.id, 'RETURN', returnReason.trim());
      setReturningInstance(null);
      setReturnReason('');
      await loadApprovals();
    } catch (err: any) {
      alert(`Return failed: ${err.message || 'Error returning approval'}`);
    } finally {
      setReturning(false);
    }
  };

  const handleConfirmDelegation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!delegatingInstance || !delegateUserId.trim()) return;

    setDelegating(true);
    try {
      await BpmService.performAction(
        session, 
        delegatingInstance.id, 
        'DELEGATE', 
        'Delegated approval authority', 
        delegateUserId.trim()
      );
      setDelegatingInstance(null);
      setDelegateUserId('');
      await loadApprovals();
    } catch (err: any) {
      alert(`Delegation failed: ${err.message || 'Error delegating approval'}`);
    } finally {
      setDelegating(false);
    }
  };

  const renderEscalationBadge = (instance: BpmApprovalInstance) => {
    if (instance.escalationLevel && instance.escalationLevel > 0) {
      const isHigh = instance.escalationLevel >= 2;
      return (
        <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1 ${
          isHigh 
            ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-400 border border-rose-300 dark:border-rose-800' 
            : 'bg-orange-100 text-orange-800 dark:bg-orange-950/60 dark:text-orange-400 border border-orange-300 dark:border-orange-800'
        }`}>
          <AlertTriangle className="w-3 h-3" />
          <span>Escalation L{instance.escalationLevel}</span>
        </span>
      );
    }

    if (instance.isOverdue) {
      return (
        <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-400 border border-rose-200 dark:border-rose-800 flex items-center gap-1">
          <Clock className="w-3 h-3 text-rose-600" />
          <span>Overdue</span>
        </span>
      );
    }

    if (instance.lastReminderAt) {
      return (
        <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-400 border border-sky-200 dark:border-sky-800 flex items-center gap-1">
          <Bell className="w-3 h-3 text-sky-600" />
          <span>Reminder Sent</span>
        </span>
      );
    }

    return (
      <span className="text-xs font-medium px-2.5 py-1 bg-amber-100 text-amber-800 rounded-full dark:bg-amber-950/50 dark:text-amber-400 border border-amber-200 dark:border-amber-900 flex items-center gap-1">
        <Clock className="w-3 h-3" /> Pending
      </span>
    );
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      
      {/* Top Header with Navigation Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Enterprise BPM Approval Center</h2>
          <p className="text-xs text-slate-500 mt-1">
            Central multi-tier approval engine with automated escalation timers and SLA enforcement.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-700">
          <button
            onClick={() => setActiveTab('PENDING')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === 'PENDING'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <ListFilter className="w-3.5 h-3.5" />
            <span>My Pending Approvals ({approvals.length})</span>
          </button>

          {canManagePolicies && (
            <button
              onClick={() => setActiveTab('POLICIES')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                activeTab === 'POLICIES'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Escalation Policies</span>
            </button>
          )}
        </div>
      </div>

      {activeTab === 'POLICIES' ? (
        <EscalationPolicyManager session={session} />
      ) : (
        <>
          {loading ? (
            <div className="flex items-center justify-center p-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
          ) : approvals.length === 0 ? (
            <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm p-6">
              <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">All Caught Up!</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                You have no pending approvals requiring your authorization at this time.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {approvals.map((instance) => (
                <div 
                  key={instance.id} 
                  className={`bg-white dark:bg-slate-900 p-6 rounded-3xl border transition duration-200 shadow-sm space-y-4 ${
                    instance.escalationLevel && instance.escalationLevel > 0
                      ? 'border-orange-300 dark:border-orange-900/60 ring-1 ring-orange-500/20'
                      : instance.isOverdue
                        ? 'border-rose-300 dark:border-rose-900/60'
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
                        <h4 className="font-bold text-slate-900 dark:text-white text-base">
                          {instance.sourceModule} Request
                        </h4>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[11px] font-semibold text-slate-500">
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
                  <div className="space-y-2 bg-slate-50 dark:bg-slate-950/60 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Record ID:</span>
                      <span className="font-mono font-medium text-slate-900 dark:text-white">{instance.sourceRecordId}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Submitted:</span>
                      <span className="font-medium text-slate-700 dark:text-slate-300">
                        {format(new Date(instance.submittedAt), 'PP p')}
                      </span>
                    </div>
                    {instance.dueAt && (
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">SLA Due Target:</span>
                        <span className={`font-semibold ${instance.isOverdue ? 'text-rose-600 dark:text-rose-400' : 'text-slate-700 dark:text-slate-300'}`}>
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
                        className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-semibold px-2 py-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition flex items-center gap-1"
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
                      Reject
                    </button>
                    <button 
                      onClick={() => handleAction(instance.id, 'APPROVE')}
                      disabled={actioningId === instance.id}
                      className="flex-1 py-2.5 rounded-2xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 shadow-sm transition-colors disabled:opacity-50 text-xs"
                    >
                      {actioningId === instance.id ? 'Processing...' : 'Approve'}
                    </button>
                  </div>
                </div>
              ))}
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
              <h4 className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2">
                <Share className="w-4 h-4 text-indigo-600" />
                <span>Delegate Approval Authority</span>
              </h4>
              <button
                type="button"
                onClick={() => setDelegatingInstance(null)}
                className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                Cancel
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Assign a colleague or supervisor as an authorized delegate for approval request <strong>{delegatingInstance.sourceRecordId}</strong>.
            </p>

            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Delegate User ID or Email *
              </label>
              <input
                type="text"
                required
                value={delegateUserId}
                onChange={(e) => setDelegateUserId(e.target.value)}
                placeholder="e.g. user_123 or supervisor@company.com"
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDelegatingInstance(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
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
              <h4 className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2">
                <CornerUpLeft className="w-4 h-4 text-amber-500" />
                <span>Return Approval Request</span>
              </h4>
              <button
                type="button"
                onClick={() => setReturningInstance(null)}
                className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                Cancel
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Return request <strong>{returningInstance.sourceRecordId}</strong> back to the submitter for revision or clarification.
            </p>

            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Reason for Return *
              </label>
              <textarea
                required
                rows={3}
                value={returnReason}
                onChange={(e) => setReturnReason(e.target.value)}
                placeholder="Explain what changes or clarifications are needed..."
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setReturningInstance(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
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
