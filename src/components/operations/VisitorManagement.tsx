import React, { useState, useEffect } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { FirestoreService } from '../../services/firestoreService';
import { VisitorLogRecord, SiteRecord, EmployeeRecord, UserSession } from '../../types';
import { Users, Search, Plus, Clock, CheckCircle, XCircle, LogOut, Phone, ShieldCheck, Mail, Building, MapPin } from 'lucide-react';


interface VisitorManagementProps {
  session: UserSession;
  sites: SiteRecord[];
  employees: EmployeeRecord[];
  selectedSiteId: string;
}

export const VisitorManagement: React.FC<VisitorManagementProps> = ({ session, sites, employees, selectedSiteId }) => {
  const { isDark } = useTheme();
  const [visitors, setVisitors] = useState<VisitorLogRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
  const [selectedVisitor, setSelectedVisitor] = useState<VisitorLogRecord | null>(null);

  useEffect(() => {
    const unsub = FirestoreService.subscribeToVisitorLogs(session, session.companyId, (data) => {
      let filtered = data;
      if (selectedSiteId !== 'ALL') {
        filtered = filtered.filter(v => v.siteId === selectedSiteId);
      }
      // Simple date filter (today)
      const today = new Date().toISOString().split('T')[0];
      filtered = filtered.filter(v => v.createdAt?.startsWith(today) || v.checkInTime?.startsWith(today) || v.expectedDate?.startsWith(today));
      setVisitors(filtered);
    });
    return () => unsub();
  }, [session, selectedSiteId]);

  const activeVisitors = visitors.filter(v => v.status === 'CHECKED_IN');
  const expectedVisitors = visitors.filter(v => v.status === 'EXPECTED' || v.status === 'APPROVED');
  const overstayVisitors = visitors.filter(v => v.status === 'OVERSTAY');
  
  const handleCheckIn = async (visitor: VisitorLogRecord) => {
    if (!visitor.id) return;
    await FirestoreService.checkInVisitor(session.companyId, visitor);
  };

  const handleCheckOut = async (visitorId: string, notes: string) => {
    try {
      const { updateDoc, doc } = await import('firebase/firestore');
      const { db } = await import('../../firebase');
      const ref = doc(db, 'companies', session.companyId, 'visitor_logs', visitorId);
      await updateDoc(ref, {
        status: 'CHECKED_OUT',
        checkOutTime: new Date().toISOString(),
        checkoutGuardId: session.employeeId,
        checkoutNotes: notes,
        updatedAt: new Date().toISOString()
      });
      setIsCheckoutModalOpen(false);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Enterprise Visitor Register</h3>
          <p className="text-xs text-slate-500">Track entry/exit of guests, contractors, and corporate visitors.</p>
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search visitors..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`pl-9 pr-4 py-2 text-xs rounded-xl border focus:ring-2 focus:ring-indigo-500 outline-none w-64 ${
                isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200'
              }`}
            />
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Pre-register / Walk-in</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className={`p-4 rounded-2xl border ${isDark ? 'bg-slate-900/50 border-slate-800' : 'bg-white border-slate-100'} shadow-sm`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase">Expected Today</p>
              <p className="text-2xl font-black text-slate-900 dark:text-white">{expectedVisitors.length}</p>
            </div>
          </div>
        </div>
        
        <div className={`p-4 rounded-2xl border ${isDark ? 'bg-slate-900/50 border-slate-800' : 'bg-white border-slate-100'} shadow-sm`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase">Active on Site</p>
              <p className="text-2xl font-black text-slate-900 dark:text-white">{activeVisitors.length}</p>
            </div>
          </div>
        </div>

        <div className={`p-4 rounded-2xl border ${isDark ? 'bg-slate-900/50 border-slate-800' : 'bg-white border-slate-100'} shadow-sm`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-rose-100 dark:bg-rose-500/20 flex items-center justify-center text-rose-600 dark:text-rose-400">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase">Overstay / Alerts</p>
              <p className="text-2xl font-black text-slate-900 dark:text-white">{overstayVisitors.length}</p>
            </div>
          </div>
        </div>
      </div>

      <div className={`rounded-2xl border ${isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200'} shadow-sm overflow-hidden`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className={`border-b text-[10px] font-bold uppercase tracking-wider ${isDark ? 'border-slate-800 bg-slate-950/60 text-slate-400' : 'border-slate-200 bg-slate-50 text-slate-500'}`}>
                <th className="py-3 px-4">Visitor / Identity</th>
                <th className="py-3 px-4">Host / Purpose</th>
                <th className="py-3 px-4">Pass ID / Type</th>
                <th className="py-3 px-4">Timestamps</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {visitors.filter(v => v.visitorName.toLowerCase().includes(searchQuery.toLowerCase()) || v.badgeNumber?.toLowerCase().includes(searchQuery.toLowerCase())).map((visitor) => (
                <tr key={visitor.id} className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 transition`}>
                  <td className="py-3 px-4">
                    <div className="font-bold text-slate-900 dark:text-slate-100">{visitor.visitorName}</div>
                    <div className="text-[10px] text-slate-500 flex items-center gap-2 mt-0.5">
                      {visitor.visitorCompany && <span><Building className="w-3 h-3 inline mr-1"/>{visitor.visitorCompany}</span>}
                      <span><Phone className="w-3 h-3 inline mr-1"/>{visitor.visitorPhone}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="font-medium text-slate-800 dark:text-slate-300 flex items-center gap-1"><Users className="w-3 h-3"/> {visitor.hostEmployeeName}</div>
                    <div className="text-[10px] text-slate-500 truncate max-w-[150px]">{visitor.purpose}</div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400">{visitor.badgeNumber || 'TBD'}</div>
                    <div className="text-[10px] text-slate-500">{visitor.visitType || 'GUEST'}</div>
                  </td>
                  <td className="py-3 px-4 text-[10px]">
                    {visitor.checkInTime ? (
                      <div className="text-emerald-600 dark:text-emerald-400">In: {new Date(visitor.checkInTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                    ) : (
                      <div className="text-slate-500">Exp: {visitor.expectedTime || '--:--'}</div>
                    )}
                    {visitor.checkOutTime && (
                      <div className="text-slate-500">Out: {new Date(visitor.checkOutTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                    )}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                      visitor.status === 'CHECKED_IN' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400' :
                      visitor.status === 'EXPECTED' || visitor.status === 'APPROVED' ? 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400' :
                      visitor.status === 'OVERSTAY' ? 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400' :
                      'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                    }`}>
                      {visitor.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    {(visitor.status === 'EXPECTED' || visitor.status === 'APPROVED') && (
                      <button onClick={() => handleCheckIn(visitor)} className="text-xs text-indigo-600 hover:text-indigo-800 font-bold dark:text-indigo-400">Check In</button>
                    )}
                    {(visitor.status === 'CHECKED_IN' || visitor.status === 'OVERSTAY') && (
                      <button onClick={() => { setSelectedVisitor(visitor); setIsCheckoutModalOpen(true); }} className="text-xs text-rose-600 hover:text-rose-800 font-bold dark:text-rose-400">Check Out</button>
                    )}
                  </td>
                </tr>
              ))}
              {visitors.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">No visitors logged today.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Basic registration modal (abbreviated for demonstration, in a real app this would have all fields) */}
      {isModalOpen && (
        <VisitorRegistrationModal 
          isOpen={isModalOpen} 
          onClose={() => setIsModalOpen(false)} 
          session={session} 
          sites={sites} 
          employees={employees} 
        />
      )}
      
      {/* Checkout modal */}
      {isCheckoutModalOpen && selectedVisitor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className={`w-full max-w-sm rounded-2xl shadow-xl overflow-hidden ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'} border`}>
             <div className="p-5 border-b border-slate-200 dark:border-slate-800">
               <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">Check-Out Visitor</h2>
             </div>
             <div className="p-5 space-y-4">
               <p className="text-xs text-slate-600 dark:text-slate-400">Confirm checkout for <b>{selectedVisitor.visitorName}</b>?</p>
               <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Checkout Notes</label>
                  <textarea id="checkoutNotes" className={`w-full p-2 text-xs rounded-xl border focus:ring-2 outline-none ${isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-white border-slate-200'}`} rows={2}></textarea>
               </div>
             </div>
             <div className="p-4 bg-slate-50 dark:bg-slate-950/50 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-3">
               <button onClick={() => setIsCheckoutModalOpen(false)} className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400">Cancel</button>
               <button onClick={() => {
                 const notes = (document.getElementById('checkoutNotes') as HTMLTextAreaElement).value;
                 handleCheckOut(selectedVisitor.id, notes);
               }} className="px-4 py-2 text-xs font-semibold bg-rose-600 text-white rounded-xl">Check Out</button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

const VisitorRegistrationModal: React.FC<any> = ({ isOpen, onClose, session, sites, employees }) => {
  const { isDark } = useTheme();
  const [formData, setFormData] = useState({
    visitorName: '',
    visitorPhone: '',
    visitorCompany: '',
    siteId: sites[0]?.id || '',
    hostEmployeeId: '',
    purpose: '',
    visitType: 'GUEST',
    identificationType: 'AADHAAR_MASKED',
    identificationReference: '',
    expectedDate: new Date().toISOString().split('T')[0],
    expectedTime: '09:00',
    expectedDuration: 60,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const site = sites.find((s: SiteRecord) => s.id === formData.siteId);
    const host = employees.find((em: EmployeeRecord) => em.id === formData.hostEmployeeId);
    
    const newVisitor: any = {
      id: `VIS-${Date.now()}`,
      companyId: session.companyId,
      ...formData,
      siteName: site?.name || '',
      hostEmployeeName: host?.name || '',
      status: 'EXPECTED',
      badgeNumber: `PASS-${Math.floor(Math.random() * 9000) + 1000}`,
      createdBy: session.employeeId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    try {
      const { setDoc, doc } = await import('firebase/firestore');
      const { db } = await import('../../firebase');
      await setDoc(doc(db, 'companies', session.companyId, 'visitor_logs', newVisitor.id), newVisitor);
      onClose();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm overflow-y-auto pt-20">
      <div className={`w-full max-w-2xl rounded-2xl shadow-xl overflow-hidden ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'} border my-auto`}>
         <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
           <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">Register Visitor (Pre-register or Walk-in)</h2>
           <button onClick={onClose}><XCircle className="w-5 h-5 text-slate-400"/></button>
         </div>
         <form onSubmit={handleSubmit} className="p-5 space-y-4">
           <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Visitor Name *</label>
                <input required type="text" value={formData.visitorName} onChange={e => setFormData({...formData, visitorName: e.target.value})} className={`w-full p-2 text-xs rounded-xl border focus:ring-2 outline-none ${isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-white border-slate-200'}`} />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Mobile Number *</label>
                <input required type="text" value={formData.visitorPhone} onChange={e => setFormData({...formData, visitorPhone: e.target.value})} className={`w-full p-2 text-xs rounded-xl border focus:ring-2 outline-none ${isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-white border-slate-200'}`} />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Organization</label>
                <input type="text" value={formData.visitorCompany} onChange={e => setFormData({...formData, visitorCompany: e.target.value})} className={`w-full p-2 text-xs rounded-xl border focus:ring-2 outline-none ${isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-white border-slate-200'}`} />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Visitor Type</label>
                <select value={formData.visitType} onChange={e => setFormData({...formData, visitType: e.target.value})} className={`w-full p-2 text-xs rounded-xl border focus:ring-2 outline-none ${isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-white border-slate-200'}`}>
                  <option value="CLIENT">Client</option>
                  <option value="VENDOR">Vendor</option>
                  <option value="CONTRACTOR">Contractor</option>
                  <option value="INTERVIEW_VISITOR">Interview Candidate</option>
                  <option value="DELIVERY">Delivery</option>
                  <option value="SERVICE_TECHNICIAN">Service Tech</option>
                  <option value="GUEST">Guest / Personal</option>
                  <option value="OFFICIAL">Official</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Identity Type</label>
                <select value={formData.identificationType} onChange={e => setFormData({...formData, identificationType: e.target.value})} className={`w-full p-2 text-xs rounded-xl border focus:ring-2 outline-none ${isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-white border-slate-200'}`}>
                  <option value="AADHAAR_MASKED">Masked Aadhaar</option>
                  <option value="PAN">PAN Card</option>
                  <option value="DRIVING_LICENSE">Driving License</option>
                  <option value="COMPANY_ID">Company ID</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Identity Ref (Last 4 Digits)</label>
                <input type="text" value={formData.identificationReference} onChange={e => setFormData({...formData, identificationReference: e.target.value})} placeholder="e.g. 1234" className={`w-full p-2 text-xs rounded-xl border focus:ring-2 outline-none ${isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-white border-slate-200'}`} />
              </div>
              <div className="col-span-2">
                 <div className="h-px bg-slate-200 dark:bg-slate-800 w-full my-2"></div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Site / Facility *</label>
                <select required value={formData.siteId} onChange={e => setFormData({...formData, siteId: e.target.value})} className={`w-full p-2 text-xs rounded-xl border focus:ring-2 outline-none ${isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-white border-slate-200'}`}>
                  {sites.map((s: SiteRecord) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Host Employee *</label>
                <select required value={formData.hostEmployeeId} onChange={e => setFormData({...formData, hostEmployeeId: e.target.value})} className={`w-full p-2 text-xs rounded-xl border focus:ring-2 outline-none ${isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-white border-slate-200'}`}>
                  <option value="">-- Select Host --</option>
                  {employees.filter((em: EmployeeRecord) => em.assignedSiteId === formData.siteId || formData.siteId === '').map((em: EmployeeRecord) => (
                    <option key={em.id} value={em.id}>{`${em.firstName} ${em.lastName}`} ({em.employeeCode})</option>
                  ))}
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Purpose of Visit *</label>
                <input required type="text" value={formData.purpose} onChange={e => setFormData({...formData, purpose: e.target.value})} className={`w-full p-2 text-xs rounded-xl border focus:ring-2 outline-none ${isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-white border-slate-200'}`} />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Expected Date *</label>
                <input required type="date" value={formData.expectedDate} onChange={e => setFormData({...formData, expectedDate: e.target.value})} className={`w-full p-2 text-xs rounded-xl border focus:ring-2 outline-none ${isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-white border-slate-200'}`} />
              </div>
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Time</label>
                  <input required type="time" value={formData.expectedTime} onChange={e => setFormData({...formData, expectedTime: e.target.value})} className={`w-full p-2 text-xs rounded-xl border focus:ring-2 outline-none ${isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-white border-slate-200'}`} />
                </div>
                <div className="flex-1">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Dur. (mins)</label>
                  <input required type="number" value={formData.expectedDuration} onChange={e => setFormData({...formData, expectedDuration: Number(e.target.value)})} className={`w-full p-2 text-xs rounded-xl border focus:ring-2 outline-none ${isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-white border-slate-200'}`} />
                </div>
              </div>
           </div>
           <div className="pt-4 flex justify-end gap-3">
             <button type="button" onClick={onClose} className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400">Cancel</button>
             <button type="submit" className="px-4 py-2 text-xs font-semibold bg-indigo-600 text-white rounded-xl">Register Visitor</button>
           </div>
         </form>
      </div>
    </div>
  );
};
