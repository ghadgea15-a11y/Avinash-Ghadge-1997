import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  ShieldCheck, 
  MapPin, 
  QrCode, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  Compass, 
  Navigation, 
  Camera, 
  Send, 
  Flag, 
  ChevronRight,
  AlertCircle,
  FileWarning,
  Radio,
  BellRing,
  ShieldAlert
} from 'lucide-react';
import { 
  PatrolTourRecord, 
  PatrolCheckpointRecord, 
  PatrolTourCheckpointScan, 
  PatrolGeofenceStatus,
  UserSession,
  SiteRecord 
} from '../../types';
import { GeoUtils } from '../../utils/geoUtils';
import { QRScannerModal } from '../common/QRScannerModal';

interface PatrolTourRunnerModalProps {
  isOpen: boolean;
  onClose: () => void;
  tour: PatrolTourRecord;
  siteCheckpoints: PatrolCheckpointRecord[];
  userSession: UserSession;
  site?: SiteRecord;
  onRecordScan: (scan: PatrolTourCheckpointScan) => Promise<boolean>;
  onCompleteTour: (remarks: string, endGps?: { latitude: number; longitude: number; accuracy?: number }) => Promise<boolean>;
  onReportIncidentAtCheckpoint?: (checkpoint: PatrolCheckpointRecord, tourId: string) => void;
}

export const PatrolTourRunnerModal: React.FC<PatrolTourRunnerModalProps> = ({
  isOpen,
  onClose,
  tour,
  siteCheckpoints,
  userSession,
  site,
  onRecordScan,
  onCompleteTour,
  onReportIncidentAtCheckpoint
}) => {
  if (!isOpen) return null;

  // State for active tour execution
  const [activeCheckpointIndex, setActiveCheckpointIndex] = useState<number>(0);
  const [currentGps, setCurrentGps] = useState<{ latitude: number; longitude: number; accuracy: number } | null>(null);
  const [gpsError, setGpsError] = useState<string>('');
  const [isReadingGps, setIsReadingGps] = useState<boolean>(false);
  const [scanCodeInput, setScanCodeInput] = useState<string>('');
  const [isCameraScanning, setIsCameraScanning] = useState<boolean>(false);
  const [isNfcScanning, setIsNfcScanning] = useState<boolean>(false);
  const [isNfcModalOpen, setIsNfcModalOpen] = useState<boolean>(false);
  const [checkpointNotes, setCheckpointNotes] = useState<string>('');
  const [tourRemarks, setTourRemarks] = useState<string>('');
  const [isSubmittingScan, setIsSubmittingScan] = useState<boolean>(false);
  const [isCompletingTour, setIsCompletingTour] = useState<boolean>(false);
  const [statusFeedback, setStatusFeedback] = useState<{ type: 'SUCCESS' | 'ERROR' | 'WARN'; message: string } | null>(null);
  const [outOfSequenceConfirm, setOutOfSequenceConfirm] = useState<{ checkpoint: PatrolCheckpointRecord; expectedSeq: number } | null>(null);
  const [geofenceViolationConfirm, setGeofenceViolationConfirm] = useState<{
    checkpoint: PatrolCheckpointRecord;
    distance: number;
    radius: number;
    method: string;
    isOutOfSequence: boolean;
  } | null>(null);
  const [incompleteTourConfirm, setIncompleteTourConfirm] = useState<{
    missedCheckpoints: PatrolCheckpointRecord[];
  } | null>(null);
  const [timeElapsed, setTimeElapsed] = useState<string>('00:00:00');

  // Sorted list of checkpoints configured for this tour/plan
  const orderedCheckpoints = siteCheckpoints.sort((a, b) => a.sequenceOrder - b.sequenceOrder);
  const scannedCheckpointIds = (tour.checkpointScans || []).map((s: any) => s.checkpointId);

  // Timer for active tour duration
  useEffect(() => {
    const startTime = new Date(tour.actualStart || tour.createdAt || Date.now()).getTime();
    const interval = setInterval(() => {
      const diffMs = Math.max(0, Date.now() - startTime);
      const totalSec = Math.floor(diffMs / 1000);
      const hours = Math.floor(totalSec / 3600).toString().padStart(2, '0');
      const minutes = Math.floor((totalSec % 3600) / 60).toString().padStart(2, '0');
      const seconds = (totalSec % 60).toString().padStart(2, '0');
      setTimeElapsed(`${hours}:${minutes}:${seconds}`);
    }, 1000);

    return () => clearInterval(interval);
  }, [tour.actualStart, tour.createdAt]);

  // Read current GPS on mount and on request
  const fetchCurrentLocation = () => {
    if (!navigator.geolocation) {
      setGpsError('Geolocation is not supported on this device/browser.');
      return;
    }

    setIsReadingGps(true);
    setGpsError('');

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCurrentGps({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy
        });
        setIsReadingGps(false);
      },
      (error) => {
        console.warn('[PatrolRunner] GPS error:', error.message);
        setGpsError('Could not acquire live GPS. Device location permissions may be required.');
        setIsReadingGps(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
    );
  };

  useEffect(() => {
    fetchCurrentLocation();
  }, []);

  // Web NFC Scan handler
  const handleStartNfcScan = async () => {
    if ('NDEFReader' in window) {
      try {
        setIsNfcScanning(true);
        // @ts-ignore
        const ndef = new window.NDEFReader();
        await ndef.scan();
        setStatusFeedback({ type: 'SUCCESS', message: 'NFC Antenna active. Tap tag to device...' });
        ndef.addEventListener('reading', ({ serialNumber }: any) => {
          setIsNfcScanning(false);
          const tagCode = serialNumber || (currentTargetCheckpoint?.nfcTagId || currentTargetCheckpoint?.code);
          setScanCodeInput(tagCode);
          if (currentTargetCheckpoint) {
            handleVerifyCurrentCheckpoint(currentTargetCheckpoint, tagCode, 'NFC_TAP');
          }
        });
      } catch (err: any) {
        setIsNfcScanning(false);
        setIsNfcModalOpen(true);
      }
    } else {
      setIsNfcModalOpen(true);
    }
  };

  // Find next pending checkpoint
  const currentTargetCheckpoint = orderedCheckpoints[activeCheckpointIndex] || orderedCheckpoints[0];

  // Helper to extract GPS coords from Site
  const siteLat = site?.latitude ?? site?.geoCoordinates?.latitude;
  const siteLng = site?.longitude ?? site?.geoCoordinates?.longitude;
  const siteRadius = site?.geofenceRadius ?? site?.geoFenceRadiusMeters ?? 100;

  // Calculate distance to current target checkpoint
  let distanceToTarget: number | null = null;
  let isWithinGeofence = false;

  const targetCpLat = currentTargetCheckpoint?.gpsCoordinates?.latitude ?? currentTargetCheckpoint?.latitude;
  const targetCpLng = currentTargetCheckpoint?.gpsCoordinates?.longitude ?? currentTargetCheckpoint?.longitude;
  const targetCpRadius = currentTargetCheckpoint?.geofenceRadiusMeters ?? currentTargetCheckpoint?.geofenceRadius ?? siteRadius;

  if (currentGps && targetCpLat !== undefined && targetCpLng !== undefined) {
    distanceToTarget = GeoUtils.calculateDistanceInMeters(
      currentGps.latitude,
      currentGps.longitude,
      targetCpLat,
      targetCpLng
    );
    isWithinGeofence = (distanceToTarget || 0) <= targetCpRadius;
  } else if (currentGps && siteLat !== undefined && siteLng !== undefined) {
    distanceToTarget = GeoUtils.calculateDistanceInMeters(
      currentGps.latitude,
      currentGps.longitude,
      siteLat,
      siteLng
    );
    isWithinGeofence = (distanceToTarget || 0) <= siteRadius;
  }

  // Execute Checkpoint Verification Scan
  const executeScan = async (
    checkpoint: PatrolCheckpointRecord, 
    isOutOfSequenceOverride: boolean = false,
    verificationMethod: 'QR_SCAN' | 'NFC_TAP' | 'MANUAL' | 'GPS_ONLY' = 'QR_SCAN',
    forceGeofenceOverride: boolean = false
  ) => {
    setIsSubmittingScan(true);
    setStatusFeedback(null);

    // Calculate geofence status
    let geofenceStatus: PatrolGeofenceStatus = 'NO_GEOFENCE_DATA';
    let distanceInMeters: number | undefined;

    const cpLat = checkpoint.gpsCoordinates?.latitude ?? checkpoint.latitude;
    const cpLng = checkpoint.gpsCoordinates?.longitude ?? checkpoint.longitude;
    const cpRadius = checkpoint.geofenceRadiusMeters ?? checkpoint.geofenceRadius ?? siteRadius;

    if (currentGps && cpLat !== undefined && cpLng !== undefined) {
      distanceInMeters = GeoUtils.calculateDistanceInMeters(
        currentGps.latitude,
        currentGps.longitude,
        cpLat,
        cpLng
      );
      geofenceStatus = (distanceInMeters || 0) <= cpRadius ? 'WITHIN_GEOFENCE' : 'OUTSIDE_GEOFENCE';
    } else if (currentGps && siteLat !== undefined && siteLng !== undefined) {
      distanceInMeters = GeoUtils.calculateDistanceInMeters(
        currentGps.latitude,
        currentGps.longitude,
        siteLat,
        siteLng
      );
      geofenceStatus = (distanceInMeters || 0) <= siteRadius ? 'WITHIN_GEOFENCE' : 'OUTSIDE_GEOFENCE';
    }

    // Strict Geofence Enforcement: Check if outside geofence without override
    if (geofenceStatus === 'OUTSIDE_GEOFENCE' && !forceGeofenceOverride) {
      setIsSubmittingScan(false);
      setGeofenceViolationConfirm({
        checkpoint,
        distance: Math.round(distanceInMeters || 0),
        radius: cpRadius,
        method: verificationMethod,
        isOutOfSequence: isOutOfSequenceOverride
      });
      return;
    }

    const scanRecord: PatrolTourCheckpointScan = {
      checkpointId: checkpoint.id,
      checkpointName: checkpoint.checkpointName,
      code: checkpoint.code,
      sequenceOrder: checkpoint.sequenceOrder,
      scannedAt: new Date().toISOString(),
      scannedByUid: userSession.userId,
      scannedByName: userSession.fullName,
      status: 'COMPLETED',
      verificationMethod: verificationMethod,
      gpsLocation: currentGps ? {
        latitude: currentGps.latitude,
        longitude: currentGps.longitude,
        accuracy: currentGps.accuracy
      } : undefined,
      distanceFromTargetMeters: distanceInMeters,
      geofenceStatus,
      sequenceStatus: isOutOfSequenceOverride ? 'OUT_OF_SEQUENCE' : 'IN_SEQUENCE',
      remarks: checkpointNotes.trim() || (forceGeofenceOverride ? `[Supervisor Override: Scanned ${Math.round(distanceInMeters || 0)}m outside boundary]` : undefined)
    };

    const success = await onRecordScan(scanRecord);
    setIsSubmittingScan(false);

    if (success) {
      setScanCodeInput('');
      setCheckpointNotes('');
      setOutOfSequenceConfirm(null);
      setGeofenceViolationConfirm(null);
      setStatusFeedback({
        type: geofenceStatus === 'OUTSIDE_GEOFENCE' ? 'WARN' : 'SUCCESS',
        message: `Checkpoint '${checkpoint.checkpointName}' recorded successfully (${verificationMethod}).${geofenceStatus === 'OUTSIDE_GEOFENCE' ? ' ⚠️ Geofence Exception Logged.' : ' ✓ Within Geofence.'}`
      });

      // Advance to next unscanned checkpoint
      const nextIndex = orderedCheckpoints.findIndex((cp, idx) => idx > activeCheckpointIndex && !scannedCheckpointIds.includes(cp.id));
      if (nextIndex !== -1) {
        setActiveCheckpointIndex(nextIndex);
      }
    } else {
      setStatusFeedback({
        type: 'ERROR',
        message: 'Failed to record checkpoint scan. Please check connection and retry.'
      });
    }
  };

  const handleVerifyCurrentCheckpoint = (
    checkpoint: PatrolCheckpointRecord, 
    customCode?: string,
    method: 'QR_SCAN' | 'NFC_TAP' | 'MANUAL' | 'GPS_ONLY' = 'QR_SCAN'
  ) => {
    const rawCode = (customCode || scanCodeInput).trim();
    
    // Check if matching code, QR or NFC UID
    if (rawCode) {
      const input = rawCode.toUpperCase();
      const codeMatch = 
        input === checkpoint.code.toUpperCase() || 
        input === (checkpoint.qrCode || '').toUpperCase() ||
        input === (checkpoint.nfcTagId || '').toUpperCase() ||
        input === (checkpoint.tagUid || '').toUpperCase();

      if (!codeMatch) {
        setStatusFeedback({
          type: 'ERROR',
          message: `Code '${rawCode}' does not match checkpoint ${checkpoint.code} (NFC: ${checkpoint.nfcTagId || 'N/A'}).`
        });
        return;
      }
    }

    // Check sequence enforcement
    const expectedCp = orderedCheckpoints.find(cp => !scannedCheckpointIds.includes(cp.id));
    if (expectedCp && expectedCp.id !== checkpoint.id && tour.enforceSequence) {
      setOutOfSequenceConfirm({
        checkpoint,
        expectedSeq: expectedCp.sequenceOrder
      });
      return;
    }

    executeScan(checkpoint, false, method, false);
  };

  const completedCount = (tour.checkpointScans || []).filter((s: any) => s.status === 'COMPLETED').length;
  const totalCount = tour.totalCheckpoints || orderedCheckpoints.length || 1;
  const progressPercent = Math.round((completedCount / totalCount) * 100);

  const handleFinishTour = async () => {
    const unvisited = orderedCheckpoints.filter(cp => !scannedCheckpointIds.includes(cp.id));
    if (unvisited.length > 0 && !incompleteTourConfirm) {
      setIncompleteTourConfirm({ missedCheckpoints: unvisited });
      return;
    }

    setIsCompletingTour(true);
    const success = await onCompleteTour(tourRemarks, currentGps || undefined);
    setIsCompletingTour(false);
    if (success) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-3xl w-full overflow-hidden border border-slate-200 dark:border-slate-800 my-6 animate-in fade-in zoom-in duration-200">
        
        {/* Top Header */}
        <div className="bg-slate-900 px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-emerald-500 rounded-xl text-white shadow">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Live Patrol Tour
                </span>
                <span className="font-mono text-xs text-slate-400">#{tour.tourNumber}</span>
              </div>
              <h3 className="font-bold text-lg text-white">
                {tour.patrolPlanName || 'Standard Security Patrol'}
              </h3>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <div className="text-right">
              <div className="flex items-center text-emerald-400 font-mono text-sm font-bold">
                <Clock className="w-4 h-4 mr-1.5 animate-pulse" />
                {timeElapsed}
              </div>
              <span className="text-xs text-slate-400">Duration</span>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Progress Metric Bar */}
        <div className="bg-slate-100 dark:bg-slate-800/60 px-6 py-3 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center space-x-2">
            <span className="text-xs font-semibold text-slate-900 dark:text-slate-300">Checkpoints Visited:</span>
            <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400 font-mono">{completedCount} / {totalCount}</span>
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full font-mono ${
              progressPercent >= 100 ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300'
            }`}>
              {progressPercent}% Complete
            </span>
          </div>

          {/* Live GPS status pill */}
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={fetchCurrentLocation}
              disabled={isReadingGps}
              className="flex items-center space-x-1.5 px-2.5 py-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-900 dark:text-slate-300 hover:bg-slate-50 transition-colors"
            >
              <Navigation className={`w-3.5 h-3.5 ${isReadingGps ? 'text-indigo-600 animate-spin' : 'text-emerald-600'}`} />
              <span>{isReadingGps ? 'Acquiring GPS...' : currentGps ? `GPS ±${Math.round(currentGps.accuracy)}m` : 'Read GPS'}</span>
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Feedback message banner */}
          {statusFeedback && (
            <div className={`p-3.5 rounded-xl border flex items-center space-x-2.5 text-sm font-medium animate-in fade-in duration-200 ${
              statusFeedback.type === 'SUCCESS' ? 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300' :
              statusFeedback.type === 'WARN' ? 'bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-300' :
              'bg-rose-50 border-rose-200 text-rose-800 dark:bg-rose-950/40 dark:border-rose-800 dark:text-rose-300'
            }`}>
              {statusFeedback.type === 'SUCCESS' ? <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" /> :
               statusFeedback.type === 'WARN' ? <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" /> :
               <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />}
              <span>{statusFeedback.message}</span>
            </div>
          )}

          {/* MODAL / ALERT 1: GEOFENCE VIOLATION REJECTION & OVERRIDE */}
          {geofenceViolationConfirm && (
            <div className="p-4 bg-rose-50 dark:bg-rose-950/50 border-2 border-rose-300 dark:border-rose-800 rounded-2xl space-y-3 animate-in fade-in duration-200">
              <div className="flex items-start space-x-3">
                <ShieldAlert className="w-6 h-6 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-bold text-rose-900 dark:text-rose-200 flex items-center gap-1.5">
                    <span>❌ Geofence Boundary Check Failed</span>
                    <span className="px-2 py-0.5 text-[10px] uppercase font-mono rounded bg-rose-200 dark:bg-rose-900 text-rose-800 dark:text-rose-100">Violation</span>
                  </h4>
                  <p className="text-xs text-rose-800 dark:text-rose-300 mt-1 leading-relaxed">
                    You are <strong>{geofenceViolationConfirm.distance} meters</strong> away from checkpoint <strong>'{geofenceViolationConfirm.checkpoint.checkpointName}'</strong>. 
                    Authorized perimeter radius is <strong>{geofenceViolationConfirm.radius} meters</strong>.
                  </p>
                  <p className="text-[11px] text-rose-700 dark:text-rose-400 mt-1">
                    Checkpoint scan cannot be accepted outside the authorized perimeter. Please walk to the designated checkpoint location or apply an emergency supervisor waiver.
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-rose-200 dark:border-rose-800">
                <button
                  type="button"
                  onClick={() => setGeofenceViolationConfirm(null)}
                  className="px-3.5 py-1.5 text-xs font-semibold text-rose-900 dark:text-rose-200 bg-white dark:bg-slate-900 border border-rose-300 rounded-lg hover:bg-rose-100"
                >
                  Cancel & Move Closer
                </button>
                <button
                  type="button"
                  onClick={() => executeScan(geofenceViolationConfirm.checkpoint, geofenceViolationConfirm.isOutOfSequence, geofenceViolationConfirm.method as any, true)}
                  className="px-3.5 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-sm"
                >
                  Emergency Override (Log Exception)
                </button>
              </div>
            </div>
          )}

          {/* MODAL / ALERT 2: MISSED CHECKPOINTS ESCALATION PROMPT */}
          {incompleteTourConfirm && (
            <div className="p-4 bg-amber-50 dark:bg-amber-950/50 border-2 border-amber-300 dark:border-amber-800 rounded-2xl space-y-3 animate-in fade-in duration-200">
              <div className="flex items-start space-x-3">
                <BellRing className="w-6 h-6 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5 animate-bounce" />
                <div className="flex-1">
                  <h4 className="text-sm font-bold text-amber-900 dark:text-amber-200">
                    🚨 Missed Checkpoint Alert ({incompleteTourConfirm.missedCheckpoints.length} Unvisited Checkpoints)
                  </h4>
                  <p className="text-xs text-amber-800 dark:text-amber-300 mt-1">
                    Ending this tour now will mark status as <strong>INCOMPLETE ({progressPercent}%)</strong> and immediately dispatch a high-priority Missed-Checkpoint Alert to the Site Supervisor and Management.
                  </p>
                  
                  <div className="mt-2.5 p-2 bg-white/80 dark:bg-slate-900/80 rounded-xl border border-amber-200 dark:border-amber-900 max-h-32 overflow-y-auto">
                    <p className="text-[10px] font-bold uppercase text-amber-900 dark:text-amber-400 mb-1">Unscanned Checkpoints:</p>
                    <ul className="space-y-1">
                      {incompleteTourConfirm.missedCheckpoints.map(cp => (
                        <li key={cp.id} className="text-xs text-slate-700 dark:text-slate-300 flex items-center justify-between font-mono">
                          <span>• Seq #{cp.sequenceOrder} {cp.checkpointName}</span>
                          <span className="text-[10px] text-amber-600 dark:text-amber-400 font-sans">Tag: {cp.code}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-amber-200 dark:border-amber-800">
                <button
                  type="button"
                  onClick={() => setIncompleteTourConfirm(null)}
                  className="px-3.5 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 border border-slate-300 rounded-lg hover:bg-slate-100"
                >
                  Resume Patrol Tour
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    setIncompleteTourConfirm(null);
                    setIsCompletingTour(true);
                    const success = await onCompleteTour(tourRemarks || 'Incomplete patrol: checkpoints skipped.', currentGps || undefined);
                    setIsCompletingTour(false);
                    if (success) onClose();
                  }}
                  disabled={isCompletingTour}
                  className="px-4 py-1.5 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-lg shadow-sm"
                >
                  {isCompletingTour ? 'Dispatching Alert...' : 'Confirm End Tour & Notify Supervisor'}
                </button>
              </div>
            </div>
          )}

          {/* Out of sequence confirmation warning prompt */}
          {outOfSequenceConfirm && (
            <div className="p-4 bg-amber-50 dark:bg-amber-950/40 border-2 border-amber-300 rounded-2xl space-y-3">
              <div className="flex items-start space-x-3">
                <AlertTriangle className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-bold text-amber-900">Sequence Order Exception Detected</h4>
                  <p className="text-xs text-amber-800 mt-1 leading-relaxed">
                    This patrol plan enforces sequential scanning. Expected next checkpoint is <strong>Seq #{outOfSequenceConfirm.expectedSeq}</strong>, but you are verifying <strong>{outOfSequenceConfirm.checkpoint.checkpointName} (Seq #{outOfSequenceConfirm.checkpoint.sequenceOrder})</strong>.
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-amber-200">
                <button
                  type="button"
                  onClick={() => setOutOfSequenceConfirm(null)}
                  className="px-3 py-1.5 text-xs font-medium text-amber-900 bg-white dark:bg-slate-900 border border-amber-300 rounded-lg hover:bg-amber-100"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => executeScan(outOfSequenceConfirm.checkpoint, true, 'QR_SCAN', false)}
                  className="px-3.5 py-1.5 text-xs font-bold text-white bg-amber-600 rounded-lg hover:bg-amber-700 shadow-sm"
                >
                  Confirm & Log Sequence Exception
                </button>
              </div>
            </div>
          )}

          {/* Active Target Checkpoint Card */}
          {currentTargetCheckpoint && (
            <div className="border-2 border-indigo-200 dark:border-indigo-900/60 rounded-2xl p-5 bg-gradient-to-br from-indigo-50/60 to-slate-50 dark:from-slate-900 dark:to-slate-800 relative overflow-hidden shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <div className="flex items-center space-x-2">
                  <span className="w-7 h-7 rounded-xl bg-indigo-600 text-white font-bold text-xs flex items-center justify-center shadow">
                    #{currentTargetCheckpoint.sequenceOrder}
                  </span>
                  <div>
                    <span className="text-xs font-bold text-indigo-700 dark:text-indigo-400 uppercase tracking-wider">
                      Current Target Checkpoint
                    </span>
                    <h4 className="text-lg font-bold text-black dark:text-white">{currentTargetCheckpoint.checkpointName}</h4>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <span className="font-mono text-xs font-bold px-2.5 py-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-300 shadow-2xs">
                    Tag: {currentTargetCheckpoint.code} {currentTargetCheckpoint.nfcTagId ? `| NFC: ${currentTargetCheckpoint.nfcTagId}` : ''}
                  </span>
                  {scannedCheckpointIds.includes(currentTargetCheckpoint.id) && (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                      <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Visited
                    </span>
                  )}
                </div>
              </div>

              {currentTargetCheckpoint.locationDescription && (
                <p className="text-xs text-slate-600 dark:text-slate-400 mb-3 flex items-center">
                  <MapPin className="w-3.5 h-3.5 mr-1.5 text-slate-400 shrink-0" />
                  {currentTargetCheckpoint.locationDescription}
                </p>
              )}

              {/* Distance & Geofence Live status */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                  <span className="text-xs text-slate-500 dark:text-slate-400">Live Distance:</span>
                  <span className="font-mono text-sm font-bold text-black dark:text-slate-200">
                    {distanceToTarget !== null ? `${distanceToTarget} meters` : 'Acquiring GPS...'}
                  </span>
                </div>

                <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                  <span className="text-xs text-slate-500 dark:text-slate-400">Geofence Validation:</span>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                    isWithinGeofence ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                  }`}>
                    {isWithinGeofence ? '✓ Within Perimeter' : '❌ Outside Boundary'}
                  </span>
                </div>
              </div>

              {/* Verification & Scanner action inputs */}
              <div className="space-y-3 pt-3 border-t border-indigo-100 dark:border-slate-700">
                {/* Testing & Simulation Tools bar */}
                <div className="flex flex-wrap items-center gap-1.5 p-2 bg-indigo-50/50 dark:bg-slate-800/80 rounded-xl border border-indigo-100 dark:border-slate-700">
                  <span className="text-[11px] font-bold text-indigo-700 dark:text-indigo-400 uppercase tracking-wider flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-amber-500" />
                    <span>Quick Test:</span>
                  </span>

                  <button
                    type="button"
                    onClick={() => {
                      setScanCodeInput(currentTargetCheckpoint.code);
                      handleVerifyCurrentCheckpoint(currentTargetCheckpoint, currentTargetCheckpoint.code, 'QR_SCAN');
                    }}
                    className="px-2 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-indigo-300 text-[11px] font-mono font-bold text-indigo-600 dark:text-indigo-400 shadow-2xs transition"
                  >
                    ⚡ Scan QR ({currentTargetCheckpoint.code})
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const nfc = currentTargetCheckpoint.nfcTagId || '04:A2:8B:1F:90:77';
                      setScanCodeInput(nfc);
                      handleVerifyCurrentCheckpoint(currentTargetCheckpoint, nfc, 'NFC_TAP');
                    }}
                    className="px-2 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-sky-300 text-[11px] font-mono font-bold text-sky-600 dark:text-sky-400 shadow-2xs transition"
                  >
                    ⚡ Tap NFC ({currentTargetCheckpoint.nfcTagId ? 'UID' : 'Demo'})
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const cpLat = currentTargetCheckpoint.gpsCoordinates?.latitude ?? currentTargetCheckpoint.latitude ?? siteLat ?? 19.0760;
                      const cpLng = currentTargetCheckpoint.gpsCoordinates?.longitude ?? currentTargetCheckpoint.longitude ?? siteLng ?? 72.8777;
                      setCurrentGps({ latitude: cpLat, longitude: cpLng, accuracy: 5 });
                      setStatusFeedback({ type: 'SUCCESS', message: 'Simulated GPS locked inside authorized checkpoint geofence.' });
                    }}
                    className="px-2 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 transition"
                  >
                    📍 Set Inside Geofence
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const cpLat = (currentTargetCheckpoint.gpsCoordinates?.latitude ?? currentTargetCheckpoint.latitude ?? siteLat ?? 19.0760) + 0.005;
                      const cpLng = (currentTargetCheckpoint.gpsCoordinates?.longitude ?? currentTargetCheckpoint.longitude ?? siteLng ?? 72.8777) + 0.005;
                      setCurrentGps({ latitude: cpLat, longitude: cpLng, accuracy: 15 });
                      setStatusFeedback({ type: 'WARN', message: 'Simulated GPS set 500m outside boundary to test rejection.' });
                    }}
                    className="px-2 py-1 rounded-lg bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 hover:bg-rose-100 text-[11px] font-semibold text-rose-700 dark:text-rose-300 transition"
                  >
                    📍 Set Outside Geofence (Test Breach)
                  </button>
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={scanCodeInput}
                      onChange={e => setScanCodeInput(e.target.value)}
                      placeholder={`Scan QR / NFC Tag UID (e.g. ${currentTargetCheckpoint.code})`}
                      className="w-full pl-9 pr-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-mono text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <QrCode className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsCameraScanning(true)}
                    className="flex items-center justify-center space-x-1.5 px-3 py-2.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/50 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 font-bold text-xs rounded-xl transition-all"
                    title="Scan QR Code with Camera"
                  >
                    <Camera className="w-4 h-4" />
                    <span>Scan QR</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleStartNfcScan}
                    className="flex items-center justify-center space-x-1.5 px-3 py-2.5 bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 font-bold text-xs rounded-xl transition-all"
                    title="Scan NFC Tag"
                  >
                    <Radio className="w-4 h-4" />
                    <span>{isNfcScanning ? 'Scanning...' : 'Tap NFC'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleVerifyCurrentCheckpoint(currentTargetCheckpoint, undefined, 'QR_SCAN')}
                    disabled={isSubmittingScan}
                    className="flex items-center justify-center space-x-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow transition-all disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{isSubmittingScan ? 'Verifying...' : 'Verify'}</span>
                  </button>
                </div>

                {/* Fast Action: Report Incident at this checkpoint */}
                <div className="flex items-center justify-between pt-2">
                  <input
                    type="text"
                    value={checkpointNotes}
                    onChange={e => setCheckpointNotes(e.target.value)}
                    placeholder="Optional observation notes (e.g. Gate locked, light functioning)"
                    className="w-2/3 px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />

                  {onReportIncidentAtCheckpoint && (
                    <button
                      type="button"
                      onClick={() => onReportIncidentAtCheckpoint(currentTargetCheckpoint, tour.id)}
                      className="flex items-center space-x-1 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-semibold transition-colors"
                    >
                      <FileWarning className="w-3.5 h-3.5" />
                      <span>Report Incident Here</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Checkpoint Route Carousel / Checklist */}
          <div>
            <h4 className="text-xs font-bold text-slate-900 dark:text-slate-300 uppercase tracking-wider mb-2">
              Patrol Route Sequence ({orderedCheckpoints.length} Checkpoints)
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
              {orderedCheckpoints.map((cp, idx) => {
                const isVisited = scannedCheckpointIds.includes(cp.id);
                const isCurrent = idx === activeCheckpointIndex;
                const scanData = (tour.checkpointScans || []).find((s: any) => s.checkpointId === cp.id);

                return (
                  <div
                    key={cp.id}
                    onClick={() => setActiveCheckpointIndex(idx)}
                    className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                      isCurrent
                        ? 'border-indigo-600 bg-indigo-50/80 shadow-xs'
                        : isVisited
                        ? 'border-emerald-200 bg-emerald-50/50'
                        : 'border-slate-200 bg-white hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center space-x-2">
                        <span className={`w-5 h-5 rounded-full text-xs font-bold flex items-center justify-center ${
                          isVisited ? 'bg-emerald-600 text-white' : 'bg-slate-300 text-slate-900'
                        }`}>
                          {cp.sequenceOrder}
                        </span>
                        <span className="text-xs font-bold text-black dark:text-slate-200 truncate max-w-[120px]">{cp.checkpointName}</span>
                      </div>

                      {isVisited ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      ) : (
                        <span className="text-[11px] font-mono text-slate-400">Pending</span>
                      )}
                    </div>

                    {scanData && (
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between mt-1">
                        <span>{new Date(scanData.scannedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                        <span className={scanData.geofenceStatus === 'WITHIN_GEOFENCE' ? 'text-emerald-700 font-semibold' : 'text-rose-700 font-semibold'}>
                          {scanData.geofenceStatus === 'WITHIN_GEOFENCE' ? '✓ In Geofence' : '❌ Off-site'}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Tour Finalization Remarks */}
          <div className="pt-4 border-t border-slate-200">
            <label className="block text-xs font-semibold text-slate-900 dark:text-slate-300 uppercase tracking-wider mb-1">
              Tour Conclusion Remarks / Handover Notes
            </label>
            <input
              type="text"
              value={tourRemarks}
              onChange={e => setTourRemarks(e.target.value)}
              placeholder="e.g. All gates and perimeter points secure. No security anomalies observed."
              className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-950 border border-slate-300 rounded-xl text-sm text-black dark:text-white focus:bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* Bottom Actions */}
        <div className="bg-white dark:bg-slate-950 px-6 py-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-900 dark:text-slate-300 bg-white dark:bg-slate-900 border border-slate-300 rounded-xl hover:bg-slate-100 transition-colors"
          >
            Leave Tour In Progress
          </button>

          <button
            type="button"
            onClick={handleFinishTour}
            disabled={isCompletingTour}
            className={`flex items-center space-x-2 px-6 py-2.5 text-sm font-bold text-white rounded-xl shadow-md transition-all ${
              progressPercent >= 100
                ? 'bg-emerald-600 hover:bg-emerald-700'
                : 'bg-amber-600 hover:bg-amber-700'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{isCompletingTour ? 'Finalizing Tour...' : progressPercent >= 100 ? 'Complete Patrol Tour' : 'End Tour (Incomplete)'}</span>
          </button>
        </div>
      </div>

      <QRScannerModal
        isOpen={isCameraScanning}
        onClose={() => setIsCameraScanning(false)}
        onScan={(scannedCode) => {
          setScanCodeInput(scannedCode);
          setIsCameraScanning(false);
          // If current target exists, verify immediately
          if (currentTargetCheckpoint) {
            setTimeout(() => {
              if (scannedCode.trim().toUpperCase() === currentTargetCheckpoint.code.trim().toUpperCase()) {
                handleVerifyCurrentCheckpoint(currentTargetCheckpoint);
              } else {
                setStatusFeedback({
                  type: 'ERROR',
                  message: `Scanned code "${scannedCode}" did not match expected tag "${currentTargetCheckpoint.code}".`
                });
              }
            }, 100);
          }
        }}
        title={`Scan Tag for: ${currentTargetCheckpoint?.checkpointName || 'Checkpoint'}`}
      />

      {/* NFC Manual / Quick Tag Input Modal */}
      {isNfcModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl max-w-sm w-full space-y-4 border border-slate-200 dark:border-slate-800 shadow-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Radio className="w-5 h-5 text-sky-600" />
                <h4 className="font-bold text-sm text-black dark:text-white">NFC Tag Reader</h4>
              </div>
              <button onClick={() => setIsNfcModalOpen(false)}><X className="w-4 h-4 text-slate-400" /></button>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Tap physical NFC card/tag or enter the tag UID for <strong>{currentTargetCheckpoint?.checkpointName}</strong>:
            </p>
            <input
              type="text"
              defaultValue={currentTargetCheckpoint?.nfcTagId || currentTargetCheckpoint?.code || ''}
              id="nfcTagInput"
              placeholder="e.g. 04:A2:8B:1F:90:77"
              className="w-full p-2.5 font-mono text-sm border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-black dark:text-white"
            />
            <div className="flex justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setIsNfcModalOpen(false)}
                className="px-3 py-1.5 text-xs text-slate-600 dark:text-slate-400"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const val = (document.getElementById('nfcTagInput') as HTMLInputElement)?.value || '';
                  setIsNfcModalOpen(false);
                  if (currentTargetCheckpoint && val) {
                    setScanCodeInput(val);
                    handleVerifyCurrentCheckpoint(currentTargetCheckpoint, val, 'NFC_TAP');
                  }
                }}
                className="px-4 py-1.5 text-xs font-bold text-white bg-sky-600 hover:bg-sky-700 rounded-xl shadow"
              >
                Verify NFC Tag
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
