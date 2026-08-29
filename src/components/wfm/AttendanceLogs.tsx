import React, { useState, useEffect } from 'react';
import { UserSession, CompanyTenant, AttendanceRecord } from '../../types';
import { FirestoreService } from '../../services/firestoreService';
import { Clock, MapPin, Search, Download } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { toDateSafe, formatDateSafe, formatTimeSafe } from '../../utils/dateUtils';


interface Props {
  userSession: UserSession;
  activeCompany: CompanyTenant;
}

export const AttendanceLogs: React.FC<Props> = ({ userSession, activeCompany }) => {
  const { isDark } = useTheme();
  const [logs, setLogs] = useState<AttendanceRecord[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = FirestoreService.subscribeToAttendance(
      userSession,
      activeCompany.companyId,
      (data) => {
        setLogs(data.sort((a, b) => {
          const dA = toDateSafe(a.timestamp)?.getTime() || 0;
          const dB = toDateSafe(b.timestamp)?.getTime() || 0;
          return dB - dA;
        }));
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, [activeCompany.companyId, userSession]);

  const filtered = logs.filter(l => 
    (l.userName && l.userName.toLowerCase().includes(search.toLowerCase())) || 
    (l.action && l.action.toLowerCase().includes(search.toLowerCase()))
  );

  const handleExport = () => {
    const csvContent = "data:text/csv;charset=utf-8,Timestamp,Employee,Action,Location\n" + filtered.map(e => `${toDateSafe(e.timestamp)?.toISOString() || ''},${e.userName},${e.action},"${e.locationDetails || ''}"`).join("\n"); const encodedUri = encodeURI(csvContent); const link = document.createElement("a"); link.setAttribute("href", encodedUri); link.setAttribute("download", `Attendance_Logs_${activeCompany.companyId}.csv`); document.body.appendChild(link); link.click(); link.remove();
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-xs">
      <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold">Attendance Logs</h2>
          <p className="text-xs text-slate-500">Historical punch records and manual entries.</p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search logs..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>
          <button onClick={handleExport} className="p-2 border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors" title="Export CSV">
            <Download className="w-4 h-4 text-slate-600 dark:text-slate-400" />
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-0">
        {loading ? (
          <div className="p-8 text-center text-slate-500">Loading logs...</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-slate-500">No attendance records found.</div>
        ) : (
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-10">
              <tr>
                <th className="py-3 px-6 font-bold text-slate-500">Timestamp</th>
                <th className="py-3 px-6 font-bold text-slate-500">Employee</th>
                <th className="py-3 px-6 font-bold text-slate-500">Action/Status</th>
                <th className="py-3 px-6 font-bold text-slate-500">Location Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
              {filtered.map(log => (
                <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="py-3 px-6">
                    <p className="font-bold">{formatDateSafe(log.timestamp)}</p>
                    <p className="text-xs text-slate-500 font-mono">{formatTimeSafe(log.timestamp)}</p>
                  </td>
                  <td className="py-3 px-6">
                    <p className="font-bold">{log.userName || 'Unknown'}</p>
                    <p className="text-[10px] text-slate-400 font-mono">{log.employeeId}</p>
                  </td>
                  <td className="py-3 px-6">
                    <span className={`px-2 py-1 rounded-md text-[10px] font-bold font-mono uppercase tracking-wider ${
                      log.action === 'PUNCH_IN' ? 'bg-emerald-100 text-emerald-800' : 
                      log.action === 'PUNCH_OUT' ? 'bg-amber-100 text-amber-800' : 
                      log.action === 'ABSENT' ? 'bg-rose-100 text-rose-800' :
                      'bg-indigo-100 text-indigo-800'
                    }`}>
                      {log.action}
                    </span>
                  </td>
                  <td className="py-3 px-6">
                    <div className="flex items-center gap-1.5 text-xs text-slate-500">
                      <MapPin className="w-3.5 h-3.5" />
                      {log.locationDetails || 'N/A'}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
