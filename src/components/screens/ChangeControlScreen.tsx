import React, { useState, useEffect } from 'react';
import { ShieldAlert, CheckCircle, XCircle, Clock, AlertTriangle, FileText, Search } from 'lucide-react';
import { UserSession } from '../../types';
import { ChangeControlService, ChangeRequest } from '../../services/changeControlService';
import { format } from 'date-fns';

interface Props {
  session: UserSession;
}

export const ChangeControlScreen: React.FC<Props> = ({ session }) => {
  const [requests, setRequests] = useState<ChangeRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ text: string; type: 'SUCCESS' | 'ERROR' } | null>(null);

  useEffect(() => {
    loadRequests();
  }, [session.companyId]);

  const loadRequests = async () => {
    setLoading(true);
    try {
      const data = await ChangeControlService.getPendingRequests(session);
      setRequests(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (id: string, action: 'APPROVE' | 'REJECT') => {
    setProcessingId(id);
    setFeedback(null);
    let comments = '';
    
    if (action === 'REJECT') {
      comments = window.prompt('Please provide a reason for rejection:') || '';
      if (!comments) {
        setProcessingId(null);
        return;
      }
    }

    try {
      await ChangeControlService.authorizeAndExecuteChange(session, id, action, comments);
      setFeedback({ text: `Change request successfully \${action.toLowerCase()}d.`, type: 'SUCCESS' });
      await loadRequests();
    } catch (err: any) {
      setFeedback({ text: err.message || 'Action failed', type: 'ERROR' });
    } finally {
      setProcessingId(null);
    }
  };

  if (!['SUPER_ADMIN', 'COMPANY_ADMIN', 'HR_ADMIN'].includes(session.role) && !['A0_OWNER', 'A1_DIRECTOR_CEO'].includes((session as any).authority || '')) {
    return (
      <div className="p-8 text-center max-w-lg mx-auto mt-12 bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-200">
        <ShieldAlert className="w-16 h-16 text-rose-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-black dark:text-white mb-2">Access Denied</h2>
        <p className="text-slate-500 dark:text-slate-400 text-sm">
          You do not have the required authorization to review critical system changes.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-black dark:text-white flex items-center gap-3 tracking-tight">
            <ShieldAlert className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
            Change Control Center
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 font-medium">
            Review and authorize critical modifications to company data and security perimeters.
          </p>
        </div>
        <button 
          onClick={loadRequests}
          className="px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-medium hover:bg-white dark:bg-slate-950 dark:hover:bg-slate-800 transition-colors"
        >
          Refresh Queue
        </button>
      </div>

      {feedback && (
        <div className={`p-4 rounded-xl text-sm font-medium flex items-center gap-3 \${
          feedback.type === 'SUCCESS' 
            ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800' 
            : 'bg-rose-50 dark:bg-rose-900/30 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
        }`}>
          {feedback.type === 'SUCCESS' ? <CheckCircle className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
          {feedback.text}
        </div>
      )}

      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/50 dark:bg-slate-900/50 flex items-center gap-3">
          <Clock className="w-5 h-5 text-indigo-600" />
          <h2 className="font-bold text-black dark:text-white">Pending Authorizations</h2>
          <span className="px-2.5 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 text-xs font-bold">
            {requests.length} Request(s)
          </span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-500 dark:text-slate-400">Loading pending requests...</div>
        ) : requests.length === 0 ? (
          <div className="p-16 flex flex-col items-center justify-center text-center">
            <CheckCircle className="w-16 h-16 text-emerald-500 mb-4 opacity-50" />
            <h3 className="text-lg font-bold text-black dark:text-white">All Clear</h3>
            <p className="text-slate-500 dark:text-slate-400 max-w-md mt-2">
              There are no pending critical changes requiring your authorization at this time.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {requests.map(req => (
              <div key={req.id} className="p-6 hover:bg-white dark:bg-slate-950/50 dark:hover:bg-slate-800/30 transition-colors">
                <div className="flex flex-col lg:flex-row gap-6">
                  <div className="flex-1 space-y-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 text-[11px] font-bold uppercase tracking-wider">
                            {req.entityType}
                          </span>
                          <span className="text-xs font-mono text-slate-400">{req.id}</span>
                        </div>
                        <h3 className="text-base font-bold text-black dark:text-white flex items-center gap-2">
                          Modify {req.entityType} Record: {req.entityId}
                        </h3>
                      </div>
                      <div className="text-right text-xs">
                        <p className="text-slate-500 dark:text-slate-400 font-medium">Requested By</p>
                        <p className="font-bold text-black dark:text-white">{req.requesterName}</p>
                        <p className="text-slate-400 mt-1">{format(new Date(req.requestedAt), 'MMM d, yyyy HH:mm')}</p>
                      </div>
                    </div>

                    <div className="bg-white dark:bg-slate-950 rounded-xl p-4 border border-slate-200 dark:border-slate-800">
                      <p className="text-sm text-slate-900 dark:text-slate-300 font-medium mb-3 flex items-center gap-2">
                        <FileText className="w-4 h-4 text-slate-400" />
                        Business Justification
                      </p>
                      <p className="text-sm text-slate-600 dark:text-slate-400 italic">
                        "{req.reason}"
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                      <div className="border border-rose-100 dark:border-rose-900/30 rounded-xl overflow-hidden">
                        <div className="bg-rose-50 dark:bg-rose-900/20 px-3 py-2 border-b border-rose-100 dark:border-rose-900/30">
                          <span className="text-xs font-bold text-rose-700 dark:text-rose-400">Current State (Before)</span>
                        </div>
                        <div className="p-3 bg-white dark:bg-slate-900 overflow-x-auto">
                          <pre className="text-xs text-slate-600 dark:text-slate-400 font-mono">
                            {JSON.stringify(req.beforeData, null, 2)}
                          </pre>
                        </div>
                      </div>
                      <div className="border border-emerald-100 dark:border-emerald-900/30 rounded-xl overflow-hidden">
                        <div className="bg-emerald-50 dark:bg-emerald-900/20 px-3 py-2 border-b border-emerald-100 dark:border-emerald-900/30">
                          <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">Proposed State (After)</span>
                        </div>
                        <div className="p-3 bg-white dark:bg-slate-900 overflow-x-auto">
                          <pre className="text-xs text-emerald-700 dark:text-emerald-400 font-mono">
                            {JSON.stringify(req.afterData, null, 2)}
                          </pre>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="w-full lg:w-48 flex flex-col gap-3 justify-center border-t lg:border-t-0 lg:border-l border-slate-200 dark:border-slate-800 pt-4 lg:pt-0 lg:pl-6">
                    <button
                      onClick={() => handleAction(req.id, 'APPROVE')}
                      disabled={processingId === req.id}
                      className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-sm transition-colors shadow-sm disabled:opacity-50"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Approve
                    </button>
                    <button
                      onClick={() => handleAction(req.id, 'REJECT')}
                      disabled={processingId === req.id}
                      className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-white dark:bg-slate-900 hover:bg-rose-50 dark:hover:bg-rose-900/20 text-rose-600 dark:text-rose-400 border border-slate-200 dark:border-slate-800 hover:border-rose-200 dark:hover:border-rose-800 rounded-xl font-bold text-sm transition-colors disabled:opacity-50"
                    >
                      <XCircle className="w-4 h-4" />
                      Reject
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
