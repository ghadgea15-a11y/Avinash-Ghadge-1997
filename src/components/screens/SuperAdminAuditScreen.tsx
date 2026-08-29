import React, { useState, useEffect } from 'react';
import { 
  History, 
  Search, 
  Filter, 
  Download, 
  RefreshCw, 
  ArrowLeft, 
  ShieldCheck, 
  Calendar, 
  User, 
  Building2, 
  FileText, 
  Eye, 
  ChevronRight, 
  X, 
  AlertCircle,
  FileSpreadsheet
} from 'lucide-react';
import { UserSession, PhaseAScreen } from '../../types';
import { PlatformAuditLog, PlatformAuditAction } from '../../types/platform';
import { SuperAdminService } from '../../services/superAdminService';
import { useTheme } from '../../context/ThemeContext';
import { useFeedback } from '../../context/ActionFeedbackContext';

interface SuperAdminAuditScreenProps {
  currentSession: UserSession;
  onNavigate: (screen: PhaseAScreen) => void;
}

export const SuperAdminAuditScreen: React.FC<SuperAdminAuditScreenProps> = ({
  currentSession,
  onNavigate
}) => {
  const { isDark } = useTheme();
  const { showSuccess, showError, showLoading } = useFeedback();

  const [logs, setLogs] = useState<PlatformAuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAction, setSelectedAction] = useState<string>('ALL');
  const [selectedLog, setSelectedLog] = useState<PlatformAuditLog | null>(null);

  const fetchAuditLogs = async () => {
    setLoading(true);
    try {
      const result = await SuperAdminService.getPlatformAuditLogs({
        action: selectedAction !== 'ALL' ? selectedAction : undefined,
        limitCount: 150
      });
      setLogs(result);
    } catch (err) {
      console.error('[SuperAdminAuditScreen] Failed to fetch audit logs:', err);
      showError('Failed to load platform audit trail');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAuditLogs();
  }, [selectedAction]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchAuditLogs();
  };

  const handleExportCsv = () => {
    if (filteredLogs.length === 0) {
      showError('No logs available to export');
      return;
    }
    const exportData = filteredLogs.map(l => ({
      Timestamp: l.timestamp,
      LogID: l.id,
      Action: l.action,
      Actor: l.actorEmail,
      Role: l.actorRole,
      Tenant: l.targetTenantId || 'N/A',
      Target: l.target || 'N/A',
      Reason: l.reason || '',
      CorrelationID: l.correlationId || ''
    }));
    SuperAdminService.exportToCsv('platform_audit_logs', exportData);
    showSuccess(`Exported ${exportData.length} audit logs to CSV`);
  };

  const handleExportJson = () => {
    if (filteredLogs.length === 0) {
      showError('No logs available to export');
      return;
    }
    SuperAdminService.exportToJson('platform_audit_logs', filteredLogs);
    showSuccess(`Exported ${filteredLogs.length} audit logs to JSON`);
  };

  const filteredLogs = logs.filter(log => {
    const q = searchQuery.toLowerCase();
    const matchesSearch = 
      log.id.toLowerCase().includes(q) ||
      log.actorEmail.toLowerCase().includes(q) ||
      log.action.toLowerCase().includes(q) ||
      (log.targetTenantId && log.targetTenantId.toLowerCase().includes(q)) ||
      (log.reason && log.reason.toLowerCase().includes(q)) ||
      (log.correlationId && log.correlationId.toLowerCase().includes(q));

    const matchesAction = selectedAction === 'ALL' || log.action === selectedAction;
    return matchesSearch && matchesAction;
  });

  const actionList: { key: string; label: string }[] = [
    { key: 'ALL', label: 'All Operations' },
    { key: 'CREATE_TENANT', label: 'Create Tenant' },
    { key: 'UPDATE_TENANT_STATUS', label: 'Update Tenant Status' },
    { key: 'SUSPEND_TENANT', label: 'Suspend Tenant' },
    { key: 'REACTIVATE_TENANT', label: 'Reactivate Tenant' },
    { key: 'UPDATE_MODULE_ENTITLEMENTS', label: 'Module Entitlements' },
    { key: 'CREATE_SUPPORT_SESSION', label: 'Support Session' },
    { key: 'REVOKE_SUPPORT_SESSION', label: 'Revoke Support' },
    { key: 'UPDATE_GLOBAL_CONFIG', label: 'Global Config' },
    { key: 'BROADCAST_NOTIFICATION', label: 'Broadcast' }
  ];

  return (
    <div className={`flex-1 transition-colors duration-300 ${isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'} p-4 md:p-6 space-y-6 max-w-7xl mx-auto w-full`}>
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => onNavigate('SUPER_ADMIN_DASHBOARD')}
            className={`p-2 rounded-xl border transition ${
              isDark ? 'bg-slate-900 border-slate-800 hover:bg-slate-800' : 'bg-white border-slate-200 hover:bg-slate-100'
            }`}
          >
            <ArrowLeft className="w-5 h-5 text-slate-400" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight">Platform Audit & Mutation Trail</h1>
              <span className="bg-indigo-500/10 text-indigo-500 text-xs font-semibold px-2.5 py-0.5 rounded-full border border-indigo-500/20">
                Immutable Ledger
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Cryptographically timestamped audit log of all administrative and platform mutations.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCsv}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl border transition ${
              isDark ? 'bg-slate-900 border-slate-800 hover:bg-slate-800 text-slate-200' : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-500" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={handleExportJson}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl border transition ${
              isDark ? 'bg-slate-900 border-slate-800 hover:bg-slate-800 text-slate-200' : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
            }`}
          >
            <Download className="w-3.5 h-3.5 text-indigo-500" />
            <span>Export JSON</span>
          </button>
          <button
            onClick={handleRefresh}
            disabled={refreshing || loading}
            className={`p-2 rounded-xl border transition ${
              isDark ? 'bg-slate-900 border-slate-800 hover:bg-slate-800' : 'bg-white border-slate-200 hover:bg-slate-50'
            }`}
          >
            <RefreshCw className={`w-4 h-4 text-slate-400 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className={`p-4 rounded-2xl border ${isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-sm'} space-y-3`}>
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by Actor, Tenant ID, Reason, Correlation ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full pl-10 pr-4 py-2 text-sm rounded-xl border transition ${
                isDark 
                  ? 'bg-slate-950 border-slate-800 text-white placeholder-slate-500 focus:border-indigo-500' 
                  : 'bg-slate-50 border-slate-200 text-black placeholder-slate-400 focus:border-indigo-500'
              } outline-none`}
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
            <Filter className="w-4 h-4 text-slate-400 shrink-0" />
            <select
              value={selectedAction}
              onChange={(e) => setSelectedAction(e.target.value)}
              className={`text-xs font-semibold px-3 py-2 rounded-xl border outline-none cursor-pointer ${
                isDark ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-800'
              }`}
            >
              {actionList.map(a => (
                <option key={a.key} value={a.key}>{a.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className={`rounded-2xl border overflow-hidden ${isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className={`border-b ${isDark ? 'bg-slate-950/60 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-600'} font-semibold uppercase tracking-wider`}>
              <tr>
                <th className="py-3.5 px-4">Timestamp</th>
                <th className="py-3.5 px-4">Action</th>
                <th className="py-3.5 px-4">Actor</th>
                <th className="py-3.5 px-4">Tenant Scope</th>
                <th className="py-3.5 px-4">Reason / Notes</th>
                <th className="py-3.5 px-4 text-right">Inspect</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isDark ? 'divide-slate-800/60 text-slate-300' : 'divide-slate-100 text-slate-700'}`}>
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-500" />
                    Loading platform audit ledger...
                  </td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <History className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    No audit records match the selected filters.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => {
                  return (
                    <tr 
                      key={log.id} 
                      className={`hover:bg-indigo-500/5 transition cursor-pointer ${
                        selectedLog?.id === log.id ? (isDark ? 'bg-indigo-500/10' : 'bg-indigo-50/70') : ''
                      }`}
                      onClick={() => setSelectedLog(log)}
                    >
                      <td className="py-3.5 px-4 font-mono text-[11px] whitespace-nowrap text-slate-400">
                        {typeof log.timestamp === 'string' ? log.timestamp.replace('T', ' ').substring(0, 19) : 'N/A'}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md font-mono text-[10px] font-bold ${
                          log.action.includes('SUSPEND') 
                            ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20' 
                            : log.action.includes('CREATE') 
                            ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' 
                            : 'bg-indigo-500/10 text-indigo-500 border border-indigo-500/20'
                        }`}>
                          {log.action}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="font-medium truncate max-w-[140px]">{log.actorEmail}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {log.targetTenantId ? (
                          <div className="flex items-center gap-1.5 font-mono text-[11px]">
                            <Building2 className="w-3.5 h-3.5 text-cyan-500 shrink-0" />
                            <span className="font-bold text-cyan-600 dark:text-cyan-400">{log.targetTenantId}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400">Platform Global</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 max-w-[220px] truncate text-slate-500 dark:text-slate-400">
                        {log.reason || 'Standard platform administrative operation'}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedLog(log);
                          }}
                          className={`p-1.5 rounded-lg border transition ${
                            isDark ? 'bg-slate-800 border-slate-700 hover:bg-slate-700' : 'bg-slate-100 border-slate-200 hover:bg-slate-200'
                          }`}
                        >
                          <Eye className="w-3.5 h-3.5 text-indigo-500" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Log Detail Drawer / Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className={`w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl border shadow-2xl p-6 ${
            isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="flex items-center justify-between border-b pb-4 mb-4 border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-500 border border-indigo-500/20">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base">Audit Record Details</h3>
                  <p className="font-mono text-xs text-slate-400">{selectedLog.id}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className={`p-3 rounded-xl border ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                  <span className="text-slate-400 block mb-1 text-[11px]">Action</span>
                  <span className="font-mono font-bold text-indigo-500">{selectedLog.action}</span>
                </div>
                <div className={`p-3 rounded-xl border ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                  <span className="text-slate-400 block mb-1 text-[11px]">Timestamp</span>
                  <span className="font-mono text-slate-300 dark:text-slate-300">
                    {typeof selectedLog.timestamp === 'string' ? selectedLog.timestamp : 'N/A'}
                  </span>
                </div>
                <div className={`p-3 rounded-xl border ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                  <span className="text-slate-400 block mb-1 text-[11px]">Actor</span>
                  <span className="font-semibold">{selectedLog.actorEmail}</span>
                  <span className="block text-[10px] text-slate-400 mt-0.5">UID: {selectedLog.actorUid}</span>
                </div>
                <div className={`p-3 rounded-xl border ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                  <span className="text-slate-400 block mb-1 text-[11px]">Target Scope</span>
                  <span className="font-semibold">{selectedLog.targetTenantId ? `Tenant: ${selectedLog.targetTenantId}` : 'Platform Global'}</span>
                  {selectedLog.targetId && <span className="block text-[10px] text-slate-400 mt-0.5">Target ID: {selectedLog.targetId}</span>}
                </div>
              </div>

              {selectedLog.reason && (
                <div className={`p-3 rounded-xl border ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                  <span className="text-slate-400 block mb-1 text-[11px]">Justification / Reason</span>
                  <p className="text-slate-300">{selectedLog.reason}</p>
                </div>
              )}

              {selectedLog.correlationId && (
                <div className={`p-3 rounded-xl border ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                  <span className="text-slate-400 block mb-1 text-[11px]">Correlation ID</span>
                  <span className="font-mono text-indigo-400">{selectedLog.correlationId}</span>
                </div>
              )}

              {selectedLog.after && (
                <div className={`p-3 rounded-xl border ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                  <span className="text-slate-400 block mb-1.5 text-[11px]">Mutation State (After Diff)</span>
                  <pre className="font-mono text-[11px] p-2.5 rounded-lg bg-black/40 text-emerald-400 overflow-x-auto">
                    {JSON.stringify(selectedLog.after, null, 2)}
                  </pre>
                </div>
              )}

              {selectedLog.before && (
                <div className={`p-3 rounded-xl border ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                  <span className="text-slate-400 block mb-1.5 text-[11px]">Previous State (Before Diff)</span>
                  <pre className="font-mono text-[11px] p-2.5 rounded-lg bg-black/40 text-amber-400 overflow-x-auto">
                    {JSON.stringify(selectedLog.before, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white transition shadow-sm"
              >
                Close Audit Inspector
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
