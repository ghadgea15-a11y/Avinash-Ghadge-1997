import React, { useState } from 'react';
import { GitBranch, Plus, Search, Edit3, Trash2, CheckCircle2, XCircle, MapPin } from 'lucide-react';
import { BranchRecord, SiteRecord } from '../../types';
import { FirestoreService } from '../../services/firestoreService';

interface CompanyBranchesTabProps {
  companyId: string;
  branches: BranchRecord[];
  setBranches: React.Dispatch<React.SetStateAction<BranchRecord[]>>;
  sites: SiteRecord[];
  onSuccess: (msg: string) => void;
  onError: (msg: string) => void;
  isDark: boolean;
}

export const CompanyBranchesTab: React.FC<CompanyBranchesTabProps> = ({
  companyId,
  branches,
  setBranches,
  sites,
  onSuccess,
  onError,
  isDark
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [editingBranch, setEditingBranch] = useState<Partial<BranchRecord> | null>(null);
  const [deletingBranchId, setDeletingBranchId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const filteredBranches = branches.filter(b =>
    (b.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (b.code || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (b.city || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBranch?.name?.trim()) {
      onError('Branch Name is required.');
      return;
    }
    if (!editingBranch?.code?.trim()) {
      onError('Branch Code is required.');
      return;
    }

    try {
      setSaving(true);
      const bRecord: BranchRecord = {
        companyId,
        id: editingBranch.id || `BR-${Date.now().toString(36).toUpperCase()}`,
        name: editingBranch.name.trim(),
        code: editingBranch.code.trim().toUpperCase(),
        city: editingBranch.city?.trim() || 'Mumbai',
        address: editingBranch.address?.trim() || 'Headquarters',
        status: editingBranch.status as "ACTIVE" | "INACTIVE" || 'ACTIVE',
        regionId: editingBranch.regionId || 'default-region',
        createdAt: editingBranch.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const success = await FirestoreService.saveBranch(companyId, bRecord);
      if (success) {
        setBranches(prev => {
          const idx = prev.findIndex(b => b.id === bRecord.id);
          if (idx >= 0) {
            const next = [...prev];
            next[idx] = bRecord;
            return next;
          }
          return [...prev, bRecord];
        });
        setEditingBranch(null);
        onSuccess(`Branch "${bRecord.name}" saved successfully.`);
      } else {
        onError('Failed to save branch to Firestore.');
      }
    } catch (err: any) {
      console.error('[CompanyBranchesTab] Save error:', err);
      onError(err?.message || 'Error saving branch.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (branchId: string, branchName: string) => {
    // Check if any sites are attached
    const attachedSites = sites.filter(s => s.branchId === branchId);
    if (attachedSites.length > 0) {
      onError(`Cannot delete branch "${branchName}". There are ${attachedSites.length} sites associated with it. Reassign or delete those sites first.`);
      setDeletingBranchId(null);
      return;
    }

    try {
      setSaving(true);
      const success = await FirestoreService.deleteBranch(companyId, branchId);
      if (success) {
        setBranches(prev => prev.filter(b => b.id !== branchId));
        setDeletingBranchId(null);
        onSuccess(`Branch "${branchName}" deleted successfully.`);
      } else {
        onError('Failed to delete branch.');
      }
    } catch (err: any) {
      console.error('[CompanyBranchesTab] Delete error:', err);
      onError(err?.message || 'Error deleting branch.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (branch: BranchRecord) => {
    const nextStatus = branch.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    const updated = { ...branch, status: nextStatus, updatedAt: new Date().toISOString() };
    try {
      const success = await FirestoreService.saveBranch(companyId, updated);
      if (success) {
        setBranches(prev => prev.map(b => b.id === branch.id ? updated : b));
        onSuccess(`Branch "${branch.name}" status updated to ${nextStatus}.`);
      } else {
        onError('Failed to update branch status.');
      }
    } catch (err: any) {
      onError(err?.message || 'Failed to update branch status.');
    }
  };

  return (
    <div className="space-y-4">
      {/* Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold flex items-center gap-2">
            <GitBranch className="w-4 h-4 text-indigo-500" />
            <span>Branch Offices & Regional Hubs</span>
          </h3>
          <p className="text-xs text-slate-400">Manage territorial operating branches, administrative nodes, and branch codes.</p>
        </div>

        <div className="flex items-center gap-2">
          <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
            <Search className="w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search branches..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent border-none outline-none text-xs w-36"
            />
          </div>

          <button
            onClick={() => setEditingBranch({ status: 'ACTIVE', city: 'Mumbai', address: '' })}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-2 transition shadow-md shadow-indigo-600/20 shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Add Branch</span>
          </button>
        </div>
      </div>

      {/* Inline Form / Modal */}
      {editingBranch && (
        <form onSubmit={handleSave} className={`p-5 rounded-2xl border ${isDark ? 'bg-indigo-950/20 border-indigo-500/30' : 'bg-indigo-50/50 border-indigo-200'} space-y-4`}>
          <h4 className="text-sm font-bold text-indigo-400">
            {editingBranch.id ? `Edit Branch: ${editingBranch.name || ''}` : 'Create New Branch Office'}
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block text-slate-400 mb-1 font-medium">Branch Name *</label>
              <input
                type="text"
                required
                value={editingBranch.name || ''}
                onChange={(e) => setEditingBranch({ ...editingBranch, name: e.target.value })}
                placeholder="e.g. Mumbai Regional HQ"
                className={`w-full p-2.5 rounded-xl border ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-300'}`}
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1 font-medium">Branch Code *</label>
              <input
                type="text"
                required
                value={editingBranch.code || ''}
                onChange={(e) => setEditingBranch({ ...editingBranch, code: e.target.value.toUpperCase() })}
                placeholder="e.g. MUM-HQ"
                className={`w-full p-2.5 rounded-xl border font-mono uppercase ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-300'}`}
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1 font-medium">City</label>
              <input
                type="text"
                value={editingBranch.city || ''}
                onChange={(e) => setEditingBranch({ ...editingBranch, city: e.target.value })}
                placeholder="e.g. Mumbai"
                className={`w-full p-2.5 rounded-xl border ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-300'}`}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="md:col-span-2">
              <label className="block text-slate-400 mb-1 font-medium">Branch Address</label>
              <input
                type="text"
                value={editingBranch.address || ''}
                onChange={(e) => setEditingBranch({ ...editingBranch, address: e.target.value })}
                placeholder="Full address of the branch premises..."
                className={`w-full p-2.5 rounded-xl border ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-300'}`}
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1 font-medium">Operating Status</label>
              <select
                value={editingBranch.status || 'ACTIVE'}
                onChange={(e) => setEditingBranch({ ...editingBranch, status: e.target.value as any })}
                className={`w-full p-2.5 rounded-xl border ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-300'}`}
              >
                <option value="ACTIVE">ACTIVE</option>
                <option value="INACTIVE">INACTIVE</option>
              </select>
            </div>
          </div>

          <div className="flex gap-2 justify-end pt-2">
            <button
              type="button"
              onClick={() => setEditingBranch(null)}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Branch'}
            </button>
          </div>
        </form>
      )}

      {/* Delete Confirmation Modal */}
      {deletingBranchId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className={`w-full max-w-sm p-6 rounded-2xl border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'} space-y-4`}>
            <h4 className="text-sm font-bold text-rose-500">Confirm Branch Deletion</h4>
            <p className="text-xs text-slate-400">
              Are you sure you want to permanently delete this branch office? This cannot be undone.
            </p>
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setDeletingBranchId(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const br = branches.find(b => b.id === deletingBranchId);
                  if (br) handleDelete(br.id, br.name);
                }}
                disabled={saving}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold"
              >
                {saving ? 'Deleting...' : 'Delete Branch'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Branch Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredBranches.map(b => {
          const attachedCount = sites.filter(s => s.branchId === b.id).length;
          return (
            <div
              key={b.id}
              className={`p-4 rounded-2xl border ${isDark ? 'bg-slate-900 border-slate-800 hover:border-indigo-500/50' : 'bg-white border-slate-200 hover:border-indigo-400'} transition flex flex-col justify-between group space-y-3`}
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 group-hover:text-indigo-400 transition-colors">
                      {b.name}
                    </h4>
                    <span className="font-mono text-xs font-semibold text-indigo-400">{b.code}</span>
                  </div>
                  <button
                    onClick={() => handleToggleStatus(b)}
                    title={`Click to ${b.status === 'ACTIVE' ? 'deactivate' : 'activate'}`}
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 ${
                      b.status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                    }`}
                  >
                    {b.status === 'ACTIVE' ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                    <span>{b.status}</span>
                  </button>
                </div>

                <div className="text-xs text-slate-400 space-y-1">
                  <p className="flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-slate-500" />
                    <span>{b.city} {b.address ? `• ${b.address}` : ''}</span>
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Associated Sites: <span className="font-semibold text-slate-300">{attachedCount}</span>
                  </p>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <span className="text-[10px] text-slate-500 font-mono">ID: {b.id.substring(0, 10)}...</span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setEditingBranch(b)}
                    className="p-1.5 text-slate-400 hover:text-indigo-400 hover:bg-indigo-500/10 rounded-lg transition"
                    title="Edit Branch"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setDeletingBranchId(b.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition"
                    title="Delete Branch"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        {filteredBranches.length === 0 && !editingBranch && (
          <div className="col-span-full py-12 text-center text-slate-400 text-xs italic bg-white dark:bg-slate-900/20 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
            {searchQuery ? 'No branches matching your search query.' : 'No branches configured yet. Click "Add Branch" above.'}
          </div>
        )}
      </div>
    </div>
  );
};
