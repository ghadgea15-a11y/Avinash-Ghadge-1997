import React, { useState } from 'react';
import { 
  ServiceTicketRecord, 
  UserSession, 
  TicketFeedbackRecord 
} from '../../types';
import { useTheme } from '../../context/ThemeContext';
import { 
  Star, 
  MessageSquare, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  UserCheck, 
  Send, 
  ThumbsUp, 
  Award,
  Calendar
} from 'lucide-react';
import { doc, updateDoc, setDoc } from 'firebase/firestore';
import { db } from '../../firebase';

interface ServiceDeskFeedbackViewProps {
  ticket: ServiceTicketRecord | null;
  companyId: string;
  userSession: UserSession;
  onOpenFeedbackModal?: () => void;
  onTicketUpdated?: (updatedTicket: ServiceTicketRecord) => void;
}

export const ServiceDeskFeedbackView: React.FC<ServiceDeskFeedbackViewProps> = ({
  ticket,
  companyId,
  userSession,
  onOpenFeedbackModal,
  onTicketUpdated
}) => {
  const { isDark } = useTheme();

  // Internal form state for submitting feedback if none exists
  const [rating, setRating] = useState<number>(ticket?.feedback?.rating || 5);
  const [comments, setComments] = useState<string>(ticket?.feedback?.comments || '');
  const [helpfulnessRating, setHelpfulnessRating] = useState<number>(5);
  const [timelinessRating, setTimelinessRating] = useState<number>(5);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'SUCCESS' | 'ERROR'; text: string } | null>(null);

  if (!ticket) {
    return (
      <div className="p-8 text-center text-slate-400">
        No service desk ticket selected for feedback.
      </div>
    );
  }

  const existingFeedback = ticket.feedback;

  const handleSubmitFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyId || !ticket.id) return;

    setSubmitting(true);
    try {
      const feedbackPayload: TicketFeedbackRecord = {
        rating,
        helpfulnessRating,
        timelinessRating,
        comments,
        submittedAt: new Date().toISOString(),
        submittedBy: userSession.fullName || userSession.email || 'User',
        submittedByUid: userSession.uid
      };

      const ticketRef = doc(db, 'companies', companyId, 'serviceTickets', ticket.id);
      await updateDoc(ticketRef, {
        feedback: feedbackPayload,
        feedbackStatus: 'SUBMITTED',
        updatedAt: new Date().toISOString()
      });

      const updatedTicket = {
        ...ticket,
        feedback: feedbackPayload,
        feedbackStatus: 'SUBMITTED'
      };

      if (onTicketUpdated) {
        onTicketUpdated(updatedTicket);
      }

      setStatusMessage({ type: 'SUCCESS', text: 'Thank you! Your CSAT feedback has been submitted successfully.' });
      setTimeout(() => setStatusMessage(null), 4000);
    } catch (err: any) {
      setStatusMessage({ type: 'ERROR', text: err.message || 'Failed to submit feedback.' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4 pt-1">
      {statusMessage && (
        <div className={`p-3 rounded-xl flex items-center gap-2 text-sm font-medium ${
          statusMessage.type === 'SUCCESS' 
            ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' 
            : 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
        }`}>
          {statusMessage.type === 'SUCCESS' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {statusMessage.text}
        </div>
      )}

      {existingFeedback ? (
        /* Existing Feedback Display */
        <div className={`p-5 rounded-2xl border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'} space-y-4 shadow-sm`}>
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <Award className="w-5 h-5 text-amber-500" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Customer Satisfaction (CSAT) Survey</h3>
            </div>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
              Feedback Recorded
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-center">
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
              <span className="text-[10px] uppercase font-bold text-slate-400">Overall Rating</span>
              <div className="flex items-center justify-center gap-1 mt-1 text-amber-400">
                {[1, 2, 3, 4, 5].map(s => (
                  <Star key={s} className={`w-4 h-4 ${s <= (existingFeedback.rating || 5) ? 'fill-amber-400' : 'text-slate-300 dark:text-slate-700'}`} />
                ))}
              </div>
              <span className="text-xs font-bold text-slate-700 dark:text-slate-200 mt-1 inline-block">
                {existingFeedback.rating || 5} / 5 Stars
              </span>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
              <span className="text-[10px] uppercase font-bold text-slate-400">Resolution Timeliness</span>
              <div className="flex items-center justify-center gap-1 mt-1 text-indigo-400">
                {[1, 2, 3, 4, 5].map(s => (
                  <Star key={s} className={`w-4 h-4 ${s <= (existingFeedback.timelinessRating || existingFeedback.rating || 5) ? 'fill-indigo-400' : 'text-slate-300 dark:text-slate-700'}`} />
                ))}
              </div>
              <span className="text-xs font-bold text-slate-700 dark:text-slate-200 mt-1 inline-block">
                {existingFeedback.timelinessRating || existingFeedback.rating || 5} / 5
              </span>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
              <span className="text-[10px] uppercase font-bold text-slate-400">Agent Helpfulness</span>
              <div className="flex items-center justify-center gap-1 mt-1 text-emerald-400">
                {[1, 2, 3, 4, 5].map(s => (
                  <Star key={s} className={`w-4 h-4 ${s <= (existingFeedback.helpfulnessRating || existingFeedback.rating || 5) ? 'fill-emerald-400' : 'text-slate-300 dark:text-slate-700'}`} />
                ))}
              </div>
              <span className="text-xs font-bold text-slate-700 dark:text-slate-200 mt-1 inline-block">
                {existingFeedback.helpfulnessRating || existingFeedback.rating || 5} / 5
              </span>
            </div>
          </div>

          {existingFeedback.comments && (
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 text-xs">
              <span className="font-bold text-slate-500 uppercase text-[10px] block mb-1">Feedback Comments</span>
              <p className="text-slate-800 dark:text-slate-200 italic">"{existingFeedback.comments}"</p>
            </div>
          )}

          <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
            <span>Submitted by: <strong>{existingFeedback.submittedBy || 'User'}</strong></span>
            <span>{existingFeedback.submittedAt ? new Date(existingFeedback.submittedAt).toLocaleString() : ''}</span>
          </div>
        </div>
      ) : (
        /* Feedback Submission Form */
        <form onSubmit={handleSubmitFeedback} className={`p-5 rounded-2xl border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'} space-y-4 shadow-sm`}>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <ThumbsUp className="w-4 h-4 text-indigo-500" />
              Provide Service Feedback
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Rate your resolution experience with the support and facility team for Ticket #{ticket.id}
            </p>
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Overall Satisfaction Rating</label>
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    className="p-1 hover:scale-110 transition-transform"
                  >
                    <Star className={`w-6 h-6 ${star <= rating ? 'fill-amber-400 text-amber-400' : 'text-slate-300 dark:text-slate-700'}`} />
                  </button>
                ))}
                <span className="text-xs font-bold text-amber-500 ml-2">
                  {rating === 5 ? 'Excellent' : rating === 4 ? 'Good' : rating === 3 ? 'Average' : rating === 2 ? 'Poor' : 'Very Poor'}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Timeliness Rating</label>
                <select
                  value={timelinessRating}
                  onChange={(e) => setTimelinessRating(parseInt(e.target.value))}
                  className={`w-full p-2 rounded-xl border text-xs outline-none font-medium ${
                    isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                  }`}
                >
                  <option value={5}>5 - Extremely Fast & Prompt</option>
                  <option value={4}>4 - Within Expected Time</option>
                  <option value={3}>3 - Acceptable Delay</option>
                  <option value={2}>2 - Delayed Resolution</option>
                  <option value={1}>1 - Unacceptable Delay</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Agent Helpfulness</label>
                <select
                  value={helpfulnessRating}
                  onChange={(e) => setHelpfulnessRating(parseInt(e.target.value))}
                  className={`w-full p-2 rounded-xl border text-xs outline-none font-medium ${
                    isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                  }`}
                >
                  <option value={5}>5 - Highly Courteous & Effective</option>
                  <option value={4}>4 - Helpful & Clear</option>
                  <option value={3}>3 - Standard Support</option>
                  <option value={2}>2 - Needed Repeated Follow-ups</option>
                  <option value={1}>1 - Unhelpful</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Additional Comments & Remarks</label>
              <textarea
                rows={3}
                placeholder="Share any comments regarding how this issue was resolved..."
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                className={`w-full p-2.5 rounded-xl border text-xs outline-none ${
                  isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                }`}
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md transition-all disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              {submitting ? 'Submitting...' : 'Submit CSAT Feedback'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
