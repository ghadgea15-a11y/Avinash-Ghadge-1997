import React, { useState, useEffect } from 'react';
import {
  Check,
  CheckCircle2,
  Filter,
  Fingerprint,
  HelpCircle,
  RefreshCw,
  Search,
  Sliders,
  UserCheck,
  Users,
  X,
  Zap
} from 'lucide-react';
import { EmployeeRecord, SiteRecord, UserSession } from '../../types';
import { BiometricDevice, DeviceEmployeeMapping, MappingStatus } from '../../types/biometric';
import { BiometricDeviceService } from '../../services/biometric/BiometricDeviceService';

interface EmployeeMappingTableProps {
  session: UserSession;
  companyId: string;
  device?: BiometricDevice;
  allDevices: BiometricDevice[];
  employees: EmployeeRecord[];
  onClose?: () => void;
}

export const EmployeeMappingTable: React.FC<EmployeeMappingTableProps> = ({
  session,
  companyId,
  device,
  allDevices,
  employees,
  onClose
}) => {
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>(device ? device.id : (allDevices.length > 0 ? allDevices[0].id : ''));
  const [mappings, setMappings] = useState<DeviceEmployeeMapping[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | MappingStatus>('ALL');
  const [reconciling, setReconciling] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  const activeDevice = allDevices.find(d => d.id === selectedDeviceId) || device;

  const loadMappings = async () => {
    if (!selectedDeviceId) return;
    setLoading(true);
    try {
      const data = await BiometricDeviceService.getDeviceMappings(companyId, selectedDeviceId);
      setMappings(data);
    } catch (err) {
      console.warn('Failed to load mappings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMappings();
  }, [selectedDeviceId]);

  const handleAutoReconcile = async () => {
    if (!activeDevice) return;
    setReconciling(true);
    try {
      const res = await BiometricDeviceService.discoverAndAutoMapEmployees(session, companyId, activeDevice, employees);
      setMappings(res.mappings);
      setSaveSuccessMsg(`Reconciled ${res.discoveredUsers.length} hardware users: ${res.exactMatches} auto-matched, ${res.unmapped} unmapped.`);
    } catch (err) {
      console.warn(err);
    } finally {
      setReconciling(false);
    }
  };

  const handleManualMapEmployee = async (mapping: DeviceEmployeeMapping, newEmpId: string) => {
    const matchedEmp = employees.find(e => e.id === newEmpId);
    const empFullName = matchedEmp ? `${matchedEmp.firstName || ''} ${matchedEmp.lastName || ''}`.trim() : '';
    const updatedMapping: DeviceEmployeeMapping = {
      ...mapping,
      employeeId: newEmpId,
      employeeName: empFullName,
      mappingStatus: newEmpId ? 'MANUALLY_MAPPED' : 'UNMAPPED',
      matchConfidence: newEmpId ? 1.0 : 0
    };

    await BiometricDeviceService.saveEmployeeMapping(session, companyId, updatedMapping);
    setMappings(prev => prev.map(m => m.id === mapping.id ? updatedMapping : m));
    setSaveSuccessMsg(`Updated mapping for machine PIN ${mapping.machineUserId}`);
  };

  const handleIgnoreToggle = async (mapping: DeviceEmployeeMapping) => {
    const updatedMapping: DeviceEmployeeMapping = {
      ...mapping,
      mappingStatus: mapping.mappingStatus === 'IGNORED' ? 'UNMAPPED' : 'IGNORED'
    };
    await BiometricDeviceService.saveEmployeeMapping(session, companyId, updatedMapping);
    setMappings(prev => prev.map(m => m.id === mapping.id ? updatedMapping : m));
  };

  const filteredMappings = mappings.filter(m => {
    if (statusFilter !== 'ALL' && m.mappingStatus !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchPin = m.machineUserId.toLowerCase().includes(q);
      const matchName = (m.machineUserName || '').toLowerCase().includes(q);
      const matchEmpName = (m.employeeName || '').toLowerCase().includes(q);
      const matchCard = (m.machineCardNo || '').toLowerCase().includes(q);
      if (!matchPin && !matchName && !matchEmpName && !matchCard) return false;
    }
    return true;
  });

  const exactCount = mappings.filter(m => m.mappingStatus === 'AUTO_MATCHED' || m.mappingStatus === 'MANUALLY_MAPPED').length;
  const unmappedCount = mappings.filter(m => m.mappingStatus === 'UNMAPPED').length;

  return (
    <div id="section-employee-mapping" className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-base font-bold text-white tracking-tight">Machine User & Employee Reconciliation</h2>
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-sky-500/10 text-sky-400 border border-sky-500/20">
              {mappings.length} Enrolled
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Synchronize enrolled biometric PINs/Cards with Log Sheet Muster employee profiles.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            id="btn-auto-reconcile-mappings"
            onClick={handleAutoReconcile}
            disabled={reconciling || !activeDevice}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-950 bg-amber-400 hover:bg-amber-300 transition-colors shadow-lg shadow-amber-500/20 flex items-center gap-1.5"
          >
            <Zap className={`w-3.5 h-3.5 fill-slate-950 ${reconciling ? 'animate-bounce' : ''}`} />
            {reconciling ? 'Reconciling...' : 'Auto-Match All'}
          </button>

          {onClose && (
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-[11px] text-slate-500 block">Total Hardware Users</span>
            <span className="text-lg font-bold text-white">{mappings.length}</span>
          </div>
          <Users className="w-5 h-5 text-slate-500" />
        </div>

        <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-[11px] text-slate-500 block">Mapped Employees</span>
            <span className="text-lg font-bold text-emerald-400">{exactCount}</span>
          </div>
          <CheckCircle2 className="w-5 h-5 text-emerald-500" />
        </div>

        <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-[11px] text-slate-500 block">Unmapped PINs</span>
            <span className="text-lg font-bold text-amber-400">{unmappedCount}</span>
          </div>
          <HelpCircle className="w-5 h-5 text-amber-500" />
        </div>
      </div>

      {/* Feedback Banner */}
      {saveSuccessMsg && (
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs font-medium text-emerald-400 flex items-center justify-between">
          <span>{saveSuccessMsg}</span>
          <button onClick={() => setSaveSuccessMsg(null)} className="text-emerald-300 hover:text-white">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Device Switcher */}
        {allDevices.length > 1 && (
          <div className="w-full sm:w-64">
            <select
              id="select-mapping-device"
              value={selectedDeviceId}
              onChange={(e) => setSelectedDeviceId(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-amber-500"
            >
              {allDevices.map(d => (
                <option key={d.id} value={d.id}>{d.deviceName} ({d.ipAddress})</option>
              ))}
            </select>
          </div>
        )}

        <div className="flex items-center space-x-2 flex-1">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search machine PIN, name, or card..."
              className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-amber-500"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 focus:outline-none focus:border-amber-500"
          >
            <option value="ALL">All Status</option>
            <option value="AUTO_MATCHED">Auto-Matched</option>
            <option value="MANUALLY_MAPPED">Manually Mapped</option>
            <option value="UNMAPPED">Unmapped Only</option>
            <option value="IGNORED">Ignored</option>
          </select>
        </div>
      </div>

      {/* Mappings Table */}
      <div className="border border-slate-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
              <tr>
                <th className="px-4 py-3 font-semibold">Device Machine User</th>
                <th className="px-4 py-3 font-semibold">Card / Biometrics</th>
                <th className="px-4 py-3 font-semibold">Matched HCM Employee</th>
                <th className="px-4 py-3 font-semibold">Reconciliation Status</th>
                <th className="px-4 py-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 bg-slate-900/50">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-500">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto text-amber-400 mb-2" />
                    Loading enrolled hardware profiles...
                  </td>
                </tr>
              ) : filteredMappings.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-500">
                    No machine user mappings found. Click "Auto-Match All" to query connected device.
                  </td>
                </tr>
              ) : (
                filteredMappings.map(m => (
                  <tr key={m.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-white font-mono">PIN #{m.machineUserId}</div>
                      <div className="text-[11px] text-slate-400">{m.machineUserName || 'Unnamed Terminal User'}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-slate-300">{m.machineCardNo || '—'}</span>
                    </td>
                    <td className="px-4 py-3">
                      <select
                        id={`select-emp-for-pin-${m.machineUserId}`}
                        value={m.employeeId || ''}
                        onChange={(e) => handleManualMapEmployee(m, e.target.value)}
                        className="w-full max-w-xs px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-amber-500"
                      >
                        <option value="">— Unassigned (Select Employee) —</option>
                        {employees.map(emp => (
                          <option key={emp.id} value={emp.id}>
                            {`${emp.firstName || ''} ${emp.lastName || ''}`.trim() || emp.id} ({emp.employeeCode || emp.id})
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      {m.mappingStatus === 'AUTO_MATCHED' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          <Check className="w-3 h-3" /> Auto Matched ({Math.round(m.matchConfidence * 100)}%)
                        </span>
                      )}
                      {m.mappingStatus === 'MANUALLY_MAPPED' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-sky-500/10 text-sky-400 border border-sky-500/20">
                          <UserCheck className="w-3 h-3" /> Manually Mapped
                        </span>
                      )}
                      {m.mappingStatus === 'UNMAPPED' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
                          <HelpCircle className="w-3 h-3" /> Unmapped
                        </span>
                      )}
                      {m.mappingStatus === 'IGNORED' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-800 text-slate-400">
                          Ignored
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleIgnoreToggle(m)}
                        className="text-xs text-slate-400 hover:text-slate-200 underline transition-colors"
                      >
                        {m.mappingStatus === 'IGNORED' ? 'Unignore' : 'Ignore PIN'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
