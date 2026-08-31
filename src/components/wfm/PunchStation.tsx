import React, { useState, useEffect } from 'react';
import { UserSession, CompanyTenant, SiteRecord, ShiftRecord } from '../../types';
import { FirestoreService } from '../../services/firestoreService';
import { useFeedback } from '../../context/ActionFeedbackContext';
import { MapPin, Clock, LogIn, LogOut, ShieldAlert, CheckCircle2, Navigation, AlertCircle, PhoneCall, RefreshCw } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { GeoUtils } from '../../utils/geoUtils';
import { LanguageSelector } from '../common/LanguageSelector';
import { LanguageService, VoiceFeedbackService } from '../../services/voiceFeedbackService';

interface Props {
  userSession: UserSession;
  activeCompany: CompanyTenant;
}

export const PunchStation: React.FC<Props> = ({ userSession, activeCompany }) => {
  const { isDark } = useTheme();
  const { showLoading, showSuccess, showError } = useFeedback();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [gpsLocation, setGpsLocation] = useState<GeolocationPosition | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [sites, setSites] = useState<SiteRecord[]>([]);
  const [selectedSiteId, setSelectedSiteId] = useState<string>(userSession.assignedSiteId || '');
  const [shifts, setShifts] = useState<ShiftRecord[]>([]);
  const [selectedShiftId, setSelectedShiftId] = useState<string>('');
  const [overrideReason, setOverrideReason] = useState('');
  const [showOverrideModal, setShowOverrideModal] = useState(false);
  const [pendingAction, setPendingAction] = useState<'PUNCH_IN' | 'PUNCH_OUT' | null>(null);
  const [loadingSites, setLoadingSites] = useState(true);
  const [selfie, setSelfie] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);

  const isSupervisorOrAbove = ['PLATFORM_SUPER_ADMIN', 'COMPANY_ADMIN', 'HR_MANAGER', 'SUPERVISOR', 'SITE_INCHARGE'].includes(userSession.role);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch sites and shifts
  useEffect(() => {
    let isMounted = true;
    const loadData = async () => {
      try {
        const fetchedSites = await FirestoreService.getSites(activeCompany.companyId);
        const fetchedShifts = await FirestoreService.getShifts(activeCompany.companyId);
        if (isMounted) {
          setSites(fetchedSites);
          setShifts(fetchedShifts);
          if (fetchedSites.length > 0) {
            const defaultSite = fetchedSites.find(s => s.id === userSession.assignedSiteId) || fetchedSites[0];
            setSelectedSiteId(defaultSite.id);
          }
          if (fetchedShifts.length > 0) {
            setSelectedShiftId(fetchedShifts[0].id);
          }
          setLoadingSites(false);
        }
      } catch (err) {
        console.error('Error loading sites/shifts:', err);
        if (isMounted) setLoadingSites(false);
      }
    };
    loadData();
    return () => { isMounted = false; };
  }, [activeCompany.companyId, userSession.assignedSiteId]);

  // Automatically acquire GPS on mount
  useEffect(() => {
    acquireLocation();
  }, []);

  const acquireLocation = () => {
    if (!navigator.geolocation) {
      setGeoError('Geolocation is not supported by your browser.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGpsLocation(pos);
        setGeoError(null);
      },
      (err) => {
        setGeoError(err.message || 'Unable to retrieve location coordinates.');
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
    );
  };

  const selectedSite = sites.find(s => s.id === selectedSiteId);
  const selectedShift = shifts.find(s => s.id === selectedShiftId) || {
    id: selectedShiftId || 'SHIFT-GEN',
    shiftName: 'General Shift',
    startTime: '09:00',
    endTime: '18:00',
    companyId: activeCompany.companyId
  } as ShiftRecord;

  // Calculate live Geofence status
  let geofenceEval: { result: string; distance: number; error?: string } | null = null;
  if (gpsLocation && selectedSite && selectedSite.latitude && selectedSite.longitude) {
    geofenceEval = GeoUtils.evaluateGeofence(
      gpsLocation.coords.latitude,
      gpsLocation.coords.longitude,
      gpsLocation.coords.accuracy,
      selectedSite.latitude,
      selectedSite.longitude,
      (selectedSite as any).geofenceRadius || (selectedSite as any).geoFenceRadiusMeters || 100,
      (selectedSite as any).accuracyThreshold || 50
    );
  }

  const handlePunchClick = (action: 'PUNCH_IN' | 'PUNCH_OUT') => {
    if (action === 'PUNCH_IN' && !selfie) {
      setIsCameraActive(true);
      setPendingAction(action);
      return;
    }

    if (geofenceEval?.result === 'OUTSIDE_GEOFENCE' && isSupervisorOrAbove) {
      setPendingAction(action);
      setShowOverrideModal(true);
      return;
    }
    executePunch(action, false);
  };

  const handleCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelfie(reader.result as string);
        setIsCameraActive(false);
        if (pendingAction) {
          handlePunchClick(pendingAction);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const executePunch = async (action: 'PUNCH_IN' | 'PUNCH_OUT', isOverride: boolean = false) => {
    if (!gpsLocation) {
      showError('GPS location is required for attendance validation.');
      acquireLocation();
      return;
    }

    if (action === 'PUNCH_IN' && !selfie) {
      showError('Identity verification photo is required for Punch-In.');
      setIsCameraActive(true);
      return;
    }

    const dismiss = showLoading(action === 'PUNCH_IN' ? 'Verifying Identity & Location...' : 'Submitting Punch-Out...');
    try {
      const todayDate = new Date().toISOString().split('T')[0];
      const rosterId = `${todayDate}-${userSession.employeeId || userSession.userId}`;
      const gpsPayload = {
        latitude: gpsLocation.coords.latitude,
        longitude: gpsLocation.coords.longitude,
        accuracy: gpsLocation.coords.accuracy
      };

      let res: { success: boolean; message: string; record?: any };

      if (action === 'PUNCH_IN') {
        res = await FirestoreService.punchIn(
          activeCompany.companyId,
          userSession.employeeId || userSession.userId,
          userSession.fullName || userSession.fullName || 'Employee',
          rosterId,
          selectedShift,
          selectedSiteId,
          selectedSite?.name || 'Selected Site',
          gpsPayload,
          'Web Terminal / AI Vision Verified',
          selfie || undefined,
          'NOT_REQUIRED',
          isOverride,
          isOverride ? overrideReason : undefined
        );
      } else {
        const attendanceId = `ATT-${rosterId}`;
        res = await FirestoreService.punchOut(
          activeCompany.companyId,
          attendanceId,
          selectedShift,
          gpsPayload,
          'NOT_REQUIRED',
          isOverride,
          isOverride ? overrideReason : undefined
        );
      }

      dismiss();
      if (res.success) {
        const msg = res.message || `${action === 'PUNCH_IN' ? 'Punch-In' : 'Punch-Out'} recorded successfully!`;
        showSuccess(msg);
        VoiceFeedbackService.speakKey('SUCCESS_PUNCH');
        setShowOverrideModal(false);
        setOverrideReason('');
        setPendingAction(null);
      } else {
        const errMsg = res.message || 'Attendance punch was rejected by server security rules.';
        showError(errMsg);
        VoiceFeedbackService.speakKey('FAILED_PUNCH');
      }
    } catch (err: any) {
      dismiss();
      const errMsg = err.message || 'Error communicating with attendance server.';
      showError(errMsg);
      VoiceFeedbackService.speakKey('FAILED_PUNCH');
    }
  };

  const siteRadius = Number((selectedSite as any)?.geofenceRadius || (selectedSite as any)?.geoFenceRadiusMeters || 100);

  return (
    <div className={`max-w-xl mx-auto p-6 md:p-8 rounded-3xl border shadow-xl ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
      {/* Top Language & Voice Control */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800 mb-4">
        <div className="flex items-center gap-2">
          <Navigation className="w-4 h-4 text-indigo-500" />
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
            {LanguageService.translate('PUNCH_IN')} / Kiosk
          </span>
        </div>
        <LanguageSelector compact showVoiceToggle />
      </div>

      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400">
          <Navigation className="w-3.5 h-3.5" />
          Server Geofenced Kiosk
        </div>
        <div className="text-5xl font-mono font-bold tracking-tight py-2 text-slate-900 dark:text-white">
          {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </div>
        <p className="text-xs text-slate-500 font-mono">
          {currentTime.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      <div className="mt-6 space-y-4">
        {/* Selfie Verification Card (A-Level Security) */}
        <div className={`p-4 rounded-2xl border ${selfie ? 'border-indigo-200 bg-indigo-50/30' : 'border-dashed border-slate-300 bg-slate-50'} dark:bg-slate-900/50`}>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
              <ShieldAlert className="w-3.5 h-3.5" />
              A-Level Identity Verification
            </label>
            {selfie && (
              <button 
                onClick={() => setSelfie(null)}
                className="text-[10px] font-bold text-rose-600 uppercase hover:underline"
              >
                Retake
              </button>
            )}
          </div>

          {!selfie ? (
            <div className="flex flex-col items-center py-4 space-y-3">
              <div className="w-16 h-16 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center">
                <AlertCircle className="w-8 h-8 text-slate-400" />
              </div>
              <p className="text-[11px] text-slate-500 text-center max-w-[200px]">
                Real-time selfie required for AI Liveness & Face Matching
              </p>
              <label className="cursor-pointer px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-md">
                Capture Identity Photo
                <input 
                  type="file" 
                  capture="user" 
                  accept="image/*" 
                  className="hidden" 
                  onChange={handleCapture}
                />
              </label>
            </div>
          ) : (
            <div className="flex items-center gap-4">
              <div className="relative">
                <img 
                  src={selfie} 
                  alt="Punch Selfie" 
                  className="w-16 h-16 rounded-xl object-cover border-2 border-white shadow-sm"
                />
                <div className="absolute -bottom-1 -right-1 bg-emerald-500 rounded-full p-0.5 border-2 border-white">
                  <CheckCircle2 className="w-3 h-3 text-white" />
                </div>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900 dark:text-white">Photo Captured</p>
                <p className="text-[10px] text-slate-500">Ready for AI Vision Analysis</p>
              </div>
            </div>
          )}
        </div>

        {/* Site Selector */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
            Designated Duty Site
          </label>
          {loadingSites ? (
            <div className="text-xs text-slate-400">Loading company sites...</div>
          ) : (
            <select
              value={selectedSiteId}
              onChange={(e) => setSelectedSiteId(e.target.value)}
              className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {sites.map(s => (
                <option key={s.id} value={s.id}>
                  {s.name || s.id} {s.latitude ? `(${s.latitude.toFixed(4)}, ${s.longitude?.toFixed(4)})` : '(No GPS)'}
                </option>
              ))}
            </select>
          )}

          {selectedSite && selectedSite.latitude && selectedSite.longitude && (
            <div className="mt-2 text-xs text-slate-500 flex items-center justify-between">
              <span>Site Center: {selectedSite.latitude.toFixed(5)}, {selectedSite.longitude.toFixed(5)}</span>
              <span className="font-semibold text-indigo-600 dark:text-indigo-400">Allowed Radius: {siteRadius}m</span>
            </div>
          )}
        </div>

        {/* Live GPS & Geofence Status Card */}
        <div className={`p-4 rounded-2xl border transition-all ${
          !gpsLocation 
            ? 'bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/40 text-amber-900 dark:text-amber-300'
            : geofenceEval?.result === 'WITHIN_GEOFENCE'
            ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/40 text-emerald-900 dark:text-emerald-300'
            : geofenceEval?.result === 'OUTSIDE_GEOFENCE'
            ? 'bg-rose-50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/40 text-rose-900 dark:text-rose-300'
            : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800'
        }`}>
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <div className="mt-0.5">
                {geofenceEval?.result === 'WITHIN_GEOFENCE' ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                ) : geofenceEval?.result === 'OUTSIDE_GEOFENCE' ? (
                  <ShieldAlert className="w-5 h-5 text-rose-600 dark:text-rose-400" />
                ) : (
                  <MapPin className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                )}
              </div>
              <div>
                <p className="font-bold text-sm">
                  {geofenceEval?.result === 'WITHIN_GEOFENCE' 
                    ? 'Within Site Geofence (Verified)'
                    : geofenceEval?.result === 'OUTSIDE_GEOFENCE'
                    ? 'Outside Site Geofence (Breach Detected)'
                    : 'GPS Location Context'}
                </p>
                {gpsLocation ? (
                  <div className="text-xs space-y-0.5 mt-1 font-mono">
                    <p>Current: Lat {gpsLocation.coords.latitude.toFixed(5)}, Lng {gpsLocation.coords.longitude.toFixed(5)} (±{Math.round(gpsLocation.coords.accuracy)}m)</p>
                    {geofenceEval && (
                      <p className="font-bold">
                        Distance from Site: {Math.round(geofenceEval.distance)} meters ({geofenceEval.distance <= siteRadius ? `Inside ${siteRadius}m` : `Exceeds ${siteRadius}m by ${Math.round(geofenceEval.distance - siteRadius)}m`})
                      </p>
                    )}
                  </div>
                ) : geoError ? (
                  <p className="text-xs text-rose-600 dark:text-rose-400 mt-1">{geoError}</p>
                ) : (
                  <p className="text-xs text-slate-500 mt-1">Acquiring high-accuracy satellite coordinates...</p>
                )}
              </div>
            </div>
            <button
              onClick={acquireLocation}
              className="text-xs font-bold px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 transition-colors shrink-0"
            >
              Refresh GPS
            </button>
          </div>
        </div>

        {/* Action Punch Buttons */}
        <div className="grid grid-cols-2 gap-4 pt-2">
          <button 
            onClick={() => handlePunchClick('PUNCH_IN')}
            className={`flex flex-col items-center justify-center p-4 h-36 rounded-3xl text-white shadow-xl transition-all active:scale-95 border-2 border-emerald-400/30 ${
              geofenceEval?.result === 'OUTSIDE_GEOFENCE' && !isSupervisorOrAbove
                ? 'bg-slate-500 cursor-not-allowed opacity-75'
                : 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-500/30'
            }`}
          >
            <LogIn className="w-10 h-10 mb-2 animate-pulse" />
            <span className="font-extrabold text-base tracking-wide text-center">
              {LanguageService.translate('PUNCH_IN')}
            </span>
            {geofenceEval?.result === 'OUTSIDE_GEOFENCE' && !isSupervisorOrAbove && (
              <span className="text-[11px] bg-red-800/80 px-2 py-0.5 rounded-full text-white font-medium mt-1">
                {LanguageService.translate('OUT_OF_GEOFENCE')}
              </span>
            )}
          </button>
          
          <button 
            onClick={() => handlePunchClick('PUNCH_OUT')}
            className={`flex flex-col items-center justify-center p-4 h-36 rounded-3xl text-white shadow-xl transition-all active:scale-95 border-2 border-rose-400/30 ${
              geofenceEval?.result === 'OUTSIDE_GEOFENCE' && !isSupervisorOrAbove
                ? 'bg-slate-500 cursor-not-allowed opacity-75'
                : 'bg-rose-600 hover:bg-rose-500 shadow-rose-500/30'
            }`}
          >
            <LogOut className="w-10 h-10 mb-2" />
            <span className="font-extrabold text-base tracking-wide text-center">
              {LanguageService.translate('PUNCH_OUT')}
            </span>
            {geofenceEval?.result === 'OUTSIDE_GEOFENCE' && !isSupervisorOrAbove && (
              <span className="text-[11px] bg-red-800/80 px-2 py-0.5 rounded-full text-white font-medium mt-1">
                {LanguageService.translate('OUT_OF_GEOFENCE')}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Supervisor Geofence Override Modal */}
      {showOverrideModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`max-w-md w-full p-6 rounded-3xl border shadow-2xl ${isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'}`}>
            <div className="flex items-center gap-3 text-rose-500 mb-4">
              <ShieldAlert className="w-6 h-6 shrink-0" />
              <h3 className="text-base font-bold">Supervisor Geofence Override</h3>
            </div>
            <p className="text-xs text-slate-500 mb-4 leading-relaxed">
              The punch location is <strong>{Math.round(geofenceEval?.distance || 0)}m</strong> away from site center, exceeding the allowed <strong>{siteRadius}m</strong> radius. Because you have supervisor credentials, you may submit an authorized field override with a logged justification.
            </p>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Reason for Off-Site Punch *
                </label>
                <textarea
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  placeholder="e.g. Authorized emergency off-site client dispatch / Gate GPS recalibration"
                  className="w-full h-24 p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs focus:ring-2 focus:ring-rose-500 focus:outline-none"
                />
              </div>
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  onClick={() => {
                    setShowOverrideModal(false);
                    setPendingAction(null);
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  disabled={!overrideReason.trim()}
                  onClick={() => pendingAction && executePunch(pendingAction, true)}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white disabled:opacity-50 transition-colors"
                >
                  Authorize & Submit
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
