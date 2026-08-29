import React, { useState } from 'react';
import { 
  X, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  PauseCircle, 
  PlayCircle, 
  RotateCcw, 
  XCircle, 
  Star, 
  ShieldCheck, 
  Info,
  Layers
} from 'lucide-react';
import { 
  ServiceTicketRecord, 
  ServiceTicketStatus, 
  TicketStatusDefinition, 
  TicketSlaPauseReason, 
  UserSession,
  TicketStatusTransitionPayload
} from '../../types';
import { ServiceDeskService } from '../../services/serviceDeskService';
import { OfflineSyncService } from '../../services/offlineSyncService';

interface ServiceDeskTransitionModalProps {
  isOpen: boolean;
  onClose: () => void;
  ticket: ServiceTicketRecord;
  targetDefinition: TicketStatusDefinition;
  userSession: UserSession;
  activeCompanyId: string;
  onSuccess: (updatedTicket: ServiceTicketRecord) => void;
}

export const ServiceDeskTransitionModal: React.FC<ServiceDeskTransitionModalProps> = ({
  isOpen,
  onClose,
  ticket,
  targetDefinition,
  userSession,
  activeCompanyId,
  onSuccess
}) => {
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [pauseReason, setPauseReason] = useState<TicketSlaPauseReason>('WAITING_ON_CLIENT');
  const [resolutionCategory, setResolutionCategory] = useState(ticket.category || 'TECHNICAL_FIX');
  const [rootCause, setRootCause] = useState('');
  const [correctiveAction, setCorrectiveAction] = useState('');
  const [resolutionSummary, setResolutionSummary] = useState('');
  const [clientRating, setClientRating] = useState<number>(5);
  const [clientFeedbackNotes, setClientFeedbackNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const targetStatus = targetDefinition.status;
  const targetNorm = ServiceDeskService.normalizeStatus(targetStatus);

  const getStatusIcon = (status: ServiceTicketStatus) => {
    switch (status) {
      case 'IN_PROGRESS': return <PlayCircle className="w-5 h-5 text-amber-600" />;
      case 'ON_HOLD':
      case 'PENDING_CLIENT': return <PauseCircle className="w-5 h-5 text-orange-600" />;
      case 'RESOLVED': return <CheckCircle2 className="w-5 h-5 text-emerald-600" />;
      case 'CLOSED': return <ShieldCheck className="w-5 h-5 text-zinc-600" />;
      case 'REOPENED': return <RotateCcw className="w-5 h-5 text-rose-600" />;
      case 'CANCELLED': return <XCircle className="w-5 h-5 text-red-600" />;
      default: return <Clock className="w-5 h-5 text-blue-600" />;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // Client-side quick validations
    if (targetNorm === 'CANCELLED' && (!reason.trim() && !notes.trim())) {
      setErrorMessage('A cancellation reason is required.');
      return;
    }

    if (targetNorm === 'ON_HOLD' && (!reason.trim() && !notes.trim())) {
      setErrorMessage('Please provide explanation notes for putting this ticket on hold.');
      return;
    }

    if (targetNorm === 'RESOLVED' && (!resolutionSummary.trim() || resolutionSummary.trim().length < 5)) {
      setErrorMessage('A detailed resolution summary (at least 5 characters) is required to resolve this ticket.');
      return;
    }

    if (targetNorm === 'REOPENED' && (!reason.trim() || reason.trim().length < 5)) {
      setErrorMessage('A justification (at least 5 characters) is required to reopen this ticket.');
      return;
    }

    setLoading(true);

    const payload: TicketStatusTransitionPayload = {
      toStatus: targetStatus,
      reason: reason.trim() || notes.trim() || undefined,
      notes: notes.trim() || undefined,
      pauseReason: targetNorm === 'ON_HOLD' ? pauseReason : undefined,
      resolutionCategory: targetNorm === 'RESOLVED' ? resolutionCategory : undefined,
      rootCause: targetNorm === 'RESOLVED' ? rootCause.trim() || undefined : undefined,
      correctiveAction: targetNorm === 'RESOLVED' ? correctiveAction.trim() || undefined : undefined,
      resolutionSummary: targetNorm === 'RESOLVED' ? resolutionSummary.trim() : undefined,
      clientRating: targetNorm === 'CLOSED' ? clientRating : undefined,
      clientFeedbackNotes: targetNorm === 'CLOSED' ? clientFeedbackNotes.trim() : undefined,
      expectedCurrentStatus: ticket.status
    };

    try {
      if (!OfflineSyncService.isOnline()) {
        // Queue offline action
        OfflineSyncService.queueAction('SERVICE_TICKET_STATUS_TRANSITION', {
          session: userSession,
          companyId: activeCompanyId,
          ticketId: ticket.id,
          transitionData: payload
        });
        const offlineUpdatedTicket: ServiceTicketRecord = {
          ...ticket,
          status: targetStatus,
          previousStatus: ticket.status,
          lastStatusChangedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        onSuccess(offlineUpdatedTicket);
        onClose();
        return;
      }

      const res = await ServiceDeskService.transitionTicketStatus(
        userSession,
        activeCompanyId,
        ticket.id,
        payload
      );

      if (res.success) {
        onSuccess(res.updatedTicket || { ...ticket, status: targetStatus });
        onClose();
      } else {
        setErrorMessage(res.error || 'Failed to update ticket status.');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'An unexpected error occurred during status transition.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800">
              {getStatusIcon(targetStatus)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-black dark:text-white">
                  Transition to {targetDefinition.name}
                </h3>
                <span className={`px-2 py-0.5 text-[11px] font-bold rounded-full ${targetDefinition.badgeBg} ${targetDefinition.badgeText}`}>
                  {targetDefinition.code}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Ticket: #{ticket.ticketNumber} • {ticket.title}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 dark:text-slate-400 dark:hover:text-slate-300 rounded-md transition"
            disabled={loading}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          
          {/* Status Description Banner */}
          <div className="p-3 bg-white dark:bg-slate-950 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-700/60 flex items-start gap-2.5">
            <Info className="w-4 h-4 text-indigo-500 mt-0.5 shrink-0" />
            <div className="text-xs text-slate-600 dark:text-slate-400 dark:text-slate-300">
              <p className="font-semibold text-black dark:text-slate-200">{targetDefinition.description}</p>
              {targetNorm === 'ON_HOLD' && (
                <p className="text-amber-600 dark:text-amber-400 mt-1">
                  ⏱️ Resolution SLA Timer will be <strong>PAUSED</strong> until work resumes.
                </p>
              )}
              {targetNorm === 'IN_PROGRESS' && ticket.lastPausedAt && (
                <p className="text-emerald-600 dark:text-emerald-400 mt-1">
                  ▶️ SLA Timer will be <strong>RESUMED</strong> and due date extended by paused duration.
                </p>
              )}
              {targetNorm === 'RESOLVED' && (
                <p className="text-emerald-600 dark:text-emerald-400 mt-1">
                  🎯 Resolution SLA timer will be checked against target and marked as MET or FAILED.
                </p>
              )}
            </div>
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 rounded-lg flex items-start gap-2 text-xs text-rose-700 dark:text-rose-300">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* DYNAMIC FORM FIELDS */}

          {/* 1. ON HOLD / PENDING CLIENT */}
          {targetNorm === 'ON_HOLD' && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-900 dark:text-slate-300 mb-1">
                  Pause Reason Category <span className="text-rose-500">*</span>
                </label>
                <select
                  value={pauseReason}
                  onChange={(e) => setPauseReason(e.target.value as TicketSlaPauseReason)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-black dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  required
                >
                  <option value="WAITING_ON_CLIENT">Waiting on Client Verification / Reply</option>
                  <option value="PENDING_PARTS">Pending Replacement Parts / Spares</option>
                  <option value="THIRD_PARTY_DEPENDENCY">3rd Party Vendor / ISP Dependency</option>
                  <option value="SCHEDULED_MAINTENANCE">Scheduled Maintenance Window</option>
                  <option value="OTHER">Other Operational Hold</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-900 dark:text-slate-300 mb-1">
                  Detailed Explanation / Notes <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Specify why the ticket is being held (e.g. Sent email to client for IP configuration details)..."
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-black dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden resize-none"
                  required
                />
              </div>
            </div>
          )}

          {/* 2. RESOLVED */}
          {targetNorm === 'RESOLVED' && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-900 dark:text-slate-300 mb-1">
                  Resolution Category
                </label>
                <select
                  value={resolutionCategory}
                  onChange={(e) => setResolutionCategory(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-black dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                >
                  <option value="TECHNICAL_FIX">Technical Fix / System Remediation</option>
                  <option value="HARDWARE_REPLACEMENT">Hardware / Component Replacement</option>
                  <option value="CONFIGURATION_CHANGE">Configuration & Settings Update</option>
                  <option value="USER_TRAINING">User Guidance & Training</option>
                  <option value="FALSE_ALARM">False Alarm / Duplicate Resolution</option>
                  <option value="VENDOR_ESCALATION_RESOLVED">Resolved via Vendor Escalation</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-900 dark:text-slate-300 mb-1">
                  Root Cause Analysis (RCA)
                </label>
                <input
                  type="text"
                  value={rootCause}
                  onChange={(e) => setRootCause(e.target.value)}
                  placeholder="e.g. Overheated PoE power switch in Rack 2 or Corrupted firmware"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-black dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-900 dark:text-slate-300 mb-1">
                  Corrective & Preventive Action (CAPA)
                </label>
                <input
                  type="text"
                  value={correctiveAction}
                  onChange={(e) => setCorrectiveAction(e.target.value)}
                  placeholder="e.g. Replaced switch fan assembly and updated power thresholds"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-black dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-900 dark:text-slate-300 mb-1">
                  Resolution Summary <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={4}
                  value={resolutionSummary}
                  onChange={(e) => setResolutionSummary(e.target.value)}
                  placeholder="Describe the actions taken to fix the issue and confirm operational readiness..."
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-black dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden resize-none"
                  required
                />
              </div>
            </div>
          )}

          {/* 3. CLOSED */}
          {targetNorm === 'CLOSED' && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-900 dark:text-slate-300 mb-1">
                  Client Satisfaction Rating (CSAT)
                </label>
                <div className="flex items-center gap-2 p-3 bg-white dark:bg-slate-950 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-700">
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setClientRating(star)}
                        className="p-1 text-amber-400 hover:scale-125 transition-transform"
                      >
                        <Star className={`w-6 h-6 ${star <= clientRating ? 'fill-amber-400 text-amber-400' : 'text-slate-300 dark:text-slate-600'}`} />
                      </button>
                    ))}
                  </div>
                  <span className="text-xs font-bold text-slate-900 dark:text-slate-300 ml-2">
                    {clientRating === 5 && '⭐⭐⭐⭐⭐ 5/5 - Excellent'}
                    {clientRating === 4 && '⭐⭐⭐⭐ 4/5 - Very Good'}
                    {clientRating === 3 && '⭐⭐⭐ 3/5 - Satisfactory'}
                    {clientRating === 2 && '⭐⭐ 2/5 - Needs Improvement'}
                    {clientRating === 1 && '⭐ 1/5 - Unsatisfactory'}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-900 dark:text-slate-300 mb-1">
                  Closure Notes & Client Feedback
                </label>
                <textarea
                  rows={3}
                  value={clientFeedbackNotes}
                  onChange={(e) => setClientFeedbackNotes(e.target.value)}
                  placeholder="Optional customer feedback or formal sign-off notes..."
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-black dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden resize-none"
                />
              </div>
            </div>
          )}

          {/* 4. REOPENED */}
          {targetNorm === 'REOPENED' && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-900 dark:text-slate-300 mb-1">
                  Reopening Justification <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="State why this ticket is being reopened (e.g. Issue recurred, client reported unresolved sub-component)..."
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-black dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden resize-none"
                  required
                />
              </div>
            </div>
          )}

          {/* 5. CANCELLED */}
          {targetNorm === 'CANCELLED' && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-900 dark:text-slate-300 mb-1">
                  Cancellation Reason <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Reason for ticket cancellation (e.g. Duplicate of TKT-2026-0042, Client withdrew request)..."
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-black dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden resize-none"
                  required
                />
              </div>
            </div>
          )}

          {/* 6. GENERAL (ASSIGNED, IN PROGRESS) */}
          {(targetNorm === 'IN_PROGRESS' || targetNorm === 'ASSIGNED') && (
            <div>
              <label className="block text-xs font-semibold text-slate-900 dark:text-slate-300 mb-1">
                Progress Notes (Optional)
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add optional notes for this status update..."
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-black dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden resize-none"
              />
            </div>
          )}

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-900 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition disabled:opacity-50 flex items-center gap-2"
            >
              {loading && <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              <span>Confirm Transition to {targetDefinition.name}</span>
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};
