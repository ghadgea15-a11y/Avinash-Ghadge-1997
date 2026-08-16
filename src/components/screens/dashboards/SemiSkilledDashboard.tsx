import React, { useState, useEffect } from 'react';
import { Clock, AlertTriangle, CheckSquare, Wrench } from 'lucide-react';
import { 
  CompanyTenant, UserSession, PhaseAScreen, AttendanceRecord, TaskRecord, AnnouncementRecord
} from '../../../types';
import { FirestoreService } from '../../../services/firestoreService';
import { OfflineSyncService } from '../../../services/offlineSyncService';

interface DashboardProps {
  userSession: UserSession;
  company: CompanyTenant;
  onNavigate: (screen: PhaseAScreen) => void;
}

export const SemiSkilledDashboard: React.FC<DashboardProps> = ({ userSession, company, onNavigate }) => {
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
      <div className="p-8 text-center text-slate-500 bg-white dark:bg-slate-800 rounded-2xl">
        <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto mb-4" />
        <p>Your account is not linked to an employee record.</p>
      </div>
    );
  }

  if (loading) {
    return <div className="p-8 text-center text-slate-500">Loading Dashboard...</div>;
  }

  const today = new Date().toISOString().split('T')[0];
  const punchedInToday = attendance.find(a => a.attendanceDate === today && a.status === 'PRESENT');
  const isPunchedIn = punchedInToday && !punchedInToday.checkOut;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Attendance Status */}
        <div className={`p-6 rounded-2xl shadow-sm border ${isPunchedIn ? 'bg-emerald-50 border-emerald-200 dark:bg-emerald-900/10 dark:border-emerald-800/30' : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700/50'}`}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-500">My Shift Status</h3>
            <Clock className={`w-5 h-5 ${isPunchedIn ? 'text-emerald-500' : 'text-slate-400'}`} />
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-white">
            {isPunchedIn ? 'ON DUTY' : 'OFF DUTY'}
          </p>
          <p className="text-xs text-slate-500 mt-2">
            {isPunchedIn && punchedInToday.checkIn ? `Punched in at ${new Date(punchedInToday.checkIn).toLocaleTimeString()}` : 'Not punched in today'}
          </p>
          <div className="mt-4 flex gap-2">
            <button onClick={() => onNavigate('ATTENDANCE_SHIFTS')} className="w-full py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow text-sm">
              Open Attendance Panel
            </button>
          </div>

        </div>
      </div>

      {/* My Tasks */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700/50">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-500">My Tasks</h3>
            <CheckSquare className="w-5 h-5 text-blue-500" />
          </div>
          <p className="text-3xl font-black text-slate-900 dark:text-white">
            {tasks.filter(t => t.status === 'TODO' || t.status === 'IN_PROGRESS').length}
          </p>
          <p className="text-xs text-slate-500 mt-2">Active tasks assigned to me</p>
        </div>

        {/* Announcements */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700/50">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-500">Announcements</h3>
            <AlertTriangle className="w-5 h-5 text-emerald-500" />
          </div>
          <p className="text-3xl font-black text-slate-900 dark:text-white">{announcements.length}</p>
          <p className="text-xs text-slate-500 mt-2">Recent company announcements</p>
        </div>
      </div>
    </div>
  );
};
