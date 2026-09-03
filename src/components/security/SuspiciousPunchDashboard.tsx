import React, { useState, useEffect } from 'react';
import { UserSession, SuspiciousMusterPunch } from '../../types';
import { SuspiciousPunchService } from '../../services/suspiciousPunchService';
import { ShieldAlert, MapPin, Clock, Search, CheckCircle, XCircle, FileText, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface SuspiciousPunchDashboardProps {
  userSession: UserSession;
}

export const SuspiciousPunchDashboard: React.FC<SuspiciousPunchDashboardProps> = ({ userSession }) => {
  const [punches, setPunches] = useState<SuspiciousMusterPunch[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPunch, setSelectedPunch] = useState<SuspiciousMusterPunch | null>(null);
  const [resolveNote, setResolveNote] = useState('');
  const [resolving, setResolving] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('DETECTED');

  const loadData = async () => {
    setLoading(true);
    const data = await SuspiciousPunchService.getSuspiciousPunches(userSession, userSession.companyId);
    setPunches(data);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [userSession]);

  const handleResolve = async (status: 'FALSE_POSITIVE' | 'CONFIRMED_ANOMALY' | 'RESOLVED') => {
    if (!selectedPunch) return;
    setResolving(true);
    const ok = await SuspiciousPunchService.resolveAnomaly(userSession, userSession.companyId, selectedPunch.id, status, resolveNote);
    if (ok) {
      setSelectedPunch(null);
      setResolveNote('');
      await loadData();
    }
    setResolving(false);
  };

  const filteredPunches = punches.filter(p => filterStatus === 'ALL' || p.status === filterStatus);

  const getSeverityStyle = (severity: string) => {
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
      case 'DETECTED': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'UNDER_REVIEW': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'FALSE_POSITIVE': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'CONFIRMED_ANOMALY': return 'bg-red-100 text-red-800 border-red-200';
      case 'RESOLVED': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-100 overflow-hidden mt-6">
      <div className="p-4 border-b border-gray-100 bg-gray-50 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-red-600" />
          <h3 className="font-semibold text-gray-900">Suspicious Muster Punches</h3>
        </div>
        
        <div className="flex flex-wrap gap-3">
          <select 
            value={filterStatus} 
            onChange={e => setFilterStatus(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 bg-white dark:bg-slate-900"
          >
            <option value="ALL">All Statuses</option>
            <option value="DETECTED">Pending Review</option>
            <option value="UNDER_REVIEW">Under Review</option>
            <option value="CONFIRMED_ANOMALY">Confirmed Anomalies</option>
            <option value="FALSE_POSITIVE">False Positives</option>
            <option value="RESOLVED">Resolved</option>
          </select>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-50/50 text-gray-600 font-medium border-b border-gray-100">
            <tr>
              <th className="px-4 py-3">Timestamp / Score</th>
              <th className="px-4 py-3">Employee / Site</th>
              <th className="px-4 py-3">Anomaly Type</th>
              <th className="px-4 py-3">Evidence</th>
              <th className="px-4 py-3 text-right">Status & Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600 mx-auto"></div>
                </td>
              </tr>
            ) : filteredPunches.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                  No suspicious punches found.
                </td>
              </tr>
            ) : (
              filteredPunches.map(punch => (
                <tr key={punch.id} className="hover:bg-gray-50/80 transition-colors">
                  <td className="px-4 py-4 whitespace-nowrap text-gray-500 text-xs">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-1 font-medium text-gray-900">
                        <Clock className="w-3 h-3" />
                        {new Date(punch.punchTimestamp).toLocaleString()}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`px-2 py-0.5 text-[11px] font-bold rounded border ${getSeverityStyle(punch.severity)}`}>
                          {punch.severity}
                        </span>
                        <span className="text-[11px] font-bold text-gray-500 border border-gray-200 px-1 rounded">
                          SCORE: {punch.riskScore}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="font-medium text-indigo-600 font-mono">{punch.employeeId}</div>
                    <div className="text-xs text-gray-500 flex items-center gap-1 mt-1"><MapPin className="w-3 h-3"/> {punch.siteId}</div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex flex-col gap-1">
                      <span className="text-xs font-semibold text-red-700 bg-red-50 px-2 py-0.5 rounded-full inline-block w-fit">
                        {punch.anomalyType}
                      </span>
                      <span className="text-[11px] text-gray-400 font-mono mt-1">{punch.punchType}</span>
                    </div>
                  </td>
                  <td className="px-4 py-4 max-w-xs text-xs text-gray-600">
                    <div className="truncate" title={punch.evidence}>{punch.evidence}</div>
                    {punch.correlationId && (
                       <div className="text-[11px] text-gray-400 mt-1 font-mono">Corr: {punch.correlationId}</div>
                    )}
                  </td>
                  <td className="px-4 py-4 text-right">
                    <div className="flex flex-col items-end gap-2">
                       <span className={`px-2 py-0.5 text-[11px] font-bold rounded border ${getStatusStyle(punch.status)}`}>
                         {punch.status}
                       </span>
                       <button 
                         onClick={() => setSelectedPunch(punch)}
                         className="text-xs text-indigo-600 font-medium hover:text-indigo-800"
                       >
                         Investigate
                       </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Investigation Modal */}
      <AnimatePresence>
        {selectedPunch && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <ShieldAlert className="w-5 h-5 text-red-600" />
                    Security Investigation
                  </h3>
                  <p className="text-sm text-gray-500 font-mono mt-1">ID: {selectedPunch.id}</p>
                </div>
                <button
                  onClick={() => setSelectedPunch(null)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto max-h-[60vh] space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                    <label className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Employee ID</label>
                    <div className="mt-1 font-medium font-mono text-indigo-600">{selectedPunch.employeeId}</div>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                    <label className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Site Context</label>
                    <div className="mt-1 font-medium text-gray-900">{selectedPunch.siteId}</div>
                  </div>
                  <div className="bg-red-50 p-4 rounded-xl border border-red-100">
                    <label className="text-xs text-red-500 uppercase tracking-wider font-semibold">Anomaly Profile</label>
                    <div className="mt-1 font-bold text-red-800">{selectedPunch.anomalyType}</div>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                    <label className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Risk Score</label>
                    <div className="mt-1 flex items-center gap-2">
                       <span className="font-bold text-gray-900 text-lg">{selectedPunch.riskScore}</span>
                       <span className={`px-2 py-0.5 text-[11px] font-bold rounded border ${getSeverityStyle(selectedPunch.severity)}`}>
                          {selectedPunch.severity}
                       </span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-semibold text-gray-900 mb-2">Detection Evidence</h4>
                  <div className="bg-gray-900 text-gray-300 p-4 rounded-xl font-mono text-sm border border-gray-800">
                    {selectedPunch.evidence}
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
                     <AlertTriangle className="w-4 h-4 text-orange-500"/>
                     Resolution Action
                  </h4>
                  {selectedPunch.status === 'DETECTED' || selectedPunch.status === 'UNDER_REVIEW' ? (
                    <div className="space-y-4">
                      <textarea 
                        value={resolveNote}
                        onChange={e => setResolveNote(e.target.value)}
                        placeholder="Enter investigation findings and justification for your decision..."
                        className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                        rows={3}
                      />
                      <div className="flex gap-3">
                        <button
                          onClick={() => handleResolve('FALSE_POSITIVE')}
                          disabled={resolving || !resolveNote.trim()}
                          className="flex-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 py-2.5 rounded-xl font-medium transition-colors disabled:opacity-50"
                        >
                          Mark as False Positive
                        </button>
                        <button
                          onClick={() => handleResolve('CONFIRMED_ANOMALY')}
                          disabled={resolving || !resolveNote.trim()}
                          className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2.5 rounded-xl font-medium transition-colors disabled:opacity-50"
                        >
                          Confirm Anomaly (HR Escalation)
                        </button>
                      </div>
                      <p className="text-xs text-gray-500 text-center">
                        Note: Confirming an anomaly does not automatically delete the attendance punch. It generates an immutable audit and may trigger HR review/BPM workflows for payroll adjustment.
                      </p>
                    </div>
                  ) : (
                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`px-2 py-0.5 text-xs font-bold rounded border ${getStatusStyle(selectedPunch.status)}`}>
                          {selectedPunch.status}
                        </span>
                        <span className="text-xs text-gray-500">by {selectedPunch.reviewedBy} at {selectedPunch.reviewedAt ? new Date(selectedPunch.reviewedAt).toLocaleString() : ''}</span>
                      </div>
                      <p className="text-sm text-gray-700">{selectedPunch.resolution}</p>
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
