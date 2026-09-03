import React, { useState } from 'react';
import { 
  X, 
  ShieldCheck, 
  MapPin, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  User, 
  Building, 
  Printer, 
  Lock, 
  AlertCircle,
  FileText
} from 'lucide-react';
import { PatrolTourRecord, UserSession } from '../../types';

interface PatrolTourDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  tour: PatrolTourRecord | null;
  userSession: UserSession;
  onOverrideTour?: (tourId: string, reason: string) => Promise<boolean>;
}

export const PatrolTourDetailModal: React.FC<PatrolTourDetailModalProps> = ({
  isOpen,
  onClose,
  tour,
  userSession,
  onOverrideTour
}) => {
  if (!isOpen || !tour) return null;

  const [isOverrideOpen, setIsOverrideOpen] = useState<boolean>(false);
  const [overrideReason, setOverrideReason] = useState<string>('');
  const [isSubmittingOverride, setIsSubmittingOverride] = useState<boolean>(false);
  const [overrideError, setOverrideError] = useState<string>('');

  const isSupervisorOrAdmin = 
    userSession.role === 'SUPER_ADMIN' || 
    userSession.role === 'COMPANY_ADMIN' || 
    userSession.role === 'OPS_MANAGER' || 
    userSession.role === 'FIELD_OFFICER' ||
    userSession.role === 'SUPERVISOR' ||
    userSession.role === 'SITE_IN_CHARGE';

  const handlePrint = () => {
    window.print();
  };

  const handleExecuteOverride = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!overrideReason.trim()) {
      setOverrideError('Mandatory override justification required.');
      return;
    }

    if (!onOverrideTour) return;

    setIsSubmittingOverride(true);
    setOverrideError('');

    const ok = await onOverrideTour(tour.id, overrideReason.trim());
    setIsSubmittingOverride(false);

    if (ok) {
      setIsOverrideOpen(false);
      onClose();
    } else {
      setOverrideError('Failed to execute supervisor override. Please check permissions.');
    }
  };

  const completedCount = tour.completedCheckpointsCount || (tour.checkpointScans?.filter((s: any) => s.status === 'COMPLETED').length || 0);
  const totalCount = tour.totalCheckpoints || 1;
  const completionPercent = tour.completionPercentage ?? Math.round((completedCount / totalCount) * 100);

  const getStatusBadge = (status: PatrolTourRecord['status']) => {
    switch (status) {
      case 'COMPLETED':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">COMPLETED</span>;
      case 'IN_PROGRESS':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200">IN PROGRESS</span>;
      case 'INCOMPLETE':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">INCOMPLETE</span>;
      case 'MISSED':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200">MISSED</span>;
      default:
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-black dark:text-slate-200 border border-slate-200">{status}</span>;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-3xl w-full overflow-hidden border border-slate-200 my-6 animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="bg-slate-900 px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-indigo-600 rounded-xl text-white shadow">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-mono text-indigo-300">Tour #{tour.tourNumber}</span>
                {getStatusBadge(tour.status)}
                {tour.isOverridden && (
                  <span className="px-2 py-0.5 rounded text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    OVERRIDDEN
                  </span>
                )}
              </div>
              <h3 className="font-bold text-lg text-white">
                {tour.patrolPlanName || `Patrol Tour ${tour.tourNumber}`}
              </h3>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handlePrint}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
              title="Print Tour Report"
            >
              <Printer className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6">
          
          {/* Key Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 bg-white dark:bg-slate-950 border border-slate-200 rounded-xl">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Site Location</span>
              <span className="text-sm font-bold text-black dark:text-white truncate block mt-0.5">{tour.siteName}</span>
            </div>

            <div className="p-3.5 bg-white dark:bg-slate-950 border border-slate-200 rounded-xl">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Assigned Guard</span>
              <span className="text-sm font-bold text-black dark:text-white truncate block mt-0.5">{tour.assignedGuardName || 'Unassigned'}</span>
            </div>

            <div className="p-3.5 bg-white dark:bg-slate-950 border border-slate-200 rounded-xl">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Completion</span>
              <span className="text-sm font-bold text-indigo-600 block mt-0.5">
                {completedCount} / {totalCount} ({completionPercent}%)
              </span>
            </div>

            <div className="p-3.5 bg-white dark:bg-slate-950 border border-slate-200 rounded-xl">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Exceptions</span>
              <span className="text-sm font-bold block mt-0.5 text-black dark:text-white">
                {(tour.exceptionsDetected?.length || 0) === 0 ? (
                  <span className="text-emerald-600 font-semibold">None (Clean)</span>
                ) : (
                  <span className="text-amber-600 font-semibold">{tour.exceptionsDetected?.length} Exceptions</span>
                )}
              </span>
            </div>
          </div>

          {/* Timestamps & Remarks */}
          <div className="bg-white dark:bg-slate-950 p-4 rounded-xl border border-slate-200 text-xs text-slate-600 dark:text-slate-400 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <strong>Started:</strong> {tour.actualStart ? new Date(tour.actualStart).toLocaleString() : 'Not Started'}
              </div>
              <div>
                <strong>Ended:</strong> {tour.actualEnd ? new Date(tour.actualEnd).toLocaleString() : 'In Progress'}
              </div>
            </div>
            {tour.remarks && (
              <div className="pt-2 border-t border-slate-200">
                <strong>Officer Remarks:</strong> {tour.remarks}
              </div>
            )}
            {tour.isOverridden && (
              <div className="pt-2 border-t border-amber-200 text-amber-900 bg-amber-50 p-2.5 rounded-lg">
                <strong>Supervisor Override:</strong> {tour.overrideReason} (By {tour.overriddenByName} at {new Date(tour.overriddenAt || '').toLocaleString()})
              </div>
            )}
          </div>

          {/* Exceptions Detected Banner */}
          {tour.exceptionsDetected && tour.exceptionsDetected.length > 0 && (
            <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl flex items-start space-x-2.5 text-xs text-amber-900">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Detected Tour Exceptions: </span>
                <span>{tour.exceptionsDetected.join(', ')}</span>
              </div>
            </div>
          )}

          {/* Checkpoint Scans Table */}
          <div>
            <h4 className="text-xs font-bold text-slate-900 dark:text-slate-300 uppercase tracking-wider mb-2.5">
              Checkpoint Audit Log ({tour.checkpointScans?.length || 0} Records)
            </h4>

            {(!tour.checkpointScans || tour.checkpointScans.length === 0) ? (
              <div className="p-6 bg-white dark:bg-slate-950 rounded-xl border border-slate-200 text-center text-xs text-slate-500 dark:text-slate-400">
                No checkpoints have been scanned for this tour yet.
              </div>
            ) : (
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-100 text-slate-600 dark:text-slate-400 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">Seq #</th>
                      <th className="py-2.5 px-3">Checkpoint</th>
                      <th className="py-2.5 px-3">Scanned Time</th>
                      <th className="py-2.5 px-3">Geofence Status</th>
                      <th className="py-2.5 px-3">Sequence</th>
                      <th className="py-2.5 px-3">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-900 dark:text-slate-300">
                    {tour.checkpointScans.map((scan: any, idx: number) => (
                      <tr key={scan.checkpointId || idx} className="hover:bg-white dark:bg-slate-950/80">
                        <td className="py-2.5 px-3 font-bold font-mono text-black dark:text-white">#{scan.sequenceOrder}</td>
                        <td className="py-2.5 px-3">
                          <span className="font-semibold text-black dark:text-white block">{scan.checkpointName}</span>
                          <span className="font-mono text-[11px] text-slate-400">{scan.code}</span>
                        </td>
                        <td className="py-2.5 px-3 font-mono text-xs">
                          {new Date(scan.scannedAt).toLocaleTimeString()}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                            scan.geofenceStatus === 'WITHIN_GEOFENCE'
                              ? 'bg-emerald-100 text-emerald-800'
                              : scan.geofenceStatus === 'OUTSIDE_GEOFENCE'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-slate-100 text-slate-600'
                          }`}>
                            {scan.geofenceStatus === 'WITHIN_GEOFENCE' ? '✓ In Geofence' : '⚠ Off-site'}
                            {scan.distanceFromTargetMeters !== undefined && ` (${scan.distanceFromTargetMeters}m)`}
                          </span>
                        </td>
                        <td className="py-2.5 px-3">
                          <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                            scan.sequenceStatus === 'IN_SEQUENCE'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}>
                            {scan.sequenceStatus || 'IN_SEQUENCE'}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-xs text-slate-500 dark:text-slate-400 max-w-[150px] truncate">
                          {scan.remarks || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Supervisor Override Form */}
          {isOverrideOpen && (
            <form onSubmit={handleExecuteOverride} className="p-4 bg-amber-50 border-2 border-amber-300 rounded-2xl space-y-3">
              <div className="flex items-center space-x-2 text-amber-900 font-bold text-sm">
                <Lock className="w-4 h-4 text-amber-700" />
                <span>Authorize Supervisor Patrol Override</span>
              </div>
              <p className="text-xs text-amber-800">
                Supervisor override will mark this patrol tour as COMPLETED. This action is permanently logged to the system audit trail.
              </p>

              {overrideError && (
                <div className="p-2 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg">
                  {overrideError}
                </div>
              )}

              <input
                type="text"
                value={overrideReason}
                onChange={e => setOverrideReason(e.target.value)}
                placeholder="Reason for override (e.g. Emergency response required officer diversion, gate 4 key unavailable)"
                className="w-full px-3.5 py-2 bg-white dark:bg-slate-900 border border-amber-300 rounded-xl text-xs text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                required
              />

              <div className="flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsOverrideOpen(false)}
                  className="px-3 py-1.5 text-xs font-medium text-amber-900 bg-white dark:bg-slate-900 border border-amber-300 rounded-lg hover:bg-amber-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingOverride}
                  className="px-4 py-1.5 text-xs font-bold text-white bg-amber-600 rounded-lg hover:bg-amber-700 shadow-sm disabled:opacity-50"
                >
                  {isSubmittingOverride ? 'Recording...' : 'Authorize Override'}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="bg-white dark:bg-slate-950 px-6 py-4 border-t border-slate-200 flex items-center justify-between">
          <div>
            {!tour.isOverridden && (tour.status === 'INCOMPLETE' || tour.status === 'MISSED') && isSupervisorOrAdmin && !isOverrideOpen && (
              <button
                type="button"
                onClick={() => setIsOverrideOpen(true)}
                className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-bold text-amber-800 bg-amber-100 hover:bg-amber-200 border border-amber-300 rounded-lg transition-colors"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Supervisor Override</span>
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-900 dark:text-slate-300 bg-white dark:bg-slate-900 border border-slate-300 rounded-xl hover:bg-slate-100 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
