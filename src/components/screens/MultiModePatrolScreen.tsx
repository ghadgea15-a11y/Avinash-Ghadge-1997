import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  MapPin, 
  QrCode, 
  Radio, 
  CheckCircle2, 
  AlertTriangle, 
  RefreshCw, 
  Wifi, 
  WifiOff, 
  Lock, 
  Plus, 
  Clock, 
  Search, 
  Smartphone,
  Eye
} from 'lucide-react';
import { UserSession, CompanyTenant } from '../../types';
import { MultiModeCheckpoint, OfflinePatrolScanRecord } from '../../types/multiModePatrol';
import { PatrolVerificationService } from '../../services/patrolVerificationService';

interface MultiModePatrolScreenProps {
  userSession: UserSession;
  activeCompany: CompanyTenant;
  isOnline?: boolean;
}

export const MultiModePatrolScreen: React.FC<MultiModePatrolScreenProps> = ({
  userSession,
  activeCompany,
  isOnline = true
}) => {
  const companyId = activeCompany.companyId;
  const [checkpoints, setCheckpoints] = useState<MultiModeCheckpoint[]>([]);
  const [scans, setScans] = useState<OfflinePatrolScanRecord[]>([]);
  const [selectedCheckpoint, setSelectedCheckpoint] = useState<MultiModeCheckpoint | null>(null);
  const [scanningMethod, setScanningMethod] = useState<'gps' | 'qr' | 'nfc'>('nfc');
  const [isSimulatingScan, setIsSimulatingScan] = useState(false);
  const [scanResult, setScanResult] = useState<{ success: boolean; message: string; record?: OfflinePatrolScanRecord } | null>(null);

  // Scan simulation inputs
  const [simulatedTagUid, setSimulatedTagUid] = useState('04:A2:8B:1F:90:77');
  const [simulatedQrCode, setSimulatedQrCode] = useState('QR_EAST_FENCE_12_SEC');
  const [simulatedLatitude, setSimulatedLatitude] = useState(19.0760);
  const [simulatedLongitude, setSimulatedLongitude] = useState(72.8777);

  const loadData = () => {
    const cpList = PatrolVerificationService.getCheckpoints(companyId, userSession.assignedSiteId || 'SITE-01');
    setCheckpoints(cpList);
    if (cpList.length > 0 && !selectedCheckpoint) {
      setSelectedCheckpoint(cpList[0]);
    }
    const q = PatrolVerificationService.getOfflineQueue();
    setScans(q);
  };

  useEffect(() => {
    loadData();
  }, [companyId]);

  const handleExecuteScan = async () => {
    if (!selectedCheckpoint) return;
    setIsSimulatingScan(true);
    setScanResult(null);

    try {
      const res = await PatrolVerificationService.recordScan({
        checkpoint: selectedCheckpoint,
        guardId: userSession.employeeId || userSession.userId,
        guardName: userSession.fullName || 'Active Guard',
        currentGps: {
          latitude: simulatedLatitude,
          longitude: simulatedLongitude,
          accuracy: 8
        },
        scannedNfcTagId: scanningMethod === 'nfc' ? simulatedTagUid : undefined,
        scannedQrCode: scanningMethod === 'qr' ? simulatedQrCode : undefined
      });

      if (res.success) {
        setScanResult({
          success: true,
          message: `Checkpoint Verified: Cryptographic signature generated & queued for sync.`,
          record: res.record
        });
      } else {
        setScanResult({
          success: false,
          message: res.reason || 'Verification Failed: Checkpoint mismatch detected.'
        });
      }

      loadData();
    } catch (err: any) {
      setScanResult({
        success: false,
        message: err.message || 'Error executing scan'
      });
    } finally {
      setIsSimulatingScan(false);
    }
  };

  const handleSyncQueue = async () => {
    const res = await PatrolVerificationService.syncQueue(companyId);
    alert(`Patrol Queue Sync Complete: ${res.syncedCount} scans synced, ${res.failedCount} failures flagged.`);
    loadData();
  };

  return (
    <div id="multimode-patrol-screen" className="flex-1 flex flex-col h-full bg-slate-50 dark:bg-slate-900 overflow-y-auto">
      {/* Top Header */}
      <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-6 py-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 text-xs font-bold uppercase tracking-wider bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 rounded">
                Module 3 Parity
              </span>
              <span className="text-xs text-slate-500">
                TrackTik / Silvertrac Parity
              </span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white mt-1 flex items-center gap-2">
              <ShieldCheck className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
              <span>Multi-Mode Patrol Verification (GPS + QR + NFC)</span>
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Hardware NFC UID verification, dynamic QR tokens & GPS geofencing with cryptographic HMAC proof-of-presence.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${
              isOnline ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300' : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
            }`}>
              {isOnline ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
              {isOnline ? 'Online - Live Cloud Sync' : 'Offline Mode - Queue Active'}
            </span>

            <button
              onClick={handleSyncQueue}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Sync Queue
            </button>
          </div>
        </div>
      </div>

      <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Registered Checkpoints */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-900 dark:text-white text-base">
              Registered Checkpoints ({checkpoints.length})
            </h3>
            <span className="text-xs text-slate-500">Site: {userSession.assignedSiteId || 'SITE-01'}</span>
          </div>

          <div className="space-y-3">
            {checkpoints.map(cp => (
              <div
                key={cp.checkpointId}
                onClick={() => {
                  setSelectedCheckpoint(cp);
                  setScanningMethod(cp.verificationMethod);
                  if (cp.nfcTagId) setSimulatedTagUid(cp.nfcTagId);
                  if (cp.qrCodeValue) setSimulatedQrCode(cp.qrCodeValue);
                  if (cp.gpsLatitude) setSimulatedLatitude(cp.gpsLatitude);
                  if (cp.gpsLongitude) setSimulatedLongitude(cp.gpsLongitude);
                }}
                className={`p-3 rounded-lg border cursor-pointer transition-all ${
                  selectedCheckpoint?.checkpointId === cp.checkpointId
                    ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30 ring-1 ring-emerald-500'
                    : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-sm text-slate-900 dark:text-white">
                    {cp.name}
                  </span>
                  <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${
                    cp.verificationMethod === 'nfc' ? 'bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300' :
                    cp.verificationMethod === 'qr' ? 'bg-cyan-100 text-cyan-700 dark:bg-cyan-950/60 dark:text-cyan-300' :
                    'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                  }`}>
                    {cp.verificationMethod === 'nfc' && <Radio className="w-3 h-3" />}
                    {cp.verificationMethod === 'qr' && <QrCode className="w-3 h-3" />}
                    {cp.verificationMethod === 'gps' && <MapPin className="w-3 h-3" />}
                    {cp.verificationMethod}
                  </span>
                </div>
                <p className="text-xs text-slate-500 line-clamp-1">{cp.locationDescription}</p>
                <div className="mt-2 text-[11px] font-mono text-slate-400 flex items-center justify-between">
                  <span>GPS Tol: ±{cp.gpsToleranceMeters}m</span>
                  <span>Order #{cp.sequenceOrder}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Center Column: Live Scan Runner & Device Simulation */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-3">
            <h3 className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2">
              <Smartphone className="w-5 h-5 text-emerald-600" />
              <span>Patrol Verification Runner</span>
            </h3>
            <span className="text-xs font-mono text-slate-500">Offline-Capable</span>
          </div>

          {selectedCheckpoint ? (
            <div className="space-y-4">
              <div className="bg-slate-50 dark:bg-slate-900/60 p-3.5 rounded-lg border border-slate-200 dark:border-slate-700">
                <span className="text-xs font-semibold text-slate-400 uppercase">Target Checkpoint:</span>
                <div className="text-base font-bold text-slate-900 dark:text-white mt-0.5">
                  {selectedCheckpoint.name}
                </div>
                <div className="text-xs text-slate-600 dark:text-slate-300 mt-1">
                  {selectedCheckpoint.mandatoryInstructions}
                </div>
              </div>

              {/* Verification Method Toggle */}
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase block mb-1.5">
                  Scan Method
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => setScanningMethod('nfc')}
                    className={`p-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 border transition-colors ${
                      scanningMethod === 'nfc'
                        ? 'bg-purple-600 text-white border-purple-600'
                        : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-600'
                    }`}
                  >
                    <Radio className="w-3.5 h-3.5" />
                    Hardware NFC
                  </button>
                  <button
                    onClick={() => setScanningMethod('qr')}
                    className={`p-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 border transition-colors ${
                      scanningMethod === 'qr'
                        ? 'bg-cyan-600 text-white border-cyan-600'
                        : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-600'
                    }`}
                  >
                    <QrCode className="w-3.5 h-3.5" />
                    QR Token
                  </button>
                  <button
                    onClick={() => setScanningMethod('gps')}
                    className={`p-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 border transition-colors ${
                      scanningMethod === 'gps'
                        ? 'bg-amber-600 text-white border-amber-600'
                        : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-600'
                    }`}
                  >
                    <MapPin className="w-3.5 h-3.5" />
                    Geofence GPS
                  </button>
                </div>
              </div>

              {/* Simulation inputs */}
              {scanningMethod === 'nfc' && (
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase block mb-1">
                    NFC Hardware Serial UID (ISO 14443A)
                  </label>
                  <input
                    type="text"
                    value={simulatedTagUid}
                    onChange={(e) => setSimulatedTagUid(e.target.value)}
                    className="w-full text-xs font-mono px-3 py-2 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    Expected: {selectedCheckpoint.nfcTagId || 'None registered'}
                  </span>
                </div>
              )}

              {scanningMethod === 'qr' && (
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase block mb-1">
                    Scanned QR Code Payload
                  </label>
                  <input
                    type="text"
                    value={simulatedQrCode}
                    onChange={(e) => setSimulatedQrCode(e.target.value)}
                    className="w-full text-xs font-mono px-3 py-2 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    Expected: {selectedCheckpoint.qrCodeValue || 'None registered'}
                  </span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-semibold text-slate-500 uppercase block mb-1">
                    Current Device Lat
                  </label>
                  <input
                    type="number"
                    step="0.0001"
                    value={simulatedLatitude}
                    onChange={(e) => setSimulatedLatitude(parseFloat(e.target.value))}
                    className="w-full text-xs font-mono px-2 py-1.5 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-500 uppercase block mb-1">
                    Current Device Lon
                  </label>
                  <input
                    type="number"
                    step="0.0001"
                    value={simulatedLongitude}
                    onChange={(e) => setSimulatedLongitude(parseFloat(e.target.value))}
                    className="w-full text-xs font-mono px-2 py-1.5 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded"
                  />
                </div>
              </div>

              {/* Execute Scan Button */}
              <button
                onClick={handleExecuteScan}
                disabled={isSimulatingScan}
                className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-lg shadow-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{isSimulatingScan ? 'Verifying Hardware Token...' : 'Perform Checkpoint Scan'}</span>
              </button>

              {/* Scan Feedback Banner */}
              {scanResult && (
                <div className={`p-3 rounded-lg border text-xs ${
                  scanResult.success
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
                    : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200'
                }`}>
                  <div className="font-bold mb-1 flex items-center gap-1.5">
                    {scanResult.success ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertTriangle className="w-4 h-4 text-rose-600" />}
                    <span>{scanResult.success ? 'Scan Verified & Cryptographically Signed' : 'Verification Denied'}</span>
                  </div>
                  <p>{scanResult.message}</p>
                  {scanResult.record && (
                    <div className="mt-2 pt-2 border-t border-emerald-200 dark:border-emerald-800 font-mono text-[10px] space-y-0.5">
                      <div>HMAC Sig: {scanResult.record.signature.substring(0, 24)}...</div>
                      <div>Status: {scanResult.record.status} | Queue: {scanResult.record.syncState}</div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-slate-400 text-sm">
              Select a checkpoint from the left panel to scan.
            </div>
          )}
        </div>

        {/* Right Column: Offline Scan Queue & Verification Stream */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-900 dark:text-white text-base">
              Offline Scan Queue ({scans.length})
            </h3>
            <span className="text-xs text-slate-500">Local Cache</span>
          </div>

          <div className="space-y-2.5 max-h-[500px] overflow-y-auto">
            {scans.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-xs">
                No scans recorded yet. Perform a scan to view cryptographic proof-of-presence.
              </div>
            ) : (
              scans.map(scan => (
                <div
                  key={scan.scanId}
                  className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-700 text-xs"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-slate-900 dark:text-white">
                      {scan.checkpointName}
                    </span>
                    <span className={`px-1.5 py-0.5 text-[10px] font-bold rounded ${
                      scan.status === 'VERIFIED' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300' :
                      'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                    }`}>
                      {scan.status}
                    </span>
                  </div>

                  <div className="text-slate-500 text-[11px] flex items-center justify-between">
                    <span>Guard: {scan.guardName}</span>
                    <span className="font-mono">{new Date(scan.deviceTimestamp).toLocaleTimeString()}</span>
                  </div>

                  <div className="mt-1.5 pt-1.5 border-t border-slate-200 dark:border-slate-750 flex items-center justify-between text-[10px] font-mono text-slate-400">
                    <span>Mode: {scan.verificationMethod.toUpperCase()}</span>
                    <span className={`font-semibold ${scan.syncState === 'SYNCED' ? 'text-emerald-500' : 'text-amber-500'}`}>
                      {scan.syncState}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
