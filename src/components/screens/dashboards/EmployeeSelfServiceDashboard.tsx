import React, { useState, useEffect } from 'react';
import { 
  Clock, AlertTriangle, ClipboardList, CheckSquare, 
  FileText, Calendar, CreditCard, Bell, ChevronRight, UserCircle
} from 'lucide-react';
import { 
  CompanyTenant, UserSession, PhaseAScreen, AttendanceRecord, TaskRecord, AnnouncementRecord
} from '../../../types';
import { FirestoreService } from '../../../services/firestoreService';

interface DashboardProps {
  userSession: UserSession;
  company: CompanyTenant;
  onNavigate: (screen: PhaseAScreen) => void;
}

export const EmployeeSelfServiceDashboard: React.FC<DashboardProps> = ({ userSession, company, onNavigate }) => {
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [tasks, setTasks] = useState<TaskRecord[]>([]);
  const [announcements, setAnnouncements] = useState<AnnouncementRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userSession.employeeId) {
      setLoading(false);
      return;
    }

    const unsubs = [
      FirestoreService.subscribeToAttendance(userSession, company.companyId, (data) => {
        setAttendance(data.filter(a => a.employeeId === userSession.employeeId));
      }),
      FirestoreService.subscribeToTasks(userSession, company.companyId, (data) => {
        setTasks(data.filter(t => t.assignedTo === userSession.employeeId));
      }),
      FirestoreService.subscribeToAnnouncements(userSession, company.companyId, (data) => {
        setAnnouncements(data);
      })
    ];
    
    setTimeout(() => setLoading(false), 800);
    return () => unsubs.forEach(unsub => unsub());
  }, [company.companyId, userSession.employeeId]);

  if (!userSession.employeeId) {
    return (
      <div className="p-8 text-center text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
        <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto mb-4" />
        <p>Your account is not linked to an employee record.</p>
        <p className="text-xs mt-2">Please contact HR or your system administrator.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-12 text-center flex flex-col items-center justify-center space-y-4">
        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Loading ESS Workspace...</p>
      </div>
    );
  }

  const today = new Date().toISOString().split('T')[0];
  const punchedInToday = attendance.find(a => a.attendanceDate === today && a.status === 'PRESENT');
  const isPunchedIn = punchedInToday && !punchedInToday.checkOut;
  const activeTasksCount = tasks.filter(t => t.status === 'TODO' || t.status === 'IN_PROGRESS').length;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Profile Summary */}
      <div className="bg-gradient-to-r from-indigo-900 to-slate-900 rounded-3xl p-6 md:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex items-center gap-6">
          <div className="w-20 h-20 rounded-full bg-white/10 flex items-center justify-center border-2 border-white/20 backdrop-blur-md">
            <UserCircle className="w-10 h-10 text-white/80" />
          </div>
          <div>
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight">{userSession.fullName || 'Employee'}</h2>
            <p className="text-indigo-200 mt-1 flex items-center gap-2 text-sm">
              <span className="font-mono bg-black/20 px-2 py-0.5 rounded text-xs">{userSession.employeeId}</span>
              <span>{userSession.role.replace(/_/g, ' ')}</span>
            </p>
          </div>
        </div>
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <UserCircle className="w-64 h-64" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Attendance Widget */}
        <div className={`p-6 rounded-2xl shadow-sm border transition-all ${isPunchedIn ? 'bg-emerald-50 border-emerald-200 dark:bg-emerald-900/10 dark:border-emerald-800/30' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'}`}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400">Today's Shift</h3>
            <Clock className={`w-5 h-5 ${isPunchedIn ? 'text-emerald-500' : 'text-slate-400'}`} />
          </div>
          <p className="text-3xl font-black text-black dark:text-white tracking-tight">
            {isPunchedIn ? 'ON DUTY' : 'OFF DUTY'}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 font-medium">
            {isPunchedIn && punchedInToday.checkIn ? `Punched in at ${new Date(punchedInToday.checkIn).toLocaleTimeString()}` : 'Not punched in today'}
          </p>
          <div className="mt-6 flex gap-2">
            <button onClick={() => onNavigate('ATTENDANCE_SHIFTS')} className="w-full py-2.5 rounded-xl bg-black dark:bg-white text-white dark:text-black font-bold shadow text-xs uppercase tracking-wider hover:opacity-90 transition-opacity flex items-center justify-center gap-2">
              Attendance Kiosk <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Leave Balance Widget */}
        <div className="p-6 rounded-2xl shadow-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400">Leave Management</h3>
            <Calendar className="w-5 h-5 text-indigo-500" />
          </div>
          <p className="text-3xl font-black text-black dark:text-white tracking-tight">Leave</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 font-medium">Apply for leave, comp-off, or view balance</p>
          <div className="mt-6">
            <button onClick={() => onNavigate('LEAVE_MANAGEMENT')} className="w-full py-2.5 rounded-xl border-2 border-indigo-100 dark:border-indigo-900/50 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 font-bold text-xs uppercase tracking-wider transition-colors flex items-center justify-center gap-2">
              Leave Portal <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Payslips & Docs Widget */}
        <div className="p-6 rounded-2xl shadow-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400">Payroll & Docs</h3>
            <CreditCard className="w-5 h-5 text-purple-500" />
          </div>
          <p className="text-3xl font-black text-black dark:text-white tracking-tight">Payslips</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 font-medium">Download salary slips and tax documents</p>
          <div className="mt-6 flex gap-2">
            <button onClick={() => onNavigate('PAYROLL_COMPENSATION')} className="w-full py-2.5 rounded-xl border-2 border-purple-100 dark:border-purple-900/50 hover:bg-purple-50 dark:hover:bg-purple-900/20 text-purple-600 dark:text-purple-400 font-bold text-xs uppercase tracking-wider transition-colors flex items-center justify-center gap-2">
              Payroll Portal <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Tasks & Work */}
        <div className="p-6 rounded-2xl shadow-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <CheckSquare className="w-5 h-5 text-amber-500" />
              <h3 className="text-base font-bold text-black dark:text-white">My Tasks</h3>
            </div>
            <span className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 text-xs font-bold px-2.5 py-1 rounded-lg">
              {activeTasksCount} Active
            </span>
          </div>
          
          <div className="space-y-3">
            {activeTasksCount === 0 ? (
              <div className="text-center p-6 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700/50">
                <CheckSquare className="w-6 h-6 text-slate-300 mx-auto mb-2" />
                <p className="text-xs font-medium text-slate-500">You have no pending tasks right now.</p>
              </div>
            ) : (
              tasks.filter(t => t.status === 'TODO' || t.status === 'IN_PROGRESS').slice(0, 3).map(task => (
                <div key={task.id} className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700/50 flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-black dark:text-white">{task.title}</h4>
                    <p className="text-xs text-slate-500 mt-0.5">Due: {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'No date'}</p>
                  </div>
                  <span className={`text-[11px] font-bold px-2 py-1 rounded-md ${task.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300'}`}>
                    {task.status.replace('_', ' ')}
                  </span>
                </div>
              ))
            )}
            
            <button onClick={() => onNavigate('MY_TASKS')} className="w-full mt-2 py-2 text-xs font-bold text-slate-500 hover:text-black dark:hover:text-white transition-colors flex items-center justify-center gap-1">
              View All Tasks <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Announcements */}
        <div className="p-6 rounded-2xl shadow-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-rose-500" />
              <h3 className="text-base font-bold text-black dark:text-white">Announcements</h3>
            </div>
            <span className="bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 text-xs font-bold px-2.5 py-1 rounded-lg">
              {announcements.length} Total
            </span>
          </div>
          
          <div className="space-y-3">
            {announcements.length === 0 ? (
              <div className="text-center p-6 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700/50">
                <Bell className="w-6 h-6 text-slate-300 mx-auto mb-2" />
                <p className="text-xs font-medium text-slate-500">No new announcements at this time.</p>
              </div>
            ) : (
              announcements.slice(0, 3).map(ann => (
                <div key={ann.id} className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700/50">
                  <h4 className="text-sm font-bold text-black dark:text-white">{ann.title}</h4>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2">{ann.content}</p>
                </div>
              ))
            )}
            
            <button onClick={() => onNavigate('ANNOUNCEMENTS')} className="w-full mt-2 py-2 text-xs font-bold text-slate-500 hover:text-black dark:hover:text-white transition-colors flex items-center justify-center gap-1">
              View All Communications <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>
      
      {/* Footer Support Links */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
         <button onClick={() => onNavigate('SERVICE_DESK')} className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
            <ClipboardList className="w-5 h-5 text-slate-400" />
            <span className="text-xs font-bold text-slate-600 dark:text-slate-300">Service Desk</span>
         </button>
         <button onClick={() => onNavigate('PROFILE')} className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
            <UserCircle className="w-5 h-5 text-slate-400" />
            <span className="text-xs font-bold text-slate-600 dark:text-slate-300">My Profile</span>
         </button>
         <button onClick={() => onNavigate('LEAVE_MANAGEMENT')} className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
            <FileText className="w-5 h-5 text-slate-400" />
            <span className="text-xs font-bold text-slate-600 dark:text-slate-300">My Documents</span>
         </button>
         <button className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors opacity-50 cursor-not-allowed">
            <AlertTriangle className="w-5 h-5 text-slate-400" />
            <span className="text-xs font-bold text-slate-600 dark:text-slate-300">Raise Incident</span>
         </button>
      </div>
    </div>
  );
};
