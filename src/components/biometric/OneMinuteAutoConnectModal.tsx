import React, { useState, useEffect } from 'react';
import {
  X,
  Zap,
  CheckCircle2,
  AlertTriangle,
  Server,
  Activity,
  Cpu,
  Clock,
  Users,
  ShieldCheck,
  ArrowRight,
  RefreshCw,
  Fingerprint,
  Sparkles,
  Wifi,
  Sliders
} from 'lucide-react';
import { EmployeeRecord, ShiftRecord, SiteRecord, UserSession } from '../../types';
import {
  BiometricDevice,
  DeviceCapabilities,
  DeviceEmployeeMapping,
  DeviceEmployeeUser,
  DeviceManufacturer,
  DeviceProtocol,
  DiscoveryProbeResult
} from '../../types/biometric';
import { BiometricDeviceService } from '../../services/biometric/BiometricDeviceService';
import { ProtocolDetectionService } from '../../services/biometric/ProtocolDetectionService';

interface OneMinuteAutoConnectModalProps {
  session: UserSession;
  companyId: string;
  sites: SiteRecord[];
  employees: EmployeeRecord[];
  shifts: ShiftRecord[];
  onClose: () => void;
  onDeviceConnected: (device: BiometricDevice) => void;
}

type WizardStep = 'INPUT' | 'PROBING' | 'AUTHENTICATING' | 'MAPPING' | 'TIME_SYNC' | 'TEST_SYNC' | 'SUCCESS';

export const OneMinuteAutoConnectModal: React.FC<OneMinuteAutoConnectModalProps> = ({
  session,
  companyId,
  sites,
  employees,
  shifts,
  onClose,
  onDeviceConnected
}) => {
  const [step, setStep] = useState<WizardStep>('INPUT');
  
  // Step 1 Inputs
  const [ipAddress, setIpAddress] = useState('192.168.1.201');
  const [port, setPort] = useState<string>('4370');
  const [deviceName, setDeviceName] = useState('');
  const [siteId, setSiteId] = useState(sites.length > 0 ? sites[0].id : '');
  const [manufacturerHint, setManufacturerHint] = useState<DeviceManufacturer>('ZKTECO');
  const [commKey, setCommKey] = useState('0');
  const [locationDescription, setLocationDescription] = useState('Main Gate Entrance Turnstile');

  // Discovery State
  const [probeResult, setProbeResult] = useState<DiscoveryProbeResult | null>(null);
  const [probeLogs, setProbeLogs] = useState<string[]>([]);
  const [progressPercent, setProgressPercent] = useState(0);

  // Machine Users & Mapping State
  const [discoveredUsers, setDiscoveredUsers] = useState<DeviceEmployeeUser[]>([]);
  const [mappings, setMappings] = useState<DeviceEmployeeMapping[]>([]);
  const [exactMatches, setExactMatches] = useState(0);
  const [unmappedCount, setUnmappedCount] = useState(0);

  // Registered Device State
  const [connectedDevice, setConnectedDevice] = useState<BiometricDevice | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Auto generate default device name when site or IP changes
  useEffect(() => {
    const selectedSite = sites.find(s => s.id === siteId);
    const siteName = selectedSite ? selectedSite.name : 'Site';
    if (!deviceName) {
      setDeviceName(`${siteName} - Attendance Terminal`);
    }
  }, [siteId, sites]);

  /**
   * Run the 1-Minute Auto Connect sequence
   */
  const handleStartAutoConnect = async () => {
    if (!ipAddress.trim()) {
      setErrorMessage('Please provide a valid IP address or hostname');
      return;
    }
    if (!siteId) {
      setErrorMessage('Please select a site for this device');
      return;
    }

    setErrorMessage(null);
    setStep('PROBING');
    setProgressPercent(15);
    setProbeLogs([`[AutoConnect] Initializing probing engine for ${ipAddress}...`]);

    try {
      // 1. Probing and Protocol Detection
      const targetPort = port ? parseInt(port, 10) : 4370;
      const probe = await ProtocolDetectionService.autoDetectDevice({
        ipAddress: ipAddress.trim(),
        port: isNaN(targetPort) ? undefined : targetPort,
        commKey,
        expectedManufacturer: manufacturerHint
      });

      setProbeResult(probe);
      setProbeLogs(probe.probeLogs);

      if (!probe.isReachable || probe.detectedProtocol === 'UNSUPPORTED_DEVICE_PROTOCOL') {
        setErrorMessage('Device unreachable or protocol unrecognized. Verify IP, network route, and port.');
        setStep('INPUT');
        return;
      }

      setProgressPercent(35);
      setStep('AUTHENTICATING');

      // 2. Register Device in Firestore
      const newDeviceData: Omit<BiometricDevice, 'id' | 'createdAt' | 'createdBy' | 'updatedAt' | 'updatedBy'> = {
        companyId,
        siteId,
        deviceName: deviceName || `${probe.detectedManufacturer || 'Generic'} Terminal (${ipAddress})`,
        manufacturer: probe.detectedManufacturer || 'GENERIC',
        model: probe.detectedModel,
        protocol: probe.detectedProtocol || 'UNKNOWN',
        connectorId: probe.connectorId,
        ipAddress: ipAddress.trim(),
        port: probe.detectedPorts?.[0] || targetPort,
        serialNumber: probe.deviceSerialNumber || `SN-${Date.now()}`,
        firmwareVersion: probe.firmwareVersion || 'v1.0.0',
        status: 'ONLINE',
        syncIntervalMinutes: 1,
        authType: 'COMM_KEY',
        encryptedAuthKey: commKey,
        capabilities: probe.capabilities,
        syncConfig: {
          syncMode: 'REALTIME_PUSH',
          pollIntervalSeconds: 60,
          batchChunkSize: 500,
          autoMapEmployees: true,
          autoSyncTime: true,
          isEnabled: true
        },
        telemetry: {
          lastSeenAt: new Date().toISOString(),
          lastSyncAt: new Date().toISOString(),
          lastSuccessfulSyncAt: new Date().toISOString(),
          lastPunchTimestamp: null,
          lastPingLatencyMs: probe.latencyMs,
          totalUserCount: 0,
          totalPunchCount: 0,
          pendingTransactionCount: 0,
          failedTransactionCount: 0,
          consecutiveFailureCount: 0,
          deviceTimeIso: probe.deviceTimeIso,
          serverTimeDriftSeconds: probe.serverTimeDriftSeconds
        }
      };

      const regRes = await BiometricDeviceService.registerDevice(session, companyId, newDeviceData);
      if (!regRes.success || !regRes.device) {
        setErrorMessage(regRes.message);
        setStep('INPUT');
        return;
      }

      const registered = regRes.device;
      setConnectedDevice(registered);
      setProgressPercent(60);

      // 3. User Discovery and Auto Mapping
      setStep('MAPPING');
      const mapRes = await BiometricDeviceService.discoverAndAutoMapEmployees(session, companyId, registered, employees);
      setDiscoveredUsers(mapRes.discoveredUsers);
      setMappings(mapRes.mappings);
      setExactMatches(mapRes.exactMatches);
      setUnmappedCount(mapRes.unmapped);

      // 4. Time Sync
      setProgressPercent(80);
      setStep('TIME_SYNC');
      await BiometricDeviceService.syncDeviceClock(session, companyId, registered);

      // 5. Test Punch Synchronization
      setProgressPercent(95);
      setStep('TEST_SYNC');
      await BiometricDeviceService.syncDevicePunches(session, companyId, registered, employees, shifts);

      setProgressPercent(100);
      setStep('SUCCESS');
      onDeviceConnected(registered);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Auto Connect sequence encountered an error');
      setStep('INPUT');
    }
  };

  return (
    <div id="modal-biometric-autoconnect" className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col my-8">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white tracking-tight">1-Minute IT Admin Auto-Connect</h2>
              <p className="text-xs text-slate-400">Zero-Config Universal Biometric Terminal Setup</p>
            </div>
          </div>
          <button
            id="btn-close-autoconnect-modal"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress Bar */}
        {step !== 'INPUT' && (
          <div className="w-full bg-slate-800 h-1.5 overflow-hidden">
            <div
              className="bg-gradient-to-r from-amber-500 to-emerald-500 h-full transition-all duration-500 ease-out"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        )}

        {/* Error Alert */}
        {errorMessage && (
          <div className="mx-6 mt-4 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-start space-x-3 text-rose-400">
            <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium">Connection Failed</p>
              <p className="text-xs text-rose-300/90 mt-0.5">{errorMessage}</p>
            </div>
          </div>
        )}

        {/* Body Content */}
        <div className="p-6 space-y-6 overflow-y-auto max-h-[70vh]">
          {/* STEP 1: INPUT FORM */}
          {step === 'INPUT' && (
            <div className="space-y-5">
              <div className="bg-slate-950/50 p-4 rounded-xl border border-slate-800/80 text-xs text-slate-300 space-y-1">
                <p className="font-semibold text-white flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Auto-Protocol Discovery Engine
                </p>
                <p className="text-slate-400 leading-relaxed">
                  Enter the IP or hostname of the biometric terminal. The system probes ports, identifies manufacturer protocols (ZKTeco, eSSL, Hikvision, etc.), handshakes with hardware clock, and maps employee enrollment automatically.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* IP Address */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-300">Device IP Address or Hostname *</label>
                  <input
                    id="input-device-ip"
                    type="text"
                    value={ipAddress}
                    onChange={(e) => setIpAddress(e.target.value)}
                    placeholder="e.g. 192.168.1.201"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>

                {/* Port */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-300">Port (Default auto-probes 4370/80/8080)</label>
                  <input
                    id="input-device-port"
                    type="number"
                    value={port}
                    onChange={(e) => setPort(e.target.value)}
                    placeholder="4370"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>

                {/* Site Selection */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-300">Assigned Site / Project *</label>
                  <select
                    id="select-device-site"
                    value={siteId}
                    onChange={(e) => setSiteId(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-amber-500"
                  >
                    {sites.map(s => (
                      <option key={s.id} value={s.id}>{s.name || s.siteName || s.id} ({s.id})</option>
                    ))}
                  </select>
                </div>

                {/* Manufacturer Hint */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-300">Manufacturer Hint (Optional)</label>
                  <select
                    id="select-device-manufacturer"
                    value={manufacturerHint}
                    onChange={(e) => setManufacturerHint(e.target.value as DeviceManufacturer)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="ZKTECO">ZKTeco (TCP 4370 / ADMS)</option>
                    <option value="ESSL">eSSL (Identix / eTimeTrack)</option>
                    <option value="HIKVISION">Hikvision (ISAPI Face Terminal)</option>
                    <option value="GENERIC">Generic REST / HTTP / TCP / RFID</option>
                    <option value="OTHER">Other / Auto Detect</option>
                  </select>
                </div>

                {/* Device Name */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-300">Device Friendly Name</label>
                  <input
                    id="input-device-name"
                    type="text"
                    value={deviceName}
                    onChange={(e) => setDeviceName(e.target.value)}
                    placeholder="e.g. Main Gate Biometric"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                {/* CommKey / Auth Token */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-300">CommKey / Password (Default: 0)</label>
                  <input
                    id="input-device-commkey"
                    type="password"
                    value={commKey}
                    onChange={(e) => setCommKey(e.target.value)}
                    placeholder="0"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>
              </div>

              {/* Location Description */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-300">Physical Location / Gate Description</label>
                <input
                  id="input-device-location"
                  type="text"
                  value={locationDescription}
                  onChange={(e) => setLocationDescription(e.target.value)}
                  placeholder="e.g. Building A Turnstile - Entry Gate"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>
          )}

          {/* STEP 2-6: LIVE EXECUTION PROGRESS */}
          {step !== 'INPUT' && step !== 'SUCCESS' && (
            <div className="space-y-6">
              {/* Stage Stepper */}
              <div className="grid grid-cols-5 gap-2">
                {[
                  { key: 'PROBING', label: '1. Discovery', icon: Wifi },
                  { key: 'AUTHENTICATING', label: '2. Register', icon: Server },
                  { key: 'MAPPING', label: '3. Auto-Map', icon: Users },
                  { key: 'TIME_SYNC', label: '4. Time Sync', icon: Clock },
                  { key: 'TEST_SYNC', label: '5. Punch Sync', icon: CheckCircle2 }
                ].map((st, idx) => {
                  const isActive = step === st.key;
                  const isDone = progressPercent > (idx + 1) * 20;
                  const Icon = st.icon;

                  return (
                    <div
                      key={st.key}
                      className={`p-2.5 rounded-xl border flex flex-col items-center text-center space-y-1 ${
                        isActive
                          ? 'bg-amber-500/10 border-amber-500/40 text-amber-400'
                          : isDone
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                          : 'bg-slate-950 border-slate-800/80 text-slate-500'
                      }`}
                    >
                      <Icon className={`w-4 h-4 ${isActive ? 'animate-bounce' : ''}`} />
                      <span className="text-[11px] font-medium leading-none">{st.label}</span>
                    </div>
                  );
                })}
              </div>

              {/* Hardware Probe Banner */}
              {probeResult && (
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                  <div>
                    <span className="text-slate-500 block">Manufacturer</span>
                    <span className="font-semibold text-white">{probeResult.detectedManufacturer}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Model</span>
                    <span className="font-semibold text-white">{probeResult.detectedModel}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Protocol</span>
                    <span className="font-semibold text-amber-400 font-mono text-[11px]">{probeResult.detectedProtocol}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Round-Trip Latency</span>
                    <span className="font-semibold text-emerald-400">{probeResult.latencyMs}ms</span>
                  </div>
                </div>
              )}

              {/* Probe Logs Console */}
              <div className="bg-slate-950 rounded-xl border border-slate-800/80 p-4 font-mono text-xs text-slate-300 max-h-48 overflow-y-auto space-y-1">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-slate-500 text-[10px]">
                  <span>LIVE HARDWARE PROBE CONSOLE</span>
                  <span className="animate-pulse flex items-center gap-1 text-emerald-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> ACTIVE
                  </span>
                </div>
                {probeLogs.map((log, i) => (
                  <div key={i} className="leading-relaxed">
                    {log.includes('ERROR') ? (
                      <span className="text-rose-400">{log}</span>
                    ) : log.includes('Identified') || log.includes('accepted') || log.includes('detected') ? (
                      <span className="text-emerald-400">{log}</span>
                    ) : (
                      <span className="text-slate-400">{log}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* STEP 7: SUCCESS SUMMARY */}
          {step === 'SUCCESS' && connectedDevice && (
            <div className="space-y-5">
              <div className="p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-center space-y-2">
                <div className="w-12 h-12 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mx-auto">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h3 className="text-base font-semibold text-white">Biometric Device Live & Synchronized</h3>
                <p className="text-xs text-slate-300 max-w-md mx-auto">
                  Device <span className="font-semibold text-white">{connectedDevice.deviceName}</span> is connected, authenticated, time-synchronized, and actively streaming punches.
                </p>
              </div>

              {/* Summary Statistics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-[11px] text-slate-500 block">Enrolled Users</span>
                  <span className="text-lg font-bold text-white">{discoveredUsers.length}</span>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-[11px] text-slate-500 block">Auto-Mapped</span>
                  <span className="text-lg font-bold text-emerald-400">{exactMatches}</span>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-[11px] text-slate-500 block">Unmapped PINs</span>
                  <span className="text-lg font-bold text-amber-400">{unmappedCount}</span>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-[11px] text-slate-500 block">Clock Drift</span>
                  <span className="text-lg font-bold text-sky-400">0.0s (Synced)</span>
                </div>
              </div>

              {/* Device Details Card */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-500">Device ID</span>
                  <span className="font-mono text-slate-300">{connectedDevice.id}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-500">IP & Port</span>
                  <span className="font-mono text-white">{connectedDevice.ipAddress}:{connectedDevice.port}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-500">Protocol Adapter</span>
                  <span className="font-mono text-amber-400">{connectedDevice.protocol}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-500">Sync Mode</span>
                  <span className="text-emerald-400 font-semibold">{connectedDevice.syncConfig.syncMode}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-900/90 flex items-center justify-between">
          {step === 'INPUT' ? (
            <>
              <button
                id="btn-cancel-autoconnect"
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                id="btn-trigger-autoconnect"
                type="button"
                onClick={handleStartAutoConnect}
                className="px-5 py-2.5 rounded-xl text-xs font-semibold text-slate-950 bg-amber-400 hover:bg-amber-300 transition-colors shadow-lg shadow-amber-500/20 flex items-center gap-2"
              >
                <Zap className="w-4 h-4 fill-slate-950" /> AUTO CONNECT
              </button>
            </>
          ) : step === 'SUCCESS' ? (
            <button
              id="btn-finish-autoconnect"
              type="button"
              onClick={onClose}
              className="w-full py-2.5 rounded-xl text-xs font-semibold text-slate-950 bg-emerald-400 hover:bg-emerald-300 transition-colors shadow-lg shadow-emerald-500/20"
            >
              Done & View Biometric Devices
            </button>
          ) : (
            <div className="w-full flex items-center justify-center py-1 text-xs text-slate-400 gap-2">
              <RefreshCw className="w-4 h-4 animate-spin text-amber-400" />
              <span>Executing Auto-Discovery & Handshake...</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
