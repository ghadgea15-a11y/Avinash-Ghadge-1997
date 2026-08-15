import React, { useState, useEffect } from 'react';
import { 
  Users, Building, Clock, AlertTriangle, UserCheck, CheckCircle2,
  Calendar, FileText, ChevronRight, Activity, ArrowRight, Shield
} from 'lucide-react';
import { CompanyTenant, UserSession, PhaseAScreen, EmployeeRecord, ShiftRecord, AttendanceLogRecord, ApprovalRequestRecord } from '../../types';
import { FirestoreService } from '../../services/firestoreService';
import { EntitlementService } from '../../services/entitlementService';
import { APP_MODULES } from '../../types';


interface EnterpriseDashboardScreenProps {
  userSession: UserSession;
  company: CompanyTenant;
  onNavigate: (screen: PhaseAScreen) => void;
  onLogout: () => void;
}

export const EnterpriseDashboardScreen: React.FC<EnterpriseDashboardScreenProps> = ({
  userSession,
  company,
  onNavigate,
  onLogout
}) => {
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState<EmployeeRecord[]>([]);
  const [attendance, setAttendance] = useState<AttendanceLogRecord[]>([]);
  const [approvals, setApprovals] = useState<ApprovalRequestRecord[]>([]);

  const [moduleAccess, setModuleAccess] = useState<Record<string, boolean>>({
    EMPLOYEES: false,
    ATTENDANCE: false,
    COMPANY_MANAGEMENT: false
  });


  useEffect(() => {
    setLoading(true);
    let unsubEmployees = () => {};
    let unsubAttendance = () => {};
    let unsubApprovals = () => {};

    if (userSession.role === 'COMPANY_ADMIN' || userSession.role === 'HR_ADMIN' || userSession.role === 'OPS_MANAGER') {
      unsubEmployees = FirestoreService.subscribeToEmployees(company.companyId, (data) => {
        setEmployees(data);
      });
      unsubAttendance = FirestoreService.subscribeToAttendanceLogs(company.companyId, (data) => {
        setAttendance(data);
      });
      unsubApprovals = FirestoreService.subscribeToApprovalRequests(company.companyId, (data) => {
        setApprovals(data);
      });
    }

    setTimeout(() => setLoading(false), 800);

    return () => {
      unsubEmployees();
      unsubAttendance();
      unsubApprovals();
    };
  }, [company.companyId, userSession.role]);

  // Dashboard calculations
  const totalEmployees = employees.length;
  const activeEmployees = employees.filter(e => e.status === 'ACTIVE').length;
  const pendingApprovalsCount = approvals.filter(a => a.accountStatus === 'PENDING_APPROVAL').length;

  const today = new Date().toISOString().split('T')[0];
  const todayAttendance = attendance.filter(a => a.date === today);
  const presentToday = new Set(todayAttendance.map(a => a.employeeId)).size;
  const absentToday = Math.max(0, activeEmployees - presentToday);

  // Render role-specific content
  const renderAdminDashboard = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Employees */}
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start mb-4">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div>
            <h3 className="text-3xl font-bold text-slate-800 dark:text-white mb-1">{totalEmployees}</h3>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Employees</p>
          </div>
        </div>

        {/* Present Today */}
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start mb-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div>
            <h3 className="text-3xl font-bold text-slate-800 dark:text-white mb-1">{presentToday}</h3>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Present Today</p>
          </div>
        </div>

        {/* Absent Today */}
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start mb-4">
            <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-500/10 flex items-center justify-center text-rose-600 dark:text-rose-400">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <div>
            <h3 className="text-3xl font-bold text-slate-800 dark:text-white mb-1">{absentToday}</h3>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Absent Today</p>
          </div>
        </div>

        {/* Pending Approvals */}
        <div 
          onClick={() => onNavigate('APPROVAL_MANAGEMENT')}
          className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between cursor-pointer hover:border-indigo-500 transition-colors"
        >
          <div className="flex justify-between items-start mb-4">
            <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center text-amber-600 dark:text-amber-400">
              <UserCheck className="w-5 h-5" />
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400" />
          </div>
          <div>
            <h3 className="text-3xl font-bold text-slate-800 dark:text-white mb-1">{pendingApprovalsCount}</h3>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Pending Approvals</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quick Actions */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
          <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/50">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">Quick Actions</h3>
          </div>
          <div className="p-4 grid grid-cols-2 gap-3">
            {moduleAccess.EMPLOYEES && (
            <button onClick={() => onNavigate('EMPLOYEES')} className="flex flex-col items-center justify-center p-4 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors text-center group">
              <div className="w-10 h-10 rounded-full bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-3 group-hover:scale-110 transition-transform">
                <Users className="w-5 h-5" />
              </div>
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Manage Employees</span>
            </button>
          )}
            {moduleAccess.ATTENDANCE && (
            <button onClick={() => onNavigate('ATTENDANCE_SHIFTS')} className="flex flex-col items-center justify-center p-4 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors text-center group">
              <div className="w-10 h-10 rounded-full bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400 mb-3 group-hover:scale-110 transition-transform">
                <Clock className="w-5 h-5" />
              </div>
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">View Attendance</span>
            </button>
          )}
            
          <button onClick={() => onNavigate('COMPANY_BILLING')} className="flex flex-col items-center justify-center p-4 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors text-center group">
            <div className="w-10 h-10 rounded-full bg-purple-50 dark:bg-purple-500/10 flex items-center justify-center text-purple-600 dark:text-purple-400 mb-3 group-hover:scale-110 transition-transform">
              <Shield className="w-5 h-5" />
            </div>
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Billing & Plan</span>
          </button>
  
          {moduleAccess.COMPANY_MANAGEMENT && (
            <button onClick={() => onNavigate('COMPANY_MANAGEMENT')} className="flex flex-col items-center justify-center p-4 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors text-center group">
              <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center text-blue-600 dark:text-blue-400 mb-3 group-hover:scale-110 transition-transform">
                <Building className="w-5 h-5" />
              </div>
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Company Structure</span>
            </button>
          )}
            <button onClick={() => onNavigate('APPROVAL_MANAGEMENT')} className="flex flex-col items-center justify-center p-4 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors text-center group">
              <div className="w-10 h-10 rounded-full bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center text-amber-600 dark:text-amber-400 mb-3 group-hover:scale-110 transition-transform">
                <FileText className="w-5 h-5" />
              </div>
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Pending Approvals</span>
            </button>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
          <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/50 flex justify-between items-center">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">Recent Attendance</h3>
            <button onClick={() => onNavigate('ATTENDANCE_SHIFTS')} className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline">View All</button>
          </div>
          <div className="p-0">
            {todayAttendance.length > 0 ? (
              <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
                {todayAttendance.slice(0, 5).map(log => (
                  <div key={log.id} className="p-4 flex items-center gap-4 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${log.checkInTime ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400' : 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400'}`}>
                      {log.checkInTime ? <Clock className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{log.employeeName || log.employeeId}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{log.checkInTime ? 'PUNCH IN' : 'RECORD'} at {log.checkInTime ? new Date(log.checkInTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'N/A'}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-slate-500 dark:text-slate-400">
                <Activity className="w-8 h-8 mx-auto mb-3 opacity-20" />
                <p className="text-sm">No attendance records today</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  const renderEmployeeDashboard = () => (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-5">
          <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-xl font-bold text-slate-600 dark:text-slate-300">
            {userSession.fullName.charAt(0).toUpperCase()}
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Welcome, {userSession.fullName}</h2>
            <p className="text-slate-500 dark:text-slate-400 mt-1">{userSession.role.replace('_', ' ')}</p>
          </div>
        </div>
        <button onClick={() => onNavigate('ATTENDANCE_SHIFTS')} className="hidden sm:flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold transition-colors">
          <Clock className="w-5 h-5" />
          Punch Attendance
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col items-center justify-center text-center hover:border-indigo-500 cursor-pointer transition-colors" onClick={() => onNavigate('PROFILE')}>
          <div className="w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center text-blue-600 dark:text-blue-400 mb-3">
            <UserCheck className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">My Profile</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">View personal details</p>
        </div>
        
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col items-center justify-center text-center hover:border-indigo-500 cursor-pointer transition-colors" onClick={() => onNavigate('ATTENDANCE_SHIFTS')}>
          <div className="w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400 mb-3">
            <Clock className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">My Attendance</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">View punches & shifts</p>
        </div>

        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col items-center justify-center text-center hover:border-indigo-500 cursor-pointer transition-colors">
          <div className="w-12 h-12 rounded-full bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center text-amber-600 dark:text-amber-400 mb-3">
            <Calendar className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">My Leaves</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Apply & track leave requests</p>
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center text-slate-500 dark:text-slate-400">
        <div className="w-10 h-10 border-4 border-slate-200 dark:border-slate-700 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
        <p className="text-sm font-semibold tracking-wide">Loading Enterprise Dashboard...</p>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 w-full max-w-7xl mx-auto pb-24 lg:pb-8 animate-fade-in">
      {/* Header section is already provided by TabletNavigationRail or MobileTopHeader externally. We only render Dashboard content here. */}
      
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">Dashboard</h1>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">
            {company.brandName || company.companyLegalName}
          </p>
        </div>
      </div>

      {(userSession.role === 'COMPANY_ADMIN' || userSession.role === 'HR_ADMIN' || userSession.role === 'OPS_MANAGER') ? (
        renderAdminDashboard()
      ) : (
        renderEmployeeDashboard()
      )}

    </div>
  );
};
