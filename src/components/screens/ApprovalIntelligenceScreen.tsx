import React, { useState, useEffect } from 'react';
import { UserSession } from '../../types';
import { BpmApprovalInstance } from '../../types/bpm';
import { BpmService } from '../../services/bpmService';
import { ShieldCheck, CheckCircle, Clock, XCircle, Users, Activity, BarChart2, Eye, ShieldAlert, ArrowRight, CornerDownRight } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';

interface Props {
  session: UserSession;
}

export const ApprovalIntelligenceScreen: React.FC<Props> = ({ session }) => {
  const [approvals, setApprovals] = useState<BpmApprovalInstance[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedInstance, setSelectedInstance] = useState<BpmApprovalInstance | null>(null);
  const [filter, setFilter] = useState<string>('ALL'); // ALL, PENDING_APPROVAL, APPROVED, REJECTED, OVERDUE, ESCALATED, DELEGATED, CANCELLED

  useEffect(() => {
    loadApprovals();
  }, [session.companyId]);

  
  const loadApprovals = async () => {
    setLoading(true);
    try {
      const data = await BpmService.getCompanyApprovals(session.companyId, 500);
      setApprovals(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (instance: BpmApprovalInstance) => {
    if (instance.isOverdue && instance.status === 'PENDING_APPROVAL') {
      return <span className="px-2 py-0.5 rounded text-xs font-bold bg-rose-100 text-rose-800">OVERDUE</span>;
    }
    switch (instance.status) {
      case 'PENDING_APPROVAL': return <span className="px-2 py-0.5 rounded text-xs font-bold bg-amber-100 text-amber-800">PENDING</span>;
      case 'APPROVED': return <span className="px-2 py-0.5 rounded text-xs font-bold bg-emerald-100 text-emerald-800">APPROVED</span>;
      case 'REJECTED': return <span className="px-2 py-0.5 rounded text-xs font-bold bg-rose-100 text-rose-800">REJECTED</span>;
      case 'CANCELLED': return <span className="px-2 py-0.5 rounded text-xs font-bold bg-slate-100 text-black dark:text-slate-200">CANCELLED</span>;
      default: return <span className="px-2 py-0.5 rounded text-xs font-bold bg-slate-100 text-black dark:text-slate-200">{instance.status}</span>;
    }
  };

  const filteredApprovals = approvals.filter(a => {
    if (filter === 'ALL') return true;
    if (filter === 'OVERDUE') return a.isOverdue && a.status === 'PENDING_APPROVAL';
    if (filter === 'ESCALATED') return a.escalationLevel && a.escalationLevel > 0;
    // Need to detect delegation... not strictly a status on the instance, but we can check if there's proxy history
    if (filter === 'DELEGATED') return a.history?.some(h => !!h.actingProxyName);
    return a.status === filter;
  });

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-black dark:text-white flex items-center gap-3 tracking-tight">
            <Activity className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
            Approval Intelligence
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 font-medium">
            Enterprise command center for all business process workflows and bottlenecks.
          </p>
        </div>
        <button 
          onClick={loadApprovals}
          className="px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-medium hover:bg-white dark:bg-slate-950 dark:hover:bg-slate-800 transition-colors"
        >
          Refresh Data
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2">
        {['ALL', 'PENDING_APPROVAL', 'OVERDUE', 'ESCALATED', 'DELEGATED', 'APPROVED', 'REJECT', 'CANCELLED'].map(f => (
          <button 
            key={f}
            onClick={() => setFilter(f === 'REJECT' ? 'REJECTED' : f)}
            className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-colors ${filter === (f === 'REJECT' ? 'REJECTED' : f) ? 'bg-indigo-600 text-white' : 'bg-white text-slate-600 hover:bg-white border border-slate-200'}`}
          >
            {f.replace('_APPROVAL', '')}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col h-[600px]">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/50 dark:bg-slate-900/50">
            <h2 className="font-bold text-black dark:text-white flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-indigo-600" />
              Transactions ({filteredApprovals.length})
            </h2>
          </div>
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 p-2">
            {loading ? (
              <div className="p-8 text-center text-slate-500 dark:text-slate-400 text-sm">Loading intelligence...</div>
            ) : filteredApprovals.length === 0 ? (
              <div className="p-8 text-center text-slate-500 dark:text-slate-400 text-sm">No transactions match the filter.</div>
            ) : (
              filteredApprovals.map(instance => (
                <div 
                  key={instance!.id} 
                  onClick={() => setSelectedInstance(instance)}
                  className={`p-3 rounded-xl cursor-pointer transition-colors ${selectedInstance?.id === instance!.id ? 'bg-indigo-50 border border-indigo-100' : 'hover:bg-white border border-transparent'}`}
                >
                  <div className="flex justify-between items-start mb-1">
                    <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider">{instance.sourceModule}</span>
                    {getStatusBadge(instance)}
                  </div>
                  <h3 className="text-sm font-bold text-black dark:text-white truncate">ID: {instance.sourceRecordId}</h3>
                  <div className="mt-2 text-xs text-slate-500 dark:text-slate-400 flex justify-between items-center">
                    <span>{instance.requesterName || instance.requesterId}</span>
                    <span>{formatDistanceToNow(new Date(instance.submittedAt))} ago</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col h-[600px]">
          {selectedInstance ? (
            <div className="flex flex-col h-full">
              <div className="p-6 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/50 dark:bg-slate-900/50 flex justify-between items-start">
                <div>
                  <h2 className="text-xl font-bold text-black dark:text-white flex items-center gap-3">
                    {selectedInstance.sourceModule} Transaction: {selectedInstance.sourceRecordId}
                    {getStatusBadge(selectedInstance)}
                  </h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 font-mono">BPM Instance: {selectedInstance.id}</p>
                </div>
                <div className="text-right text-sm">
                  <p className="text-slate-500 dark:text-slate-400">Submitted By</p>
                  <p className="font-bold text-black dark:text-white">{selectedInstance.requesterName || selectedInstance.requesterId}</p>
                  <p className="text-slate-400">{format(new Date(selectedInstance.submittedAt), 'PP pp')}</p>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-8">
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 rounded-xl bg-white dark:bg-slate-950 border border-slate-100">
                    <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">Current Tier</p>
                    <p className="text-lg font-bold text-black dark:text-white">{selectedInstance.currentTier}</p>
                  </div>
                  <div className="p-4 rounded-xl bg-white dark:bg-slate-950 border border-slate-100">
                    <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">Workflow ID</p>
                    <p className="text-sm font-bold text-black dark:text-white truncate" title={selectedInstance.workflowId}>{selectedInstance.workflowId}</p>
                  </div>
                  <div className="p-4 rounded-xl bg-white dark:bg-slate-950 border border-slate-100">
                    <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">Escalation Level</p>
                    <p className="text-lg font-bold text-black dark:text-white">{selectedInstance.escalationLevel || 0}</p>
                  </div>
                  <div className="p-4 rounded-xl bg-white dark:bg-slate-950 border border-slate-100">
                    <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">Pending Approvers</p>
                    <p className="text-sm font-bold text-black dark:text-white">{selectedInstance.currentApprovers?.length || 0} assigned</p>
                  </div>
                </div>

                {selectedInstance.status === 'PENDING_APPROVAL' && (
                  <div>
                    <h3 className="text-sm font-bold text-black dark:text-white mb-3 flex items-center gap-2">
                      <Clock className="w-4 h-4 text-amber-500" />
                      Currently Stuck At
                    </h3>
                    <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/50 space-y-3">
                      <div className="flex flex-wrap gap-2">
                        {selectedInstance.currentApprovers?.map(approver => (
                          <span key={approver} className="px-3 py-1 bg-white dark:bg-slate-900 border border-amber-200 rounded-lg text-sm font-medium text-slate-900 dark:text-slate-300 shadow-sm flex items-center gap-2">
                            <Users className="w-4 h-4 text-amber-500" />
                            {approver}
                          </span>
                        ))}
                      </div>
                      <p className="text-xs text-amber-700 font-medium">
                        Waiting for action since {selectedInstance.history?.length ? formatDistanceToNow(new Date(selectedInstance.history[selectedInstance.history.length-1].timestamp)) : formatDistanceToNow(new Date(selectedInstance.submittedAt))} ago.
                      </p>
                    </div>
                  </div>
                )}

                <div>
                  <h3 className="text-sm font-bold text-black dark:text-white mb-4 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-indigo-600" />
                    Audit Trail & History
                  </h3>
                  <div className="space-y-4">
                    <div className="relative pl-6 border-l-2 border-indigo-100 pb-4">
                      <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-indigo-500 ring-4 ring-white" />
                      <p className="text-sm font-bold text-black dark:text-white">Submitted for Approval</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{format(new Date(selectedInstance.submittedAt), 'PP pp')}</p>
                    </div>
                    {selectedInstance.history?.map((h, i) => (
                      <div key={i} className="relative pl-6 border-l-2 border-indigo-100 pb-4">
                        <div className={`absolute -left-[9px] top-0 w-4 h-4 rounded-full ring-4 ring-white ${h.action === 'APPROVE' ? 'bg-emerald-500' : h.action === 'REJECT' ? 'bg-rose-500' : 'bg-amber-500'}`} />
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="text-sm font-bold text-black dark:text-white">
                              {h.action === 'APPROVE' ? 'Approved' : h.action === 'REJECT' ? 'Rejected' : h.action}
                              {h.actingProxyName && <span className="ml-2 px-2 py-0.5 bg-purple-100 text-purple-700 text-[10px] rounded uppercase">By Proxy</span>}
                            </p>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">By: {h.actingProxyName || h.actorId} {h.actingProxyName ? `(for ${h.originalApproverName})` : ''}</p>
                            {h.reason && (
                              <p className="text-sm text-slate-900 dark:text-slate-300 bg-white dark:bg-slate-950 p-2 rounded border border-slate-100 mt-2 italic flex items-start gap-2">
                                <CornerDownRight className="w-4 h-4 text-slate-400 shrink-0" />
                                {h.reason}
                              </p>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 dark:text-slate-400">{format(new Date(h.timestamp), 'PP pp')}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-500 dark:text-slate-400 p-8">
              <Eye className="w-16 h-16 text-slate-200 mb-4" />
              <p>Select a transaction to view intelligence details.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
