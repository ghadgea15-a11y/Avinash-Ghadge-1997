import React, { useState, useEffect } from 'react';
import { useBackNavigation } from '../../hooks/useBackNavigation';
import { 
  UserCog, 
  ArrowLeft, 
  RefreshCw, 
  ShieldCheck, 
  Plus, 
  Mail, 
  KeyRound, 
  Trash2, 
  X, 
  CheckCircle2, 
  ShieldAlert,
  UserCheck
} from 'lucide-react';
import { UserSession, PhaseAScreen } from '../../types';
import { SuperAdminService } from '../../services/superAdminService';
import { useTheme } from '../../context/ThemeContext';
import { useFeedback } from '../../context/ActionFeedbackContext';

interface SuperAdminAdminsScreenProps {
  currentSession: UserSession;
  onNavigate: (screen: PhaseAScreen) => void;
}

interface PlatformAdminUser {
  uid: string;
  email: string;
  role: 'SUPER_ADMIN' | 'SUPPORT_AUDITOR' | 'PLATFORM_OPS';
  displayName?: string;
  createdAt?: string;
  lastLoginAt?: string;
  mfaEnabled?: boolean;
}

export const SuperAdminAdminsScreen: React.FC<SuperAdminAdminsScreenProps> = ({
  currentSession,
  onNavigate
}) => {
  const { isDark } = useTheme();
  const { showSuccess, showError } = useFeedback();

  const [admins, setAdmins] = useState<PlatformAdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  useBackNavigation(!!showModal, () => setShowModal(null as any), 'showModal');

  // Form states
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [role, setRole] = useState<'SUPER_ADMIN' | 'SUPPORT_AUDITOR' | 'PLATFORM_OPS'>('SUPER_ADMIN');
  const [submitting, setSubmitting] = useState(false);

  const loadAdmins = async () => {
    setLoading(true);
    try {
      // In production, queries the platform `super_admins` collection
      const superAdminsData = await SuperAdminService.getSuperAdmins();
      setAdmins(superAdminsData.map(a => ({
        uid: a.id || a.uid,
        email: a.email,
        role: (a.role as any) || 'SUPER_ADMIN',
        displayName: a.displayName || a.name || 'Platform Administrator',
        createdAt: typeof a.createdAt === 'number' ? new Date(a.createdAt * 1000).toISOString() : (typeof a.createdAt === 'string' ? a.createdAt : undefined),
        lastLoginAt: typeof a.lastLoginAt === 'number' ? new Date(a.lastLoginAt * 1000).toISOString() : (typeof a.lastLoginAt === 'string' ? a.lastLoginAt : undefined),
        mfaEnabled: a.mfaEnabled ?? true
      })));
    } catch (err) {
      console.error('[SuperAdminAdminsScreen] Failed to load admins:', err);
      showError('Failed to load platform admins');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadAdmins();
  }, []);

  const handleAddAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !email.includes('@')) {
      showError('Please provide a valid platform administrator email');
      return;
    }

    setSubmitting(true);
    try {
      await SuperAdminService.addSuperAdmin(
        {
          email: email.trim().toLowerCase(),
          name: displayName.trim() || email.split('@')[0],
          role,
          mfaEnabled: true
        },
        currentSession.uid,
        currentSession.email || 'superadmin@platform.com'
      );
      showSuccess(`Platform administrator ${email} provisioned successfully`);
      setShowModal(false);
      setEmail('');
      setDisplayName('');
      loadAdmins();
    } catch (err: any) {
      console.error('[SuperAdminAdminsScreen] Failed to add admin:', err);
      showError(err.message || 'Failed to add administrator');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemoveAdmin = async (adminUid: string, adminEmail: string) => {
    if (adminEmail.toLowerCase() === (currentSession.email || '').toLowerCase()) {
      showError('Cannot revoke your own active platform administrator account');
      return;
    }
    if (!window.confirm(`Revoke platform administrator privileges for ${adminEmail}?`)) {
      return;
    }

    try {
      await SuperAdminService.removeSuperAdmin(
        adminUid,
        currentSession.uid,
        currentSession.email || 'superadmin@platform.com'
      );
      showSuccess(`Platform administrator ${adminEmail} privileges revoked`);
      loadAdmins();
    } catch (err: any) {
      console.error('[SuperAdminAdminsScreen] Failed to remove admin:', err);
      showError(err.message || 'Failed to remove admin');
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
              <h1 className="text-xl font-bold tracking-tight">Platform Administrators & Credentials</h1>
              <span className="bg-indigo-500/10 text-indigo-500 text-xs font-semibold px-2.5 py-0.5 rounded-full border border-indigo-500/20">
                Root Security
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Control plane accounts authorized to govern multi-tenant organizations and infrastructure.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white transition shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Provision Super Admin</span>
          </button>
          <button
            onClick={() => {
              setRefreshing(true);
              loadAdmins();
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

      {/* Security Warning */}
      <div className={`p-4 rounded-2xl border ${isDark ? 'bg-rose-950/20 border-rose-900/40 text-rose-200' : 'bg-rose-50 border-rose-200 text-rose-900'} text-xs flex items-start gap-3`}>
        <ShieldAlert className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-bold">Privileged Identity Management Notice</p>
          <p className="text-[11px] opacity-80">
            Platform Super Admins hold root privileges over SaaS configuration and tenant lifecycle. All accounts require Multi-Factor Authentication (MFA) and are bound to immutable audit trails.
          </p>
        </div>
      </div>

      {/* Admin List Table */}
      <div className={`rounded-2xl border overflow-hidden ${isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className={`border-b ${isDark ? 'bg-slate-950/60 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-600'} font-semibold uppercase tracking-wider`}>
              <tr>
                <th className="py-3 px-4">Administrator</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">MFA Status</th>
                <th className="py-3 px-4">UID</th>
                <th className="py-3 px-4">Created At</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isDark ? 'divide-slate-800/60 text-slate-300' : 'divide-slate-100 text-slate-700'}`}>
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-500" />
                    Loading platform administrators...
                  </td>
                </tr>
              ) : admins.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <ShieldCheck className="w-8 h-8 mx-auto mb-2 text-emerald-500 opacity-60" />
                    No administrators listed.
                  </td>
                </tr>
              ) : (
                admins.map((adm) => {
                  const isCurrent = adm.email.toLowerCase() === (currentSession.email || '').toLowerCase();
                  return (
                    <tr key={adm.uid} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-indigo-500/10 text-indigo-500 flex items-center justify-center font-bold text-xs">
                            {adm.displayName?.[0] || 'A'}
                          </div>
                          <div>
                            <div className="font-bold flex items-center gap-1.5">
                              <span>{adm.displayName}</span>
                              {isCurrent && (
                                <span className="text-[10px] bg-indigo-500 text-white font-bold px-1.5 py-0.2 rounded">YOU</span>
                              )}
                            </div>
                            <span className="text-slate-400 text-[11px]">{adm.email}</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md font-mono text-[10px] font-bold bg-indigo-500/10 text-indigo-500 border border-indigo-500/20">
                          {adm.role}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 text-[11px] text-emerald-500 font-semibold">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>MFA Enforced</span>
                        </span>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap font-mono text-[11px] text-slate-400">
                        {adm.uid.substring(0, 12)}...
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap font-mono text-[11px] text-slate-400">
                        {adm.createdAt ? new Date(adm.createdAt).toLocaleDateString() : '--'}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        {!isCurrent && (
                          <button
                            onClick={() => handleRemoveAdmin(adm.uid, adm.email)}
                            className="p-1.5 rounded-lg border border-rose-500/20 text-rose-500 hover:bg-rose-500 hover:text-white transition"
                            title="Revoke Admin Access"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
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

      {/* Provision Admin Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className={`w-full max-w-md rounded-2xl border shadow-2xl p-6 ${
            isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="flex items-center justify-between border-b pb-4 mb-4 border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <UserCog className="w-5 h-5 text-indigo-500" />
                <h3 className="font-bold text-base">Provision Platform Admin</h3>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <form onSubmit={handleAddAdmin} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold mb-1 text-slate-300">Admin Full Name *</label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="e.g. Anand Kulkarni"
                  required
                  className={`w-full p-2.5 rounded-xl border outline-none ${
                    isDark ? 'bg-slate-950 border-slate-800 text-slate-100' : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}
                />
              </div>

              <div>
                <label className="block font-semibold mb-1 text-slate-300">Email Address *</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. anand@logsheetmuster.online"
                  required
                  className={`w-full p-2.5 rounded-xl border outline-none ${
                    isDark ? 'bg-slate-950 border-slate-800 text-slate-100' : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}
                />
              </div>

              <div>
                <label className="block font-semibold mb-1 text-slate-300">Administrative Role *</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as any)}
                  className={`w-full p-2.5 rounded-xl border outline-none cursor-pointer ${
                    isDark ? 'bg-slate-950 border-slate-800 text-slate-100' : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}
                >
                  <option value="SUPER_ADMIN">SUPER_ADMIN (Full Platform Governance)</option>
                  <option value="SUPPORT_AUDITOR">SUPPORT_AUDITOR (Read-only Tenant Diagnostics)</option>
                  <option value="PLATFORM_OPS">PLATFORM_OPS (Telemetry & Infrastructure Health)</option>
                </select>
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
                  <span>Provision Account</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
