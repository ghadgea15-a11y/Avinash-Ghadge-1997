import React from 'react';
import { 
  LayoutDashboard, 
  User, 
  Users,
  Building2,
  Bell, 
  Settings, 
  Code, 
  Menu, 
  Lock, 
  Sun, 
  Moon,
  ShieldCheck,
  Clock
} from 'lucide-react';
import { PhaseAScreen, UserSession, UserRole } from '../../types';
import { useTheme } from '../../context/ThemeContext';
import { AppLogo } from './AppLogo';

interface TabletNavigationRailProps {
  currentScreen: PhaseAScreen;
  onNavigate: (screen: PhaseAScreen) => void;
  onOpenDrawer: () => void;
  unreadNotifCount: number;
  userSession: UserSession | null;
  onRoleSwitch: (role: UserRole) => void;
}

export const TabletNavigationRail: React.FC<TabletNavigationRailProps> = ({
  currentScreen,
  onNavigate,
  onOpenDrawer,
  unreadNotifCount,
  userSession,
  onRoleSwitch
}) => {
  const { themeMode, setThemeMode, isDark } = useTheme();

  const destinations = [
    { screen: 'ROLE_DASHBOARD' as PhaseAScreen, label: 'Dashboard', icon: LayoutDashboard },
    { screen: 'COMPANY_MANAGEMENT' as PhaseAScreen, label: 'Company', icon: Building2 },
    { screen: 'EMPLOYEES' as PhaseAScreen, label: 'Staff', icon: Users },
    { screen: 'ATTENDANCE_SHIFTS' as PhaseAScreen, label: 'Attendance', icon: Clock },
    { screen: 'SITE_OPERATIONS' as PhaseAScreen, label: 'Operations', icon: ShieldCheck },
    { screen: 'PROFILE' as PhaseAScreen, label: 'Profile', icon: User },
    { screen: 'NOTIFICATIONS' as PhaseAScreen, label: 'Alerts', icon: Bell, badge: unreadNotifCount },
    { screen: 'SETTINGS' as PhaseAScreen, label: 'Settings', icon: Settings },
    { screen: 'KOTLIN_CODE_VIEWER' as PhaseAScreen, label: 'Kotlin Code', icon: Code }
  ];

  return (
    <aside className={`w-20 border-r py-3 px-1 flex flex-col items-center justify-between shrink-0 z-20 ${
      isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
    }`}>
      {/* Top Menu Trigger & Logo */}
      <div className="flex flex-col items-center gap-4">
        <button
          onClick={onOpenDrawer}
          className={`p-2.5 rounded-2xl transition ${
            isDark ? 'hover:bg-slate-800 text-slate-300' : 'hover:bg-slate-100 text-slate-700'
          }`}
          title="Open Drawer Menu"
        >
          <Menu className="w-6 h-6" />
        </button>

        <AppLogo size="sm" variant="icon-only" />
      </div>

      {/* Primary Rail Destinations */}
      <div className="flex flex-col items-center gap-3 my-auto w-full">
        {destinations.map(item => {
          const Icon = item.icon;
          const isActive = currentScreen === item.screen;

          return (
            <button
              key={item.label}
              onClick={() => onNavigate(item.screen)}
              className={`relative w-14 py-2.5 rounded-2xl flex flex-col items-center justify-center gap-1 transition-all ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 font-bold scale-105'
                  : isDark
                    ? 'text-slate-400 hover:text-slate-100 hover:bg-slate-800'
                    : 'text-slate-600 hover:text-indigo-600 hover:bg-indigo-50'
              }`}
              title={item.label}
            >
              <div className="relative">
                <Icon className="w-5 h-5" />
                {!!item.badge && item.badge > 0 && (
                  <span className="absolute -top-1 -right-2 bg-rose-500 text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center animate-pulse">
                    {item.badge}
                  </span>
                )}
              </div>
              <span className="text-[9px] tracking-tight truncate w-full text-center">
                {item.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Bottom User Avatar & Theme Switcher */}
      <div className="flex flex-col items-center gap-3">
        <button
          onClick={() => setThemeMode(isDark ? 'LIGHT' : 'DARK')}
          className={`p-2 rounded-xl border transition ${
            isDark ? 'bg-slate-950 border-slate-800 text-amber-400' : 'bg-slate-100 border-slate-200 text-indigo-600'
          }`}
          title="Toggle Theme Mode"
        >
          {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        {userSession && (
          <button
            onClick={() => onNavigate('PROFILE')}
            className="relative"
            title={`${userSession.fullName} (${userSession.role})`}
          >
            <img
              src={userSession.avatarUrl || undefined}
              alt="Avatar"
              className="w-9 h-9 rounded-full object-cover border-2 border-indigo-500 shadow"
            />
          </button>
        )}
      </div>
    </aside>
  );
};
