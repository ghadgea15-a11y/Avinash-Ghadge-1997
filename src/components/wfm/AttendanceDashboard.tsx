import React, { useState, useEffect } from 'react';
import { Clock, CheckCircle2, AlertTriangle, TrendingUp, Users, MapPin } from 'lucide-react';
import { UserSession, CompanyTenant, AttendanceRecord, ShiftRecord, SiteRecord } from '../../types';
import { FirestoreService } from '../../services/firestoreService';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface Props {
  userSession: UserSession;
  activeCompany: CompanyTenant;
}

export const AttendanceDashboard: React.FC<Props> = ({ userSession, activeCompany }) => {
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [shifts, setShifts] = useState<ShiftRecord[]>([]);
  const [sites, setSites] = useState<SiteRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    let unsubs: (() => void)[] = [];
    
    const fetchContext = async () => {
      unsubs.push(FirestoreService.subscribeToShifts(userSession, activeCompany.companyId, setShifts));
      unsubs.push(FirestoreService.subscribeToSites(activeCompany.companyId, setSites));
      unsubs.push(FirestoreService.subscribeToAttendance(userSession, activeCompany.companyId, setAttendance));
      setIsLoading(false);
    };

    fetchContext();
    return () => unsubs.forEach(u => u());
  }, [activeCompany.companyId, userSession]);

  const todayLogs = attendance.filter(a => a.attendanceDate === today);
  
  const stats = {
    present: todayLogs.filter(l => l.status === 'PRESENT' || l.status === 'LATE').length,
    late: todayLogs.filter(l => l.status === 'LATE' || (l.lateMinutes && l.lateMinutes > 0)).length,
    overtime: todayLogs.filter(l => l.overtimeMinutes && l.overtimeMinutes > 0).length,
    avgWorked: todayLogs.length > 0 
      ? Math.round(todayLogs.reduce((acc, l) => acc + (l.workedMinutes || 0), 0) / todayLogs.length) 
      : 0
  };

  // Data for chart: Attendance by Site
  const chartData = sites.map(site => ({
    name: site.name,
    present: todayLogs.filter(l => l.siteId === site.id).length
  })).filter(d => d.present > 0);

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Present Today', value: stats.present, icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Late Arrivals', value: stats.late, icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: 'Overtime Cases', value: stats.overtime, icon: TrendingUp, color: 'text-indigo-600', bg: 'bg-indigo-50' },
          { label: 'Avg. Shift Hours', value: `${Math.floor(stats.avgWorked / 60)}h ${stats.avgWorked % 60}m`, icon: Clock, color: 'text-slate-600', bg: 'bg-slate-50' },
        ].map((kpi, i) => (
          <div key={i} className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
            <div className={`w-12 h-12 rounded-2xl ${kpi.bg} dark:bg-slate-800 flex items-center justify-center ${kpi.color}`}>
              <kpi.icon className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{kpi.label}</p>
              <p className="text-xl font-black text-slate-900 dark:text-white mt-0.5">{kpi.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Attendance by Site Chart */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <MapPin className="w-4 h-4 text-indigo-500" /> Attendance by Site
          </h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 600 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 600 }} />
                <Tooltip 
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  cursor={{ fill: '#f1f5f9' }}
                />
                <Bar dataKey="present" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'][index % 5]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Suspicious / Override Activity */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-500" /> Exceptions & Overrides
          </h3>
          <div className="space-y-3">
            {attendance
              .filter(a => 
                a.checkInGps?.suspiciousFlag || 
                a.checkOutGps?.suspiciousFlag || 
                a.checkInGps?.geofenceOverrideRequested || 
                a.checkOutGps?.geofenceOverrideRequested ||
                a.checkInGps?.biometricVerification === 'FAILED'
              )
              .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
              .slice(0, 5)
              .map(log => (
              <div key={log.id} className="flex items-center justify-between p-3 rounded-2xl bg-rose-50/50 dark:bg-rose-900/10 border border-rose-100 dark:border-rose-900/30">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-white dark:bg-slate-900 flex items-center justify-center font-bold text-xs text-rose-500 border border-rose-200 dark:border-rose-800">
                    {log.employeeName[0]}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900 dark:text-white">{log.employeeName}</p>
                    <p className="text-[10px] text-slate-500">{log.siteName}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold text-rose-600 dark:text-rose-400">
                    {log.checkInGps?.geofenceOverrideRequested ? 'Geofence Override' : 
                     log.checkInGps?.suspiciousFlag ? 'Location Suspicious' : 
                     log.checkInGps?.biometricVerification === 'FAILED' ? 'Biometric Failed' : 'Exception'}
                  </p>
                  <p className="text-[10px] text-slate-400">
                    {log.attendanceDate} {new Date(log.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            ))}
            {attendance.filter(a => a.checkInGps?.suspiciousFlag || a.checkOutGps?.suspiciousFlag || a.checkInGps?.geofenceOverrideRequested || a.checkOutGps?.geofenceOverrideRequested).length === 0 && (
              <div className="py-10 text-center text-slate-400 text-xs italic">No suspicious flags or overrides.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
