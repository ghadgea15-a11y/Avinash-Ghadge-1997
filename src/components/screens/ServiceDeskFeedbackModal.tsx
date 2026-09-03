import React, { useState } from 'react';
import { useBackNavigation } from '../../hooks/useBackNavigation';
import { 
  X, 
  Star, 
  Send, 
  AlertCircle, 
  CheckCircle2, 
  Phone, 
  Mail, 
  MessageSquare, 
  ShieldAlert, 
  ThumbsUp, 
  ThumbsDown,
  Sparkles,
  Clock,
  Wrench,
  UserCheck,
  Award
} from 'lucide-react';
import { 
  ServiceTicketRecord, 
  UserSession, 
  SubmitClientFeedbackPayload, 
  TicketFeedbackRatingBreakdown,
  FeedbackSentiment 
} from '../../types';
import { ServiceDeskService } from '../../services/serviceDeskService';
import { OfflineSyncService } from '../../services/offlineSyncService';

interface ServiceDeskFeedbackModalProps {
  isOpen: boolean;
  ticket: ServiceTicketRecord;
  companyId: string;
  userSession: UserSession;
  onClose: () => void;
  onFeedbackSubmitted: (updatedTicket: ServiceTicketRecord) => void;
}

const COMMON_TAGS_POSITIVE = [
  'Fast Resolution',
  'Polite Technician',
  'Clear Communication',
  'High Quality Work',
  'First-Time Fix',
  'Professional Behavior'
];

const COMMON_TAGS_NEGATIVE = [
  'Delayed Response',
  'Incomplete Fix',
  'Recurring Fault',
  'Poor Communication',
  'Technician Late',
  'Dissatisfied'
];

export const ServiceDeskFeedbackModal: React.FC<ServiceDeskFeedbackModalProps> = ({
  isOpen,
  ticket,
  companyId,
  userSession,
  onClose,
  onFeedbackSubmitted
}) => {
  const [overallRating, setOverallRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  
  // Detailed criteria ratings
  const [timelinessScore, setTimelinessScore] = useState<number>(5);
  const [technicianScore, setTechnicianScore] = useState<number>(5);
  const [communicationScore, setCommunicationScore] = useState<number>(5);
  const [qualityScore, setQualityScore] = useState<number>(5);
  const [showDetailedBreakdown, setShowDetailedBreakdown] = useState<boolean>(false);
  useBackNavigation(!!showDetailedBreakdown, () => setShowDetailedBreakdown(null as any), 'showDetailedBreakdown');

  const [comment, setComment] = useState<string>('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  useBackNavigation(!!selectedTags, () => setSelectedTags(null as any), 'selectedTags');
  
  // Follow-up
  const [followUpRequested, setFollowUpRequested] = useState<boolean>(false);
  const [followUpNotes, setFollowUpNotes] = useState<string>('');
  const [contactPreferred, setContactPreferred] = useState<'PHONE' | 'EMAIL'>('PHONE');
  const [contactName, setContactName] = useState<string>(userSession.fullName || userSession.email || '');
  const [contactEmail, setContactEmail] = useState<string>(userSession.email || ticket.reportedByEmail || '');
  const [contactPhone, setContactPhone] = useState<string>(ticket.reportedByPhone || '');

  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string>('');

  if (!isOpen) return null;

  const currentEffectiveRating = hoverRating || overallRating;
  const isNegative = currentEffectiveRating <= 2;

  const getRatingLabel = (score: number) => {
    switch (score) {
      case 5: return 'Excellent — Completely Satisfied';
      case 4: return 'Good — Met Expectations';
      case 3: return 'Average — Acceptable Resolution';
      case 2: return 'Poor — Below Expectations';
      case 1: return 'Very Poor — Highly Dissatisfied';
      default: return '';
    }
  };

  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter(t => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (overallRating <= 2 && comment.trim().length < 5) {
      setErrorMsg('Please share a brief explanation (at least 5 characters) so our operations management team can review and rectify the issue.');
      return;
    }

    setSubmitting(true);

    const breakdown: TicketFeedbackRatingBreakdown = {
      overallRating,
      ...(showDetailedBreakdown ? {
        timelinessScore,
        technicianCompetenceScore: technicianScore,
        communicationScore,
        resolutionQualityScore: qualityScore
      } : {})
    };

    const payload: SubmitClientFeedbackPayload = {
      rating: overallRating,
      comment: comment.trim(),
      ratingBreakdown: breakdown,
      feedbackTags: selectedTags,
      followUpRequested,
      followUpNotes: followUpRequested ? followUpNotes.trim() : undefined,
      followUpContactPreferred: followUpRequested ? contactPreferred : undefined,
      contactName: contactName.trim(),
      contactEmail: contactEmail.trim(),
      contactPhone: contactPhone.trim()
    };

    try {
      if (!navigator.onLine) {
        // Queue offline
        OfflineSyncService.queueAction('SERVICE_TICKET_FEEDBACK', {
          feedbackPayload: payload,
          ticketId: ticket.id,
          companyId,
          submittedByUserId: userSession.userId,
          submittedAt: new Date().toISOString()
        });

        setSuccessMsg('Feedback saved offline. It will synchronize automatically when your connection is restored.');
        setTimeout(() => {
          onClose();
        }, 1500);
        return;
      }

      const res = await ServiceDeskService.submitClientFeedback(
        userSession,
        companyId,
        ticket.id,
        payload
      );

      if (!res.success) {
        setErrorMsg(res.error || 'Failed to submit feedback.');
        setSubmitting(false);
        return;
      }

      setSuccessMsg('Thank you! Your feedback has been recorded successfully.');
      const updatedTicket: ServiceTicketRecord = {
        ...ticket,
        clientRating: overallRating,
        clientFeedbackNotes: comment.trim(),
        feedbackStatus: 'SUBMITTED',
        hasNegativeFeedback: isNegative,
        activeFeedbackId: res.feedback?.id,
        feedbackSubmittedAt: new Date().toISOString(),
        feedbackEscalationStatus: isNegative ? 'ESCALATED' : 'NONE'
      };

      setTimeout(() => {
        onFeedbackSubmitted(updatedTicket);
        onClose();
      }, 1200);
    } catch (err: any) {
      console.error('[ServiceDeskFeedbackModal] Submission error:', err);
      setErrorMsg(err.message || 'An unexpected error occurred.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-fade-in">
      <div className="bg-white dark:bg-slate-900 dark:bg-slate-850 rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-750 max-h-[90vh] flex flex-col justify-between my-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className={`p-2.5 rounded-xl ${isNegative ? 'bg-rose-100 dark:bg-rose-950/80 text-rose-600' : 'bg-amber-100 dark:bg-amber-950/80 text-amber-600'}`}>
              <Star className="w-5 h-5 fill-current" />
            </div>
            <div>
              <h3 className="font-bold text-base text-black dark:text-slate-200 dark:text-slate-100">
                Service Satisfaction Feedback
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Ticket: <strong className="text-slate-900 dark:text-slate-300">{ticket.ticketNumber}</strong> — {ticket.title}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:text-slate-400 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <form onSubmit={handleSubmit} className="py-4 space-y-4 overflow-y-auto pr-1">
          
          {errorMsg && (
            <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl text-xs text-red-700 dark:text-red-300 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs text-emerald-700 dark:text-emerald-300 flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Primary Overall Star Rating */}
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/50 dark:bg-slate-900/40 text-center space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              How would you rate the overall resolution of this issue? *
            </label>
            <div className="flex items-center justify-center gap-2 py-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setOverallRating(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  className="p-1 rounded-lg transition-transform hover:scale-125 focus:outline-none"
                  title={`${star} Star${star > 1 ? 's' : ''}`}
                >
                  <Star
                    className={`w-8 h-8 ${
                      star <= (hoverRating || overallRating)
                        ? 'text-amber-400 fill-amber-400 drop-shadow-xs'
                        : 'text-slate-300 dark:text-slate-650'
                    } transition-colors`}
                  />
                </button>
              ))}
            </div>
            <div className="text-xs font-semibold text-slate-900 dark:text-slate-300 dark:text-slate-200">
              {getRatingLabel(currentEffectiveRating)}
            </div>
          </div>

          {/* Negative Feedback Warning Badge */}
          {isNegative && (
            <div className="p-3 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/60 dark:bg-rose-950/30 flex items-start gap-2.5 text-xs text-rose-800 dark:text-rose-200">
              <ShieldAlert className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
              <div>
                <strong className="block font-bold">Negative Feedback Escalation Active</strong>
                <p className="text-xs text-rose-700 dark:text-rose-300 mt-0.5">
                  Your rating will automatically notify Service Desk leadership and trigger an immediate operational quality review.
                </p>
              </div>
            </div>
          )}

          {/* Detailed Criteria Toggle */}
          <div>
            <button
              type="button"
              onClick={() => setShowDetailedBreakdown(!showDetailedBreakdown)}
              className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{showDetailedBreakdown ? 'Hide Detailed Rating Criteria' : 'Rate Specific Quality Metrics (Optional)'}</span>
            </button>

            {showDetailedBreakdown && (
              <div className="mt-3 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3 text-xs">
                {/* Timeliness */}
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-slate-900 dark:text-slate-300 font-medium">
                    <Clock className="w-3.5 h-3.5 text-blue-500" /> Response & Resolution Speed
                  </span>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map(s => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setTimelinessScore(s)}
                        className={`w-6 h-6 rounded-md text-xs font-bold ${
                          timelinessScore >= s ? 'bg-amber-400 text-black' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Technician Competence */}
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-slate-900 dark:text-slate-300 font-medium">
                    <Wrench className="w-3.5 h-3.5 text-amber-500" /> Technician Competence & Knowledge
                  </span>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map(s => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setTechnicianScore(s)}
                        className={`w-6 h-6 rounded-md text-xs font-bold ${
                          technicianScore >= s ? 'bg-amber-400 text-black' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Communication */}
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-slate-900 dark:text-slate-300 font-medium">
                    <UserCheck className="w-3.5 h-3.5 text-emerald-500" /> Professionalism & Communication
                  </span>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map(s => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setCommunicationScore(s)}
                        className={`w-6 h-6 rounded-md text-xs font-bold ${
                          communicationScore >= s ? 'bg-amber-400 text-black' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Resolution Quality */}
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-slate-900 dark:text-slate-300 font-medium">
                    <Award className="w-3.5 h-3.5 text-purple-500" /> Quality & Permanence of Fix
                  </span>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map(s => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setQualityScore(s)}
                        className={`w-6 h-6 rounded-md text-xs font-bold ${
                          qualityScore >= s ? 'bg-amber-400 text-black' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Quick Feedback Tags */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 dark:text-slate-300">
              Quick Feedback Highlights
            </label>
            <div className="flex flex-wrap gap-1.5">
              {(isNegative ? COMMON_TAGS_NEGATIVE : COMMON_TAGS_POSITIVE).map((tag) => {
                const isSelected = selectedTags.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleTag(tag)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition ${
                      isSelected
                        ? isNegative
                          ? 'bg-rose-600 text-white shadow-xs'
                          : 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    {tag}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Detailed Comments */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-900 dark:text-slate-300">
              Feedback Notes & Comments {isNegative ? '*' : '(Optional)'}
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder={isNegative ? "Please explain what went wrong or what requires follow-up..." : "Add any comments or suggestions for the service team..."}
              rows={3}
              className="w-full text-xs p-3 rounded-xl border border-slate-200 dark:border-slate-750 bg-white dark:bg-slate-900 text-black dark:text-slate-200 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          {/* Request Follow-Up Checkbox */}
          <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/50 dark:bg-slate-900/30 space-y-2.5">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={followUpRequested}
                onChange={(e) => setFollowUpRequested(e.target.checked)}
                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
              />
              <span className="text-xs font-bold text-slate-900 dark:text-slate-300">
                I would like a service desk manager to contact me regarding this ticket
              </span>
            </label>

            {followUpRequested && (
              <div className="pl-6 space-y-2.5 pt-1 text-xs">
                <div className="flex items-center gap-3">
                  <span className="text-slate-500 dark:text-slate-400 font-medium">Preferred Channel:</span>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="prefChannel"
                      checked={contactPreferred === 'PHONE'}
                      onChange={() => setContactPreferred('PHONE')}
                      className="text-indigo-600"
                    />
                    <Phone className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                    <span>Phone Call</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="prefChannel"
                      checked={contactPreferred === 'EMAIL'}
                      onChange={() => setContactPreferred('EMAIL')}
                      className="text-indigo-600"
                    />
                    <Mail className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                    <span>Email</span>
                  </label>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <span className="text-xs text-slate-500 dark:text-slate-400 block mb-0.5">Contact Name</span>
                    <input
                      type="text"
                      value={contactName}
                      onChange={(e) => setContactName(e.target.value)}
                      className="w-full text-xs p-2 rounded-lg border border-slate-200 dark:border-slate-750 bg-white dark:bg-slate-900"
                    />
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 dark:text-slate-400 block mb-0.5">Contact Phone/Email</span>
                    <input
                      type="text"
                      value={contactPreferred === 'PHONE' ? contactPhone : contactEmail}
                      onChange={(e) => contactPreferred === 'PHONE' ? setContactPhone(e.target.value) : setContactEmail(e.target.value)}
                      className="w-full text-xs p-2 rounded-lg border border-slate-200 dark:border-slate-750 bg-white dark:bg-slate-900"
                    />
                  </div>
                </div>

                <div>
                  <span className="text-xs text-slate-500 dark:text-slate-400 block mb-0.5">Follow-Up Note / Best Time to Call</span>
                  <input
                    type="text"
                    value={followUpNotes}
                    onChange={(e) => setFollowUpNotes(e.target.value)}
                    placeholder="e.g., Morning 10am-12pm or please call mobile"
                    className="w-full text-xs p-2 rounded-lg border border-slate-200 dark:border-slate-750 bg-white dark:bg-slate-900"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className={`px-5 py-2 rounded-xl text-xs font-bold text-white shadow-md transition-all flex items-center gap-1.5 ${
                isNegative 
                  ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/20' 
                  : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/20'
              } disabled:opacity-50`}
            >
              {submitting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Submitting...</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>Submit Feedback</span>
                </>
              )}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
