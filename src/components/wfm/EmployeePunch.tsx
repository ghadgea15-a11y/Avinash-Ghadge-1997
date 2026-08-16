import React, { useState, useEffect } from 'react';
import { MapPin, Clock, CheckCircle2, XCircle, ShieldCheck, AlertTriangle, Fingerprint, Loader2 } from 'lucide-react';
import { UserSession, CompanyTenant, ShiftRecord, RosterRecord, AttendanceRecord, SiteRecord } from '../../types';
import { FirestoreService } from '../../services/firestoreService';
import { motion, AnimatePresence } from 'motion/react';

interface Props {
  userSession: UserSession;
  activeCompany: CompanyTenant;
}

export const EmployeePunch: React.FC<Props> = ({ userSession, activeCompany }) => {
  const [shifts, setShifts] = useState<ShiftRecord[]>([]);
  const [sites, setSites] = useState<SiteRecord[]>([]);
  const [todayRoster, setTodayRoster] = useState<RosterRecord | null>(null);
  const [attendance, setAttendance] = useState<AttendanceRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [gps, setGps] = useState<{ latitude: number, longitude: number, accuracy?: number } | null>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);

  const [message, setMessage] = useState<{ type: 'SUCCESS' | 'ERROR', text: string } | null>(null);

  const date = new Date().toISOString().split('T')[0];

  useEffect(() => {
    const fetchContext = async () => {
      // 1. Get Sites (for geofencing)
      const siteList = await FirestoreService.getSites(activeCompany.companyId);
      setSites(siteList);

      // 2. Get Shifts
      const shiftList = await FirestoreService.getShifts(activeCompany.companyId);
      setShifts(shiftList);

      // 3. Get Today's Roster
      const unsubRoster = FirestoreService.subscribeToRosters(userSession, activeCompany.companyId, (data) => {
        const found = data.find(r => r.date === date && r.employeeId === userSession.employeeId);
        setTodayRoster(found || null);
      });

      // 4. Get Today's Attendance
      const unsubAttendance = FirestoreService.subscribeToAttendance(userSession, activeCompany.companyId, (data) => {
        const found = data.find(a => a.attendanceDate === date && a.employeeId === userSession.employeeId);
        setAttendance(found || null);
      });

      setIsLoading(false);
      return () => {
        unsubRoster();
        unsubAttendance();
      };
    };

    fetchContext();
    handleFetchGps();
  }, [activeCompany.companyId, userSession, date]);

  const handleFetchGps = () => {
    if (!navigator.geolocation) {
      setGpsError('GPS not supported');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => setGps({ latitude: pos.coords.latitude, longitude: pos.coords.longitude, accuracy: pos.coords.accuracy }),
      (err) => setGpsError('GPS permission denied'),
      { enableHighAccuracy: true }
    );
  };

  const handlePunchIn = async () => {
    if (!todayRoster) return;
    const shift = shifts.find(s => s.id === todayRoster.shiftId);
    if (!shift) return;

    setIsProcessing(true);
    const res = await FirestoreService.punchIn(
      activeCompany.companyId,
      userSession.employeeId,
      userSession.fullName,
      todayRoster.id,
      shift,
      todayRoster.siteId,
      todayRoster.siteName,
      gps || undefined,
      navigator.userAgent
    );
    
    setMessage({ type: res.success ? 'SUCCESS' : 'ERROR', text: res.message });
    setIsProcessing(false);
  };

  const handlePunchOut = async () => {
    if (!attendance || !todayRoster) return;
    const shift = shifts.find(s => s.id === todayRoster.shiftId);
    if (!shift) return;

    setIsProcessing(true);
    const res = await FirestoreService.punchOut(
      activeCompany.companyId,
      attendance.id,
      shift,
      gps || undefined
    );

    setMessage({ type: res.success ? 'SUCCESS' : 'ERROR', text: res.message });
    setIsProcessing(false);
  };

  if (isLoading) return (
    <div className="flex flex-col items-center justify-center p-20 space-y-4">
      <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
      <p className="text-slate-500 font-medium">Validating shift session...</p>
    </div>
  );

  const activeShift = todayRoster ? shifts.find(s => s.id === todayRoster.shiftId) : null;

  return (
    <div className="max-w-md mx-auto space-y-6 animate-fade-in">
      {/* Shift Context Card */}
      <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 p-8 shadow-xl shadow-indigo-600/5 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4">
          <div className={`w-3 h-3 rounded-full animate-pulse ${gps ? 'bg-emerald-500' : 'bg-rose-500'}`} />
        </div>

        <div className="space-y-6 text-center">
          <div className="space-y-2">
            <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </h2>
            <p className="text-sm font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-[0.2em]">
              {new Date().toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'short' })}
            </p>
          </div>

          <div className="py-6 border-y border-slate-100 dark:border-slate-800 space-y-4">
            {todayRoster ? (
              <>
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Scheduled Shift</p>
                  <p className="text-lg font-bold text-slate-900 dark:text-white">{todayRoster.shiftName}</p>
                  <p className="text-xs font-medium text-slate-500 flex items-center justify-center gap-1">
                    <Clock className="w-3.5 h-3.5" /> {activeShift?.startTime} - {activeShift?.endTime}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Deployment Site</p>
                  <p className="text-sm font-bold text-slate-700 dark:text-slate-200 flex items-center justify-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-rose-500" /> {todayRoster.siteName}
                  </p>
                </div>
              </>
            ) : (
              <div className="space-y-2 py-4">
                <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto" />
                <p className="text-sm font-bold text-slate-900 dark:text-white">No Shift Scheduled</p>
                <p className="text-xs text-slate-500">You are not rostered for a shift today. Please contact your supervisor.</p>
              </div>
            )}
          </div>

          {/* Punch Actions */}
          <div className="pt-2">
            {!attendance ? (
              <button
                disabled={!todayRoster || isProcessing}
                onClick={handlePunchIn}
                className="w-full aspect-square max-w-[200px] mx-auto bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-full flex flex-col items-center justify-center gap-3 shadow-2xl shadow-indigo-600/40 transition-all active:scale-95 group"
              >
                {isProcessing ? (
                  <Loader2 className="w-12 h-12 animate-spin" />
                ) : (
                  <>
                    <Fingerprint className="w-12 h-12 group-hover:scale-110 transition-transform" />
                    <span className="text-sm font-black uppercase tracking-widest">Punch In</span>
                  </>
                )}
              </button>
            ) : !attendance.checkOut ? (
              <button
                disabled={isProcessing}
                onClick={handlePunchOut}
                className="w-full aspect-square max-w-[200px] mx-auto bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white rounded-full flex flex-col items-center justify-center gap-3 shadow-2xl shadow-rose-600/40 transition-all active:scale-95 group"
              >
                {isProcessing ? (
                  <Loader2 className="w-12 h-12 animate-spin" />
                ) : (
                  <>
                    <Fingerprint className="w-12 h-12 group-hover:scale-110 transition-transform" />
                    <span className="text-sm font-black uppercase tracking-widest">Punch Out</span>
                  </>
                )}
              </button>
            ) : (
              <div className="p-6 rounded-3xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800 space-y-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
                <p className="text-sm font-bold text-emerald-700 dark:text-emerald-400">Shift Completed</p>
                <p className="text-[10px] font-medium text-emerald-600/70">
                  Worked: {Math.floor(attendance.workedMinutes / 60)}h {attendance.workedMinutes % 60}m
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* GPS Status Card */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-xl ${gps ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
            <MapPin className="w-4 h-4" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Location Status</p>
            <p className="text-xs font-bold text-slate-900 dark:text-white">
              {gps ? `Secured Accuracy: ${gps.accuracy?.toFixed(1)}m` : (gpsError || 'Waiting for GPS...')}
            </p>
          </div>
        </div>
        <button onClick={handleFetchGps} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors">
          <ShieldCheck className="w-5 h-5 text-indigo-500" />
        </button>
      </div>

      {/* Messaging */}
      <AnimatePresence>
        {message && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className={`p-4 rounded-2xl border text-xs font-bold flex items-center gap-3 ${
              message.type === 'SUCCESS' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}
          >
            {message.type === 'SUCCESS' ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
            {message.text}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
