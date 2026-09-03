import React, { useState, useEffect } from 'react';
import {
  Activity,
  AlertCircle,
  CheckCircle2,
  Clock,
  Cpu,
  Fingerprint,
  Layers,
  Plus,
  RefreshCw,
  Search,
  Server,
  ShieldCheck,
  Sparkles,
  Users,
  Wifi,
  Zap
} from 'lucide-react';
import { EmployeeRecord, ShiftRecord, SiteRecord, UserSession } from '../../types';
import { BiometricDevice } from '../../types/biometric';
import { BiometricDeviceService } from '../../services/biometric/BiometricDeviceService';
import { OneMinuteAutoConnectModal } from './OneMinuteAutoConnectModal';
import { DeviceListCard } from './DeviceListCard';
import { EmployeeMappingTable } from './EmployeeMappingTable';
import { DeviceTransactionsAudit } from './DeviceTransactionsAudit';
import { ConnectorCatalogView } from './ConnectorCatalogView';

interface BiometricHubDashboardProps {
  session: UserSession;
  companyId: string;
  sites: SiteRecord[];
  employees: EmployeeRecord[];
  shifts: ShiftRecord[];
}

type TabType = 'DEVICES' | 'USER_MAPPINGS' | 'AUDIT_TELEMETRY' | 'CONNECTORS';

export const BiometricHubDashboard: React.FC<BiometricHubDashboardProps> = ({
  session,
  companyId,
  sites,
  employees,
  shifts
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('DEVICES');
  const [devices, setDevices] = useState<BiometricDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSiteId, setSelectedSiteId] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modals & Subviews
  const [showAutoConnectModal, setShowAutoConnectModal] = useState(false);
  const [activeMappingDevice, setActiveMappingDevice] = useState<BiometricDevice | undefined>(undefined);

  const loadDevices = async () => {
    setLoading(true);
    try {
      const siteFilter = selectedSiteId === 'ALL' ? undefined : selectedSiteId;
      const data = await BiometricDeviceService.getCompanyDevices(companyId, siteFilter);
      setDevices(data);
    } catch (err) {
      console.warn('Failed to load devices:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Initial load + Realtime Firestore Listener
    const siteFilter = selectedSiteId === 'ALL' ? undefined : selectedSiteId;
    const unsubscribe = BiometricDeviceService.subscribeCompanyDevices(
      companyId,
      (liveDevices: any) => {
        setDevices(liveDevices);
        setLoading(false);
      },
      siteFilter
    );

    return () => unsubscribe();
  }, [companyId, selectedSiteId]);

  const handleDeviceConnected = (newDev: BiometricDevice) => {
    setDevices(prev => [newDev, ...prev.filter(d => d.id !== newDev.id)]);
  };

  const handleOpenMappingsForDevice = (dev: BiometricDevice) => {
    setActiveMappingDevice(dev);
    setActiveTab('USER_MAPPINGS');
  };

  const filteredDevices = devices.filter(d => {
    if (selectedSiteId !== 'ALL' && d.siteId !== selectedSiteId) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = d.deviceName.toLowerCase().includes(q);
      const matchIp = d.ipAddress.toLowerCase().includes(q);
      const matchMfg = d.manufacturer.toLowerCase().includes(q);
      const matchModel = (d.model || '').toLowerCase().includes(q);
      if (!matchName && !matchIp && !matchMfg && !matchModel) return false;
    }
    return true;
  });

  const onlineCount = devices.filter(d => d.status === 'ONLINE').length;
  const totalPunches = devices.reduce((sum, d) => sum + (d.telemetry?.totalPunchCount || 0), 0);

  return (
    <div id="biometric-hub-root" className="space-y-6">
      {/* Top Banner & Hub Controls */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center space-x-2.5">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                <Fingerprint className="w-6 h-6" />
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                Universal Biometric Device Hub
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Zero-Config Gateway
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-400 max-w-2xl">
              Connect biometric, RFID turnstiles, and facial attendance hardware in 1 minute with automatic protocol identification, employee reconciliation, and real-time synchronization.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              id="btn-open-autoconnect-wizard"
              onClick={() => setShowAutoConnectModal(true)}
              className="px-5 py-3 rounded-2xl text-xs sm:text-sm font-semibold text-slate-950 bg-amber-400 hover:bg-amber-300 transition-all shadow-xl shadow-amber-500/20 flex items-center gap-2 hover:scale-[1.02]"
            >
              <Zap className="w-4 h-4 fill-slate-950" />
              1-Minute Auto Connect
            </button>
          </div>
        </div>

        {/* Global Hub Statistics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 mt-6 pt-6 border-t border-slate-800/80">
          <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800/60 flex items-center justify-between">
            <div>
              <span className="text-xs text-slate-500 dark:text-slate-400 block">Connected Devices</span>
              <span className="text-xl font-bold text-white font-mono">{devices.length}</span>
            </div>
            <Server className="w-5 h-5 text-slate-600 dark:text-slate-400" />
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800/60 flex items-center justify-between">
            <div>
              <span className="text-xs text-slate-500 dark:text-slate-400 block">Online & Active</span>
              <span className="text-xl font-bold text-emerald-400 font-mono">{onlineCount}</span>
            </div>
            <Wifi className="w-5 h-5 text-emerald-500" />
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800/60 flex items-center justify-between">
            <div>
              <span className="text-xs text-slate-500 dark:text-slate-400 block">Punches Synced</span>
              <span className="text-xl font-bold text-sky-400 font-mono">{totalPunches}</span>
            </div>
            <Activity className="w-5 h-5 text-sky-500" />
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800/60 flex items-center justify-between">
            <div>
              <span className="text-xs text-slate-500 dark:text-slate-400 block">Hardware NTP Drift</span>
              <span className="text-xl font-bold text-amber-400 font-mono">&lt; 1.0s</span>
            </div>
            <Clock className="w-5 h-5 text-amber-500" />
          </div>
        </div>
      </div>

      {/* Navigation Tabs Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-1.5 p-1 rounded-2xl bg-slate-900 border border-slate-800 overflow-x-auto">
          {[
            { key: 'DEVICES', label: 'Hardware Devices', count: devices.length, icon: Server },
            { key: 'USER_MAPPINGS', label: 'Employee Mappings', icon: Users },
            { key: 'AUDIT_TELEMETRY', label: 'Audit & Telemetry', icon: Activity },
            { key: 'CONNECTORS', label: 'Connector Catalog', icon: Layers }
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                id={`tab-btn-${tab.key.toLowerCase()}`}
                onClick={() => setActiveTab(tab.key as TabType)}
                className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 whitespace-nowrap ${
                  isActive
                    ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-500/10'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span className={`px-1.5 py-0.2 rounded-full text-[11px] font-bold ${
                    isActive ? 'bg-slate-950 text-amber-400' : 'bg-slate-800 text-slate-300'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Global Filters */}
        {activeTab === 'DEVICES' && (
          <div className="flex items-center space-x-2">
            <div className="relative flex-1 sm:w-60">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search device, IP, model..."
                className="w-full pl-8 pr-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            <select
              id="select-site-filter"
              value={selectedSiteId}
              onChange={(e) => setSelectedSiteId(e.target.value)}
              className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white focus:outline-none focus:border-amber-500"
            >
              <option value="ALL">All Sites ({sites.length})</option>
              {sites.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>

            <button
              onClick={loadDevices}
              className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-colors"
              title="Refresh Devices"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-amber-400' : ''}`} />
            </button>
          </div>
        )}
      </div>

      {/* TAB CONTENT VIEWS */}
      {activeTab === 'DEVICES' && (
        <div className="space-y-4">
          {loading ? (
            <div className="py-16 text-center text-slate-500 dark:text-slate-400 space-y-3">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto text-amber-400" />
              <p className="text-xs">Querying biometric terminals across company sites...</p>
            </div>
          ) : filteredDevices.length === 0 ? (
            <div className="p-12 text-center rounded-3xl bg-slate-900/60 border border-slate-800/80 space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mx-auto">
                <Fingerprint className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-white">No Biometric Terminals Registered</h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Connect your first ZKTeco, eSSL, Hikvision, or Generic biometric machine in under one minute.
                </p>
              </div>
              <button
                onClick={() => setShowAutoConnectModal(true)}
                className="px-5 py-2.5 rounded-xl text-xs font-semibold text-slate-950 bg-amber-400 hover:bg-amber-300 transition-colors inline-flex items-center gap-2"
              >
                <Zap className="w-4 h-4 fill-slate-950" />
                Launch 1-Minute Auto Connect
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredDevices.map(device => {
                const site = sites.find(s => s.id === device.siteId);
                return (
                  <DeviceListCard
                    key={device.id}
                    device={device}
                    session={session}
                    companyId={companyId}
                    site={site}
                    employees={employees}
                    shifts={shifts}
                    onOpenMappings={handleOpenMappingsForDevice}
                    onRefresh={loadDevices}
                  />
                );
              })}
            </div>
          )}
        </div>
      )}

      {activeTab === 'USER_MAPPINGS' && (
        <EmployeeMappingTable
          session={session}
          companyId={companyId}
          device={activeMappingDevice}
          allDevices={devices}
          employees={employees}
          onClose={() => setActiveMappingDevice(undefined)}
        />
      )}

      {activeTab === 'AUDIT_TELEMETRY' && (
        <DeviceTransactionsAudit
          companyId={companyId}
          devices={devices}
        />
      )}

      {activeTab === 'CONNECTORS' && (
        <ConnectorCatalogView />
      )}

      {/* Auto Connect Modal */}
      {showAutoConnectModal && (
        <OneMinuteAutoConnectModal
          session={session}
          companyId={companyId}
          sites={sites}
          employees={employees}
          shifts={shifts}
          onClose={() => setShowAutoConnectModal(false)}
          onDeviceConnected={handleDeviceConnected}
        />
      )}
    </div>
  );
};
