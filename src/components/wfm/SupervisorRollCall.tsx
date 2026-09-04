import { db } from '../../firebase';
import { collection, query, where, getDocs, doc, setDoc } from 'firebase/firestore';
import React, { useState, useEffect } from 'react';
import { UserSession, CompanyTenant } from '../../types';
import { FirestoreService } from '../../services/firestoreService';
import { useFeedback } from '../../context/ActionFeedbackContext';
import { Search, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

interface Props {
  userSession: UserSession;
  activeCompany: CompanyTenant;
}

export const SupervisorRollCall: React.FC<Props> = ({ userSession, activeCompany }) => {
  const { isDark } = useTheme();
  const { showLoading, showSuccess, showError } = useFeedback();
  const [employees, setEmployees] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribe: () => void;
    const fetchEmps = async () => {
      unsubscribe = FirestoreService.subscribeToEmployees(
        userSession,
        activeCompany.companyId,
        (data) => {
          
          let emps = data.filter(e => e.status === 'ACTIVE' || !e.status);
          if (userSession.role === 'SUPERVISOR' || (userSession.roles && userSession.roles.includes('SUPERVISOR'))) {
            emps = emps.filter(e => (e.assignedSiteId === userSession.branchId || e.siteId === userSession.branchId) && e.role !== 'SUPERVISOR' && e.role !== 'COMPANY_ADMIN');
          }
          setEmployees(emps);
  
          setLoading(false);
        }
      );
    };
    fetchEmps();
    return () => { if (unsubscribe) unsubscribe(); };
  }, [activeCompany.companyId, userSession]);

    const handleMark = async (emp: any, status: 'PRESENT' | 'ABSENT' | 'HALFDAY' | 'OVERTIME' | 'LATE' | 'WEEKLY_OFF') => {
    const dismiss = showLoading(`Marking ${emp.firstName} as ${status}...`);
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const logId = `ATT-${emp.id}-${todayStr}`;
      const attQuery = query(collection(db, 'companies', activeCompany.companyId, 'attendance'), where('employeeId', '==', emp.id), where('date', '==', todayStr));
      const existSnap = await getDocs(attQuery);
      
      let existingRecord = existSnap.empty ? null : existSnap.docs[0].data();
      
      const payload: any = {
        id: existSnap.empty ? logId : existSnap.docs[0].id,
        employeeId: emp.id,
        userName: `${emp.firstName} ${emp.lastName}`,
        action: (status === 'PRESENT' || status === 'LATE' || status === 'OVERTIME') ? 'PUNCH_IN' : status,
        date: todayStr,
        attendanceDate: todayStr,
        siteId: emp.assignedSiteId || 'SITE-DEFAULT',
        locationDetails: 'Marked by Supervisor',
        markedBy: userSession.userId || userSession.uid || '',
        status: status as any
      };

      if (!existingRecord || !existingRecord.checkInTime) {
        payload.checkInTime = (status === 'PRESENT' || status === 'LATE' || status === 'OVERTIME') ? new Date().toISOString() : undefined;
      }
      
      const attRef = doc(db, 'companies', activeCompany.companyId, 'attendance', payload.id);
      await setDoc(attRef, { ...payload, updatedAt: new Date().toISOString() }, { merge: true });
      const success = true;
      dismiss();
      if (success) {
        showSuccess(`Marked ${emp.firstName} as ${status}`);
      } else {
        showError('Failed to record attendance');
      }
    } catch (e) {
      dismiss();
      showError('Error recording attendance');
    }
  };

  const filtered = employees.filter(e => 
    `${e.firstName} ${e.lastName}`.toLowerCase().includes(search.toLowerCase()) || 
    (e.employeeCode && e.employeeCode.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-xs">
      <div className="p-6 border-b border-slate-200 dark:border-slate-800">
        <h2 className="text-lg font-bold">Supervisor Manual Roll-Call</h2>
        <p className="text-xs text-slate-500">Mark attendance for your team manually if they cannot punch in.</p>
        <div className="mt-4 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search employees..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
          />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-0">
        {loading ? (
          <div className="p-8 text-center text-slate-500">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-slate-500">No active employees found in your scope.</div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-10">
              <tr>
                <th className="py-3 px-6 font-bold text-slate-500">Employee</th>
                <th className="py-3 px-6 font-bold text-slate-500">Designation</th>
                <th className="py-3 px-6 font-bold text-slate-500 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
              {filtered.map(emp => (
                <tr key={emp.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="py-3 px-6">
                    <p className="font-bold">{emp.firstName} {emp.lastName}</p>
                    <p className="text-xs text-slate-500 font-mono">{emp.employeeCode || emp.id.substring(0,8)}</p>
                  </td>
                  <td className="py-3 px-6">
                    <span className="px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded-md text-xs font-mono">{emp.designation || 'Staff'}</span>
                  </td>
                  <td className="py-3 px-6 text-right">
                    <div className="flex justify-end gap-1.5">
                      <button 
                        onClick={() => handleMark(emp, 'PRESENT')}
                        className="p-1.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded transition-colors text-[10px] font-bold uppercase tracking-wider"
                        title="Mark Present"
                      >
                        P
                      </button>
                      <button 
                        onClick={() => handleMark(emp,'HALFDAY')}
                        className="p-1.5 bg-amber-50 text-amber-600 hover:bg-amber-100 rounded transition-colors text-[10px] font-bold uppercase tracking-wider"
                        title="Mark Half-Day"
                      >
                        HD
                      </button>
                      <button 
                        onClick={() => handleMark(emp, 'ABSENT')}
                        className="p-1.5 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded transition-colors text-[10px] font-bold uppercase tracking-wider"
                        title="Mark Absent"
                      >
                        A
                      </button>
                      <button 
                        onClick={() => handleMark(emp, 'LATE')}
                        className="p-1.5 bg-orange-50 text-orange-600 hover:bg-orange-100 rounded transition-colors text-[10px] font-bold uppercase tracking-wider"
                        title="Mark Late"
                      >
                        L
                      </button>
                      <button 
                        onClick={() => handleMark(emp, 'OVERTIME')}
                        className="p-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded transition-colors text-[10px] font-bold uppercase tracking-wider"
                        title="Mark Overtime"
                      >
                        OT
                      </button>
                      <button 
                        onClick={() => handleMark(emp, 'WEEKLY_OFF')}
                        className="p-1.5 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded transition-colors text-[10px] font-bold uppercase tracking-wider"
                        title="Weekly Off"
                      >
                        WO
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
