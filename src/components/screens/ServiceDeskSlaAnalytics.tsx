import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  AlertTriangle, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  PauseCircle, 
  RefreshCw, 
  ShieldAlert, 
  FileText, 
  Filter, 
  X, 
  TrendingUp, 
  Award,
  Star
} from 'lucide-react';
import { slaService } from '../../services/slaService';
import { ServiceDeskService } from '../../services/serviceDeskService';
import { ServiceSlaEngine } from '../../services/serviceSlaEngine';
import { 
  ServiceTicketRecord, 
  SlaBreachRecord, 
  UserSession, 
  ServiceSlaPolicyRecord 
} from '../../types';

interface ServiceDeskSlaAnalyticsProps {
  userSession: UserSession;
  activeCompany: { companyId: string };
  tickets: ServiceTicketRecord[];
  onClose: () => void;
  onRefreshTickets?: () => void;
}

export function ServiceDeskSlaAnalytics({
  userSession,
  activeCompany,
  tickets,
  onClose,
  onRefreshTickets
}: ServiceDeskSlaAnalyticsProps) {
  const [breaches, setBreaches] = useState<SlaBreachRecord[]>([]);
  const [policies, setPolicies] = useState<ServiceSlaPolicyRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [monitoring, setMonitoring] = useState<boolean>(false);
  const [monitorResult, setMonitorResult] = useState<string>('');
  const [severityFilter, setSeverityFilter] = useState<string>('ALL');

  useEffect(() => {
    loadData();
  }, [activeCompany.companyId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [breachList, policyList] = await Promise.all([
        slaService.getSlaBreaches(activeCompany.companyId),
        slaService.getServiceSlaPolicies(activeCompany.companyId, true)
      ]);
      setBreaches(breachList.sort((a, b) => new Date(b.detectedAt || 0).getTime() - new Date(a.detectedAt || 0).getTime()));
      setPolicies(policyList);
    } catch (e) {
      console.warn('[ServiceDeskSlaAnalytics] Error loading data:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleRunMonitor = async () => {
    setMonitoring(true);
    setMonitorResult('');
    try {
      const res = await ServiceDeskService.monitorAndProcessSlaBreaches(userSession, activeCompany.companyId);
      setMonitorResult(`Evaluated ${res.evaluatedCount} active tickets. Triggered ${res.warningsTriggered} warnings and registered ${res.breachesTriggered} breaches.`);
      await loadData();
      if (onRefreshTickets) onRefreshTickets();
    } catch (e: any) {
      setMonitorResult(`Monitor error: ${e.message || 'Failed to execute monitor'}`);
    } finally {
      setMonitoring(false);
    }
  };

  // Metrics Calculations
  const resolvedTickets = tickets.filter(t => t.status === 'RESOLVED' || t.status === 'CLOSED');
  const activeTickets = tickets.filter(t => !['RESOLVED', 'CLOSED', 'CANCELLED'].includes(t.status));

  const totalEvaluated = resolvedTickets.length + activeTickets.length;
  
  const metTickets = resolvedTickets.filter(t => t.resolutionSlaStatus === 'MET' || (!t.isSlaBreached && t.status === 'RESOLVED')).length;
  const breachedTickets = tickets.filter(t => t.isSlaBreached || t.resolutionSlaStatus === 'BREACHED' || t.resolutionSlaStatus === 'FAILED').length;
  const warningTickets = activeTickets.filter(t => t.resolutionSlaStatus === 'WARNING' || t.slaWarningTriggered).length;
  const pausedTickets = activeTickets.filter(t => t.resolutionSlaStatus === 'PAUSED' || t.lastPausedAt).length;

  const resolutionComplianceRate = totalEvaluated > 0
    ? Math.round(((totalEvaluated - breachedTickets) / totalEvaluated) * 1000) / 10
    : 100;

  // Response SLA Compliance
  const respondedTickets = tickets.filter(t => t.respondedAt || t.responseSlaStatus === 'MET' || t.responseSlaStatus === 'BREACHED');
  const responseMetCount = tickets.filter(t => t.responseSlaStatus === 'MET').length;
  const responseComplianceRate = respondedTickets.length > 0
    ? Math.round((responseMetCount / respondedTickets.length) * 1000) / 10
    : 100;

  // CSAT Quality Metrics (Point 11: Client Feedback)
  const ratedTickets = tickets.filter(t => t.clientRating && t.clientRating > 0);
  const totalRated = ratedTickets.length;
  const avgCsatScore = totalRated > 0
    ? (ratedTickets.reduce((acc, t) => acc + (t.clientRating || 0), 0) / totalRated).toFixed(1)
    : '5.0';
  const satisfiedCount = ratedTickets.filter(t => (t.clientRating || 0) >= 4).length;
  const csatPositivePct = totalRated > 0 ? Math.round((satisfiedCount / totalRated) * 100) : 100;
  const escalatedFeedbackCount = tickets.filter(t => t.hasNegativeFeedback || t.feedbackEscalationStatus === 'ESCALATED').length;

  // Filtered Breaches
  const filteredBreaches = breaches.filter(b => {
    if (severityFilter === 'ALL') return true;
    return b.severity === severityFilter;
  });

  const isDark = document.documentElement.classList.contains('dark');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className={`w-full max-w-5xl max-h-[92vh] flex flex-col rounded-2xl shadow-2xl border ${isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'}`}>
        
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-5 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400">
              <BarChart3 className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight">SLA Performance & Breach Analysis</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Live compliance metrics, threshold monitoring, and incident escalation audit.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleRunMonitor}
              disabled={monitoring}
              className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1.5 shadow-sm transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${monitoring ? 'animate-spin' : ''}`} />
              {monitoring ? 'Running SLA Monitor...' : 'Run SLA Monitor Now'}
            </button>
            <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {monitorResult && (
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-xl flex items-center gap-2 text-sm border border-blue-200 dark:border-blue-800">
              <ShieldAlert className="w-5 h-5 flex-shrink-0" />
              <span>{monitorResult}</span>
            </div>
          )}

          {/* Top KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-500">Resolution Compliance</span>
                <Award className={`w-4 h-4 ${resolutionComplianceRate >= 90 ? 'text-emerald-500' : 'text-amber-500'}`} />
              </div>
              <div className="text-2xl font-bold text-slate-900 dark:text-white">
                {resolutionComplianceRate}%
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                {breachedTickets} breached out of {totalEvaluated} tickets
              </div>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-500">Response SLA Compliance</span>
                <Clock className="w-4 h-4 text-blue-500" />
              </div>
              <div className="text-2xl font-bold text-slate-900 dark:text-white">
                {responseComplianceRate}%
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                {responseMetCount} responded within deadline
              </div>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-500">At-Risk / Warning</span>
                <AlertTriangle className="w-4 h-4 text-amber-500" />
              </div>
              <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                {warningTickets}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                Approaching breach threshold
              </div>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-500">Currently Paused</span>
                <PauseCircle className="w-4 h-4 text-purple-500" />
              </div>
              <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                {pausedTickets}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                Timer stopped (client/parts hold)
              </div>
            </div>
          </div>

          {/* CSAT & Client Quality Health Overview (Point 11: Client Feedback) */}
          <div className="p-5 rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/30 dark:bg-amber-950/10 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-950/80 text-amber-600 dark:text-amber-400">
                  <Star className="w-5 h-5 fill-current" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    Client Satisfaction (CSAT) & Quality Health
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Direct customer perception across resolution timeliness, technical competence, and communication.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="text-right">
                  <div className="text-2xl font-black text-amber-600 dark:text-amber-400 flex items-center gap-1">
                    <Star className="w-5 h-5 fill-current text-amber-400" />
                    <span>{avgCsatScore}</span>
                    <span className="text-xs text-slate-400 font-normal">/ 5.0</span>
                  </div>
                  <div className="text-[11px] text-slate-500 font-medium">
                    {totalRated} Rating{totalRated === 1 ? '' : 's'} Recorded
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              <div className="p-3 bg-white dark:bg-slate-850 rounded-lg border border-amber-100 dark:border-amber-900/40 text-xs">
                <span className="text-slate-500 block mb-1">Satisfaction Rate (≥ 4★)</span>
                <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{csatPositivePct}%</span>
                <span className="text-[10px] text-slate-400 block mt-0.5">{satisfiedCount} satisfied out of {totalRated || 0} reviews</span>
              </div>

              <div className="p-3 bg-white dark:bg-slate-850 rounded-lg border border-amber-100 dark:border-amber-900/40 text-xs">
                <span className="text-slate-500 block mb-1">Negative Feedback Escalations</span>
                <span className={`text-lg font-bold ${escalatedFeedbackCount > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-700 dark:text-slate-300'}`}>
                  {escalatedFeedbackCount} Active
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5">Automated ops reviews triggered</span>
              </div>

              <div className="p-3 bg-white dark:bg-slate-850 rounded-lg border border-amber-100 dark:border-amber-900/40 text-xs">
                <span className="text-slate-500 block mb-1">Feedback Response Rate</span>
                <span className="text-lg font-bold text-indigo-600 dark:text-indigo-400">
                  {resolvedTickets.length > 0 ? Math.round((totalRated / resolvedTickets.length) * 100) : 0}%
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5">Surveys returned on completion</span>
              </div>
            </div>
          </div>

          {/* Breaches Table */}
          <div>
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 mb-3">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-500" />
                SLA Breach Register ({filteredBreaches.length})
              </h3>

              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500">Severity:</span>
                <select
                  value={severityFilter}
                  onChange={e => setSeverityFilter(e.target.value)}
                  className="px-2 py-1 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                >
                  <option value="ALL">All Severities</option>
                  <option value="CRITICAL">CRITICAL</option>
                  <option value="HIGH">HIGH</option>
                  <option value="MEDIUM">MEDIUM</option>
                </select>
              </div>
            </div>

            {loading ? (
              <div className="py-12 text-center text-sm text-slate-500">Loading breach records...</div>
            ) : filteredBreaches.length === 0 ? (
              <div className="py-10 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-800/30">
                <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-500 mb-2" />
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">No SLA Breaches Registered</p>
                <p className="text-xs text-slate-500 mt-0.5">All tickets are meeting target response and resolution commitments.</p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/70 text-slate-600 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="py-3 px-4">Breach ID</th>
                      <th className="py-3 px-4">Ticket</th>
                      <th className="py-3 px-4">Severity</th>
                      <th className="py-3 px-4">Target Target</th>
                      <th className="py-3 px-4">Overdue Variance</th>
                      <th className="py-3 px-4">Detected At</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredBreaches.map(b => {
                      const t = tickets.find(ticket => ticket.id === b.sourceRecordId);
                      return (
                        <tr key={b.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                          <td className="py-3 px-4 font-mono font-bold text-red-600 dark:text-red-400">
                            {b.id}
                          </td>
                          <td className="py-3 px-4 font-medium">
                            {t ? (
                              <div>
                                <span className="font-semibold text-slate-900 dark:text-white">{t.ticketNumber}</span>
                                <span className="block text-[11px] text-slate-500 truncate max-w-xs">{t.title}</span>
                              </div>
                            ) : (
                              b.sourceRecordId
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                              b.severity === 'CRITICAL' 
                                ? 'bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300' 
                                : b.severity === 'HIGH'
                                ? 'bg-orange-100 dark:bg-orange-950/60 text-orange-700 dark:text-orange-300'
                                : 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300'
                            }`}>
                              {b.severity}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-medium text-slate-600 dark:text-slate-300">
                            {Math.round((b.targetValue || 0) / 60 * 10) / 10} hours
                          </td>
                          <td className="py-3 px-4 font-bold text-red-600 dark:text-red-400">
                            +{Math.round((b.variance || 0) / 60 * 10) / 10}h ({b.variance ?? 0}m)
                          </td>
                          <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                            {b.detectedAt ? new Date(b.detectedAt).toLocaleString() : 'N/A'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
}
