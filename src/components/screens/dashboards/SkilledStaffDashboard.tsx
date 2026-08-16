import React, { useState, useEffect } from 'react';
import { Clock, AlertTriangle, CheckSquare, Wrench, Shield, MonitorSmartphone } from 'lucide-react';
import { 
  CompanyTenant, UserSession, PhaseAScreen, AttendanceLogRecord, 
  AssetRecord, IncidentReportRecord, TaskRecord, AnnouncementRecord
} from '../../../types';
import { FirestoreService } from '../../../services/firestoreService';

interface DashboardProps {
  userSession: UserSession;
  company: CompanyTenant;
  onNavigate: (screen: PhaseAScreen) => void;
}

export const SkilledStaffDashboard: React.FC<DashboardProps> = ({ userSession, company, onNavigate }) => {
  const [attendance, setAttendance] = useState<AttendanceLogRecord[]>([]);
  const [assets, setAssets] = useState<AssetRecord[]>([]);
  const [incidents, setIncidents] = useState<IncidentReportRecord[]>([]);
  const [tasks, setTasks] = useState<TaskRecord[]>([]);
  const [announcements, setAnnouncements] = useState<AnnouncementRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userSession.employeeId) {
      setLoading(false);
      return;
    }

    const unsubs = [
      FirestoreService.subscribeToAttendanceLogs(userSession, company.companyId, (data) => {
        setAttendance(data.filter(a => a.employeeId === userSession.employeeId));
      }),
      FirestoreService.subscribeToAssets(userSession, company.companyId, (data) => {
        setAssets(data.filter(a => a.assignedEmployeeId === userSession.employeeId));
      }),
      FirestoreService.subscribeToIncidentReports(userSession, company.companyId, (data) => {
        setIncidents(data.filter(i => i.reportedById === userSession.employeeId));
      }),
      FirestoreService.subscribeToTasks(userSession, company.companyId, (data) => {
        setTasks(data.filter(t => t.assignedTo === userSession.employeeId));
      }),
      FirestoreService.subscribeToAnnouncements(userSession, company.companyId, (data) => {
        // Just show all announcements scoped to them
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
    return <div className="p-8 text-center text-slate-500">Loading Skilled Dashboard...</div>;
  }

  const today = new Date().toISOString().split('T')[0];
  const punchedInToday = attendance.find(a => a.date === today && a.status === 'PRESENT');
  const isPunchedIn = punchedInToday && !punchedInToday.checkOutTime;

  const openIncidents = incidents.filter(i => i.status === 'OPEN' || i.status === 'UNDER_INVESTIGATION').length;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

        {/* Assigned Equipment */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700/50">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-500">My Equipment</h3>
            <MonitorSmartphone className="w-5 h-5 text-indigo-500" />
          </div>
          <p className="text-3xl font-black text-slate-900 dark:text-white">{assets.length}</p>
          <p className="text-xs text-slate-500 mt-2">Assets assigned to you</p>
        </div>

        {/* Reported Incidents */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700/50">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-500">Incidents Reported</h3>
            <AlertTriangle className="w-5 h-5 text-amber-500" />
          </div>
          <p className="text-3xl font-black text-slate-900 dark:text-white">{openIncidents}</p>
          <p className="text-xs text-slate-500 mt-2">Open/In-Progress incidents</p>
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
