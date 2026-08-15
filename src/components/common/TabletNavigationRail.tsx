import React from 'react';
import { 
  LayoutDashboard, 
  User, 
  Users, 
  Building2, 
  Bell, 
  Settings, 
  Menu, 
  Sun, 
  Moon, 
  ShieldCheck, 
  Clock, 
  UserCheck, 
  Layers, 
  Award, 
  PlusCircle, 
  CalendarDays, 
  DollarSign, 
  Boxes,
  QrCode,
  BarChart3
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

  const isSuperAdmin = userSession?.role === 'SUPER_ADMIN';

  // Super Admin specific destinations
  const superAdminDestinations = [
    { screen: 'SUPER_ADMIN_DASHBOARD' as PhaseAScreen, label: 'Overview', icon: LayoutDashboard },
    { screen: 'SUPER_ADMIN_COMPANIES' as PhaseAScreen, label: 'Tenants', icon: Building2 },
    { screen: 'SUPER_ADMIN_CREATE_COMPANY' as PhaseAScreen, label: 'New Tenant', icon: PlusCircle },
    { screen: 'SUPER_ADMIN_SUBSCRIPTIONS' as PhaseAScreen, label: 'Plans', icon: Award },
    { screen: 'SUPER_ADMIN_MODULES' as PhaseAScreen, label: 'Modules', icon: Layers },
    { screen: 'SUPER_ADMIN_PENDING_APPROVALS' as PhaseAScreen, label: 'Approvals', icon: UserCheck },
    { screen: 'NOTIFICATIONS' as PhaseAScreen, label: 'Alerts', icon: Bell, badge: unreadNotifCount },
    { screen: 'SETTINGS' as PhaseAScreen, label: 'Settings', icon: Settings },
  ];

  // Tenant / Company Admin / Staff destinations
  const tenantDestinations = [
    { screen: 'ENTERPRISE_DASHBOARD' as PhaseAScreen, label: 'Dashboard', icon: LayoutDashboard },
    { screen: 'COMPANY_MANAGEMENT' as PhaseAScreen, label: 'Company', icon: Building2, roles: ['COMPANY_ADMIN', 'HR_ADMIN', 'OPS_MANAGER'] },
    { screen: 'APPROVAL_MANAGEMENT' as PhaseAScreen, label: 'Approvals', icon: UserCheck, roles: ['COMPANY_ADMIN', 'HR_ADMIN'] },
    { screen: 'EMPLOYEES' as PhaseAScreen, label: 'Staff', icon: Users, roles: ['COMPANY_ADMIN', 'HR_ADMIN', 'OPS_MANAGER'] },
    { screen: 'ATTENDANCE_SHIFTS' as PhaseAScreen, label: 'Attendance', icon: Clock },
    { screen: 'LEAVE_MANAGEMENT' as PhaseAScreen, label: 'Leaves', icon: CalendarDays },
    { screen: 'PAYROLL_COMPENSATION' as PhaseAScreen, label: 'Payroll', icon: DollarSign },
    { screen: 'INVENTORY_STOCK' as PhaseAScreen, label: 'Inventory', icon: Boxes },
    { screen: 'ASSET_TRACKING' as PhaseAScreen, label: 'Assets', icon: QrCode },
    { screen: 'SITE_OPERATIONS' as PhaseAScreen, label: 'Operations', icon: ShieldCheck },
    { screen: 'REPORTS_ANALYTICS' as PhaseAScreen, label: 'Reports', icon: BarChart3 },
    { screen: 'NOTIFICATIONS' as PhaseAScreen, label: 'Alerts', icon: Bell, badge: unreadNotifCount },
    { screen: 'SETTINGS' as PhaseAScreen, label: 'Settings', icon: Settings },
  ];

  const activeDestinations = isSuperAdmin 
    ? superAdminDestinations 
    : tenantDestinations.filter(d => !d.roles || d.roles.includes(userSession?.role || ''));

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
          title="Open Navigation Menu"
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
        <div className="flex flex-col items-center gap-1 w-full mt-1">
          {activeDestinations.map(item => {
            const Icon = item.icon;
            const isActive = currentScreen === item.screen;

            return (
              <button
                key={item.label}
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
