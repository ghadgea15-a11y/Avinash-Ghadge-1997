import React from 'react';
import { 
  ShieldAlert, 
  RefreshCw, 
  LogOut, 
  Clock, 
  Building2, 
  ExternalLink,
  Lock
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { PlatformGlobalConfig } from '../../types/platform';
import { UserSession, CompanyTenant } from '../../types';

interface MaintenanceGateScreenProps {
  config: PlatformGlobalConfig | null;
  userSession: UserSession | null;
  activeCompany: CompanyTenant | null;
  onLogout: () => void;
  onNavigateToSuperAdminLogin?: () => void;
  onRecheck?: () => void;
}

export const MaintenanceGateScreen: React.FC<MaintenanceGateScreenProps> = ({
  config,
  userSession,
  activeCompany,
  onLogout,
  onNavigateToSuperAdminLogin,
  onRecheck
}) => {
  const { isDark } = useTheme();

  const maintenanceNotice = 
    config?.maintenanceMessage?.trim() || 
    config?.maintenanceBannerMessage?.trim() || 
    'Scheduled system maintenance and edge synchronization is currently in progress. Tenant workspaces are temporarily locked to protect data integrity.';

  const tenantCode = activeCompany?.companyId || userSession?.companyId || 'TENANT_WORKSPACE';
  const tenantName = activeCompany?.name || activeCompany?.brandName || userSession?.companyName || tenantCode;

  return (
    <div className={`min-h-screen w-full flex items-center justify-center p-4 sm:p-6 transition-colors duration-200 ${
      isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-100 text-slate-900'
    }`}>
      <div className={`w-full max-w-xl rounded-2xl border p-6 sm:p-8 shadow-xl ${
        isDark ? 'bg-slate-900/90 border-rose-900/40 text-slate-100' : 'bg-white border-rose-200 text-slate-900'
      }`}>
        
        {/* Top Status Pill */}
        <div className="flex items-center justify-between gap-3 pb-5 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span>
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">
              Platform Maintenance Mode Active
            </span>
          </div>
          <span className="text-xs font-mono px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500">
            HTTP 503 Gated
          </span>
        </div>

        {/* Central Icon & Title */}
        <div className="pt-6 pb-4 text-center">
          <div className="mx-auto w-16 h-16 rounded-2xl flex items-center justify-center mb-4 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800/60 text-rose-600 dark:text-rose-400">
            <ShieldAlert className="w-9 h-9" />
          </div>
          <h1 className="text-2xl font-black tracking-tight">
            System Maintenance in Progress
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Access restricted for regular company personnel until maintenance completion
          </p>
        </div>

        {/* Custom Super Admin Message Box */}
        <div className="my-4 p-4 rounded-xl border bg-rose-50/60 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900/50">
          <div className="flex items-center gap-2 text-xs font-bold text-rose-800 dark:text-rose-300 uppercase tracking-wide mb-1.5">
            <Clock className="w-3.5 h-3.5" />
            <span>Super Administrator Notice</span>
          </div>
          <p className="text-sm font-medium leading-relaxed text-rose-950 dark:text-rose-100 whitespace-pre-wrap">
            {maintenanceNotice}
          </p>
        </div>

        {/* Affected Tenant Context Card */}
        <div className={`p-4 rounded-xl border mb-6 text-xs ${
          isDark ? 'bg-slate-950/60 border-slate-800 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'
        }`}>
          <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800 mb-2">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-slate-400" />
              <span className="font-semibold">Affected Tenant Workspace</span>
            </div>
            <span className="font-mono px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold">
              {tenantCode}
            </span>
          </div>
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-500">Company Name:</span>
            <span className="font-medium text-slate-900 dark:text-slate-100">{tenantName}</span>
          </div>
          {userSession?.email && (
            <div className="flex justify-between items-center text-xs mt-1">
              <span className="text-slate-500">Logged in User:</span>
              <span className="font-mono text-slate-900 dark:text-slate-100">{userSession.email}</span>
            </div>
          )}
          <div className="flex justify-between items-center text-xs mt-1">
            <span className="text-slate-500">Real-time Synchronization:</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Listening to Edge Doc (Auto-restore)
            </span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-col sm:flex-row items-center gap-3">
          {onRecheck && (
            <button
              onClick={onRecheck}
              className="w-full sm:flex-1 py-2.5 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white transition shadow-sm"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Check Status Again</span>
            </button>
          )}

          <button
            onClick={onLogout}
            className={`w-full sm:flex-1 py-2.5 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 border transition ${
              isDark ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200' : 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-800'
            }`}
          >
            <LogOut className="w-4 h-4 text-rose-500" />
            <span>Sign Out Workstation</span>
          </button>
        </div>

        {/* Bypass for Super Admin */}
        {onNavigateToSuperAdminLogin && (
          <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-800 text-center">
            <button
              onClick={onNavigateToSuperAdminLogin}
              className="text-xs text-slate-500 hover:text-indigo-500 transition inline-flex items-center gap-1"
            >
              <Lock className="w-3 h-3" />
              <span>Are you a Super Administrator? Access Platform Control Plane</span>
            </button>
          </div>
        )}

      </div>
    </div>
  );
};
