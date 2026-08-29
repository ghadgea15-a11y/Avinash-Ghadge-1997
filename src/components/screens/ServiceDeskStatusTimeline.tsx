import React, { useEffect, useState } from 'react';
import { 
  CheckCircle2, 
  Clock, 
  PauseCircle, 
  PlayCircle, 
  RotateCcw, 
  XCircle, 
  Star, 
  ShieldCheck, 
  User, 
  Calendar,
  Layers,
  ArrowRight,
  Sparkles,
  GitCommit
} from 'lucide-react';
import { 
  ServiceTicketRecord, 
  ServiceTicketStatus, 
  TicketStatusHistoryRecord, 
  UserSession 
} from '../../types';
import { ServiceDeskService } from '../../services/serviceDeskService';

interface ServiceDeskStatusTimelineProps {
  ticket: ServiceTicketRecord;
  companyId: string;
  userSession: UserSession;
}

export const ServiceDeskStatusTimeline: React.FC<ServiceDeskStatusTimelineProps> = ({
  ticket,
  companyId,
  userSession
}) => {
  const [history, setHistory] = useState<TicketStatusHistoryRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const unsubscribe = ServiceDeskService.subscribeToStatusHistory(companyId, ticket.id, (records) => {
      // Merge with embedded history if subcollection is empty
      if (records.length === 0 && ticket.statusHistory && ticket.statusHistory.length > 0) {
        setHistory(ticket.statusHistory);
      } else {
        setHistory(records);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [companyId, ticket.id, ticket.statusHistory]);

  const getStatusBadge = (status: ServiceTicketStatus | string) => {
    const norm = ServiceDeskService.normalizeStatus(status as ServiceTicketStatus);
    const def = ServiceDeskService.STATUS_DEFINITIONS[norm] || ServiceDeskService.STATUS_DEFINITIONS.NEW;

    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${def.badgeBg} ${def.badgeText} ${def.badgeBorder}`}>
        {def.name}
      </span>
    );
  };

  const getStatusIcon = (status: ServiceTicketStatus | string) => {
    const norm = ServiceDeskService.normalizeStatus(status as ServiceTicketStatus);
    switch (norm) {
      case 'IN_PROGRESS': return <PlayCircle className="w-4 h-4 text-amber-500" />;
      case 'ON_HOLD': return <PauseCircle className="w-4 h-4 text-orange-500" />;
      case 'RESOLVED': return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
      case 'CLOSED': return <ShieldCheck className="w-4 h-4 text-zinc-500" />;
      case 'REOPENED': return <RotateCcw className="w-4 h-4 text-rose-500" />;
      case 'CANCELLED': return <XCircle className="w-4 h-4 text-red-500" />;
      default: return <Clock className="w-4 h-4 text-blue-500" />;
    }
  };

  const currentNorm = ServiceDeskService.normalizeStatus(ticket.status);

  // Stepper stages
  const standardLifecycle: { key: ServiceTicketStatus; label: string }[] = [
    { key: 'NEW', label: 'New' },
    { key: 'ASSIGNED', label: 'Assigned' },
    { key: 'IN_PROGRESS', label: 'In Progress' },
    { key: 'RESOLVED', label: 'Resolved' },
    { key: 'CLOSED', label: 'Closed' }
  ];

  const getStepState = (stepKey: ServiceTicketStatus) => {
    const order = ['NEW', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];
    const currentIdx = order.indexOf(currentNorm);
    const stepIdx = order.indexOf(stepKey);

    if (currentNorm === 'CANCELLED') return 'cancelled';
    if (currentNorm === 'REOPENED' && stepKey === 'IN_PROGRESS') return 'current';
    if (currentNorm === 'ON_HOLD' && stepKey === 'IN_PROGRESS') return 'paused';
    if (stepIdx < currentIdx) return 'completed';
    if (stepIdx === currentIdx) return 'current';
    return 'upcoming';
  };

  return (
    <div className="space-y-6 pt-2">
      
      {/* Visual Lifecycle Stepper */}
      <div className="p-4 bg-white dark:bg-slate-950 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/60">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-xs font-bold text-slate-900 dark:text-slate-300 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
            <GitCommit className="w-4 h-4 text-indigo-500" />
            <span>Ticket Lifecycle Progression</span>
          </h4>
          <div className="flex items-center gap-2">
            {currentNorm === 'ON_HOLD' && (
              <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-orange-100 text-orange-800 dark:bg-orange-950/60 dark:text-orange-300 animate-pulse flex items-center gap-1">
                <PauseCircle className="w-3 h-3" /> SLA Paused
              </span>
            )}
            {currentNorm === 'REOPENED' && (
              <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 flex items-center gap-1">
                <RotateCcw className="w-3 h-3" /> Lifecycle Reopened
              </span>
            )}
            {currentNorm === 'CANCELLED' && (
              <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300 flex items-center gap-1">
                <XCircle className="w-3 h-3" /> Cancelled
              </span>
            )}
          </div>
        </div>

        {/* Stepper Bar */}
        <div className="grid grid-cols-5 gap-2 relative">
          {standardLifecycle.map((step, idx) => {
            const state = getStepState(step.key);
            return (
              <div key={step.key} className="flex flex-col items-center text-center group">
                <div 
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all shadow-xs ${
                    state === 'completed'
                      ? 'bg-emerald-600 text-white'
                      : state === 'current'
                      ? 'bg-indigo-600 text-white ring-4 ring-indigo-100 dark:ring-indigo-900/50'
                      : state === 'paused'
                      ? 'bg-orange-500 text-white ring-4 ring-orange-100 dark:ring-orange-900/50 animate-pulse'
                      : state === 'cancelled'
                      ? 'bg-slate-300 dark:bg-slate-700 text-slate-500'
                      : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                  }`}
                >
                  {state === 'completed' ? (
                    <CheckCircle2 className="w-4 h-4" />
                  ) : (
                    <span>{idx + 1}</span>
                  )}
                </div>
                <span className={`text-[11px] font-semibold mt-1.5 ${
                  state === 'current' || state === 'paused'
                    ? 'text-indigo-600 dark:text-indigo-400 font-bold'
                    : state === 'completed'
                    ? 'text-black dark:text-slate-200'
                    : 'text-slate-400 dark:text-slate-500'
                }`}>
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Chronological Status Audit Timeline */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold text-slate-900 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-indigo-500" />
            <span>Status Transition Audit Trail</span>
          </h4>
          <span className="text-[11px] text-slate-500 dark:text-slate-400">
            {history.length} {history.length === 1 ? 'transition' : 'transitions'} recorded
          </span>
        </div>

        {loading ? (
          <div className="py-8 text-center text-xs text-slate-500 dark:text-slate-400 flex flex-col items-center gap-2">
            <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            <span>Loading status transition history...</span>
          </div>
        ) : history.length === 0 ? (
          <div className="py-8 px-4 text-center rounded-xl bg-white dark:bg-slate-950 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
            <Clock className="w-8 h-8 mx-auto mb-2 text-slate-400 opacity-60" />
            <p className="font-semibold text-slate-900 dark:text-slate-300">Initial State: {ticket.status}</p>
            <p className="text-slate-500 dark:text-slate-400 mt-0.5">Created on {new Date(ticket.createdAt).toLocaleString()} by {ticket.reportedByName || 'User'}</p>
          </div>
        ) : (
          <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
            {history.map((record) => (
              <div 
                key={record.id} 
                className="relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 shadow-xs space-y-2.5"
              >
                {/* Node icon */}
                <div className="absolute -left-[27px] top-3.5 w-6 h-6 rounded-full bg-white dark:bg-slate-900 border-2 border-indigo-500 flex items-center justify-center">
                  {getStatusIcon(record.toStatus)}
                </div>

                {/* Transition Header */}
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400 line-through">
                      {record.fromStatus}
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                    {getStatusBadge(record.toStatus)}
                  </div>
                  <span className="text-[11px] text-slate-400 flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {new Date(record.changedAt).toLocaleString()}
                  </span>
                </div>

                {/* Actor */}
                <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400 dark:text-slate-300">
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  <span className="font-semibold">{record.changedByName || 'System'}</span>
                  {record.changedByRole && (
                    <span className="px-1.5 py-0.2 text-[10px] rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-mono">
                      {record.changedByRole}
                    </span>
                  )}
                </div>

                {/* Details / Notes / Reason */}
                {(record.reason || record.notes) && (
                  <div className="p-2.5 rounded-lg bg-white dark:bg-slate-950 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-xs text-slate-900 dark:text-slate-300">
                    <p className="font-semibold text-black dark:text-white dark:text-slate-100 mb-0.5">Reason / Justification:</p>
                    <p>{record.reason || record.notes}</p>
                  </div>
                )}

                {/* On Hold Specific */}
                {record.pauseReason && (
                  <div className="p-2 rounded-lg bg-orange-50 dark:bg-orange-950/40 border border-orange-200 dark:border-orange-900 text-xs text-orange-800 dark:text-orange-300 flex items-center justify-between">
                    <span className="font-semibold">Pause Reason: {record.pauseReason.replace(/_/g, ' ')}</span>
                    <span className="text-[10px] px-1.5 py-0.5 bg-orange-200 dark:bg-orange-900 text-orange-900 dark:text-orange-100 rounded font-bold">
                      SLA Clock Paused
                    </span>
                  </div>
                )}

                {/* Resolution Specific */}
                {record.resolutionSummary && (
                  <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-xs text-emerald-900 dark:text-emerald-200 space-y-1">
                    <div className="flex items-center justify-between font-bold">
                      <span>Resolution Summary:</span>
                      {record.resolutionCategory && (
                        <span className="text-[10px] px-1.5 py-0.5 bg-emerald-200 dark:bg-emerald-900 text-emerald-900 dark:text-emerald-100 rounded">
                          {record.resolutionCategory}
                        </span>
                      )}
                    </div>
                    <p className="text-slate-900 dark:text-slate-300">{record.resolutionSummary}</p>
                    {record.rootCause && (
                      <p className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium">
                        Root Cause: {record.rootCause}
                      </p>
                    )}
                  </div>
                )}

                {/* Closure CSAT Specific */}
                {record.clientRating !== undefined && (
                  <div className="p-2.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900 text-xs text-indigo-900 dark:text-indigo-200 space-y-1">
                    <div className="flex items-center gap-1">
                      <span className="font-bold">CSAT Score:</span>
                      <div className="flex items-center text-amber-400 ml-1">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star key={s} className={`w-3.5 h-3.5 ${s <= (record.clientRating || 5) ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}`} />
                        ))}
                      </div>
                      <span className="font-bold text-black dark:text-slate-200 ml-1">
                        ({record.clientRating}/5)
                      </span>
                    </div>
                    {record.clientFeedbackNotes && (
                      <p className="text-slate-600 dark:text-slate-400 dark:text-slate-300 text-[11px]">
                        Feedback: &quot;{record.clientFeedbackNotes}&quot;
                      </p>
                    )}
                  </div>
                )}

                {/* Footer audit reference */}
                <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800/60 text-[10px] text-slate-400">
                  <span>ID: {record.id}</span>
                  {record.bpmWorkflowId && (
                    <span className="text-purple-600 dark:text-purple-400 font-semibold flex items-center gap-1">
                      <Sparkles className="w-3 h-3" /> BPM: {record.bpmWorkflowId} ({record.bpmStatus || 'PENDING'})
                    </span>
                  )}
                  {record.auditReference && (
                    <span className="font-mono">{record.auditReference}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
};
