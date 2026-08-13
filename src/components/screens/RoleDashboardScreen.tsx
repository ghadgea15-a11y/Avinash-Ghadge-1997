import React, { useState } from 'react';
import { 
  ShieldCheck, 
  MapPin, 
  Clock, 
  Calendar, 
  AlertTriangle, 
  Users, 
  CheckSquare, 
  FileText, 
  TrendingUp, 
  DollarSign, 
  Truck, 
  UserCheck, 
  Award, 
  Shirt, 
  CreditCard, 
  Settings, 
  Database, 
  Activity, 
  Building2, 
  Globe, 
  Sliders, 
  Lock, 
  Wifi, 
  WifiOff, 
  RefreshCw, 
  QrCode, 
  Camera, 
  PlusCircle, 
  Search,
  CheckCircle2,
  ChevronRight
} from 'lucide-react';
import { UserSession, CompanyTenant, UserRole, PhaseAScreen } from '../../types';
import { OfflineSyncService } from '../../services/offlineSyncService';
import { FirestoreService } from '../../services/firestoreService';
import { useTheme } from '../../context/ThemeContext';

interface RoleDashboardScreenProps {
  userSession: UserSession;
  activeCompany: CompanyTenant | null;
  isOnline: boolean;
  viewportMode: 'PHONE' | 'TABLET' | 'FULLSCREEN';
  onNavigate: (screen: PhaseAScreen) => void;
  onRoleSwitch: (role: UserRole) => void;
  offlineQueueCount: number;
  onSyncOfflineQueue: () => void;
}

export const RoleDashboardScreen: React.FC<RoleDashboardScreenProps> = ({
  userSession,
  activeCompany,
  isOnline,
  viewportMode,
  onNavigate,
  onRoleSwitch,
  offlineQueueCount,
  onSyncOfflineQueue
}) => {
  const { isDark } = useTheme();
  const [activeTab, setActiveTab] = useState(0);
  const [clockedIn, setClockedIn] = useState(false);
  const [clockTime, setClockTime] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const handlePunchClock = async () => {
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const action = !clockedIn ? 'PUNCH_IN' : 'PUNCH_OUT';
    
    setClockedIn(!clockedIn);
    setClockTime(!clockedIn ? timeStr : null);

    if (isOnline) {
      await FirestoreService.logAttendance(userSession, action);
      setActionSuccess(`${action === 'PUNCH_IN' ? 'Clock-In' : 'Clock-Out'} Recorded at ${timeStr} (Synced to Firestore)`);
    } else {
      OfflineSyncService.queueAction(action, {
        time: timeStr,
        site: userSession.assignedSiteId || 'SITE-001',
        guard: userSession.employeeId
      });
      setActionSuccess(`${action === 'PUNCH_IN' ? 'Clock-In' : 'Clock-Out'} Recorded at ${timeStr} (Queued Offline)`);
    }

    setTimeout(() => setActionSuccess(null), 4000);
  };

  const handleManualSync = async () => {
    setSyncing(true);
    await onSyncOfflineQueue();
    setSyncing(false);
    setActionSuccess('Offline local mutation queue successfully synced to Firestore!');
    setTimeout(() => setActionSuccess(null), 4000);
  };

  // Define Role Navigation Items
  const getRoleNavItems = () => {
    switch (userSession.role) {
      case 'GUARD':
        return [
          { icon: Clock, label: 'Attendance', desc: 'Punch Clock In/Out' },
          { icon: MapPin, label: 'Patrol', desc: 'NFC/QR Route' },
          { icon: AlertTriangle, label: 'Incidents', desc: 'Report Issue' },
          { icon: Calendar, label: 'Roster', desc: 'My Shift Schedule' }
        ];
      case 'FIELD_OFFICER':
        return [
          { icon: Users, label: 'Site Muster', desc: 'Guard Headcount' },
          { icon: UserCheck, label: 'Allocation', desc: 'Deploy Guards' },
          { icon: CheckSquare, label: 'Audits', desc: 'Inspection Form' },
          { icon: AlertTriangle, label: 'Escalations', desc: 'Site Tickets' }
        ];
      case 'OPS_MANAGER':
        return [
          { icon: Activity, label: 'Command', desc: 'Live Operations' },
          { icon: DollarSign, label: 'Billing', desc: 'Client Approvals' },
          { icon: Truck, label: 'Fleet', desc: 'Patrol Vehicles' },
          { icon: FileText, label: 'Reports', desc: 'SLA Analytics' }
        ];
      case 'HR_ADMIN':
        return [
          { icon: Users, label: 'Employees', desc: 'KYC & Onboarding' },
          { icon: Award, label: 'Leaves', desc: 'Approvals & Muster' },
          { icon: Shirt, label: 'Uniforms', desc: 'Stock Issuance' },
          { icon: CreditCard, label: 'Payroll', desc: 'Salary Vouchers' }
        ];
      case 'COMPANY_ADMIN':
        return [
          { icon: Building2, label: 'Agency', desc: 'Tenant Profile' },
          { icon: Sliders, label: 'Branding', desc: 'White Label Settings' },
          { icon: Database, label: 'Firebase', desc: 'Rule Monitoring' },
          { icon: FileText, label: 'Audit Log', desc: 'Security Audit' }
        ];
      case 'SUPER_ADMIN':
        return [
          { icon: Globe, label: 'Tenants', desc: 'Global Agencies' },
          { icon: Award, label: 'Tiers', desc: 'License Quotas' },
          { icon: Database, label: 'System', desc: 'Database Health' },
          { icon: ShieldCheck, label: 'Go-Live', desc: 'Platform Audit' }
        ];
      default:
        return [
          { icon: Clock, label: 'Attendance', desc: 'Punch Clock' },
          { icon: Calendar, label: 'Roster', desc: 'Schedule' }
        ];
    }
  };

  const navItems = getRoleNavItems();
  const isTablet = viewportMode === 'TABLET' || viewportMode === 'FULLSCREEN';

  return (
    <div className={`flex-1 flex flex-col md:flex-row transition-colors duration-300 ${isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'} overflow-hidden`}>
      {/* Tablet Navigation Rail (Left Column on Tablet) */}
      {isTablet && (
        <div className={`w-48 transition-colors duration-300 ${isDark ? 'bg-slate-900 border-r border-slate-800' : 'bg-white border-r border-slate-200'} p-3 flex flex-col justify-between shrink-0`}>
          <div className="space-y-4">
            <div className={`pb-3 border-b ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
              <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider block">
                Nav Rail (Tablet)
              </span>
              <p className={`text-xs font-bold ${isDark ? 'text-white' : 'text-slate-800'} truncate`}>{userSession.fullName.split(' ')[0]}</p>
            </div>

            <div className="space-y-1">
              {navItems.map((item, idx) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.label}
                    onClick={() => setActiveTab(idx)}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-2.5 transition ${
                      activeTab === idx
                        ? 'bg-indigo-600 text-white shadow-md'
                        : isDark
                          ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className={`pt-3 border-t ${isDark ? 'border-slate-800' : 'border-slate-200'} space-y-2`}>
            <p className="text-[10px] font-bold text-slate-400 uppercase">Test Role Switcher:</p>
            <div className="grid grid-cols-2 gap-1 text-[9px]">
              {(['GUARD', 'FIELD_OFFICER', 'OPS_MANAGER', 'HR_ADMIN', 'COMPANY_ADMIN', 'SUPER_ADMIN'] as UserRole[]).map(r => (
                <button
                  key={r}
                  onClick={() => onRoleSwitch(r)}
                  className={`p-1 rounded text-center font-mono border truncate ${
                    userSession.role === r 
                      ? isDark
                        ? 'bg-indigo-950 text-indigo-300 border-indigo-600'
                        : 'bg-indigo-50 text-indigo-600 border-indigo-200'
                      : isDark
                        ? 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
                        : 'bg-white text-slate-500 border-slate-200 hover:text-slate-800'
                  }`}
                >
                  {r.split('_')[0]}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col justify-between p-4 overflow-y-auto space-y-4">
        {/* Account Approval Quick Action Banner for Admins */}
        {(userSession.role === 'COMPANY_ADMIN' || userSession.role === 'HR_ADMIN' || userSession.role === 'SUPER_ADMIN') && (
          <div className="p-4 bg-gradient-to-r from-indigo-950/80 to-purple-950/80 border border-indigo-800/80 rounded-2xl flex flex-wrap items-center justify-between gap-3 shadow-md">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                <UserCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-white">Pending Account Approval Requests</h3>
                <p className="text-[11px] text-slate-300 mt-0.5">
                  Review new employee sign-up applications and grant company workstation access.
                </p>
              </div>
            </div>

            <button
              onClick={() => onNavigate('APPROVAL_MANAGEMENT')}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs px-4 py-2 rounded-xl flex items-center gap-1.5 shadow-md shadow-indigo-600/30 transition shrink-0"
            >
              <span>Manage Approvals</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
        {/* Offline Queue Bar */}
        {!isOnline && (
          <div className="bg-amber-950/80 border border-amber-800 p-2.5 rounded-xl text-xs text-amber-300 flex items-center justify-between animate-pulse">
            <div className="flex items-center gap-2">
              <WifiOff className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Offline Mode: Local Firestore Caching Active</span>
            </div>
            {offlineQueueCount > 0 && (
              <button
                onClick={handleManualSync}
                disabled={syncing}
                className="bg-amber-500 hover:bg-amber-400 text-slate-950 px-2.5 py-1 rounded-lg font-bold text-[10px] flex items-center gap-1 shadow"
              >
                <RefreshCw className={`w-3 h-3 ${syncing ? 'animate-spin' : ''}`} />
                <span>Sync Queue ({offlineQueueCount})</span>
              </button>
            )}
          </div>
        )}

        {actionSuccess && (
          <div className="bg-emerald-950/80 border border-emerald-800 p-3 rounded-xl text-xs text-emerald-300 flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{actionSuccess}</span>
          </div>
        )}

        {/* User Status Card */}
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-3">
            <img
              src={userSession.avatarUrl || undefined}
              alt="Avatar"
              className="w-12 h-12 rounded-full border-2 border-indigo-500 object-cover shadow"
            />
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white">{userSession.fullName}</h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800">
                  {userSession.role}
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                {userSession.employeeId} • {activeCompany?.brandName || userSession.companyId}
              </p>
            </div>
          </div>

          <div className="text-right hidden sm:block">
            <span className="text-[10px] text-slate-400 uppercase font-mono block">Shift Status</span>
            <span className={`text-xs font-bold px-2.5 py-1 rounded-full inline-block mt-0.5 ${
              clockedIn ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-slate-800 text-slate-400'
            }`}>
              {clockedIn ? `CLOCKED IN (${clockTime})` : 'OFF DUTY'}
            </span>
          </div>
        </div>

        {/* Dynamic Tab Content View */}
        {userSession.role === 'GUARD' && (
          <div className="space-y-4">
            {activeTab === 0 && (
              <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-4 shadow-xl">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div>
                    <h4 className="text-sm font-bold text-white">Duty Attendance Clock</h4>
                    <p className="text-xs text-slate-400">GPS & Camera Verification</p>
                  </div>
                  <span className="text-xs font-mono text-indigo-400 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5" />
                    Site: {userSession.assignedSiteId || 'MUMBAI-AIRPORT-T2'}
                  </span>
                </div>

                <div className="text-center py-4">
                  <button
                    onClick={handlePunchClock}
                    className={`w-32 h-32 rounded-full mx-auto flex flex-col items-center justify-center font-bold text-sm shadow-2xl transition-all border-4 ${
                      clockedIn
                        ? 'bg-rose-950/80 border-rose-500 text-rose-300 hover:bg-rose-900 shadow-rose-900/30'
                        : 'bg-emerald-950/80 border-emerald-500 text-emerald-300 hover:bg-emerald-900 shadow-emerald-900/30'
                    }`}
                  >
                    <Clock className="w-8 h-8 mb-1" />
                    <span>{clockedIn ? 'PUNCH OUT' : 'PUNCH IN'}</span>
                    <span className="text-[9px] font-mono opacity-80">{clockedIn ? 'End Shift' : 'Start Shift'}</span>
                  </button>
                </div>
              </div>
            )}

            {activeTab === 1 && (
              <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl space-y-3">
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <QrCode className="w-4 h-4 text-indigo-400" />
                  NFC & QR Checkpoint Patrol
                </h4>
                <p className="text-xs text-slate-400">Scan physical NFC tag or QR code at assigned checkpoint</p>
                <div className="border border-dashed border-slate-700 p-6 rounded-xl text-center">
                  <Camera className="w-8 h-8 text-indigo-400 mx-auto mb-2" />
                  <p className="text-xs font-medium text-slate-300">Tap to Launch CameraX Barcode Scanner</p>
                </div>
              </div>
            )}

            {activeTab === 2 && (
              <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl space-y-3">
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                  Log Security Incident
                </h4>
                <p className="text-xs text-slate-400">Attach photo evidence and location tag</p>
                <button
                  onClick={() => {
                    OfflineSyncService.queueAction('INCIDENT_REPORT', { title: 'Unauthorized Entry', time: Date.now() });
                    setActionSuccess('Incident report queued for dispatch!');
                    setTimeout(() => setActionSuccess(null), 3000);
                  }}
                  className="w-full bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-xs py-2.5 rounded-xl flex items-center justify-center gap-2"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Report Security Breach</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Fallback View for Other Roles */}
        {userSession.role !== 'GUARD' && (
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-4 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Activity className="w-4 h-4 text-indigo-400" />
                {navItems[activeTab]?.label || 'Module Console'} Overview
              </h4>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800">
                ACTIVE
              </span>
            </div>

            <p className="text-xs text-slate-300">
              {navItems[activeTab]?.desc} — Fully integrated with Jetpack Compose viewmodel state layer and Firestore multi-company rules.
            </p>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs">
                <span className="text-slate-400 block text-[10px]">Active Records</span>
                <span className="text-lg font-bold text-indigo-400 font-mono">1,248</span>
              </div>
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs">
                <span className="text-slate-400 block text-[10px]">Sync Status</span>
                <span className="text-lg font-bold text-emerald-400 font-mono">Synced</span>
              </div>
            </div>

            <button
              onClick={() => onNavigate('EMPLOYEES')}
              className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 transition"
            >
              <Users className="w-4 h-4" />
              <span>Launch Module 1: Employee Management</span>
            </button>
          </div>
        )}

        {/* Role Switcher for Testing (Mobile View) */}
        {!isTablet && (
          <div className="bg-slate-900/80 border border-slate-800 p-3 rounded-2xl space-y-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Test Role Navigation Preview:
            </span>
            <div className="grid grid-cols-3 gap-1 text-[10px]">
              {(['GUARD', 'FIELD_OFFICER', 'OPS_MANAGER', 'HR_ADMIN', 'COMPANY_ADMIN', 'SUPER_ADMIN'] as UserRole[]).map(r => (
                <button
                  key={r}
                  onClick={() => onRoleSwitch(r)}
                  className={`p-1.5 rounded-lg font-mono text-center border truncate transition ${
                    userSession.role === r
                      ? 'bg-indigo-600 text-white font-bold border-indigo-500 shadow'
                      : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
                  }`}
                >
                  {r.split('_')[0]}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Mobile Bottom Navigation Bar */}
      {!isTablet && (
        <div className="bg-slate-900 border-t border-slate-800 p-1.5 grid grid-cols-4 gap-1 shrink-0">
          {navItems.map((item, idx) => {
            const Icon = item.icon;
            return (
              <button
                key={item.label}
                onClick={() => setActiveTab(idx)}
                className={`py-2 px-1 rounded-xl flex flex-col items-center justify-center text-[10px] font-semibold transition ${
                  activeTab === idx
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Icon className="w-4 h-4 mb-0.5" />
                <span className="truncate w-full text-center">{item.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
