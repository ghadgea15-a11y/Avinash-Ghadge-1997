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
  activeCompany?: import('../../types').CompanyTenant | null;
}

export const TabletNavigationRail: React.FC<TabletNavigationRailProps> = ({
  currentScreen,
  onNavigate,
  onOpenDrawer,
  unreadNotifCount,
  userSession,
  activeCompany,
}) => {
  const { setThemeMode, isDark } = useTheme();
  const isSuperAdmin = userSession?.role === 'SUPER_ADMIN';

  // Get primary top rail destinations for quick access
  const allRoleItems = getNavItemsForRole(userSession?.role, isSuperAdmin, activeCompany?.enabledModules);

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
        'TALENT_ACQUISITION',
        'PERFORMANCE_MANAGEMENT',
        'TRAINING_LMS',
        'ATTENDANCE_SHIFTS',
        'SHIFT_ROSTER',
        'WORKFORCE_CAPACITY',
        'PAYROLL_COMPENSATION',
        'EXPENSE_TRAVEL',
        'SITE_OPERATIONS',
        'WORK_ORDERS',
        'ASSET_TRACKING',
        'INVENTORY_STOCK',
        'CLIENT_MANAGEMENT',
        'PROCUREMENT_SRM',
        'COMPLIANCE',
        'DOCUMENT_LIFECYCLE',
        'APPROVAL_MANAGEMENT',
        'ENTERPRISE_INTEGRATIONS',
        'REPORTS_ANALYTICS',
        'OPERATIONAL_INTELLIGENCE',
        'NOTIFICATIONS',
        'SETTINGS',
      ];

  const activeDestinations = primaryRailScreens
    .map((s) => allRoleItems.find((item) => item.screen === s))
    .filter((item): item is NavigationItemDef => Boolean(item));

  return (
    <aside className={`w-[84px] border-r py-4 px-2 flex flex-col items-center justify-between shrink-0 z-20 ${
      isDark 
        ? isSuperAdmin ? 'bg-[#0a0a0b] border-amber-900/30 text-slate-100' : 'bg-[#0a0a0b] border-[#1f2228] text-slate-100' 
        : isSuperAdmin ? 'bg-amber-50/50 border-amber-200/50 text-slate-900' : 'bg-[#fcfcfd] border-[#eaebec] text-slate-900'
    }`}>
      {/* Top Section: Menu Trigger & Logo */}
      <div className="flex flex-col items-center gap-3 w-full">
        <button
          onClick={onOpenDrawer}
          className={`p-2.5 rounded-lg transition-colors ${
            isDark ? 'hover:bg-[#1f2228] text-slate-400 hover:text-slate-200' : 'hover:bg-[#f1f2f4] text-slate-500 hover:text-slate-900'
          }`}
          title="Open All 15 Enterprise Modules"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex flex-col items-center">
          <AppLogo size="sm" variant="icon-only" />
          {isSuperAdmin && (
            <span className="text-[9px] font-bold uppercase tracking-widest text-amber-600 mt-1.5 bg-amber-500/10 px-1.5 py-0.5 rounded-sm">
              Global
            </span>
          )}
        </div>

        {/* Primary Rail Destinations */}
        <div className="flex flex-col items-center gap-1.5 w-full mt-2 max-h-[calc(100vh-220px)] overflow-y-auto scrollbar-none">
          {activeDestinations.map(item => {
            const Icon = item.icon;
            const isActive = currentScreen === item.screen;
            const badge = item.badgeKey === 'unreadNotifCount' && unreadNotifCount > 0 ? unreadNotifCount : undefined;

            return (
              <button
                key={item.screen}
                onClick={() => onNavigate(item.screen)}
                className={`relative w-full py-2.5 rounded-lg flex flex-col items-center justify-center gap-1.5 transition-colors ${
                  isActive
                    ? isSuperAdmin
                      ? 'bg-amber-500/10 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400 font-semibold'
                      : 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-semibold'
                    : isDark
                      ? 'text-slate-400 hover:text-slate-200 hover:bg-[#1f2228]'
                      : isSuperAdmin
                        ? 'text-amber-900/70 hover:text-amber-900 hover:bg-amber-900/5'
                        : 'text-slate-500 hover:text-slate-900 hover:bg-[#f1f2f4]'
                }`}
                title={`${item.label} (${item.dataType})`}
              >
                <div className="relative">
                  <Icon className="w-4 h-4" />
                  {badge !== undefined && (
                    <span className="absolute -top-1.5 -right-2 bg-rose-500 text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center border border-white dark:border-[#0a0a0b]">
                      {badge}
                    </span>
                  )}
                </div>
                <span className="text-[11px] leading-tight font-medium tracking-tight truncate w-full text-center px-1">
                  {item.shortLabel || item.label}
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
          className={`p-2.5 rounded-lg border transition-colors ${
            isDark ? 'bg-[#141517] border-[#1f2228] hover:border-[#2f333a] text-slate-400 hover:text-slate-200' : 'bg-white border-[#eaebec] hover:border-[#d0d3d7] text-slate-500 hover:text-slate-900 shadow-sm'
          }`}
          title="Toggle Theme Mode"
        >
          {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        {userSession && activeCompany && (
          <button
            onClick={() => onNavigate('PROFILE')}
            className="relative p-0.5 rounded-full transition-opacity hover:opacity-80"
            title={`${userSession?.fullName} (${userSession?.role})`}
          >
            <img
              src={userSession?.avatarUrl || undefined}
              alt="Avatar"
              className={`w-9 h-9 rounded-full object-cover border-2 ${
                isSuperAdmin ? 'border-amber-500/50' : 'border-[#eaebec] dark:border-[#1f2228]'
              }`}
            />
          </button>
        )}
      </div>
    </aside>
  );
};
