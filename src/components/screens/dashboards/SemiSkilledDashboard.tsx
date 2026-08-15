import React, { useState, useEffect } from 'react';
import { Clock, AlertTriangle, CheckSquare, Wrench } from 'lucide-react';
import { 
  CompanyTenant, UserSession, PhaseAScreen, AttendanceLogRecord
} from '../../../types';
import { FirestoreService } from '../../../services/firestoreService';

interface DashboardProps {
  userSession: UserSession;
  company: CompanyTenant;
  onNavigate: (screen: PhaseAScreen) => void;
}

export const SemiSkilledDashboard: React.FC<DashboardProps> = ({ userSession, company, onNavigate }) => {
  const [attendance, setAttendance] = useState<AttendanceLogRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userSession.employeeId) {
      setLoading(false);
      return;
    }

    const unsub = FirestoreService.subscribeToAttendanceLogs(userSession, company.companyId, (data) => {
      setAttendance(data.filter(a => a.employeeId === userSession.employeeId));
    });
    
    setTimeout(() => setLoading(false), 800);
    return () => unsub();
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
  const punchedInToday = attendance.find(a => a.date === today && a.status === 'PRESENT');
  const isPunchedIn = punchedInToday && !punchedInToday.checkOutTime;

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
            {isPunchedIn && punchedInToday.checkInTime ? `Punched in at ${new Date(punchedInToday.checkInTime).toLocaleTimeString()}` : 'Not punched in today'}
          </p>
        </div>
      </div>

      {/* Missing Logic Scaffold */}
      <div className="p-6 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
          <Wrench className="w-5 h-5 text-slate-400" /> Ground Tasks (Missing Dependencies)
        </h3>
        <p className="text-sm text-slate-500">
          Task assignments, checklists, and supervisor instructions are not implemented in the Phase A database.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <span className="text-xs bg-slate-200 dark:bg-slate-800 px-2 py-1 rounded">Daily Assigned Tasks</span>
          <span className="text-xs bg-slate-200 dark:bg-slate-800 px-2 py-1 rounded">Task Checklists</span>
          <span className="text-xs bg-slate-200 dark:bg-slate-800 px-2 py-1 rounded">Supervisor Instructions</span>
        </div>
      </div>
    </div>
  );
};
