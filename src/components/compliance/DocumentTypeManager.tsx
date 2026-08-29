import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Plus, 
  Trash2, 
  Save, 
  X, 
  AlertCircle,
  Settings2,
  RefreshCw
} from 'lucide-react';
import { DocumentTypeConfig, UserSession } from '../../types';
import { FirestoreService } from '../../services/firestoreService';
import { motion, AnimatePresence } from 'motion/react';

interface Props {
  userSession: UserSession;
  onClose: () => void;
  onUpdate: () => void;
}

export const DocumentTypeManager: React.FC<Props> = ({ userSession, onClose, onUpdate }) => {
  const [types, setTypes] = useState<DocumentTypeConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingType, setEditingType] = useState<DocumentTypeConfig | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadTypes();
  }, [userSession.companyId]);

  const loadTypes = async () => {
    setLoading(true);
    try {
      const data = await FirestoreService.getDocumentTypes(userSession.companyId);
      setTypes(data);
    } catch (error) {
      console.error('Error loading doc types:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingType) return;

    setIsSaving(true);
    try {
      const success = await FirestoreService.saveDocumentType(userSession.companyId, {
        ...editingType,
        updatedAt: new Date().toISOString(),
        createdAt: editingType.createdAt || new Date().toISOString()
      });
      if (success) {
        setEditingType(null);
        loadTypes();
        onUpdate();
      }
    } catch (error) {
      console.error('Save failed:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const createNew = () => {
    setEditingType({
      id: `DT_${Date.now()}`,
      companyId: userSession.companyId,
      name: '',
      code: '',
      isMandatory: false,
      expiryAlertThresholds: [90, 60, 30, 15, 7, 1],
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div 
        initial={{ scale: 0.95, opacity: 0 }} 
        animate={{ scale: 1, opacity: 1 }} 
        exit={{ scale: 0.95, opacity: 0 }}
        className="relative w-full max-w-2xl bg-white dark:bg-slate-900 dark:bg-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-white dark:bg-slate-950 dark:bg-slate-900/50">
          <h4 className="font-bold text-black dark:text-white flex items-center gap-2">
            <Settings2 className="w-5 h-5 text-indigo-600" />
            Compliance Document Settings
          </h4>
          <button onClick={onClose} className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {editingType ? (
            <form onSubmit={handleSave} className="space-y-4 bg-white dark:bg-slate-950 dark:bg-slate-900/50 p-5 rounded-2xl border border-indigo-100 dark:border-indigo-900/30">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Document Name</label>
                  <input 
                    required
                    type="text" 
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="e.g. Aadhaar Card"
                    value={editingType.name}
                    onChange={e => setEditingType({...editingType, name: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Unique Code</label>
                  <input 
                    required
                    type="text" 
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="e.g. AADHAR"
                    value={editingType.code}
                    onChange={e => setEditingType({...editingType, code: e.target.value.toUpperCase().replace(/\s/g, '_')})}
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Alert Thresholds (Days Before Expiry)</label>
                  <input 
                    type="text" 
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="e.g. 90, 60, 30, 7"
                    value={editingType.expiryAlertThresholds.join(', ')}
                    onChange={e => setEditingType({...editingType, expiryAlertThresholds: e.target.value.split(',').map(v => parseInt(v.trim())).filter(v => !isNaN(v))})}
                  />
                </div>
                <div className="flex items-center gap-4 py-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      checked={editingType.isMandatory}
                      onChange={e => setEditingType({...editingType, isMandatory: e.target.checked})}
                    />
                    <span className="text-xs font-bold text-slate-900 dark:text-slate-300">Mandatory Document</span>
                  </label>
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button 
                  type="button" 
                  onClick={() => setEditingType(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={isSaving}
                  className="flex items-center gap-2 px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-indigo-600/20"
                >
                  {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Save Configuration
                </button>
              </div>
            </form>
          ) : (
            <button 
              onClick={createNew}
              className="w-full py-4 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl flex items-center justify-center gap-2 text-slate-400 hover:text-indigo-600 hover:border-indigo-400 transition-all group"
            >
              <Plus className="w-5 h-5 transition-transform group-hover:scale-110" />
              <span className="text-sm font-bold">Define New Document Type</span>
            </button>
          )}

          <div className="space-y-3">
            <h5 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Existing Configurations</h5>
            {loading ? (
              <div className="text-center py-4 text-slate-400 text-xs">Loading...</div>
            ) : types.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-xs bg-white dark:bg-slate-950 dark:bg-slate-900/50 rounded-2xl italic">No document types defined for this company</div>
            ) : (
              types.map(type => (
                <div key={type.id} className="flex items-center justify-between p-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl hover:shadow-md transition-all">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-xl ${type.isMandatory ? 'bg-rose-50 text-rose-500' : 'bg-white text-slate-500'}`}>
                      <FileText className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-black dark:text-white">{type.name}</span>
                        {type.isMandatory && <span className="text-[8px] font-black bg-rose-100 text-rose-600 px-1.5 py-0.5 rounded uppercase">Mandatory</span>}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] font-mono text-slate-400 tracking-tighter">CODE: {type.code}</span>
                        <span className="text-[10px] text-slate-400">•</span>
                        <span className="text-[10px] text-slate-400">Thresholds: {type.expiryAlertThresholds.join(', ')} days</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button 
                      onClick={() => setEditingType(type)}
                      className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-indigo-600 transition"
                    >
                      <Save className="w-4 h-4" />
                    </button>
                    <button className="p-2 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-lg text-rose-500 transition">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="p-4 bg-white dark:bg-slate-950 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-700 flex items-center gap-3">
          <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
          <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed">
            Thresholds define when automated alerts are triggered. For example, [90, 30] will notify stakeholders 90 days and 30 days before the document expires.
          </p>
        </div>
      </motion.div>
    </div>
  );
};
