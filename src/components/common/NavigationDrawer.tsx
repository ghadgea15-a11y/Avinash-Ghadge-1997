import React from 'react';
import { UserSession, CompanyTenant, PhaseAScreen } from '../../types';
import { 
  LogOut, 
  X, 
  Home, 
  Users, 
  Building2, 
  CheckSquare, 
  Calendar, 
  DollarSign, 
  LayoutDashboard, 
  Settings, 
  ShieldCheck, 
  Boxes, 
  QrCode, 
  BarChart3, 
  LifeBuoy, 
  UserCheck, 
  GraduationCap, 
  ShoppingCart,
  Award,
  Bell,
  IdCard,
  ShieldAlert,
  ListTodo,
  Layers
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

interface NavigationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  currentScreen: string;
  onNavigate: (screen: PhaseAScreen) => void;
  onRoleSwitch?: (newRole: any) => void;
  onLockSession?: () => void;
  onLogout?: () => void;
  isOnline?: boolean;
  userSession: UserSession;
  activeCompany: CompanyTenant | null;
  unreadNotifCount?: number;
}

export function NavigationDrawer({
  isOpen,
  onClose,
  currentScreen,
  onNavigate,
  userSession,
  activeCompany,
  unreadNotifCount = 0,
  onRoleSwitch,
  onLockSession,
  onLogout,
  isOnline
}: NavigationDrawerProps) {
  const { isDark } = useTheme();

  if (!isOpen) return null;

  const NavItem = ({ icon: Icon, label, screen, badge }: { icon: any, label: string, screen: PhaseAScreen, badge?: string | number }) => (
    <button
      onClick={() => {
        onNavigate(screen);
        onClose();
      }}
      className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm transition-all duration-150 ${
        currentScreen === screen
          ? 'bg-indigo-600/10 text-indigo-700 dark:text-indigo-400 font-bold'
          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white'
      }`}
    >
      <div className="flex items-center gap-3">
        <Icon className="w-4 h-4 shrink-0" />
        <span className="truncate">{label}</span>
      </div>
      {badge !== undefined && (
        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300">
          {badge}
        </span>
      )}
    </button>
  );

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Overlay */}
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />
      
      {/* Drawer */}
      <div className={`relative w-80 max-w-[85vw] h-full shadow-2xl flex flex-col ${isDark ? 'bg-slate-900 text-slate-100' : 'bg-white text-slate-900'}`}>
        {/* Drawer Header */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
          <div>
            <h2 className="font-bold text-base">Shourya Enterprise ERP</h2>
            <p className="text-xs text-slate-500 truncate">{activeCompany?.brandName || activeCompany?.companyLegalName || 'Facility Platform'}</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {/* Drawer Navigation List with 14 Modules */}
        <div className="flex-1 overflow-y-auto p-3 space-y-4 text-xs">
          
          {userSession.role === 'SUPER_ADMIN' ? (
            <div>
              <span className="px-3 text-[10px] font-bold uppercase tracking-wider text-amber-500 block mb-1">
                Super Admin
              </span>
              <NavItem icon={LayoutDashboard} label="Global Overview" screen="SUPER_ADMIN_DASHBOARD" />
              <NavItem icon={Building2} label="Tenant Directory" screen="SUPER_ADMIN_COMPANIES" />
              <NavItem icon={UserCheck} label="Lead CRM" screen="SUPER_ADMIN_LEADS" />
              <NavItem icon={Award} label="Subscriptions" screen="SUPER_ADMIN_SUBSCRIPTIONS" />
              <NavItem icon={Layers} label="Module Config" screen="SUPER_ADMIN_MODULES" />
              <NavItem icon={Bell} label="Alerts" screen="NOTIFICATIONS" badge={unreadNotifCount} />
              <NavItem icon={Settings} label="Global Settings" screen="SETTINGS" />
            </div>
          ) : (
            <>
              <div>
                <span className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Core & Workforce
                </span>
                <NavItem icon={LayoutDashboard} label="Enterprise Dashboard" screen="ENTERPRISE_DASHBOARD" />
                <NavItem icon={Users} label="1. HCM Staff & Lifecycle" screen="EMPLOYEES" />
                <NavItem icon={IdCard} label="1b. Identity Badge Master" screen="ID_BADGES" />
                <NavItem icon={ShieldAlert} label="1c. Document Compliance" screen="COMPLIANCE" />
                <NavItem icon={Calendar} label="2. WFM Attendance & Roster" screen="ATTENDANCE_SHIFTS" />
                <NavItem icon={Calendar} label="2b. Shift Roster Planner" screen="SHIFT_ROSTER" />
                <NavItem icon={DollarSign} label="3. ERP Payroll & Finance" screen="PAYROLL_COMPENSATION" />
              </div>

              <div>
                <span className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Operations & Supply Chain
                </span>
                <NavItem icon={ListTodo} label="4a. Work Orders & Tasks" screen="WORK_ORDERS" />
                <NavItem icon={ShieldCheck} label="4b. Site Operations (Patrol/Log)" screen="SITE_OPERATIONS" />
                <NavItem icon={ShieldAlert} label="4c. Safety & Checksheets" screen="SAFETY_MANAGEMENT" />
                <NavItem icon={QrCode} label="5. EAM Asset Tracking" screen="ASSET_TRACKING" />
                <NavItem icon={Boxes} label="6. SCM Inventory & Stock" screen="INVENTORY_STOCK" />
                <NavItem icon={Building2} label="7. CRM Client Accounts" screen="CLIENT_MANAGEMENT" />
                <NavItem icon={LifeBuoy} label="11. Service Desk & SLA" screen="SERVICE_DESK" />
                <NavItem icon={ShoppingCart} label="14. Procurement SRM & PO" screen="PROCUREMENT_SRM" />
                <NavItem icon={Building2} label="14.1 Vendor Management" screen="VENDOR_MANAGEMENT" />
                <NavItem icon={FileSignature} label="14.2 RFQ Management" screen="RFQ_MANAGEMENT" />
                <NavItem icon={ShoppingCart} label="14.3 Purchase Orders" screen="PURCHASE_ORDERS" />
                <NavItem icon={Receipt} label="14.4 3-Way Match" screen="THREE_WAY_MATCH" />
              </div>

              <div>
                <span className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Talent, Learning & Governance
                </span>
                <NavItem icon={UserCheck} label="12. Talent Acquisition & ATS" screen="TALENT_ACQUISITION" />
                <NavItem icon={GraduationCap} label="13.1 LMS & PSARA Compliance" screen="TRAINING_LMS" />
                <NavItem icon={ShieldAlert} label="13.3 Mandatory Refreshers" screen="MANDATORY_REFRESHERS" />
                <NavItem icon={Award} label="13.2 Certifications Expiry" screen="CERTIFICATION_TRACKING" />
                <NavItem icon={BarChart3} label="8. BI Reports & Analytics" screen="REPORTS_ANALYTICS" />
                <NavItem icon={CheckSquare} label="9. BPM Task Management" screen="TASK_MANAGEMENT" />
                <NavItem icon={Award} label="10. GRC Policy & Approvals" screen="APPROVAL_MANAGEMENT" />
              </div>

              <div>
                <span className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  System
                </span>
                <NavItem icon={Bell} label="Notifications & Alerts" screen="NOTIFICATIONS" badge={unreadNotifCount} />
                <NavItem icon={Settings} label="Settings & Diagnostics" screen="SETTINGS" />
              </div>
            </>
          )}
        </div>
        
        {/* Footer */}
        <div className="p-3 border-t border-slate-200 dark:border-slate-800">
          <button 
            onClick={() => {
              if (onLogout) onLogout();
              onClose();
            }}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out Session</span>
          </button>
        </div>
      </div>
    </div>
  );
}
