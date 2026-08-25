import React, { useState } from 'react';
import {
  Activity,
  AlertCircle,
  CheckCircle2,
  Clock,
  Cpu,
  Fingerprint,
  MoreVertical,
  RefreshCw,
  Server,
  Settings,
  Trash2,
  Users,
  Wifi,
  WifiOff,
  Zap
} from 'lucide-react';
import { BiometricDevice, DeviceStatus } from '../../types/biometric';
import { EmployeeRecord, ShiftRecord, SiteRecord, UserSession } from '../../types';
import { BiometricDeviceService } from '../../services/biometric/BiometricDeviceService';

interface DeviceListCardProps {
  device: BiometricDevice;
  session: UserSession;
  companyId: string;
  site?: SiteRecord;
  employees: EmployeeRecord[];
  shifts: ShiftRecord[];
  onOpenMappings: (device: BiometricDevice) => void;
  onRefresh: () => void;
}

export const DeviceListCard: React.FC<DeviceListCardProps> = ({
  device,
  session,
  companyId,
  site,
  employees,
  shifts,
  onOpenMappings,
  onRefresh
}) => {
  const [testing, setTesting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncingClock, setSyncingClock] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  const getStatusBadge = (status: DeviceStatus) => {
    switch (status) {
      case 'ONLINE':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span> ONLINE
          </span>
        );
      case 'OFFLINE':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span> OFFLINE
          </span>
        );
      case 'SYNC_ERROR':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <AlertCircle className="w-3 h-3" /> SYNC ERROR
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-800 text-slate-400">
            {status}
          </span>
        );
    }
  };

  const handleQuickTest = async () => {
    setTesting(true);
    setActionFeedback(null);
    try {
      const res = await BiometricDeviceService.testDeviceConnection(companyId, device);
      setActionFeedback(res.success ? `Live Ping OK (${res.latencyMs}ms)` : `Ping Failed: ${res.message}`);
      onRefresh();
    } catch (err: any) {
      setActionFeedback('Test error');
    } finally {
      setTesting(false);
    }
  };

  const handleManualSync = async () => {
    setSyncing(true);
    setActionFeedback(null);
    try {
      const res = await BiometricDeviceService.syncDevicePunches(session, companyId, device, employees, shifts);
      setActionFeedback(`Sync: ${res.newAttendanceRecordsCreated} new punches processed`);
      onRefresh();
    } catch (err: any) {
      setActionFeedback('Sync failed');
    } finally {
      setSyncing(false);
    }
  };

  const handleSyncClock = async () => {
    setSyncingClock(true);
    setActionFeedback(null);
    try {
      const res = await BiometricDeviceService.syncDeviceClock(session, companyId, device);
      setActionFeedback(res.success ? `Clock Synced (Drift ${res.driftSeconds}s)` : 'Clock Sync Failed');
      onRefresh();
    } catch (err: any) {
      setActionFeedback('Time sync failed');
    } finally {
      setSyncingClock(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Are you sure you want to remove biometric device "${device.deviceName}"?`)) {
      return;
    }
    await BiometricDeviceService.deleteDevice(session, companyId, device.id, device.siteId);
    onRefresh();
  };

  return (
    <div id={`device-card-${device.id}`} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4 hover:border-slate-700/80 transition-all">
      {/* Top Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-11 h-11 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center text-amber-400">
            {device.manufacturer === 'HIKVISION' ? (
              <Zap className="w-5 h-5" />
            ) : device.capabilities.supportsFace ? (
              <Users className="w-5 h-5" />
            ) : (
              <Fingerprint className="w-5 h-5" />
            )}
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-sm font-semibold text-white tracking-tight">{device.deviceName}</h3>
              {getStatusBadge(device.status)}
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {site?.name || `Site ID: ${device.siteId}`} • <span className="font-mono text-slate-300">{device.ipAddress}:{device.port}</span>
            </p>
          </div>
        </div>

        <button
          id={`btn-delete-device-${device.id}`}
          onClick={handleDelete}
          className="text-slate-500 hover:text-rose-400 p-1.5 rounded-lg hover:bg-slate-800/80 transition-colors"
          title="Remove Device"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Hardware Details Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 rounded-xl bg-slate-950/60 border border-slate-800/60 text-xs">
        <div>
          <span className="text-[11px] text-slate-500 block">Manufacturer</span>
          <span className="font-semibold text-slate-200">{device.manufacturer}</span>
        </div>
        <div>
          <span className="text-[11px] text-slate-500 block">Model</span>
          <span className="font-semibold text-slate-200 truncate block">{device.model || 'Universal'}</span>
        </div>
        <div>
          <span className="text-[11px] text-slate-500 block">Protocol</span>
          <span className="font-mono text-amber-400 text-[10.5px] truncate block">{device.protocol}</span>
        </div>
        <div>
          <span className="text-[11px] text-slate-500 block">Round-Trip Ping</span>
          <span className="font-semibold text-emerald-400">{device.telemetry?.lastPingLatencyMs || 25}ms</span>
        </div>
      </div>

      {/* Sync Telemetry */}
      <div className="flex items-center justify-between text-xs text-slate-400 pt-1 border-t border-slate-800/50">
        <div className="flex items-center space-x-1.5">
          <Clock className="w-3.5 h-3.5 text-slate-500" />
          <span>Last Sync: {device.telemetry?.lastSuccessfulSyncAt ? new Date(device.telemetry.lastSuccessfulSyncAt).toLocaleTimeString() : 'Never'}</span>
        </div>
        <div className="flex items-center space-x-1.5">
          <Activity className="w-3.5 h-3.5 text-slate-500" />
          <span>Total Punches: <strong className="text-white font-mono">{device.telemetry?.totalPunchCount || 0}</strong></span>
        </div>
      </div>

      {/* Action Feedback Banner */}
      {actionFeedback && (
        <div className="text-[11px] p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 font-medium">
          {actionFeedback}
        </div>
      )}

      {/* Action Buttons */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
        <button
          id={`btn-ping-${device.id}`}
          onClick={handleQuickTest}
          disabled={testing}
          className="px-2.5 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-white transition-colors flex items-center justify-center gap-1.5"
        >
          <Wifi className={`w-3.5 h-3.5 ${testing ? 'animate-pulse text-amber-400' : ''}`} />
          {testing ? 'Testing...' : 'Test Ping'}
        </button>

        <button
          id={`btn-sync-clock-${device.id}`}
          onClick={handleSyncClock}
          disabled={syncingClock}
          className="px-2.5 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-white transition-colors flex items-center justify-center gap-1.5"
        >
          <Clock className={`w-3.5 h-3.5 ${syncingClock ? 'animate-spin text-sky-400' : ''}`} />
          {syncingClock ? 'Syncing...' : 'Sync Time'}
        </button>

        <button
          id={`btn-sync-punches-${device.id}`}
          onClick={handleManualSync}
          disabled={syncing}
          className="px-2.5 py-2 rounded-xl text-xs font-semibold bg-amber-400 hover:bg-amber-300 text-slate-950 transition-colors flex items-center justify-center gap-1.5"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
          {syncing ? 'Pulling...' : 'Sync Now'}
        </button>

        <button
          id={`btn-mappings-${device.id}`}
          onClick={() => onOpenMappings(device)}
          className="px-2.5 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-sky-400 transition-colors flex items-center justify-center gap-1.5"
        >
          <Users className="w-3.5 h-3.5" />
          Map Users
        </button>
      </div>
    </div>
  );
};
