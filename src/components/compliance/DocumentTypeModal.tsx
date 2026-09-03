import React, { useState } from 'react';
import { X, Save, Plus, Trash2, Info } from 'lucide-react';
import { DocumentTypeConfig, UserSession } from '../../types';
import { FirestoreService } from '../../services/firestoreService';
import { motion, AnimatePresence } from 'motion/react';

interface DocumentTypeModalProps {
  isOpen: boolean;
  onClose: () => void;
  companyId: string;
  existingTypes: DocumentTypeConfig[];
  onSave: () => void;
}

export function DocumentTypeModal({ isOpen, onClose, companyId, existingTypes, onSave }: DocumentTypeModalProps) {
  const [editingType, setEditingType] = useState<Partial<DocumentTypeConfig> | null>(null);
  const [saving, setSaving] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingType?.name || !editingType?.code) return;

    setSaving(true);
    try {
      const config: DocumentTypeConfig = {
        id: editingType.id || `TYPE_${Date.now()}`,
        companyId,
        name: editingType.name,
        code: editingType.code.toUpperCase().replace(/\s+/g, '_'),
        isMandatory: editingType.isMandatory || false,
        description: editingType.description || '',
        expiryAlertThresholds: editingType.expiryAlertThresholds || [90, 60, 30, 15, 7, 1],
        status: 'ACTIVE',
        createdAt: editingType.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await FirestoreService.saveDocumentType(companyId, config);
      setEditingType(null);
      onSave();
    } catch (error) {
      console.error('Error saving document type:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
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
            className="relative w-full max-w-4xl bg-white dark:bg-slate-900 dark:bg-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
          >
            <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-white dark:bg-slate-950/50 dark:bg-slate-900/50">
              <div>
                <h4 className="font-bold text-black dark:text-white flex items-center gap-2">
                  <Save className="w-4 h-4 text-indigo-600" />
                  Manage Document Types
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Configure global document requirements and alert thresholds</p>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <div className="flex-1 overflow-hidden flex">
              {/* Left Side: List */}
              <div className="w-1/2 border-r border-slate-100 dark:border-slate-700 overflow-y-auto p-4 space-y-3">
                <button 
                  onClick={() => setEditingType({ id: '', name: '', code: '', isMandatory: false, expiryAlertThresholds: [90, 60, 30, 15, 7, 1] })}
                  className="w-full py-3 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl text-slate-400 hover:border-indigo-400 hover:text-indigo-500 transition-all flex items-center justify-center gap-2 font-bold text-xs"
                >
                  <Plus className="w-4 h-4" />
                  Add New Type
                </button>

                {existingTypes.map(type => (
                  <div 
                    key={type.id}
                    onClick={() => setEditingType(type)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer ${
                      editingType?.id === type.id 
                        ? 'bg-indigo-50 border-indigo-200 dark:bg-indigo-900/20 dark:border-indigo-800' 
                        : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 hover:border-indigo-200'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h5 className="text-xs font-bold text-black dark:text-white">{type.name}</h5>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono mt-0.5">{type.code}</p>
                      </div>
                      {type.isMandatory && (
                        <span className="px-1.5 py-0.5 bg-rose-50 text-rose-600 border border-rose-100 rounded text-[8px] font-bold">MANDATORY</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Right Side: Editor */}
              <div className="w-1/2 bg-white dark:bg-slate-950/30 dark:bg-slate-900/20 p-6 overflow-y-auto">
                {editingType ? (
                  <form onSubmit={handleSave} className="space-y-4">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Display Name</label>
                      <input 
                        required
                        type="text" 
                        placeholder="e.g. Identity Document"
                        className="w-full px-3 py-2 bg-white dark:bg-slate-900 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs outline-none focus:ring-2 focus:ring-indigo-500 transition"
                        value={editingType.name || ''}
                        onChange={e => setEditingType(prev => ({ ...prev, name: e.target.value }))}
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Type Code (Internal)</label>
                      <input 
                        required
                        type="text" 
                        placeholder="e.g. ID_DOC"
                        className="w-full px-3 py-2 bg-white dark:bg-slate-900 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono outline-none focus:ring-2 focus:ring-indigo-500 transition"
                        value={editingType.code || ''}
                        onChange={e => setEditingType(prev => ({ ...prev, code: e.target.value }))}
                      />
                    </div>

                    <div className="flex items-center gap-3 p-3 bg-white dark:bg-slate-900 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                      <input 
                        type="checkbox" 
                        id="isMandatory"
                        className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
                        checked={editingType.isMandatory || false}
                        onChange={e => setEditingType(prev => ({ ...prev, isMandatory: e.target.checked }))}
                      />
                      <label htmlFor="isMandatory" className="text-xs font-bold text-slate-900 dark:text-slate-300 cursor-pointer">
                        Mark as Mandatory Compliance Document
                      </label>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1 flex justify-between">
                        <span>Alert Thresholds (Days)</span>
                        <span className="text-indigo-500 font-normal">Comma separated</span>
                      </label>
                      <input 
                        type="text" 
                        placeholder="90, 60, 30, 15, 7, 1"
                        className="w-full px-3 py-2 bg-white dark:bg-slate-900 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs outline-none focus:ring-2 focus:ring-indigo-500 transition"
                        value={editingType.expiryAlertThresholds?.join(', ') || ''}
                        onChange={e => {
                          const val = e.target.value.split(',').map(v => parseInt(v.trim())).filter(v => !isNaN(v));
                          setEditingType(prev => ({ ...prev, expiryAlertThresholds: val }));
                        }}
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Description</label>
                      <textarea 
                        className="w-full px-3 py-2 bg-white dark:bg-slate-900 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs outline-none focus:ring-2 focus:ring-indigo-500 transition min-h-[80px]"
                        placeholder="Add internal notes or requirements..."
                        value={editingType.description || ''}
                        onChange={e => setEditingType(prev => ({ ...prev, description: e.target.value }))}
                      />
                    </div>

                    <div className="pt-4 flex gap-3">
                      <button 
                        type="submit"
                        disabled={saving}
                        className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2"
                      >
                        {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        Save Configuration
                      </button>
                      <button 
                        type="button"
                        onClick={() => setEditingType(null)}
                        className="px-4 py-2.5 text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:text-slate-300"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-center space-y-3 opacity-60">
                    <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded-full">
                      <Info className="w-8 h-8 text-slate-400" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-600 dark:text-slate-400">Select a type to edit</p>
                      <p className="text-[11px] text-slate-400">Or click 'Add New Type' to create a new one</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

function RefreshCw({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M3 21v-5h5"/></svg>
  );
}
