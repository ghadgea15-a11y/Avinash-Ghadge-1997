import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  Star, 
  Filter, 
  X, 
  TrendingUp, 
  ThumbsUp, 
  ThumbsDown, 
  Minus,
  MessageSquareWarning,
  Building2,
  MapPin,
  Tag,
  Download,
  AlertTriangle,
  RefreshCw,
  Clock,
  UserCheck,
  Zap
} from 'lucide-react';
import { SatisfactionScoreService } from '../../services/satisfactionScoreService';
import { SatisfactionScoreSummary, SatisfactionScoreFilter, UserSession } from '../../types';
import { useFeedback } from '../../context/ActionFeedbackContext';

interface ServiceDeskSatisfactionAnalyticsProps {
  userSession: UserSession;
  activeCompany: { companyId: string };
  onClose: () => void;
}

export function ServiceDeskSatisfactionAnalytics({
  userSession,
  activeCompany,
  onClose
}: ServiceDeskSatisfactionAnalyticsProps) {
  const { showSuccess, showError, showLoading, showCancelled, showValidationFailed, handleError } = useFeedback();
  const [summary, setSummary] = useState<SatisfactionScoreSummary | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string>('');
  
  const [filters, setFilters] = useState<Partial<SatisfactionScoreFilter>>({
    dateRangePreset: '30D'
  });

  const loadData = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const result = await SatisfactionScoreService.getSatisfactionScoreSummary(
        userSession, 
        activeCompany.companyId, 
        filters
      );
      setSummary(result);
      
      // Point 12: Negative Satisfaction -> Notification check
      // Trigger alerts if configured
      await SatisfactionScoreService.checkAndTriggerLowSatisfactionAlerts(
        userSession,
        activeCompany.companyId,
        result
      );

    } catch (e: any) {
      setErrorMsg(e.message || 'Failed to load satisfaction metrics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeCompany.companyId, filters]);

  const handleExportCsv = async () => {
    if (!summary) {
      showValidationFailed('No satisfaction metrics available to export.');
      return;
    }
    const dismiss = showLoading('Exporting CSAT metrics report...');
    try {
      const headers = ['Metric', 'Value'];
      const rows = [
        ['Average Rating', (summary.overallAverageScore || 0).toFixed(2)],
        ['Total Responses', (summary.totalFeedbackRecords || 0).toString()],
        ['Response Rate %', (summary.surveyResponseRate || 0).toFixed(1)],
        ['CSAT Positive %', (summary.overallSatisfactionPercentage || 0).toFixed(1)],
        ['Positive Count (4-5 Stars)', (summary.positiveCount || 0).toString()],
        ['Neutral Count (3 Stars)', (summary.neutralCount || 0).toString()],
        ['Negative Count (1-2 Stars)', (summary.negativeCount || 0).toString()],
        ['Escalation Count', (summary.escalationCount || 0).toString()],
      ];
      const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `csat_analytics_${activeCompany.companyId}_${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      dismiss();
      showSuccess('✓ CSAT satisfaction analytics report exported.');
    } catch (err: any) {
      dismiss();
      handleError(err, '✕ Export Failed');
    }
  };

  const updateFilter = (key: keyof SatisfactionScoreFilter, value: any) => {
    setFilters(prev => {
      const nf = { ...prev, [key]: value };
      if (!value && value !== 0) {
        delete nf[key];
      }
      return nf;
    });
  };

  if (!summary && loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-lg p-6 flex flex-col items-center justify-center h-64">
          <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin mb-4" />
          <p className="text-slate-600 dark:text-slate-400">Loading Satisfaction Analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/50 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-6xl max-h-full flex flex-col my-auto border border-slate-200 dark:border-slate-800">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/50 dark:bg-slate-900/50 rounded-t-2xl shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 dark:bg-amber-900/40 rounded-lg text-amber-600 dark:text-amber-400">
              <Star className="w-5 h-5 fill-current" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-black dark:text-white">
                Client Satisfaction (CSAT) Analytics
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Module 11 / Point 12: Service Satisfaction & Health
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={handleExportCsv}
              className="px-3 py-1.5 text-sm font-medium text-slate-900 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg flex items-center gap-2 transition-colors border border-slate-200 dark:border-slate-700"
            >
              <Download className="w-4 h-4" /> Export Report
            </button>
            <button onClick={onClose} className="p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {errorMsg && (
            <div className="p-4 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 rounded-lg border border-rose-200 dark:border-rose-900/40 text-sm flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              {errorMsg}
            </div>
          )}

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3 p-4 bg-white dark:bg-slate-950 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-800">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={filters.dateRangePreset || ''}
              onChange={(e) => updateFilter('dateRangePreset', e.target.value)}
              className="text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-amber-500 outline-none"
            >
              <option value="ALL">All Time</option>
              <option value="7D">Last 7 Days</option>
              <option value="30D">Last 30 Days</option>
              <option value="90D">Last 90 Days</option>
              <option value="YEAR">This Year</option>
            </select>
            <select
              value={filters.minRating || ''}
              onChange={(e) => updateFilter('minRating', e.target.value ? Number(e.target.value) : undefined)}
              className="text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-amber-500 outline-none"
            >
              <option value="">Any Rating</option>
              <option value="4">4+ Stars (Satisfied)</option>
              <option value="3">3+ Stars</option>
              <option value="1">1-2 Stars (Dissatisfied)</option>
            </select>
          </div>

          {!summary?.hasData ? (
            <div className="py-12 flex flex-col items-center justify-center text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
              <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4 text-slate-400">
                <Star className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-semibold text-black dark:text-white dark:text-slate-100">No data available</h3>
              <p className="text-slate-500 dark:text-slate-400 max-w-sm mt-1">
                There are no client feedback records matching the current filters.
              </p>
            </div>
          ) : (
            <>
              {/* Alert Banner if Below Threshold */}
              {summary.thresholdAlerts.isCompanyBelowThreshold && (
                <div className="p-4 bg-rose-50 dark:bg-rose-900/30 border border-rose-200 dark:border-rose-900/50 rounded-xl flex items-start gap-3">
                  <div className="p-2 bg-rose-100 dark:bg-rose-900/50 text-rose-600 dark:text-rose-400 rounded-lg shrink-0">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-rose-800 dark:text-rose-300">Poor Satisfaction Detected</h3>
                    <p className="text-xs text-rose-600 dark:text-rose-400 mt-1">
                      The overall company CSAT score ({summary.overallAverageScore}★) has fallen below the configured threshold of {summary.thresholdAlerts.configuredThreshold}★. Operations management has been notified.
                    </p>
                  </div>
                </div>
              )}

              {/* Top KPI Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-slate-900 dark:bg-slate-800/80 p-5 rounded-xl border border-slate-200 dark:border-slate-700/50 flex flex-col">
                  <span className="text-sm font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1.5"><Star className="w-4 h-4 text-amber-500 fill-amber-500"/> Overall Score</span>
                  <div className="text-3xl font-black text-black dark:text-white mt-2 flex items-baseline gap-1">
                    {summary.overallAverageScore}
                    <span className="text-sm font-normal text-slate-500 dark:text-slate-400">/ 5.0</span>
                  </div>
                  <div className="mt-auto pt-4 text-xs font-medium text-slate-500 dark:text-slate-400">
                    Across {summary.totalFeedbackRecords} responses
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-900 dark:bg-slate-800/80 p-5 rounded-xl border border-slate-200 dark:border-slate-700/50 flex flex-col">
                  <span className="text-sm font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1.5"><ThumbsUp className="w-4 h-4 text-emerald-500"/> Satisfaction Rate</span>
                  <div className="text-3xl font-black text-emerald-600 dark:text-emerald-400 mt-2">
                    {summary.overallSatisfactionPercentage}%
                  </div>
                  <div className="mt-auto pt-4 flex items-center gap-4 text-xs">
                    <span className="text-emerald-600 dark:text-emerald-400 font-medium">{summary.positiveCount} Satisfied</span>
                    <span className="text-rose-600 dark:text-rose-400 font-medium">{summary.negativeCount} Dissatisfied</span>
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-900 dark:bg-slate-800/80 p-5 rounded-xl border border-slate-200 dark:border-slate-700/50 flex flex-col">
                  <span className="text-sm font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1.5"><TrendingUp className="w-4 h-4 text-indigo-500"/> Survey Response Rate</span>
                  <div className="text-3xl font-black text-black dark:text-white mt-2">
                    {summary.surveyResponseRate}%
                  </div>
                  <div className="mt-auto pt-4 text-xs text-slate-500 dark:text-slate-400">
                    From {summary.totalResolvedTickets} resolved tickets
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-900 dark:bg-slate-800/80 p-5 rounded-xl border border-slate-200 dark:border-slate-700/50 flex flex-col">
                  <span className="text-sm font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1.5"><MessageSquareWarning className="w-4 h-4 text-rose-500"/> Active Escalations</span>
                  <div className={`text-3xl font-black mt-2 ${summary.escalationCount > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-black dark:text-white'}`}>
                    {summary.escalationCount}
                  </div>
                  <div className="mt-auto pt-4 text-xs text-slate-500 dark:text-slate-400">
                    Requires management review
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Score Breakdown */}
                <div className="bg-white dark:bg-slate-900 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-800 p-5">
                  <h3 className="text-sm font-bold text-black dark:text-white mb-4 flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-indigo-500" />
                    Quality Dimension Scores
                  </h3>
                  <div className="space-y-4">
                    {[
                      { key: 'timeliness', icon: Clock, color: 'text-sky-500', bg: 'bg-sky-50 dark:bg-sky-500/10' },
                      { key: 'competence', icon: UserCheck, color: 'text-violet-500', bg: 'bg-violet-50 dark:bg-violet-500/10' },
                      { key: 'communication', icon: MessageSquareWarning, color: 'text-fuchsia-500', bg: 'bg-fuchsia-50 dark:bg-fuchsia-500/10' },
                      { key: 'quality', icon: Zap, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-500/10' }
                    ].map(dim => {
                      const data = summary.dimensionScores[dim.key as keyof typeof summary.dimensionScores];
                      const Icon = dim.icon;
                      return (
                        <div key={dim.key} className="flex items-center gap-4">
                          <div className={`p-2 rounded-lg ${dim.bg} ${dim.color} shrink-0`}>
                            <Icon className="w-4 h-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between text-xs mb-1">
                              <span className="font-semibold text-slate-900 dark:text-slate-300 truncate">{data.label}</span>
                              <span className="font-bold text-black dark:text-white">{data.averageScore}★</span>
                            </div>
                            <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-amber-500 rounded-full" 
                                style={{ width: `${(data.averageScore / 5) * 100}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* SLA Correlation */}
                <div className="bg-white dark:bg-slate-900 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-800 p-5">
                  <h3 className="text-sm font-bold text-black dark:text-white mb-4 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-emerald-500" />
                    SLA & Performance Correlation
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-white dark:bg-slate-950 dark:bg-slate-900/50 rounded-lg border border-slate-100 dark:border-slate-800">
                      <span className="text-xs text-slate-500 dark:text-slate-400 block mb-1">When SLA is Met</span>
                      <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                        {summary.slaCorrelation.slaMetAvgScore}★
                      </div>
                      <span className="text-[10px] text-slate-400">{summary.slaCorrelation.slaMetResponsesCount} responses</span>
                    </div>
                    <div className="p-3 bg-white dark:bg-slate-950 dark:bg-slate-900/50 rounded-lg border border-slate-100 dark:border-slate-800">
                      <span className="text-xs text-slate-500 dark:text-slate-400 block mb-1">When SLA Breached</span>
                      <div className="text-lg font-bold text-rose-600 dark:text-rose-400">
                        {summary.slaCorrelation.slaBreachedAvgScore}★
                      </div>
                      <span className="text-[10px] text-slate-400">{summary.slaCorrelation.slaBreachedResponsesCount} responses</span>
                    </div>
                    <div className="p-3 bg-white dark:bg-slate-950 dark:bg-slate-900/50 rounded-lg border border-slate-100 dark:border-slate-800">
                      <span className="text-xs text-slate-500 dark:text-slate-400 block mb-1">Satisfied Resolution (Avg)</span>
                      <div className="text-lg font-bold text-slate-900 dark:text-slate-300">
                        {summary.slaCorrelation.avgResolutionHoursSatisfied} hrs
                      </div>
                      <span className="text-[10px] text-slate-400">Time to resolve</span>
                    </div>
                    <div className="p-3 bg-white dark:bg-slate-950 dark:bg-slate-900/50 rounded-lg border border-slate-100 dark:border-slate-800">
                      <span className="text-xs text-slate-500 dark:text-slate-400 block mb-1">Dissatisfied Resolution (Avg)</span>
                      <div className="text-lg font-bold text-slate-900 dark:text-slate-300">
                        {summary.slaCorrelation.avgResolutionHoursDissatisfied} hrs
                      </div>
                      <span className="text-[10px] text-slate-400">Time to resolve</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* By Client / Group Metrics */}
              <div className="bg-white dark:bg-slate-900 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 dark:bg-slate-900/50">
                  <h3 className="text-sm font-bold text-black dark:text-white flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-blue-500" />
                    Satisfaction by Client
                  </h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="text-xs text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-950 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 uppercase">
                      <tr>
                        <th className="px-5 py-3 font-semibold">Client</th>
                        <th className="px-5 py-3 font-semibold text-center">Score</th>
                        <th className="px-5 py-3 font-semibold text-center">Pos / Neg</th>
                        <th className="px-5 py-3 font-semibold text-center">Responses</th>
                        <th className="px-5 py-3 font-semibold text-right">Escalations</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                      {summary.byClient.slice(0, 10).map((c: any) => (
                        <tr key={c.id} className="hover:bg-white dark:bg-slate-950/50 dark:hover:bg-slate-800/30">
                          <td className="px-5 py-3 font-medium text-black dark:text-white dark:text-slate-100">{c.name}</td>
                          <td className="px-5 py-3 text-center">
                            <span className={`inline-flex items-center gap-1 font-bold ${c.averageScore >= summary.thresholdAlerts.configuredThreshold ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                              {c.averageScore}★
                            </span>
                          </td>
                          <td className="px-5 py-3 text-center">
                            <div className="flex items-center justify-center gap-2 text-xs">
                              <span className="text-emerald-600 font-medium">{c.positiveCount}</span>
                              <span className="text-slate-300 dark:text-slate-600 dark:text-slate-400">/</span>
                              <span className="text-rose-600 font-medium">{c.negativeCount}</span>
                            </div>
                          </td>
                          <td className="px-5 py-3 text-center text-slate-500 dark:text-slate-400">{c.totalResponses}</td>
                          <td className="px-5 py-3 text-right">
                            {c.escalationCount > 0 ? (
                              <span className="px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 text-xs font-bold">
                                {c.escalationCount}
                              </span>
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </td>
                        </tr>
                      ))}
                      {summary.byClient.length === 0 && (
                         <tr><td colSpan={5} className="px-5 py-4 text-center text-slate-500 dark:text-slate-400 text-xs">No client data</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </>
          )}

        </div>
      </div>
    </div>
  );
}
