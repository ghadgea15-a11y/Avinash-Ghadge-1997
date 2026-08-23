import React from 'react';
import { 
  Menu, 
  Sun, 
  Moon, 
  Lock,
  Building2,
  LayoutDashboard
} from 'lucide-react';
import { PhaseAScreen, UserSession } from '../../types';
import { useTheme } from '../../context/ThemeContext';
import { AppLogo } from './AppLogo';
import { getNavItemsForRole, NavigationItemDef } from '../../config/navigationArchitecture';

interface TabletNavigationRailProps {
  currentScreen: PhaseAScreen;
  onNavigate: (screen: PhaseAScreen) => void;
  onOpenDrawer: () => void;
  unreadNotifCount: number;
  userSession: UserSession | null;
}

export const TabletNavigationRail: React.FC<TabletNavigationRailProps> = ({
  currentScreen,
  onNavigate,
  onOpenDrawer,
  unreadNotifCount,
  userSession,
}) => {
  const { setThemeMode, isDark } = useTheme();

  const isSuperAdmin = userSession?.role === 'SUPER_ADMIN';

  // Get primary top rail destinations for quick access
  const allRoleItems = getNavItemsForRole(userSession?.role, isSuperAdmin);

  // Pick primary high-frequency items for the rail
  const primaryRailScreens: PhaseAScreen[] = isSuperAdmin
    ? [
        'SUPER_ADMIN_DASHBOARD',
        'SUPER_ADMIN_COMPANIES',
        'SUPER_ADMIN_CREATE_COMPANY',
        'SUPER_ADMIN_SUBSCRIPTIONS',
        'SUPER_ADMIN_MODULES',
        'SUPER_ADMIN_LEADS',
        'SUPER_ADMIN_PENDING_APPROVALS',
        'NOTIFICATIONS',
        'SETTINGS',
      ]
    : [
        'ENTERPRISE_DASHBOARD',
        'EMPLOYEES',
        'ID_BADGES',
        'ATTENDANCE_SHIFTS',
        'SHIFT_ROSTER',
        'PAYROLL_COMPENSATION',
        'SITE_OPERATIONS',
        'WORK_ORDERS',
        'ASSET_TRACKING',
        'INVENTORY_STOCK',
        'CLIENT_MANAGEMENT',
        'PROCUREMENT_SRM',
        'COMPLIANCE',
        'APPROVAL_MANAGEMENT',
        'REPORTS_ANALYTICS',
        'NOTIFICATIONS',
        'SETTINGS',
      ];

  const activeDestinations = primaryRailScreens
    .map((s) => allRoleItems.find((item) => item.screen === s))
    .filter((item): item is NavigationItemDef => Boolean(item));

  return (
    <aside className={`w-20 border-r py-3 px-1 flex flex-col items-center justify-between shrink-0 z-20 ${
      isDark 
        ? isSuperAdmin ? 'bg-slate-950 border-amber-900/40 text-slate-100' : 'bg-slate-900 border-slate-800 text-slate-100' 
        : isSuperAdmin ? 'bg-amber-50/30 border-amber-200 text-slate-900' : 'bg-white border-slate-200 text-slate-900'
    }`}>
      {/* Top Section: Menu Trigger & Logo */}
      <div className="flex flex-col items-center gap-2.5 w-full">
        <button
          onClick={onOpenDrawer}
          className={`p-2 rounded-xl transition ${
            isDark ? 'hover:bg-slate-800 text-slate-300' : 'hover:bg-slate-100 text-slate-700'
          }`}
          title="Open All 15 Enterprise Modules"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex flex-col items-center">
          <AppLogo size="sm" variant="icon-only" />
          {isSuperAdmin && (
            <span className="text-[8px] font-extrabold uppercase tracking-wider text-amber-500 mt-1 bg-amber-500/10 px-1.5 py-0.5 rounded">
              Global
            </span>
          )}
        </div>

        {/* Primary Rail Destinations */}
        <div className="flex flex-col items-center gap-1 w-full mt-1 max-h-[calc(100vh-220px)] overflow-y-auto scrollbar-none">
          {activeDestinations.map(item => {
            const Icon = item.icon;
            const isActive = currentScreen === item.screen;
            const badge = item.badgeKey === 'unreadNotifCount' && unreadNotifCount > 0 ? unreadNotifCount : undefined;

            return (
              <button
                key={item.screen}
                onClick={() => onNavigate(item.screen)}
                className={`relative w-14 py-2 rounded-xl flex flex-col items-center justify-center gap-1 transition-all ${
                  isActive
                    ? isSuperAdmin
                      ? 'bg-amber-600 text-white shadow-md shadow-amber-600/30 font-bold scale-102'
                      : 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 font-bold scale-102'
                    : isDark
                      ? 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/80'
                      : isSuperAdmin
                        ? 'text-amber-900/80 hover:text-amber-600 hover:bg-amber-100/50'
                        : 'text-slate-600 hover:text-indigo-600 hover:bg-indigo-50'
                }`}
                title={`${item.label} (${item.dataType})`}
              >
                <div className="relative">
                  <Icon className="w-4 h-4" />
                  {badge !== undefined && (
                    <span className="absolute -top-1 -right-2 bg-rose-500 text-white text-[8px] font-bold w-3.5 h-3.5 rounded-full flex items-center justify-center animate-pulse">
                      {badge}
                    </span>
                  )}
                </div>
                <span className="text-[9px] font-medium tracking-tight truncate w-full text-center px-0.5">
                  {item.shortLabel || item.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Bottom User Avatar & Theme Switcher */}
      <div className="flex flex-col items-center gap-2.5">
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
              className={`w-9 h-9 rounded-full object-cover border-2 shadow ${
                isSuperAdmin ? 'border-amber-500 ring-2 ring-amber-500/20' : 'border-indigo-500'
              }`}
            />
          </button>
        )}
      </div>
    </aside>
  );
};
