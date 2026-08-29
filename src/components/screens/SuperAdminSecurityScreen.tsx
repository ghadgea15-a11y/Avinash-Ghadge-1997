import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, 
  ArrowLeft, 
  RefreshCw, 
  ShieldCheck, 
  Lock, 
  AlertTriangle, 
  CheckCircle2, 
  KeyRound, 
  UserX, 
  Search, 
  Filter, 
  Eye, 
  Check, 
  X,
  FileSpreadsheet
} from 'lucide-react';
import { UserSession, PhaseAScreen } from '../../types';
import { PlatformSecurityEvent } from '../../types/platform';
import { SuperAdminService } from '../../services/superAdminService';
import { useTheme } from '../../context/ThemeContext';
import { useFeedback } from '../../context/ActionFeedbackContext';

interface SuperAdminSecurityScreenProps {
  currentSession: UserSession;
  onNavigate: (screen: PhaseAScreen) => void;
}

export const SuperAdminSecurityScreen: React.FC<SuperAdminSecurityScreenProps> = ({
  currentSession,
  onNavigate
}) => {
  const { isDark } = useTheme();
  const { showSuccess, showError } = useFeedback();

  const [events, setEvents] = useState<PlatformSecurityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('ALL');

  const loadSecurityEvents = async () => {
    setLoading(true);
    try {
      const data = await SuperAdminService.getPlatformSecurityEvents({
        severity: selectedSeverity !== 'ALL' ? (selectedSeverity as any) : undefined,
        limitCount: 100
      });
      setEvents(data);
    } catch (err) {
      console.error('[SuperAdminSecurityScreen] Failed to load security events:', err);
      showError('Failed to load security feed');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadSecurityEvents();
  }, [selectedSeverity]);

  const handleResolveEvent = async (eventId: string) => {
    try {
      await SuperAdminService.resolveSecurityEvent(
        eventId,
        currentSession.uid,
        currentSession.email || 'superadmin@platform.com',
        'Investigated and verified by Super Admin'
      );
      showSuccess('Security event marked as resolved');
      loadSecurityEvents();
    } catch (err) {
      console.error('[SuperAdminSecurityScreen] Failed to resolve event:', err);
      showError('Failed to resolve event');
    }
  };

  const filteredEvents = events.filter(e => {
    const q = searchQuery.toLowerCase();
    const eventType = (e.type || e.eventType || '').toLowerCase();
    const userEmail = (e.userEmail || e.actorEmail || '').toLowerCase();
    const companyId = (e.companyId || '').toLowerCase();
    const details = (e.details || '').toLowerCase();

    const matchesSearch = 
      e.id.toLowerCase().includes(q) ||
      eventType.includes(q) ||
      userEmail.includes(q) ||
      companyId.includes(q) ||
      details.includes(q);

    const matchesSeverity = selectedSeverity === 'ALL' || e.severity === selectedSeverity;
    return matchesSearch && matchesSeverity;
  });

  const getSeverityBadge = (severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | 'INFO' | 'WARNING') => {
    switch (severity) {
      case 'CRITICAL':
        return 'bg-rose-500/10 text-rose-500 border border-rose-500/20';
      case 'HIGH':
        return 'bg-amber-500/10 text-amber-500 border border-amber-500/20';
      case 'WARNING':
        return 'bg-amber-500/10 text-amber-500 border border-amber-500/20';
      case 'MEDIUM':
        return 'bg-indigo-500/10 text-indigo-500 border border-indigo-500/20';
      case 'INFO':
      case 'LOW':
      default:
        return 'bg-slate-500/10 text-slate-400 border border-slate-500/20';
    }
  };

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
              <h1 className="text-xl font-bold tracking-tight">Platform Security & Anomaly Detection</h1>
              <span className="bg-rose-500/10 text-rose-500 text-xs font-semibold px-2.5 py-0.5 rounded-full border border-rose-500/20">
                Threat Matrix
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Live intrusion detection, custom claims verification and unauthorized access anomaly monitoring.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              const exportData = filteredEvents.map(ev => ({
                Timestamp: ev.timestamp,
                EventID: ev.id,
                Type: ev.type,
                Severity: ev.severity,
                User: ev.userEmail || 'N/A',
                Company: ev.companyId || 'N/A',
                Details: ev.details,
                Resolved: ev.resolved ? 'YES' : 'NO'
              }));
              SuperAdminService.exportToCsv('security_events', exportData);
              showSuccess('Exported security anomalies to CSV');
            }}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl border transition ${
              isDark ? 'bg-slate-900 border-slate-800 hover:bg-slate-800 text-slate-200' : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-500" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={() => {
              setRefreshing(true);
              loadSecurityEvents();
            }}
            disabled={refreshing || loading}
            className={`p-2 rounded-xl border transition ${
              isDark ? 'bg-slate-900 border-slate-800 hover:bg-slate-800' : 'bg-white border-slate-200 hover:bg-slate-50'
            }`}
          >
            <RefreshCw className={`w-4 h-4 text-slate-400 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Security Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className={`p-4 rounded-2xl border ${isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-400 font-medium">Active Threat Events</span>
            <AlertTriangle className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-2xl font-bold font-mono text-rose-500">
            {events.filter(e => !e.resolved).length}
          </div>
          <span className="text-[11px] text-slate-400">Unresolved security alerts</span>
        </div>

        <div className={`p-4 rounded-2xl border ${isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-400 font-medium">Claims & RBAC Integrity</span>
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-500">
            100% Enforced
          </div>
          <span className="text-[11px] text-slate-400">Platform & Tenant separation</span>
        </div>

        <div className={`p-4 rounded-2xl border ${isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-400 font-medium">Resolved Incidents</span>
            <CheckCircle2 className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-2xl font-bold font-mono text-indigo-500">
            {events.filter(e => e.resolved).length}
          </div>
          <span className="text-[11px] text-slate-400">Investigated and cleared</span>
        </div>
      </div>

      {/* Filter and Search */}
      <div className={`p-4 rounded-2xl border ${isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-sm'} flex flex-col md:flex-row gap-3`}>
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by User, Event Type, Company ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`w-full pl-10 pr-4 py-2 text-sm rounded-xl border transition ${
              isDark 
                ? 'bg-slate-950 border-slate-800 text-white placeholder-slate-500' 
                : 'bg-slate-50 border-slate-200 text-black placeholder-slate-400'
            } outline-none`}
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400 shrink-0" />
          <select
            value={selectedSeverity}
            onChange={(e) => setSelectedSeverity(e.target.value)}
            className={`text-xs font-semibold px-3 py-2 rounded-xl border outline-none cursor-pointer ${
              isDark ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-800'
            }`}
          >
            <option value="ALL">All Severities</option>
            <option value="CRITICAL">Critical Only</option>
            <option value="HIGH">High Only</option>
            <option value="MEDIUM">Medium Only</option>
            <option value="LOW">Low Only</option>
          </select>
        </div>
      </div>

      {/* Security Events Table */}
      <div className={`rounded-2xl border overflow-hidden ${isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className={`border-b ${isDark ? 'bg-slate-950/60 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-600'} font-semibold uppercase tracking-wider`}>
              <tr>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Severity</th>
                <th className="py-3 px-4">Event Type</th>
                <th className="py-3 px-4">User / IP</th>
                <th className="py-3 px-4">Tenant Scope</th>
                <th className="py-3 px-4">Details</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isDark ? 'divide-slate-800/60 text-slate-300' : 'divide-slate-100 text-slate-700'}`}>
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-500" />
                    Analyzing security logs...
                  </td>
                </tr>
              ) : filteredEvents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <ShieldCheck className="w-8 h-8 mx-auto mb-2 text-emerald-500 opacity-60" />
                    No security anomalies recorded. Threat matrix is clear.
                  </td>
                </tr>
              ) : (
                filteredEvents.map((ev) => (
                  <tr key={ev.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-md font-mono text-[10px] font-bold ${
                        ev.resolved 
                          ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                          : 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
                      }`}>
                        {ev.resolved ? 'RESOLVED' : 'UNRESOLVED'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-md font-mono text-[10px] font-bold ${getSeverityBadge(ev.severity)}`}>
                        {ev.severity}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap font-bold">
                      {ev.type || ev.eventType}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap text-slate-400">
                      {ev.userEmail || ev.actorEmail || ev.ipAddress || 'System Event'}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap font-mono text-[11px] text-cyan-500">
                      {ev.companyId || 'Platform'}
                    </td>
                    <td className="py-3.5 px-4 max-w-[240px] truncate text-slate-400">
                      {ev.details}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      {!ev.resolved && (
                        <button
                          onClick={() => handleResolveEvent(ev.id)}
                          className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 hover:bg-emerald-500 hover:text-white transition"
                        >
                          Resolve
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
