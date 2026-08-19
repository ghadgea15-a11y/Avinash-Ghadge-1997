import React, { useState, useEffect } from 'react';
import { UserSession, BulkAndExportAlertRecord, SecurityGovernanceConfig, SecuritySeverity } from '../../types';
import { BulkExportGovernanceService } from '../../services/bulkExportGovernanceService';
import { 
  ShieldAlert, 
  Download, 
  Edit3, 
  Clock, 
  Search, 
  Filter, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Settings, 
  Moon, 
  Layers, 
  FileText, 
  Eye, 
  Activity, 
  RefreshCw, 
  Lock,
  Calendar
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface BulkExportAlertsDashboardProps {
  userSession: UserSession;
}

export const BulkExportAlertsDashboard: React.FC<BulkExportAlertsDashboardProps> = ({ userSession }) => {
  const [alerts, setAlerts] = useState<BulkAndExportAlertRecord[]>([]);
  const [config, setConfig] = useState<SecurityGovernanceConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedAlert, setSelectedAlert] = useState<BulkAndExportAlertRecord | null>(null);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [configForm, setConfigForm] = useState<Partial<SecurityGovernanceConfig>>({});
  const [savingConfig, setSavingConfig] = useState(false);
  const [resolveNote, setResolveNote] = useState('');
  const [resolving, setResolving] = useState(false);
  
  // Filters
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [severityFilter, setSeverityFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const loadData = async () => {
    setLoading(true);
    const [fetchedAlerts, fetchedConfig] = await Promise.all([
      BulkExportGovernanceService.getAlerts(userSession, userSession.companyId),
      BulkExportGovernanceService.getGovernanceConfig(userSession.companyId)
    ]);
    setAlerts(fetchedAlerts);
    setConfig(fetchedConfig);
    setConfigForm(fetchedConfig);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [userSession]);

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingConfig(true);
    const ok = await BulkExportGovernanceService.updateGovernanceConfig(userSession, userSession.companyId, configForm);
    if (ok) {
      setShowConfigModal(false);
      await loadData();
    }
    setSavingConfig(false);
  };

  const handleResolve = async (status: 'UNDER_REVIEW' | 'CONFIRMED' | 'FALSE_POSITIVE' | 'RESOLVED') => {
    if (!selectedAlert) return;
    setResolving(true);
    const ok = await BulkExportGovernanceService.resolveAlert(
      userSession,
      userSession.companyId,
      selectedAlert.id,
      status,
      resolveNote
    );
    if (ok) {
      setSelectedAlert(null);
      setResolveNote('');
      await loadData();
    }
    setResolving(false);
  };

  const filteredAlerts = alerts.filter(alert => {
    if (categoryFilter !== 'ALL' && alert.category !== categoryFilter) return false;
    if (severityFilter !== 'ALL' && alert.severity !== severityFilter) return false;
    if (statusFilter !== 'ALL' && alert.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchText = `${alert.userName} ${alert.userId} ${alert.module} ${alert.entityType} ${alert.operation} ${alert.evidence} ${alert.correlationId}`.toLowerCase();
      if (!matchText.includes(q)) return false;
    }
    return true;
  });

  const getSeverityStyle = (severity: SecuritySeverity) => {
    switch (severity) {
      case 'CRITICAL': return 'bg-red-100 text-red-800 border-red-200';
      case 'HIGH': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'MEDIUM': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'LOW': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'DETECTED': return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'UNDER_REVIEW': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'FALSE_POSITIVE': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'CONFIRMED': return 'bg-red-100 text-red-800 border-red-200';
      case 'RESOLVED': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const bulkCount = alerts.filter(a => a.eventType === 'BULK_OPERATION').length;
  const afterHoursCount = alerts.filter(a => a.isAfterHours).length;
  const criticalHighCount = alerts.filter(a => a.severity === 'CRITICAL' || a.severity === 'HIGH').length;
  const pendingCount = alerts.filter(a => a.status === 'DETECTED' || a.status === 'UNDER_REVIEW').length;

  const isAdmin = userSession.role === 'SUPER_ADMIN' || userSession.role === 'COMPANY_ADMIN';

  return (
    <div className="space-y-6">
      {/* Top Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Bulk Edit Alerts</span>
            <div className="text-2xl font-black text-gray-900 mt-1">{bulkCount}</div>
          </div>
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
            <Edit3 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">After-Hours Exports</span>
            <div className="text-2xl font-black text-gray-900 mt-1">{afterHoursCount}</div>
          </div>
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
            <Moon className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">High / Critical Alerts</span>
            <div className="text-2xl font-black text-red-600 mt-1">{criticalHighCount}</div>
          </div>
          <div className="p-3 bg-red-50 text-red-600 rounded-xl">
            <ShieldAlert className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Pending Review</span>
            <div className="text-2xl font-black text-gray-900 mt-1">{pendingCount}</div>
          </div>
          <div className="p-3 bg-orange-50 text-orange-600 rounded-xl">
            <Activity className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="bg-white rounded-2xl shadow-xs border border-gray-100 overflow-hidden">
        {/* Header with Search & Controls */}
        <div className="p-5 border-b border-gray-100 bg-gray-50/50 flex flex-col md:flex-row gap-4 justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-600 text-white rounded-xl shadow-xs">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900">Bulk Edit & Download Alerts</h3>
              <p className="text-xs text-gray-500">
                Active Governance: Hours {config?.businessHoursStart || 8}:00 - {config?.businessHoursEnd || 20}:00 | Bulk Limit: {config?.bulkWarningThreshold || 25} | Export Limit: {config?.exportWarningThreshold || 100}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 items-center">
            {isAdmin && (
              <button
                onClick={() => setShowConfigModal(true)}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition shadow-2xs"
              >
                <Settings className="w-3.5 h-3.5 text-gray-500" />
                Policy Config
              </button>
            )}

            <button
              onClick={loadData}
              className="p-2 text-gray-500 hover:text-gray-900 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition shadow-2xs"
              title="Refresh alerts"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Filters Bar */}
        <div className="p-4 border-b border-gray-100 bg-white flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by user, module, entity, evidence..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-gray-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 bg-gray-50/50"
            />
          </div>

          <select
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
            className="border border-gray-200 rounded-xl px-3 py-1.5 text-xs text-gray-700 bg-white font-medium focus:outline-hidden"
          >
            <option value="ALL">All Categories</option>
            <option value="BULK_EDIT">Bulk Edit</option>
            <option value="AFTER_HOURS_DOWNLOAD">After-Hours Download</option>
            <option value="SENSITIVE_EXPORT">Sensitive Export</option>
            <option value="HIGH_VOLUME_EXPORT">High Volume Export</option>
            <option value="REPEATED_ACTIVITY">Repeated Activity</option>
          </select>

          <select
            value={severityFilter}
            onChange={e => setSeverityFilter(e.target.value)}
            className="border border-gray-200 rounded-xl px-3 py-1.5 text-xs text-gray-700 bg-white font-medium focus:outline-hidden"
          >
            <option value="ALL">All Severities</option>
            <option value="CRITICAL">Critical</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>

          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="border border-gray-200 rounded-xl px-3 py-1.5 text-xs text-gray-700 bg-white font-medium focus:outline-hidden"
          >
            <option value="ALL">All Statuses</option>
            <option value="DETECTED">Detected</option>
            <option value="UNDER_REVIEW">Under Review</option>
            <option value="CONFIRMED">Confirmed Anomaly</option>
            <option value="FALSE_POSITIVE">False Positive</option>
            <option value="RESOLVED">Resolved</option>
          </select>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-gray-50 text-gray-600 font-semibold border-b border-gray-100 uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3">Timestamp / Timing</th>
                <th className="px-4 py-3">User / Role</th>
                <th className="px-4 py-3">Event / Category</th>
                <th className="px-4 py-3">Module & Target</th>
                <th className="px-4 py-3">Impact / Sensitivity</th>
                <th className="px-4 py-3">Risk & Severity</th>
                <th className="px-4 py-3 text-right">Status & Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-gray-500">
                    <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-indigo-600 mx-auto"></div>
                  </td>
                </tr>
              ) : filteredAlerts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-gray-400">
                    No bulk edit or download alerts found matching your criteria.
                  </td>
                </tr>
              ) : (
                filteredAlerts.map(alert => (
                  <tr key={alert.id} className="hover:bg-gray-50/70 transition-colors">
                    {/* Timestamp & Timing */}
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <div className="font-medium text-gray-900 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-gray-400" />
                        {new Date(alert.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </div>
                      <div className="text-[10px] text-gray-500 mt-0.5">
                        {new Date(alert.timestamp).toISOString().split('T')[0]}
                      </div>
                      {alert.isAfterHours && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-amber-50 text-amber-700 text-[9px] font-bold rounded-md mt-1 border border-amber-200">
                          <Moon className="w-2.5 h-2.5" /> After Hours
                        </span>
                      )}
                    </td>

                    {/* User & Role */}
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <div className="font-semibold text-gray-900">{alert.userName || alert.userId}</div>
                      <div className="text-[10px] text-indigo-600 font-mono font-medium mt-0.5">
                        {alert.userRole}
                      </div>
                    </td>

                    {/* Event & Category */}
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        {alert.eventType === 'BULK_OPERATION' ? (
                          <span className="p-1 bg-indigo-50 text-indigo-600 rounded-md">
                            <Edit3 className="w-3.5 h-3.5" />
                          </span>
                        ) : (
                          <span className="p-1 bg-emerald-50 text-emerald-600 rounded-md">
                            <Download className="w-3.5 h-3.5" />
                          </span>
                        )}
                        <span className="font-semibold text-gray-900">{alert.operation}</span>
                      </div>
                      <div className="text-[10px] text-gray-500 mt-0.5 capitalize">
                        {alert.category.replace(/_/g, ' ').toLowerCase()}
                      </div>
                    </td>

                    {/* Module & Target */}
                    <td className="px-4 py-3.5">
                      <div className="font-medium text-gray-800">{alert.module}</div>
                      <div className="text-[10px] text-gray-500 font-mono mt-0.5">{alert.entityType}</div>
                    </td>

                    {/* Impact / Volume */}
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <div className="font-bold text-gray-900">
                        {alert.affectedRecordCount} <span className="text-[10px] font-normal text-gray-500">records</span>
                      </div>
                      {alert.dataClassification && alert.dataClassification !== 'GENERAL' && (
                        <span className="inline-block px-1.5 py-0.5 bg-red-50 text-red-700 text-[9px] font-bold rounded-md mt-0.5 border border-red-100">
                          {alert.dataClassification}
                        </span>
                      )}
                    </td>

                    {/* Risk & Severity */}
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <span className={`px-2 py-0.5 text-[10px] font-bold rounded-md border ${getSeverityStyle(alert.severity)}`}>
                          {alert.severity}
                        </span>
                        <span className="text-[10px] font-bold text-gray-600 bg-gray-100 px-1.5 py-0.5 rounded-md border border-gray-200">
                          {alert.riskScore} PTS
                        </span>
                      </div>
                    </td>

                    {/* Status & Action */}
                    <td className="px-4 py-3.5 text-right whitespace-nowrap">
                      <div className="flex flex-col items-end gap-1.5">
                        <span className={`px-2 py-0.5 text-[10px] font-bold rounded-md border ${getStatusStyle(alert.status)}`}>
                          {alert.status}
                        </span>
                        <button
                          onClick={() => setSelectedAlert(alert)}
                          className="text-xs text-indigo-600 font-semibold hover:text-indigo-800 transition"
                        >
                          Investigate →
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Policy Configuration Modal */}
      <AnimatePresence>
        {showConfigModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden border border-gray-100"
            >
              <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/80">
                <div className="flex items-center gap-2">
                  <Settings className="w-5 h-5 text-indigo-600" />
                  <h3 className="font-bold text-gray-900">Security Governance Policy</h3>
                </div>
                <button onClick={() => setShowConfigModal(false)} className="text-gray-400 hover:text-gray-600">
                  <XCircle className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveConfig} className="p-6 space-y-4 text-xs">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">Business Hours Start (24h)</label>
                    <input
                      type="number"
                      min={0}
                      max={23}
                      value={configForm.businessHoursStart ?? 8}
                      onChange={e => setConfigForm({ ...configForm, businessHoursStart: parseInt(e.target.value) || 0 })}
                      className="w-full border border-gray-200 rounded-xl p-2.5 font-medium bg-gray-50/50"
                    />
                    <span className="text-[10px] text-gray-400">e.g. 8 for 08:00 AM</span>
                  </div>

                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">Business Hours End (24h)</label>
                    <input
                      type="number"
                      min={0}
                      max={23}
                      value={configForm.businessHoursEnd ?? 20}
                      onChange={e => setConfigForm({ ...configForm, businessHoursEnd: parseInt(e.target.value) || 20 })}
                      className="w-full border border-gray-200 rounded-xl p-2.5 font-medium bg-gray-50/50"
                    />
                    <span className="text-[10px] text-gray-400">e.g. 20 for 08:00 PM</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">Bulk Warning Threshold</label>
                    <input
                      type="number"
                      min={5}
                      value={configForm.bulkWarningThreshold ?? 25}
                      onChange={e => setConfigForm({ ...configForm, bulkWarningThreshold: parseInt(e.target.value) || 25 })}
                      className="w-full border border-gray-200 rounded-xl p-2.5 font-medium bg-gray-50/50"
                    />
                    <span className="text-[10px] text-gray-400">Flag bulk updates exceeding count</span>
                  </div>

                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">Export Warning Threshold</label>
                    <input
                      type="number"
                      min={10}
                      value={configForm.exportWarningThreshold ?? 100}
                      onChange={e => setConfigForm({ ...configForm, exportWarningThreshold: parseInt(e.target.value) || 100 })}
                      className="w-full border border-gray-200 rounded-xl p-2.5 font-medium bg-gray-50/50"
                    />
                    <span className="text-[10px] text-gray-400">Flag exports exceeding count</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">Repeated Activity Window (Mins)</label>
                    <input
                      type="number"
                      min={1}
                      value={configForm.repeatedDownloadWindowMinutes ?? 10}
                      onChange={e => setConfigForm({ ...configForm, repeatedDownloadWindowMinutes: parseInt(e.target.value) || 10 })}
                      className="w-full border border-gray-200 rounded-xl p-2.5 font-medium bg-gray-50/50"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">Repeated Activity Max Count</label>
                    <input
                      type="number"
                      min={2}
                      value={configForm.repeatedDownloadMaxCount ?? 3}
                      onChange={e => setConfigForm({ ...configForm, repeatedDownloadMaxCount: parseInt(e.target.value) || 3 })}
                      className="w-full border border-gray-200 rounded-xl p-2.5 font-medium bg-gray-50/50"
                    />
                  </div>
                </div>

                <div className="pt-4 flex justify-end gap-3 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setShowConfigModal(false)}
                    className="px-4 py-2 text-xs font-semibold text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingConfig}
                    className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 transition disabled:opacity-50"
                  >
                    {savingConfig ? 'Saving...' : 'Save Policy'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Deep Investigation & Review Modal */}
      <AnimatePresence>
        {selectedAlert && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden border border-gray-100 max-h-[85vh] flex flex-col"
            >
              {/* Modal Header */}
              <div className="p-5 border-b border-gray-100 bg-gray-50/80 flex justify-between items-center shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                    <ShieldAlert className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900">Security Governance Investigation</h3>
                    <p className="text-xs text-gray-500 font-mono">Correlation ID: {selectedAlert.correlationId}</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedAlert(null)}
                  className="text-gray-400 hover:text-gray-600 transition"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 overflow-y-auto space-y-5 text-xs">
                {/* 4-Box Summary */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                    <span className="text-[10px] text-gray-400 font-bold uppercase">Actor / Role</span>
                    <div className="font-bold text-gray-900 mt-1 truncate">{selectedAlert.userName || selectedAlert.userId}</div>
                    <div className="text-[10px] text-indigo-600 font-mono">{selectedAlert.userRole}</div>
                  </div>

                  <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                    <span className="text-[10px] text-gray-400 font-bold uppercase">Operation</span>
                    <div className="font-bold text-gray-900 mt-1 truncate">{selectedAlert.operation}</div>
                    <div className="text-[10px] text-gray-500">{selectedAlert.module}</div>
                  </div>

                  <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                    <span className="text-[10px] text-gray-400 font-bold uppercase">Impact Volume</span>
                    <div className="font-bold text-gray-900 mt-1">{selectedAlert.affectedRecordCount} Records</div>
                    <div className="text-[10px] text-gray-500 font-mono">{selectedAlert.exportFormat || selectedAlert.entityType}</div>
                  </div>

                  <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                    <span className="text-[10px] text-gray-400 font-bold uppercase">Risk Score</span>
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className="text-base font-black text-gray-900">{selectedAlert.riskScore}</span>
                      <span className={`px-1.5 py-0.5 text-[9px] font-bold rounded-md border ${getSeverityStyle(selectedAlert.severity)}`}>
                        {selectedAlert.severity}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Timing & Policy Evaluation */}
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-gray-800 flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-indigo-600" />
                      Execution Timing & Policy Evaluation
                    </span>
                    {selectedAlert.isAfterHours ? (
                      <span className="px-2 py-0.5 bg-amber-100 text-amber-800 font-bold rounded-md text-[10px] border border-amber-200">
                        Outside Business Hours
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-bold rounded-md text-[10px] border border-emerald-200">
                        Within Business Hours
                      </span>
                    )}
                  </div>
                  <div className="text-gray-600 text-xs">
                    Executed at <span className="font-mono font-semibold text-gray-800">{new Date(selectedAlert.timestamp).toLocaleString()}</span> (Local hour: {selectedAlert.localTimeHour}:00).
                  </div>
                </div>

                {/* Rules Triggered & Evidence */}
                <div>
                  <h4 className="font-bold text-gray-900 mb-2">Detection Rules & Security Evidence</h4>
                  <div className="bg-slate-900 text-slate-200 p-4 rounded-xl font-mono text-xs border border-slate-800 space-y-2">
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {selectedAlert.rulesTriggered.map((rule, idx) => (
                        <span key={idx} className="px-2 py-0.5 bg-red-950/80 text-red-300 rounded-md border border-red-800 text-[10px] font-bold">
                          {rule}
                        </span>
                      ))}
                    </div>
                    <div className="text-gray-300 leading-relaxed">
                      {selectedAlert.evidence}
                    </div>
                  </div>
                </div>

                {/* Resolution Workflow */}
                <div className="pt-2">
                  <h4 className="font-bold text-gray-900 mb-2 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-orange-500" />
                    Investigation & Resolution
                  </h4>

                  {selectedAlert.status === 'DETECTED' || selectedAlert.status === 'UNDER_REVIEW' ? (
                    <div className="space-y-3">
                      <textarea
                        value={resolveNote}
                        onChange={e => setResolveNote(e.target.value)}
                        placeholder="Enter investigation justification, administrative verification, or incident notes..."
                        className="w-full border border-gray-200 rounded-xl p-3 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-hidden bg-white"
                        rows={3}
                      />
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => handleResolve('UNDER_REVIEW')}
                          disabled={resolving || !resolveNote.trim()}
                          className="flex-1 py-2 px-3 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl font-bold transition disabled:opacity-50"
                        >
                          Mark Under Review
                        </button>
                        <button
                          onClick={() => handleResolve('FALSE_POSITIVE')}
                          disabled={resolving || !resolveNote.trim()}
                          className="flex-1 py-2 px-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl font-bold transition disabled:opacity-50"
                        >
                          Mark False Positive
                        </button>
                        <button
                          onClick={() => handleResolve('CONFIRMED')}
                          disabled={resolving || !resolveNote.trim()}
                          className="flex-1 py-2 px-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold transition disabled:opacity-50"
                        >
                          Confirm Anomaly (Escalate)
                        </button>
                      </div>
                      <p className="text-[10px] text-gray-500 text-center">
                        Note: Every resolution decision is committed to the Immutable Audit Log. Legitimate administrative exports will not block operations.
                      </p>
                    </div>
                  ) : (
                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 text-[10px] font-bold rounded-md border ${getStatusStyle(selectedAlert.status)}`}>
                          {selectedAlert.status}
                        </span>
                        <span className="text-[10px] text-gray-500">
                          Reviewed by {selectedAlert.reviewedBy} at {selectedAlert.reviewedAt ? new Date(selectedAlert.reviewedAt).toLocaleString() : ''}
                        </span>
                      </div>
                      <p className="text-gray-700 text-xs font-medium">{selectedAlert.resolutionNotes}</p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
