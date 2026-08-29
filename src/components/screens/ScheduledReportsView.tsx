import React, { useState, useEffect } from 'react';
import { Calendar, Clock, Download, Mail, Plus, Trash2, Edit2, CheckCircle2 } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { UserSession, CompanyTenant } from '../../types';
import { FirestoreService } from '../../services/firestoreService';
import { db } from '../../firebase';
import { collection, query, getDocs, setDoc, doc, deleteDoc, serverTimestamp } from 'firebase/firestore';

interface ScheduledReportsViewProps {
  userSession: UserSession | null;
  activeCompany: CompanyTenant | null;
}

export const ScheduledReportsView: React.FC<ScheduledReportsViewProps> = ({ userSession, activeCompany }) => {
  const { isDark } = useTheme();
  const [schedules, setSchedules] = useState<any[]>([]);
  const [isEditing, setIsEditing] = useState<any | null>(null);

  useEffect(() => {
    fetchSchedules();
  }, [activeCompany]);

  const fetchSchedules = async () => {
    if (!activeCompany) return;
    try {
      const q = query(collection(db, 'companies', activeCompany.companyId, 'report_schedules'));
      const snap = await getDocs(q);
      setSchedules(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (e) {
      console.error(e);
    }
  };

  const handleSave = async () => {
    if (!activeCompany || !isEditing) return;
    try {
      const scheduleRef = doc(
        collection(db, 'companies', activeCompany.companyId, 'report_schedules'),
        isEditing.id || Date.now().toString()
      );
      
      await setDoc(scheduleRef, {
        ...isEditing,
        createdAt: isEditing.createdAt || serverTimestamp(),
        updatedAt: serverTimestamp()
      }, { merge: true });
      
      setIsEditing(null);
      fetchSchedules();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async (id: string) => {
    if (!activeCompany) return;
    try {
      await deleteDoc(doc(db, 'companies', activeCompany.companyId, 'report_schedules', id));
      fetchSchedules();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="font-bold">Automated Report Schedules</h3>
        <button 
          onClick={() => setIsEditing({ name: '', module: 'ATTENDANCE', frequency: 'WEEKLY', format: 'CSV', recipients: '' })}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-sm flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          New Schedule
        </button>
      </div>

      {isEditing && (
        <div className={`p-6 rounded-3xl border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
          <h4 className="font-bold mb-4">Configure Schedule</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Schedule Name</label>
              <input 
                type="text" 
                value={isEditing.name || ''}
                onChange={e => setIsEditing({...isEditing, name: e.target.value})}
                className={`w-full p-2.5 rounded-xl border ${isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-white border-slate-300'}`} 
                placeholder="e.g., Weekly Attendance Summary"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Target Module</label>
              <select 
                value={isEditing.module || 'ATTENDANCE'}
                onChange={e => setIsEditing({...isEditing, module: e.target.value})}
                className={`w-full p-2.5 rounded-xl border ${isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-white border-slate-300'}`}
              >
                <option value="ATTENDANCE">Attendance</option>
                <option value="PAYROLL">Payroll</option>
                <option value="INVENTORY">Inventory Stock</option>
                <option value="INCIDENTS">Security Incidents</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Frequency</label>
              <select 
                value={isEditing.frequency || 'WEEKLY'}
                onChange={e => setIsEditing({...isEditing, frequency: e.target.value})}
                className={`w-full p-2.5 rounded-xl border ${isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-white border-slate-300'}`}
              >
                <option value="DAILY">Daily (End of Day)</option>
                <option value="WEEKLY">Weekly (Monday Morning)</option>
                <option value="MONTHLY">Monthly (1st of Month)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Export Format</label>
              <select 
                value={isEditing.format || 'CSV'}
                onChange={e => setIsEditing({...isEditing, format: e.target.value})}
                className={`w-full p-2.5 rounded-xl border ${isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-white border-slate-300'}`}
              >
                <option value="CSV">CSV Spreadsheet</option>
                <option value="PDF">PDF Document</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-500 mb-1">Recipients (comma separated emails)</label>
              <input 
                type="text" 
                value={isEditing.recipients || ''}
                onChange={e => setIsEditing({...isEditing, recipients: e.target.value})}
                className={`w-full p-2.5 rounded-xl border ${isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-white border-slate-300'}`} 
                placeholder="admin@company.com, manager@company.com"
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-4">
            <button onClick={() => setIsEditing(null)} className="px-4 py-2 font-bold text-slate-500">Cancel</button>
            <button onClick={handleSave} className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold">Save Schedule</button>
          </div>
        </div>
      )}

      <div className="grid gap-3">
        {schedules.length === 0 ? (
          <div className="p-8 text-center border rounded-3xl border-dashed border-slate-300 dark:border-slate-800 text-slate-500">
            <Calendar className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No automated reports scheduled yet.</p>
          </div>
        ) : (
          schedules.map(sch => (
            <div key={sch.id} className={`p-4 rounded-2xl border flex items-center justify-between ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
              <div className="flex items-center gap-4">
                <div className="p-3 bg-indigo-500/10 text-indigo-500 rounded-xl">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-sm">{sch.name}</h4>
                  <p className="text-xs text-slate-500 mt-1 flex items-center gap-2">
                    <span className="font-medium text-slate-700 dark:text-slate-300">{sch.module}</span>
                    • {sch.frequency} • {sch.format}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => setIsEditing(sch)} className="p-2 text-slate-400 hover:text-indigo-400 transition">
                  <Edit2 className="w-4 h-4" />
                </button>
                <button onClick={() => handleDelete(sch.id)} className="p-2 text-slate-400 hover:text-rose-400 transition">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
