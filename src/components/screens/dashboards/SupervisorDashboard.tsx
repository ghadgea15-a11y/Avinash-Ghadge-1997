import React, { useState, useEffect } from 'react';
import { Users, Clock, AlertTriangle, UserCheck, ShieldCheck, CheckSquare, ClipboardList, TrendingUp } from 'lucide-react';
import { 
  CompanyTenant, UserSession, PhaseAScreen, AttendanceRecord, 
  EmployeeRecord, IncidentReportRecord, TaskRecord, DailySiteLogRecord 
} from '../../../types';
import { FirestoreService } from '../../../services/firestoreService';
import { RbacService } from '../../../services/rbacService';

interface DashboardProps {
  userSession: UserSession;
  company: CompanyTenant;
  onNavigate: (screen: PhaseAScreen) => void;
}

export const SupervisorDashboard: React.FC<DashboardProps> = ({ userSession, company, onNavigate }) => {
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [employees, setEmployees] = useState<EmployeeRecord[]>([]);
  const [incidents, setIncidents] = useState<IncidentReportRecord[]>([]);
  const [tasks, setTasks] = useState<TaskRecord[]>([]);
  const [dailyLogs, setDailyLogs] = useState<DailySiteLogRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userSession.assignedSiteId) {
      setLoading(false);
      return;
    }

    const siteId = userSession.assignedSiteId;
    let employeesLoaded = false;
    let attendanceLoaded = false;
    let incidentsLoaded = false;

    const checkLoading = () => {
      if (employeesLoaded && attendanceLoaded && incidentsLoaded) {
        setLoading(false);
      }
    };

    const unsubs = [
      FirestoreService.subscribeToEmployees(userSession, company.companyId, (data) => {
        setEmployees(data.filter(e => 
          e.assignedSiteId === siteId && 
          (e.supervisorId === userSession.employeeId || e.reportingManagerId === userSession.employeeId)
        ));
        employeesLoaded = true;
        checkLoading();
      }),
      FirestoreService.subscribeToAttendance(userSession, company.companyId, (data) => {
        setAttendance(data.filter(a => a.siteId === siteId));
        attendanceLoaded = true;
        checkLoading();
      }),
      FirestoreService.subscribeToIncidentReports(userSession, company.companyId, (data) => {
        setIncidents(data.filter(i => i.siteId === siteId));
        incidentsLoaded = true;
        checkLoading();
      })
    ];
    
    return () => unsubs.forEach(unsub => unsub());
  }, [company.companyId, userSession.assignedSiteId, userSession.employeeId]);

  if (!userSession.assignedSiteId) {
    return (
      <div className="p-8 text-center text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900 dark:bg-slate-800 rounded-2xl">
        <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto mb-4" />
        <p>You are not assigned to a specific site.</p>
        <p className="text-xs mt-2">Supervisors require an assigned site to view operational rosters.</p>
      </div>
    );
  }

  if (loading) {
    return <div className="p-8 text-center text-slate-500 dark:text-slate-400">Loading Supervisor Roster...</div>;
  }

  const teamSize = employees.length;
  const today = new Date().toISOString().split('T')[0];
  
  // Cross reference today's attendance with the supervisor's team
  const teamAttendanceToday = attendance.filter(a => 
    a.attendanceDate === today && 
    employees.some(e => e.id === a.employeeId)
  );
  
  // Guards punched IN but not OUT
  const activeOnDuty = teamAttendanceToday.filter(a => a.status === 'PRESENT' && !a.checkOut).length;
  
  // Calculate absent
  const presentSet = new Set(teamAttendanceToday.map(a => a.employeeId));
  const absentCount = Math.max(0, teamSize - presentSet.size);

  const openIncidents = incidents.filter(i => i.status === 'OPEN' || i.status === 'UNDER_INVESTIGATION').length;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Active Team */}
        <div className="bg-white dark:bg-slate-900 dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700/50">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400">My Team On Duty</h3>
            <UserCheck className="w-5 h-5 text-indigo-500" />
          </div>
          <p className="text-3xl font-black text-black dark:text-white">{activeOnDuty}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">Active now (out of {teamSize} assigned)</p>
          {RbacService.hasModuleAccess(userSession, 'ATTENDANCE') && (
            <button onClick={() => onNavigate('ATTENDANCE_SHIFTS')} className="text-xs text-indigo-600 mt-2 font-semibold flex items-center">
              View Live Roster &rarr;
            </button>
          )}
        </div>

        {/* Missing/Absent */}
        <div className="bg-white dark:bg-slate-900 dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700/50">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400">Absent / Missing</h3>
            <Clock className="w-5 h-5 text-amber-500" />
          </div>
          <p className="text-3xl font-black text-black dark:text-white">{absentCount}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">Team members missing punch-in</p>
        </div>

        {/* Incidents */}
        <div className="bg-white dark:bg-slate-900 dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-red-100 dark:border-red-900/30 bg-red-50/30 dark:bg-red-900/10">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400">Site Incidents</h3>
            <AlertTriangle className="w-5 h-5 text-red-500" />
          </div>
          <p className="text-3xl font-black text-black dark:text-white">{openIncidents}</p>
          {RbacService.hasModuleAccess(userSession, 'SITE_OPERATIONS') && (
            <button onClick={() => onNavigate('SITE_OPERATIONS')} className="text-xs text-red-600 mt-2 font-semibold flex items-center">
              Report/View Incidents &rarr;
            </button>
          )}
        </div>
      </div>

      {/* Supervisor Modules */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Task Allocation */}
        <div className="p-6 bg-white dark:bg-slate-900 dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700/50">
          <h3 className="text-lg font-bold text-black dark:text-white mb-2 flex items-center gap-2">
            <CheckSquare className="w-5 h-5 text-indigo-500" /> Daily Tasks
          </h3>
          <p className="text-3xl font-black text-black dark:text-white">
            {tasks.filter(t => t.status !== 'COMPLETED' && t.status !== 'CANCELLED').length}
          </p>
          <p className="text-sm text-slate-500 dark:text-slate-400">Pending tasks for team</p>
        </div>

        {/* Handover & Reports */}
        <div className="p-6 bg-white dark:bg-slate-900 dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700/50">
          <h3 className="text-lg font-bold text-black dark:text-white mb-2 flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-emerald-500" /> Shift Handovers
          </h3>
          <p className="text-3xl font-black text-black dark:text-white">
            {dailyLogs.filter(l => l.logType === 'HANDOVER' && l.date === new Date().toISOString().split('T')[0]).length}
          </p>
          <p className="text-sm text-slate-500 dark:text-slate-400">Handovers completed today</p>
        </div>
      </div>
    </div>
  );
};
