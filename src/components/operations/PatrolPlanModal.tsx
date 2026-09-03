import React, { useState } from 'react';
import { X, ShieldCheck, ListOrdered, MapPin, Clock, CheckSquare, AlertCircle, Save } from 'lucide-react';
import { PatrolPlanRecord, PatrolCheckpointRecord, SiteRecord, ShiftRecord, UserSession } from '../../types';

interface PatrolPlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (plan: PatrolPlanRecord) => Promise<boolean>;
  existingPlan?: PatrolPlanRecord | null;
  sites: SiteRecord[];
  allCheckpoints: PatrolCheckpointRecord[];
  shifts: ShiftRecord[];
  userSession: UserSession;
  selectedSiteId: string;
}

export const PatrolPlanModal: React.FC<PatrolPlanModalProps> = ({
  isOpen,
  onClose,
  onSave,
  existingPlan,
  sites,
  allCheckpoints,
  shifts,
  userSession,
  selectedSiteId
}) => {
  if (!isOpen) return null;

  const defaultSiteId = existingPlan?.siteId || (selectedSiteId !== 'ALL' ? selectedSiteId : (sites[0]?.id || ''));

  const [siteId, setSiteId] = useState<string>(defaultSiteId);
  const [planName, setPlanName] = useState<string>(existingPlan?.planName || '');
  const [description, setDescription] = useState<string>(existingPlan?.description || '');
  const [frequency, setFrequency] = useState<PatrolPlanRecord['frequency']>(existingPlan?.frequency || 'PER_SHIFT');
  const [intervalMinutes, setIntervalMinutes] = useState<number>(existingPlan?.intervalMinutes || 60);
  const [shiftId, setShiftId] = useState<string>(existingPlan?.shiftId || '');
  const [selectedCheckpointIds, setSelectedCheckpointIds] = useState<string[]>(
    existingPlan?.checkpointIds || allCheckpoints.filter(cp => cp.siteId === defaultSiteId).map(cp => cp.id)
  );
  const [requireGeofence, setRequireGeofence] = useState<boolean>(existingPlan?.requireGeofence ?? true);
  const [enforceSequence, setEnforceSequence] = useState<boolean>(existingPlan?.enforceSequence ?? true);
  const [minCompletionPercentage, setMinCompletionPercentage] = useState<number>(existingPlan?.minCompletionPercentage ?? 80);
  const [status, setStatus] = useState<'ACTIVE' | 'INACTIVE'>(existingPlan?.status || 'ACTIVE');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  // Filter available checkpoints for the currently chosen site
  const siteCheckpoints = allCheckpoints
    .filter(cp => cp.siteId === siteId)
    .sort((a, b) => a.sequenceOrder - b.sequenceOrder);

  const handleSiteChange = (newSiteId: string) => {
    setSiteId(newSiteId);
    // select all checkpoints of new site by default
    const siteCps = allCheckpoints.filter(cp => cp.siteId === newSiteId).map(cp => cp.id);
    setSelectedCheckpointIds(siteCps);
  };

  const toggleCheckpoint = (cpId: string) => {
    if (selectedCheckpointIds.includes(cpId)) {
      setSelectedCheckpointIds(prev => prev.filter(id => id !== cpId));
    } else {
      setSelectedCheckpointIds(prev => [...prev, cpId]);
    }
  };

  const handleSelectAllCheckpoints = () => {
    if (selectedCheckpointIds.length === siteCheckpoints.length) {
      setSelectedCheckpointIds([]);
    } else {
      setSelectedCheckpointIds(siteCheckpoints.map(c => c.id));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!planName.trim()) {
      setErrorMsg('Plan Name is required.');
      return;
    }
    if (!siteId) {
      setErrorMsg('Site selection is required.');
      return;
    }
    if (selectedCheckpointIds.length === 0) {
      setErrorMsg('Please select at least one checkpoint for this patrol plan.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    const siteObj = sites.find(s => s.id === siteId);
    const shiftObj = shifts.find(s => s.id === shiftId);

    const planPayload: PatrolPlanRecord = {
      id: existingPlan?.id || `PLAN-${Date.now()}`,
      companyId: userSession.companyId,
      assignedRegionId: userSession.assignedRegionId,
      assignedBranchId: userSession.assignedBranchId,
      siteId,
      siteName: siteObj?.name || 'Site',
      planName: planName.trim(),
      description: description.trim(),
      frequency,
      intervalMinutes: frequency === 'CUSTOM_INTERVAL' || frequency === 'HOURLY' ? intervalMinutes : undefined,
      shiftId: shiftId || undefined,
      shiftName: shiftObj?.shiftName,
      checkpointIds: selectedCheckpointIds,
      requireGeofence,
      enforceSequence,
      minCompletionPercentage: Number(minCompletionPercentage) || 80,
      status,
      createdBy: existingPlan?.createdBy || userSession.userId,
      createdByName: existingPlan?.createdByName || userSession.fullName,
      createdAt: existingPlan?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const success = await onSave(planPayload);
    setIsSubmitting(false);

    if (success) {
      onClose();
    } else {
      setErrorMsg('Failed to save patrol plan. Please try again.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/75 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden border border-slate-200 my-8 animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="bg-slate-900 px-6 py-4 flex items-center justify-between text-white">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-indigo-600 rounded-lg">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-lg">{existingPlan ? 'Edit Patrol Plan' : 'Create Patrol Plan'}</h3>
              <p className="text-xs text-slate-400">Configure guard patrol routing, checkpoints, and validation rules</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {errorMsg && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-center space-x-2 text-sm text-rose-700">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Site */}
            <div>
              <label className="block text-xs font-semibold text-slate-900 dark:text-slate-300 uppercase tracking-wider mb-1">
                Target Site *
              </label>
              <select
                value={siteId}
                onChange={e => handleSiteChange(e.target.value)}
                disabled={!!existingPlan}
                className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-950 border border-slate-300 rounded-xl text-sm font-medium text-black dark:text-white focus:bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                required
              >
                {sites.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            {/* Plan Name */}
            <div>
              <label className="block text-xs font-semibold text-slate-900 dark:text-slate-300 uppercase tracking-wider mb-1">
                Plan Name *
              </label>
              <input
                type="text"
                value={planName}
                onChange={e => setPlanName(e.target.value)}
                placeholder="e.g. Night Perimeter Security Tour"
                className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-950 border border-slate-300 rounded-xl text-sm text-black dark:text-white focus:bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                required
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-900 dark:text-slate-300 uppercase tracking-wider mb-1">
              Description / Instructions
            </label>
            <input
              type="text"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="e.g. Inspect all perimeter gates, emergency exits, and warehouse locks"
              className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-950 border border-slate-300 rounded-xl text-sm text-black dark:text-white focus:bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Frequency */}
            <div>
              <label className="block text-xs font-semibold text-slate-900 dark:text-slate-300 uppercase tracking-wider mb-1">
                Tour Frequency
              </label>
              <select
                value={frequency}
                onChange={e => setFrequency(e.target.value as any)}
                className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-950 border border-slate-300 rounded-xl text-sm font-medium text-black dark:text-white focus:bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="PER_SHIFT">Per Shift</option>
                <option value="HOURLY">Hourly</option>
                <option value="DAILY">Daily</option>
                <option value="CUSTOM_INTERVAL">Custom Interval</option>
              </select>
            </div>

            {/* Custom Interval */}
            {(frequency === 'CUSTOM_INTERVAL' || frequency === 'HOURLY') && (
              <div>
                <label className="block text-xs font-semibold text-slate-900 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Interval (Minutes)
                </label>
                <input
                  type="number"
                  min="15"
                  max="1440"
                  value={intervalMinutes}
                  onChange={e => setIntervalMinutes(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-950 border border-slate-300 rounded-xl text-sm text-black dark:text-white focus:bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            )}

            {/* Shift Linkage */}
            <div>
              <label className="block text-xs font-semibold text-slate-900 dark:text-slate-300 uppercase tracking-wider mb-1">
                Associated Shift
              </label>
              <select
                value={shiftId}
                onChange={e => setShiftId(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-950 border border-slate-300 rounded-xl text-sm font-medium text-black dark:text-white focus:bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">All / Any Shift</option>
                {shifts.map(sh => (
                  <option key={sh.id} value={sh.id}>{sh.shiftName} ({sh.startTime} - {sh.endTime})</option>
                ))}
              </select>
            </div>
          </div>

          {/* Verification Rules */}
          <div className="bg-white dark:bg-slate-950 p-4 rounded-xl border border-slate-200 space-y-3">
            <h4 className="text-xs font-bold text-black dark:text-slate-200 uppercase tracking-wider">Operational Rules & Validation</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <label className="flex items-center space-x-2.5 p-2.5 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 cursor-pointer hover:border-indigo-300 transition-colors">
                <input
                  type="checkbox"
                  checked={enforceSequence}
                  onChange={e => setEnforceSequence(e.target.checked)}
                  className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                />
                <span className="text-xs font-medium text-black dark:text-slate-200">Enforce Sequence Order</span>
              </label>

              <label className="flex items-center space-x-2.5 p-2.5 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 cursor-pointer hover:border-indigo-300 transition-colors">
                <input
                  type="checkbox"
                  checked={requireGeofence}
                  onChange={e => setRequireGeofence(e.target.checked)}
                  className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                />
                <span className="text-xs font-medium text-black dark:text-slate-200">Require GPS Geofence</span>
              </label>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Min Completion Pass %
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="range"
                    min="50"
                    max="100"
                    step="5"
                    value={minCompletionPercentage}
                    onChange={e => setMinCompletionPercentage(Number(e.target.value))}
                    className="w-full accent-indigo-600"
                  />
                  <span className="text-xs font-bold text-indigo-600 w-8">{minCompletionPercentage}%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Checkpoint Selection list */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-bold text-slate-900 dark:text-slate-300 uppercase tracking-wider">
                Include Checkpoints ({selectedCheckpointIds.length}/{siteCheckpoints.length} Selected)
              </label>
              {siteCheckpoints.length > 0 && (
                <button
                  type="button"
                  onClick={handleSelectAllCheckpoints}
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                >
                  {selectedCheckpointIds.length === siteCheckpoints.length ? 'Deselect All' : 'Select All'}
                </button>
              )}
            </div>

            {siteCheckpoints.length === 0 ? (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-center text-xs text-amber-800">
                No checkpoints found for this site. Please add checkpoints under the Checkpoints tab first.
              </div>
            ) : (
              <div className="max-h-48 overflow-y-auto space-y-1.5 border border-slate-200 rounded-xl p-2 bg-white dark:bg-slate-950">
                {siteCheckpoints.map(cp => {
                  const isSelected = selectedCheckpointIds.includes(cp.id);
                  return (
                    <div
                      key={cp.id}
                      onClick={() => toggleCheckpoint(cp.id)}
                      className={`flex items-center justify-between p-2.5 rounded-lg border cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-indigo-50/70 border-indigo-300 text-indigo-950 font-medium'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {}}
                          className="w-4 h-4 text-indigo-600 rounded pointer-events-none"
                        />
                        <div className="flex items-center space-x-2">
                          <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-900 dark:text-slate-300 text-xs font-bold flex items-center justify-center">
                            {cp.sequenceOrder}
                          </span>
                          <span className="text-xs font-semibold">{cp.checkpointName}</span>
                          <span className="text-xs font-mono text-slate-400">({cp.code})</span>
                        </div>
                      </div>
                      {cp.locationDescription && (
                        <span className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-[160px]">
                          {cp.locationDescription}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-900 dark:text-slate-300 bg-white dark:bg-slate-900 border border-slate-300 rounded-xl hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || siteCheckpoints.length === 0}
              className="flex items-center space-x-2 px-5 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 shadow-sm transition-all disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{isSubmitting ? 'Saving Plan...' : 'Save Patrol Plan'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
