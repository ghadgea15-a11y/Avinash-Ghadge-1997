import React, { useState } from 'react';
import { Briefcase, Plus, Search, Edit3, Trash2, CheckCircle2, XCircle } from 'lucide-react';
import { DesignationRecord } from '../../types';
import { FirestoreService } from '../../services/firestoreService';

interface CompanyDesignationsTabProps {
  companyId: string;
  designations: DesignationRecord[];
  setDesignations: React.Dispatch<React.SetStateAction<DesignationRecord[]>>;
  onSuccess: (msg: string) => void;
  onError: (msg: string) => void;
  isDark: boolean;
}

export const CompanyDesignationsTab: React.FC<CompanyDesignationsTabProps> = ({
  companyId,
  designations,
  setDesignations,
  onSuccess,
  onError,
  isDark
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [editingDesig, setEditingDesig] = useState<Partial<DesignationRecord> | null>(null);
  const [deletingDesigId, setDeletingDesigId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const filteredDesigs = designations.filter(d =>
    (d.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (d.level || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDesig?.title?.trim()) {
      onError('Designation Title is required.');
      return;
    }

    try {
      setSaving(true);
      const desRecord: DesignationRecord = {
        companyId,
        id: editingDesig.id || `DESIG-${Date.now().toString(36).toUpperCase()}`,
        title: editingDesig.title.trim(),
        level: editingDesig.level || 'L1'
      };

      const success = await FirestoreService.saveDesignation(companyId, desRecord);
      if (success) {
        setDesignations(prev => {
          const idx = prev.findIndex(d => d.id === desRecord.id);
          if (idx >= 0) {
            const next = [...prev];
            next[idx] = desRecord;
            return next;
          }
          return [...prev, desRecord];
        });
        setEditingDesig(null);
        onSuccess(`Designation "${desRecord.title}" saved successfully.`);
      } else {
        onError('Failed to save designation.');
      }
    } catch (err: any) {
      console.error('[CompanyDesignationsTab] Save error:', err);
      onError(err?.message || 'Error saving designation.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (desigId: string, title: string) => {
    try {
      setSaving(true);
      const success = await FirestoreService.deleteDesignation(companyId, desigId);
      if (success) {
        setDesignations(prev => prev.filter(d => d.id !== desigId));
        setDeletingDesigId(null);
        onSuccess(`Designation "${title}" deleted successfully.`);
      } else {
        onError('Failed to delete designation.');
      }
    } catch (err: any) {
      console.error('[CompanyDesignationsTab] Delete error:', err);
      onError(err?.message || 'Error deleting designation.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-indigo-500" />
            <span>Designations & Hierarchy Bands</span>
          </h3>
          <p className="text-xs text-slate-400">Define job titles, corporate rank levels, and operational grades.</p>
        </div>

        <div className="flex items-center gap-2">
          <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
            <Search className="w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search designations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent border-none outline-none text-xs w-36"
            />
          </div>

          <button
            onClick={() => setEditingDesig({ level: 'L1' })}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-2 transition shadow-md shadow-indigo-600/20 shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Add Designation</span>
          </button>
        </div>
      </div>

      {/* Inline Form / Modal */}
      {editingDesig && (
        <form onSubmit={handleSave} className={`p-5 rounded-2xl border ${isDark ? 'bg-indigo-950/20 border-indigo-500/30' : 'bg-indigo-50/50 border-indigo-200'} space-y-4`}>
          <h4 className="text-sm font-bold text-indigo-400">
            {editingDesig.id ? `Edit Designation: ${editingDesig.title || ''}` : 'Create New Designation'}
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-slate-400 mb-1 font-medium">Designation Title *</label>
              <input
                type="text"
                required
                value={editingDesig.title || ''}
                onChange={e => setEditingDesig({ ...editingDesig, title: e.target.value })}
                placeholder="e.g. Senior Security Supervisor"
                className={`w-full p-2.5 rounded-xl border ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-300'}`}
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1 font-medium">Hierarchy Band / Grade</label>
              <select
                value={editingDesig.level || 'L1'}
                onChange={e => setEditingDesig({ ...editingDesig, level: e.target.value })}
                className={`w-full p-2.5 rounded-xl border ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-300'}`}
              >
                <option value="L1">L1 - Entry Level / Guard / Trainee</option>
                <option value="L2">L2 - Junior Officer / Guard</option>
                <option value="L3">L3 - Senior Guard / Lead</option>
                <option value="L4">L4 - Field Officer / Supervisor</option>
                <option value="L5">L5 - Assistant Manager / Inspector</option>
                <option value="L6">L6 - Operations Manager / Head</option>
                <option value="L7">L7 - Regional Director / GM</option>
                <option value="L8">L8 - C-Level / VP / Board</option>
              </select>
            </div>
          </div>

          <div className="flex gap-2 justify-end pt-2">
            <button
              type="button"
              onClick={() => setEditingDesig(null)}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Designation'}
            </button>
          </div>
        </form>
      )}

      {/* Delete Confirmation Modal */}
      {deletingDesigId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className={`w-full max-w-sm p-6 rounded-2xl border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'} space-y-4`}>
            <h4 className="text-sm font-bold text-rose-500">Confirm Designation Deletion</h4>
            <p className="text-xs text-slate-400">
              Are you sure you want to permanently delete this designation?
            </p>
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setDeletingDesigId(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const dg = designations.find(d => d.id === deletingDesigId);
                  if (dg) handleDelete(dg.id, dg.title);
                }}
                disabled={saving}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold"
              >
                {saving ? 'Deleting...' : 'Delete Designation'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Designation Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredDesigs.map(d => (
          <div
            key={d.id}
            className={`p-4 rounded-2xl border ${isDark ? 'bg-slate-900 border-slate-800 hover:border-indigo-500/50' : 'bg-white border-slate-200 hover:border-indigo-400'} transition flex flex-col justify-between group space-y-3`}
          >
            <div className="space-y-2">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 group-hover:text-indigo-400 transition-colors">
                    {d.title}
                  </h4>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-mono mt-1 inline-block">
                    Band: {d.level || 'L1'}
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <span className="text-[10px] text-slate-500 font-mono">ID: {d.id.substring(0, 10)}...</span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setEditingDesig(d)}
                  className="p-1.5 text-slate-400 hover:text-indigo-400 hover:bg-indigo-500/10 rounded-lg transition"
                  title="Edit Designation"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setDeletingDesigId(d.id)}
                  className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition"
                  title="Delete Designation"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}

        {filteredDesigs.length === 0 && !editingDesig && (
          <div className="col-span-full py-12 text-center text-slate-400 text-xs italic bg-white dark:bg-slate-900/20 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
            {searchQuery ? 'No designations matching your search query.' : 'No designations configured yet. Click "Add Designation" above.'}
          </div>
        )}
      </div>
    </div>
  );
};
