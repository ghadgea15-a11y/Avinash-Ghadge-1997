import React, { useState, useEffect } from 'react';
import { 
  Sliders, 
  ArrowLeft, 
  RefreshCw, 
  ShieldAlert, 
  Save, 
  CheckCircle2, 
  AlertTriangle, 
  ToggleLeft, 
  ToggleRight, 
  Sparkles, 
  Globe, 
  Fingerprint, 
  WifiOff, 
  FileSpreadsheet, 
  LifeBuoy, 
  Bell
} from 'lucide-react';
import { UserSession, PhaseAScreen } from '../../types';
import { PlatformGlobalConfig } from '../../types/platform';
import { SuperAdminService } from '../../services/superAdminService';
import { useTheme } from '../../context/ThemeContext';
import { useFeedback } from '../../context/ActionFeedbackContext';

interface SuperAdminConfigScreenProps {
  currentSession: UserSession;
  onNavigate: (screen: PhaseAScreen) => void;
}

export const SuperAdminConfigScreen: React.FC<SuperAdminConfigScreenProps> = ({
  currentSession,
  onNavigate
}) => {
  const { isDark } = useTheme();
  const { showSuccess, showError } = useFeedback();

  const [config, setConfig] = useState<PlatformGlobalConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form states
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [maintenanceMessage, setMaintenanceMessage] = useState('');
  const [allowSelfRegistration, setAllowSelfRegistration] = useState(true);
  const [defaultTrialDays, setDefaultTrialDays] = useState(14);
  const [systemAnnouncement, setSystemAnnouncement] = useState('');
  
  // Feature flags
  const [featureFlags, setFeatureFlags] = useState({
    aiAssistant: true,
    biometricsAutoDiscovery: true,
    offlineSyncV2: true,
    betaModules: false,
    supportSessionImpersonation: true,
    statutoryPdfExport: true
  });

  const loadConfig = async () => {
    setLoading(true);
    try {
      const data = await SuperAdminService.getPlatformGlobalConfig();
      setConfig(data);
      setMaintenanceMode(data.maintenanceMode);
      setMaintenanceMessage(data.maintenanceMessage || '');
      setAllowSelfRegistration(data.allowSelfRegistration);
      setDefaultTrialDays(data.defaultTrialDays);
      setSystemAnnouncement(data.systemAnnouncement || '');
      setFeatureFlags({
        aiAssistant: data.featureFlags?.aiAssistant ?? true,
        biometricsAutoDiscovery: data.featureFlags?.biometricsAutoDiscovery ?? data.featureFlags?.biometricDiscovery ?? true,
        offlineSyncV2: data.featureFlags?.offlineSyncV2 ?? data.featureFlags?.offlineSync ?? true,
        betaModules: data.featureFlags?.betaModules ?? false,
        supportSessionImpersonation: data.featureFlags?.supportSessionImpersonation ?? data.featureFlags?.supportImpersonation ?? true,
        statutoryPdfExport: data.featureFlags?.statutoryPdfExport ?? data.featureFlags?.statutoryExport ?? true
      });
    } catch (err) {
      console.error('[SuperAdminConfigScreen] Failed to load config:', err);
      showError('Failed to load global platform settings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConfig();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await SuperAdminService.updatePlatformGlobalConfig(
        {
          maintenanceMode,
          maintenanceMessage,
          allowSelfRegistration,
          defaultTrialDays: Number(defaultTrialDays),
          systemAnnouncement,
          featureFlags
        },
        currentSession.uid,
        currentSession.email || 'superadmin@platform.com'
      );
      showSuccess('Global platform configuration updated and synced to edge');
    } catch (err: any) {
      console.error('[SuperAdminConfigScreen] Failed to save config:', err);
      showError(err.message || 'Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  const toggleFlag = (key: keyof typeof featureFlags) => {
    setFeatureFlags(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
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
              <h1 className="text-xl font-bold tracking-tight">Global Platform Governance & Flags</h1>
              <span className="bg-indigo-500/10 text-indigo-500 text-xs font-semibold px-2.5 py-0.5 rounded-full border border-indigo-500/20">
                Core Plane
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Multi-tenant feature flags, edge routing parameters and platform maintenance gates.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleSave}
            disabled={saving || loading}
            className="flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white transition shadow-sm"
          >
            {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            <span>{saving ? 'Saving...' : 'Apply Changes'}</span>
          </button>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        
        {/* Maintenance Mode & Tenant Onboarding */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Maintenance Card */}
          <div className={`p-5 rounded-2xl border ${isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-sm'} space-y-4`}>
            <div className="flex items-center justify-between border-b pb-3 border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <ShieldAlert className={`w-4 h-4 ${maintenanceMode ? 'text-rose-500' : 'text-slate-400'}`} />
                <h3 className="font-bold text-sm">Platform Maintenance Mode</h3>
              </div>
              <button
                type="button"
                onClick={() => setMaintenanceMode(!maintenanceMode)}
                className={`p-1 rounded-lg transition ${maintenanceMode ? 'text-rose-500' : 'text-slate-400'}`}
              >
                {maintenanceMode ? <ToggleRight className="w-7 h-7" /> : <ToggleLeft className="w-7 h-7" />}
              </button>
            </div>

            <p className="text-xs text-slate-400">
              When active, tenant users cannot perform write operations and see the maintenance banner. Super Admins retain full access.
            </p>

            {maintenanceMode && (
              <div className="space-y-2 animate-in fade-in duration-200 text-xs">
                <label className="font-semibold text-slate-300">Custom Maintenance Notice</label>
                <textarea
                  value={maintenanceMessage}
                  onChange={(e) => setMaintenanceMessage(e.target.value)}
                  placeholder="e.g. Scheduled database maintenance in progress. System will resume at 04:00 AM IST."
                  rows={2}
                  className={`w-full p-2.5 rounded-xl border outline-none ${
                    isDark ? 'bg-slate-950 border-slate-800 text-slate-100' : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}
                />
              </div>
            )}
          </div>

          {/* Tenant Onboarding Gate */}
          <div className={`p-5 rounded-2xl border ${isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-sm'} space-y-4`}>
            <div className="flex items-center justify-between border-b pb-3 border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-emerald-500" />
                <h3 className="font-bold text-sm">Tenant Self-Registration Gate</h3>
              </div>
              <button
                type="button"
                onClick={() => setAllowSelfRegistration(!allowSelfRegistration)}
                className={`p-1 rounded-lg transition ${allowSelfRegistration ? 'text-emerald-500' : 'text-slate-400'}`}
              >
                {allowSelfRegistration ? <ToggleRight className="w-7 h-7" /> : <ToggleLeft className="w-7 h-7" />}
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Permits new enterprise companies to register self-service trial workspaces through the public portal.
            </p>

            <div className="space-y-2 text-xs pt-1">
              <label className="font-semibold text-slate-300">Default Trial Period (Days)</label>
              <input
                type="number"
                min={1}
                max={90}
                value={defaultTrialDays}
                onChange={(e) => setDefaultTrialDays(Number(e.target.value))}
                className={`w-full p-2.5 rounded-xl border outline-none font-mono text-sm ${
                  isDark ? 'bg-slate-950 border-slate-800 text-slate-100' : 'bg-slate-50 border-slate-200 text-slate-800'
                }`}
              />
            </div>
          </div>

        </div>

        {/* Global Broadcast Announcement */}
        <div className={`p-5 rounded-2xl border ${isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-sm'} space-y-3`}>
          <div className="flex items-center gap-2 border-b pb-3 border-slate-200 dark:border-slate-800">
            <Bell className="w-4 h-4 text-indigo-500" />
            <h3 className="font-bold text-sm">Platform-Wide Header Announcement</h3>
          </div>
          <p className="text-xs text-slate-400">
            Optional banner displayed across all tenant user dashboards (leave blank to dismiss).
          </p>
          <input
            type="text"
            value={systemAnnouncement}
            onChange={(e) => setSystemAnnouncement(e.target.value)}
            placeholder="e.g. New Compliance statutory reports (Form 16/ESIC) are now live for all enterprise accounts."
            className={`w-full p-2.5 rounded-xl border text-xs outline-none ${
              isDark ? 'bg-slate-950 border-slate-800 text-slate-100' : 'bg-slate-50 border-slate-200 text-slate-800'
            }`}
          />
        </div>

        {/* Multi-Tenant Feature Flags Grid */}
        <div className={`p-5 rounded-2xl border ${isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-sm'} space-y-4`}>
          <div className="flex items-center justify-between border-b pb-3 border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-cyan-500" />
              <h3 className="font-bold text-sm">Global Feature Flags & Module Toggles</h3>
            </div>
            <span className="text-xs text-slate-400">Real-time edge propagation</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
            
            {/* AI Assistant */}
            <div className={`p-4 rounded-xl border flex items-start justify-between gap-3 ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 font-bold">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  <span>Gemini AI Insights</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Anomaly detection, smart roster predictions and payroll error scans.
                </p>
              </div>
              <button
                type="button"
                onClick={() => toggleFlag('aiAssistant')}
                className={`p-1 rounded-lg transition ${featureFlags.aiAssistant ? 'text-indigo-500' : 'text-slate-500'}`}
              >
                {featureFlags.aiAssistant ? <ToggleRight className="w-6 h-6" /> : <ToggleLeft className="w-6 h-6" />}
              </button>
            </div>

            {/* Biometric Auto-Discovery */}
            <div className={`p-4 rounded-xl border flex items-start justify-between gap-3 ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 font-bold">
                  <Fingerprint className="w-4 h-4 text-indigo-500" />
                  <span>Biometric Auto-Discovery</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  1-minute zero-config local subnet discovery for ZKTeco / eSSL machines.
                </p>
              </div>
              <button
                type="button"
                onClick={() => toggleFlag('biometricsAutoDiscovery')}
                className={`p-1 rounded-lg transition ${featureFlags.biometricsAutoDiscovery ? 'text-indigo-500' : 'text-slate-500'}`}
              >
                {featureFlags.biometricsAutoDiscovery ? <ToggleRight className="w-6 h-6" /> : <ToggleLeft className="w-6 h-6" />}
              </button>
            </div>

            {/* Offline Sync V2 */}
            <div className={`p-4 rounded-xl border flex items-start justify-between gap-3 ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 font-bold">
                  <WifiOff className="w-4 h-4 text-cyan-500" />
                  <span>Offline Sync V2 Engine</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  IndexedDB background queue with vector clocks & deterministic merge.
                </p>
              </div>
              <button
                type="button"
                onClick={() => toggleFlag('offlineSyncV2')}
                className={`p-1 rounded-lg transition ${featureFlags.offlineSyncV2 ? 'text-indigo-500' : 'text-slate-500'}`}
              >
                {featureFlags.offlineSyncV2 ? <ToggleRight className="w-6 h-6" /> : <ToggleLeft className="w-6 h-6" />}
              </button>
            </div>

            {/* Statutory PDF Export */}
            <div className={`p-4 rounded-xl border flex items-start justify-between gap-3 ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 font-bold">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
                  <span>Statutory PDF & Excel Engine</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Server-side high fidelity muster registers and Form 16 generators.
                </p>
              </div>
              <button
                type="button"
                onClick={() => toggleFlag('statutoryPdfExport')}
                className={`p-1 rounded-lg transition ${featureFlags.statutoryPdfExport ? 'text-indigo-500' : 'text-slate-500'}`}
              >
                {featureFlags.statutoryPdfExport ? <ToggleRight className="w-6 h-6" /> : <ToggleLeft className="w-6 h-6" />}
              </button>
            </div>

            {/* Support Impersonation */}
            <div className={`p-4 rounded-xl border flex items-start justify-between gap-3 ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 font-bold">
                  <LifeBuoy className="w-4 h-4 text-amber-500" />
                  <span>Support Impersonation</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Enables ephemeral support access sessions for tier-3 diagnostics.
                </p>
              </div>
              <button
                type="button"
                onClick={() => toggleFlag('supportSessionImpersonation')}
                className={`p-1 rounded-lg transition ${featureFlags.supportSessionImpersonation ? 'text-indigo-500' : 'text-slate-500'}`}
              >
                {featureFlags.supportSessionImpersonation ? <ToggleRight className="w-6 h-6" /> : <ToggleLeft className="w-6 h-6" />}
              </button>
            </div>

            {/* Beta Modules */}
            <div className={`p-4 rounded-xl border flex items-start justify-between gap-3 ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 font-bold">
                  <Sliders className="w-4 h-4 text-violet-500" />
                  <span>Early Access Beta Modules</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Allow enterprise clients to opt into preview experimental features.
                </p>
              </div>
              <button
                type="button"
                onClick={() => toggleFlag('betaModules')}
                className={`p-1 rounded-lg transition ${featureFlags.betaModules ? 'text-indigo-500' : 'text-slate-500'}`}
              >
                {featureFlags.betaModules ? <ToggleRight className="w-6 h-6" /> : <ToggleLeft className="w-6 h-6" />}
              </button>
            </div>

          </div>
        </div>

      </form>

    </div>
  );
};
