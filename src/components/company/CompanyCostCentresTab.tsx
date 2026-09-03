import React, { useState } from 'react';
import { Award, Plus, Search, Edit3, Trash2, CheckCircle2, XCircle, DollarSign } from 'lucide-react';
import { CostCentreRecord } from '../../types';
import { FirestoreService } from '../../services/firestoreService';

interface CompanyCostCentresTabProps {
  companyId: string;
  costCentres: CostCentreRecord[];
  setCostCentres: React.Dispatch<React.SetStateAction<CostCentreRecord[]>>;
  onSuccess: (msg: string) => void;
  onError: (msg: string) => void;
  isDark: boolean;
}

export const CompanyCostCentresTab: React.FC<CompanyCostCentresTabProps> = ({
  companyId,
  costCentres,
  setCostCentres,
  onSuccess,
  onError,
  isDark
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [editingCostCentre, setEditingCostCentre] = useState<Partial<CostCentreRecord> | null>(null);
  const [deletingCostCentreId, setDeletingCostCentreId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const filteredCostCentres = costCentres.filter(c =>
    (c.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.code || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.description || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCostCentre?.code?.trim()) {
      onError('Cost Centre Code is required.');
      return;
    }
    if (!editingCostCentre?.name?.trim()) {
      onError('Cost Centre Name is required.');
      return;
    }

    try {
      setSaving(true);
      const ccRecord: CostCentreRecord = {
        id: editingCostCentre.id || `CC-${Date.now().toString(36).toUpperCase()}`,
        companyId,
        code: editingCostCentre.code.trim().toUpperCase(),
        name: editingCostCentre.name.trim(),
        description: editingCostCentre.description?.trim() || '',
        budgetAllocated: editingCostCentre.budgetAllocated !== undefined ? Number(editingCostCentre.budgetAllocated) : 0,
        status: editingCostCentre.status || 'ACTIVE'
      };

      const success = await FirestoreService.saveCostCentre(companyId, ccRecord);
      if (success) {
        setCostCentres(prev => {
          const idx = prev.findIndex(c => c.id === ccRecord.id);
          if (idx >= 0) {
            const next = [...prev];
            next[idx] = ccRecord;
            return next;
          }
          return [...prev, ccRecord];
        });
        setEditingCostCentre(null);
        onSuccess(`Cost Centre "${ccRecord.name}" saved successfully.`);
      } else {
        onError('Failed to save cost centre to Firestore.');
      }
    } catch (err: any) {
      console.error('[CompanyCostCentresTab] Save error:', err);
      onError(err?.message || 'Error saving cost centre.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (costCentreId: string, name: string) => {
    try {
      setSaving(true);
      const success = await FirestoreService.deleteCostCentre(companyId, costCentreId);
      if (success) {
        setCostCentres(prev => prev.filter(c => c.id !== costCentreId));
        setDeletingCostCentreId(null);
        onSuccess(`Cost Centre "${name}" deleted successfully.`);
      } else {
        onError('Failed to delete cost centre.');
      }
    } catch (err: any) {
      console.error('[CompanyCostCentresTab] Delete error:', err);
      onError(err?.message || 'Error deleting cost centre.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (cc: CostCentreRecord) => {
    const nextStatus = cc.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    const updated = { ...cc, status: nextStatus };
    try {
      const success = await FirestoreService.saveCostCentre(companyId, updated);
      if (success) {
        setCostCentres(prev => prev.map(c => c.id === cc.id ? updated : c));
        onSuccess(`Cost Centre "${cc.name}" marked ${nextStatus}.`);
      } else {
        onError('Failed to update cost centre status.');
      }
    } catch (err: any) {
      onError(err?.message || 'Failed to update cost centre status.');
    }
  };

  return (
    <div className="space-y-4">
      {/* Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold flex items-center gap-2">
            <Award className="w-4 h-4 text-indigo-500" />
            <span>Cost Centres & Financial Allocation</span>
          </h3>
          <p className="text-xs text-slate-400">Define financial cost centres for expense tracking, payroll charging, and department budgets.</p>
        </div>

        <div className="flex items-center gap-2">
          <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
            <Search className="w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search cost centres..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent border-none outline-none text-xs w-36"
            />
          </div>

          <button
            onClick={() => setEditingCostCentre({ status: 'ACTIVE' })}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-2 transition shadow-md shadow-indigo-600/20 shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Add Cost Centre</span>
          </button>
        </div>
      </div>

      {/* Inline Form / Modal */}
      {editingCostCentre && (
        <form onSubmit={handleSave} className={`p-5 rounded-2xl border ${isDark ? 'bg-indigo-950/20 border-indigo-500/30' : 'bg-indigo-50/50 border-indigo-200'} space-y-4`}>
          <h4 className="text-sm font-bold text-indigo-400">
            {editingCostCentre.id ? `Edit Cost Centre: ${editingCostCentre.name || ''}` : 'Create New Cost Centre'}
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block text-slate-400 mb-1 font-medium">Cost Centre Code *</label>
              <input
                type="text"
                required
                value={editingCostCentre.code || ''}
                onChange={e => setEditingCostCentre({ ...editingCostCentre, code: e.target.value.toUpperCase() })}
                placeholder="e.g. CC-SEC-01"
                className={`w-full p-2.5 rounded-xl border font-mono uppercase ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-300'}`}
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1 font-medium">Cost Centre Name *</label>
              <input
                type="text"
                required
                value={editingCostCentre.name || ''}
                onChange={e => setEditingCostCentre({ ...editingCostCentre, name: e.target.value })}
                placeholder="e.g. Corporate Security Operations"
                className={`w-full p-2.5 rounded-xl border ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-300'}`}
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1 font-medium">Annual Allocated Budget (₹ / $)</label>
              <input
                type="number"
                value={editingCostCentre.budgetAllocated !== undefined ? editingCostCentre.budgetAllocated : ''}
                onChange={e => setEditingCostCentre({ ...editingCostCentre, budgetAllocated: Number(e.target.value) })}
                placeholder="e.g. 500000"
                className={`w-full p-2.5 rounded-xl border font-mono ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-300'}`}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="md:col-span-2">
              <label className="block text-slate-400 mb-1 font-medium">Description</label>
              <input
                type="text"
                value={editingCostCentre.description || ''}
                onChange={e => setEditingCostCentre({ ...editingCostCentre, description: e.target.value })}
                placeholder="Short description of this cost allocation unit..."
                className={`w-full p-2.5 rounded-xl border ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-300'}`}
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1 font-medium">Status</label>
              <select
                value={editingCostCentre.status || 'ACTIVE'}
                onChange={e => setEditingCostCentre({ ...editingCostCentre, status: e.target.value as any })}
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
              onClick={() => setEditingCostCentre(null)}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Cost Centre'}
            </button>
          </div>
        </form>
      )}

      {/* Delete Confirmation Modal */}
      {deletingCostCentreId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className={`w-full max-w-sm p-6 rounded-2xl border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'} space-y-4`}>
            <h4 className="text-sm font-bold text-rose-500">Confirm Cost Centre Deletion</h4>
            <p className="text-xs text-slate-400">
              Are you sure you want to permanently delete this cost centre? Historical reports referencing this code will remain intact.
            </p>
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setDeletingCostCentreId(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const cc = costCentres.find(c => c.id === deletingCostCentreId);
                  if (cc) handleDelete(cc.id, cc.name);
                }}
                disabled={saving}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold"
              >
                {saving ? 'Deleting...' : 'Delete Cost Centre'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cost Centre Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredCostCentres.map(c => (
          <div
            key={c.id}
            className={`p-4 rounded-2xl border ${isDark ? 'bg-slate-900 border-slate-800 hover:border-indigo-500/50' : 'bg-white border-slate-200 hover:border-indigo-400'} transition flex flex-col justify-between group space-y-3`}
          >
            <div className="space-y-2">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 group-hover:text-indigo-400 transition-colors">
                    {c.name}
                  </h4>
                  <span className="font-mono text-xs font-semibold text-indigo-400">{c.code}</span>
                </div>
                <button
                  onClick={() => handleToggleStatus(c)}
                  title={`Click to ${c.status === 'ACTIVE' ? 'deactivate' : 'activate'}`}
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 ${
                    c.status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                  }`}
                >
                  {c.status === 'ACTIVE' ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                  <span>{c.status}</span>
                </button>
              </div>

              {c.description && (
                <p className="text-xs text-slate-400 line-clamp-2">
                  {c.description}
                </p>
              )}

              {c.budgetAllocated ? (
                <p className="text-xs text-emerald-400 font-mono flex items-center gap-1">
                  <DollarSign className="w-3.5 h-3.5" />
                  <span>Budget: {Number(c.budgetAllocated).toLocaleString()}</span>
                </p>
              ) : null}
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <span className="text-[10px] text-slate-500 font-mono">ID: {c.id.substring(0, 10)}...</span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setEditingCostCentre(c)}
                  className="p-1.5 text-slate-400 hover:text-indigo-400 hover:bg-indigo-500/10 rounded-lg transition"
                  title="Edit Cost Centre"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setDeletingCostCentreId(c.id)}
                  className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition"
                  title="Delete Cost Centre"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}

        {filteredCostCentres.length === 0 && !editingCostCentre && (
          <div className="col-span-full py-12 text-center text-slate-400 text-xs italic bg-white dark:bg-slate-900/20 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
            {searchQuery ? 'No cost centres matching your search query.' : 'No cost centres registered yet. Click "Add Cost Centre" above.'}
          </div>
        )}
      </div>
    </div>
  );
};
