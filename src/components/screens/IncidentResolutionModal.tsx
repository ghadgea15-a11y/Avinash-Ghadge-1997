import React, { useState } from 'react';
import { ShieldAlert, X, AlertTriangle, CheckCircle, FileText, Send, User, Upload } from 'lucide-react';
import { IncidentReportRecord, UserSession } from '../../types';
import { IncidentWorkflowEngine } from '../../services/incidentWorkflowEngine';

interface IncidentResolutionModalProps {
  companyId: string;
  incident: IncidentReportRecord;
  userSession: UserSession;
  onClose: () => void;
  onRefresh: () => void;
}

export const IncidentResolutionModal: React.FC<IncidentResolutionModalProps> = ({
  companyId,
  incident,
  userSession,
  onClose,
  onRefresh
}) => {
  const [activeTab, setActiveTab] = useState<'INVESTIGATE' | 'ESCALATE' | 'CLOSE'>('INVESTIGATE');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [invForm, setInvForm] = useState({
    immediateAction: incident.immediateAction || '',
    rootCause: incident.rootCause || '',
    correctiveAction: incident.correctiveAction || '',
    preventiveAction: incident.preventiveAction || '',
    evidenceUrl: ''
  });

  const [escReason, setEscReason] = useState('');
  const [closeNotes, setCloseNotes] = useState('');

  const handleInvestigate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invForm.immediateAction || !invForm.rootCause || !invForm.correctiveAction) {
      setError("Please fill all required investigation fields.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await IncidentWorkflowEngine.submitInvestigation(
        companyId,
        incident.id,
        {
          ownerId: userSession.userId,
          ownerName: userSession.fullName || 'User',
          immediateAction: invForm.immediateAction,
          rootCause: invForm.rootCause,
          correctiveAction: invForm.correctiveAction,
          preventiveAction: invForm.preventiveAction,
          evidenceUrl: invForm.evidenceUrl
        },
        { id: userSession.userId, name: userSession.fullName || 'User' }
      );
      onRefresh();
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to submit investigation.");
    } finally {
      setLoading(false);
    }
  };

  const handleEscalate = async () => {
    if (!escReason) {
      setError("Provide a reason for escalation.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await IncidentWorkflowEngine.escalateIncident(
        companyId,
        incident.id,
        escReason,
        { id: userSession.userId, name: userSession.fullName || 'User' }
      );
      onRefresh();
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to escalate.");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = async () => {
    if (!closeNotes) {
      setError("Provide closure notes.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await IncidentWorkflowEngine.closeIncident(
        companyId,
        incident.id,
        closeNotes,
        { id: userSession.userId, name: userSession.fullName || 'User', role: userSession.role }
      );
      onRefresh();
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to close incident.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-950 dark:bg-slate-800/50">
          <div>
            <h3 className="font-bold text-black dark:text-white flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-indigo-600" />
              Incident Control: {incident.incidentNumber || incident.id.slice(-6)}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Severity: <span className="font-bold">{incident.severity}</span> • Status: <span className="font-bold">{incident.status}</span>
            </p>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-900 dark:text-slate-300 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <div className="flex border-b border-slate-100 dark:border-slate-800">
          <button 
            onClick={() => setActiveTab('INVESTIGATE')}
            className={`flex-1 py-3 text-xs font-bold border-b-2 transition ${activeTab === 'INVESTIGATE' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-black'}`}
          >
            1. Investigation & RCA
          </button>
          <button 
            onClick={() => setActiveTab('ESCALATE')}
            className={`flex-1 py-3 text-xs font-bold border-b-2 transition ${activeTab === 'ESCALATE' ? 'border-amber-500 text-amber-500' : 'border-transparent text-slate-500 hover:text-black'}`}
          >
            2. Escalate
          </button>
          <button 
            onClick={() => setActiveTab('CLOSE')}
            className={`flex-1 py-3 text-xs font-bold border-b-2 transition ${activeTab === 'CLOSE' ? 'border-emerald-600 text-emerald-600' : 'border-transparent text-slate-500 hover:text-black'}`}
          >
            3. Verify & Close
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto flex-1">
          {error && (
            <div className="mb-4 p-3 bg-rose-50 text-rose-700 rounded-xl text-xs font-semibold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              {error}
            </div>
          )}

          {activeTab === 'INVESTIGATE' && (
            <form id="inv-form" onSubmit={handleInvestigate} className="space-y-4">
              <div>
                <label className="text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 mb-1 block">Immediate Action Taken *</label>
                <textarea
                  required
                  value={invForm.immediateAction}
                  onChange={e => setInvForm({...invForm, immediateAction: e.target.value})}
                  className="w-full rounded-xl border-slate-200 bg-white dark:bg-slate-950 p-3 text-sm focus:ring-2 focus:ring-indigo-500 dark:bg-slate-800 dark:border-slate-700"
                  rows={2}
                  placeholder="What was done immediately to contain the issue?"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 mb-1 block">Root Cause Analysis (RCA) *</label>
                <textarea
                  required
                  value={invForm.rootCause}
                  onChange={e => setInvForm({...invForm, rootCause: e.target.value})}
                  className="w-full rounded-xl border-slate-200 bg-white dark:bg-slate-950 p-3 text-sm focus:ring-2 focus:ring-indigo-500 dark:bg-slate-800 dark:border-slate-700"
                  rows={2}
                  placeholder="Why did this happen?"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 mb-1 block">Corrective Action *</label>
                <textarea
                  required
                  value={invForm.correctiveAction}
                  onChange={e => setInvForm({...invForm, correctiveAction: e.target.value})}
                  className="w-full rounded-xl border-slate-200 bg-white dark:bg-slate-950 p-3 text-sm focus:ring-2 focus:ring-indigo-500 dark:bg-slate-800 dark:border-slate-700"
                  rows={2}
                  placeholder="What is being done to fix it?"
                />
              </div>
              
              <div className="flex flex-col">
                 <label className="text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 mb-1 block">
                    Evidence Document Link {incident.severity === 'CRITICAL' && <span className="text-rose-500">* Required for CRITICAL</span>}
                 </label>
                 <input 
                   type="text"
                   placeholder="https://drive.google.com/..."
                   value={invForm.evidenceUrl}
                   onChange={e => setInvForm({...invForm, evidenceUrl: e.target.value})}
                   className="w-full rounded-xl border-slate-200 bg-white dark:bg-slate-950 p-3 text-sm focus:ring-2 focus:ring-indigo-500 dark:bg-slate-800 dark:border-slate-700"
                 />
              </div>
            </form>
          )}

          {activeTab === 'ESCALATE' && (
            <div className="space-y-4">
               <p className="text-sm text-slate-600 dark:text-slate-400 dark:text-slate-300">
                  Escalating this incident will notify management and A3/A4 leadership. It will breach the site-level SLA.
               </p>
               <div>
                <label className="text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 mb-1 block">Escalation Reason *</label>
                <textarea
                  value={escReason}
                  onChange={e => setEscReason(e.target.value)}
                  className="w-full rounded-xl border-slate-200 bg-white dark:bg-slate-950 p-3 text-sm focus:ring-2 focus:ring-amber-500 dark:bg-slate-800 dark:border-slate-700"
                  rows={3}
                  placeholder="Why is this being escalated?"
                />
              </div>
            </div>
          )}

          {activeTab === 'CLOSE' && (
            <div className="space-y-4">
               {incident.severity === 'CRITICAL' && userSession.role !== 'SUPER_ADMIN' && userSession.role !== 'ADMIN' && (
                  <div className="p-4 bg-rose-50 rounded-xl flex gap-3 text-rose-800 text-sm">
                    <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                    <p><strong>Restricted:</strong> Critical severity incidents require Administrator level approval for closure. You cannot close this incident.</p>
                  </div>
               )}
               <p className="text-sm text-slate-600 dark:text-slate-400 dark:text-slate-300">
                  By closing this incident, you verify that all corrective actions have been implemented and evidence has been reviewed.
               </p>
               <div>
                <label className="text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 mb-1 block">Verification & Closure Notes *</label>
                <textarea
                  value={closeNotes}
                  onChange={e => setCloseNotes(e.target.value)}
                  className="w-full rounded-xl border-slate-200 bg-white dark:bg-slate-950 p-3 text-sm focus:ring-2 focus:ring-emerald-500 dark:bg-slate-800 dark:border-slate-700"
                  rows={3}
                  placeholder="Final verification notes..."
                />
              </div>
            </div>
          )}

        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-950 dark:bg-slate-800/50 flex justify-end gap-3">
           <button 
             type="button" 
             onClick={onClose}
             className="px-5 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-200 transition"
           >
             Cancel
           </button>
           
           {activeTab === 'INVESTIGATE' && (
              <button 
                type="submit" 
                form="inv-form"
                disabled={loading}
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow disabled:opacity-50 flex items-center gap-2"
              >
                {loading ? 'Saving...' : 'Save Investigation'}
                <CheckCircle className="w-4 h-4" />
              </button>
           )}

           {activeTab === 'ESCALATE' && (
              <button 
                onClick={handleEscalate}
                disabled={loading}
                className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold shadow disabled:opacity-50 flex items-center gap-2"
              >
                {loading ? 'Processing...' : 'Escalate to Management'}
                <AlertTriangle className="w-4 h-4" />
              </button>
           )}

           {activeTab === 'CLOSE' && (
              <button 
                onClick={handleClose}
                disabled={loading || (incident.severity === 'CRITICAL' && userSession.role !== 'SUPER_ADMIN' && userSession.role !== 'ADMIN')}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow disabled:opacity-50 flex items-center gap-2"
              >
                {loading ? 'Closing...' : 'Verify & Close Incident'}
                <CheckCircle className="w-4 h-4" />
              </button>
           )}
        </div>

      </div>
    </div>
  );
};
