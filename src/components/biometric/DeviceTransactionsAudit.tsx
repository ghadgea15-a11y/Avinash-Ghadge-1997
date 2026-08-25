import React, { useState, useEffect } from 'react';
import {
  Activity,
  CheckCircle2,
  Clock,
  Fingerprint,
  RefreshCw,
  Search,
  ShieldCheck,
  Zap,
  Users,
  AlertTriangle
} from 'lucide-react';
import { BiometricDevice, DeviceAuditLog, DevicePunchTransaction } from '../../types/biometric';
import { BiometricDeviceService } from '../../services/biometric/BiometricDeviceService';

interface DeviceTransactionsAuditProps {
  companyId: string;
  devices: BiometricDevice[];
}

export const DeviceTransactionsAudit: React.FC<DeviceTransactionsAuditProps> = ({
  companyId,
  devices
}) => {
  const [activeTab, setActiveTab] = useState<'AUDIT_LOGS' | 'LIVE_TELEMETRY'>('AUDIT_LOGS');
  const [auditLogs, setAuditLogs] = useState<DeviceAuditLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const loadAuditLogs = async () => {
    setLoading(true);
    try {
      const logs = await BiometricDeviceService.getAuditLogs(companyId);
      setAuditLogs(logs);
    } catch (err) {
      console.warn(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAuditLogs();
  }, [companyId]);

  const filteredLogs = auditLogs.filter(log => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      log.deviceId.toLowerCase().includes(q) ||
      log.action.toLowerCase().includes(q) ||
      log.performedBy.toLowerCase().includes(q) ||
      log.details.toLowerCase().includes(q)
    );
  });

  return (
    <div id="section-biometric-audit" className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-base font-bold text-white tracking-tight">Biometric Audit & Telemetry Stream</h2>
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Immutable Trace
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Cryptographically timestamped transaction log and hardware security audit events.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setActiveTab('AUDIT_LOGS')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                activeTab === 'AUDIT_LOGS' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              Hardware Audit Log
            </button>
            <button
              onClick={() => setActiveTab('LIVE_TELEMETRY')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                activeTab === 'LIVE_TELEMETRY' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              Telemetry Metrics
            </button>
          </div>

          <button
            onClick={loadAuditLogs}
            disabled={loading}
            className="p-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700 transition-colors"
            title="Refresh logs"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-amber-400' : ''}`} />
          </button>
        </div>
      </div>

      {activeTab === 'AUDIT_LOGS' ? (
        <div className="space-y-4">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search audit actions, device ID, operator, or details..."
              className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="border border-slate-800 rounded-xl overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="px-4 py-3 font-semibold">Timestamp</th>
                  <th className="px-4 py-3 font-semibold">Action</th>
                  <th className="px-4 py-3 font-semibold">Device</th>
                  <th className="px-4 py-3 font-semibold">Performed By</th>
                  <th className="px-4 py-3 font-semibold">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 bg-slate-900/50">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-500">
                      <RefreshCw className="w-5 h-5 animate-spin mx-auto text-amber-400 mb-2" />
                      Loading audit records...
                    </td>
                  </tr>
                ) : filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-500">
                      No audit events recorded yet. Connect a biometric device to generate hardware events.
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map(log => (
                    <tr key={log.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="px-4 py-3 text-slate-400 font-mono text-[11px] whitespace-nowrap">
                        {new Date(log.timestamp).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded-md text-[11px] font-semibold ${
                          log.action === 'REGISTER' || log.action === 'AUTO_CONNECT' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                          log.action === 'TIME_SYNC' ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20' :
                          log.action === 'SYNC_PUNCHES' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                          log.action === 'REMOVE' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' :
                          'bg-slate-800 text-slate-300'
                        }`}>
                          {log.action}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-slate-300 whitespace-nowrap">{log.deviceId}</td>
                      <td className="px-4 py-3 text-white font-medium whitespace-nowrap">{log.performedBy}</td>
                      <td className="px-4 py-3 text-slate-300 text-[11.5px]">{log.details}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {devices.map(d => (
            <div key={d.id} className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
              <div className="flex justify-between items-center">
                <span className="font-semibold text-white text-sm">{d.deviceName}</span>
                <span className="text-xs font-mono text-amber-400">{d.protocol}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                  <span className="text-slate-500 block text-[10.5px]">Device Clock</span>
                  <span className="text-white font-mono text-[11px]">
                    {d.telemetry?.deviceTimeIso ? new Date(d.telemetry.deviceTimeIso).toLocaleTimeString() : 'Synced'}
                  </span>
                </div>
                <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                  <span className="text-slate-500 block text-[10.5px]">NTP Clock Drift</span>
                  <span className="text-emerald-400 font-mono">{d.telemetry?.serverTimeDriftSeconds || 0}s</span>
                </div>
                <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                  <span className="text-slate-500 block text-[10.5px]">Last Heartbeat</span>
                  <span className="text-slate-300 text-[11px]">
                    {d.telemetry?.lastSeenAt ? new Date(d.telemetry.lastSeenAt).toLocaleTimeString() : 'Online'}
                  </span>
                </div>
                <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                  <span className="text-slate-500 block text-[10.5px]">Sync Mode</span>
                  <span className="text-sky-400 font-medium">{d.syncConfig?.syncMode || 'REALTIME_PUSH'}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
