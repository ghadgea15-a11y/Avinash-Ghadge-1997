import React from 'react';
import { 
  Wifi, 
  WifiOff, 
  Smartphone, 
  Tablet, 
  Monitor,
  Lock, 
  LogOut, 
  Code2, 
  RefreshCw,
  Building2,
  ShieldCheck,
  UserCheck,
  Menu,
  Sun,
  Moon,
  Bell
} from 'lucide-react';
import { UserSession, CompanyTenant, PhaseAScreen } from '../../types';
import { useTheme } from '../../context/ThemeContext';
import { AppLogo } from './AppLogo';

interface HeaderProps {
  currentScreen: PhaseAScreen;
  onNavigate: (screen: PhaseAScreen) => void;
  activeCompany: CompanyTenant | null;
  userSession: UserSession | null;
  isOnline: boolean;
  viewportMode: 'PHONE' | 'TABLET' | 'FULLSCREEN';
  onToggleViewport: (mode: 'PHONE' | 'TABLET' | 'FULLSCREEN') => void;
  onLogout: () => void;
  onLockSession: () => void;
  offlineQueueCount: number;
  onOpenDrawer?: () => void;
  unreadNotifCount?: number;
}

export const Header: React.FC<HeaderProps> = ({
  currentScreen,
  onNavigate,
  activeCompany,
  userSession,
  isOnline,
  viewportMode,
  onToggleViewport,
  onLogout,
  onLockSession,
  offlineQueueCount,
  onOpenDrawer,
  unreadNotifCount = 0
}) => {
  const { isDark, setThemeMode } = useTheme();

  return (
    <header className={`px-4 py-2.5 flex items-center justify-between sticky top-0 z-40 shadow-lg border-b transition-colors ${
      isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-black'
    }`}>
      {/* Left branding & drawer toggle */}
      <div className="flex items-center gap-3">
        {onOpenDrawer && userSession && (
          <button
            onClick={onOpenDrawer}
            className={`p-2 rounded-xl border transition ${
              isDark ? 'bg-slate-950 border-slate-800 hover:bg-slate-800 text-slate-200' : 'bg-slate-100 border-slate-200 hover:bg-slate-200 text-black'
            }`}
            title="Open Drawer Menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}

        <div className="flex items-center gap-2 cursor-pointer" onClick={() => onNavigate(userSession ? 'EMPLOYEES' : 'LOGIN')}>
          <AppLogo size="sm" company={activeCompany} />
          {activeCompany && (
            <span className={`hidden lg:inline-block text-[10px] font-mono px-2 py-0.5 rounded-full border ${
              isDark ? 'bg-slate-800 border-slate-700 text-slate-400' : 'bg-slate-100 border-slate-200 text-slate-600'
            }`}>
              {activeCompany.companyId}
            </span>
          )}
        </div>
      </div>

      {/* Middle: Viewport Switcher & Code Viewer */}
      <div className="flex items-center gap-2">
        <div className={`p-1 rounded-lg border flex items-center gap-1 ${
          isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-100 border-slate-200'
        }`}>
          <button
            onClick={() => onToggleViewport('PHONE')}
            className={`flex items-center gap-1 text-xs px-2 py-1 rounded transition-all ${
              viewportMode === 'PHONE'
                ? 'bg-indigo-600 text-white font-medium shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Mobile Compact Layout (Phone)"
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Phone</span>
          </button>
          <button
            onClick={() => onToggleViewport('TABLET')}
            className={`flex items-center gap-1 text-xs px-2 py-1 rounded transition-all ${
              viewportMode === 'TABLET'
                ? 'bg-indigo-600 text-white font-medium shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Tablet Expanded Layout (Navigation Rail)"
          >
            <Tablet className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Tablet</span>
          </button>
          <button
            onClick={() => onToggleViewport('FULLSCREEN')}
            className={`flex items-center gap-1 text-xs px-2 py-1 rounded transition-all ${
              viewportMode === 'FULLSCREEN'
                ? 'bg-indigo-600 text-white font-medium shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Desktop Fullscreen Layout (PC/Laptop)"
          >
            <Monitor className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">PC / Laptop</span>
          </button>
        </div>

        {/* Theme Mode Toggle Button */}
        <button
          onClick={() => setThemeMode(isDark ? 'LIGHT' : 'DARK')}
          className={`p-1.5 rounded-lg border transition ${
            isDark ? 'bg-slate-950 border-slate-800 text-amber-400' : 'bg-slate-100 border-slate-200 text-indigo-600'
          }`}
          title={`Switch to ${isDark ? 'Light' : 'Dark'} Mode`}
        >
          {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        {userSession && (
          <button
            onClick={() => onNavigate('NOTIFICATIONS')}
            className={`relative p-1.5 rounded-lg border transition ${
              currentScreen === 'NOTIFICATIONS'
                ? 'bg-indigo-600 text-white border-indigo-500'
                : isDark ? 'bg-slate-950 border-slate-800 text-slate-300' : 'bg-slate-100 border-slate-200 text-slate-900'
            }`}
            title="Notifications"
          >
            <Bell className="w-4 h-4" />
            {unreadNotifCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[8px] font-bold w-3.5 h-3.5 rounded-full flex items-center justify-center animate-pulse">
                {unreadNotifCount}
              </span>
            )}
          </button>
        )}

        <button
          onClick={() => onNavigate(currentScreen === 'KOTLIN_CODE_VIEWER' ? (userSession ? 'EMPLOYEES' : 'LOGIN') : 'KOTLIN_CODE_VIEWER')}
          className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border transition-all ${
            currentScreen === 'KOTLIN_CODE_VIEWER'
              ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 font-semibold'
              : isDark ? 'bg-slate-800 text-slate-300 border-slate-700' : 'bg-slate-100 text-black border-slate-300'
          }`}
        >
          <Code2 className="w-3.5 h-3.5 text-amber-400" />
          <span className="hidden md:inline">Kotlin Source</span>
        </button>
      </div>

      {/* Right: Network Status & User Session */}
      <div className="flex items-center gap-2">
        <div 
          className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium border ${
            isOnline 
              ? 'bg-emerald-950/80 text-emerald-400 border-emerald-800' 
              : 'bg-amber-950/80 text-amber-400 border-amber-800'
          }`}
          title={isOnline ? 'Network Connected - Firebase Online' : 'Network Disconnected - Offline Cache Mode'}
        >
          {isOnline ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5 animate-pulse" />}
          <span className="hidden sm:inline">{isOnline ? 'Online' : 'Offline'}</span>
          {offlineQueueCount > 0 && (
            <span className="bg-amber-500 text-slate-950 text-[10px] font-bold px-1.5 rounded-full">
              {offlineQueueCount}
            </span>
          )}
        </div>

        {userSession ? (
          <div className={`flex items-center gap-2 pl-2 pr-1 py-1 rounded-full border ${
            isDark ? 'bg-slate-800/90 border-slate-700' : 'bg-slate-100 border-slate-200'
          }`}>
            <button
              onClick={() => onNavigate('PROFILE')}
              className="flex items-center gap-1.5 text-left"
            >
              <UserCheck className="w-3.5 h-3.5 text-indigo-400" />
              <div className="hidden lg:block">
                <p className="text-xs font-semibold leading-none">{userSession.fullName.split(' ')[0]}</p>
                <p className="text-[10px] text-indigo-400 font-mono leading-none mt-0.5">{userSession.role}</p>
              </div>
            </button>
            
            <button
              onClick={onLockSession}
              className="p-1 text-slate-400 hover:text-amber-400 rounded-full hover:bg-slate-700 transition"
              title="Lock Session"
            >
              <Lock className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onLogout}
              className="p-1 text-slate-400 hover:text-rose-400 rounded-full hover:bg-slate-700 transition"
              title="Logout Session"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => onNavigate('LOGIN')}
            className="text-xs text-indigo-300 hover:text-white bg-indigo-950/80 border border-indigo-800 px-2.5 py-1 rounded-full flex items-center gap-1"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Reset</span>
          </button>
        )}
      </div>
    </header>
  );
};
