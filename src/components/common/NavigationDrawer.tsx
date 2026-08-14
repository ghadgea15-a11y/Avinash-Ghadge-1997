import React from 'react';
import { 
  X, 
  LayoutDashboard, 
  User, 
  Bell, 
  Settings, 
  Code, 
  Lock, 
  LogOut, 
  ShieldCheck, 
  Building2, 
  Sun, 
  Moon, 
  ChevronRight,
  Wifi,
  WifiOff,
  UserCheck,
  Clock
} from 'lucide-react';
import { PhaseAScreen, UserSession, CompanyTenant, UserRole, AppNotification } from '../../types';
import { useTheme } from '../../context/ThemeContext';
import { AppLogo } from './AppLogo';

interface NavigationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  currentScreen: PhaseAScreen;
  onNavigate: (screen: PhaseAScreen) => void;
  userSession: UserSession | null;
  activeCompany: CompanyTenant | null;
  unreadNotifCount: number;
  onRoleSwitch: (role: UserRole) => void;
  onLockSession: () => void;
  onLogout: () => void;
  isOnline: boolean;
}

export const NavigationDrawer: React.FC<NavigationDrawerProps> = ({
  isOpen,
  onClose,
  currentScreen,
  onNavigate,
  userSession,
  activeCompany,
  unreadNotifCount,
  onRoleSwitch,
  onLockSession,
  onLogout,
  isOnline
}) => {
  const { themeMode, setThemeMode, isDark } = useTheme();

  if (!isOpen) return null;

  const roles: { role: UserRole; label: string }[] = [
    { role: 'GUARD', label: 'Security Guard' },
    { role: 'FIELD_OFFICER', label: 'Field Officer' },
    { role: 'OPS_MANAGER', label: 'Ops Manager' },
    { role: 'HR_ADMIN', label: 'HR Admin' },
    { role: 'COMPANY_ADMIN', label: 'Company Admin' },
    { role: 'SUPER_ADMIN', label: 'Super Admin' }
  ];

  return (
    <div className="fixed inset-0 z-50 flex animate-in fade-in duration-200">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Drawer Container (Material Design 3 Standard Navigation Drawer) */}
      <div className={`relative w-80 max-w-[85vw] h-full flex flex-col z-10 shadow-2xl transition-transform duration-300 ${
        isDark ? 'bg-slate-900 border-r border-slate-800 text-slate-100' : 'bg-white border-r border-slate-200 text-slate-900'
      }`}>
        {/* Header */}
        <div className={`p-5 border-b ${isDark ? 'border-slate-800 bg-slate-950/60' : 'border-slate-200 bg-indigo-50/50'}`}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <AppLogo size="md" showSubtitle={true} />
            </div>

            <button
              onClick={onClose}
              className={`p-2 rounded-full transition ${isDark ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-200 text-slate-600'}`}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* User Info Tile */}
          {userSession && (
            <div className={`p-3 rounded-2xl border flex items-center gap-3 ${
              isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
            }`}>
              <img
                src={userSession.avatarUrl || undefined}
                alt="Avatar"
                className="w-11 h-11 rounded-full object-cover border-2 border-indigo-500 shadow"
              />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold truncate">{userSession.fullName}</p>
                <p className="text-[10px] text-indigo-400 font-mono font-semibold">{userSession.role}</p>
                <p className="text-[10px] text-slate-400 font-mono truncate">{userSession.employeeId}</p>
              </div>
            </div>
          )}
        </div>

        {/* Navigation Items Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Main Navigation Group */}
          <div>
            <p className={`text-[10px] font-bold uppercase tracking-wider px-3 mb-2 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Main Navigation
            </p>
            <div className="space-y-1">
              

              {(userSession?.role !== 'GUARD' && userSession?.role !== 'FIELD_OFFICER') && (
              <button
                onClick={() => { onNavigate('EMPLOYEES'); onClose(); }}
                className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl text-xs font-semibold transition ${
                  currentScreen === 'EMPLOYEES'
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                    : isDark 
                      ? 'text-slate-300 hover:bg-slate-800 hover:text-white' 
                      : 'text-slate-700 hover:bg-slate-100 hover:text-indigo-600'
                }`}
              >
                <div className="flex items-center gap-3">
                  <UserCheck className="w-4 h-4 text-emerald-400" />
                  <span>Employee Management</span>
                </div>
                <ChevronRight className="w-4 h-4 opacity-50" />
              </button>
              )}

              <button
                onClick={() => { onNavigate('ATTENDANCE_SHIFTS'); onClose(); }}
                className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl text-xs font-semibold transition ${
                  currentScreen === 'ATTENDANCE_SHIFTS'
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                    : isDark 
                      ? 'text-slate-300 hover:bg-slate-800 hover:text-white' 
                      : 'text-slate-700 hover:bg-slate-100 hover:text-indigo-600'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Clock className="w-4 h-4 text-amber-400" />
                  <span>Attendance & Shifts</span>
                </div>
                <ChevronRight className="w-4 h-4 opacity-50" />
              </button>

              <button
                onClick={() => { onNavigate('SITE_OPERATIONS'); onClose(); }}
                className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl text-xs font-semibold transition ${
                  currentScreen === 'SITE_OPERATIONS'
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                    : isDark 
                      ? 'text-slate-300 hover:bg-slate-800 hover:text-white' 
                      : 'text-slate-700 hover:bg-slate-100 hover:text-indigo-600'
                }`}
              >
                <div className="flex items-center gap-3">
                  <ShieldCheck className="w-4 h-4 text-sky-400" />
                  <span>Site Operations & Patrols</span>
                </div>
                <ChevronRight className="w-4 h-4 opacity-50" />
              </button>

              <button
                onClick={() => { onNavigate('COMPANY_MANAGEMENT'); onClose(); }}
                className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl text-xs font-semibold transition ${
                  currentScreen === 'COMPANY_MANAGEMENT'
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                    : isDark 
                      ? 'text-slate-300 hover:bg-slate-800 hover:text-white' 
                      : 'text-slate-700 hover:bg-slate-100 hover:text-indigo-600'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Building2 className="w-4 h-4 text-purple-400" />
                  <span>Company & RBAC</span>
                </div>
                <ChevronRight className="w-4 h-4 opacity-50" />
              </button>

              {/* Super Admin Control Section */}
              {(userSession?.role === 'SUPER_ADMIN') && (
                <div className="pt-2 pb-1 border-t border-amber-800/40 my-2 space-y-1">
                  <p className="text-[10px] font-bold uppercase tracking-wider px-3 mb-1 text-amber-400 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                    <span>Super Admin Control Center</span>
                  </p>
                  
                  <button
                    onClick={() => { onNavigate('SUPER_ADMIN_DASHBOARD'); onClose(); }}
                    className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-semibold transition ${
                      currentScreen === 'SUPER_ADMIN_DASHBOARD'
                        ? 'bg-amber-600 text-white shadow-lg shadow-amber-600/30'
                        : isDark 
                          ? 'text-amber-200/90 hover:bg-amber-950/60' 
                          : 'text-amber-900 hover:bg-amber-50'
                    }`}
                  >
                    <span>Super Admin Dashboard</span>
                    <ChevronRight className="w-4 h-4 opacity-50" />
                  </button>

                  <button
                    onClick={() => { onNavigate('SUPER_ADMIN_CREATE_COMPANY'); onClose(); }}
                    className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-semibold transition ${
                      currentScreen === 'SUPER_ADMIN_CREATE_COMPANY'
                        ? 'bg-amber-600 text-white shadow-lg shadow-amber-600/30'
                        : isDark 
                          ? 'text-amber-200/90 hover:bg-amber-950/60' 
                          : 'text-amber-900 hover:bg-amber-50'
                    }`}
                  >
                    <span>Register New Tenant</span>
                    <ChevronRight className="w-4 h-4 opacity-50" />
                  </button>

                  <button
                    onClick={() => { onNavigate('SUPER_ADMIN_MODULES'); onClose(); }}
                    className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-semibold transition ${
                      currentScreen === 'SUPER_ADMIN_MODULES'
                        ? 'bg-amber-600 text-white shadow-lg shadow-amber-600/30'
                        : isDark 
                          ? 'text-amber-200/90 hover:bg-amber-950/60' 
                          : 'text-amber-900 hover:bg-amber-50'
                    }`}
                  >
                    <span>Module Access & Entitlements</span>
                    <ChevronRight className="w-4 h-4 opacity-50" />
                  </button>
                </div>
              )}

              <button
                onClick={() => { onNavigate('PROFILE'); onClose(); }}
                className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl text-xs font-semibold transition ${
                  currentScreen === 'PROFILE'
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                    : isDark 
                      ? 'text-slate-300 hover:bg-slate-800 hover:text-white' 
                      : 'text-slate-700 hover:bg-slate-100 hover:text-indigo-600'
                }`}
              >
                <div className="flex items-center gap-3">
                  <User className="w-4 h-4" />
                  <span>Employee Profile</span>
                </div>
                <ChevronRight className="w-4 h-4 opacity-50" />
              </button>

              <button
                onClick={() => { onNavigate('NOTIFICATIONS'); onClose(); }}
                className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl text-xs font-semibold transition ${
                  currentScreen === 'NOTIFICATIONS'
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                    : isDark 
                      ? 'text-slate-300 hover:bg-slate-800 hover:text-white' 
                      : 'text-slate-700 hover:bg-slate-100 hover:text-indigo-600'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Bell className="w-4 h-4" />
                  <span>Notifications</span>
                </div>
                {unreadNotifCount > 0 && (
                  <span className="bg-rose-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                    {unreadNotifCount}
                  </span>
                )}
              </button>

              <button
                onClick={() => { onNavigate('SETTINGS'); onClose(); }}
                className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl text-xs font-semibold transition ${
                  currentScreen === 'SETTINGS'
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                    : isDark 
                      ? 'text-slate-300 hover:bg-slate-800 hover:text-white' 
                      : 'text-slate-700 hover:bg-slate-100 hover:text-indigo-600'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Settings className="w-4 h-4" />
                  <span>Settings & Preferences</span>
                </div>
                <ChevronRight className="w-4 h-4 opacity-50" />
              </button>
            </div>
          </div>

          {/* Role Switcher Section */}
          <div>
            <p className={`text-[10px] font-bold uppercase tracking-wider px-3 mb-2 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Switch Role Preview
            </p>
            <div className="grid grid-cols-2 gap-1.5">
              {roles.map(({ role, label }) => (
                <button
                  key={role}
                  onClick={() => {
                    onRoleSwitch(role);
                    onClose();
                  }}
                  className={`p-2 rounded-xl text-left text-[11px] font-medium border transition ${
                    userSession?.role === role
                      ? 'bg-indigo-600 text-white border-indigo-500 font-bold shadow'
                      : isDark
                        ? 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                        : 'bg-slate-100 border-slate-200 text-slate-800 hover:bg-slate-200'
                  }`}
                >
                  <span className="block truncate">{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Dev Tools & Code Viewer */}
          <div>
            <p className={`text-[10px] font-bold uppercase tracking-wider px-3 mb-2 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Developer Resources
            </p>
            <button
              onClick={() => { onNavigate('KOTLIN_CODE_VIEWER'); onClose(); }}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-semibold border transition ${
                currentScreen === 'KOTLIN_CODE_VIEWER'
                  ? 'bg-indigo-600 text-white border-indigo-500'
                  : isDark
                    ? 'bg-slate-950 border-slate-800 text-indigo-400 hover:border-indigo-800'
                    : 'bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Code className="w-4 h-4" />
                <span>Kotlin Jetpack Code</span>
              </div>
              <ChevronRight className="w-4 h-4 opacity-50" />
            </button>
          </div>
        </div>

        {/* Footer Actions */}
        <div className={`p-4 border-t space-y-2 ${isDark ? 'border-slate-800 bg-slate-950/80' : 'border-slate-200 bg-slate-50'}`}>
          {/* Theme Mode Toggle */}
          <div className="flex items-center justify-between p-2 rounded-xl border border-slate-700/50">
            <span className="text-xs font-medium">Theme Mode</span>
            <div className="flex items-center gap-1 bg-slate-800/80 p-1 rounded-lg">
              <button
                onClick={() => setThemeMode('LIGHT')}
                className={`p-1.5 rounded-md text-xs transition ${!isDark ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}
                title="Light Theme"
              >
                <Sun className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setThemeMode('DARK')}
                className={`p-1.5 rounded-md text-xs transition ${isDark ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}
                title="Dark Theme"
              >
                <Moon className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              onClick={() => { onLockSession(); onClose(); }}
              className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border transition ${
                isDark 
                  ? 'bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800' 
                  : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100'
              }`}
            >
              <Lock className="w-3.5 h-3.5 text-amber-500" />
              <span>Lock</span>
            </button>

            <button
              onClick={() => { onLogout(); onClose(); }}
              className="py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 bg-rose-600 hover:bg-rose-500 text-white shadow transition"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
