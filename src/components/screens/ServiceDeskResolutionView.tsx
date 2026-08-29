import React, { useState, useEffect } from 'react';
import { 
  ServiceTicketRecord, 
  ServiceTicketResolutionRecord,
  TicketAttachmentRecord,
  TicketReopenRecord,
  UserSession,
  VerifyResolutionPayload
} from '../../types';
import { ServiceDeskService } from '../../services/serviceDeskService';
import { useTheme } from '../../context/ThemeContext';
import { 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  ShieldCheck, 
  XCircle, 
  RotateCcw, 
  FileText, 
  Paperclip, 
  Lock, 
  Unlock, 
  User, 
  Calendar, 
  Tag, 
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Award,
  AlertTriangle,
  ArrowRight,
  History,
  Layers
} from 'lucide-react';

interface ServiceDeskResolutionViewProps {
  ticket: ServiceTicketRecord;
  companyId: string;
  userSession: UserSession;
  onOpenResolveModal: () => void;
  onOpenReopenModal?: () => void;
  onOpenFeedbackModal?: () => void;
  onTicketUpdated: (updatedTicket: ServiceTicketRecord) => void;
}

export const ServiceDeskResolutionView: React.FC<ServiceDeskResolutionViewProps> = ({
  ticket,
  companyId,
  userSession,
  onOpenResolveModal,
  onOpenReopenModal,
  onOpenFeedbackModal,
  onTicketUpdated
}) => {
  const { isDark } = useTheme();

  const [resolutions, setResolutions] = useState<ServiceTicketResolutionRecord[]>([]);
  const [reopenRecords, setReopenRecords] = useState<TicketReopenRecord[]>([]);
  const [evidenceAttachments, setEvidenceAttachments] = useState<TicketAttachmentRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Verification action states
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [verificationNotes, setVerificationNotes] = useState<string>('');
  const [showRejectModal, setShowRejectModal] = useState<boolean>(false);
  const [rejectionReason, setRejectionReason] = useState<string>('');
  const [reworkNotes, setReworkNotes] = useState<string>('');
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [actionError, setActionError] = useState<string>('');
  const [showHistory, setShowHistory] = useState<boolean>(false);
  const [showReopenHistory, setShowReopenHistory] = useState<boolean>(true);

  const canVerify = ['SUPER_ADMIN', 'COMPANY_ADMIN', 'HR_ADMIN', 'OPS_MANAGER', 'SERVICE_DESK', 'MANAGER', 'SUPERVISOR'].includes(userSession.role);
  const isTechnician = ['TECHNICIAN', 'STAFF', 'SUPERVISOR', 'MANAGER', 'OPS_MANAGER', 'SERVICE_DESK', 'COMPANY_ADMIN', 'SUPER_ADMIN'].includes(userSession.role);

  useEffect(() => {
    setLoading(true);
    const unsubResolutions = ServiceDeskService.subscribeToTicketResolutions(
      companyId,
      ticket.id,
      (list) => {
        setResolutions(list);
        setLoading(false);
      }
    );

    const unsubReopens = ServiceDeskService.subscribeToTicketReopens(
      companyId,
      ticket.id,
      (reopens) => {
        setReopenRecords(reopens);
      }
    );

    loadAttachments();

    return () => {
      unsubResolutions();
      unsubReopens();
    };
  }, [companyId, ticket.id]);

  const loadAttachments = async () => {
    try {
      const atts = await ServiceDeskService.getTicketAttachments(companyId, ticket.id, userSession.role);
      setEvidenceAttachments(atts);
    } catch (e) {
      console.warn('Failed to load attachments for resolution view:', e);
    }
  };

  const activeResolution = resolutions.length > 0 ? resolutions[0] : null;

  const handleApprove = async () => {
    if (!activeResolution) return;
    setActionLoading(true);
    setActionError('');

    try {
      const payload: VerifyResolutionPayload = {
        resolutionId: activeResolution.id,
        verificationResult: 'APPROVED',
        verificationNotes: verificationNotes.trim() || undefined
      };

      const res = await ServiceDeskService.verifyTicketResolution(
        userSession,
        companyId,
        ticket.id,
        payload
      );

      if (!res.success) {
        setActionError(res.error || 'Failed to approve resolution.');
      } else if (res.updatedTicket) {
        onTicketUpdated(res.updatedTicket);
        setIsVerifying(false);
        setVerificationNotes('');
      }
    } catch (err: any) {
      setActionError(err?.message || 'Error during resolution verification.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeResolution) return;
    if (!rejectionReason.trim() || rejectionReason.trim().length < 5) {
      setActionError('Rejection reason must be at least 5 characters explaining rework instructions.');
      return;
    }

    setActionLoading(true);
    setActionError('');

    try {
      const payload: VerifyResolutionPayload = {
        resolutionId: activeResolution.id,
        verificationResult: 'REJECTED',
        rejectionReason: rejectionReason.trim(),
        reworkNotes: reworkNotes.trim() || undefined
      };

      const res = await ServiceDeskService.verifyTicketResolution(
        userSession,
        companyId,
        ticket.id,
        payload
      );

      if (!res.success) {
        setActionError(res.error || 'Failed to reject resolution.');
      } else if (res.updatedTicket) {
        onTicketUpdated(res.updatedTicket);
        setShowRejectModal(false);
        setRejectionReason('');
        setReworkNotes('');
      }
    } catch (err: any) {
      setActionError(err?.message || 'Error during resolution rejection.');
    } finally {
      setActionLoading(false);
    }
  };

  // Helper for rendering linked evidence
  const getLinkedAttachments = (attachmentIds?: string[]) => {
    if (!attachmentIds || attachmentIds.length === 0) return [];
    return evidenceAttachments.filter(a => attachmentIds.includes(a.id));
  };

  return (
    <div className="space-y-4 pt-1">
      
      {/* Action Error Banner */}
      {actionError && (
        <div className="p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 rounded-xl flex items-start gap-2 text-xs text-rose-700 dark:text-rose-300">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{actionError}</span>
        </div>
      )}

      {/* CASE 1: TICKET IS NOT YET RESOLVED */}
      {ticket.status !== 'RESOLVED' && ticket.status !== 'CLOSED' && (
        <div className="p-5 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950/50 dark:bg-slate-800/30 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 mx-auto flex items-center justify-center border border-amber-500/20">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <h4 className="font-bold text-sm text-black dark:text-slate-200">
              Ticket Pending Resolution
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto mt-1">
              This ticket is currently in <strong>{ticket.status}</strong> status. Once remediation is completed, submit the formal resolution including Root Cause Analysis (RCA) and Corrective & Preventive Actions (CAPA).
            </p>
          </div>

          {isTechnician && (
            <div className="pt-2">
              <button
                type="button"
                onClick={onOpenResolveModal}
                className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Submit Resolution & RCA</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* CASE 2: ACTIVE RESOLUTION PRESENT */}
      {activeResolution && (
        <div className="space-y-4">
          
          {/* Main Resolution Card */}
          <div className={`p-5 rounded-2xl border ${
            isDark ? 'bg-slate-800/60 border-slate-700/80' : 'bg-white border-slate-200 shadow-xs'
          } space-y-4`}>
            
            {/* Header & Badges */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-700/60">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-black dark:text-white dark:text-slate-100 flex items-center gap-2">
                    <span>Formal Resolution Details</span>
                    {activeResolution.isSlaMet ? (
                      <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> SLA Met
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" /> SLA Breached
                      </span>
                    )}
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2 mt-0.5">
                    <span>Resolved by <strong>{activeResolution.resolvedByName}</strong> ({activeResolution.resolvedByRole})</span>
                    <span>•</span>
                    <span>{new Date(activeResolution.resolutionTimestamp).toLocaleString()}</span>
                  </p>
                </div>
              </div>

              {/* Verification Status Pill */}
              <div className="shrink-0">
                {activeResolution.verificationStatus === 'VERIFIED' && (
                  <div className="px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs font-bold flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span>Verified & Quality Approved</span>
                  </div>
                )}
                {activeResolution.verificationStatus === 'PENDING_VERIFICATION' && (
                  <div className="px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 text-xs font-bold flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400 animate-pulse" />
                    <span>Pending Quality Verification</span>
                  </div>
                )}
                {activeResolution.verificationStatus === 'REJECTED' && (
                  <div className="px-3 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 text-xs font-bold flex items-center gap-1.5">
                    <XCircle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                    <span>Resolution Rejected / In Rework</span>
                  </div>
                )}
                {activeResolution.verificationStatus === 'NOT_REQUIRED' && (
                  <div className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-xs font-semibold flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                    <span>Standard Resolution</span>
                  </div>
                )}
              </div>
            </div>

            {/* Resolution Content Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Executive Resolution Summary */}
              <div className="p-3.5 rounded-xl bg-white dark:bg-slate-950 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-750 space-y-1.5 md:col-span-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1">
                  <FileText className="w-3.5 h-3.5 text-indigo-500" /> Executive Resolution Summary
                </span>
                <p className="text-xs text-black dark:text-slate-200 whitespace-pre-wrap leading-relaxed">
                  {activeResolution.resolutionSummary}
                </p>
              </div>

              {/* Root Cause Analysis */}
              <div className="p-3.5 rounded-xl bg-white dark:bg-slate-950 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-750 space-y-1.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-500" /> Root Cause Analysis (RCA)
                </span>
                <p className="text-xs text-black dark:text-slate-200 whitespace-pre-wrap leading-relaxed">
                  {activeResolution.rootCause || 'Remediation completed directly.'}
                </p>
              </div>

              {/* Corrective & Preventive Action */}
              <div className="p-3.5 rounded-xl bg-white dark:bg-slate-950 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-750 space-y-1.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" /> Corrective & Preventive Action (CAPA)
                </span>
                <p className="text-xs text-black dark:text-slate-200 whitespace-pre-wrap leading-relaxed">
                  {activeResolution.correctiveAction || 'Service restored to operational baseline.'}
                </p>
              </div>

            </div>

            {/* SLA Metrics Bar */}
            <div className="p-3 rounded-xl bg-white dark:bg-slate-950 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-750 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <span className="text-slate-400 text-[10px] uppercase font-semibold">Category</span>
                <p className="font-bold text-black dark:text-slate-200">{activeResolution.resolutionCategory || ticket.category}</p>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] uppercase font-semibold">Actual Duration</span>
                <p className="font-bold text-black dark:text-slate-200">
                  {activeResolution.actualResolutionDurationMinutes ? `${Math.floor(activeResolution.actualResolutionDurationMinutes / 60)}h ${activeResolution.actualResolutionDurationMinutes % 60}m` : 'N/A'}
                </p>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] uppercase font-semibold">Target SLA Due</span>
                <p className="font-bold text-black dark:text-slate-200">
                  {activeResolution.slaTargetDueTime ? new Date(activeResolution.slaTargetDueTime).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : 'Standard'}
                </p>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] uppercase font-semibold">Client Visible</span>
                <p className="font-bold text-black dark:text-slate-200 flex items-center gap-1">
                  {activeResolution.isClientVisible ? <Unlock className="w-3 h-3 text-emerald-500" /> : <Lock className="w-3 h-3 text-amber-500" />}
                  <span>{activeResolution.isClientVisible ? 'Yes (Published)' : 'Internal Only'}</span>
                </p>
              </div>
            </div>

            {/* Linked Evidence Files */}
            {activeResolution.evidenceAttachmentIds && activeResolution.evidenceAttachmentIds.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-700/60">
                <span className="text-xs font-bold text-slate-900 dark:text-slate-300 flex items-center gap-1.5">
                  <Paperclip className="w-3.5 h-3.5 text-indigo-500" /> Linked Resolution Evidence Attachments ({activeResolution.evidenceAttachmentIds.length})
                </span>
                <div className="flex flex-wrap gap-2">
                  {getLinkedAttachments(activeResolution.evidenceAttachmentIds).map((att) => (
                    <a
                      key={att.id}
                      href={att.downloadUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 border border-indigo-200 dark:border-indigo-800 text-xs font-medium transition"
                    >
                      <Paperclip className="w-3 h-3" />
                      <span>{att.fileName}</span>
                      <ExternalLink className="w-3 h-3 opacity-60" />
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Verification Sign-Off / Rejection Feedback View */}
            {activeResolution.verificationStatus === 'VERIFIED' && activeResolution.verifiedByName && (
              <div className="p-3 bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs space-y-1">
                <div className="flex items-center justify-between font-bold text-emerald-800 dark:text-emerald-300">
                  <span className="flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4" /> Quality Approved by {activeResolution.verifiedByName} ({activeResolution.verifiedByRole})
                  </span>
                  <span className="text-[10px] font-normal text-emerald-600 dark:text-emerald-400">
                    {activeResolution.verifiedAt ? new Date(activeResolution.verifiedAt).toLocaleString() : ''}
                  </span>
                </div>
                {activeResolution.verificationNotes && (
                  <p className="text-emerald-900 dark:text-emerald-200 text-[11px] italic">
                    "{activeResolution.verificationNotes}"
                  </p>
                )}
              </div>
            )}

            {activeResolution.verificationStatus === 'REJECTED' && activeResolution.rejectionReason && (
              <div className="p-3 bg-rose-50/80 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl text-xs space-y-1">
                <div className="flex items-center justify-between font-bold text-rose-800 dark:text-rose-300">
                  <span className="flex items-center gap-1.5">
                    <XCircle className="w-4 h-4" /> Rejection Feedback from {activeResolution.rejectedByName || 'Quality Reviewer'}
                  </span>
                  <span className="text-[10px] font-normal text-rose-600 dark:text-rose-400">
                    {activeResolution.rejectedAt ? new Date(activeResolution.rejectedAt).toLocaleString() : ''}
                  </span>
                </div>
                <p className="text-rose-900 dark:text-rose-200 font-semibold text-[11px]">
                  Reason: {activeResolution.rejectionReason}
                </p>
                {activeResolution.reworkNotes && (
                  <p className="text-rose-800 dark:text-rose-300 text-[11px]">
                    Rework Instructions: {activeResolution.reworkNotes}
                  </p>
                )}
              </div>
            )}

            {/* Quality Verification Actions (For Managers / Admins / Verifiers) */}
            {canVerify && activeResolution.verificationStatus !== 'VERIFIED' && (
              <div className="pt-3 border-t border-slate-200 dark:border-slate-700/60 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  <span className="font-semibold text-slate-900 dark:text-slate-300">Quality Gate:</span> Verify that operational readiness is restored before client sign-off.
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowRejectModal(true)}
                    disabled={actionLoading}
                    className="px-3 py-1.5 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 rounded-xl text-xs font-bold transition flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    <span>Reject & Rework</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsVerifying(true)}
                    disabled={actionLoading}
                    className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Approve & Verify</span>
                  </button>
                </div>
              </div>
            )}

            {/* Inline Approve Confirmation Box */}
            {isVerifying && (
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl space-y-2 text-xs">
                <div className="font-bold text-emerald-800 dark:text-emerald-300">
                  Confirm Quality Verification Approval
                </div>
                <input
                  type="text"
                  placeholder="Optional verification sign-off notes..."
                  value={verificationNotes}
                  onChange={(e) => setVerificationNotes(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-emerald-300 dark:border-emerald-700 bg-white dark:bg-slate-900 text-black dark:text-slate-200 focus:outline-hidden"
                />
                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsVerifying(false)}
                    className="px-3 py-1 text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-md"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleApprove}
                    disabled={actionLoading}
                    className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md font-bold text-xs flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {actionLoading && <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                    <span>Confirm Quality Approval</span>
                  </button>
                </div>
              </div>
            )}

          </div>

          {/* Historical Resolution Cycles (Rework History) */}
          {resolutions.length > 1 && (
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/50 dark:bg-slate-900/30 space-y-2">
              <button
                type="button"
                onClick={() => setShowHistory(!showHistory)}
                className="w-full flex items-center justify-between text-xs font-bold text-slate-900 dark:text-slate-300"
              >
                <div className="flex items-center gap-2">
                  <RotateCcw className="w-4 h-4 text-indigo-500" />
                  <span>Previous Resolution & Rework History ({resolutions.length - 1} prior attempt{resolutions.length > 2 ? 's' : ''})</span>
                </div>
                {showHistory ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>

              {showHistory && (
                <div className="space-y-3 pt-2">
                  {resolutions.slice(1).map((res, idx) => (
                    <div key={res.id} className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 dark:bg-slate-850 text-xs space-y-1.5">
                      <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                        <span className="font-semibold text-slate-900 dark:text-slate-300">
                          Attempt #{resolutions.length - idx - 1} — {res.resolvedByName}
                        </span>
                        <span>{new Date(res.resolutionTimestamp).toLocaleString()}</span>
                      </div>
                      <p className="text-black dark:text-slate-200">{res.resolutionSummary}</p>
                      {res.rejectionReason && (
                        <div className="p-2 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 rounded text-[11px]">
                          <strong>Rejected:</strong> {res.rejectionReason}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Client Feedback & CSAT Status Banner */}
          {(ticket.status === 'RESOLVED' || ticket.status === 'CLOSED') && (
            <div className="p-4 rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/40 dark:bg-amber-950/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-300">
                  <Award className="w-4 h-4" />
                </div>
                <div>
                  <h5 className="font-bold text-xs text-amber-950 dark:text-amber-200 flex items-center gap-2">
                    <span>Client Satisfaction & Quality Feedback</span>
                    {ticket.clientRating ? (
                      <span className={`px-2 py-0.5 text-[10px] rounded-full font-bold ${
                        ticket.hasNegativeFeedback
                          ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                          : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                      }`}>
                        ★ {ticket.clientRating.toFixed(1)} / 5.0
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 text-[10px] rounded-full font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                        {ticket.feedbackStatus === 'REQUESTED' ? 'Feedback Requested' : 'Awaiting Feedback'}
                      </span>
                    )}
                  </h5>
                  <p className="text-[11px] text-amber-800 dark:text-amber-300 mt-0.5">
                    {ticket.clientRating 
                      ? `Client provided a ${ticket.clientRating}★ rating with full criteria breakdown.`
                      : 'Capture customer satisfaction and service delivery feedback for post-resolution auditing.'}
                  </p>
                </div>
              </div>
              {onOpenFeedbackModal && (
                <button
                  type="button"
                  onClick={onOpenFeedbackModal}
                  className="shrink-0 px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center gap-1.5"
                >
                  <Award className="w-3.5 h-3.5" />
                  <span>{ticket.clientRating ? 'View Feedback' : 'Provide Feedback'}</span>
                </button>
              )}
            </div>
          )}

          {/* Reopen Action Banner when Resolved/Closed */}
          {(ticket.status === 'RESOLVED' || ticket.status === 'CLOSED' || ticket.status === 'CANCELLED') && onOpenReopenModal && (
            <div className="p-4 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/40 dark:bg-rose-950/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <RotateCcw className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                <div>
                  <h5 className="font-bold text-xs text-rose-950 dark:text-rose-200">
                    Did the issue recur or require further remediation?
                  </h5>
                  <p className="text-[11px] text-rose-700 dark:text-rose-300 mt-0.5">
                    Authorized users can reopen this ticket to initiate a new SLA cycle, notify assigned technicians, and track regression root causes.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onOpenReopenModal}
                className="shrink-0 px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reopen Ticket</span>
              </button>
            </div>
          )}

          {/* Reopen Lifecycle Records / Subcollection History */}
          {reopenRecords.length > 0 && (
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/50 dark:bg-slate-900/30 space-y-2">
              <button
                type="button"
                onClick={() => setShowReopenHistory(!showReopenHistory)}
                className="w-full flex items-center justify-between text-xs font-bold text-slate-900 dark:text-slate-300"
              >
                <div className="flex items-center gap-2">
                  <History className="w-4 h-4 text-rose-500" />
                  <span>Ticket Reopen Lifecycle Trail ({reopenRecords.length} Reopen Cycle{reopenRecords.length > 1 ? 's' : ''})</span>
                </div>
                {showReopenHistory ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>

              {showReopenHistory && (
                <div className="space-y-2.5 pt-2">
                  {reopenRecords.map((rec) => (
                    <div key={rec.id} className="p-3 rounded-lg border border-rose-200 dark:border-rose-900/40 bg-white dark:bg-slate-900 dark:bg-slate-850 text-xs space-y-1.5">
                      <div className="flex flex-wrap items-center justify-between gap-1 text-[11px] text-slate-500 dark:text-slate-400">
                        <span className="font-bold text-rose-700 dark:text-rose-300 flex items-center gap-1.5">
                          <RotateCcw className="w-3 h-3" /> Cycle #{rec.slaCycleNumber} — {rec.reasonCategory}
                        </span>
                        <span>{new Date(rec.reopenedAt).toLocaleString()}</span>
                      </div>
                      <div className="p-2 bg-white dark:bg-slate-950 dark:bg-slate-900 rounded text-slate-900 dark:text-slate-300">
                        <strong className="block text-[10px] text-slate-400 uppercase font-mono">Justification:</strong>
                        <p>{rec.reason}</p>
                        {rec.notes && (
                          <p className="mt-1 text-slate-500 dark:text-slate-400 text-[11px] italic">Notes: {rec.notes}</p>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-[10px] text-slate-400">
                        <span>Reopened by: <strong className="text-slate-600 dark:text-slate-400 dark:text-slate-300">{rec.reopenedByName}</strong> ({rec.reopenedByRole})</span>
                        {rec.assignedToName && <span>Assigned to: <strong className="text-slate-600 dark:text-slate-400 dark:text-slate-300">{rec.assignedToName}</strong></span>}
                        {rec.newSlaDueTime && <span>New SLA Due: <strong>{new Date(rec.newSlaDueTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</strong></span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className={`w-full max-w-lg rounded-2xl shadow-2xl border p-6 space-y-4 ${
            isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-black'
          }`}>
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400">
                  <XCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm">Reject Resolution & Request Rework</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Reverts ticket to IN PROGRESS status for assigned technician.</p>
                </div>
              </div>
              <button onClick={() => setShowRejectModal(false)} className="text-slate-400 hover:text-slate-600 dark:text-slate-400">
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleReject} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-900 dark:text-slate-300 mb-1">
                  Rejection Reason <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="State why this resolution is unacceptable (e.g., Service not reachable on port 443, Client still experiencing dropped packets)..."
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-black dark:text-slate-200 focus:ring-2 focus:ring-rose-500 focus:outline-hidden resize-none"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-900 dark:text-slate-300 mb-1">
                  Specific Rework Instructions (Optional)
                </label>
                <textarea
                  rows={2}
                  value={reworkNotes}
                  onChange={(e) => setReworkNotes(e.target.value)}
                  placeholder="Actionable steps the technician must perform prior to re-submission..."
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-black dark:text-slate-200 focus:ring-2 focus:ring-rose-500 focus:outline-hidden resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowRejectModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-900 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
                  disabled={actionLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-sm transition flex items-center gap-2"
                >
                  {actionLoading && <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                  <span>Confirm Rejection & Reopen</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
