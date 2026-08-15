import React from 'react';
import { 
  X, 
  LayoutDashboard, 
  User, 
  Bell, 
  Settings, 
  Lock, 
  LogOut, 
  ShieldCheck, 
  Building2, 
  Sun, 
  Moon, 
  ChevronRight,
  UserCheck,
  Clock,
  Layers,
  Award,
  PlusCircle,
  Users,
  CalendarDays,
  CreditCard,
  DollarSign,
  Boxes,
  QrCode,
  BarChart3
} from 'lucide-react';
import { PhaseAScreen, UserSession, CompanyTenant, UserRole } from '../../types';
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
  onLockSession,
  onLogout
}) => {
  const { themeMode, setThemeMode, isDark } = useTheme();

  if (!isOpen) return null;

  const isSuperAdmin = userSession?.role === 'SUPER_ADMIN';

  return (
    <div className="fixed inset-0 z-50 flex animate-in fade-in duration-200">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Drawer Container */}
      <div className={`relative w-80 max-w-[85vw] h-full flex flex-col z-10 shadow-2xl transition-transform duration-300 ${
        isDark ? 'bg-slate-900 border-r border-slate-800 text-slate-100' : 'bg-white border-r border-slate-200 text-slate-900'
      }`}>
        {/* Header */}
        <div className={`p-4 pb-3 border-b ${
          isSuperAdmin
            ? isDark ? 'border-amber-900/40 bg-amber-950/20' : 'border-amber-200 bg-amber-50/50'
            : isDark ? 'border-slate-800 bg-slate-950/60' : 'border-slate-200 bg-indigo-50/50'
        }`}>
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex items-center gap-2">
              <AppLogo size="sm" showSubtitle={true} />
            </div>

            <button
              onClick={onClose}
              className={`p-1.5 rounded-full transition ${isDark ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-200 text-slate-600'}`}
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* User Info Tile */}
          {userSession && (
            <div className={`p-2.5 rounded-xl border flex items-center gap-2.5 ${
              isSuperAdmin
                ? isDark ? 'bg-slate-950 border-amber-900/50' : 'bg-white border-amber-200 shadow-sm'
                : isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
            }`}>
              <img
                src={userSession.avatarUrl || undefined}
                alt="Avatar"
                className={`w-9 h-9 rounded-full object-cover border-2 shadow ${
                  isSuperAdmin ? 'border-amber-500' : 'border-indigo-500'
                }`}
              />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold truncate">{userSession.fullName}</p>
                <div className="flex items-center gap-1">
                  <span className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded ${
                    isSuperAdmin
                      ? 'bg-amber-500/20 text-amber-500 dark:text-amber-400'
                      : 'bg-indigo-500/20 text-indigo-600 dark:text-indigo-400'
                  }`}>
                    {userSession.role}
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 font-mono truncate">{userSession.employeeId}</p>
              </div>
            </div>
          )}
        </div>

        {/* Navigation Items Body */}
        <div className="flex-1 overflow-y-auto p-2.5 space-y-3">
          
          {/* ======================================================== */}
          {/* 1. SUPER ADMIN EXCLUSIVE NAVIGATION                      */}
          {/* ======================================================== */}
          {isSuperAdmin ? (
            <div>
              <p className={`text-[10px] font-bold uppercase tracking-wider px-2 mb-1.5 flex items-center gap-1.5 text-amber-500`}>
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Global Platform Administration</span>
              </p>
              <div className="space-y-1">
                {/* 1. Global Overview */}
                <button
                  onClick={() => { onNavigate('SUPER_ADMIN_DASHBOARD'); onClose(); }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition ${
                    currentScreen === 'SUPER_ADMIN_DASHBOARD'
                      ? 'bg-amber-600 text-white shadow-md shadow-amber-600/30'
                      : isDark 
                        ? 'text-slate-300 hover:bg-slate-800 hover:text-white' 
                        : 'text-slate-700 hover:bg-amber-50 hover:text-amber-700'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <LayoutDashboard className="w-4 h-4 text-amber-400" />
                    <span>Global Dashboard</span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 opacity-50" />
                </button>

                {/* 2. Tenant Directory */}
                <button
                  onClick={() => { onNavigate('SUPER_ADMIN_COMPANIES'); onClose(); }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition ${
                    currentScreen === 'SUPER_ADMIN_COMPANIES'
                      ? 'bg-amber-600 text-white shadow-md shadow-amber-600/30'
                      : isDark 
                        ? 'text-slate-300 hover:bg-slate-800 hover:text-white' 
                        : 'text-slate-700 hover:bg-amber-50 hover:text-amber-700'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Building2 className="w-4 h-4 text-sky-400" />
                    <span>Tenant Management</span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 opacity-50" />
                </button>

                {/* 3. Onboard New Tenant */}
                <button
                  onClick={() => { onNavigate('SUPER_ADMIN_CREATE_COMPANY'); onClose(); }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition ${
                    currentScreen === 'SUPER_ADMIN_CREATE_COMPANY'
                      ? 'bg-amber-600 text-white shadow-md shadow-amber-600/30'
                      : isDark 
                        ? 'text-slate-300 hover:bg-slate-800 hover:text-white' 
                        : 'text-slate-700 hover:bg-amber-50 hover:text-amber-700'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <PlusCircle className="w-4 h-4 text-emerald-400" />
                    <span>Register New Tenant</span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 opacity-50" />
                </button>

                {/* 4. Subscription Plans */}
                <button
                  onClick={() => { onNavigate('SUPER_ADMIN_SUBSCRIPTIONS'); onClose(); }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition ${
                    currentScreen === 'SUPER_ADMIN_SUBSCRIPTIONS'
                      ? 'bg-amber-600 text-white shadow-md shadow-amber-600/30'
                      : isDark 
                        ? 'text-slate-300 hover:bg-slate-800 hover:text-white' 
                        : 'text-slate-700 hover:bg-amber-50 hover:text-amber-700'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Award className="w-4 h-4 text-purple-400" />
                    <span>Subscription Plans & Tiers</span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 opacity-50" />
                </button>

                {/* 5. Module Entitlements */}
                <button
                  onClick={() => { onNavigate('SUPER_ADMIN_MODULES'); onClose(); }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition ${
                    currentScreen === 'SUPER_ADMIN_MODULES'
                      ? 'bg-amber-600 text-white shadow-md shadow-amber-600/30'
                      : isDark 
                        ? 'text-slate-300 hover:bg-slate-800 hover:text-white' 
                        : 'text-slate-700 hover:bg-amber-50 hover:text-amber-700'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Layers className="w-4 h-4 text-indigo-400" />
                    <span>Module Entitlements</span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 opacity-50" />
                </button>

                {/* 6. Pending User Approvals */}
                <button
                  onClick={() => { onNavigate('SUPER_ADMIN_PENDING_APPROVALS'); onClose(); }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition ${
                    currentScreen === 'SUPER_ADMIN_PENDING_APPROVALS'
                      ? 'bg-amber-600 text-white shadow-md shadow-amber-600/30'
                      : isDark 
                        ? 'text-slate-300 hover:bg-slate-800 hover:text-white' 
                        : 'text-slate-700 hover:bg-amber-50 hover:text-amber-700'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <UserCheck className="w-4 h-4 text-rose-400" />
                    <span>Pending Approvals</span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 opacity-50" />
                </button>

                {/* 7. Notifications */}
                <button
                  onClick={() => { onNavigate('NOTIFICATIONS'); onClose(); }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition ${
                    currentScreen === 'NOTIFICATIONS'
                      ? 'bg-amber-600 text-white shadow-md shadow-amber-600/30'
                      : isDark 
                        ? 'text-slate-300 hover:bg-slate-800 hover:text-white' 
                        : 'text-slate-700 hover:bg-amber-50 hover:text-amber-700'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Bell className="w-4 h-4 text-amber-400" />
                    <span>System Alerts & Audits</span>
                  </div>
                  {unreadNotifCount > 0 && (
                    <span className="bg-rose-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                      {unreadNotifCount}
                    </span>
                  )}
                </button>

                {/* 8. Settings */}
                <button
                  onClick={() => { onNavigate('SETTINGS'); onClose(); }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition ${
                    currentScreen === 'SETTINGS'
                      ? 'bg-amber-600 text-white shadow-md shadow-amber-600/30'
                      : isDark 
                        ? 'text-slate-300 hover:bg-slate-800 hover:text-white' 
                        : 'text-slate-700 hover:bg-amber-50 hover:text-amber-700'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Settings className="w-4 h-4 text-slate-400" />
                    <span>Platform Settings</span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 opacity-50" />
                </button>
              </div>
            </div>
          ) : (
            /* ======================================================== */
            /* 2. TENANT / COMPANY USER NAVIGATION                      */
            /* ======================================================== */
            <div>
              <p className={`text-[10px] font-bold uppercase tracking-wider px-2 mb-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Company Operations
              </p>
              <div className="space-y-1">
                <button
                  onClick={() => { onNavigate('ENTERPRISE_DASHBOARD'); onClose(); }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition ${
                    currentScreen === 'ENTERPRISE_DASHBOARD'
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                      : isDark 
                        ? 'text-slate-300 hover:bg-slate-800 hover:text-white'
                        : 'text-slate-700 hover:bg-slate-100 hover:text-indigo-600'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <LayoutDashboard className="w-4 h-4 text-indigo-400" />
                    <span>Dashboard</span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 opacity-50" />
                </button>

                {(userSession?.role === 'COMPANY_ADMIN' || userSession?.role === 'HR_ADMIN' || userSession?.role === 'OPS_MANAGER') && (
                  <button
                    onClick={() => { onNavigate('COMPANY_MANAGEMENT'); onClose(); }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition ${
                      currentScreen === 'COMPANY_MANAGEMENT'
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                        : isDark 
                          ? 'text-slate-300 hover:bg-slate-800 hover:text-white' 
                          : 'text-slate-700 hover:bg-slate-100 hover:text-indigo-600'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Building2 className="w-4 h-4 text-purple-400" />
                      <span>Company & RBAC</span>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 opacity-50" />
                  </button>
                )}

                {(userSession?.role === 'COMPANY_ADMIN' || userSession?.role === 'HR_ADMIN') && (
                  <button
                    onClick={() => { onNavigate('APPROVAL_MANAGEMENT'); onClose(); }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition ${
                      currentScreen === 'APPROVAL_MANAGEMENT'
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                        : isDark 
                          ? 'text-slate-300 hover:bg-slate-800 hover:text-white' 
                          : 'text-slate-700 hover:bg-slate-100 hover:text-indigo-600'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <UserCheck className="w-4 h-4 text-rose-400" />
                      <span>Staff Approvals</span>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 opacity-50" />
                  </button>
                )}

                {(userSession?.role !== 'GUARD' && userSession?.role !== 'FIELD_OFFICER') && (
                  <button
                    onClick={() => { onNavigate('EMPLOYEES'); onClose(); }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition ${
                      currentScreen === 'EMPLOYEES'
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                        : isDark 
                          ? 'text-slate-300 hover:bg-slate-800 hover:text-white' 
                          : 'text-slate-700 hover:bg-slate-100 hover:text-indigo-600'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Users className="w-4 h-4 text-emerald-400" />
                      <span>Employee Management</span>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 opacity-50" />
                  </button>
                )}

                <button
                  onClick={() => { onNavigate('ATTENDANCE_SHIFTS'); onClose(); }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition ${
                    currentScreen === 'ATTENDANCE_SHIFTS'
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                      : isDark 
                        ? 'text-slate-300 hover:bg-slate-800 hover:text-white' 
                        : 'text-slate-700 hover:bg-slate-100 hover:text-indigo-600'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Clock className="w-4 h-4 text-amber-400" />
                    <span>Attendance & Shifts</span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 opacity-50" />
                </button>

                <button
                  onClick={() => { onNavigate('LEAVE_MANAGEMENT'); onClose(); }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition ${
                    currentScreen === 'LEAVE_MANAGEMENT'
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                      : isDark 
                        ? 'text-slate-300 hover:bg-slate-800 hover:text-white' 
                        : 'text-slate-700 hover:bg-slate-100 hover:text-indigo-600'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <CalendarDays className="w-4 h-4 text-pink-400" />
                    <span>Leave Management</span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 opacity-50" />
                </button>

                <button
                  onClick={() => { onNavigate('PAYROLL_COMPENSATION'); onClose(); }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition ${
                    currentScreen === 'PAYROLL_COMPENSATION'
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                      : isDark 
                        ? 'text-slate-300 hover:bg-slate-800 hover:text-white' 
                        : 'text-slate-700 hover:bg-slate-100 hover:text-indigo-600'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <DollarSign className="w-4 h-4 text-emerald-400" />
                    <span>Payroll & Compensation</span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 opacity-50" />
                </button>

                <button
                  onClick={() => { onNavigate('INVENTORY_STOCK'); onClose(); }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition ${
                    currentScreen === 'INVENTORY_STOCK'
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                      : isDark 
                        ? 'text-slate-300 hover:bg-slate-800 hover:text-white' 
                        : 'text-slate-700 hover:bg-slate-100 hover:text-indigo-600'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Boxes className="w-4 h-4 text-amber-400" />
                    <span>Inventory & Stock</span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 opacity-50" />
                </button>

                <button
                  onClick={() => { onNavigate('ASSET_TRACKING'); onClose(); }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition ${
                    currentScreen === 'ASSET_TRACKING'
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                      : isDark 
                        ? 'text-slate-300 hover:bg-slate-800 hover:text-white' 
                        : 'text-slate-700 hover:bg-slate-100 hover:text-indigo-600'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <QrCode className="w-4 h-4 text-purple-400" />
                    <span>Asset Tracking & Gear</span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 opacity-50" />
                </button>

                <button
                  onClick={() => { onNavigate('SITE_OPERATIONS'); onClose(); }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition ${
                    currentScreen === 'SITE_OPERATIONS'
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                      : isDark 
                        ? 'text-slate-300 hover:bg-slate-800 hover:text-white' 
                        : 'text-slate-700 hover:bg-slate-100 hover:text-indigo-600'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <ShieldCheck className="w-4 h-4 text-sky-400" />
                    <span>Site Operations & Patrols</span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 opacity-50" />
                </button>

                <button
                  onClick={() => { onNavigate('REPORTS_ANALYTICS'); onClose(); }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition ${
                    currentScreen === 'REPORTS_ANALYTICS'
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                      : isDark 
                        ? 'text-slate-300 hover:bg-slate-800 hover:text-white' 
                        : 'text-slate-700 hover:bg-slate-100 hover:text-indigo-600'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <BarChart3 className="w-4 h-4 text-indigo-400" />
                    <span>Reports & Analytics</span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 opacity-50" />
                </button>

                {userSession?.role === 'COMPANY_ADMIN' && (
                  <button
                    onClick={() => { onNavigate('COMPANY_BILLING'); onClose(); }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition ${
                      currentScreen === 'COMPANY_BILLING'
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                        : isDark 
                          ? 'text-slate-300 hover:bg-slate-800 hover:text-white' 
                          : 'text-slate-700 hover:bg-slate-100 hover:text-indigo-600'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <CreditCard className="w-4 h-4 text-emerald-400" />
                      <span>Subscription & Plan</span>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 opacity-50" />
                  </button>
                )}

                <button
                  onClick={() => { onNavigate('PROFILE'); onClose(); }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition ${
                    currentScreen === 'PROFILE'
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                      : isDark 
                        ? 'text-slate-300 hover:bg-slate-800 hover:text-white' 
                        : 'text-slate-700 hover:bg-slate-100 hover:text-indigo-600'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <User className="w-4 h-4 text-slate-400" />
                    <span>Profile</span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 opacity-50" />
                </button>

                <button
                  onClick={() => { onNavigate('NOTIFICATIONS'); onClose(); }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition ${
                    currentScreen === 'NOTIFICATIONS'
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                      : isDark 
                        ? 'text-slate-300 hover:bg-slate-800 hover:text-white' 
                        : 'text-slate-700 hover:bg-slate-100 hover:text-indigo-600'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Bell className="w-4 h-4 text-indigo-400" />
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
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition ${
                    currentScreen === 'SETTINGS'
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                      : isDark 
                        ? 'text-slate-300 hover:bg-slate-800 hover:text-white' 
                        : 'text-slate-700 hover:bg-slate-100 hover:text-indigo-600'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Settings className="w-4 h-4 text-slate-400" />
                    <span>Settings</span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 opacity-50" />
                </button>
              </div>
            </div>
          )}

        </div>

        {/* Footer Actions */}
        <div className={`p-3.5 border-t space-y-2 ${isDark ? 'border-slate-800 bg-slate-950/80' : 'border-slate-200 bg-slate-50'}`}>
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
