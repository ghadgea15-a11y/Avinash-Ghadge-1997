import React, { useState, useEffect } from 'react';
import { BpmApprovalInstance, BpmEscalationEvent, EscalationPolicy } from '../../types/bpm';
import { BpmEscalationService } from '../../services/bpmEscalationService';
import { 
  X, 
  Clock, 
  AlertTriangle, 
  Bell, 
  ShieldAlert, 
  UserCheck, 
  ArrowRight, 
  Calendar,
  CheckCircle2,
  FileText
} from 'lucide-react';
import { format } from 'date-fns';

interface EscalationTimelineModalProps {
  companyId: string;
  instance: BpmApprovalInstance;
  onClose: () => void;
}

export const EscalationTimelineModal: React.FC<EscalationTimelineModalProps> = ({
  companyId,
  instance,
  onClose
}) => {
  const [events, setEvents] = useState<BpmEscalationEvent[]>([]);
  const [policy, setPolicy] = useState<EscalationPolicy | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
    const unsub = BpmEscalationService.subscribeToEscalationEvents(companyId, instance.id, (list) => {
      setEvents(list);
    });
    return () => unsub();
  }, [companyId, instance.id]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [eventList, pol] = await Promise.all([
        BpmEscalationService.getEscalationEvents(companyId, instance.id),
        instance.escalationPolicyId 
          ? BpmEscalationService.getPolicyById(companyId, instance.escalationPolicyId)
          : null
      ]);
      setEvents(eventList);
      setPolicy(pol);
    } catch (err) {
      console.error('Failed to load escalation timeline data:', err);
    } finally {
      setLoading(false);
    }
  };

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'REMINDER':
        return <Bell className="w-4 h-4 text-sky-500" />;
      case 'DUE':
        return <Clock className="w-4 h-4 text-amber-500" />;
      case 'ESCALATION_LEVEL_1':
        return <AlertTriangle className="w-4 h-4 text-orange-500" />;
      case 'ESCALATION_LEVEL_2':
        return <AlertTriangle className="w-4 h-4 text-rose-500" />;
      case 'FINAL_ESCALATION':
        return <ShieldAlert className="w-4 h-4 text-red-600" />;
      default:
        return <Clock className="w-4 h-4 text-slate-400" />;
    }
  };

  const getEventBadge = (type: string) => {
    switch (type) {
      case 'REMINDER':
        return <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-400 border border-sky-200 dark:border-sky-800">Reminder</span>;
      case 'DUE':
        return <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-400 border border-amber-200 dark:border-amber-800">Due Reached</span>;
      case 'ESCALATION_LEVEL_1':
        return <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-orange-100 text-orange-800 dark:bg-orange-950/60 dark:text-orange-400 border border-orange-200 dark:border-orange-800">Escalation L1</span>;
      case 'ESCALATION_LEVEL_2':
        return <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-400 border border-rose-200 dark:border-rose-800">Escalation L2</span>;
      case 'FINAL_ESCALATION':
        return <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-400 border border-red-200 dark:border-red-800">Final Escalation</span>;
      default:
        return <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-slate-100 text-black dark:text-slate-200 dark:bg-slate-800 dark:text-slate-300">Event</span>;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        
        {/* Modal Header */}
        <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-950/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center">
              <Clock className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-black dark:text-white">Escalation & Timer History</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Instance ID: {instance.id} • {instance.sourceModule}</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Policy Summary Card */}
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-slate-400" />
              <span className="text-xs font-bold text-slate-900 dark:text-slate-300">Policy:</span>
              <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                {policy ? `${policy.policyName} (v${instance.policyVersion || policy.version})` : 'Default System Escalation Policy'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {instance.isOverdue && (
                <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400 border border-rose-200 dark:border-rose-800">
                  OVERDUE
                </span>
              )}
              {instance.escalationLevel ? (
                <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-orange-100 text-orange-700 dark:bg-orange-950/50 dark:text-orange-400 border border-orange-200 dark:border-orange-800">
                  Level {instance.escalationLevel}
                </span>
              ) : null}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 text-xs bg-white dark:bg-slate-950/60 p-3 rounded-2xl border border-slate-200 dark:border-slate-800">
            <div>
              <p className="text-slate-400">Assigned At</p>
              <p className="font-semibold text-black dark:text-white mt-0.5">
                {instance.assignedAt ? format(new Date(instance.assignedAt), 'PP p') : 'Pending'}
              </p>
            </div>
            <div>
              <p className="text-slate-400">SLA Due At</p>
              <p className="font-semibold text-black dark:text-white mt-0.5">
                {instance.dueAt ? format(new Date(instance.dueAt), 'PP p') : 'Not Set'}
              </p>
            </div>
            <div>
              <p className="text-slate-400">Current Approvers</p>
              <p className="font-semibold text-black dark:text-white mt-0.5 truncate">
                {instance.currentApprovers.join(', ') || 'None'}
              </p>
            </div>
          </div>
        </div>

        {/* Timeline Content */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
          ) : events.length === 0 ? (
            <div className="text-center py-10">
              <Clock className="w-10 h-10 text-slate-300 dark:text-slate-900 dark:text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-300">No Escalation Events Yet</p>
              <p className="text-xs text-slate-400 mt-1">This request is progressing within standard SLA thresholds.</p>
            </div>
          ) : (
            <div className="relative pl-6 border-l-2 border-slate-200 dark:border-slate-800 space-y-6">
              {events.map((evt) => (
                <div key={evt.id} className="relative group">
                  {/* Timeline Dot */}
                  <div className="absolute -left-[31px] top-1 w-5 h-5 rounded-full bg-white dark:bg-slate-900 border-2 border-indigo-500 flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-indigo-600" />
                  </div>

                  <div className="bg-white dark:bg-slate-950/40 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {getEventIcon(evt.eventType)}
                        {getEventBadge(evt.eventType)}
                      </div>
                      <span className="text-xs text-slate-400 font-mono">
                        {format(new Date(evt.triggeredAt), 'PP p')}
                      </span>
                    </div>

                    <p className="text-xs text-slate-900 dark:text-slate-300">
                      {evt.reason}
                    </p>

                    {evt.reassigned && (
                      <div className="flex items-center gap-2 text-xs font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-3 py-1.5 rounded-xl border border-indigo-100 dark:border-indigo-900">
                        <UserCheck className="w-3.5 h-3.5" />
                        <span>Reassigned from: {evt.previousApprovers.join(', ')}</span>
                        <ArrowRight className="w-3 h-3 mx-1" />
                        <span>To: {evt.escalatedTo.join(', ')}</span>
                      </div>
                    )}

                    <div className="text-[11px] text-slate-400 font-mono pt-1">
                      Event ID: {evt.id}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex justify-end bg-white dark:bg-slate-950/40">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-slate-900 dark:bg-white dark:bg-slate-900 text-white dark:text-black dark:text-white font-bold text-xs hover:opacity-90 transition shadow-sm"
          >
            Close Timeline
          </button>
        </div>

      </div>
    </div>
  );
};
