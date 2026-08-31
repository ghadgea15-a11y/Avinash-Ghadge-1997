import React, { useState, useEffect } from 'react';
import { useBackNavigation } from '../../hooks/useBackNavigation';
import { 
  LifeBuoy, 
  ArrowLeft, 
  RefreshCw, 
  ShieldAlert, 
  ShieldCheck, 
  Clock, 
  Building2, 
  User, 
  KeyRound, 
  Plus, 
  AlertCircle, 
  X, 
  CheckCircle2,
  Trash2,
  Lock,
  Eye,
  Edit3
} from 'lucide-react';
import { UserSession, PhaseAScreen } from '../../types';
import { SupportAccessSessionRecord, TenantData } from '../../types/platform';
import { SuperAdminService } from '../../services/superAdminService';
import { useTheme } from '../../context/ThemeContext';
import { useFeedback } from '../../context/ActionFeedbackContext';

interface SuperAdminSupportScreenProps {
  currentSession: UserSession;
  onNavigate: (screen: PhaseAScreen) => void;
}

export const SuperAdminSupportScreen: React.FC<SuperAdminSupportScreenProps> = ({
  currentSession,
  onNavigate
}) => {
  const { isDark } = useTheme();
  const { showSuccess, showError } = useFeedback();

  const [sessions, setSessions] = useState<SupportAccessSessionRecord[]>([]);
  const [tenants, setTenants] = useState<TenantData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  useBackNavigation(!!showModal, () => setShowModal(null as any), 'showModal');

  // New session state
  const [targetCompanyId, setTargetCompanyId] = useState('');
  const [justificationReason, setJustificationReason] = useState('');
  const [accessScope, setAccessScope] = useState<'READ_ONLY' | 'SUPPORT_MUTATION'>('READ_ONLY');
  const [durationMinutes, setDurationMinutes] = useState<number>(30);
  const [submitting, setSubmitting] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [sessionsData, tenantsData] = await Promise.all([
        SuperAdminService.getActiveSupportSessions(),
        SuperAdminService.getAllTenants()
      ]);
      setSessions(sessionsData);
      setTenants(tenantsData);
    } catch (err) {
      console.error('[SuperAdminSupportScreen] Failed to load support sessions:', err);
      showError('Failed to load support access sessions');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetCompanyId) {
      showError('Please select a target tenant company');
      return;
    }
    if (!justificationReason.trim() || justificationReason.trim().length < 8) {
      showError('Mandatory audit justification must be at least 8 characters');
      return;
    }

    setSubmitting(true);
    try {
      const selectedTenant = tenants.find(t => t.id === targetCompanyId);
      await SuperAdminService.createSupportAccessSession({
        superAdminUid: currentSession.uid || (currentSession as any).userId || 'PLATFORM_SUPER_ADMIN',
        superAdminEmail: currentSession.email || 'superadmin@platform.com',
        targetCompanyId,
        targetCompanyName: selectedTenant?.name || targetCompanyId,
        reason: justificationReason.trim(),
        scope: accessScope,
        durationMinutes
      });

      showSuccess(`Support session authorized for ${durationMinutes} minutes`);
      setShowModal(false);
      setJustificationReason('');
      setTargetCompanyId('');
      loadData();
    } catch (err: any) {
      console.error('[SuperAdminSupportScreen] Failed to create session:', err);
      showError(err.message || 'Failed to create support session');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRevokeSession = async (sessionId: string, companyId: string) => {
    try {
      await SuperAdminService.revokeSupportAccessSession(
        sessionId,
        currentSession.uid,
        currentSession.email || 'superadmin@platform.com',
        'Revoked manually by Super Admin from control plane'
      );
      showSuccess('Support session revoked immediately');
      loadData();
    } catch (err: any) {
      console.error('[SuperAdminSupportScreen] Failed to revoke session:', err);
      showError('Failed to revoke session');
    }
  };

  const isExpired = (session: SupportAccessSessionRecord) => {
    return new Date(session.expiresAt).getTime() < Date.now();
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
              <h1 className="text-xl font-bold tracking-tight">Controlled Support Access & Impersonation</h1>
              <span className="bg-amber-500/10 text-amber-500 text-xs font-semibold px-2.5 py-0.5 rounded-full border border-amber-500/20">
                Audited Boundary
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Strictly audited, time-bounded support sessions for tenant diagnostics without bypassing RBAC.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white transition shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Grant Support Access</span>
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

      {/* Security Governance Notice */}
      <div className={`p-4 rounded-2xl border ${isDark ? 'bg-indigo-950/20 border-indigo-900/40 text-indigo-200' : 'bg-indigo-50 border-indigo-200 text-indigo-900'} text-xs flex items-start gap-3`}>
        <ShieldAlert className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-bold">Principle of Least Privilege & Immutable Audit Contract</p>
          <p className="text-[11px] opacity-80">
            Super Admins are NOT members of any tenant company. When initiating support troubleshooting, an ephemeral session token with explicit reason is cryptographically recorded. Read-only access expires automatically.
          </p>
        </div>
      </div>

      {/* Active Support Sessions Table */}
      <div className={`rounded-2xl border overflow-hidden ${isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <h3 className="font-bold text-sm flex items-center gap-2">
            <Clock className="w-4 h-4 text-indigo-500" />
            Active & Recent Support Access Sessions
          </h3>
          <span className="text-xs text-slate-400">
            {sessions.filter(s => s.status === 'ACTIVE' && !isExpired(s)).length} active sessions
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className={`border-b ${isDark ? 'bg-slate-950/60 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-600'} font-semibold uppercase tracking-wider`}>
              <tr>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Target Tenant</th>
                <th className="py-3 px-4">Scope</th>
                <th className="py-3 px-4">Operator</th>
                <th className="py-3 px-4">Granted At</th>
                <th className="py-3 px-4">Expires At</th>
                <th className="py-3 px-4">Reason</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isDark ? 'divide-slate-800/60 text-slate-300' : 'divide-slate-100 text-slate-700'}`}>
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-500" />
                    Loading support sessions...
                  </td>
                </tr>
              ) : sessions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <CheckCircle2 className="w-8 h-8 mx-auto mb-2 opacity-40 text-emerald-500" />
                    No active or historical support sessions found.
                  </td>
                </tr>
              ) : (
                sessions.map((session) => {
                  const expired = isExpired(session);
                  const active = session.status === 'ACTIVE' && !expired;

                  return (
                    <tr key={session.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md font-mono text-[10px] font-bold ${
                          active 
                            ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                            : 'bg-slate-500/10 text-slate-400 border border-slate-500/20'
                        }`}>
                          {active ? 'ACTIVE' : session.status === 'REVOKED' ? 'REVOKED' : 'EXPIRED'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 font-bold">
                          <Building2 className="w-3.5 h-3.5 text-cyan-500" />
                          <span>{session.targetCompanyName || session.targetCompanyId}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className={`font-mono text-[11px] font-semibold ${
                          session.scope === 'SUPPORT_MUTATION' ? 'text-amber-500' : 'text-indigo-400'
                        }`}>
                          {session.scope}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap text-slate-400">
                        {session.superAdminEmail}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap font-mono text-[11px] text-slate-400">
                        {session.createdAt ? new Date(session.createdAt).toLocaleTimeString() : '--'}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap font-mono text-[11px] text-slate-400">
                        {session.expiresAt ? new Date(session.expiresAt).toLocaleTimeString() : '--'}
                      </td>
                      <td className="py-3.5 px-4 max-w-[200px] truncate text-slate-400">
                        {session.reason}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        {active && (
                          <button
                            onClick={() => handleRevokeSession(session.id, session.targetCompanyId)}
                            className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-rose-500/10 text-rose-500 border border-rose-500/20 hover:bg-rose-500 hover:text-white transition"
                          >
                            Revoke Now
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

      {/* Grant Support Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className={`w-full max-w-lg rounded-2xl border shadow-2xl p-6 ${
            isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="flex items-center justify-between border-b pb-4 mb-4 border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <LifeBuoy className="w-5 h-5 text-indigo-500" />
                <h3 className="font-bold text-base">Authorize Support Session</h3>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <form onSubmit={handleCreateSession} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold mb-1 text-slate-300">Target Tenant Company *</label>
                <select
                  value={targetCompanyId}
                  onChange={(e) => setTargetCompanyId(e.target.value)}
                  required
                  className={`w-full p-2.5 rounded-xl border outline-none cursor-pointer ${
                    isDark ? 'bg-slate-950 border-slate-800 text-slate-100' : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}
                >
                  <option value="">-- Select Company --</option>
                  {tenants.map(t => (
                    <option key={t.id} value={t.id}>{t.name} ({t.id})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold mb-1 text-slate-300">Access Scope *</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setAccessScope('READ_ONLY')}
                    className={`p-3 rounded-xl border flex items-center gap-2 text-left transition ${
                      accessScope === 'READ_ONLY'
                        ? 'border-indigo-500 bg-indigo-500/10 text-indigo-400 font-bold'
                        : isDark ? 'border-slate-800 bg-slate-950 text-slate-400' : 'border-slate-200 bg-slate-50 text-slate-600'
                    }`}
                  >
                    <Eye className="w-4 h-4" />
                    <div>
                      <div>Read Only</div>
                      <div className="text-[10px] font-normal opacity-70">Inspect logs & config</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAccessScope('SUPPORT_MUTATION')}
                    className={`p-3 rounded-xl border flex items-center gap-2 text-left transition ${
                      accessScope === 'SUPPORT_MUTATION'
                        ? 'border-amber-500 bg-amber-500/10 text-amber-400 font-bold'
                        : isDark ? 'border-slate-800 bg-slate-950 text-slate-400' : 'border-slate-200 bg-slate-50 text-slate-600'
                    }`}
                  >
                    <Edit3 className="w-4 h-4" />
                    <div>
                      <div>Support Mutation</div>
                      <div className="text-[10px] font-normal opacity-70">Fix corrupted states</div>
                    </div>
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-semibold mb-1 text-slate-300">Session Duration *</label>
                <div className="grid grid-cols-4 gap-2">
                  {[15, 30, 60, 240].map(mins => (
                    <button
                      key={mins}
                      type="button"
                      onClick={() => setDurationMinutes(mins)}
                      className={`py-2 rounded-xl border text-center font-bold transition ${
                        durationMinutes === mins
                          ? 'border-indigo-500 bg-indigo-500/10 text-indigo-400'
                          : isDark ? 'border-slate-800 bg-slate-950 text-slate-400' : 'border-slate-200 bg-slate-50 text-slate-600'
                      }`}
                    >
                      {mins < 60 ? `${mins}m` : `${mins / 60}h`}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-semibold mb-1 text-slate-300">Audit Justification & Ticket ID *</label>
                <textarea
                  value={justificationReason}
                  onChange={(e) => setJustificationReason(e.target.value)}
                  placeholder="e.g. Investigating biometric sync timeout ticket #SUP-8819 requested by company admin"
                  rows={3}
                  required
                  className={`w-full p-2.5 rounded-xl border outline-none ${
                    isDark ? 'bg-slate-950 border-slate-800 text-slate-100' : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white transition shadow-sm flex items-center gap-1.5"
                >
                  {submitting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />}
                  <span>Authorize Support Session</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
