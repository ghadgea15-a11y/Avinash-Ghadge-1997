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
  Clock, UserCheck
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
    { screen: 'ENTERPRISE_DASHBOARD' as PhaseAScreen, label: 'Dashboard', icon: LayoutDashboard },
    { screen: 'COMPANY_MANAGEMENT' as PhaseAScreen, label: 'Company', icon: Building2 },
    { screen: 'APPROVAL_MANAGEMENT' as PhaseAScreen, label: 'Approvals', icon: UserCheck },
    { screen: 'EMPLOYEES' as PhaseAScreen, label: 'Staff', icon: Users },
    { screen: 'ATTENDANCE_SHIFTS' as PhaseAScreen, label: 'Attendance', icon: Clock, UserCheck },
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
      {/* Top Section: Menu Trigger & Logo */}
      <div className="flex flex-col items-center gap-3 w-full">
        <button
          onClick={onOpenDrawer}
          className={`p-2 rounded-2xl transition ${
            isDark ? 'hover:bg-slate-800 text-slate-300' : 'hover:bg-slate-100 text-slate-700'
          }`}
          title="Open Drawer Menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <AppLogo size="sm" variant="icon-only" />

        {/* Primary Rail Destinations (Top Aligned in One Line) */}
        <div className="flex flex-col items-center gap-1.5 w-full mt-2">
          {destinations
            .filter(item => {
              if (item.screen === 'COMPANY_MANAGEMENT') return ['SUPER_ADMIN', 'COMPANY_ADMIN', 'HR_ADMIN', 'OPS_MANAGER'].includes(userSession?.role || '');
              if (item.screen === 'APPROVAL_MANAGEMENT') return ['SUPER_ADMIN', 'COMPANY_ADMIN', 'HR_ADMIN'].includes(userSession?.role || '');
              if (item.screen === 'EMPLOYEES') return !['GUARD', 'FIELD_OFFICER'].includes(userSession?.role || '');
              return true;
            })
            .map(item => {
            const Icon = item.icon;
            const isActive = currentScreen === item.screen;

            return (
              <button
                key={item.label}
                onClick={() => onNavigate(item.screen)}
                className={`relative w-14 py-2 rounded-xl flex flex-col items-center justify-center gap-1 transition-all ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 font-bold scale-102'
                    : isDark
                      ? 'text-slate-400 hover:text-slate-100 hover:bg-slate-800'
                      : 'text-slate-600 hover:text-indigo-600 hover:bg-indigo-50'
                }`}
                title={item.label}
              >
                <div className="relative">
                  <Icon className="w-4 h-4" />
                  {!!item.badge && item.badge > 0 && (
                    <span className="absolute -top-1 -right-2 bg-rose-500 text-white text-[8px] font-bold w-3.5 h-3.5 rounded-full flex items-center justify-center animate-pulse">
                      {item.badge}
                    </span>
                  )}
                </div>
                <span className="text-[9px] font-medium tracking-tight truncate w-full text-center">
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
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
