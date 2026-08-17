import React, { useState } from 'react';
import { UserSession, WorkOrderRecord, WorkOrderStatus, WorkOrderPriority } from '../../types';
import { FirestoreService } from '../../services/firestoreService';
import { X, Save, AlertCircle, Plus, Trash2 } from 'lucide-react';

interface WorkOrderFormProps {
  companyId: string;
  userSession: UserSession;
  onClose: () => void;
}

export function WorkOrderForm({ companyId, userSession, onClose }: WorkOrderFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    priority: 'MEDIUM' as WorkOrderPriority,
    siteId: '',
    assignedTo: ''
  });

  const [checklists, setChecklists] = useState<{id: string, text: string, isRequired: boolean}[]>([]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.category) {
      setError('Title and Category are required');
      return;
    }
    
    setLoading(true);
    try {
      const newOrder: WorkOrderRecord = {
        id: `WO-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`.toUpperCase(),
        companyId,
        siteId: formData.siteId || 'GLOBAL',
        title: formData.title,
        description: formData.description,
        category: formData.category,
        priority: formData.priority,
        status: 'DRAFT',
        assignedTo: formData.assignedTo || undefined,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: userSession.userId,
        updatedBy: userSession.userId,
        checklist: checklists.map(c => ({
          ...c,
          isCompleted: false
        })),
        locationRequirement: 'NONE',
        evidenceRequirement: false,
        approvalRequirement: false
      };

      const success = await FirestoreService.saveWorkOrder(companyId, newOrder);
      if (success) {
        onClose();
      } else {
        setError('Failed to save work order');
      }
    } catch (err) {
      setError('An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const addChecklistItem = () => {
    setChecklists([
      ...checklists,
      { id: `CHK-${Date.now()}`, text: '', isRequired: true }
    ]);
  };

  const removeChecklistItem = (id: string) => {
    setChecklists(checklists.filter(c => c.id !== id));
  };

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Create Work Order</h2>
          <p className="text-sm text-slate-500">Draft a new operational task or dispatch order</p>
        </div>
        <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full">
          <X className="w-5 h-5 text-slate-500" />
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg flex items-center gap-3">
          <AlertCircle className="w-5 h-5" />
          <p>{error}</p>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Title *</label>
            <input 
              type="text"
              className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none"
              value={formData.title}
              onChange={e => setFormData({...formData, title: e.target.value})}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Description</label>
            <textarea 
              rows={3}
              className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none"
              value={formData.description}
              onChange={e => setFormData({...formData, description: e.target.value})}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Category *</label>
              <input 
                type="text"
                placeholder="e.g. Maintenance, Inspection"
                className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none"
                value={formData.category}
                onChange={e => setFormData({...formData, category: e.target.value})}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Priority</label>
              <select 
                className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none"
                value={formData.priority}
                onChange={e => setFormData({...formData, priority: e.target.value as WorkOrderPriority})}
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="CRITICAL">Critical</option>
              </select>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Execution Checklist</h3>
            <button 
              type="button"
              onClick={addChecklistItem}
              className="flex items-center gap-1.5 text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700"
            >
              <Plus className="w-4 h-4" /> Add Item
            </button>
          </div>
          
          {checklists.length === 0 ? (
            <p className="text-sm text-slate-500 italic">No checklist items added. Employees will simply mark the task as complete.</p>
          ) : (
            <div className="space-y-3">
              {checklists.map((chk, idx) => (
                <div key={chk.id} className="flex items-start gap-3">
                  <div className="pt-2">
                    <div className="w-5 h-5 rounded border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900"></div>
                  </div>
                  <input 
                    type="text"
                    className="flex-1 px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none"
                    placeholder="Checklist task description..."
                    value={chk.text}
                    onChange={(e) => {
                      const newC = [...checklists];
                      newC[idx].text = e.target.value;
                      setChecklists(newC);
                    }}
                    required
                  />
                  <div className="flex items-center gap-2 pt-2">
                    <label className="flex items-center gap-1.5 text-sm text-slate-600">
                      <input 
                        type="checkbox" 
                        checked={chk.isRequired}
                        onChange={(e) => {
                          const newC = [...checklists];
                          newC[idx].isRequired = e.target.checked;
                          setChecklists(newC);
                        }}
                      /> Req
                    </label>
                    <button type="button" onClick={() => removeChecklistItem(chk.id)} className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3">
          <button 
            type="button"
            onClick={onClose}
            className="px-6 py-2 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors font-medium"
          >
            Cancel
          </button>
          <button 
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors font-medium disabled:opacity-50"
          >
            {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
            Save Draft
          </button>
        </div>
      </form>
    </div>
  );
}
