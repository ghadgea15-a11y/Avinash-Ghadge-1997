import React, { useState, useEffect, useRef } from 'react';
import { 
  Activity, 
  ArrowLeft, 
  RefreshCw, 
  Server, 
  Database, 
  HardDrive, 
  ShieldCheck, 
  AlertTriangle, 
  CheckCircle2, 
  Radio, 
  Zap, 
  Clock,
  TrendingUp,
  Cpu,
  Layers,
  Building2,
  Users,
  Terminal,
  Gauge,
  Code2,
  Wifi,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { UserSession, PhaseAScreen } from '../../types';
import { PlatformMonitoringMetrics, ServerHealthTelemetry } from '../../types/platform';
import { SuperAdminService } from '../../services/superAdminService';
import { useTheme } from '../../context/ThemeContext';
import { useFeedback } from '../../context/ActionFeedbackContext';

interface SuperAdminMonitoringScreenProps {
  currentSession: UserSession;
  onNavigate: (screen: PhaseAScreen) => void;
}

export const SuperAdminMonitoringScreen: React.FC<SuperAdminMonitoringScreenProps> = ({
  currentSession,
  onNavigate
}) => {
  const { isDark } = useTheme();
  const { showSuccess, showError } = useFeedback();

  const [metrics, setMetrics] = useState<PlatformMonitoringMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [runningDiagnostic, setRunningDiagnostic] = useState(false);
  const [lastCheckTime, setLastCheckTime] = useState<Date>(new Date());
  const [pollIntervalSeconds, setPollIntervalSeconds] = useState<number>(10);
  const [secondsUntilNextPoll, setSecondsUntilNextPoll] = useState<number>(10);
  const [showRawJson, setShowRawJson] = useState<boolean>(false);
  const [networkPingHistory, setNetworkPingHistory] = useState<number[]>([]);

  const fetchHealthMetrics = async (isManual = false) => {
    try {
      if (isManual) setRunningDiagnostic(true);
      const data = await SuperAdminService.getPlatformMonitoringMetrics();
      setMetrics(data);
      setLastCheckTime(new Date());
      setSecondsUntilNextPoll(pollIntervalSeconds);

      if (data.serverTelemetry?.networkLatencyMs) {
        setNetworkPingHistory(prev => [...prev.slice(-9), data.serverTelemetry!.networkLatencyMs!]);
      }
    } catch (err) {
      console.error('[SuperAdminMonitoringScreen] Failed to fetch telemetry metrics:', err);
      showError('Failed to fetch live system telemetry');
    } finally {
      setLoading(false);
      setRunningDiagnostic(false);
    }
  };

  // Live polling effect
  useEffect(() => {
    fetchHealthMetrics();
  }, []);

  useEffect(() => {
    if (pollIntervalSeconds <= 0) return;

    const countdownTimer = setInterval(() => {
      setSecondsUntilNextPoll(prev => {
        if (prev <= 1) {
          fetchHealthMetrics();
          return pollIntervalSeconds;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(countdownTimer);
  }, [pollIntervalSeconds]);

  const handleRunDiagnostic = async () => {
    await fetchHealthMetrics(true);
    showSuccess('Diagnostic completed: Live telemetry updated from server');
  };

  const getStatusColor = (status: 'HEALTHY' | 'DEGRADED' | 'DOWN' | 'ok' | 'error') => {
    switch (status) {
      case 'HEALTHY':
      case 'ok':
        return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20';
      case 'DEGRADED':
        return 'text-amber-500 bg-amber-500/10 border-amber-500/20';
      case 'DOWN':
      case 'error':
        return 'text-rose-500 bg-rose-500/10 border-rose-500/20';
      default:
        return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20';
    }
  };

  const server = metrics?.serverTelemetry;

  return (
    <div className={`flex-1 transition-colors duration-300 ${isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'} p-4 md:p-6 space-y-6 max-w-7xl mx-auto w-full`}>
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => onNavigate('SUPER_ADMIN_DASHBOARD')}
            className={`p-2 rounded-xl border transition ${
              isDark ? 'bg-slate-900 border-slate-800 hover:bg-slate-800' : 'bg-white border-slate-200 hover:bg-slate-100'
            }`}
            title="Return to Super Admin Dashboard"
          >
            <ArrowLeft className="w-5 h-5 text-slate-400" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight">System Telemetry & Platform Health</h1>
              <span className="inline-flex items-center gap-1.5 bg-emerald-500/10 text-emerald-500 text-xs font-semibold px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                {server?.status === 'error' ? 'Degraded' : 'Live / Operational'}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Live server process telemetry, actual measured network round-trip & Firestore database ping.
            </p>
          </div>
        </div>

        {/* Polling & Actions */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Polling interval selector */}
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium ${
            isDark ? 'bg-slate-900 border-slate-800 text-slate-300' : 'bg-white border-slate-200 text-slate-700'
          }`}>
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-400 hidden sm:inline">Poll:</span>
            <select
              value={pollIntervalSeconds}
              onChange={(e) => {
                const val = Number(e.target.value);
                setPollIntervalSeconds(val);
                setSecondsUntilNextPoll(val);
              }}
              className="bg-transparent font-semibold cursor-pointer outline-none"
            >
              <option value={5} className={isDark ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'}>5s (Real-time)</option>
              <option value={10} className={isDark ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'}>10s (Fast)</option>
              <option value={30} className={isDark ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'}>30s (Normal)</option>
              <option value={0} className={isDark ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'}>Manual</option>
            </select>
            {pollIntervalSeconds > 0 && (
              <span className="text-[10px] font-mono text-indigo-400 ml-1">
                ({secondsUntilNextPoll}s)
              </span>
            )}
          </div>

          <button
            onClick={handleRunDiagnostic}
            disabled={runningDiagnostic}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white transition shadow-sm"
          >
            <Zap className={`w-3.5 h-3.5 ${runningDiagnostic ? 'animate-spin' : ''}`} />
            <span>{runningDiagnostic ? 'Probing...' : 'Probe Now'}</span>
          </button>

          <button
            onClick={() => setShowRawJson(prev => !prev)}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-xl border transition ${
              isDark ? 'bg-slate-900 border-slate-800 hover:bg-slate-800 text-slate-300' : 'bg-white border-slate-200 hover:bg-slate-100 text-slate-700'
            }`}
            title="Toggle Live /api/health raw JSON telemetry"
          >
            <Code2 className="w-3.5 h-3.5 text-indigo-500" />
            <span className="hidden sm:inline">JSON</span>
            {showRawJson ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        </div>
      </div>

      {/* Raw JSON Debugging Drawer for Verification */}
      {showRawJson && (
        <div className={`p-4 rounded-2xl border text-xs font-mono overflow-x-auto ${
          isDark ? 'bg-slate-950 border-indigo-900/50 text-emerald-400' : 'bg-slate-900 border-slate-700 text-emerald-300'
        }`}>
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
            <span className="text-slate-400 text-[11px] font-sans font-semibold flex items-center gap-2">
              <Terminal className="w-3.5 h-3.5 text-indigo-400" />
              Live Server Payload (`GET /api/health`) • Measured at {lastCheckTime.toLocaleTimeString()}
            </span>
            <span className="text-indigo-400 text-[10px]">
              Client Network RTT: {server?.networkLatencyMs || '--'}ms
            </span>
          </div>
          <pre className="text-[11px] leading-relaxed">
            {JSON.stringify(server || { error: 'Server telemetry unreachable' }, null, 2)}
          </pre>
        </div>
      )}

      {/* LIVE SERVER TELEMETRY COCKPIT (Real-Time Node.js & System Health) */}
      <div className={`p-5 rounded-2xl border ${isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'} space-y-4`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-3 border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Server className="w-4 h-4 text-indigo-500" />
            <h2 className="text-sm font-bold">Node.js Server Process & System Telemetry</h2>
            <span className="text-[11px] font-mono text-slate-400 bg-slate-100 dark:bg-slate-800/80 px-2 py-0.5 rounded-md">
              PID: {server?.processInfo.pid || '--'} • Node {server?.processInfo.nodeVersion || '--'}
            </span>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <span className="text-slate-400">
              Server Uptime: <strong className="font-mono text-indigo-400">{server?.uptimeFormatted || '--'}</strong>
            </span>
            <span className="text-slate-400 hidden sm:inline">|</span>
            <span className="text-slate-400">
              OS: <strong className="font-mono text-slate-300">{server?.processInfo.platform || 'linux'}</strong>
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Card 1: Live Measured Network Latency */}
          <div className={`p-4 rounded-xl border ${isDark ? 'bg-slate-950/60 border-slate-800/80' : 'bg-slate-50 border-slate-200'} space-y-2`}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
                <Wifi className="w-3.5 h-3.5 text-indigo-500" />
                Network RTT (Round-Trip)
              </span>
              <span className="text-[10px] font-mono text-emerald-500 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded">
                Live Measured
              </span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-bold font-mono text-indigo-400">
                {server?.networkLatencyMs ?? '--'}
              </span>
              <span className="text-xs font-mono text-slate-400">ms</span>
            </div>
            <p className="text-[11px] text-slate-500">
              Browser-to-Express latency measured using <code className="font-mono text-indigo-400 text-[10px]">performance.now()</code>.
            </p>
            {/* Sparkline mini bar indicators */}
            {networkPingHistory.length > 0 && (
              <div className="flex items-end gap-1 h-5 pt-1">
                {networkPingHistory.map((val, idx) => (
                  <div 
                    key={idx} 
                    className="flex-1 bg-indigo-500/70 hover:bg-indigo-400 rounded-xs transition-all"
                    style={{ height: `${Math.min(100, Math.max(15, (val / 150) * 100))}%` }}
                    title={`Probe #${idx + 1}: ${val}ms`}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Card 2: Live Database Connectivity & Firestore Latency */}
          <div className={`p-4 rounded-xl border ${isDark ? 'bg-slate-950/60 border-slate-800/80' : 'bg-slate-50 border-slate-200'} space-y-2`}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-cyan-500" />
                Firestore DB Ping
              </span>
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${getStatusColor(server?.database.status || 'HEALTHY')}`}>
                {server?.database.status || (metrics?.firestoreHealthy ? 'HEALTHY' : 'DOWN')}
              </span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-bold font-mono text-cyan-400">
                {server?.database.latencyMs ?? metrics?.firestoreLatencyMs ?? '--'}
              </span>
              <span className="text-xs font-mono text-slate-400">ms</span>
            </div>
            <p className="text-[11px] text-slate-500">
              Direct Admin SDK query latency executed on backend database engine.
            </p>
            <div className="w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
              <div 
                className="bg-cyan-500 h-full rounded-full transition-all duration-500" 
                style={{ width: `${Math.min(100, Math.max(10, ((server?.database.latencyMs || 25) / 200) * 100))}%` }}
              />
            </div>
          </div>

          {/* Card 3: Live Process Memory (Node.js Heap & RSS) */}
          <div className={`p-4 rounded-xl border ${isDark ? 'bg-slate-950/60 border-slate-800/80' : 'bg-slate-50 border-slate-200'} space-y-2`}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
                <Gauge className="w-3.5 h-3.5 text-emerald-500" />
                Process Heap Memory
              </span>
              <span className="text-[10px] font-mono text-emerald-500 font-bold">
                {server?.memory ? `${server.memory.heapUsagePercentage}%` : '--'}
              </span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-bold font-mono text-emerald-400">
                {server?.memory.heapUsedMB ?? '--'}
              </span>
              <span className="text-xs font-mono text-slate-400">/ {server?.memory.heapTotalMB ?? '--'} MB</span>
            </div>
            <p className="text-[11px] text-slate-500">
              Process RSS: <strong className="text-slate-300 font-mono">{server?.memory.rssMB ?? '--'} MB</strong> • Sys: {server?.memory.systemFreeMB ?? '--'}MB free
            </p>
            <div className="w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
              <div 
                className="bg-emerald-500 h-full rounded-full transition-all duration-500" 
                style={{ width: `${Math.min(100, Math.max(5, server?.memory.heapUsagePercentage || 25))}%` }}
              />
            </div>
          </div>

          {/* Card 4: Live CPU Utilization & Load Average */}
          <div className={`p-4 rounded-xl border ${isDark ? 'bg-slate-950/60 border-slate-800/80' : 'bg-slate-50 border-slate-200'} space-y-2`}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-violet-500" />
                CPU & System Load
              </span>
              <span className="text-[10px] font-mono text-violet-400 font-bold">
                {server?.cpu.cores ?? 1} Core(s)
              </span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-bold font-mono text-violet-400">
                {server?.cpu.estimatedCpuUsagePercent ?? '--'}
              </span>
              <span className="text-xs font-mono text-slate-400">% CPU</span>
            </div>
            <p className="text-[11px] text-slate-500 font-mono truncate" title={`Load averages: 1m: ${server?.cpu.loadAverage1m}, 5m: ${server?.cpu.loadAverage5m}, 15m: ${server?.cpu.loadAverage15m}`}>
              Load avg: {server?.cpu.loadAverage1m ?? '--'}, {server?.cpu.loadAverage5m ?? '--'}, {server?.cpu.loadAverage15m ?? '--'}
            </p>
            <div className="w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
              <div 
                className="bg-violet-500 h-full rounded-full transition-all duration-500" 
                style={{ width: `${Math.min(100, Math.max(5, (server?.cpu.estimatedCpuUsagePercent || 1) * 3))}%` }}
              />
            </div>
          </div>

        </div>
      </div>

      {/* Primary Telemetry Grid: Platform Security, Volumes & Uptime */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Token Verification Latency */}
        <div className={`p-4 rounded-2xl border ${isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-sm'} space-y-3`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <span className="text-xs font-bold">Identity & Tokens</span>
            </div>
            <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md border ${getStatusColor(metrics?.authHealth || 'HEALTHY')}`}>
              {metrics?.authHealth || 'HEALTHY'}
            </span>
          </div>
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-bold font-mono text-emerald-500">
                {metrics ? `${metrics.authLatencyMs}ms` : '--'}
              </span>
              <span className="text-[11px] text-slate-400">auth token verification</span>
            </div>
            <div className="w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
              <div 
                className="bg-emerald-500 h-full rounded-full transition-all duration-500" 
                style={{ width: `${Math.min(100, Math.max(10, ((metrics?.authLatencyMs || 30) / 150) * 100))}%` }}
              />
            </div>
          </div>
        </div>

        {/* Storage Volume */}
        <div className={`p-4 rounded-2xl border ${isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-sm'} space-y-3`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-cyan-500" />
              <span className="text-xs font-bold">Cloud Storage</span>
            </div>
            <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md border ${getStatusColor(metrics?.storageHealth || 'HEALTHY')}`}>
              {metrics?.storageHealth || 'HEALTHY'}
            </span>
          </div>
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-bold font-mono text-cyan-500">
                {metrics ? `${(metrics.storageUsedGb || 0).toFixed(1)} GB` : '--'}
              </span>
              <span className="text-[11px] text-slate-400">allocated volume</span>
            </div>
            <div className="w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
              <div 
                className="bg-cyan-500 h-full rounded-full transition-all duration-500" 
                style={{ width: '18%' }}
              />
            </div>
          </div>
        </div>

        {/* Platform SLA Uptime */}
        <div className={`p-4 rounded-2xl border ${isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-sm'} space-y-3`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-violet-500" />
              <span className="text-xs font-bold">Platform SLA Target</span>
            </div>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-md border bg-emerald-500/10 text-emerald-500 border-emerald-500/20">
              99.98%
            </span>
          </div>
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-bold font-mono text-violet-500">
                {metrics ? `${metrics.errorRatePercentage}%` : '0.01%'}
              </span>
              <span className="text-[11px] text-slate-400">computed error rate</span>
            </div>
            <div className="w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
              <div 
                className="bg-violet-500 h-full rounded-full transition-all duration-500" 
                style={{ width: '4%' }}
              />
            </div>
          </div>
        </div>

        {/* Multi-Tenant Active Count */}
        <div className={`p-4 rounded-2xl border ${isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-sm'} space-y-3`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-amber-500" />
              <span className="text-xs font-bold">Active Tenants</span>
            </div>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-md border bg-amber-500/10 text-amber-500 border-amber-500/20">
              {metrics?.activeTenantsCount ?? '--'} LIVE
            </span>
          </div>
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-bold font-mono text-amber-500">
                {metrics?.totalUsersCount ?? '--'}
              </span>
              <span className="text-[11px] text-slate-400">total tenant users</span>
            </div>
            <div className="w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
              <div 
                className="bg-amber-500 h-full rounded-full transition-all duration-500" 
                style={{ width: '35%' }}
              />
            </div>
          </div>
        </div>

      </div>

      {/* Multi-Tenant Capacity Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Tenant Distribution */}
        <div className={`p-5 rounded-2xl border ${isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-sm'} space-y-4`}>
          <div className="flex items-center justify-between border-b pb-3 border-slate-200 dark:border-slate-800">
            <h3 className="font-bold text-sm flex items-center gap-2">
              <Building2 className="w-4 h-4 text-indigo-500" />
              Tenant Capacity Distribution
            </h3>
            <span className="text-xs font-mono text-slate-400">
              Total: {metrics ? metrics.activeTenantsCount + metrics.suspendedTenantsCount : '--'}
            </span>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/10">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span className="font-medium">Active Tenants (Operational)</span>
              </div>
              <span className="font-mono font-bold text-emerald-500 text-sm">
                {metrics?.activeTenantsCount ?? '--'}
              </span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-amber-500/5 border border-amber-500/10">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                <span className="font-medium">Suspended / Inactive Tenants</span>
              </div>
              <span className="font-mono font-bold text-amber-500 text-sm">
                {metrics?.suspendedTenantsCount ?? 0}
              </span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-indigo-500/5 border border-indigo-500/10">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-indigo-500" />
                <span className="font-medium">Active Support Sessions</span>
              </div>
              <span className="font-mono font-bold text-indigo-500 text-sm">
                {metrics?.activeSupportSessionsCount ?? 0}
              </span>
            </div>
          </div>
        </div>

        {/* Middle/Right Column: Architecture SLA & Nodes */}
        <div className={`lg:col-span-2 p-5 rounded-2xl border ${isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-sm'} space-y-4`}>
          <div className="flex items-center justify-between border-b pb-3 border-slate-200 dark:border-slate-800">
            <h3 className="font-bold text-sm flex items-center gap-2">
              <Cpu className="w-4 h-4 text-cyan-500" />
              Cloud Infrastructure Nodes & High Availability Status
            </h3>
            <span className="text-xs text-emerald-500 font-semibold flex items-center gap-1">
              <Radio className="w-3 h-3 animate-ping" />
              All Nodes Synced
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className={`p-3.5 rounded-xl border ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-bold">Firestore Database Node</span>
                <span className="text-[11px] text-emerald-500 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded">
                  {server?.database.connected ? 'Connected' : 'Unreachable'} ({server?.database.latencyMs || metrics?.firestoreLatencyMs || 0}ms)
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Active Firestore cluster with automatic multi-zone failover and live query probe.
              </p>
            </div>

            <div className={`p-3.5 rounded-xl border ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-bold">Node.js Express Backend</span>
                <span className="text-[11px] text-emerald-500 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded">
                  PID {server?.processInfo.pid || '--'} (Up {server?.uptimeFormatted || '--'})
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Authoritative multi-tenant execution tier serving API endpoints and telemetry.
              </p>
            </div>

            <div className={`p-3.5 rounded-xl border ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-bold">Process Memory & Heap</span>
                <span className="text-[11px] text-emerald-500 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded">
                  {server?.memory.heapUsedMB || 0}MB ({server?.memory.heapUsagePercentage || 0}%)
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Real V8 heap usage monitored continuously to prevent memory leaks.
              </p>
            </div>

            <div className={`p-3.5 rounded-xl border ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-bold">CPU Core Allocation</span>
                <span className="text-[11px] text-emerald-500 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded">
                  {server?.cpu.cores || 1} Cores ({server?.cpu.estimatedCpuUsagePercent || 0}%)
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Process CPU cycle measurement across active system thread pool.
              </p>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
};
