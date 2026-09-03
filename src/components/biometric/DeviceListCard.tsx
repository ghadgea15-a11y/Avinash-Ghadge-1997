import React, { useState } from 'react';
import { 
  Activity, 
  Clock, 
  Cpu, 
  Fingerprint, 
  RefreshCw, 
  Server, 
  ShieldCheck, 
  Trash2, 
  Wifi, 
  WifiOff, 
  Zap,
  MoreVertical,
  ChevronRight,
  Database,
  History,
  Users
} from 'lucide-react';
import { EmployeeRecord, ShiftRecord, SiteRecord, UserSession } from '../../types';
import { BiometricDevice } from '../../types/biometric';
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
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastAction, setLastAction] = useState<string | null>(null);

  const handlePing = async () => {
    setIsSyncing(true);
    setLastAction('Pinging device...');
    try {
      await BiometricDeviceService.pingDevice(device.id);
      setLastAction('Device is ONLINE');
    } catch (err) {
      setLastAction('Ping failed');
    } finally {
      setIsSyncing(false);
      setTimeout(() => setLastAction(null), 3000);
    }
  };

  const handleSyncTime = async () => {
    setIsSyncing(true);
    setLastAction('Syncing clock...');
    try {
      await BiometricDeviceService.syncDeviceClock(session, companyId, device);
      setLastAction('Time synchronized');
      onRefresh();
    } catch (err) {
      setLastAction('Time sync failed');
    } finally {
      setIsSyncing(false);
      setTimeout(() => setLastAction(null), 3000);
    }
  };

  const handleSyncPunches = async () => {
    setIsSyncing(true);
    setLastAction('Fetching punches...');
    try {
      const res = await BiometricDeviceService.syncDevicePunches(session, companyId, device, employees, shifts);
      setLastAction(`Fetched ${res.totalFetched} punches`);
      onRefresh();
    } catch (err) {
      setLastAction('Sync failed');
    } finally {
      setIsSyncing(false);
      setTimeout(() => setLastAction(null), 3000);
    }
  };

  const isOnline = device.status === 'ONLINE' || device.status === 'SYNCING';

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 hover:border-slate-700 transition-all group relative overflow-hidden">
      {/* Background Glow */}
      <div className={`absolute top-0 right-0 w-32 h-32 blur-3xl opacity-10 pointer-events-none transition-all ${
        isOnline ? 'bg-emerald-500' : 'bg-rose-500'
      }`} />

      <div className="flex items-start justify-between mb-4 relative z-10">
        <div className="flex items-center space-x-3">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border transition-colors ${
            isOnline 
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
              : 'bg-slate-950 border-slate-800 text-slate-600'
          }`}>
            <Server className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white group-hover:text-amber-400 transition-colors">
              {device.deviceName}
            </h3>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[11px] font-mono text-slate-500 uppercase tracking-wider">{device.manufacturer}</span>
              <span className="w-1 h-1 rounded-full bg-slate-700"></span>
              <span className="text-[11px] font-mono text-slate-400">{device.ipAddress}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {lastAction && (
            <span className="text-[11px] font-medium text-amber-400 animate-fade-in bg-amber-500/10 px-2 py-1 rounded-lg border border-amber-500/20">
              {lastAction}
            </span>
          )}
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${
            isOnline 
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
              : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
            {device.status}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-5 relative z-10">
        <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800/50 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium uppercase">Last Synced</span>
            <History className="w-3 h-3 text-slate-600" />
          </div>
          <p className="text-xs font-semibold text-slate-300">
            {device.telemetry?.lastSyncAt ? new Date(device.telemetry.lastSyncAt).toLocaleTimeString() : 'Never'}
          </p>
        </div>
        <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800/50 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium uppercase">Total Punches</span>
            <Activity className="w-3 h-3 text-sky-500" />
          </div>
          <p className="text-xs font-semibold text-sky-400">
            {(device.telemetry?.totalPunchCount || 0).toLocaleString()}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 relative z-10">
        <div className="flex items-center gap-1.5">
          <button
            onClick={handleSyncPunches}
            disabled={isSyncing || !isOnline}
            className="p-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-400 hover:text-amber-400 hover:border-amber-500/30 transition-all disabled:opacity-50"
            title="Manual Punch Sync"
          >
            <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={handleSyncTime}
            disabled={isSyncing || !isOnline}
            className="p-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-400 hover:text-sky-400 hover:border-sky-500/30 transition-all disabled:opacity-50"
            title="Sync Device Clock"
          >
            <Clock className="w-4 h-4" />
          </button>
          <button
            onClick={handlePing}
            disabled={isSyncing}
            className="p-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-400 hover:text-emerald-400 hover:border-emerald-500/30 transition-all disabled:opacity-50"
            title="Health Check (Ping)"
          >
            <Zap className="w-4 h-4" />
          </button>
        </div>

        <button
          onClick={() => onOpenMappings(device)}
          className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white transition-all border border-slate-700 hover:border-slate-600"
        >
          <Users className="w-3.5 h-3.5 text-amber-400" />
          User Mapping
          <ChevronRight className="w-3.5 h-3.5 opacity-50" />
        </button>
      </div>

      {/* Site Badge */}
      <div className="mt-4 pt-4 border-t border-slate-800/60 flex items-center justify-between text-[11px]">
        <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Site: <span className="text-slate-300 font-medium">{site?.name || 'Global'}</span></span>
        </div>
        <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
          <Cpu className="w-3.5 h-3.5" />
          <span>{device.protocol}</span>
        </div>
      </div>
    </div>
  );
};
