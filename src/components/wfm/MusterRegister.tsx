import React, { useState, useEffect } from 'react';
import { Users, UserCheck, UserX, Clock, Search, Filter, AlertTriangle, CheckCircle2, ChevronRight, UserPlus, Info } from 'lucide-react';
import { UserSession, CompanyTenant, ShiftRecord, RosterRecord, AttendanceRecord, SiteRecord, EmployeeRecord } from '../../types';
import { FirestoreService } from '../../services/firestoreService';
import { motion, AnimatePresence } from 'motion/react';

interface Props {
  userSession: UserSession;
  activeCompany: CompanyTenant;
}

export const MusterRegister: React.FC<Props> = ({ userSession, activeCompany }) => {
  const [shifts, setShifts] = useState<ShiftRecord[]>([]);
  const [employees, setEmployees] = useState<EmployeeRecord[]>([]);
  const [rosters, setRosters] = useState<RosterRecord[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [sites, setSites] = useState<SiteRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [selectedSiteId, setSelectedSiteId] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    let unsubs: (() => void)[] = [];
    
    const fetchContext = async () => {
      unsubs.push(FirestoreService.subscribeToShifts(userSession, activeCompany.companyId, setShifts));
      unsubs.push(FirestoreService.subscribeToEmployees(userSession, activeCompany.companyId, setEmployees));
      unsubs.push(FirestoreService.subscribeToSites(activeCompany.companyId, (data: any[]) => {
        setSites(data);
        if (data.length > 0 && !selectedSiteId) setSelectedSiteId(data[0].id);
      }));
      unsubs.push(FirestoreService.subscribeToRosters(userSession, activeCompany.companyId, setRosters));
      unsubs.push(FirestoreService.subscribeToAttendance(userSession, activeCompany.companyId, setAttendance));
      setIsLoading(false);
    };

    fetchContext();
    return () => unsubs.forEach(u => u());
  }, [activeCompany.companyId, userSession]);

  const handleSupervisorPunch = async (employeeId: string, employeeName: string, rosterId: string, shiftId: string, action: 'IN' | 'OUT') => {
    const shift = shifts.find(s => s.id === shiftId);
    if (!shift) return;

    const site = sites.find(s => s.id === selectedSiteId);
    if (!site) return;

    await FirestoreService.supervisorPunch(
      activeCompany.companyId,
      employeeId,
      employeeName,
      rosterId,
      shift,
      selectedSiteId,
      site.name,
      action,
      userSession.userId,
      `Supervisor ${action} - ${userSession.fullName}`
    );
  };

  const currentRosters = rosters.filter(r => (r.date === selectedDate || r.rosterDate === selectedDate) && r.siteId === selectedSiteId);
  
  const filteredRosters = currentRosters.filter(r => 
    (r.employeeName || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = {
    total: currentRosters.length,
    present: attendance.filter(a => a.attendanceDate === selectedDate && a.siteId === selectedSiteId && a.checkIn).length,
    absent: currentRosters.length - attendance.filter(a => a.attendanceDate === selectedDate && a.siteId === selectedSiteId && a.checkIn).length
  };

  return (
    <div className="space-y-6">
      {/* Header & Filters */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-black dark:text-white flex items-center gap-2">
            <Users className="w-6 h-6 text-indigo-600" /> Site Muster Register
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Manage daily attendance and perform supervisor-led muster.</p>
        </div>

        <div className="flex items-center gap-2 bg-white dark:bg-slate-900 p-2 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <select
            className="bg-transparent text-xs font-bold text-slate-900 dark:text-slate-300 dark:text-slate-200 outline-none pr-4 border-r border-slate-100 dark:border-slate-800"
            value={selectedSiteId}
            onChange={(e) => setSelectedSiteId(e.target.value)}
          >
            {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <input
            type="date"
            className="bg-transparent text-xs font-bold text-slate-900 dark:text-slate-300 dark:text-slate-200 outline-none pl-2"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
          />
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Expected Manpower</p>
          <p className="text-2xl font-black text-black dark:text-white mt-1">{stats.total}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <p className="text-[11px] font-bold text-emerald-500 uppercase tracking-widest">Present On-Site</p>
          <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{stats.present}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <p className="text-[11px] font-bold text-rose-500 uppercase tracking-widest">Pending / Absent</p>
          <p className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-1">{stats.absent}</p>
        </div>
      </div>

      {/* Muster List */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
        <div className="p-4 bg-white dark:bg-slate-950/50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="relative flex-1 max-w-xs">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              placeholder="Filter roster..."
              className="w-full pl-9 pr-4 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs outline-none"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest bg-white dark:bg-slate-950/30 dark:bg-slate-800/30">
                <th className="p-4">Employee</th>
                <th className="p-4">Scheduled Shift</th>
                <th className="p-4">Punch In</th>
                <th className="p-4">Punch Out</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Muster Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-800 text-xs">
              {filteredRosters.map(roster => {
                const att = attendance.find(a => a.employeeId === roster.employeeId && a.attendanceDate === selectedDate);
                const shift = shifts.find(s => s.id === roster.shiftId);

                return (
                  <tr key={roster.id} className="hover:bg-white dark:bg-slate-950/50 dark:hover:bg-slate-800/30 transition-all">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-slate-500 dark:text-slate-400">
                          {(roster.employeeName || 'E')[0]}
                        </div>
                        <div>
                          <p className="font-bold text-black dark:text-white">{roster.employeeName || 'Employee'}</p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 uppercase tracking-tighter">{roster.employeeId}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <p className="font-bold text-indigo-600 dark:text-indigo-400">{roster.shiftName}</p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">{shift?.startTime} - {shift?.endTime}</p>
                    </td>
                    <td className="p-4">
                      {att?.checkIn ? (
                        <div className="flex flex-col">
                          <span className="font-bold text-black dark:text-white">
                            {new Date(att.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          <span className="text-[9px] text-slate-400 uppercase tracking-tighter">{att.source}</span>
                        </div>
                      ) : (
                        <span className="text-slate-300 italic">Not Punched</span>
                      )}
                    </td>
                    <td className="p-4">
                      {att?.checkOut ? (
                        <div className="flex flex-col">
                          <span className="font-bold text-black dark:text-white">
                            {new Date(att.checkOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          <span className="text-[9px] text-slate-400 uppercase tracking-tighter">{att.source}</span>
                        </div>
                      ) : (
                        <span className="text-slate-300 italic">No Checkout</span>
                      )}
                    </td>
                    <td className="p-4">
                      <div className="flex flex-col gap-1">
                        <span className={`px-2 py-0.5 rounded-full font-bold text-[9px] uppercase tracking-wider w-fit ${
                          att?.status === 'PRESENT' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300' :
                          att?.status === 'LATE' ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300' :
                          att?.status === 'HALFDAY' ? 'bg-orange-100 text-orange-700 dark:bg-orange-950/60 dark:text-orange-300' :
                          'bg-slate-100 text-slate-400 dark:bg-slate-800'
                        }`}>
                          {att?.status || 'PENDING'}
                        </span>
                        {att?.lateMinutes ? (
                          <span className="text-[11px] font-bold text-amber-600">
                            Late: {att.lateMinutes}m
                          </span>
                        ) : null}
                        {att?.overtimeMinutes ? (
                          <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400">
                            OT: {Math.floor(att.overtimeMinutes / 60)}h {att.overtimeMinutes % 60}m
                          </span>
                        ) : null}
                      </div>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex justify-end gap-1">
                        {!att?.checkIn ? (
                          <button
                            onClick={() => handleSupervisorPunch(roster.employeeId, roster.employeeName || 'Employee', roster.id || '', roster.shiftId, 'IN')}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg font-bold flex items-center gap-1 shadow-sm transition-all"
                          >
                            <UserCheck className="w-3.5 h-3.5" /> Muster IN
                          </button>
                        ) : !att.checkOut ? (
                          <button
                            onClick={() => handleSupervisorPunch(roster.employeeId, roster.employeeName || 'Employee', roster.id || '', roster.shiftId, 'OUT')}
                            className="bg-rose-600 hover:bg-rose-700 text-white px-3 py-1.5 rounded-lg font-bold flex items-center gap-1 shadow-sm transition-all"
                          >
                            <UserX className="w-3.5 h-3.5" /> Muster OUT
                          </button>
                        ) : (
                          <div className="flex items-center gap-1 text-emerald-500 font-bold px-2 py-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Completed
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filteredRosters.length === 0 && (
            <div className="p-20 text-center flex flex-col items-center justify-center space-y-3">
              <div className="w-16 h-16 rounded-3xl bg-white dark:bg-slate-950 dark:bg-slate-800/50 flex items-center justify-center text-slate-300 dark:text-slate-900 dark:text-slate-300">
                <Users className="w-8 h-8" />
              </div>
              <p className="text-sm font-bold text-black dark:text-white">No scheduled manpower found for this site</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
