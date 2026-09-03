import React, { useState } from 'react';
import { X, ShieldAlert, CheckCircle2, AlertTriangle, ArrowUpRight, Check, Ban, FileText, UserCheck, Clock } from 'lucide-react';
import { ComplianceViolationRecord, ViolationStatus, UserSession } from '../../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  violation: ComplianceViolationRecord | null;
  onUpdateStatus: (violationId: string, status: ViolationStatus, notes: string, remediationPlan?: string) => Promise<void>;
  onEscalateToBpm: (violationId: string, remediationPlan: string) => Promise<void>;
  userSession: UserSession;
}

export const ViolationDetailModal: React.FC<Props> = ({
  isOpen,
  onClose,
  violation,
  onUpdateStatus,
  onEscalateToBpm,
  userSession
}) => {
  const [activeAction, setActiveAction] = useState<'NONE' | 'RESOLVE' | 'FALSE_POSITIVE' | 'REMEDIATE' | 'BPM_ESCALATE'>('NONE');
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [remediationPlan, setRemediationPlan] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !violation) return null;

  const handleActionSubmit = async (action: 'RESOLVE' | 'FALSE_POSITIVE' | 'REMEDIATE' | 'BPM_ESCALATE') => {
    if (!resolutionNotes.trim() && action !== 'BPM_ESCALATE') {
      setError('Resolution notes / justification are required for compliance audit logging.');
      return;
    }
    if ((action === 'REMEDIATE' || action === 'BPM_ESCALATE') && !remediationPlan.trim()) {
      setError('Remediation plan is required for corrective action workflow.');
      return;
    }

    setIsProcessing(true);
    setError(null);
    try {
      if (action === 'RESOLVE') {
        await onUpdateStatus(violation.id, 'RESOLVED', resolutionNotes, remediationPlan);
      } else if (action === 'FALSE_POSITIVE') {
        await onUpdateStatus(violation.id, 'FALSE_POSITIVE', resolutionNotes);
      } else if (action === 'REMEDIATE') {
        await onUpdateStatus(violation.id, 'REMEDIATION', resolutionNotes, remediationPlan);
      } else if (action === 'BPM_ESCALATE') {
        await onEscalateToBpm(violation.id, remediationPlan);
      }
      onClose();
    } catch (err: any) {
      setError(err.message || 'Action failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const getSeverityBadge = (sev: string) => {
    switch (sev) {
      case 'CRITICAL': return 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200 dark:border-rose-800';
      case 'HIGH': return 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800';
      case 'MEDIUM': return 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-800';
      default: return 'bg-slate-100 text-black dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700';
    }
  };

  const getStatusBadge = (st: ViolationStatus) => {
    switch (st) {
      case 'RESOLVED': return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border-emerald-200';
      case 'REMEDIATION': return 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300 border-indigo-200';
      case 'UNDER_REVIEW': return 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border-amber-200';
      case 'FALSE_POSITIVE': return 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border-slate-200';
      default: return 'bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 border-rose-200';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden my-8 max-h-[90vh] flex flex-col">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-950 dark:bg-slate-800/50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-black dark:text-white">
                  {violation.policyName}
                </h2>
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${getSeverityBadge(violation.severity)}`}>
                  {violation.severity}
                </span>
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${getStatusBadge(violation.status)}`}>
                  {violation.status}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Violation ID: <span className="font-mono">{violation.id}</span> • Module: {violation.module}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 dark:text-slate-400 dark:hover:text-slate-200 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1 text-sm text-black dark:text-slate-200">
          {error && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-lg text-rose-700 dark:text-rose-300 text-xs">
              {error}
            </div>
          )}

          {/* Evidence Card */}
          <div className="p-4 bg-white dark:bg-slate-950 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700 space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Evidence & Broken Rules
            </h4>
            <p className="font-medium text-black dark:text-white">
              {violation.evidence}
            </p>
            {violation.conditionsBroken && violation.conditionsBroken.length > 0 && (
              <ul className="list-disc list-inside text-xs text-slate-600 dark:text-slate-400 space-y-1">
                {violation.conditionsBroken.map((c, i) => (
                  <li key={i}>{c}</li>
                ))}
              </ul>
            )}
          </div>

          {/* Entity & Detection Details */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
            <div className="p-2.5 bg-white dark:bg-slate-950 dark:bg-slate-800/30 rounded border border-slate-200 dark:border-slate-700">
              <span className="text-slate-500 dark:text-slate-400 block">Entity / Subject</span>
              <span className="font-semibold text-black dark:text-white">{violation.entityName || violation.entityId}</span>
            </div>
            <div className="p-2.5 bg-white dark:bg-slate-950 dark:bg-slate-800/30 rounded border border-slate-200 dark:border-slate-700">
              <span className="text-slate-500 dark:text-slate-400 block">Entity Type</span>
              <span className="font-semibold text-black dark:text-white">{violation.entityType}</span>
            </div>
            <div className="p-2.5 bg-white dark:bg-slate-950 dark:bg-slate-800/30 rounded border border-slate-200 dark:border-slate-700">
              <span className="text-slate-500 dark:text-slate-400 block">Site / Unit</span>
              <span className="font-semibold text-black dark:text-white">{violation.siteId || 'Global'}</span>
            </div>
            <div className="p-2.5 bg-white dark:bg-slate-950 dark:bg-slate-800/30 rounded border border-slate-200 dark:border-slate-700">
              <span className="text-slate-500 dark:text-slate-400 block">Risk Score</span>
              <span className="font-semibold text-black dark:text-white">{violation.riskScore} / 100</span>
            </div>
            <div className="p-2.5 bg-white dark:bg-slate-950 dark:bg-slate-800/30 rounded border border-slate-200 dark:border-slate-700">
              <span className="text-slate-500 dark:text-slate-400 block">Detected Timestamp</span>
              <span className="font-semibold text-black dark:text-white">
                {new Date(violation.detectedAt).toLocaleString()}
              </span>
            </div>
            <div className="p-2.5 bg-white dark:bg-slate-950 dark:bg-slate-800/30 rounded border border-slate-200 dark:border-slate-700">
              <span className="text-slate-500 dark:text-slate-400 block">BPM Workflow</span>
              <span className="font-semibold text-black dark:text-white">{violation.bpmStatus || 'NONE'}</span>
            </div>
          </div>

          {/* Historical Resolution Details if Resolved */}
          {violation.status === 'RESOLVED' && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-lg text-xs space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-emerald-800 dark:text-emerald-300">
                <CheckCircle2 className="w-4 h-4" />
                Resolved by {violation.resolvedBy || 'Admin'} at {violation.resolvedAt ? new Date(violation.resolvedAt).toLocaleString() : ''}
              </div>
              <p className="text-emerald-900 dark:text-emerald-200">{violation.resolutionNotes}</p>
            </div>
          )}

          {/* Action Selector */}
          {violation.status !== 'RESOLVED' && violation.status !== 'FALSE_POSITIVE' && (
            <div className="space-y-4 pt-2 border-t border-slate-200 dark:border-slate-700">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Remediation & Governance Action
              </h4>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button
                  type="button"
                  onClick={() => setActiveAction('RESOLVE')}
                  className={`p-2.5 text-xs font-bold rounded-lg border flex flex-col items-center gap-1 transition-all ${
                    activeAction === 'RESOLVE'
                      ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500 text-emerald-700 dark:text-emerald-300'
                      : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-300'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Mark Resolved
                </button>

                <button
                  type="button"
                  onClick={() => setActiveAction('BPM_ESCALATE')}
                  className={`p-2.5 text-xs font-bold rounded-lg border flex flex-col items-center gap-1 transition-all ${
                    activeAction === 'BPM_ESCALATE'
                      ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-500 text-indigo-700 dark:text-indigo-300'
                      : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-300'
                  }`}
                >
                  <ArrowUpRight className="w-4 h-4 text-indigo-600" />
                  Escalate to BPM
                </button>

                <button
                  type="button"
                  onClick={() => setActiveAction('REMEDIATE')}
                  className={`p-2.5 text-xs font-bold rounded-lg border flex flex-col items-center gap-1 transition-all ${
                    activeAction === 'REMEDIATE'
                      ? 'bg-amber-50 dark:bg-amber-950/60 border-amber-500 text-amber-700 dark:text-amber-300'
                      : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-300'
                  }`}
                >
                  <Clock className="w-4 h-4 text-amber-600" />
                  Remediation Plan
                </button>

                <button
                  type="button"
                  onClick={() => setActiveAction('FALSE_POSITIVE')}
                  className={`p-2.5 text-xs font-bold rounded-lg border flex flex-col items-center gap-1 transition-all ${
                    activeAction === 'FALSE_POSITIVE'
                      ? 'bg-slate-100 dark:bg-slate-800 border-slate-400 text-black dark:text-slate-200'
                      : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-300'
                  }`}
                >
                  <Ban className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                  False Positive
                </button>
              </div>

              {/* Action Form */}
              {activeAction !== 'NONE' && (
                <div className="space-y-3 bg-white dark:bg-slate-950 dark:bg-slate-800/40 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
                  <div>
                    <label className="block text-xs font-bold text-slate-900 dark:text-slate-300 mb-1">
                      {activeAction === 'FALSE_POSITIVE' ? 'False Positive Rationale *' : 'Resolution / Governance Notes *'}
                    </label>
                    <textarea
                      value={resolutionNotes}
                      onChange={e => setResolutionNotes(e.target.value)}
                      placeholder={activeAction === 'FALSE_POSITIVE' ? 'Document why this event does not constitute a statutory breach...' : 'Explain corrective action taken...'}
                      rows={2}
                      className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-black dark:text-white"
                      required
                    />
                  </div>

                  {(activeAction === 'REMEDIATE' || activeAction === 'BPM_ESCALATE' || activeAction === 'RESOLVE') && (
                    <div>
                      <label className="block text-xs font-bold text-slate-900 dark:text-slate-300 mb-1">
                        Remediation Action Plan {activeAction === 'BPM_ESCALATE' ? '*' : '(Optional)'}
                      </label>
                      <textarea
                        value={remediationPlan}
                        onChange={e => setRemediationPlan(e.target.value)}
                        placeholder="Detail the mandatory corrective procedure or shift re-allocation..."
                        rows={2}
                        className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-black dark:text-white"
                      />
                    </div>
                  )}

                  <div className="flex justify-end pt-2">
                    <button
                      type="button"
                      disabled={isProcessing}
                      onClick={() => handleActionSubmit(activeAction as any)}
                      className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-lg shadow-sm flex items-center gap-1.5"
                    >
                      {isProcessing ? 'Processing...' : `Submit ${activeAction.replace('_', ' ')}`}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 dark:bg-slate-800/50 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-900 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
