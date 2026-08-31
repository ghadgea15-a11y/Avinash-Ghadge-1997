import React, { useState, useEffect } from 'react';
import { useBackNavigation } from '../../hooks/useBackNavigation';
import { 
  Settings, 
  Sun, 
  Moon, 
  Monitor, 
  Fingerprint, 
  Wifi, 
  RefreshCw, 
  Database, 
  Globe, 
  MapPin, 
  Volume2, 
  CheckCircle2, 
  Shield, 
  Trash2, 
  HelpCircle,
  Smartphone,
  Tablet,
  LogOut,
  Lock,
  Menu,
  Building2,
  Sliders,
  FileText,
  Award,
  ShieldCheck,
  KeyRound,
  Eye,
  EyeOff,
  Bell,
  AlertCircle
} from 'lucide-react';
import { AppSettings, UserSession, CompanyTenant, PhaseAScreen } from '../../types';
import { useTheme } from '../../context/ThemeContext';
import { FirestoreService } from '../../services/firestoreService';
import { SessionManager } from '../../services/sessionManager';
import { OfflineSyncService } from '../../services/offlineSyncService';


import { runPhase4VerificationTests } from '../../tests/verifyPhase4';
import { runPhase5Verification, TestResult } from '../../tests/verifyPhase5';

interface SettingsScreenProps {
  userSession: UserSession | null;
  activeCompany: CompanyTenant | null;
  isOnline: boolean;
  onClearCache: () => void;
  viewportMode: 'PHONE' | 'TABLET' | 'FULLSCREEN';
  onToggleViewport: (mode: 'PHONE' | 'TABLET' | 'FULLSCREEN') => void;
  onNavigate: (screen: PhaseAScreen) => void;
  onLogout: () => void;
  onLockSession: () => void;
  onOpenDrawer: () => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({
  userSession,
  activeCompany,
  isOnline,
  onClearCache,
  viewportMode,
  onToggleViewport,
  onNavigate,
  onLogout,
  onLockSession,
  onOpenDrawer
}) => {
  const { themeMode, setThemeMode, isDark } = useTheme();
  const [settings, setSettings] = useState<AppSettings>({
    
    themeMode: themeMode,
    notificationsEnabled: true,
    inAppNotifications: true,
    emailNotifications: true,
    pushNotifications: false,
    alertThreshold: 'ALL',
    biometricUnlock: true,
    hapticFeedback: true,
    offlineAutoSync: true,
    defaultView: 'AUTO',
    language: 'EN',
    gpsTrackingHighAccuracy: true

  });
  const [saveToast, setSaveToast] = useState<string | null>(null);
  const [testSuiteReport, setTestSuiteReport] = useState<{ passedCount: number; failedCount: number; results: TestResult[] } | null>(null);
  const [isTesting, setIsTesting] = useState<boolean>(false);
  const [showPinSetup, setShowPinSetup] = useState(false);
  useBackNavigation(!!showPinSetup, () => setShowPinSetup(null as any), 'showPinSetup');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  useBackNavigation(!!showPin, () => setShowPin(null as any), 'showPin');
  const [pinError, setPinError] = useState<string | null>(null);
  const [isUpdatingPin, setIsUpdatingPin] = useState(false);

  const handleUpdatePin = async () => {
    if (newPin.length < 4) {
      setPinError('PIN must be at least 4 digits');
      return;
    }
    if (newPin !== confirmPin) {
      setPinError('PINs do not match');
      return;
    }
    if (!/^\d+$/.test(newPin)) {
      setPinError('PIN must contain only numbers');
      return;
    }

    setIsUpdatingPin(true);
    setPinError(null);
    try {
      const success = await FirestoreService.updateEmployeePin(
        activeCompany?.companyId || userSession?.companyId || '',
        userSession?.employeeId || '',
        newPin,
        userSession?.userId || '',
        userSession?.fullName || ''
      );

      if (success) {
        setSaveToast('Security PIN updated successfully');
        setShowPinSetup(false);
        setNewPin('');
        setConfirmPin('');
      } else {
        setPinError('Failed to update PIN. Please try again.');
      }
    } catch (err) {
      setPinError('An error occurred. Please try again.');
    } finally {
      setIsUpdatingPin(false);
    }
  };

  const handleRunDiagnostics = async () => {
    setIsTesting(true);
    try {
      const report4 = await runPhase4VerificationTests(activeCompany?.companyId || 'MUSTER-TEST-CORP');
      const report5 = await runPhase5Verification();

      const mappedPhase4: TestResult[] = report4.results.map(r => ({
        name: `[Phase 4 Attendance] ${r.name}`,
        passed: r.passed,
        message: r.details
      }));

      const consolidatedResults = [...mappedPhase4, ...report5.results];
      const passedCount = consolidatedResults.filter(r => r.passed).length;

      setTestSuiteReport({
        passedCount,
        failedCount: consolidatedResults.length - passedCount,
        results: consolidatedResults
      });
    } catch (err) {
      console.error('Diagnostics failed:', err);
    } finally {
      setIsTesting(false);
    }
  };


  useEffect(() => {
    if (userSession) {
      FirestoreService.getAppSettings(userSession.userId).then((s) => {
        if (s) {
          setSettings(prev => ({ ...prev, ...s }));
        }
      });
    }
  }, [userSession]);


  const updateSetting = async <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    const updated = { ...settings, [key]: value };
    setSettings(updated);

    if (key === 'themeMode') {
      setThemeMode(value as any);
    }

    if (userSession) {
      await FirestoreService.saveAppSettings(userSession.userId, updated);
    }

    setSaveToast(`Updated ${String(key)} setting`);
    setTimeout(() => setSaveToast(null), 2500);
  };

  return (
    <div className={`p-4 space-y-4 overflow-y-auto max-h-full ${isDark ? 'text-slate-100' : 'text-black'}`}>
      {/* Save Notification */}
      {saveToast && (
        <div className="bg-indigo-950 border border-indigo-800 p-3 rounded-2xl text-indigo-300 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-indigo-400 shrink-0" />
          <span>{saveToast}</span>
        </div>
      )}

      {/* Header */}
      <div className={`p-4 rounded-3xl border flex items-center justify-between ${
        isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
      }`}>
        <div className="flex items-center gap-3">
          <button onClick={onOpenDrawer} className="p-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-900 dark:text-slate-300 transition">
            <Menu className="w-6 h-6" />
          </button>
          <div className="p-2.5 rounded-2xl bg-indigo-600/20 text-indigo-400 hidden sm:block">
            <Settings className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-sm font-bold">App Preferences & Security</h2>
            <p className="text-xs text-slate-400">Configure theme, sync, and preferences</p>
          </div>
        </div>
      </div>

      {/* Theme Selector Section */}
      <div className={`p-4 rounded-3xl border space-y-3 ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2 border-b pb-2 border-slate-800">
          <Sun className="w-4 h-4 text-amber-400" />
          Theme & Display Mode
        </h3>

        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => updateSetting('themeMode', 'LIGHT')}
            className={`p-3 rounded-2xl border text-xs font-bold flex flex-col items-center gap-2 transition ${
              settings.themeMode === 'LIGHT'
                ? 'bg-indigo-600 text-white border-indigo-500 shadow-md'
                : isDark ? 'bg-slate-950 border-slate-800 text-slate-300' : 'bg-slate-100 border-slate-200 text-slate-900'
            }`}
          >
            <Sun className="w-5 h-5 text-amber-400" />
            <span>Light</span>
          </button>

          <button
            onClick={() => updateSetting('themeMode', 'DARK')}
            className={`p-3 rounded-2xl border text-xs font-bold flex flex-col items-center gap-2 transition ${
              settings.themeMode === 'DARK'
                ? 'bg-indigo-600 text-white border-indigo-500 shadow-md'
                : isDark ? 'bg-slate-950 border-slate-800 text-slate-300' : 'bg-slate-100 border-slate-200 text-slate-900'
            }`}
          >
            <Moon className="w-5 h-5 text-indigo-400" />
            <span>Dark</span>
          </button>

          <button
            onClick={() => updateSetting('themeMode', 'SYSTEM')}
            className={`p-3 rounded-2xl border text-xs font-bold flex flex-col items-center gap-2 transition ${
              settings.themeMode === 'SYSTEM'
                ? 'bg-indigo-600 text-white border-indigo-500 shadow-md'
                : isDark ? 'bg-slate-950 border-slate-800 text-slate-300' : 'bg-slate-100 border-slate-200 text-slate-900'
            }`}
          >
            <Monitor className="w-5 h-5 text-emerald-400" />
            <span>System</span>
          </button>
        </div>
      </div>

      {/* Viewport & Layout */}
      <div className={`p-4 rounded-3xl border space-y-3 ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2 border-b pb-2 border-slate-800">
          <Monitor className="w-4 h-4 text-sky-400" />
          Preview Layout Mode
        </h3>

        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => onToggleViewport('PHONE')}
            className={`p-3 rounded-2xl border text-xs font-bold flex flex-col items-center gap-2 transition ${
              viewportMode === 'PHONE'
                ? 'bg-indigo-600 text-white border-indigo-500 shadow-md'
                : isDark ? 'bg-slate-950 border-slate-800 text-slate-300' : 'bg-slate-100 border-slate-200 text-slate-900'
            }`}
          >
            <Smartphone className="w-5 h-5 text-sky-400" />
            <span>Phone</span>
          </button>

          <button
            onClick={() => onToggleViewport('TABLET')}
            className={`p-3 rounded-2xl border text-xs font-bold flex flex-col items-center gap-2 transition ${
              viewportMode === 'TABLET'
                ? 'bg-indigo-600 text-white border-indigo-500 shadow-md'
                : isDark ? 'bg-slate-950 border-slate-800 text-slate-300' : 'bg-slate-100 border-slate-200 text-slate-900'
            }`}
          >
            <Tablet className="w-5 h-5 text-indigo-400" />
            <span>Tablet</span>
          </button>

          <button
            onClick={() => onToggleViewport('FULLSCREEN')}
            className={`p-3 rounded-2xl border text-xs font-bold flex flex-col items-center gap-2 transition ${
              viewportMode === 'FULLSCREEN'
                ? 'bg-indigo-600 text-white border-indigo-500 shadow-md'
                : isDark ? 'bg-slate-950 border-slate-800 text-slate-300' : 'bg-slate-100 border-slate-200 text-slate-900'
            }`}
          >
            <Monitor className="w-5 h-5 text-emerald-400" />
            <span>Desktop</span>
          </button>
        </div>
      </div>

      {/* Account Session Actions */}
      <div className={`p-4 rounded-3xl border space-y-3 ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2 border-b pb-2 border-slate-800">
          <Shield className="w-4 h-4 text-emerald-400" />
          Account & Session
        </h3>

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={onLockSession}
            className="w-full p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 text-xs font-bold flex items-center justify-center gap-2 transition"
          >
            <Lock className="w-4 h-4" />
            <span>Lock Screen</span>
          </button>
          <button
            onClick={onLogout}
            className="w-full p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-bold flex items-center justify-center gap-2 transition"
          >
            <LogOut className="w-4 h-4" />
            <span>Logout</span>
          </button>
        </div>
      </div>

      {/* Security PIN Management */}
      <div className={`p-4 rounded-3xl border space-y-3 ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2 border-b pb-2 border-slate-800">
          <KeyRound className="w-4 h-4 text-amber-400" />
          Security PIN Management
        </h3>

        {!showPinSetup ? (
          <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-950/40 border border-slate-800">
            <div className="space-y-0.5">
              <span className="text-xs font-bold block">App Lock PIN</span>
              <span className="text-[10px] text-slate-400">Used to quickly unlock your session</span>
            </div>
            <button
              onClick={() => setShowPinSetup(true)}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-bold transition shadow-lg"
            >
              Setup / Change PIN
            </button>
          </div>
        ) : (
          <div className="space-y-4 p-4 rounded-2xl bg-slate-950/60 border border-slate-800 animate-in slide-in-from-top-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold">Set 4-Digit Security PIN</h4>
              <button onClick={() => setShowPinSetup(false)} className="text-[10px] text-slate-400 hover:text-white">Cancel</button>
            </div>

            <div className="space-y-3">
              <div className="relative">
                <input
                  type={showPin ? 'text' : 'password'}
                  maxLength={4}
                  placeholder="New 4-Digit PIN"
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
                  className={`w-full p-3 rounded-xl border text-sm font-mono tracking-widest text-center ${
                    isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-black'
                  }`}
                />
                <button
                  onClick={() => setShowPin(!showPin)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400 hover:text-slate-300"
                >
                  {showPin ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              <input
                type={showPin ? 'text' : 'password'}
                maxLength={4}
                placeholder="Confirm PIN"
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
                className={`w-full p-3 rounded-xl border text-sm font-mono tracking-widest text-center ${
                  isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-black'
                }`}
              />

              {pinError && (
                <div className="flex items-center gap-2 text-rose-400 text-[10px] bg-rose-400/10 p-2 rounded-lg border border-rose-400/20">
                  <AlertCircle size={12} />
                  <span>{pinError}</span>
                </div>
              )}

              <button
                onClick={handleUpdatePin}
                disabled={isUpdatingPin || newPin.length < 4}
                className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold flex items-center justify-center gap-2 transition"
              >
                {isUpdatingPin ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                <span>{isUpdatingPin ? 'Updating PIN...' : 'Save & Secure App'}</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {userSession?.role === 'COMPANY_ADMIN' && (
        <div className={`p-4 rounded-3xl border space-y-3 ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2 border-b pb-2 border-slate-800">
            <Building2 className="w-4 h-4 text-indigo-400" />
            Company Administration
          </h3>

          <div className="grid grid-cols-2 gap-2">
            <button 
              onClick={() => onNavigate('NOTIFICATION_ADMIN')}
              className="w-full p-3 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-950 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-xs font-bold flex flex-col items-center justify-center gap-2 transition text-slate-900 dark:text-slate-300">
              <Bell className="w-5 h-5 text-rose-400" />
              <span>Notification Config</span>
            </button>
            <button className="w-full p-3 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-950 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-xs font-bold flex flex-col items-center justify-center gap-2 transition text-slate-900 dark:text-slate-300">
              <Building2 className="w-5 h-5 text-indigo-400" />
              <span>Agency Profile</span>
            </button>
            <button className="w-full p-3 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-950 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-xs font-bold flex flex-col items-center justify-center gap-2 transition text-slate-900 dark:text-slate-300">
              <Sliders className="w-5 h-5 text-indigo-400" />
              <span>Branding Setup</span>
            </button>
            <button className="w-full p-3 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-950 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-xs font-bold flex flex-col items-center justify-center gap-2 transition text-slate-900 dark:text-slate-300">
              <Database className="w-5 h-5 text-indigo-400" />
              <span>Firebase Rules</span>
            </button>
            <button className="w-full p-3 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-950 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-xs font-bold flex flex-col items-center justify-center gap-2 transition text-slate-900 dark:text-slate-300">
              <FileText className="w-5 h-5 text-indigo-400" />
              <span>Security Audit Log</span>
            </button>
          </div>
        </div>
      )}

      {userSession?.role === 'SUPER_ADMIN' && (
        <div className={`p-4 rounded-3xl border space-y-3 ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2 border-b pb-2 border-slate-800">
            <Globe className="w-4 h-4 text-emerald-400" />
            Global Super Admin Configuration
          </h3>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => onNavigate('SUPER_ADMIN_COMPANIES')}
              className="w-full p-3 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-950 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-xs font-bold flex flex-col items-center justify-center gap-2 transition text-slate-900 dark:text-slate-300"
            >
              <Globe className="w-5 h-5 text-emerald-400" />
              <span>Global Tenants</span>
            </button>
            <button className="w-full p-3 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-950 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-xs font-bold flex flex-col items-center justify-center gap-2 transition text-slate-900 dark:text-slate-300">
              <Award className="w-5 h-5 text-emerald-400" />
              <span>License Tiers</span>
            </button>
            <button className="w-full p-3 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-950 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-xs font-bold flex flex-col items-center justify-center gap-2 transition text-slate-900 dark:text-slate-300">
              <Database className="w-5 h-5 text-emerald-400" />
              <span>Database Health</span>
            </button>
            <button className="w-full p-3 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-950 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-xs font-bold flex flex-col items-center justify-center gap-2 transition text-slate-900 dark:text-slate-300">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              <span>Platform Go-Live Audit</span>
            </button>
          </div>
        </div>
      )}

      
      {/* Notification Preferences (Phase 14) */}
      <div className={`p-4 rounded-3xl border space-y-3 ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2 border-b pb-2 border-slate-800">
          <Bell className="w-4 h-4 text-rose-400" />
          Notification Preferences
        </h3>

        <div className="space-y-2 text-xs">
          <div className="flex items-center justify-between p-3 rounded-2xl border border-slate-800/80">
            <div className="space-y-0.5">
              <span className="font-bold block">In-App Notifications</span>
              <span className="text-[10px] text-slate-400">Receive alerts within the application</span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={!!settings.inAppNotifications}
                onChange={(e) => updateSetting('inAppNotifications', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white dark:bg-slate-900 after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
            </label>
          </div>

          <div className="flex items-center justify-between p-3 rounded-2xl border border-slate-800/80">
            <div className="space-y-0.5">
              <span className="font-bold block">Email Notifications</span>
              <span className="text-[10px] text-slate-400">Receive summaries and important alerts via email</span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={!!settings.emailNotifications}
                onChange={(e) => updateSetting('emailNotifications', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white dark:bg-slate-900 after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
            </label>
          </div>

          <div className="flex items-center justify-between p-3 rounded-2xl border border-slate-800/80">
            <div className="space-y-0.5">
              <span className="font-bold block">Push Notifications (Mobile)</span>
              <span className="text-[10px] text-slate-400">Receive native push notifications on devices</span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={!!settings.pushNotifications}
                onChange={(e) => updateSetting('pushNotifications', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white dark:bg-slate-900 after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
            </label>
          </div>
          
          <div className="p-3 rounded-2xl border border-slate-800/80 flex justify-between items-center">
            <span className="font-bold">Alert Threshold</span>
            <select
              value={settings.alertThreshold || 'ALL'}
              onChange={(e) => updateSetting('alertThreshold', e.target.value)}
              className={`p-1.5 rounded-lg border text-xs outline-none ${isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-100 border-slate-200 text-black'}`}
            >
              <option value="ALL">All Events</option>
              <option value="IMPORTANT">Important Only</option>
              <option value="CRITICAL">Critical Only</option>
            </select>
          </div>
        </div>
      </div>

      {/* Location & GPS */}
      <div className={`p-4 rounded-3xl border space-y-3 ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2 border-b pb-2 border-slate-800">
          <MapPin className="w-4 h-4 text-emerald-400" />
          Location & GPS Services
        </h3>

        <div className="space-y-2">
          <div className="flex items-center justify-between p-3 rounded-2xl border border-slate-800/80">
            <div className="space-y-0.5">
              <span className="text-xs font-bold block">High-Accuracy GPS Location</span>
              <span className="text-[10px] text-slate-400 font-mono">Real-time geofence validation for attendance</span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={!!settings.gpsTrackingHighAccuracy}
                onChange={(e) => updateSetting('gpsTrackingHighAccuracy', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white dark:bg-slate-900 after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
            </label>
          </div>
        </div>
      </div>

      {/* Network & Offline Storage */}
      <div className={`p-4 rounded-3xl border space-y-3 ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2 border-b pb-2 border-slate-800">
          <Database className="w-4 h-4 text-indigo-400" />
          Offline Sync & Storage Engine
        </h3>

        <div className="space-y-2">
          <div className="flex items-center justify-between p-3 rounded-2xl border border-slate-800/80">
            <div className="space-y-0.5">
              <span className="text-xs font-bold block">Auto-Sync Queue on Network Reconnect</span>
              <span className="text-[10px] text-slate-400">Automatically upload local offline mutations</span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={!!settings.offlineAutoSync}
                onChange={(e) => updateSetting('offlineAutoSync', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white dark:bg-slate-900 after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
            </label>
          </div>

          <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800 text-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Firebase Firestore Status</span>
              <span className="text-emerald-400 font-mono font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Active (log-sheet-af97a)
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Pending Local Mutations</span>
              <span className="font-mono font-bold text-amber-400">
                {OfflineSyncService.getQueue().length} Items
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* System Information & Clear Cache */}
      <div className={`p-4 rounded-3xl border space-y-3 ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2 border-b pb-2 border-slate-800">
          <Shield className="w-4 h-4 text-emerald-400" />
          Consolidated System Diagnostics (Phases 4 & 5)
        </h3>

        <button
          onClick={handleRunDiagnostics}
          disabled={isTesting}
          className="w-full py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold flex items-center justify-center gap-2 transition shadow-sm"
        >
          <RefreshCw className={`w-4 h-4 ${isTesting ? 'animate-spin' : ''}`} />
          <span>{isTesting ? 'Running 15-Point Core Integrated Suite Tests...' : 'Run Consolidated Verification Diagnostics'}</span>
        </button>

        {testSuiteReport && (
          <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800 text-xs space-y-2 animate-in fade-in">
            <div className="flex items-center justify-between font-bold border-b border-slate-800 pb-2">
              <span>Automated Operations Tests Passed:</span>
              <span className="text-emerald-400 font-mono">{testSuiteReport.passedCount} / {testSuiteReport.results.length} PASSED</span>
            </div>
            <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
              {testSuiteReport.results.map((r, idx) => (
                <div key={idx} className="flex items-center justify-between text-[11px] py-0.5 border-b border-slate-900">
                  <span className="text-slate-300">{r.name}</span>
                  <span className={`font-mono font-bold ${r.passed ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {r.passed ? '✓ PASS' : '✗ FAIL'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* System Information & Clear Cache */}
      <div className={`p-4 rounded-3xl border space-y-3 ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2 border-b pb-2 border-slate-800">
          <Smartphone className="w-4 h-4 text-indigo-400" />
          Enterprise System Metadata
        </h3>

        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800">
            <span className="text-[10px] text-slate-400 block">App Version</span>
            <span className="font-mono font-bold">v1.0.0 (Build 2026.07)</span>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800">
            <span className="text-[10px] text-slate-400 block">License Tier</span>
            <span className="font-mono font-bold text-indigo-400">
              {activeCompany?.licenseTier || 'ENTERPRISE'}
            </span>
          </div>
        </div>

        <button
          onClick={onClearCache}
          className="w-full mt-2 py-2.5 rounded-2xl bg-rose-950/60 border border-rose-800 hover:bg-rose-900 text-rose-300 text-xs font-bold flex items-center justify-center gap-2 transition"
        >
          <Trash2 className="w-4 h-4" />
          <span>Clear Local Session Data & Re-verify</span>
        </button>
      </div>
    </div>
  );
};
