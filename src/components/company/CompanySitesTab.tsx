import React, { useState } from 'react';
import { MapPin, Plus, Search, Edit3, Trash2, CheckCircle2, XCircle, Navigation, Crosshair } from 'lucide-react';
import { SiteRecord, BranchRecord } from '../../types';
import { FirestoreService } from '../../services/firestoreService';

interface CompanySitesTabProps {
  companyId: string;
  sites: SiteRecord[];
  setSites: React.Dispatch<React.SetStateAction<SiteRecord[]>>;
  branches: BranchRecord[];
  onSuccess: (msg: string) => void;
  onError: (msg: string) => void;
  isDark: boolean;
}

export const CompanySitesTab: React.FC<CompanySitesTabProps> = ({
  companyId,
  sites,
  setSites,
  branches,
  onSuccess,
  onError,
  isDark
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [editingSite, setEditingSite] = useState<Partial<SiteRecord> | null>(null);
  const [deletingSiteId, setDeletingSiteId] = useState<string | null>(null);
  const [detectingGps, setDetectingGps] = useState(false);
  const [saving, setSaving] = useState(false);

  const filteredSites = sites.filter(s =>
    (s.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (s.clientName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (s.address || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDetectGps = () => {
    if (!navigator.geolocation) {
      onError('Geolocation is not supported by your browser.');
      return;
    }
    setDetectingGps(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setEditingSite(prev => ({
          ...prev,
          latitude: Number(pos.coords.latitude.toFixed(6)),
          longitude: Number(pos.coords.longitude.toFixed(6)),
          accuracyThreshold: Math.round(pos.coords.accuracy) || 50,
          geofenceEnabled: true
        }));
        setDetectingGps(false);
        onSuccess('GPS coordinates captured from your device.');
      },
      (err) => {
        setDetectingGps(false);
        onError(`GPS Detection failed: ${err.message}`);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSite?.name?.trim()) {
      onError('Site Name is required.');
      return;
    }
    if (!editingSite?.branchId) {
      onError('Please select a Branch Association.');
      return;
    }
    if (editingSite.geofenceEnabled) {
      if (editingSite.latitude === undefined || editingSite.longitude === undefined || isNaN(editingSite.latitude) || isNaN(editingSite.longitude)) {
        onError('Valid Latitude and Longitude are required when Geo-Fencing is enabled.');
        return;
      }
    }

    try {
      setSaving(true);
      const sRecord: SiteRecord = {
        id: editingSite.id || `SITE-${Date.now().toString(36).toUpperCase()}`,
        companyId,
        name: editingSite.name.trim(),
        code: editingSite.code || editingSite.name.trim().toUpperCase().replace(/\s+/g, '_'),
        branchId: editingSite.branchId,
        clientName: editingSite.clientName?.trim() || 'Internal Deployment',
        address: editingSite.address?.trim() || 'Site Premises',
        status: editingSite.status || 'ACTIVE',
        attendanceMode: editingSite.attendanceMode || 'STANDARD',
        geofenceEnabled: editingSite.geofenceEnabled || false,
        latitude: editingSite.latitude !== undefined ? Number(editingSite.latitude) : undefined,
        longitude: editingSite.longitude !== undefined ? Number(editingSite.longitude) : undefined,
        geofenceRadius: editingSite.geofenceRadius ? Number(editingSite.geofenceRadius) : 100,
        accuracyThreshold: editingSite.accuracyThreshold ? Number(editingSite.accuracyThreshold) : 50,
        createdAt: editingSite.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const success = await FirestoreService.saveSite(companyId, sRecord);
      if (success) {
        setSites(prev => {
          const idx = prev.findIndex(s => s.id === sRecord.id);
          if (idx >= 0) {
            const next = [...prev];
            next[idx] = sRecord;
            return next;
          }
          return [...prev, sRecord];
        });
        setEditingSite(null);
        onSuccess(`Site "${sRecord.name}" saved successfully.`);
      } else {
        onError('Failed to save site location.');
      }
    } catch (err: any) {
      console.error('[CompanySitesTab] Save error:', err);
      onError(err?.message || 'Error saving site.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (siteId: string, siteName: string) => {
    try {
      setSaving(true);
      const success = await FirestoreService.deleteSite(companyId, siteId);
      if (success) {
        setSites(prev => prev.filter(s => s.id !== siteId));
        setDeletingSiteId(null);
        onSuccess(`Site "${siteName}" deleted successfully.`);
      } else {
        onError('Failed to delete site.');
      }
    } catch (err: any) {
      console.error('[CompanySitesTab] Delete error:', err);
      onError(err?.message || 'Error deleting site.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (site: SiteRecord) => {
    const nextStatus = site.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    const updated = { ...site, status: nextStatus, updatedAt: new Date().toISOString() };
    try {
      const success = await FirestoreService.saveSite(companyId, updated);
      if (success) {
        setSites(prev => prev.map(s => s.id === site.id ? updated : s));
        onSuccess(`Site "${site.name}" status updated to ${nextStatus}.`);
      } else {
        onError('Failed to update site status.');
      }
    } catch (err: any) {
      onError(err?.message || 'Failed to update site status.');
    }
  };

  return (
    <div className="space-y-4">
      {/* Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold flex items-center gap-2">
            <MapPin className="w-4 h-4 text-indigo-500" />
            <span>Sites & Geofencing Parameters</span>
          </h3>
          <p className="text-xs text-slate-400">Deploy client premises, setup GPS boundaries, and mandate biometric/muster policies.</p>
        </div>

        <div className="flex items-center gap-2">
          <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
            <Search className="w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search sites..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent border-none outline-none text-xs w-36"
            />
          </div>

          <button
            onClick={() => setEditingSite({
              status: 'ACTIVE',
              branchId: branches[0]?.id || '',
              geofenceRadius: 100,
              attendanceMode: 'STANDARD',
              geofenceEnabled: false,
              accuracyThreshold: 50
            })}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-2 transition shadow-md shadow-indigo-600/20 shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Add Site</span>
          </button>
        </div>
      </div>

      {/* Inline Form / Modal */}
      {editingSite && (
        <form onSubmit={handleSave} className={`p-5 rounded-2xl border ${isDark ? 'bg-indigo-950/20 border-indigo-500/30' : 'bg-indigo-50/50 border-indigo-200'} space-y-4`}>
          <h4 className="text-sm font-bold text-indigo-400">
            {editingSite.id ? `Edit Site: ${editingSite.name || ''}` : 'Configure New Deployment Site'}
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block text-slate-400 mb-1 font-medium">Site Name *</label>
              <input
                type="text"
                required
                value={editingSite.name || ''}
                onChange={e => setEditingSite({ ...editingSite, name: e.target.value })}
                placeholder="e.g. Westside Tech Park"
                className={`w-full p-2.5 rounded-xl border ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-300'}`}
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1 font-medium">Branch Association *</label>
              <select
                required
                value={editingSite.branchId || ''}
                onChange={e => setEditingSite({ ...editingSite, branchId: e.target.value })}
                className={`w-full p-2.5 rounded-xl border ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-300'}`}
              >
                <option value="">-- Select Branch --</option>
                {branches.map(b => (
                  <option key={b.id} value={b.id}>{b.name} ({b.city})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-400 mb-1 font-medium">Client / Project Name</label>
              <input
                type="text"
                value={editingSite.clientName || ''}
                onChange={e => setEditingSite({ ...editingSite, clientName: e.target.value })}
                placeholder="e.g. Microsoft India"
                className={`w-full p-2.5 rounded-xl border ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-300'}`}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="md:col-span-2">
              <label className="block text-slate-400 mb-1 font-medium">Premises Physical Address</label>
              <input
                type="text"
                value={editingSite.address || ''}
                onChange={e => setEditingSite({ ...editingSite, address: e.target.value })}
                placeholder="Gate 2, Tech Zone, Sector 4..."
                className={`w-full p-2.5 rounded-xl border ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-300'}`}
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1 font-medium">Attendance Policy Mode</label>
              <select
                value={editingSite.attendanceMode || 'STANDARD'}
                onChange={e => setEditingSite({ ...editingSite, attendanceMode: e.target.value as any })}
                className={`w-full p-2.5 rounded-xl border ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-300'}`}
              >
                <option value="STANDARD">Standard (Any Location)</option>
                <option value="GEO_FENCE">Geo-Fence Boundary Required</option>
                <option value="BIOMETRIC">Biometric Required</option>
                <option value="GEO_FENCE_AND_BIOMETRIC">Geo-Fence + Biometric</option>
                <option value="SUPERVISOR_MUSTER">Supervisor Muster Only</option>
              </select>
            </div>
          </div>

          {/* Geo-fence Section */}
          <div className="p-4 rounded-xl border border-indigo-500/20 bg-indigo-950/10 space-y-3">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 font-bold cursor-pointer text-xs">
                <input
                  type="checkbox"
                  checked={editingSite.geofenceEnabled || false}
                  onChange={e => setEditingSite({ ...editingSite, geofenceEnabled: e.target.checked })}
                  className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                />
                <span>Enable GPS Geo-Fencing for Shifts</span>
              </label>

              <button
                type="button"
                onClick={handleDetectGps}
                disabled={detectingGps}
                className="px-3 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-400 border border-indigo-500/30 text-xs font-semibold flex items-center gap-1.5 transition"
              >
                <Crosshair className={`w-3.5 h-3.5 ${detectingGps ? 'animate-spin' : ''}`} />
                <span>{detectingGps ? 'Detecting...' : 'Detect Current GPS'}</span>
              </button>
            </div>

            {editingSite.geofenceEnabled && (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs pt-2">
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Latitude *</label>
                  <input
                    type="number"
                    step="0.000001"
                    required={editingSite.geofenceEnabled}
                    value={editingSite.latitude !== undefined ? editingSite.latitude : ''}
                    onChange={e => setEditingSite({ ...editingSite, latitude: parseFloat(e.target.value) })}
                    placeholder="19.0760"
                    className={`w-full p-2.5 rounded-xl border font-mono ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-white border-slate-200'}`}
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Longitude *</label>
                  <input
                    type="number"
                    step="0.000001"
                    required={editingSite.geofenceEnabled}
                    value={editingSite.longitude !== undefined ? editingSite.longitude : ''}
                    onChange={e => setEditingSite({ ...editingSite, longitude: parseFloat(e.target.value) })}
                    placeholder="72.8777"
                    className={`w-full p-2.5 rounded-xl border font-mono ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-white border-slate-200'}`}
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Radius (meters)</label>
                  <input
                    type="number"
                    value={editingSite.geofenceRadius || 100}
                    onChange={e => setEditingSite({ ...editingSite, geofenceRadius: parseInt(e.target.value, 10) })}
                    className={`w-full p-2.5 rounded-xl border ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-white border-slate-200'}`}
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Accuracy Threshold (m)</label>
                  <input
                    type="number"
                    value={editingSite.accuracyThreshold || 50}
                    onChange={e => setEditingSite({ ...editingSite, accuracyThreshold: parseInt(e.target.value, 10) })}
                    className={`w-full p-2.5 rounded-xl border ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-white border-slate-200'}`}
                  />
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-2 justify-end pt-2">
            <button
              type="button"
              onClick={() => setEditingSite(null)}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Site'}
            </button>
          </div>
        </form>
      )}

      {/* Delete Confirmation Modal */}
      {deletingSiteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className={`w-full max-w-sm p-6 rounded-2xl border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'} space-y-4`}>
            <h4 className="text-sm font-bold text-rose-500">Confirm Site Deletion</h4>
            <p className="text-xs text-slate-400">
              Are you sure you want to permanently remove this deployment site? Guard assignments for this site may be affected.
            </p>
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setDeletingSiteId(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const st = sites.find(s => s.id === deletingSiteId);
                  if (st) handleDelete(st.id, st.name);
                }}
                disabled={saving}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold"
              >
                {saving ? 'Deleting...' : 'Delete Site'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Site Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredSites.map(s => {
          const branchName = branches.find(b => b.id === s.branchId)?.name || s.branchId;
          return (
            <div
              key={s.id}
              className={`p-4 rounded-2xl border ${isDark ? 'bg-slate-900 border-slate-800 hover:border-indigo-500/50' : 'bg-white border-slate-200 hover:border-indigo-400'} transition flex flex-col justify-between group space-y-3`}
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 group-hover:text-indigo-400 transition-colors">
                      {s.name}
                    </h4>
                    <p className="text-[11px] font-medium text-slate-400">Branch: {branchName}</p>
                  </div>
                  <button
                    onClick={() => handleToggleStatus(s)}
                    title={`Click to ${s.status === 'ACTIVE' ? 'deactivate' : 'activate'}`}
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 ${
                      s.status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                    }`}
                  >
                    {s.status === 'ACTIVE' ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                    <span>{s.status}</span>
                  </button>
                </div>

                <div className="text-xs text-slate-400 space-y-1">
                  {s.clientName && <p>Client: <span className="font-semibold text-slate-300">{s.clientName}</span></p>}
                  <p>Mode: <span className="font-semibold text-slate-300">{s.attendanceMode || 'STANDARD'}</span></p>
                  {s.geofenceEnabled ? (
                    <p className="text-[11px] text-emerald-400 flex items-center gap-1 font-mono">
                      <Navigation className="w-3 h-3" />
                      <span>{s.latitude?.toFixed(4)}, {s.longitude?.toFixed(4)} ({s.geofenceRadius || 100}m)</span>
                    </p>
                  ) : (
                    <p className="text-[11px] text-slate-500">No Geofence Enforced</p>
                  )}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <span className="text-[10px] text-slate-500 font-mono">ID: {s.id.substring(0, 10)}...</span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setEditingSite(s)}
                    className="p-1.5 text-slate-400 hover:text-indigo-400 hover:bg-indigo-500/10 rounded-lg transition"
                    title="Edit Site"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setDeletingSiteId(s.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition"
                    title="Delete Site"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        {filteredSites.length === 0 && !editingSite && (
          <div className="col-span-full py-12 text-center text-slate-400 text-xs italic bg-white dark:bg-slate-900/20 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
            {searchQuery ? 'No sites matching your search query.' : 'No sites configured yet. Click "Add Site" above.'}
          </div>
        )}
      </div>
    </div>
  );
};
