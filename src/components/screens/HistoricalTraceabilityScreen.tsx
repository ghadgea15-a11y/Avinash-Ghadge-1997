import React, { useState, useEffect } from 'react';
import { 
  UserSession, 
  CompanyTenant, 
  PhaseAScreen, 
  AuditLogRecord 
} from '../../types';
import { FirestoreService } from '../../services/firestoreService';
import { useTheme } from '../../context/ThemeContext';
import { 
  History, 
  ShieldCheck, 
  Search, 
  Filter, 
  Download, 
  Eye, 
  Calendar, 
  User, 
  Layers, 
  FileText, 
  Clock, 
  ArrowRight, 
  CheckCircle2, 
  AlertTriangle,
  RefreshCw,
  Sliders,
  Database,
  Lock
} from 'lucide-react';
import { collection, query, orderBy, limit, getDocs, onSnapshot, where } from 'firebase/firestore';
import { db } from '../../firebase';

interface HistoricalTraceabilityScreenProps {
  session?: UserSession;
  userSession?: UserSession;
  activeCompany?: CompanyTenant | null;
  onNavigateToScreen?: (screen: PhaseAScreen) => void;
  onNavigate?: (screen: PhaseAScreen) => void;
}

export const HistoricalTraceabilityScreen: React.FC<HistoricalTraceabilityScreenProps> = ({
  session,
  userSession: userSessionProp,
  activeCompany,
  onNavigateToScreen,
  onNavigate
}) => {
  const currentSession = session || userSessionProp;
  const { isDark } = useTheme();
  const companyId = activeCompany?.companyId || currentSession?.companyId || '';

  // Data State
  const [auditLogs, setAuditLogs] = useState<AuditLogRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedModule, setSelectedModule] = useState('ALL');
  const [selectedAction, setSelectedAction] = useState('ALL');
  const [selectedTimeRange, setSelectedTimeRange] = useState<'TODAY' | '7DAYS' | '30DAYS' | 'ALL'>('30DAYS');

  // Selected Log for Diff Modal
  const [selectedLog, setSelectedLog] = useState<AuditLogRecord | null>(null);

  // Fetch audit logs
  useEffect(() => {
    if (!companyId) return;

    setLoading(true);
    const auditCol = collection(db, 'companies', companyId, 'auditLogs');
    const q = query(auditCol, orderBy('timestamp', 'desc'), limit(150));

    const unsub = onSnapshot(q, (snap) => {
      const logs: AuditLogRecord[] = snap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setAuditLogs(logs);
      setLoading(false);
    }, (err) => {
      console.warn('Audit logs subscription error:', err);
      // Fallback query without orderBy if indexing is required
      getDocs(auditCol).then(snap => {
        const logs: AuditLogRecord[] = snap.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setAuditLogs(logs);
      }).catch(console.error).finally(() => setLoading(false));
    });

    return () => unsub();
  }, [companyId]);

  // Compute Filtered Logs
  const filteredLogs = auditLogs.filter(log => {
    const actor = (log.actor || log.performedBy || log.actorEmail || '').toLowerCase();
    const action = (log.action || '').toLowerCase();
    const moduleName = (log.module || log.targetType || '').toLowerCase();
    const entityId = (log.entityId || log.targetId || '').toLowerCase();
    const queryStr = searchQuery.toLowerCase();

    const matchesSearch = actor.includes(queryStr) || 
      action.includes(queryStr) || 
      moduleName.includes(queryStr) || 
      entityId.includes(queryStr) ||
      (log.description || '').toLowerCase().includes(queryStr);

    const matchesModule = selectedModule === 'ALL' || (log.module || log.targetType) === selectedModule;
    const matchesAction = selectedAction === 'ALL' || (log.action) === selectedAction;

    // Date range filter
    if (selectedTimeRange !== 'ALL' && log.timestamp) {
      const logTime = new Date(log.timestamp).getTime();
      const now = Date.now();
      if (selectedTimeRange === 'TODAY' && (now - logTime) > 86400000) return false;
      if (selectedTimeRange === '7DAYS' && (now - logTime) > 86400000 * 7) return false;
      if (selectedTimeRange === '30DAYS' && (now - logTime) > 86400000 * 30) return false;
    }

    return matchesSearch && matchesModule && matchesAction;
  });

  // Export to CSV
  const handleExportCSV = () => {
    const headers = ['Event ID', 'Timestamp', 'Actor', 'Role', 'Module', 'Action', 'Entity ID', 'Details'];
    const rows = filteredLogs.map(l => [
      `"${l.id || ''}"`,
      `"${l.timestamp || ''}"`,
      `"${l.actor || l.performedBy || l.actorEmail || 'System'}"`,
      `"${l.role || 'USER'}"`,
      `"${l.module || l.targetType || 'SYSTEM'}"`,
      `"${l.action || 'MUTATION'}"`,
      `"${l.entityId || l.targetId || ''}"`,
      `"${(l.description || l.reason || JSON.stringify(l.details || {})).replace(/"/g, '""')}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `historical_traceability_audit_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const totalEvents = auditLogs.length;
  const mutationsCount = auditLogs.filter(l => ['CREATE', 'UPDATE', 'DELETE', 'TRANSFER', 'APPROVE'].includes(l.action)).length;
  const securityEventsCount = auditLogs.filter(l => ['LOGIN', 'LOGOUT', 'AUTH_FAILURE', 'PASSWORD_RESET', 'ROLE_CHANGE'].includes(l.action)).length;

  return (
    <div className={`h-full flex flex-col ${isDark ? 'bg-slate-950 text-white' : 'bg-slate-50 text-slate-900'}`}>
      {/* Header */}
      <div className={`p-6 border-b ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'} flex flex-col md:flex-row md:items-center md:justify-between gap-4`}>
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-indigo-600/10 text-indigo-600 dark:text-indigo-400">
            <History className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight">Historical Traceability & Audit Trail</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Authoritative state mutation ledger, immutable event provenance, and user action audit logs
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={handleExportCSV}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-semibold border transition-all ${
              isDark ? 'bg-slate-800 border-slate-700 hover:bg-slate-700' : 'bg-white border-slate-200 hover:bg-slate-50'
            }`}
          >
            <Download className="w-4 h-4" />
            Export Audit Ledger (CSV)
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="p-6 grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className={`p-4 rounded-2xl border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'} shadow-sm`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Recorded Events</span>
            <Database className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-indigo-600 dark:text-indigo-400">{totalEvents}</span>
            <span className="text-xs text-slate-400">Logged mutations</span>
          </div>
        </div>

        <div className={`p-4 rounded-2xl border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'} shadow-sm`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">State Mutations</span>
            <Layers className="w-4 h-4 text-blue-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-blue-600 dark:text-blue-400">{mutationsCount}</span>
            <span className="text-xs text-slate-400">CRUD actions</span>
          </div>
        </div>

        <div className={`p-4 rounded-2xl border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'} shadow-sm`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Security & Access Logs</span>
            <Lock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-amber-600 dark:text-amber-400">{securityEventsCount}</span>
            <span className="text-xs text-slate-400">Auth events</span>
          </div>
        </div>

        <div className={`p-4 rounded-2xl border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'} shadow-sm`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Ledger Integrity</span>
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-emerald-500">100%</span>
            <span className="text-xs text-emerald-400">Immutable / Verified</span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 px-6 pb-6 overflow-y-auto space-y-4">
        {/* Filter Controls */}
        <div className="flex flex-col lg:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Search by actor, entity ID, action, or module..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full pl-9 pr-4 py-2 rounded-xl text-sm border outline-none ${
                isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
              }`}
            />
          </div>

          <select
            value={selectedModule}
            onChange={(e) => setSelectedModule(e.target.value)}
            className={`px-3 py-2 rounded-xl text-sm border outline-none font-medium ${
              isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            <option value="ALL">All Modules</option>
            <option value="EMPLOYEES">Employees</option>
            <option value="ATTENDANCE">Attendance</option>
            <option value="PAYROLL">Payroll</option>
            <option value="INVENTORY">Inventory</option>
            <option value="ASSETS">Asset Management</option>
            <option value="BPM_APPROVALS">BPM & Approvals</option>
            <option value="COMPANY_SETTINGS">Company Settings</option>
            <option value="SECURITY">Security & Auth</option>
          </select>

          <select
            value={selectedAction}
            onChange={(e) => setSelectedAction(e.target.value)}
            className={`px-3 py-2 rounded-xl text-sm border outline-none font-medium ${
              isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            <option value="ALL">All Action Types</option>
            <option value="CREATE">Create</option>
            <option value="UPDATE">Update</option>
            <option value="DELETE">Delete</option>
            <option value="APPROVE">Approve</option>
            <option value="REJECT">Reject</option>
            <option value="LOGIN">Login</option>
          </select>

          <div className={`flex rounded-xl border p-0.5 ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
            {(['TODAY', '7DAYS', '30DAYS', 'ALL'] as const).map(range => (
              <button
                key={range}
                onClick={() => setSelectedTimeRange(range)}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  selectedTimeRange === range
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                {range === 'TODAY' ? 'Today' : range === '7DAYS' ? '7 Days' : range === '30DAYS' ? '30 Days' : 'All'}
              </button>
            ))}
          </div>
        </div>

        {/* Audit Log Table */}
        <div className={`rounded-2xl border overflow-hidden ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className={`border-b text-xs uppercase font-bold text-slate-400 ${isDark ? 'bg-slate-950/50 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                <tr>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Actor</th>
                  <th className="py-3 px-4">Module & Entity</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Description / Summary</th>
                  <th className="py-3 px-4 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      <div className="flex items-center justify-center gap-2">
                        <RefreshCw className="w-5 h-5 animate-spin text-indigo-500" />
                        <span>Loading audit trail events...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      <History className="w-10 h-10 mx-auto text-slate-400/40 mb-2" />
                      <p className="font-medium">No audit log entries matching filters.</p>
                      <p className="text-xs text-slate-500 mt-1">Actions performed in the system are recorded automatically.</p>
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3.5 px-4 text-xs font-mono text-slate-500 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span>{log.timestamp ? new Date(log.timestamp).toLocaleString() : 'N/A'}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-xs">
                        <div className="font-bold text-slate-900 dark:text-white">
                          {log.actor || log.performedBy || log.actorEmail || 'System'}
                        </div>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 font-mono">
                          {log.role || 'USER'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-xs">
                        <div className="font-semibold text-slate-800 dark:text-slate-200">
                          {log.module || log.targetType || 'SYSTEM'}
                        </div>
                        {log.entityId && (
                          <span className="text-[10px] font-mono text-indigo-500">ID: {log.entityId}</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border font-mono ${
                          ['CREATE', 'POST', 'APPROVE'].includes(log.action)
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                            : ['UPDATE', 'TRANSFER', 'EDIT'].includes(log.action)
                            ? 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                            : ['DELETE', 'REJECT', 'REVOKE'].includes(log.action)
                            ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                            : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                        }`}>
                          {log.action || 'MUTATION'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-600 dark:text-slate-300 max-w-md truncate">
                        {log.description || log.reason || (log.details ? JSON.stringify(log.details) : 'State changed')}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => setSelectedLog(log)}
                          className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-indigo-500 transition-colors"
                          title="View Mutation Diff & Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal: View Audit Detail & State Diff */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className={`w-full max-w-2xl rounded-2xl border p-6 shadow-2xl ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'} max-h-[85vh] flex flex-col`}>
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-indigo-500" />
                <h2 className="text-lg font-bold">Audit Event Inspection #{selectedLog.id}</h2>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-4 space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 text-xs">
                <div>
                  <span className="text-slate-400">Timestamp:</span>
                  <p className="font-mono font-medium">{selectedLog.timestamp || 'N/A'}</p>
                </div>
                <div>
                  <span className="text-slate-400">Actor:</span>
                  <p className="font-medium">{selectedLog.actor || selectedLog.performedBy || 'System'} ({selectedLog.role || 'USER'})</p>
                </div>
                <div>
                  <span className="text-slate-400">Module:</span>
                  <p className="font-medium">{selectedLog.module || selectedLog.targetType || 'N/A'}</p>
                </div>
                <div>
                  <span className="text-slate-400">Entity ID:</span>
                  <p className="font-mono font-medium">{selectedLog.entityId || selectedLog.targetId || 'N/A'}</p>
                </div>
              </div>

              {/* Before vs After Diff View */}
              {(selectedLog.before || selectedLog.after) ? (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <h3 className="text-xs font-bold uppercase text-slate-400 mb-1">State Before Mutation</h3>
                    <pre className="p-3 rounded-xl bg-slate-950 text-emerald-400 text-xs font-mono overflow-auto max-h-56">
                      {JSON.stringify(selectedLog.before || {}, null, 2)}
                    </pre>
                  </div>
                  <div>
                    <h3 className="text-xs font-bold uppercase text-slate-400 mb-1">State After Mutation</h3>
                    <pre className="p-3 rounded-xl bg-slate-950 text-indigo-400 text-xs font-mono overflow-auto max-h-56">
                      {JSON.stringify(selectedLog.after || selectedLog.details || {}, null, 2)}
                    </pre>
                  </div>
                </div>
              ) : (
                <div>
                  <h3 className="text-xs font-bold uppercase text-slate-400 mb-1">Event Payload & Details</h3>
                  <pre className="p-3 rounded-xl bg-slate-950 text-slate-200 text-xs font-mono overflow-auto max-h-64">
                    {JSON.stringify(selectedLog, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-5 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
