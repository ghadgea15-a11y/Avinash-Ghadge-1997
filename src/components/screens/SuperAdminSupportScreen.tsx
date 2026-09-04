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
  Edit3, 
  Copy, 
  ExternalLink, 
  Play, 
  Check, 
  AlertTriangle, 
  LogIn, 
  Timer,
  Terminal
} from 'lucide-react';
import { UserSession, PhaseAScreen, CompanyTenant } from '../../types';
import { SupportAccessSessionRecord, TenantData } from '../../types/platform';
import { SuperAdminService } from '../../services/superAdminService';
import { SessionManager, SupportImpersonationContext } from '../../services/sessionManager';
import { useTheme } from '../../context/ThemeContext';
import { useFeedback } from '../../context/ActionFeedbackContext';

interface SuperAdminSupportScreenProps {
  currentSession: UserSession;
  onNavigate: (screen: PhaseAScreen) => void;
  onImpersonateSuccess?: (company: CompanyTenant) => void;
}

export const SuperAdminSupportScreen: React.FC<SuperAdminSupportScreenProps> = ({
  currentSession,
  onNavigate,
  onImpersonateSuccess
}) => {
  const { isDark } = useTheme();
  const { showSuccess, showError } = useFeedback();

  const [sessions, setSessions] = useState<SupportAccessSessionRecord[]>([]);
  const [tenants, setTenants] = useState<TenantData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  useBackNavigation(!!showModal, () => setShowModal(false), 'showModal');

  // Modal / Sandbox state
  const [targetCompanyId, setTargetCompanyId] = useState('T-SHIELD');
  const [justificationReason, setJustificationReason] = useState('Investigating biometric sync timeout reported in ticket #SUP-8819');
  const [accessScope, setAccessScope] = useState<'READ_ONLY' | 'SUPPORT_MUTATION'>('READ_ONLY');
  const [durationMinutes, setDurationMinutes] = useState<number>(30);
  const [submitting, setSubmitting] = useState(false);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  // Sandbox Live Test State
  const [sandboxLog, setSandboxLog] = useState<Array<{ time: string; type: 'info' | 'success' | 'warning' | 'error'; text: string }>>([
    { time: new Date().toLocaleTimeString(), type: 'info', text: 'Support access engine initialized. Ready for controlled impersonation.' }
  ]);
  const [sandboxTesting, setSandboxTesting] = useState(false);
  const [nowTimestamp, setNowTimestamp] = useState<number>(Date.now());

  // Active impersonation in local storage
  const [currentImpersonation, setCurrentImpersonation] = useState<SupportImpersonationContext | null>(
    SessionManager.getSupportImpersonation()
  );

  const addSandboxLog = (text: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') => {
    setSandboxLog(prev => [
      { time: new Date().toLocaleTimeString(), type, text },
      ...prev.slice(0, 19)
    ]);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [sessionsData, tenantsData] = await Promise.all([
        SuperAdminService.getSupportAccessSessions(),
        SuperAdminService.getAllTenants()
      ]);
      setSessions(sessionsData);
      setTenants(tenantsData);

      // Refresh current active impersonation status
      setCurrentImpersonation(SessionManager.getSupportImpersonation());
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
    // Live ticking timer for table countdowns
    const interval = setInterval(() => {
      setNowTimestamp(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedToken(text);
    setTimeout(() => setCopiedToken(null), 2000);
    showSuccess('Token copied to clipboard');
  };

  /**
   * 1. Create Support Access Session & Ephemeral Token
   */
  const handleCreateSession = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!targetCompanyId || !targetCompanyId.trim()) {
      showError('Target company ID is required');
      addSandboxLog('Validation error: Target company must be selected', 'error');
      return;
    }

    // Strict validation: Reason is mandatory (minimum 8 characters)
    const cleanReason = justificationReason.trim();
    if (!cleanReason || cleanReason.length < 8) {
      showError('Justification reason is strictly mandatory (min 8 chars)');
      addSandboxLog('Access Denied: Justification reason is mandatory (minimum 8 characters)', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const selectedTenant = tenants.find(t => t.id === targetCompanyId);
      const companyName = selectedTenant?.name || (targetCompanyId === 'T-SHIELD' ? 'Shield Security Operations' : targetCompanyId);

      const record = await SuperAdminService.createSupportAccessSession({
        superAdminUid: currentSession.uid || (currentSession as any).userId || 'ghadgea15_uid',
        superAdminEmail: currentSession.email || 'ghadgea15@gmail.com',
        targetCompanyId,
        targetCompanyName: companyName,
        reason: cleanReason,
        scope: accessScope,
        durationMinutes
      });

      showSuccess(`Support token generated for ${targetCompanyId} (${durationMinutes}m)`);
      addSandboxLog(`Support Token Generated: ${record.token} (Valid for ${durationMinutes} mins). Immutable audit log created.`, 'success');
      setShowModal(false);
      loadData();
      return record;
    } catch (err: any) {
      console.error('[SuperAdminSupportScreen] Failed to create session:', err);
      showError(err.message || 'Failed to generate support token');
      addSandboxLog(`Token generation error: ${err.message}`, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  /**
   * 2. Real Impersonation Logic: Launch Support Session into Target Tenant
   */
  const handleLaunchImpersonation = async (sessionRecord?: SupportAccessSessionRecord) => {
    let sessionToUse = sessionRecord;

    if (!sessionToUse) {
      // Look for latest active session for selected targetCompanyId
      const activeForTenant = sessions.find(s => 
        s.targetCompanyId === targetCompanyId && 
        s.status === 'ACTIVE' && 
        Number(s.expiresAt) > Date.now()
      );

      if (activeForTenant) {
        sessionToUse = activeForTenant;
      } else {
        // Need to create one first
        addSandboxLog(`No active session found for ${targetCompanyId}. Generating new token...`, 'info');
        const created = await handleCreateSession();
        if (!created) return;
        sessionToUse = created;
      }
    }

    if (!sessionToUse) return;

    try {
      addSandboxLog(`Validating support token ${sessionToUse.token || sessionToUse.sessionId}...`, 'info');

      // Call startSupportImpersonation (validates token & logs START_IMPERSONATION)
      const validated = await SuperAdminService.startSupportImpersonation(
        currentSession,
        sessionToUse.token || sessionToUse.sessionId
      );

      // Store in SessionManager
      const impersonationContext: SupportImpersonationContext = {
        token: validated.token || validated.sessionId,
        sessionId: validated.sessionId,
        targetCompanyId: validated.targetCompanyId,
        targetCompanyName: validated.targetCompanyName || validated.targetCompanyId,
        superAdminUid: currentSession.uid || (currentSession as any).userId || 'ghadgea15_uid',
        superAdminEmail: currentSession.email || 'ghadgea15@gmail.com',
        reason: validated.reason,
        scope: validated.scope,
        durationMinutes: validated.durationMinutes || 30,
        createdAt: Number(validated.createdAt),
        expiresAt: Number(validated.expiresAt)
      };

      SessionManager.setSupportImpersonation(impersonationContext);
      setCurrentImpersonation(impersonationContext);

      addSandboxLog(`Impersonation Launched: Now controlling tenant ${validated.targetCompanyId} under audited support boundary. START_IMPERSONATION logged in audit trail.`, 'success');
      showSuccess(`Support impersonation started for ${validated.targetCompanyId}`);

      // If callback provided, switch company context and navigate
      if (onImpersonateSuccess) {
        const companyTenant: CompanyTenant = {
          id: validated.targetCompanyId,
          companyId: validated.targetCompanyId,
          companyName: validated.targetCompanyName || validated.targetCompanyId,
          companyCode: validated.targetCompanyId,
          name: validated.targetCompanyName || validated.targetCompanyId,
          subscriptionPlan: 'ENTERPRISE' as any,
          tier: 'ENTERPRISE' as any,
          enabledModules: ['HCM', 'WFM', 'FINANCE', 'BPM', 'ALL'],
          status: 'ACTIVE',
          adminEmail: 'clientadmin@' + validated.targetCompanyId.toLowerCase() + '.com',
          maxEmployees: 100,
          maxSites: 10,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          isActive: true
        } as any;

        onImpersonateSuccess(companyTenant);
      }
    } catch (err: any) {
      console.error('[SuperAdminSupportScreen] Impersonation failed:', err);
      showError(err.message || 'Failed to start impersonation');
      addSandboxLog(`Impersonation Failed: ${err.message}`, 'error');
    }
  };

  /**
   * 3. Terminate Active Impersonation
   */
  const handleExitImpersonation = async () => {
    const active = SessionManager.getSupportImpersonation();
    if (!active) return;

    try {
      await SuperAdminService.endSupportImpersonation(
        currentSession,
        active.token || active.sessionId,
        'Super Admin terminated support session from support screen'
      );
      SessionManager.clearSupportImpersonation();
      setCurrentImpersonation(null);
      showSuccess('Support impersonation terminated successfully');
      addSandboxLog(`Impersonation Ended: Session closed and END_IMPERSONATION logged in audit trail.`, 'info');
      loadData();
    } catch (err: any) {
      showError('Error exiting impersonation');
    }
  };

  /**
   * 4. Revoke Token Manually
   */
  const handleRevokeSession = async (sessionId: string, companyId: string) => {
    try {
      await SuperAdminService.revokeSupportAccessSession(
        sessionId,
        currentSession.uid || (currentSession as any).userId,
        currentSession.email || 'ghadgea15@gmail.com',
        `Manually revoked support access token for ${companyId}`
      );
      showSuccess('Support session revoked immediately');
      addSandboxLog(`Session ${sessionId} revoked. REVOKE_SUPPORT_SESSION logged in audit trail.`, 'warning');
      loadData();
    } catch (err: any) {
      console.error('[SuperAdminSupportScreen] Failed to revoke session:', err);
      showError('Failed to revoke session');
    }
  };

  /**
   * 5. Test Live Expiration: Create 5-second Token, Wait for Auto-Expiry, and Validate Invalidation
   */
  const handleRunExpirationTest = async () => {
    setSandboxTesting(true);
    addSandboxLog('--- Starting Automated Token Expiration Test ---', 'info');

    try {
      // Step A: Create short-lived token (0.1 min = 6 seconds)
      addSandboxLog('Step 1: Generating 6-second ephemeral test token for T-SHIELD...', 'info');
      const testRecord = await SuperAdminService.createSupportAccessSession({
        superAdminUid: currentSession.uid || (currentSession as any).userId || 'ghadgea15_uid',
        superAdminEmail: currentSession.email || 'ghadgea15@gmail.com',
        targetCompanyId: 'T-SHIELD',
        targetCompanyName: 'Shield Security Operations',
        reason: 'Automated test: Verifying Point 1.9 auto-expiration of support access token',
        scope: 'READ_ONLY',
        durationMinutes: 0.1 // 6 seconds
      });

      addSandboxLog(`Step 1 Complete: Token generated: ${testRecord.token}. Status: ACTIVE.`, 'success');

      // Step B: Immediate validation (should be valid)
      addSandboxLog('Step 2: Validating token immediately (should pass)...', 'info');
      const initialVal = await SuperAdminService.validateSupportAccessToken(testRecord.token || testRecord.sessionId);
      if (initialVal.valid) {
        addSandboxLog(`Step 2 Passed: Token is currently VALID and active.`, 'success');
      } else {
        throw new Error(`Unexpected validation failure: ${initialVal.message}`);
      }

      // Step C: Wait 7 seconds for expiration
      addSandboxLog('Step 3: Waiting 7 seconds for time window to elapse...', 'warning');
      await new Promise(res => setTimeout(res, 7000));

      // Step D: Validate again after expiration
      addSandboxLog('Step 4: Validating token after expiry threshold...', 'info');
      const expiredVal = await SuperAdminService.validateSupportAccessToken(testRecord.token || testRecord.sessionId);

      if (!expiredVal.valid && expiredVal.error === 'TOKEN_EXPIRED') {
        addSandboxLog(`Step 4 Passed: Token correctly invalidated! Response: "${expiredVal.message}". EXPIRE_SUPPORT_SESSION logged in immutable audit trail.`, 'success');
        showSuccess('Point 1.9 Verified: Token expired automatically & access denied!');
      } else {
        addSandboxLog(`Step 4 Warning: Token returned: valid=${expiredVal.valid}, error=${expiredVal.error}`, 'error');
      }

      // Refresh table to show updated status
      loadData();
    } catch (err: any) {
      addSandboxLog(`Expiration test failed: ${err.message}`, 'error');
      showError(err.message || 'Expiration test failed');
    } finally {
      setSandboxTesting(false);
    }
  };

  /**
   * Helper: Check if session is expired
   */
  const getSessionState = (session: SupportAccessSessionRecord) => {
    const expiresAtMs = Number(session.expiresAt) || 0;
    if (session.status === 'REVOKED' || !session.isActive && session.revokedAt) {
      return { status: 'REVOKED', label: 'REVOKED', color: 'rose', active: false };
    }
    if (expiresAtMs <= nowTimestamp || session.status === 'EXPIRED') {
      return { status: 'EXPIRED', label: 'EXPIRED', color: 'slate', active: false };
    }
    return { status: 'ACTIVE', label: 'ACTIVE', color: 'emerald', active: true };
  };

  const formatRemaining = (expiresAtMs: number) => {
    const diff = Math.floor((expiresAtMs - nowTimestamp) / 1000);
    if (diff <= 0) return 'Expired';
    const mins = Math.floor(diff / 60);
    const secs = diff % 60;
    return `${mins}m ${secs}s`;
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
              <h1 className="text-xl font-bold tracking-tight">Controlled Support Access (Impersonation)</h1>
              <span className="bg-amber-500/10 text-amber-500 text-xs font-semibold px-2.5 py-0.5 rounded-full border border-amber-500/20">
                Point 1.9 Audited Boundary
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Strictly time-bounded support sessions (15/30/60m) with mandatory justification and immutable audit logging.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {currentImpersonation && (
            <button
              onClick={handleExitImpersonation}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl bg-rose-600 hover:bg-rose-700 text-white transition shadow-sm"
            >
              <X className="w-4 h-4" />
              <span>Exit Active Support Session</span>
            </button>
          )}
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white transition shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>New Support Access Token</span>
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

      {/* Point 1.9 Interactive Controlled Support Access Sandbox */}
      <div className={`p-5 rounded-2xl border ${
        isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
      } space-y-4`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-3 border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-sm">Point 1.9 Verification Sandbox: Controlled Impersonation & Expiry</h2>
              <p className="text-xs text-slate-400">
                Test time-bounded support tokens, mandatory justification enforcement, and automatic expiration verification.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleRunExpirationTest}
              disabled={sandboxTesting}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs bg-amber-600 hover:bg-amber-700 text-white transition shadow-sm disabled:opacity-50 cursor-pointer"
            >
              <Timer className={`w-3.5 h-3.5 ${sandboxTesting ? 'animate-spin' : ''}`} />
              <span>{sandboxTesting ? 'Testing Auto-Expiry...' : 'Test Auto-Expiration (Proof)'}</span>
            </button>
          </div>
        </div>

        {/* Sandbox Form Controls */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
          {/* Tenant Selector */}
          <div>
            <label className="block font-semibold mb-1 text-slate-400">Target Client Tenant *</label>
            <select
              value={targetCompanyId}
              onChange={(e) => setTargetCompanyId(e.target.value)}
              className={`w-full p-2 rounded-xl border outline-none font-bold ${
                isDark ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-800'
              }`}
            >
              <option value="T-SHIELD">T-SHIELD (Shield Security Operations)</option>
              <option value="T-GARUDA">T-GARUDA (Garuda Industrial Logistics)</option>
              <option value="T-APEX">T-APEX (Apex Facility Group)</option>
              {tenants.filter(t => !['T-SHIELD', 'T-GARUDA', 'T-APEX'].includes(t.id)).map(t => (
                <option key={t.id} value={t.id}>{t.name} ({t.id})</option>
              ))}
            </select>
          </div>

          {/* Duration Selector */}
          <div>
            <label className="block font-semibold mb-1 text-slate-400">Time-Bound Duration *</label>
            <div className="grid grid-cols-3 gap-1.5">
              {[15, 30, 60].map(mins => (
                <button
                  key={mins}
                  type="button"
                  onClick={() => setDurationMinutes(mins)}
                  className={`py-1.5 rounded-lg border text-center font-bold text-xs transition cursor-pointer ${
                    durationMinutes === mins
                      ? 'border-indigo-500 bg-indigo-500/10 text-indigo-400'
                      : isDark ? 'border-slate-800 bg-slate-950 text-slate-400 hover:bg-slate-800' : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {mins} mins
                </button>
              ))}
            </div>
          </div>

          {/* Access Scope */}
          <div>
            <label className="block font-semibold mb-1 text-slate-400">Access Boundary Scope *</label>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => setAccessScope('READ_ONLY')}
                className={`py-1.5 px-2 rounded-lg border flex items-center justify-center gap-1 font-bold text-xs transition cursor-pointer ${
                  accessScope === 'READ_ONLY'
                    ? 'border-indigo-500 bg-indigo-500/10 text-indigo-400'
                    : isDark ? 'border-slate-800 bg-slate-950 text-slate-400' : 'border-slate-200 bg-slate-50 text-slate-600'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Read-Only</span>
              </button>
              <button
                type="button"
                onClick={() => setAccessScope('SUPPORT_MUTATION')}
                className={`py-1.5 px-2 rounded-lg border flex items-center justify-center gap-1 font-bold text-xs transition cursor-pointer ${
                  accessScope === 'SUPPORT_MUTATION'
                    ? 'border-amber-500 bg-amber-500/10 text-amber-400'
                    : isDark ? 'border-slate-800 bg-slate-950 text-slate-400' : 'border-slate-200 bg-slate-50 text-slate-600'
                }`}
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Mutation</span>
              </button>
            </div>
          </div>

          {/* Action Trigger */}
          <div className="flex flex-col justify-end gap-1.5">
            <button
              onClick={() => handleCreateSession()}
              disabled={submitting}
              className="w-full py-2 px-3 rounded-xl font-bold text-xs bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {submitting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <KeyRound className="w-3.5 h-3.5" />}
              <span>Generate Token ({durationMinutes}m)</span>
            </button>
            <button
              onClick={() => handleLaunchImpersonation()}
              className="w-full py-2 px-3 rounded-xl font-bold text-xs bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Launch Impersonation ({targetCompanyId})</span>
            </button>
          </div>
        </div>

        {/* Mandatory Justification Input */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="font-semibold text-xs text-slate-400 flex items-center gap-1">
              <span>Mandatory Audit Justification & Reason *</span>
              <span className="text-[10px] text-amber-500">(Required by security policy, min 8 characters)</span>
            </label>
            <span className={`text-[10px] font-mono ${
              justificationReason.trim().length >= 8 ? 'text-emerald-500' : 'text-rose-500 font-bold'
            }`}>
              {justificationReason.trim().length} chars (min 8 required)
            </span>
          </div>
          <input
            type="text"
            value={justificationReason}
            onChange={(e) => setJustificationReason(e.target.value)}
            placeholder="e.g. Investigating biometric sync timeout reported in ticket #SUP-8819"
            className={`w-full p-2.5 rounded-xl border outline-none text-xs transition ${
              justificationReason.trim().length >= 8 
                ? isDark ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-800'
                : 'border-rose-500/50 bg-rose-500/5 text-rose-300'
            }`}
          />
        </div>

        {/* Sandbox Live Console Logs */}
        <div className={`p-3 rounded-xl border font-mono text-[11px] ${
          isDark ? 'bg-slate-950 border-slate-800 text-slate-300' : 'bg-slate-900 border-slate-800 text-slate-200'
        }`}>
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800 text-[10px] uppercase font-bold text-slate-400">
            <div className="flex items-center gap-1.5">
              <Terminal className="w-3 h-3 text-indigo-400" />
              <span>Real-Time Audit & Token Lifecycle Telemetry</span>
            </div>
            <span>{sandboxLog.length} events logged</span>
          </div>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {sandboxLog.map((log, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="text-slate-500 shrink-0">[{log.time}]</span>
                <span className={
                  log.type === 'success' ? 'text-emerald-400' :
                  log.type === 'error' ? 'text-rose-400 font-bold' :
                  log.type === 'warning' ? 'text-amber-400' :
                  'text-slate-300'
                }>
                  {log.text}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Active Support Sessions Table */}
      <div className={`rounded-2xl border overflow-hidden ${isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-indigo-500" />
            <h3 className="font-bold text-sm">Platform Support Access Sessions Registry</h3>
          </div>
          <span className="text-xs text-slate-400 font-medium">
            {sessions.filter(s => getSessionState(s).active).length} active tokens
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className={`border-b ${isDark ? 'bg-slate-950/60 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-600'} font-semibold uppercase text-xs tracking-wider`}>
              <tr>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Target Tenant</th>
                <th className="py-3 px-4">Support Token</th>
                <th className="py-3 px-4">Scope</th>
                <th className="py-3 px-4">Time Remaining</th>
                <th className="py-3 px-4">Operator</th>
                <th className="py-3 px-4">Reason & Justification</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className={`divide-y text-xs ${isDark ? 'divide-slate-800/60 text-slate-300' : 'divide-slate-100 text-slate-700'}`}>
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-500" />
                    Loading support sessions registry...
                  </td>
                </tr>
              ) : sessions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <CheckCircle2 className="w-8 h-8 mx-auto mb-2 opacity-40 text-emerald-500" />
                    No support access sessions recorded yet.
                  </td>
                </tr>
              ) : (
                sessions.map((session) => {
                  const state = getSessionState(session);
                  const tokenStr = session.token || session.sessionId;

                  return (
                    <tr key={session.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                      {/* Status */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md font-mono text-[10px] font-bold ${
                          state.color === 'emerald'
                            ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                            : state.color === 'rose'
                            ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
                            : 'bg-slate-500/10 text-slate-400 border border-slate-500/20'
                        }`}>
                          {state.label}
                        </span>
                      </td>

                      {/* Target Tenant */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 font-bold">
                          <Building2 className="w-3.5 h-3.5 text-cyan-500" />
                          <span>{session.targetCompanyName || session.targetCompanyId}</span>
                          <span className="font-mono text-[10px] text-slate-400">({session.targetCompanyId})</span>
                        </div>
                      </td>

                      {/* Token */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 font-mono text-xs">
                          <span className="font-semibold text-slate-300">{tokenStr}</span>
                          <button
                            onClick={() => copyToClipboard(tokenStr)}
                            className="p-1 hover:bg-slate-700/40 rounded transition"
                            title="Copy Token"
                          >
                            {copiedToken === tokenStr ? (
                              <Check className="w-3 h-3 text-emerald-500" />
                            ) : (
                              <Copy className="w-3 h-3 text-slate-400" />
                            )}
                          </button>
                        </div>
                      </td>

                      {/* Scope */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className={`font-mono text-[11px] font-semibold px-2 py-0.5 rounded ${
                          session.scope === 'SUPPORT_MUTATION' || session.scope === 'MUTATION'
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                        }`}>
                          {session.scope}
                        </span>
                      </td>

                      {/* Time Remaining */}
                      <td className="py-3.5 px-4 whitespace-nowrap font-mono text-xs">
                        {state.active ? (
                          <span className="font-bold text-emerald-400">
                            {formatRemaining(Number(session.expiresAt))}
                          </span>
                        ) : (
                          <span className="text-slate-500">
                            {new Date(session.expiresAt).toLocaleTimeString()}
                          </span>
                        )}
                      </td>

                      {/* Operator */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-slate-400">
                        {session.superAdminEmail}
                      </td>

                      {/* Reason */}
                      <td className="py-3.5 px-4 max-w-[220px] truncate text-slate-300" title={session.reason}>
                        {session.reason}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {state.active ? (
                            <>
                              <button
                                onClick={() => handleLaunchImpersonation(session)}
                                className="px-2.5 py-1 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition flex items-center gap-1 cursor-pointer"
                              >
                                <LogIn className="w-3 h-3" />
                                <span>Impersonate</span>
                              </button>
                              <button
                                onClick={() => handleRevokeSession(session.id, session.targetCompanyId)}
                                className="px-2.5 py-1 text-xs font-bold rounded-lg bg-rose-500/10 text-rose-500 border border-rose-500/20 hover:bg-rose-500 hover:text-white transition cursor-pointer"
                              >
                                Revoke
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={async () => {
                                const val = await SuperAdminService.validateSupportAccessToken(tokenStr);
                                if (!val.valid) {
                                  showSuccess(`Verified Invalidation: ${val.message}`);
                                  addSandboxLog(`Validation check: ${val.message}`, 'warning');
                                } else {
                                  showError('Token is still valid');
                                }
                              }}
                              className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-800 text-slate-400 hover:text-slate-200 transition"
                            >
                              Verify Invalid
                            </button>
                          )}
                        </div>
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
                <h3 className="font-bold text-base">Generate Support Access Token</h3>
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
                  <option value="T-SHIELD">T-SHIELD (Shield Security Operations)</option>
                  <option value="T-GARUDA">T-GARUDA (Garuda Industrial Logistics)</option>
                  <option value="T-APEX">T-APEX (Apex Facility Group)</option>
                  {tenants.filter(t => !['T-SHIELD', 'T-GARUDA', 'T-APEX'].includes(t.id)).map(t => (
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
                      <div className="text-[11px] font-normal opacity-70">Inspect logs & config</div>
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
                      <div className="text-[11px] font-normal opacity-70">Fix corrupted states</div>
                    </div>
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-semibold mb-1 text-slate-300">Session Duration *</label>
                <div className="grid grid-cols-3 gap-2">
                  {[15, 30, 60].map(mins => (
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
                      {mins} minutes
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-semibold text-slate-300">Audit Justification & Ticket ID *</label>
                  <span className={`text-[11px] ${
                    justificationReason.trim().length >= 8 ? 'text-emerald-500' : 'text-rose-500 font-bold'
                  }`}>
                    {justificationReason.trim().length} chars (min 8)
                  </span>
                </div>
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
                  className="px-4 py-2 rounded-xl text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || justificationReason.trim().length < 8}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white transition shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {submitting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />}
                  <span>Authorize & Generate Token</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
