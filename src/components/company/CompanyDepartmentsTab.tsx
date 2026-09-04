import React, { useState } from 'react';
import { Layers, Plus, Search, Edit3, Trash2, CheckCircle2, XCircle } from 'lucide-react';
import { DepartmentRecord } from '../../types';
import { FirestoreService } from '../../services/firestoreService';

interface CompanyDepartmentsTabProps {
  companyId: string;
  departments: DepartmentRecord[];
  setDepartments: React.Dispatch<React.SetStateAction<DepartmentRecord[]>>;
  onSuccess: (msg: string) => void;
  onError: (msg: string) => void;
  isDark: boolean;
}

export const CompanyDepartmentsTab: React.FC<CompanyDepartmentsTabProps> = ({
  companyId,
  departments,
  setDepartments,
  onSuccess,
  onError,
  isDark
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [editingDept, setEditingDept] = useState<Partial<DepartmentRecord> | null>(null);
  const [deletingDeptId, setDeletingDeptId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const filteredDepts = departments.filter(d =>
    (d.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (d.code || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (d.description || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDept?.name?.trim()) {
      onError('Department Name is required.');
      return;
    }
    if (!editingDept?.code?.trim()) {
      onError('Department Code is required.');
      return;
    }

    try {
      setSaving(true);
      const dRecord: DepartmentRecord = {
        companyId,
        id: editingDept.id || `DEPT-${Date.now().toString(36).toUpperCase()}`,
        name: editingDept.name.trim(),
        code: editingDept.code.trim().toUpperCase(),
        description: editingDept.description?.trim() || '',
        status: editingDept.status as "ACTIVE" | "INACTIVE" || 'ACTIVE',
        createdAt: editingDept.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const success = await FirestoreService.saveDepartment(companyId, dRecord);
      if (success) {
        setDepartments(prev => {
          const idx = prev.findIndex(d => d.id === dRecord.id);
          if (idx >= 0) {
            const next = [...prev];
            next[idx] = dRecord;
            return next;
          }
          return [...prev, dRecord];
        });
        setEditingDept(null);
        onSuccess(`Department "${dRecord.name}" saved successfully.`);
      } else {
        onError('Failed to save department.');
      }
    } catch (err: any) {
      console.error('[CompanyDepartmentsTab] Save error:', err);
      onError(err?.message || 'Error saving department.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (deptId: string, deptName: string) => {
    try {
      setSaving(true);
      const success = await FirestoreService.deleteDepartment(companyId, deptId);
      if (success) {
        setDepartments(prev => prev.filter(d => d.id !== deptId));
        setDeletingDeptId(null);
        onSuccess(`Department "${deptName}" deleted successfully.`);
      } else {
        onError('Failed to delete department.');
      }
    } catch (err: any) {
      console.error('[CompanyDepartmentsTab] Delete error:', err);
      onError(err?.message || 'Error deleting department.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (dept: DepartmentRecord) => {
    const nextStatus = dept.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    const updated = { ...dept, status: nextStatus, updatedAt: new Date().toISOString() };
    try {
      const success = await FirestoreService.saveDepartment(companyId, updated);
      if (success) {
        setDepartments(prev => prev.map(d => d.id === dept.id ? updated : d));
        onSuccess(`Department "${dept.name}" status updated to ${nextStatus}.`);
      } else {
        onError('Failed to update department status.');
      }
    } catch (err: any) {
      onError(err?.message || 'Failed to update department status.');
    }
  };

  return (
    <div className="space-y-4">
      {/* Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold flex items-center gap-2">
            <Layers className="w-4 h-4 text-indigo-500" />
            <span>Departments & Divisions</span>
          </h3>
          <p className="text-xs text-slate-400">Configure organizational departments, operational divisions, and reporting units.</p>
        </div>

        <div className="flex items-center gap-2">
          <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
            <Search className="w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search depts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent border-none outline-none text-xs w-36"
            />
          </div>

          <button
            onClick={() => setEditingDept({ status: 'ACTIVE' })}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-2 transition shadow-md shadow-indigo-600/20 shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Add Department</span>
          </button>
        </div>
      </div>

      {/* Inline Form / Modal */}
      {editingDept && (
        <form onSubmit={handleSave} className={`p-5 rounded-2xl border ${isDark ? 'bg-indigo-950/20 border-indigo-500/30' : 'bg-indigo-50/50 border-indigo-200'} space-y-4`}>
          <h4 className="text-sm font-bold text-indigo-400">
            {editingDept.id ? `Edit Department: ${editingDept.name || ''}` : 'Create New Department'}
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block text-slate-400 mb-1 font-medium">Department Name *</label>
              <input
                type="text"
                required
                value={editingDept.name || ''}
                onChange={e => setEditingDept({ ...editingDept, name: e.target.value })}
                placeholder="e.g. Operations & Security"
                className={`w-full p-2.5 rounded-xl border ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-300'}`}
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1 font-medium">Department Code *</label>
              <input
                type="text"
                required
                value={editingDept.code || ''}
                onChange={e => setEditingDept({ ...editingDept, code: e.target.value.toUpperCase() })}
                placeholder="e.g. OPS"
                className={`w-full p-2.5 rounded-xl border font-mono uppercase ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-300'}`}
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1 font-medium">Status</label>
              <select
                value={editingDept.status || 'ACTIVE'}
                onChange={e => setEditingDept({ ...editingDept, status: e.target.value as any })}
                className={`w-full p-2.5 rounded-xl border ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-300'}`}
              >
                <option value="ACTIVE">ACTIVE</option>
                <option value="INACTIVE">INACTIVE</option>
              </select>
            </div>
          </div>

          <div className="text-xs">
            <label className="block text-slate-400 mb-1 font-medium">Description</label>
            <input
              type="text"
              value={editingDept.description || ''}
              onChange={e => setEditingDept({ ...editingDept, description: e.target.value })}
              placeholder="Department purpose and scope..."
              className={`w-full p-2.5 rounded-xl border ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-300'}`}
            />
          </div>

          <div className="flex gap-2 justify-end pt-2">
            <button
              type="button"
              onClick={() => setEditingDept(null)}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Department'}
            </button>
          </div>
        </form>
      )}

      {/* Delete Confirmation Modal */}
      {deletingDeptId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className={`w-full max-w-sm p-6 rounded-2xl border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'} space-y-4`}>
            <h4 className="text-sm font-bold text-rose-500">Confirm Department Deletion</h4>
            <p className="text-xs text-slate-400">
              Are you sure you want to permanently delete this department? Employees assigned to this department may need re-assignment.
            </p>
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setDeletingDeptId(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const dp = departments.find(d => d.id === deletingDeptId);
                  if (dp) handleDelete(dp.id, dp.name);
                }}
                disabled={saving}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold"
              >
                {saving ? 'Deleting...' : 'Delete Department'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Department Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredDepts.map(d => (
          <div
            key={d.id}
            className={`p-4 rounded-2xl border ${isDark ? 'bg-slate-900 border-slate-800 hover:border-indigo-500/50' : 'bg-white border-slate-200 hover:border-indigo-400'} transition flex flex-col justify-between group space-y-3`}
          >
            <div className="space-y-2">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 group-hover:text-indigo-400 transition-colors">
                    {d.name}
                  </h4>
                  <span className="font-mono text-xs font-semibold text-indigo-400">{d.code}</span>
                </div>
                <button
                  onClick={() => handleToggleStatus(d)}
                  title={`Click to ${d.status === 'ACTIVE' ? 'deactivate' : 'activate'}`}
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 ${
                    d.status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                  }`}
                >
                  {d.status === 'ACTIVE' ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                  <span>{d.status}</span>
                </button>
              </div>

              {d.description && (
                <p className="text-xs text-slate-400 line-clamp-2">
                  {d.description}
                </p>
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <span className="text-[10px] text-slate-500 font-mono">ID: {d.id.substring(0, 10)}...</span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setEditingDept(d)}
                  className="p-1.5 text-slate-400 hover:text-indigo-400 hover:bg-indigo-500/10 rounded-lg transition"
                  title="Edit Department"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setDeletingDeptId(d.id)}
                  className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition"
                  title="Delete Department"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}

        {filteredDepts.length === 0 && !editingDept && (
          <div className="col-span-full py-12 text-center text-slate-400 text-xs italic bg-white dark:bg-slate-900/20 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
            {searchQuery ? 'No departments matching your search query.' : 'No departments configured yet. Click "Add Department" above.'}
          </div>
        )}
      </div>
    </div>
  );
};
