import React, { useState, useEffect } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase';
import { useBackNavigation } from '../../hooks/useBackNavigation';
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
  FileSpreadsheet,
  Unlock,
  Play,
  Flame,
  Shield,
  Clock
} from 'lucide-react';
import { UserSession, PhaseAScreen } from '../../types';
import { PlatformSecurityEvent } from '../../types/platform';
import { SuperAdminService } from '../../services/superAdminService';
import { AccountProtectionService, AccountLockRecord } from '../../services/accountProtectionService';
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
  const [lockedAccounts, setLockedAccounts] = useState<AccountLockRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('ALL');
  
  // Interactive Simulation State
  const [simTenant, setSimTenant] = useState('T-APEX');
  const [simUser, setSimUser] = useState('emp_apex_01@apex.com');
  const [simulating, setSimulating] = useState(false);
  const [simResults, setSimResults] = useState<Array<{ attempt: number; message: string; locked: boolean }>>([]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [eventsData, locks] = await Promise.all([
        SuperAdminService.getPlatformSecurityEvents({
          severity: selectedSeverity !== 'ALL' ? (selectedSeverity as any) : undefined,
          limitCount: 100
        }),
        AccountProtectionService.getLockedAccounts()
      ]);
      setEvents(eventsData);
      setLockedAccounts(locks);
    } catch (err) {
      console.error('[SuperAdminSecurityScreen] Failed to load security data:', err);
      showError('Failed to load security feed');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedSeverity]);

  // Real-time Firestore sync for instant threat detection
  useEffect(() => {
    let isMounted = true;
    let unsub: (() => void) | null = null;
    try {
      const colRef = collection(db, 'platform_security_events');
      unsub = onSnapshot(colRef, (snapshot) => {
        if (!isMounted) return;
        const liveList: PlatformSecurityEvent[] = snapshot.docs.map(docSnap => {
          const data = docSnap.data();
          return {
            id: docSnap.id,
            eventType: data.eventType || data.type || 'UNAUTHORIZED_ACCESS_ATTEMPT',
            type: data.type || data.eventType || 'UNAUTHORIZED_ACCESS_ATTEMPT',
            severity: data.severity || 'WARNING',
            actorEmail: data.actorEmail || data.userEmail || '',
            userEmail: data.userEmail || data.actorEmail || '',
            companyId: data.companyId || '',
            details: data.details || '',
            resolved: data.resolved || false,
            timestamp: data.timestamp || new Date().toISOString()
          };
        });
        liveList.sort((a, b) => new Date(b.timestamp as string).getTime() - new Date(a.timestamp as string).getTime());
        setEvents(liveList);

        // Also refresh locked accounts
        AccountProtectionService.getLockedAccounts().then(l => {
          if (isMounted) setLockedAccounts(l);
        }).catch(() => {});
      });
    } catch (e) {
      console.warn('[SuperAdminSecurityScreen] Real-time snapshot listener notice:', e);
    }

    return () => {
      isMounted = false;
      if (unsub) unsub();
    };
  }, []);

  const handleResolveEvent = async (eventId: string) => {
    try {
      await SuperAdminService.resolveSecurityEvent(
        eventId,
        currentSession.uid,
        currentSession.email || 'superadmin@platform.com',
        'Investigated and verified by Super Admin'
      );
      showSuccess('Security event marked as resolved');
      loadData();
    } catch (err) {
      console.error('[SuperAdminSecurityScreen] Failed to resolve event:', err);
      showError('Failed to resolve event');
    }
  };

  const handleUnlockAccount = async (companyId: string, identifier: string) => {
    try {
      await AccountProtectionService.unlockAccount(
        companyId, 
        identifier, 
        currentSession.email || 'SUPER_ADMIN'
      );
      showSuccess(`Account unlocked for ${identifier}`);
      setSimResults([]);
      await loadData();
    } catch (err: any) {
      console.error('[SuperAdminSecurityScreen] Unlock error:', err);
      showError(err.message || 'Failed to unlock account');
    }
  };

  // Run Real-Time Failed Login / Brute Force Anomaly Simulation
  const handleSimulateFailedLogin = async () => {
    setSimulating(true);
    try {
      const res = await AccountProtectionService.recordFailedLogin(simTenant, simUser, 'simulated-ip');
      setSimResults(prev => [
        ...prev, 
        { attempt: res.failedCount, message: res.message, locked: res.locked }
      ]);
      if (res.locked) {
        showSuccess(`Account locked! Security Alarm triggered for ${simUser}.`);
      } else {
        showSuccess(`Attempt ${res.failedCount} recorded: ${res.remainingAttempts} attempt(s) remaining.`);
      }
      await loadData();
    } catch (err: any) {
      showError(err.message || 'Simulation error');
    } finally {
      setSimulating(false);
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

  const activeAlarms = events.filter(e => !e.resolved && (e.severity === 'HIGH' || e.severity === 'CRITICAL'));

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
                Threat Matrix & Brute-Force Guard
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Live intrusion alarms, progressive login lockout (15-min freeze), and tenant security anomalies.
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
              loadData();
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

      {/* Active Alarms & Threat Alert Banner */}
      {activeAlarms.length > 0 && (
        <div className="p-4 rounded-2xl bg-rose-950/40 border-2 border-rose-500/60 shadow-lg shadow-rose-950/30 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start md:items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-rose-500/20 border border-rose-500/50 text-rose-400 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5 text-rose-400 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-extrabold tracking-wider uppercase bg-rose-600 text-white shadow-sm">
                  ACTIVE SECURITY ALARM
                </span>
                <span className="text-xs text-rose-300 font-bold">
                  {activeAlarms.length} High/Critical Threat{activeAlarms.length > 1 ? 's' : ''} Require Investigation
                </span>
              </div>
              <p className="text-xs text-slate-200 mt-1">
                Latest Threat: <span className="font-semibold text-rose-200">{activeAlarms[0].details || activeAlarms[0].type}</span>
                {activeAlarms[0].companyId && <span className="ml-1.5 px-1.5 py-0.5 rounded bg-rose-900/60 border border-rose-700/50 font-mono text-[11px] text-rose-300">Tenant: {activeAlarms[0].companyId}</span>}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 self-end md:self-auto shrink-0">
            <button
              onClick={() => handleResolveEvent(activeAlarms[0].id)}
              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1 shadow transition"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Acknowledge & Resolve</span>
            </button>
          </div>
        </div>
      )}

      {/* Security Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className={`p-4 rounded-2xl border ${isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-400 font-medium">Active Threat Events</span>
            <AlertTriangle className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-2xl font-bold font-mono text-rose-500">
            {events.filter(e => !e.resolved).length}
          </div>
          <span className="text-xs text-slate-400">Unresolved security alerts</span>
        </div>

        <div className={`p-4 rounded-2xl border ${isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-400 font-medium">Locked Accounts</span>
            <Lock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold font-mono text-amber-500">
            {lockedAccounts.length}
          </div>
          <span className="text-xs text-slate-400">Temporary freeze (15 mins)</span>
        </div>

        <div className={`p-4 rounded-2xl border ${isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-400 font-medium">Claims & RBAC Integrity</span>
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-500">
            100% Enforced
          </div>
          <span className="text-xs text-slate-400">Platform & Tenant separation</span>
        </div>

        <div className={`p-4 rounded-2xl border ${isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-400 font-medium">Resolved Incidents</span>
            <CheckCircle2 className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-2xl font-bold font-mono text-indigo-500">
            {events.filter(e => e.resolved).length}
          </div>
          <span className="text-xs text-slate-400">Investigated and cleared</span>
        </div>
      </div>

      {/* Account Lockouts Panel & Simulator */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Currently Locked Accounts */}
        <div className={`p-5 rounded-2xl border ${isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-sm'} flex flex-col justify-between`}>
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Lock className="w-5 h-5 text-amber-500" />
                <h2 className="text-sm font-bold">Temporarily Locked User Accounts</h2>
              </div>
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-500 border border-amber-500/30">
                {lockedAccounts.length} Locked
              </span>
            </div>
            <p className="text-xs text-slate-400 mb-3">
              Accounts frozen for 15 minutes after 3 consecutive failed password or PIN attempts to protect against brute-force attacks.
            </p>

            {lockedAccounts.length === 0 ? (
              <div className="py-6 text-center text-slate-400 border border-dashed border-slate-800/80 rounded-xl">
                <ShieldCheck className="w-6 h-6 mx-auto mb-1 text-emerald-500 opacity-60" />
                <span className="text-xs">No accounts are currently locked.</span>
              </div>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {lockedAccounts.map((lock, idx) => {
                  const remainingMinutes = lock.lockedUntil 
                    ? Math.max(1, Math.ceil((new Date(lock.lockedUntil).getTime() - Date.now()) / 60000))
                    : 15;
                  return (
                    <div 
                      key={idx} 
                      className={`p-3 rounded-xl border flex items-center justify-between gap-3 ${
                        isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-200">{lock.identifier}</span>
                          <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                            {lock.companyId}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                          <span className="text-rose-400 font-semibold">{lock.failedCount} Failed Attempts</span>
                          <span>•</span>
                          <span className="flex items-center gap-1 text-amber-400">
                            <Clock className="w-3 h-3" />
                            {remainingMinutes} min remaining
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => handleUnlockAccount(lock.companyId, lock.identifier)}
                        className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-amber-500/10 hover:bg-amber-500 text-amber-400 hover:text-white border border-amber-500/30 transition flex items-center gap-1"
                      >
                        <Unlock className="w-3.5 h-3.5" />
                        <span>Unlock</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Live Anomaly Detection Test Simulator */}
        <div className={`p-5 rounded-2xl border ${isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Flame className="w-5 h-5 text-rose-500" />
              <h2 className="text-sm font-bold">Failed Login & Anomaly Test Simulator</h2>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/30">
              Live Interactive Verification
            </span>
          </div>
          <p className="text-xs text-slate-400 mb-3">
            Trigger simulated failed PIN/password logins to verify real-time event logging, temporary lockout at 3 attempts, and platform security alarms.
          </p>

          <div className="grid grid-cols-2 gap-2 mb-3">
            <div>
              <label className="text-[11px] text-slate-400 font-semibold block mb-1">Target Tenant</label>
              <input
                type="text"
                value={simTenant}
                onChange={(e) => setSimTenant(e.target.value)}
                className={`w-full px-2.5 py-1.5 text-xs font-mono rounded-lg border outline-none ${
                  isDark ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-800'
                }`}
              />
            </div>
            <div>
              <label className="text-[11px] text-slate-400 font-semibold block mb-1">User Identifier</label>
              <input
                type="text"
                value={simUser}
                onChange={(e) => setSimUser(e.target.value)}
                className={`w-full px-2.5 py-1.5 text-xs font-mono rounded-lg border outline-none ${
                  isDark ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-800'
                }`}
              />
            </div>
          </div>

          <div className="flex items-center gap-2 mb-3">
            <button
              onClick={handleSimulateFailedLogin}
              disabled={simulating}
              className="flex-1 py-2 px-3 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white flex items-center justify-center gap-1.5 shadow transition disabled:opacity-50"
            >
              <Play className="w-3.5 h-3.5" />
              <span>Simulate 1 Failed Login Attempt</span>
            </button>
            <button
              onClick={() => handleUnlockAccount(simTenant, simUser)}
              className="py-2 px-3 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 flex items-center gap-1 transition"
            >
              <Unlock className="w-3.5 h-3.5" />
              <span>Reset & Unlock</span>
            </button>
          </div>

          {simResults.length > 0 && (
            <div className={`p-2.5 rounded-xl border text-xs space-y-1 max-h-28 overflow-y-auto ${
              isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}>
              {simResults.map((r, i) => (
                <div key={i} className="flex items-start gap-2 font-mono text-[11px]">
                  <span className={`px-1 rounded font-bold ${r.locked ? 'bg-rose-500/20 text-rose-400' : 'bg-amber-500/20 text-amber-400'}`}>
                    Attempt #{r.attempt}
                  </span>
                  <span className={r.locked ? 'text-rose-300 font-bold' : 'text-slate-300'}>
                    {r.message}
                  </span>
                </div>
              ))}
            </div>
          )}
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
            <option value="WARNING">Warning Only</option>
            <option value="MEDIUM">Medium Only</option>
            <option value="LOW">Low Only</option>
          </select>
        </div>
      </div>

      {/* Security Events Table */}
      <div className={`rounded-2xl border overflow-hidden ${isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className={`border-b ${isDark ? 'bg-slate-950/60 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-600'} font-semibold uppercase tracking-wider`}>
              <tr>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Severity</th>
                <th className="py-3 px-4">Event Type</th>
                <th className="py-3 px-4">User / IP</th>
                <th className="py-3 px-4">Tenant Scope</th>
                <th className="py-3 px-4">Details</th>
                <th className="py-3 px-4 text-right">Actions</th>
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
                filteredEvents.map((ev) => {
                  const isLockedAccount = lockedAccounts.some(
                    l => l.identifier.toLowerCase() === (ev.userEmail || ev.actorEmail || '').toLowerCase()
                  );

                  return (
                    <tr key={ev.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md font-mono text-[11px] font-bold ${
                          ev.resolved 
                            ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                            : 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
                        }`}>
                          {ev.resolved ? 'RESOLVED' : 'UNRESOLVED'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md font-mono text-[11px] font-bold ${getSeverityBadge(ev.severity)}`}>
                          {ev.severity}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap font-bold flex items-center gap-1.5">
                        {ev.type || ev.eventType}
                        {isLockedAccount && (
                          <span className="px-1.5 py-0.5 text-[9px] font-extrabold bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded">
                            LOCKED
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap text-slate-400">
                        {ev.userEmail || ev.actorEmail || ev.ipAddress || 'System Event'}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap font-mono text-xs text-cyan-500">
                        {ev.companyId || 'Platform'}
                      </td>
                      <td className="py-3.5 px-4 max-w-[240px] truncate text-slate-400">
                        {ev.details}
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap space-x-1.5">
                        {isLockedAccount && (
                          <button
                            onClick={() => handleUnlockAccount(ev.companyId || 'GLOBAL', ev.userEmail || ev.actorEmail || '')}
                            className="px-2 py-1 text-xs font-bold rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/30 hover:bg-amber-500 hover:text-white transition inline-flex items-center gap-1"
                          >
                            <Unlock className="w-3 h-3" />
                            <span>Unlock</span>
                          </button>
                        )}
                        {!ev.resolved && (
                          <button
                            onClick={() => handleResolveEvent(ev.id)}
                            className="px-2.5 py-1 text-xs font-bold rounded-lg bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 hover:bg-emerald-500 hover:text-white transition"
                          >
                            Resolve
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
