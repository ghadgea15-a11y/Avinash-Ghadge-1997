import React, { useState, useEffect } from 'react';
import { UserSession, SecurityEventRecord, SecurityAnomalyRecord } from '../../types';
import { SecurityAuditService } from '../../services/securityAuditService';
import { Shield, AlertTriangle, Clock, Server, CheckCircle, Activity, FileSpreadsheet, Eye, Fingerprint, History, KeyRound } from 'lucide-react';
import { motion } from 'motion/react';
import { AuditViewer } from './AuditViewer';
import { SuspiciousPunchDashboard } from './SuspiciousPunchDashboard';
import { BulkExportAlertsDashboard } from './BulkExportAlertsDashboard';
import { PrivilegeMatrixViewer } from './PrivilegeMatrixViewer';
import { AccountProtectionViewer } from './AccountProtectionViewer';
import { DataPrivacyViewer } from './DataPrivacyViewer';
import { ContinuousMonitoringDashboard } from './ContinuousMonitoringDashboard';
import { RiskRegisterViewer } from './RiskRegisterViewer';
import { ComplianceControlViewer } from './ComplianceControlViewer';
import { ComplianceObligationViewer } from './ComplianceObligationViewer';
import { Lock, FileKey, FileText } from 'lucide-react';

interface SecurityDashboardProps {
  userSession: UserSession;
  onNavigate: (screen: any) => void;
}

export const SecurityDashboard: React.FC<SecurityDashboardProps> = ({ userSession, onNavigate }) => {
  const [events, setEvents] = useState<SecurityEventRecord[]>([]);
  const [anomalies, setAnomalies] = useState<SecurityAnomalyRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'ANOMALIES' | 'BULK_DOWNLOAD' | 'PUNCHES' | 'EVENTS' | 'PRIVILEGES' | 'ACCOUNT_LOCKS' | 'DATA_PRIVACY' | 'CONTINUOUS_MONITORING' | 'RISK_REGISTER' | 'COMPLIANCE_CONTROL' | 'OBLIGATIONS'>('CONTINUOUS_MONITORING');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [filterSeverity, setFilterSeverity] = useState<string>('ALL');

  const [selectedAnomaly, setSelectedAnomaly] = useState<{ id: string; status: SecurityAnomalyRecord['status'] } | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Detail view
  const [viewingAnomalyId, setViewingAnomalyId] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      const [evts, anoms] = await Promise.all([
        SecurityAuditService.getEvents(userSession),
        SecurityAuditService.getAnomalies(userSession)
      ]);
      setEvents(evts);
      setAnomalies(anoms);
      setLoading(false);
    };

    loadData();
  }, [userSession]);

  const handleUpdateStatus = async (anomalyId: string, status: SecurityAnomalyRecord['status']) => {
    if (status === 'UNDER_REVIEW') {
      const success = await SecurityAuditService.updateAnomalyStatus(userSession, anomalyId, status);
      if (success) {
        setAnomalies(prev => prev.map(a => a.anomalyId === anomalyId ? { ...a, status } : a));
      }
    } else {
      setSelectedAnomaly({ id: anomalyId, status });
      setResolutionNotes('');
    }
  };

  const submitResolution = async () => {
    if (!selectedAnomaly) return;
    setSubmitting(true);
    const success = await SecurityAuditService.updateAnomalyStatus(userSession, selectedAnomaly.id, selectedAnomaly.status, resolutionNotes);
    if (success) {
      setAnomalies(prev => prev.map(a => a.anomalyId === selectedAnomaly.id ? { ...a, status: selectedAnomaly.status, resolutionNotes } : a));
    }
    setSubmitting(false);
    setSelectedAnomaly(null);
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'CRITICAL': return 'bg-red-100 text-red-800 border-red-200';
      case 'HIGH': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'MEDIUM': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'LOW': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  const criticalCount = anomalies.filter(a => a.severity === 'CRITICAL' && a.status !== 'RESOLVED' && a.status !== 'FALSE_POSITIVE').length;
  const highCount = anomalies.filter(a => a.severity === 'HIGH' && a.status !== 'RESOLVED' && a.status !== 'FALSE_POSITIVE').length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 md:p-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Shield className="w-6 h-6 text-indigo-600" />
            GRC Security & Anomaly Center
          </h2>
          <p className="text-gray-500">Real-time governance, suspicious punch detection, and bulk/download surveillance</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-xs flex flex-col items-center justify-center">
          <AlertTriangle className={`w-10 h-10 mb-2 ${criticalCount > 0 ? 'text-red-500' : 'text-gray-300'}`} />
          <span className="text-3xl font-bold text-gray-900">{criticalCount}</span>
          <span className="text-sm text-gray-500 font-medium mt-1">Active Critical</span>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-xs flex flex-col items-center justify-center">
          <Activity className={`w-10 h-10 mb-2 ${highCount > 0 ? 'text-orange-500' : 'text-gray-300'}`} />
          <span className="text-3xl font-bold text-gray-900">{highCount}</span>
          <span className="text-sm text-gray-500 font-medium mt-1">Active High</span>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-xs flex flex-col items-center justify-center">
          <Server className="w-10 h-10 text-indigo-500 mb-2" />
          <span className="text-3xl font-bold text-gray-900">{anomalies.length}</span>
          <span className="text-sm text-gray-500 font-medium mt-1">Total Anomalies</span>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-xs flex flex-col items-center justify-center">
          <CheckCircle className="w-10 h-10 text-emerald-500 mb-2" />
          <span className="text-3xl font-bold text-gray-900">{events.length}</span>
          <span className="text-sm text-gray-500 font-medium mt-1">Audit Events Logged</span>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-xs border border-gray-100 overflow-hidden">
        <div className="flex border-b border-gray-100 overflow-x-auto">
          <button
            onClick={() => setActiveTab('ANOMALIES')}
            className={`flex-1 min-w-[140px] py-3.5 px-4 text-center text-xs font-bold transition-colors flex items-center justify-center gap-2 ${
              activeTab === 'ANOMALIES' ? 'bg-indigo-50 text-indigo-700 border-b-2 border-indigo-600' : 'text-gray-500 hover:bg-gray-50'
            }`}
          >
            <Shield className="w-4 h-4" />
            Detected Anomalies
          </button>
          <button
            onClick={() => setActiveTab('BULK_DOWNLOAD')}
            className={`flex-1 min-w-[180px] py-3.5 px-4 text-center text-xs font-bold transition-colors flex items-center justify-center gap-2 ${
              activeTab === 'BULK_DOWNLOAD' ? 'bg-indigo-50 text-indigo-700 border-b-2 border-indigo-600' : 'text-gray-500 hover:bg-gray-50'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4 text-indigo-600" />
            Bulk & Download Alerts
          </button>
          <button
            onClick={() => setActiveTab('PUNCHES')}
            className={`flex-1 min-w-[160px] py-3.5 px-4 text-center text-xs font-bold transition-colors flex items-center justify-center gap-2 ${
              activeTab === 'PUNCHES' ? 'bg-indigo-50 text-indigo-700 border-b-2 border-indigo-600' : 'text-gray-500 hover:bg-gray-50'
            }`}
          >
            <Fingerprint className="w-4 h-4 text-red-500" />
            Suspicious Punches
          </button>
          <button
            onClick={() => setActiveTab('EVENTS')}
            className={`flex-1 min-w-[150px] py-3.5 px-4 text-center text-xs font-bold transition-colors flex items-center justify-center gap-2 ${
              activeTab === 'EVENTS' ? 'bg-indigo-50 text-indigo-700 border-b-2 border-indigo-600' : 'text-gray-500 hover:bg-gray-50'
            }`}
          >
            <History className="w-4 h-4 text-emerald-600" />
            Immutable Audit Log
          </button>
          <button
            onClick={() => setActiveTab('PRIVILEGES')}
            className={`flex-1 min-w-[170px] py-3.5 px-4 text-center text-xs font-bold transition-colors flex items-center justify-center gap-2 ${
              activeTab === 'PRIVILEGES' ? 'bg-indigo-50 text-indigo-700 border-b-2 border-indigo-600' : 'text-gray-500 hover:bg-gray-50'
            }`}
          >
            <KeyRound className="w-4 h-4 text-indigo-600" />
            Privilege Matrix
          </button>
          <button
            onClick={() => setActiveTab('ACCOUNT_LOCKS')}
            className={`flex-1 min-w-[170px] py-3.5 px-4 text-center text-xs font-bold transition-colors flex items-center justify-center gap-2 ${
              activeTab === 'ACCOUNT_LOCKS' ? 'bg-indigo-50 text-indigo-700 border-b-2 border-indigo-600' : 'text-gray-500 hover:bg-gray-50'
            }`}
          >
            <Lock className="w-4 h-4 text-amber-600" />
            Session & Account Locks
          </button>
          <button
            onClick={() => setActiveTab('DATA_PRIVACY')}
            className={`flex-1 min-w-[170px] py-3.5 px-4 text-center text-xs font-bold transition-colors flex items-center justify-center gap-2 ${
              activeTab === 'DATA_PRIVACY' ? 'bg-indigo-50 text-indigo-700 border-b-2 border-indigo-600' : 'text-gray-500 hover:bg-gray-50'
            }`}
          >
            <FileKey className="w-4 h-4 text-purple-600" />
            Data Privacy & DDM
          </button>
          <button
            onClick={() => setActiveTab('CONTINUOUS_MONITORING')}
            className={`flex-1 min-w-[170px] py-3.5 px-4 text-center text-xs font-bold transition-colors flex items-center justify-center gap-2 ${
              activeTab === 'CONTINUOUS_MONITORING' ? 'bg-indigo-50 text-indigo-700 border-b-2 border-indigo-600' : 'text-gray-500 hover:bg-gray-50'
            }`}
          >
            <Activity className="w-4 h-4 text-blue-600" />
            Continuous Monitoring
          </button>
          <button
            onClick={() => setActiveTab('RISK_REGISTER')}
            className={`flex-1 min-w-[170px] py-3.5 px-4 text-center text-xs font-bold transition-colors flex items-center justify-center gap-2 ${
              activeTab === 'RISK_REGISTER' ? 'bg-indigo-50 text-indigo-700 border-b-2 border-indigo-600' : 'text-gray-500 hover:bg-gray-50'
            }`}
          >
            <AlertTriangle className="w-4 h-4 text-orange-600" />
            Risk Register
          </button>
          <button
            onClick={() => setActiveTab('COMPLIANCE_CONTROL')}
            className={`flex-1 min-w-[170px] py-3.5 px-4 text-center text-xs font-bold transition-colors flex items-center justify-center gap-2 ${
              activeTab === 'COMPLIANCE_CONTROL' ? 'bg-indigo-50 text-indigo-700 border-b-2 border-indigo-600' : 'text-gray-500 hover:bg-gray-50'
            }`}
          >
            <CheckCircle className="w-4 h-4 text-green-600" />
            Compliance Controls
          </button>
          <button
            onClick={() => setActiveTab('OBLIGATIONS')}
            className={`flex-1 min-w-[170px] py-3.5 px-4 text-center text-xs font-bold transition-colors flex items-center justify-center gap-2 ${
              activeTab === 'OBLIGATIONS' ? 'bg-indigo-50 text-indigo-700 border-b-2 border-indigo-600' : 'text-gray-500 hover:bg-gray-50'
            }`}
          >
            <FileText className="w-4 h-4 text-blue-500" />
            Obligations & Expiry</button></div>

        <div className="p-4 md:p-6">
          {activeTab === 'ANOMALIES' && (
            <div className="space-y-4">
              {viewingAnomalyId ? (
                <div>
                  <button onClick={() => setViewingAnomalyId(null)} className="text-indigo-600 hover:text-indigo-800 text-sm font-medium mb-4 flex items-center gap-1">
                    &larr; Back to Anomalies
                  </button>
                  {/* Detailed Anomaly View */}
                  {anomalies.filter(a => a.anomalyId === viewingAnomalyId).map(anomaly => (
                    <div key={anomaly.anomalyId} className="bg-white border border-gray-200 rounded-lg p-6">
                      <div className="flex justify-between items-start mb-6">
                        <div>
                          <div className="flex items-center gap-3 mb-2">
                            <span className={`px-2.5 py-1 text-xs font-bold rounded-full border ${getSeverityColor(anomaly.severity)}`}>
                              {anomaly.severity}
                            </span>
                            <span className="px-2.5 py-1 text-xs font-bold rounded-full border bg-gray-100 text-gray-800">
                              {anomaly.status}
                            </span>
                          </div>
                          <h3 className="text-xl font-bold text-gray-900">{anomaly.type.replace(/_/g, ' ')}</h3>
                          <p className="text-gray-500 mt-1">Detected: {new Date(anomaly.detectedAt).toLocaleString()}</p>
                        </div>
                      </div>
                      
                      <div className="prose max-w-none mb-6">
                        <p><strong>Reason:</strong> {anomaly.reason}</p>
                        {anomaly.recommendedAction && <p><strong>Recommendation:</strong> {anomaly.recommendedAction}</p>}
                        {anomaly.resolutionNotes && <p><strong>Resolution Notes:</strong> {anomaly.resolutionNotes}</p>}
                      </div>

                      <div className="mt-6 border-t border-gray-100 pt-6">
                        <h4 className="font-semibold text-gray-900 mb-4">Related Security Events ({anomaly.triggeringEvents?.length || 0})</h4>
                        <div className="space-y-3">
                          {events.filter(e => anomaly.triggeringEvents?.includes(e.eventId)).map(evt => (
                            <div key={evt.eventId} className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                              <div className="flex justify-between">
                                <span className="font-medium text-gray-900">{evt.action}</span>
                                <span className="text-sm text-gray-500">{new Date(evt.timestamp).toLocaleString()}</span>
                              </div>
                              <div className="text-sm text-gray-600 mt-1">
                                User: {evt.userId} | Resource: {evt.resource}
                                {!evt.success && <span className="text-red-600 ml-2">(Failed)</span>}
                              </div>
                            </div>
                          ))}
                          {events.filter(e => anomaly.triggeringEvents?.includes(e.eventId)).length === 0 && (
                            <p className="text-sm text-gray-500">Related event details may have been rotated or are unavailable.</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <>
                  <div className="flex gap-4 mb-6">
                    <select
                      value={filterStatus}
                      onChange={e => setFilterStatus(e.target.value)}
                      className="border-gray-300 rounded-lg text-sm focus:ring-indigo-500 focus:border-indigo-500 p-2 border"
                    >
                      <option value="ALL">All Statuses</option>
                      <option value="DETECTED">Detected</option>
                      <option value="UNDER_REVIEW">Under Review</option>
                      <option value="CONFIRMED">Confirmed</option>
                      <option value="FALSE_POSITIVE">False Positive</option>
                      <option value="RESOLVED">Resolved</option>
                    </select>
                    
                    <select
                      value={filterSeverity}
                      onChange={e => setFilterSeverity(e.target.value)}
                      className="border-gray-300 rounded-lg text-sm focus:ring-indigo-500 focus:border-indigo-500 p-2 border"
                    >
                      <option value="ALL">All Severities</option>
                      <option value="CRITICAL">Critical</option>
                      <option value="HIGH">High</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="LOW">Low</option>
                    </select>
                  </div>

                  <div className="divide-y divide-gray-100 bg-white border border-gray-100 rounded-lg overflow-hidden">
                    {anomalies
                      .filter(a => filterStatus === 'ALL' || a.status === filterStatus)
                      .filter(a => filterSeverity === 'ALL' || a.severity === filterSeverity)
                      .length === 0 ? (
                      <div className="p-8 text-center text-gray-500">No security anomalies match filters.</div>
                    ) : (
                      anomalies
                        .filter(a => filterStatus === 'ALL' || a.status === filterStatus)
                        .filter(a => filterSeverity === 'ALL' || a.severity === filterSeverity)
                        .map(anomaly => (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} key={anomaly.anomalyId} className="p-6 hover:bg-gray-50 transition-colors">
                          <div className="flex justify-between items-start mb-4">
                            <div className="flex items-center gap-3">
                              <span className={`px-2.5 py-1 text-xs font-bold rounded-full border ${getSeverityColor(anomaly.severity)}`}>
                                {anomaly.severity}
                              </span>
                              <h4 className="font-semibold text-gray-900 cursor-pointer hover:text-indigo-600" onClick={() => setViewingAnomalyId(anomaly.anomalyId)}>
                                {anomaly.type.replace(/_/g, ' ')}
                              </h4>
                            </div>
                            <div className="flex items-center gap-4">
                              <div className="flex items-center gap-2 text-sm text-gray-500">
                                <Clock className="w-4 h-4" />
                                {new Date(anomaly.detectedAt).toLocaleString()}
                              </div>
                              <button onClick={() => setViewingAnomalyId(anomaly.anomalyId)} className="text-indigo-600 hover:text-indigo-800 text-sm font-medium flex items-center gap-1">
                                <Eye className="w-4 h-4" /> View Evidence
                              </button>
                            </div>
                          </div>
                          
                          <p className="text-gray-600 text-sm mb-4">{anomaly.reason}</p>
                          
                          {anomaly.recommendedAction && (
                            <div className="bg-indigo-50 border border-indigo-100 p-3 rounded-lg text-sm text-indigo-800 mb-4">
                              <span className="font-semibold">Recommendation:</span> {anomaly.recommendedAction}
                            </div>
                          )}
                          
                          <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
                            <div className="flex gap-2">
                              <span className="text-sm font-medium text-gray-500">Status: </span>
                              <span className="text-sm font-semibold text-gray-900">{anomaly.status}</span>
                            </div>
                            
                            <div className="flex gap-2">
                              {anomaly.status === 'DETECTED' && (
                                <button onClick={() => handleUpdateStatus(anomaly.anomalyId, 'UNDER_REVIEW')} className="px-3 py-1.5 bg-yellow-100 text-yellow-800 rounded-lg text-sm font-medium hover:bg-yellow-200">
                                  Mark Review
                                </button>
                              )}
                              {(anomaly.status === 'DETECTED' || anomaly.status === 'UNDER_REVIEW') && (
                                <>
                                  <button onClick={() => handleUpdateStatus(anomaly.anomalyId, 'CONFIRMED')} className="px-3 py-1.5 bg-red-100 text-red-800 rounded-lg text-sm font-medium hover:bg-red-200">
                                    Confirm
                                  </button>
                                  <button onClick={() => handleUpdateStatus(anomaly.anomalyId, 'FALSE_POSITIVE')} className="px-3 py-1.5 bg-gray-100 text-gray-800 rounded-lg text-sm font-medium hover:bg-gray-200">
                                    False Positive
                                  </button>
                                  <button onClick={() => handleUpdateStatus(anomaly.anomalyId, 'RESOLVED')} className="px-3 py-1.5 bg-emerald-100 text-emerald-800 rounded-lg text-sm font-medium hover:bg-emerald-200">
                                    Resolve
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      ))
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {activeTab === 'BULK_DOWNLOAD' && (
            <BulkExportAlertsDashboard userSession={userSession} />
          )}

          {activeTab === 'PUNCHES' && (
            <SuspiciousPunchDashboard userSession={userSession} />
          )}

          {activeTab === 'EVENTS' && (
            <AuditViewer userSession={userSession} />
          )}

          {activeTab === 'PRIVILEGES' && (
            <PrivilegeMatrixViewer userSession={userSession} />
          )}

          {activeTab === 'ACCOUNT_LOCKS' && (
            <AccountProtectionViewer userSession={userSession} />
          )}

          {activeTab === 'RISK_REGISTER' && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
          <RiskRegisterViewer userSession={userSession} />
        </motion.div>
      )}

      {activeTab === 'CONTINUOUS_MONITORING' && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
          <ContinuousMonitoringDashboard userSession={userSession} />
        </motion.div>
      )}
      {activeTab === 'COMPLIANCE_CONTROL' && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
          <ComplianceControlViewer session={userSession} />
        </motion.div>
      )}
      {activeTab === 'OBLIGATIONS' && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
          <ComplianceObligationViewer session={userSession} />
        </motion.div>
      )}

      {activeTab === 'DATA_PRIVACY' && (
            <DataPrivacyViewer userSession={userSession} />
          )}
        </div>
      </div>

      {selectedAnomaly && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              Mark as {selectedAnomaly.status.replace(/_/g, ' ')}
            </h3>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Resolution Notes (Required)
              </label>
              <textarea
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)}
                className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                rows={4}
                placeholder="Enter details about this resolution..."
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setSelectedAnomaly(null)}
                className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium"
              >
                Cancel
              </button>
              <button
                onClick={submitResolution}
                disabled={!resolutionNotes.trim() || submitting}
                className="px-4 py-2 text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg font-medium disabled:opacity-50"
              >
                {submitting ? 'Saving...' : 'Save Resolution'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
