import React, { useState, useEffect } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { FirestoreService } from '../../services/firestoreService';
import { ShiftHandoverRecord, SiteRecord, EmployeeRecord, UserSession, ShiftRecord, IncidentReportRecord, VisitorLogRecord } from '../../types';
import { CheckCircle, Users, AlertTriangle, ListTodo, ShieldAlert, ArrowRightLeft, Search, Plus, Save } from 'lucide-react';
import { collection, query, where, getCountFromServer } from 'firebase/firestore';
import { db } from '../../firebase';

interface ShiftHandoverProps {
  session: UserSession;
  sites: SiteRecord[];
  employees: EmployeeRecord[];
  selectedSiteId: string;
}

export const ShiftHandover: React.FC<ShiftHandoverProps> = ({ session, sites, employees, selectedSiteId }) => {
  const { isDark } = useTheme();
  const [handovers, setHandovers] = useState<ShiftHandoverRecord[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Context states for the new handover form
  const [openIncidents, setOpenIncidents] = useState<IncidentReportRecord[]>([]);
  const [activeVisitors, setActiveVisitors] = useState<VisitorLogRecord[]>([]);

  useEffect(() => {
    const unsub = FirestoreService.subscribeToShiftHandovers(session, session.companyId, (data) => {
      let filtered = data;
      if (selectedSiteId !== 'ALL') {
        filtered = filtered.filter(v => v.siteId === selectedSiteId);
      }
      setHandovers(filtered);
    });
    return () => unsub();
  }, [session, selectedSiteId]);
  
  const prepareHandoverContext = async () => {
    // In a real app, this would use FirestoreService methods to fetch current open data
    // For now, we will just open the modal. The user can add summary and notes.
    setIsModalOpen(true);
  };

  const handleAcknowledge = async (handoverId: string) => {
    await FirestoreService.acknowledgeHandover(session.companyId, handoverId, session.employeeId);
  };

  const pendingAcknowledge = handovers.filter(h => h.status === 'SUBMITTED');

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Shift Handover Register</h3>
          <p className="text-xs text-slate-500">End of shift compliance, context sharing, and incoming acknowledgment.</p>
        </div>
        <button
          onClick={prepareHandoverContext}
          className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow flex items-center gap-2"
        >
          <ArrowRightLeft className="w-4 h-4" />
          <span>Prepare Shift Handover</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className={`p-4 rounded-2xl border ${isDark ? 'bg-slate-900/50 border-slate-800' : 'bg-white border-slate-100'} shadow-sm`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase">Pending Review</p>
              <p className="text-2xl font-black text-slate-900 dark:text-white">{pendingAcknowledge.length}</p>
            </div>
          </div>
        </div>
      </div>

      <div className={`rounded-2xl border ${isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200'} shadow-sm overflow-hidden`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className={`border-b text-[10px] font-bold uppercase tracking-wider ${isDark ? 'border-slate-800 bg-slate-950/60 text-slate-400' : 'border-slate-200 bg-slate-50 text-slate-500'}`}>
                <th className="py-3 px-4">Handover Details</th>
                <th className="py-3 px-4">Outgoing / Incoming</th>
                <th className="py-3 px-4">Summary</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {handovers.map((handover) => {
                const site = sites.find(s => s.id === handover.siteId);
                const outEmp = employees.find(e => e.id === handover.outgoingEmployeeId);
                const inEmp = handover.incomingEmployeeId ? employees.find(e => e.id === handover.incomingEmployeeId) : null;
                const ackEmp = handover.acknowledgedBy ? employees.find(e => e.id === handover.acknowledgedBy) : null;
                return (
                  <tr key={handover.id} className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 transition`}>
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900 dark:text-slate-100">{handover.id}</div>
                      <div className="text-[10px] text-slate-500">{site?.name || handover.siteId}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-xs font-medium text-slate-800 dark:text-slate-300">Out: {`${outEmp?.firstName} ${outEmp?.lastName}` || handover.outgoingEmployeeId}</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">In: {`${ackEmp?.firstName} ${ackEmp?.lastName}` || `${inEmp?.firstName} ${inEmp?.lastName}` || 'Pending...'}</div>
                    </td>
                    <td className="py-3 px-4 max-w-[200px] truncate text-slate-600 dark:text-slate-400">
                      {handover.summary}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                        handover.status === 'ACKNOWLEDGED' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400' :
                        handover.status === 'SUBMITTED' ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400' :
                        handover.status === 'RETURNED' ? 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400' :
                        'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                      }`}>
                        {handover.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      {handover.status === 'SUBMITTED' && (
                        <button onClick={() => handleAcknowledge(handover.id)} className="text-xs text-indigo-600 hover:text-indigo-800 font-bold dark:text-indigo-400">Review & Acknowledge</button>
                      )}
                    </td>
                  </tr>
                )
              })}
              {handovers.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400">No shift handovers recorded.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <CreateHandoverModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          session={session}
          sites={sites}
          employees={employees}
          selectedSiteId={selectedSiteId !== 'ALL' ? selectedSiteId : (sites[0]?.id || '')}
        />
      )}
    </div>
  );
};

const CreateHandoverModal: React.FC<any> = ({ isOpen, onClose, session, sites, employees, selectedSiteId }) => {
  const { isDark } = useTheme();

  const [formData, setFormData] = useState({
    siteId: selectedSiteId,
    summary: '',
    importantNotes: '',
    criticalObservations: '',
  });

const [metrics, setMetrics] = useState({ incidents: 0, visitors: 0, workOrders: 0 });

  useEffect(() => {
    const fetchMetrics = async () => {
      if (!session?.companyId || !formData.siteId) return;
      try {
        const incSnap = await getCountFromServer(query(collection(db, 'companies', session.companyId, 'incident_reports'), where('siteId', '==', formData.siteId), where('status', 'in', ['OPEN', 'INVESTIGATING'])));
        const visSnap = await getCountFromServer(query(collection(db, 'companies', session.companyId, 'visitor_logs'), where('siteId', '==', formData.siteId), where('status', '==', 'CHECKED_IN')));
        const woSnap = await getCountFromServer(query(collection(db, 'companies', session.companyId, 'work_orders'), where('siteId', '==', formData.siteId), where('status', 'in', ['SUBMITTED', 'IN_PROGRESS', 'APPROVED'])));
        
        setMetrics({
          incidents: incSnap.data().count,
          visitors: visSnap.data().count,
          workOrders: woSnap.data().count
        });
      } catch (err) {
        console.error('Failed to fetch metrics', err);
      }
    };
    fetchMetrics();
  }, [session?.companyId, formData.siteId]);


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newHandover: any = {
      id: `HND-${Date.now()}`,
      companyId: session.companyId,
      siteId: formData.siteId,
      shiftId: 'SHIFT-AUTO',
      outgoingEmployeeId: session.employeeId,
      status: 'SUBMITTED',
      summary: formData.summary,
      importantNotes: formData.importantNotes,
      criticalObservations: formData.criticalObservations,
      openTasks: [],
      openIncidents: [],
      activeVisitors: [],
      submittedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    await FirestoreService.submitHandover(session.companyId, newHandover);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm overflow-y-auto pt-20">
      <div className={`w-full max-w-2xl rounded-2xl shadow-xl overflow-hidden ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'} border my-auto`}>
         <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
           <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">Prepare Shift Handover</h2>
           <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">&times;</button>
         </div>
         <form onSubmit={handleSubmit} className="p-5 space-y-4">
           
           {/* Context Highlights */}
           <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-500/20 rounded-xl space-y-2">
             <h4 className="text-xs font-bold text-indigo-900 dark:text-indigo-100">Automated Context Captured</h4>
             <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2 text-xs text-indigo-700 dark:text-indigo-300">
                  <ShieldAlert className="w-4 h-4"/> {metrics.incidents} Open Incidents
                </div>
                <div className="flex items-center gap-2 text-xs text-indigo-700 dark:text-indigo-300">
                  <Users className="w-4 h-4"/> {metrics.visitors} Active Visitors
                </div>
                <div className="flex items-center gap-2 text-xs text-indigo-700 dark:text-indigo-300">
                  <ListTodo className="w-4 h-4"/> {metrics.workOrders} Pending Work Orders
                </div>
             </div>
           </div>

           <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Site</label>
              <select required value={formData.siteId} onChange={e => setFormData({...formData, siteId: e.target.value})} className={`w-full p-2 text-xs rounded-xl border focus:ring-2 outline-none ${isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-white border-slate-200'}`}>
                {sites.map((s: SiteRecord) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
           </div>

           <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Shift Summary *</label>
              <textarea required rows={3} value={formData.summary} onChange={e => setFormData({...formData, summary: e.target.value})} placeholder="Brief overview of shift events..." className={`w-full p-2 text-xs rounded-xl border focus:ring-2 outline-none ${isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-white border-slate-200'}`}></textarea>
           </div>

           <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Critical Observations</label>
              <textarea rows={2} value={formData.criticalObservations} onChange={e => setFormData({...formData, criticalObservations: e.target.value})} placeholder="Any security breaches, safety hazards..." className={`w-full p-2 text-xs rounded-xl border focus:ring-2 outline-none ${isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-white border-slate-200'}`}></textarea>
           </div>

           <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Important Notes for Next Shift</label>
              <textarea rows={2} value={formData.importantNotes} onChange={e => setFormData({...formData, importantNotes: e.target.value})} placeholder="Pending vendor deliveries, pass handovers..." className={`w-full p-2 text-xs rounded-xl border focus:ring-2 outline-none ${isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-white border-slate-200'}`}></textarea>
           </div>
           
           <div className="pt-4 flex justify-end gap-3">
             <button type="button" onClick={onClose} className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400">Cancel</button>
             <button type="submit" className="px-4 py-2 text-xs font-semibold bg-indigo-600 text-white rounded-xl flex items-center gap-2">
               <Save className="w-4 h-4"/> Submit Handover
             </button>
           </div>
         </form>
      </div>
    </div>
  );
};
