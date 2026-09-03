import React, { useState, useEffect } from 'react';
import { useBackNavigation } from '../../hooks/useBackNavigation';
import { 
  Bell, 
  Mail, 
  Smartphone, 
  Clock, 
  Settings, 
  AlertTriangle,
  FileText,
  Activity,
  Plus,
  Save,
  CheckCircle2,
  Trash2,
  Edit2
} from 'lucide-react';
import { UserSession, CompanyTenant } from '../../types';
import { useTheme } from '../../context/ThemeContext';
import { FirestoreService } from '../../services/firestoreService';
import { db } from '../../firebase';
import { collection, query, getDocs, setDoc, doc, deleteDoc, orderBy } from 'firebase/firestore';
import { formatTimestamp } from '../../utils/dateUtils';

interface NotificationAdminScreenProps {
  userSession: UserSession | null;
  activeCompany: CompanyTenant | null;
}

export const NotificationAdminScreen: React.FC<NotificationAdminScreenProps> = ({
  userSession,
  activeCompany
}) => {
  const { isDark } = useTheme();
  const [activeTab, setActiveTab] = useState<'TEMPLATES' | 'TRIGGERS' | 'ESCALATIONS' | 'AUDIT'>('TEMPLATES');
  
  // States for Templates
  const [templates, setTemplates] = useState<any[]>([]);
  const [editingTemplate, setEditingTemplate] = useState<any | null>(null);
  useBackNavigation(!!editingTemplate, () => setEditingTemplate(null as any), 'editingTemplate');

  // States for Audits
  const [auditLogs, setAuditLogs] = useState<any[]>([]);

  useEffect(() => {
    if (!activeCompany) return;
    fetchTemplates();
    if (activeTab === 'AUDIT') {
      fetchAuditLogs();
    }
  }, [activeCompany, activeTab]);

  const fetchTemplates = async () => {
    try {
      const q = query(collection(db, 'companies', activeCompany!.companyId, 'notification_templates'));
      const snap = await getDocs(q);
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setTemplates(data);
    } catch (err) {
      console.error('Failed to fetch templates', err);
    }
  };

  const fetchAuditLogs = async () => {
    try {
      // Fetch latest notifications as audit
      const q = query(collection(db, 'companies', activeCompany!.companyId, 'notifications'), orderBy('timestamp', 'desc'));
      const snap = await getDocs(q);
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAuditLogs(data);
    } catch (err) {
      console.error('Failed to fetch audit logs', err);
    }
  };

  const handleSaveTemplate = async () => {
    if (!editingTemplate || !activeCompany) return;
    try {
      const docRef = doc(db, 'companies', activeCompany.companyId, 'notification_templates', editingTemplate.id || Date.now().toString());
      await setDoc(docRef, editingTemplate, { merge: true });
      setEditingTemplate(null);
      fetchTemplates();
    } catch (err) {
      console.error('Failed to save template', err);
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    if (!activeCompany) return;
    try {
      await deleteDoc(doc(db, 'companies', activeCompany.companyId, 'notification_templates', id));
      fetchTemplates();
    } catch (err) {
      console.error('Failed to delete template', err);
    }
  };

  return (
    <div className={`flex-1 h-full flex flex-col ${isDark ? 'text-slate-100 bg-slate-950' : 'text-slate-900 bg-slate-50'}`}>
      {/* Header */}
      <div className={`p-4 sm:p-6 border-b ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-rose-500/10 text-rose-500 rounded-xl">
              <Bell className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold">Notification Admin</h1>
              <p className="text-sm text-slate-500">Manage templates, triggers, and escalations</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className={`flex overflow-x-auto border-b scrollbar-none ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
        {[
          { id: 'TEMPLATES', label: 'Templates', icon: <FileText className="w-4 h-4" /> },
          { id: 'TRIGGERS', label: 'Event Triggers', icon: <Activity className="w-4 h-4" /> },
          { id: 'ESCALATIONS', label: 'Escalations', icon: <AlertTriangle className="w-4 h-4" /> },
          { id: 'AUDIT', label: 'Audit Log', icon: <Clock className="w-4 h-4" /> }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === tab.id
                ? 'border-rose-500 text-rose-600 dark:text-rose-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        <div className="max-w-6xl mx-auto space-y-6">

          {activeTab === 'TEMPLATES' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-bold">Message Templates</h3>
                <button
                  onClick={() => setEditingTemplate({ name: '', title: '', message: '', type: 'INFO', channels: ['IN_APP'] })}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-sm font-bold rounded-xl flex items-center gap-2 shadow-sm transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Create Template
                </button>
              </div>

              {editingTemplate && (
                <div className={`p-4 rounded-2xl border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
                  <h4 className="font-bold mb-4">Edit Template</h4>
                  <div className="grid gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">Template Name</label>
                      <input
                        type="text"
                        value={editingTemplate.name || ''}
                        onChange={(e) => setEditingTemplate({ ...editingTemplate, name: e.target.value })}
                        className={`w-full p-2.5 rounded-xl border text-sm ${isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-white border-slate-300 text-black'}`}
                        placeholder="e.g., Leave Approval"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">Notification Title</label>
                      <input
                        type="text"
                        value={editingTemplate.title || ''}
                        onChange={(e) => setEditingTemplate({ ...editingTemplate, title: e.target.value })}
                        className={`w-full p-2.5 rounded-xl border text-sm ${isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-white border-slate-300 text-black'}`}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">Message Body (Supports Variables)</label>
                      <textarea
                        value={editingTemplate.message || ''}
                        onChange={(e) => setEditingTemplate({ ...editingTemplate, message: e.target.value })}
                        rows={3}
                        className={`w-full p-2.5 rounded-xl border text-sm ${isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-white border-slate-300 text-black'}`}
                        placeholder="e.g., Your leave request for {date} has been approved."
                      />
                    </div>
                    <div className="flex gap-2 justify-end mt-2">
                      <button
                        onClick={() => setEditingTemplate(null)}
                        className="px-4 py-2 text-sm font-bold text-slate-500 hover:text-slate-700"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSaveTemplate}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold rounded-xl flex items-center gap-2"
                      >
                        <Save className="w-4 h-4" />
                        Save
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid gap-3">
                {templates.length === 0 ? (
                  <div className="text-center p-8 text-slate-500">No templates found.</div>
                ) : (
                  templates.map(t => (
                    <div key={t.id} className={`p-4 rounded-2xl border flex items-center justify-between ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
                      <div>
                        <h4 className="font-bold text-sm">{t.name}</h4>
                        <p className="text-xs text-slate-500 mt-1">{t.title}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => setEditingTemplate(t)} className="p-2 text-slate-400 hover:text-indigo-400">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDeleteTemplate(t.id)} className="p-2 text-slate-400 hover:text-rose-400">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {activeTab === 'TRIGGERS' && (
             <div className={`p-8 text-center rounded-2xl border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
                <Activity className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                <h3 className="text-lg font-bold mb-2">Event Triggers</h3>
                <p className="text-sm text-slate-500 max-w-md mx-auto">
                  Configure automatic notification dispatches based on system events (e.g., Leave Requested, Shift Missed, Incident Reported).
                </p>
                <button className="mt-4 px-4 py-2 bg-rose-600 text-white rounded-xl text-sm font-bold">Add Trigger</button>
             </div>
          )}

          {activeTab === 'ESCALATIONS' && (
             <div className={`p-8 text-center rounded-2xl border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
                <AlertTriangle className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                <h3 className="text-lg font-bold mb-2">Escalation Paths</h3>
                <p className="text-sm text-slate-500 max-w-md mx-auto">
                  Define SLA timers and escalation routes for unacknowledged critical alerts or pending approvals.
                </p>
                <button className="mt-4 px-4 py-2 bg-amber-600 text-white rounded-xl text-sm font-bold">Configure Escalation</button>
             </div>
          )}

          {activeTab === 'AUDIT' && (
            <div className="space-y-4">
               <h3 className="text-lg font-bold">Notification Dispatch Audit</h3>
               <div className="grid gap-2">
                  {auditLogs.length === 0 ? (
                    <div className="text-center p-8 text-slate-500">No dispatch records found.</div>
                  ) : (
                    auditLogs.map((log, i) => (
                      <div key={i} className={`p-3 rounded-xl border text-sm flex items-center justify-between ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
                        <div className="flex flex-col">
                           <span className="font-bold">{log.title}</span>
                           <span className="text-xs text-slate-500 truncate max-w-md">{log.message}</span>
                        </div>
                        <div className="flex flex-col items-end gap-1 shrink-0">
                           <span className="text-[11px] font-mono text-slate-400">{formatTimestamp(log.timestamp)}</span>
                           <span className={`text-[11px] px-2 py-0.5 rounded font-bold ${log.isRead ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                             {log.isRead ? 'READ' : 'UNREAD'}
                           </span>
                        </div>
                      </div>
                    ))
                  )}
               </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
