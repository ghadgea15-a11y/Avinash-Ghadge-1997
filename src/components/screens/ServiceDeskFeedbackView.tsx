import React, { useState, useEffect } from 'react';
import { 
  Star, 
  MessageSquare, 
  ShieldAlert, 
  CheckCircle2, 
  Clock, 
  Wrench, 
  UserCheck, 
  Award, 
  ThumbsUp, 
  ThumbsDown, 
  Send, 
  Phone, 
  Mail, 
  User, 
  Calendar, 
  FileCheck2, 
  AlertCircle,
  Sparkles,
  ChevronDown,
  ChevronUp,
  History,
  RotateCcw,
  Check
} from 'lucide-react';
import { 
  ServiceTicketRecord, 
  UserSession, 
  TicketFeedbackRecord, 
  TicketFeedbackEligibilityResult,
  ReviewClientFeedbackPayload
} from '../../types';
import { ServiceDeskService } from '../../services/serviceDeskService';

interface ServiceDeskFeedbackViewProps {
  ticket: ServiceTicketRecord;
  companyId: string;
  userSession: UserSession;
  onOpenFeedbackModal: () => void;
  onTicketUpdated: (updatedTicket: ServiceTicketRecord) => void;
}

export const ServiceDeskFeedbackView: React.FC<ServiceDeskFeedbackViewProps> = ({
  ticket,
  companyId,
  userSession,
  onOpenFeedbackModal,
  onTicketUpdated
}) => {
  const [feedbackList, setFeedbackList] = useState<TicketFeedbackRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [eligibility, setEligibility] = useState<TicketFeedbackEligibilityResult | null>(null);

  // Review / Escalation management state
  const [isReviewing, setIsReviewing] = useState<boolean>(false);
  const [selectedFeedbackToReview, setSelectedFeedbackToReview] = useState<TicketFeedbackRecord | null>(null);
  const [reviewNotes, setReviewNotes] = useState<string>('');
  const [actionTaken, setActionTaken] = useState<string>('');
  const [closeEscalation, setCloseEscalation] = useState<boolean>(true);
  const [submittingReview, setSubmittingReview] = useState<boolean>(false);
  const [requestingFeedback, setRequestingFeedback] = useState<boolean>(false);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string>('');
  const [actionErrorMsg, setActionErrorMsg] = useState<string>('');

  const isStaff = ServiceDeskService.isStaffRole(userSession.role);
  const isManager = ['SUPER_ADMIN', 'COMPANY_ADMIN', 'ADMIN', 'OPS_MANAGER', 'MANAGER', 'DIRECTOR_CEO'].includes(userSession.role);

  useEffect(() => {
    // Check eligibility
    ServiceDeskService.checkFeedbackEligibility(userSession, companyId, ticket)
      .then(res => setEligibility(res))
      .catch(err => console.warn('Eligibility check err:', err));

    // Subscribe to ticket feedback
    const unsub = ServiceDeskService.subscribeToTicketFeedback(companyId, ticket.id, (records) => {
      setFeedbackList(records);
      setLoading(false);
    });

    return () => unsub();
  }, [companyId, ticket.id, ticket.status, ticket.feedbackStatus]);

  const latestFeedback = feedbackList.length > 0 ? feedbackList[0] : null;

  const handleRequestFeedback = async () => {
    setActionErrorMsg('');
    setActionSuccessMsg('');
    setRequestingFeedback(true);

    try {
      const res = await ServiceDeskService.requestClientFeedback(userSession, companyId, ticket.id);
      if (res.success) {
        setActionSuccessMsg('Feedback survey request sent to client.');
        onTicketUpdated({
          ...ticket,
          feedbackStatus: 'REQUESTED',
          feedbackRequestedAt: new Date().toISOString()
        });
      } else {
        setActionErrorMsg(res.error || 'Failed to send feedback request.');
      }
    } catch (e: any) {
      setActionErrorMsg(e.message || 'Error requesting feedback.');
    } finally {
      setRequestingFeedback(false);
    }
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFeedbackToReview) return;
    if (!reviewNotes.trim()) {
      setActionErrorMsg('Review notes are required.');
      return;
    }

    setSubmittingReview(true);
    setActionErrorMsg('');
    setActionSuccessMsg('');

    try {
      const payload: ReviewClientFeedbackPayload = {
        reviewNotes: reviewNotes.trim(),
        actionTaken: actionTaken.trim(),
        closeEscalation,
        newStatus: closeEscalation ? 'CLOSED' : 'REVIEWED'
      };

      const res = await ServiceDeskService.reviewClientFeedback(
        userSession,
        companyId,
        ticket.id,
        selectedFeedbackToReview.id,
        payload
      );

      if (res.success) {
        setActionSuccessMsg('Client feedback review saved and escalation updated.');
        setIsReviewing(false);
        setReviewNotes('');
        setActionTaken('');
        onTicketUpdated({
          ...ticket,
          feedbackStatus: closeEscalation ? 'CLOSED' : 'REVIEWED',
          feedbackReviewNotes: reviewNotes.trim(),
          feedbackEscalationStatus: closeEscalation ? 'CLOSED' : 'REVIEWED'
        });
      } else {
        setActionErrorMsg(res.error || 'Failed to submit review.');
      }
    } catch (err: any) {
      setActionErrorMsg(err.message || 'Error reviewing feedback.');
    } finally {
      setSubmittingReview(false);
    }
  };

  return (
    <div className="space-y-4 pt-1">
      
      {/* Alert / Notification Feedback Messages */}
      {actionSuccessMsg && (
        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs text-emerald-700 dark:text-emerald-300 flex items-start gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{actionSuccessMsg}</span>
        </div>
      )}

      {actionErrorMsg && (
        <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl text-xs text-red-700 dark:text-red-300 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{actionErrorMsg}</span>
        </div>
      )}

      {/* Header Banner with Actions */}
      <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className={`p-2.5 rounded-xl ${
            latestFeedback?.isNegativeFeedback
              ? 'bg-rose-100 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400'
              : latestFeedback
                ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-600 dark:text-amber-400'
                : 'bg-indigo-100 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400'
          }`}>
            <Star className="w-5 h-5 fill-current" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-bold text-sm text-slate-800 dark:text-slate-100">
                Client Satisfaction (CSAT) & Quality Rating
              </h4>
              {ticket.feedbackStatus && (
                <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full uppercase tracking-wider ${
                  ticket.feedbackStatus === 'SUBMITTED' 
                    ? 'bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300'
                    : ticket.feedbackStatus === 'REVIEWED'
                      ? 'bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300'
                      : ticket.feedbackStatus === 'CLOSED'
                        ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300'
                        : ticket.feedbackStatus === 'REQUESTED'
                          ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                }`}>
                  {ticket.feedbackStatus}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Direct quality scoring and service verification from authorized client contacts.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Client can submit feedback if eligible */}
          {eligibility?.canSubmitFeedback && (!latestFeedback || isStaff) && (
            <button
              type="button"
              onClick={onOpenFeedbackModal}
              className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center gap-1.5"
            >
              <Star className="w-3.5 h-3.5 fill-current" />
              <span>{latestFeedback ? 'Update Feedback' : 'Submit Feedback'}</span>
            </button>
          )}

          {/* Staff can request feedback if ticket is resolved/closed */}
          {isStaff && (ticket.status === 'RESOLVED' || ticket.status === 'CLOSED') && !latestFeedback && (
            <button
              type="button"
              onClick={handleRequestFeedback}
              disabled={requestingFeedback}
              className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold transition flex items-center gap-1.5"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{requestingFeedback ? 'Sending...' : 'Request Feedback'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="p-8 text-center text-slate-400 dark:text-slate-500 text-xs">
          <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          Loading client satisfaction records...
        </div>
      )}

      {/* No feedback yet */}
      {!loading && !latestFeedback && (
        <div className="p-8 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-50/50 dark:bg-slate-900/20 space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-500 flex items-center justify-center mx-auto">
            <Star className="w-6 h-6" />
          </div>
          <div className="max-w-md mx-auto">
            <h5 className="font-bold text-sm text-slate-700 dark:text-slate-200">
              No Client Feedback Submitted Yet
            </h5>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {ticket.status === 'RESOLVED' || ticket.status === 'CLOSED'
                ? 'The ticket is completed and eligible for client satisfaction scoring. Authorized client representatives can share their rating and comments.'
                : `Feedback is enabled once this ticket is resolved (current status: ${ticket.status}).`}
            </p>
          </div>
          {eligibility?.canSubmitFeedback && (
            <button
              type="button"
              onClick={onOpenFeedbackModal}
              className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md transition"
            >
              <Star className="w-3.5 h-3.5 fill-current" />
              <span>Provide Client Feedback</span>
            </button>
          )}
        </div>
      )}

      {/* Latest Feedback Scorecard */}
      {!loading && latestFeedback && (
        <div className="space-y-4">
          
          {/* Negative Feedback Alert / Escalation Box */}
          {latestFeedback.isNegativeFeedback && (
            <div className="p-4 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/50 dark:bg-rose-950/20 space-y-2.5">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2.5">
                  <ShieldAlert className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                  <div>
                    <h5 className="font-bold text-xs text-rose-950 dark:text-rose-200 flex items-center gap-1.5">
                      <span>Dissatisfaction / Quality Escalation</span>
                      <span className={`px-2 py-0.5 text-[10px] rounded-full uppercase ${
                        latestFeedback.escalationStatus === 'RESOLVED'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : 'bg-rose-200 text-rose-900 dark:bg-rose-900 dark:text-rose-200'
                      }`}>
                        {latestFeedback.escalationStatus || 'OPEN'}
                      </span>
                    </h5>
                    <p className="text-[11px] text-rose-700 dark:text-rose-300 mt-0.5">
                      Client gave a {latestFeedback.rating}★ rating. Automated escalation was registered for Service Operations Management.
                    </p>
                  </div>
                </div>

                {/* Manager Review Action */}
                {isManager && latestFeedback.escalationStatus !== 'RESOLVED' && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedFeedbackToReview(latestFeedback);
                      setIsReviewing(true);
                      setReviewNotes(latestFeedback.reviewNotes || '');
                      setActionTaken(latestFeedback.actionTaken || '');
                    }}
                    className="shrink-0 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Review & Take Action</span>
                  </button>
                )}
              </div>

              {/* Existing Action Taken Display */}
              {latestFeedback.reviewNotes && (
                <div className="p-3 bg-white/80 dark:bg-slate-900/80 rounded-lg border border-rose-100 dark:border-rose-900/40 text-xs space-y-1 text-slate-700 dark:text-slate-300">
                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <span className="font-bold text-slate-700 dark:text-slate-300">Manager Review Notes:</span>
                    <span>Reviewed by {latestFeedback.reviewedByName} on {latestFeedback.reviewedAt ? new Date(latestFeedback.reviewedAt).toLocaleDateString() : ''}</span>
                  </div>
                  <p>{latestFeedback.reviewNotes}</p>
                  {latestFeedback.actionTaken && (
                    <div className="pt-1 text-[11px] text-emerald-700 dark:text-emerald-400 font-medium">
                      <strong>Corrective Action:</strong> {latestFeedback.actionTaken}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Primary Scorecard Grid */}
          <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 space-y-4">
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
              {/* Star Score */}
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star
                      key={s}
                      className={`w-6 h-6 ${
                        s <= latestFeedback.rating
                          ? 'text-amber-400 fill-amber-400 drop-shadow-xs'
                          : 'text-slate-200 dark:text-slate-750'
                      }`}
                    />
                  ))}
                </div>
                <div>
                  <span className="text-xl font-black text-slate-800 dark:text-slate-100">
                    {latestFeedback.rating.toFixed(1)} / 5.0
                  </span>
                  <span className={`ml-2 px-2 py-0.5 rounded-md text-[11px] font-bold ${
                    latestFeedback.rating >= 4 
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                      : latestFeedback.rating === 3
                        ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                        : 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                  }`}>
                    {latestFeedback.rating >= 4 ? 'Satisfied' : latestFeedback.rating === 3 ? 'Neutral' : 'Dissatisfied'}
                  </span>
                </div>
              </div>

              {/* Submitter Info */}
              <div className="text-xs text-slate-500 dark:text-slate-400 space-y-0.5 sm:text-right">
                <div className="font-semibold text-slate-700 dark:text-slate-300 flex items-center sm:justify-end gap-1.5">
                  <User className="w-3.5 h-3.5 text-indigo-500" />
                  <span>{latestFeedback.contactName || latestFeedback.submittedByName}</span>
                </div>
                <div className="text-[11px]">
                  Submitted on {new Date(latestFeedback.submittedAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                </div>
              </div>
            </div>

            {/* Detailed Metrics Breakdown */}
            {latestFeedback.ratingBreakdown && (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 py-1">
                
                {/* Timeliness */}
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-150 dark:border-slate-800">
                  <div className="flex items-center justify-between mb-1 text-xs">
                    <span className="text-slate-500 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-blue-500" /> Speed
                    </span>
                    <span className="font-bold text-slate-700 dark:text-slate-200">
                      {latestFeedback.ratingBreakdown.timelinessScore || latestFeedback.rating}★
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-750 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-blue-500 rounded-full" 
                      style={{ width: `${((latestFeedback.ratingBreakdown.timelinessScore || latestFeedback.rating) / 5) * 100}%` }}
                    />
                  </div>
                </div>

                {/* Technician Competence */}
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-150 dark:border-slate-800">
                  <div className="flex items-center justify-between mb-1 text-xs">
                    <span className="text-slate-500 flex items-center gap-1">
                      <Wrench className="w-3.5 h-3.5 text-amber-500" /> Competence
                    </span>
                    <span className="font-bold text-slate-700 dark:text-slate-200">
                      {latestFeedback.ratingBreakdown.technicianCompetenceScore || latestFeedback.rating}★
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-750 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-amber-500 rounded-full" 
                      style={{ width: `${((latestFeedback.ratingBreakdown.technicianCompetenceScore || latestFeedback.rating) / 5) * 100}%` }}
                    />
                  </div>
                </div>

                {/* Communication */}
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-150 dark:border-slate-800">
                  <div className="flex items-center justify-between mb-1 text-xs">
                    <span className="text-slate-500 flex items-center gap-1">
                      <UserCheck className="w-3.5 h-3.5 text-emerald-500" /> Communication
                    </span>
                    <span className="font-bold text-slate-700 dark:text-slate-200">
                      {latestFeedback.ratingBreakdown.communicationScore || latestFeedback.rating}★
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-750 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-emerald-500 rounded-full" 
                      style={{ width: `${((latestFeedback.ratingBreakdown.communicationScore || latestFeedback.rating) / 5) * 100}%` }}
                    />
                  </div>
                </div>

                {/* Fix Quality */}
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-150 dark:border-slate-800">
                  <div className="flex items-center justify-between mb-1 text-xs">
                    <span className="text-slate-500 flex items-center gap-1">
                      <Award className="w-3.5 h-3.5 text-purple-500" /> Resolution Quality
                    </span>
                    <span className="font-bold text-slate-700 dark:text-slate-200">
                      {latestFeedback.ratingBreakdown.resolutionQualityScore || latestFeedback.rating}★
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-750 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-purple-500 rounded-full" 
                      style={{ width: `${((latestFeedback.ratingBreakdown.resolutionQualityScore || latestFeedback.rating) / 5) * 100}%` }}
                    />
                  </div>
                </div>

              </div>
            )}

            {/* Quick Tags */}
            {latestFeedback.feedbackTags && latestFeedback.feedbackTags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {latestFeedback.feedbackTags.map(tag => (
                  <span
                    key={tag}
                    className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}

            {/* Client Narrative Comments */}
            {latestFeedback.comment && (
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-xs space-y-1">
                <span className="font-bold text-[11px] text-slate-400 uppercase font-mono block">
                  Client Narrative Comments:
                </span>
                <p className="text-slate-700 dark:text-slate-200 leading-relaxed">
                  "{latestFeedback.comment}"
                </p>
              </div>
            )}

            {/* Follow-Up Contact Request Flag */}
            {latestFeedback.followUpRequested && (
              <div className="p-3 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-900/40 text-xs text-indigo-900 dark:text-indigo-200 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-indigo-600" />
                  <span>Client requested a follow-up conversation via <strong>{latestFeedback.followUpContactPreferred || 'PHONE'}</strong>.</span>
                </div>
                {(latestFeedback.contactPhone || latestFeedback.contactEmail) && (
                  <div className="text-[11px] text-indigo-700 dark:text-indigo-300 font-mono">
                    {latestFeedback.contactPhone || latestFeedback.contactEmail}
                  </div>
                )}
              </div>
            )}

          </div>

          {/* Review Modal Form (Manager/Admin action) */}
          {isReviewing && selectedFeedbackToReview && (
            <div className="p-4 rounded-xl border border-indigo-200 dark:border-indigo-900 bg-indigo-50/40 dark:bg-indigo-950/20 space-y-3">
              <div className="flex items-center justify-between">
                <h5 className="font-bold text-xs text-indigo-950 dark:text-indigo-200 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-indigo-600" />
                  <span>Service Management Review & Remediation</span>
                </h5>
                <button
                  type="button"
                  onClick={() => setIsReviewing(false)}
                  className="text-xs text-slate-400 hover:text-slate-600"
                >
                  Cancel
                </button>
              </div>

              <form onSubmit={handleReviewSubmit} className="space-y-2.5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                    Management Review Notes *
                  </label>
                  <textarea
                    value={reviewNotes}
                    onChange={(e) => setReviewNotes(e.target.value)}
                    placeholder="Enter review findings, root cause assessment of dissatisfaction, or client communication summary..."
                    rows={2}
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-200 dark:border-slate-750 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                    Action Taken / Remediation
                  </label>
                  <input
                    type="text"
                    value={actionTaken}
                    onChange={(e) => setActionTaken(e.target.value)}
                    placeholder="e.g., Contacted client, scheduled re-inspection, dispatched senior technician"
                    className="w-full text-xs p-2 rounded-lg border border-slate-200 dark:border-slate-750 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100"
                  />
                </div>

                <div className="flex items-center justify-between pt-1">
                  <label className="flex items-center gap-2 cursor-pointer text-xs">
                    <input
                      type="checkbox"
                      checked={closeEscalation}
                      onChange={(e) => setCloseEscalation(e.target.checked)}
                      className="rounded text-indigo-600"
                    />
                    <span className="text-slate-700 dark:text-slate-300 font-medium">
                      Mark Escalation as Resolved & Closed
                    </span>
                  </label>

                  <button
                    type="submit"
                    disabled={submittingReview}
                    className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-xs transition"
                  >
                    {submittingReview ? 'Saving Review...' : 'Save Review'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Historical Feedback Trail (if multiple cycles exist) */}
          {feedbackList.length > 1 && (
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300">
                <History className="w-4 h-4 text-indigo-500" />
                <span>Historical Feedback Across Resolution Cycles ({feedbackList.length})</span>
              </div>
              <div className="space-y-2 pt-1">
                {feedbackList.slice(1).map((fb) => (
                  <div key={fb.id} className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 text-xs space-y-1">
                    <div className="flex items-center justify-between text-[11px] text-slate-500">
                      <span className="font-bold text-slate-700 dark:text-slate-300">
                        Cycle #{fb.slaCycleNumber || 1} — {fb.rating}★ Rating
                      </span>
                      <span>{new Date(fb.submittedAt).toLocaleDateString()}</span>
                    </div>
                    {fb.comment && <p className="text-slate-600 dark:text-slate-300">"{fb.comment}"</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      )}

    </div>
  );
};
