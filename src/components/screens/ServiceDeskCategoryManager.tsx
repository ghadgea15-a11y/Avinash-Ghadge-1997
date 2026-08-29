import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Archive, Save, X, AlertCircle } from 'lucide-react';
import { ServiceDeskService } from '../../services/serviceDeskService';
import { TicketCategoryRecord, UserSession, ServiceTicketPriority } from '../../types';
import { useFeedback } from '../../context/ActionFeedbackContext';

interface ServiceDeskCategoryManagerProps {
  userSession: UserSession;
  activeCompany: { companyId: string };
  onClose: () => void;
  priorityConfigs: any[];
}

export function ServiceDeskCategoryManager({ userSession, activeCompany, onClose, priorityConfigs }: ServiceDeskCategoryManagerProps) {
  const { showSuccess, showError, showLoading, showCancelled, showValidationFailed, handleError, confirm } = useFeedback();
  const [categories, setCategories] = useState<TicketCategoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingCategory, setEditingCategory] = useState<Partial<TicketCategoryRecord> | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const unsub = ServiceDeskService.subscribeToCategories(activeCompany.companyId, (data) => {
      setCategories(data);
      setLoading(false);
    });
    return () => unsub();
  }, [activeCompany.companyId]);

  const handleSave = async () => {
    if (!editingCategory?.code || !editingCategory?.name) {
      setError('Code and Name are required');
      showValidationFailed('Code and Name are required');
      return;
    }
    
    // Validate hierarchy (no self parent)
    if (editingCategory.id && editingCategory.parentId === editingCategory.id) {
      setError('Category cannot be its own parent');
      showValidationFailed('Category cannot be its own parent');
      return;
    }

    setSaving(true);
    setError('');
    const dismiss = showLoading('Saving ticket category...');
    
    const payload: any = {
      ...editingCategory,
      displayOrder: editingCategory.displayOrder || 0,
      isActive: editingCategory.isActive ?? true,
    };

    const res = await ServiceDeskService.saveTicketCategory(userSession, activeCompany.companyId, payload);
    setSaving(false);
    dismiss();
    
    if (res.success) {
      setEditingCategory(null);
      showSuccess(`✓ Category "${payload.name}" saved successfully!`);
    } else {
      setError(res.error || 'Failed to save category');
      showError(res.error || 'Failed to save category');
    }
  };

  const handleDeactivate = async (cat: TicketCategoryRecord) => {
    const ok = await confirm({
      title: 'Deactivate Category',
      message: `Are you sure you want to deactivate "${cat.name}"? It will no longer be selectable for new tickets.`,
      confirmLabel: 'Deactivate',
      cancelLabel: 'Cancel',
      isDestructive: true
    });
    if (!ok) {
      showCancelled('🚫 Category deactivation cancelled');
      return;
    }

    const dismiss = showLoading('Deactivating category...');
    const res = await ServiceDeskService.saveTicketCategory(userSession, activeCompany.companyId, { ...cat, isActive: false });
    dismiss();
    if (res.success) {
      showSuccess(`✓ Category "${cat.name}" deactivated.`);
    } else {
      showError(res.error || '✕ Failed to deactivate category');
    }
  };

  const handleActivate = async (cat: TicketCategoryRecord) => {
    const dismiss = showLoading('Activating category...');
    const res = await ServiceDeskService.saveTicketCategory(userSession, activeCompany.companyId, { ...cat, isActive: true });
    dismiss();
    if (res.success) {
      showSuccess(`✓ Category "${cat.name}" activated.`);
    } else {
      showError(res.error || '✕ Failed to activate category');
    }
  };

  const isDark = document.documentElement.classList.contains('dark');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className={`w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-xl shadow-2xl ${isDark ? 'bg-slate-900 text-slate-100' : 'bg-white text-black'}`}>
        <div className="flex justify-between items-center p-6 border-b border-slate-200 dark:border-slate-800">
          <h2 className="text-xl font-bold">Service Ticket Categories</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {error && (
            <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg flex items-center gap-2 text-sm">
              <AlertCircle className="w-5 h-5" />
              {error}
            </div>
          )}

          {editingCategory ? (
            <div className="bg-white dark:bg-slate-950 dark:bg-slate-800/50 p-6 rounded-lg border border-slate-200 dark:border-slate-700 mb-6">
              <h3 className="text-lg font-semibold mb-4">{editingCategory.id ? 'Edit Category' : 'New Category'}</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Code *</label>
                  <input 
                    type="text" 
                    value={editingCategory.code || ''} 
                    onChange={e => setEditingCategory({...editingCategory, code: e.target.value.toUpperCase()})}
                    className="w-full p-2 rounded border focus:outline-none focus:border-indigo-500 bg-white dark:bg-slate-900 dark:bg-slate-800 border-slate-300 dark:border-slate-600"
                    placeholder="e.g. MAINTENANCE"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Name *</label>
                  <input 
                    type="text" 
                    value={editingCategory.name || ''} 
                    onChange={e => setEditingCategory({...editingCategory, name: e.target.value})}
                    className="w-full p-2 rounded border focus:outline-none focus:border-indigo-500 bg-white dark:bg-slate-900 dark:bg-slate-800 border-slate-300 dark:border-slate-600"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-1">Description</label>
                  <input 
                    type="text" 
                    value={editingCategory.description || ''} 
                    onChange={e => setEditingCategory({...editingCategory, description: e.target.value})}
                    className="w-full p-2 rounded border focus:outline-none focus:border-indigo-500 bg-white dark:bg-slate-900 dark:bg-slate-800 border-slate-300 dark:border-slate-600"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Parent Category</label>
                  <select
                    value={editingCategory.parentId || ''}
                    onChange={e => setEditingCategory({...editingCategory, parentId: e.target.value || undefined})}
                    className="w-full p-2 rounded border focus:outline-none focus:border-indigo-500 bg-white dark:bg-slate-900 dark:bg-slate-800 border-slate-300 dark:border-slate-600"
                  >
                    <option value="">None (Top Level)</option>
                    {categories.filter(c => c.id !== editingCategory.id && !c.parentId).map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Default Priority (Optional)</label>
                  <select
                    value={editingCategory.defaultPriority || ''}
                    onChange={e => setEditingCategory({...editingCategory, defaultPriority: e.target.value || undefined})}
                    className="w-full p-2 rounded border focus:outline-none focus:border-indigo-500 bg-white dark:bg-slate-900 dark:bg-slate-800 border-slate-300 dark:border-slate-600"
                  >
                    <option value="">None</option>
                    {priorityConfigs.map(c => (
                      <option key={c.code} value={c.code}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Display Order</label>
                  <input 
                    type="number" 
                    value={editingCategory.displayOrder || 0} 
                    onChange={e => setEditingCategory({...editingCategory, displayOrder: parseInt(e.target.value) || 0})}
                    className="w-full p-2 rounded border focus:outline-none focus:border-indigo-500 bg-white dark:bg-slate-900 dark:bg-slate-800 border-slate-300 dark:border-slate-600"
                  />
                </div>
                <div className="flex items-center pt-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={editingCategory.isActive ?? true}
                      onChange={e => setEditingCategory({...editingCategory, isActive: e.target.checked})}
                      className="w-4 h-4 rounded text-indigo-600"
                    />
                    <span className="text-sm font-medium">Active (Available for use)</span>
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button 
                  onClick={() => setEditingCategory(null)}
                  className="px-4 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 rounded-lg text-sm font-medium transition"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSave}
                  disabled={saving}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition flex items-center gap-2 disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  {saving ? 'Saving...' : 'Save Category'}
                </button>
              </div>
            </div>
          ) : (
            <div className="mb-4 flex justify-end">
              <button
                onClick={() => setEditingCategory({ isActive: true, displayOrder: categories.length * 10 })}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg flex items-center gap-2 text-sm font-medium transition"
              >
                <Plus className="w-4 h-4" />
                Add Category
              </button>
            </div>
          )}

          {loading ? (
            <div className="py-12 text-center text-slate-500 dark:text-slate-400">Loading categories...</div>
          ) : (
            <div className="overflow-x-auto border border-slate-200 dark:border-slate-700 rounded-lg">
              <table className="w-full text-left text-sm">
                <thead className="bg-white dark:bg-slate-950 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="p-4 font-semibold">Hierarchy / Name</th>
                    <th className="p-4 font-semibold">Code</th>
                    <th className="p-4 font-semibold">Default Priority</th>
                    <th className="p-4 font-semibold">Order</th>
                    <th className="p-4 font-semibold">Status</th>
                    <th className="p-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                  {categories.filter(c => !c.parentId).map(parent => (
                    <React.Fragment key={parent.id}>
                      <tr className="hover:bg-white dark:bg-slate-950 dark:hover:bg-slate-800/50 transition group">
                        <td className="p-4 font-semibold">{parent.name}</td>
                        <td className="p-4 font-mono text-xs">{parent.code}</td>
                        <td className="p-4">{parent.defaultPriority || '-'}</td>
                        <td className="p-4">{parent.displayOrder}</td>
                        <td className="p-4">
                          <span className={`px-2 py-1 text-xs rounded-full font-medium ${parent.isActive ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-400'}`}>
                            {parent.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          <button onClick={() => setEditingCategory(parent)} className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded transition mx-1">
                            <Edit2 className="w-4 h-4" />
                          </button>
                          {parent.isActive ? (
                            <button onClick={() => handleDeactivate(parent)} className="p-1.5 text-red-600 hover:bg-red-50 rounded transition mx-1" title="Deactivate">
                              <Archive className="w-4 h-4" />
                            </button>
                          ) : (
                            <button onClick={() => handleActivate(parent)} className="p-1.5 text-green-600 hover:bg-green-50 rounded transition mx-1" title="Activate">
                              <Plus className="w-4 h-4" />
                            </button>
                          )}
                        </td>
                      </tr>
                      {/* Subcategories */}
                      {categories.filter(c => c.parentId === parent.id).map(child => (
                         <tr key={child.id} className="hover:bg-white dark:bg-slate-950 dark:hover:bg-slate-800/50 transition group">
                         <td className="p-4 pl-12 text-slate-600 dark:text-slate-400 flex items-center gap-2">
                           <span className="w-4 h-px bg-slate-300 dark:bg-slate-600 inline-block"></span>
                           {child.name}
                         </td>
                         <td className="p-4 font-mono text-xs text-slate-500 dark:text-slate-400">{child.code}</td>
                         <td className="p-4 text-slate-500 dark:text-slate-400">{child.defaultPriority || '-'}</td>
                         <td className="p-4 text-slate-500 dark:text-slate-400">{child.displayOrder}</td>
                         <td className="p-4">
                           <span className={`px-2 py-1 text-xs rounded-full font-medium ${child.isActive ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-400'}`}>
                             {child.isActive ? 'Active' : 'Inactive'}
                           </span>
                         </td>
                         <td className="p-4 text-right">
                           <button onClick={() => setEditingCategory(child)} className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded transition mx-1">
                             <Edit2 className="w-4 h-4" />
                           </button>
                           {child.isActive ? (
                             <button onClick={() => handleDeactivate(child)} className="p-1.5 text-red-600 hover:bg-red-50 rounded transition mx-1" title="Deactivate">
                               <Archive className="w-4 h-4" />
                             </button>
                           ) : (
                             <button onClick={() => handleActivate(child)} className="p-1.5 text-green-600 hover:bg-green-50 rounded transition mx-1" title="Activate">
                               <Plus className="w-4 h-4" />
                             </button>
                           )}
                         </td>
                       </tr>
                      ))}
                    </React.Fragment>
                  ))}
                  {categories.length === 0 && (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-500 dark:text-slate-400">
                        No custom categories defined.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
