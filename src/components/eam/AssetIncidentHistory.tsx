import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { XCircle, AlertTriangle, ShieldCheck, Clock, FileText, CheckCircle2 } from 'lucide-react';
import { UserSession, AssetRecord, IncidentReportRecord, SiteRecord } from '../../types';
import { EamIncidentService } from '../../services/eamIncidentService';

interface AssetIncidentHistoryProps {
  session: UserSession;
  companyId: string;
  asset: AssetRecord;
  sites: SiteRecord[];
  onClose: () => void;
}

export function AssetIncidentHistory({ session, companyId, asset, sites, onClose }: AssetIncidentHistoryProps) {
  const [loading, setLoading] = useState(true);
  const [incidents, setIncidents] = useState<IncidentReportRecord[]>([]);
  const [selectedIncident, setSelectedIncident] = useState<IncidentReportRecord | null>(null);

  // Investigation Form State
  const [findings, setFindings] = useState('');
  const [immediateAction, setImmediateAction] = useState('');
  const [eamResolution, setEamResolution] = useState<IncidentReportRecord['eamResolution'] | ''>('');
  const [closeIncident, setCloseIncident] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Recovery Form State
  const [recoveryLocation, setRecoveryLocation] = useState('');
  const [recoveryNotes, setRecoveryNotes] = useState('');

  useEffect(() => {
    loadIncidents();
  }, [asset.id]);

  const loadIncidents = async () => {
    setLoading(true);
    try {
      const data = await EamIncidentService.getAssetIncidents(companyId, asset.id);
      setIncidents(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateInvestigation = async () => {
    if (!selectedIncident) return;
    try {
      setActionLoading(true);
      await EamIncidentService.updateInvestigation(companyId, selectedIncident.id, session, {
        findings,
        immediateAction,
        eamResolution: eamResolution || undefined,
        closeIncident
      });
      setSelectedIncident(null);
      await loadIncidents();
    } catch (err: any) {
      alert(err.message || 'Failed to update investigation.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReportRecovery = async () => {
    if (!selectedIncident) return;
    try {
      setActionLoading(true);
      await EamIncidentService.reportRecovery(companyId, selectedIncident.id, asset.id, session, {
        location: recoveryLocation,
        conditionNotes: recoveryNotes
      });
      setRecoveryLocation('');
      setRecoveryNotes('');
      setSelectedIncident(null);
      await loadIncidents();
    } catch (err: any) {
      alert(err.message || 'Failed to report recovery.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleVerifyRecovery = async (condition: any) => {
    if (!selectedIncident) return;
    try {
      setActionLoading(true);
      await EamIncidentService.verifyRecovery(companyId, selectedIncident.id, asset.id, session, condition);
      setSelectedIncident(null);
      await loadIncidents();
      alert('Recovery verified successfully. Asset state has been updated.');
    } catch (err: any) {
      alert(err.message || 'Failed to verify recovery.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateRepair = async () => {
    if (!selectedIncident) return;
    try {
      setActionLoading(true);
      await EamIncidentService.createRepairWorkOrder(
        companyId, 
        selectedIncident.id, 
        asset.id, 
        selectedIncident.siteId, 
        `Repair for ${selectedIncident.title}`, 
        session
      );
      setSelectedIncident(null);
      await loadIncidents();
      alert('Repair Work Order generated.');
    } catch (err: any) {
      alert(err.message || 'Failed to generate repair work order.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleMarkReplacement = async () => {
    if (!selectedIncident) return;
    if (!confirm('Are you sure you want to mark this asset as requiring replacement? This will retire the asset.')) return;
    try {
      setActionLoading(true);
      await EamIncidentService.markReplacementRequired(companyId, selectedIncident.id, asset.id, session);
      setSelectedIncident(null);
      await loadIncidents();
      alert('Asset marked for replacement and retired.');
    } catch (err: any) {
      alert(err.message || 'Failed to mark replacement.');
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'CLOSED': return 'bg-slate-100 text-slate-700';
      case 'REPORTED': return 'bg-red-100 text-red-700';
      case 'UNDER_INVESTIGATION': return 'bg-amber-100 text-amber-700';
      default: return 'bg-blue-100 text-blue-700';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden"
      >
        <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 p-6 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Incident History</h2>
            <p className="text-sm text-slate-500">Asset: {asset.assetName} ({asset.assetCode})</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <XCircle className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-auto p-6 flex gap-6 flex-col md:flex-row">
          {/* Incident List */}
          <div className="w-full md:w-1/3 border-r border-slate-200 dark:border-slate-700 pr-6 space-y-3 h-full overflow-y-auto">
            <h3 className="font-semibold text-slate-900 dark:text-white mb-4">Recorded Incidents</h3>
            {loading ? (
              <p className="text-sm text-slate-500">Loading...</p>
            ) : incidents.length === 0 ? (
              <p className="text-sm text-slate-500 bg-slate-50 p-4 rounded-lg border border-slate-100">No incidents recorded for this asset.</p>
            ) : (
              incidents.map(inc => (
                <div 
                  key={inc.id}
                  onClick={() => {
                    setSelectedIncident(inc);
                    setFindings(inc.rootCause || '');
                    setImmediateAction(inc.immediateAction || '');
                    setEamResolution(inc.eamResolution || '');
                    setCloseIncident(inc.status === 'CLOSED');
                  }}
                  className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedIncident?.id === inc.id 
                      ? 'bg-indigo-50 border-indigo-200 dark:bg-indigo-900/20 dark:border-indigo-800' 
                      : 'bg-white border-slate-200 hover:bg-slate-50 dark:bg-slate-800 dark:border-slate-700'
                  }`}
                >
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-medium text-sm text-slate-900 dark:text-white truncate" title={inc.title}>{inc.title}</span>
                  </div>
                  <div className="flex flex-wrap gap-1 mb-2">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${getStatusColor(inc.status)}`}>
                      {inc.status}
                    </span>
                    {inc.lossDamageType && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-50 text-red-700">
                        {inc.lossDamageType}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500">{new Date(inc.reportedAt).toLocaleDateString()}</p>
                </div>
              ))
            )}
          </div>

          {/* Incident Details & Actions */}
          <div className="w-full md:w-2/3 h-full overflow-y-auto pl-2 pr-2">
            {!selectedIncident ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-500">
                <FileText className="w-12 h-12 mb-3 text-slate-300" />
                <p>Select an incident to view details and investigate.</p>
              </div>
            ) : (
              <div className="space-y-6 pb-6">
                <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
                  <h3 className="font-bold text-lg mb-2">{selectedIncident.title}</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                    <div><span className="text-slate-500">Reported By:</span> {selectedIncident.reportedByName}</div>
                    <div><span className="text-slate-500">Date:</span> {new Date(selectedIncident.reportedAt).toLocaleString()}</div>
                    <div><span className="text-slate-500">Type:</span> {selectedIncident.lossDamageType}</div>
                    <div><span className="text-slate-500">Severity:</span> {selectedIncident.severity}</div>
                    {selectedIncident.relatedWorkOrderId && (
                      <div className="col-span-2 text-indigo-600 font-medium">Work Order: {selectedIncident.relatedWorkOrderId}</div>
                    )}
                  </div>
                  <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{selectedIncident.description}</p>
                </div>

                {/* Status Specific Action Panels */}
                {selectedIncident.status !== 'CLOSED' && (
                  <>
                    {/* Recovery Panel (if Lost/Missing) */}
                    {(selectedIncident.lossDamageType === 'LOST' || selectedIncident.lossDamageType === 'MISSING' || selectedIncident.lossDamageType === 'STOLEN') && (
                      <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                        <h4 className="font-semibold text-emerald-800 mb-3 flex items-center gap-2">
                          <ShieldCheck className="w-4 h-4" /> Asset Recovery
                        </h4>
                        
                        {selectedIncident.recoveryStatus === 'NOT_RECOVERED' && (
                          <div className="space-y-3">
                            <input
                              type="text"
                              placeholder="Recovery Location"
                              value={recoveryLocation}
                              onChange={e => setRecoveryLocation(e.target.value)}
                              className="w-full px-3 py-2 text-sm border rounded-lg"
                            />
                            <textarea
                              placeholder="Condition Notes"
                              rows={2}
                              value={recoveryNotes}
                              onChange={e => setRecoveryNotes(e.target.value)}
                              className="w-full px-3 py-2 text-sm border rounded-lg"
                            />
                            <button
                              onClick={handleReportRecovery}
                              disabled={actionLoading || !recoveryLocation}
                              className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium disabled:opacity-50"
                            >
                              Report as Recovered
                            </button>
                          </div>
                        )}
                        
                        {selectedIncident.recoveryStatus === 'RECOVERY_REPORTED' && (
                          <div className="space-y-3">
                            <p className="text-sm text-emerald-700 font-medium bg-emerald-100 p-2 rounded">
                              Recovery reported. Verify condition to reinstate asset.
                            </p>
                            <div className="flex gap-2">
                              <button onClick={() => handleVerifyRecovery('GOOD')} className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium">Verify: Good</button>
                              <button onClick={() => handleVerifyRecovery('FAIR')} className="px-4 py-2 bg-emerald-500 text-white rounded-lg text-sm font-medium">Verify: Fair</button>
                              <button onClick={() => handleVerifyRecovery('POOR')} className="px-4 py-2 bg-emerald-400 text-white rounded-lg text-sm font-medium">Verify: Poor</button>
                              <button onClick={() => handleVerifyRecovery('DAMAGED')} className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium">Verify: Damaged</button>
                            </div>
                          </div>
                        )}

                        {selectedIncident.recoveryStatus === 'RECOVERY_VERIFIED' && (
                          <div className="flex items-center gap-2 text-emerald-700 font-medium">
                            <CheckCircle2 className="w-5 h-5" /> Recovery Verified
                          </div>
                        )}
                      </div>
                    )}

                    {/* Repair/Replace Panel */}
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                      <h4 className="font-semibold text-amber-800 mb-3 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4" /> Corrective Actions
                      </h4>
                      <div className="flex gap-3">
                        {!selectedIncident.relatedWorkOrderId && (
                          <button
                            onClick={handleCreateRepair}
                            disabled={actionLoading}
                            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm font-medium disabled:opacity-50"
                          >
                            Generate Repair Work Order
                          </button>
                        )}
                        {selectedIncident.eamResolution !== 'REPLACED' && (
                          <button
                            onClick={handleMarkReplacement}
                            disabled={actionLoading}
                            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium disabled:opacity-50"
                          >
                            Mark for Replacement (Write-off)
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Investigation & Closure */}
                    <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-4">
                      <h4 className="font-semibold text-slate-800 mb-3">Investigation & Resolution</h4>
                      
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Findings / Root Cause</label>
                        <textarea
                          rows={3}
                          value={findings}
                          onChange={e => setFindings(e.target.value)}
                          className="w-full px-3 py-2 text-sm border rounded-lg"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">EAM Resolution State</label>
                        <select
                          value={eamResolution}
                          onChange={e => setEamResolution(e.target.value as any)}
                          className="w-full px-3 py-2 text-sm border rounded-lg"
                        >
                          <option value="">Select Resolution...</option>
                          <option value="RECOVERED">Recovered</option>
                          <option value="REPAIRED">Repaired</option>
                          <option value="REPLACED">Replaced</option>
                          <option value="WRITTEN_OFF">Written Off</option>
                          <option value="UNRESOLVED">Unresolved</option>
                        </select>
                      </div>

                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="closeIncident"
                          checked={closeIncident}
                          onChange={e => setCloseIncident(e.target.checked)}
                          className="w-4 h-4 text-indigo-600 border-slate-300 rounded"
                        />
                        <label htmlFor="closeIncident" className="text-sm font-medium text-slate-700">Close Incident</label>
                      </div>

                      <button
                        onClick={handleUpdateInvestigation}
                        disabled={actionLoading || (closeIncident && !eamResolution)}
                        className="w-full px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-sm font-medium disabled:opacity-50"
                      >
                        Save Investigation Updates
                      </button>
                    </div>
                  </>
                )}

                {selectedIncident.status === 'CLOSED' && (
                  <div className="bg-slate-100 p-4 rounded-lg border border-slate-200 text-center">
                    <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
                    <h4 className="font-bold text-slate-900">Incident Closed</h4>
                    <p className="text-sm text-slate-500 mt-1">Resolution: {selectedIncident.eamResolution}</p>
                    {selectedIncident.closedByName && (
                      <p className="text-xs text-slate-400 mt-2">Closed by {selectedIncident.closedByName} at {new Date(selectedIncident.closedAt!).toLocaleString()}</p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
