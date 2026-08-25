import React, { useState, useEffect } from 'react';
import { 
  Network, 
  AlertTriangle, 
  ArrowRightLeft, 
  Users, 
  Building2,
  MapPin,
  Clock,
  CheckCircle2,
  UserCog,
  RefreshCw
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { CompanyTenant, UserSession, EmployeeRecord, SiteRecord, BranchRecord, RegionRecord, DepartmentRecord } from '../../types';
import { OrgControlService, OrgAssignment } from '../../services/orgControlService';
import { FirestoreService } from '../../services/firestoreService';

interface OrgControlScreenProps {
  userSession: UserSession;
  activeCompany: CompanyTenant | null;
  onNavigate?: (screen: any) => void;
  
}

export function OrgControlScreen({ userSession, activeCompany, onNavigate }: OrgControlScreenProps) {
  const { isDark } = useTheme();
  const [activeTab, setActiveTab] = useState<'HIERARCHY' | 'ASSIGNMENTS' | 'CONFLICTS'>('CONFLICTS');
  const [isLoading, setIsLoading] = useState(false);
  const [employees, setEmployees] = useState<EmployeeRecord[]>([]);
  const [sites, setSites] = useState<SiteRecord[]>([]);
  const [branches, setBranches] = useState<BranchRecord[]>([]);
  const [regions, setRegions] = useState<RegionRecord[]>([]);
  const [departments, setDepartments] = useState<DepartmentRecord[]>([]);
  
  const [conflicts, setConflicts] = useState<{ type: string; entity: string; message: string }[]>([]);
  const [assignments, setAssignments] = useState<OrgAssignment[]>([]);

  // Modals
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignForm, setAssignForm] = useState<{
    employeeId: string;
    type: 'TRANSFER' | 'TEMPORARY' | 'DELEGATION';
    roleType: 'MANAGER' | 'SUPERVISOR' | 'OPERATIONAL';
    targetType: 'REGION' | 'BRANCH' | 'SITE' | 'DEPARTMENT';
    targetId: string;
    shiftId: string;
    effectiveFrom: string;
    effectiveTo: string;
    notes: string;
  }>({
    employeeId: '',
    type: 'TRANSFER',
    roleType: 'OPERATIONAL',
    targetType: 'SITE',
    targetId: '',
    shiftId: '',
    effectiveFrom: new Date().toISOString().split('T')[0],
    effectiveTo: '',
    notes: ''
  });

  const [feedback, setFeedback] = useState<{ text: string; type: 'SUCCESS' | 'ERROR' } | null>(null);

  useEffect(() => {
    if (!activeCompany) return;
    loadData();
  }, [activeCompany]);

  const loadData = async () => {
    if (!activeCompany) return;
    setIsLoading(true);
    try {
      const [emp, sit, bra, reg, dep] = await Promise.all([
        FirestoreService.getEmployees(userSession, activeCompany.companyId),
        FirestoreService.getSites(activeCompany.companyId),
        FirestoreService.getBranches(activeCompany.companyId),
        FirestoreService.getRegions(activeCompany.companyId),
        FirestoreService.getDepartments(activeCompany.companyId)
      ]);
      setEmployees(emp);
      setSites(sit);
      setBranches(bra);
      setRegions(reg);
      setDepartments(dep);

      runConflictScan(emp, sit);
      // Assignments can be loaded from FirestoreService (we'll need a method, or just use getDocs here for speed)
      import('firebase/firestore').then(async ({ collection, query, getDocs, orderBy, where }) => {
        const { db } = await import('../../firebase');
        const q = query(
          collection(db, 'companies', activeCompany.companyId, 'orgAssignments'),
          orderBy('createdAt', 'desc')
        );
        const snap = await getDocs(q);
        setAssignments(snap.docs.map(d => d.data() as OrgAssignment));
      });
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const runConflictScan = async (emps: EmployeeRecord[], sits: SiteRecord[]) => {
    const issues: { type: string; entity: string; message: string }[] = [];

    // 1. Check sites without management
    for (const site of sits) {
      if (site.status !== 'ACTIVE') continue;
      const res = await OrgControlService.validateSiteManagement(activeCompany!.companyId, site.id);
      if (!res.valid) {
        issues.push({ type: 'SITE', entity: site.name, message: res.error || 'No active management found.' });
      }
    }

    // 2. Check employees without valid ownership
    for (const emp of emps) {
      if (emp.status !== 'ACTIVE') continue;
      const res = await OrgControlService.validateEmployeeAssignment(emp);
      if (!res.valid) {
        issues.push({ type: 'EMPLOYEE', entity: `${emp.firstName} ${emp.lastName} (${emp.employeeId})`, message: res.error || 'Invalid assignment scope.' });
      }
    }

    setConflicts(issues);
  };

  const handleSubmitAssignment = async () => {
    if (!activeCompany) return;
    try {
      await OrgControlService.submitAssignment(activeCompany.companyId, {
        companyId: activeCompany.companyId,
        employeeId: assignForm.employeeId,
        type: assignForm.type,
        roleType: assignForm.roleType,
        targetType: assignForm.targetType,
        targetId: assignForm.targetId,
        shiftId: assignForm.shiftId || undefined,
        effectiveFrom: assignForm.effectiveFrom,
        effectiveTo: assignForm.type === 'TEMPORARY' ? assignForm.effectiveTo : undefined,
        notes: assignForm.notes,
        createdBy: userSession.userId
      }, true); // auto-approve for testing

      setFeedback({ text: 'Assignment applied successfully.', type: 'SUCCESS' });
      setShowAssignModal(false);
      loadData();
    } catch (err: any) {
      setFeedback({ text: err.message, type: 'ERROR' });
    }
  };

  return (
    <div className={`h-full flex flex-col ${isDark ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-900'}`}>
      {/* Header */}
      <div className={`p-4 md:p-6 border-b flex flex-col md:flex-row md:items-center justify-between gap-4 ${isDark ? 'border-slate-800 bg-slate-950' : 'border-slate-200 bg-white'}`}>
        <div>
          <h1 className="text-xl md:text-2xl font-bold flex items-center gap-2">
            <Network className="w-6 h-6 text-indigo-500" />
            Organizational Control
          </h1>
          <p className="text-xs md:text-sm text-slate-500 mt-1">Manage hierarchy, valid assignments, and resolve responsibility conflicts.</p>
        </div>
        <button 
          onClick={() => setShowAssignModal(true)}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs md:text-sm font-bold flex items-center justify-center gap-2 transition-colors shadow-lg"
        >
          <UserCog className="w-4 h-4" />
          New Org Assignment
        </button>
      </div>

      {feedback && (
        <div className={`m-4 p-3 rounded-xl text-xs font-bold flex items-center gap-2 ${feedback.type === 'SUCCESS' ? 'bg-emerald-900/50 text-emerald-400 border border-emerald-800' : 'bg-rose-900/50 text-rose-400 border border-rose-800'}`}>
          {feedback.type === 'SUCCESS' ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
          {feedback.text}
          <button onClick={() => setFeedback(null)} className="ml-auto opacity-50 hover:opacity-100">Dismiss</button>
        </div>
      )}

      {/* Tabs */}
      <div className={`px-4 md:px-6 py-2 border-b flex gap-4 overflow-x-auto hide-scrollbar ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
        {[
          { id: 'CONFLICTS', label: 'Integrity Conflicts', icon: AlertTriangle },
          { id: 'ASSIGNMENTS', label: 'Org Assignments', icon: ArrowRightLeft },
          { id: 'HIERARCHY', label: 'Structure View', icon: Building2 },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 py-3 px-1 text-xs md:text-sm font-bold border-b-2 whitespace-nowrap transition-colors ${
              activeTab === tab.id
                ? 'border-indigo-500 text-indigo-500'
                : 'border-transparent text-slate-500 hover:text-slate-300'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
            {tab.id === 'CONFLICTS' && conflicts.length > 0 && (
              <span className="ml-1.5 bg-rose-500 text-white px-2 py-0.5 rounded-full text-[10px]">
                {conflicts.length}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-auto p-4 md:p-6">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-40">
            <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin mb-4" />
            <p className="text-sm text-slate-500">Scanning organizational integrity...</p>
          </div>
        ) : (
          <>
            {activeTab === 'CONFLICTS' && (
              <div className="space-y-4">
                {conflicts.length === 0 ? (
                  <div className={`p-8 rounded-2xl border text-center ${isDark ? 'border-emerald-900/30 bg-emerald-900/10' : 'border-emerald-200 bg-emerald-50'}`}>
                    <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
                    <h3 className="text-lg font-bold text-emerald-600 dark:text-emerald-400">Zero Integrity Conflicts</h3>
                    <p className="text-xs text-emerald-700/70 dark:text-emerald-400/70 mt-1">
                      All sites have managers and all employees have valid assignments.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-3">
                    {conflicts.map((c, i) => (
                      <div key={i} className={`p-4 rounded-xl border flex items-start gap-3 ${isDark ? 'border-rose-900/50 bg-rose-950/20' : 'border-rose-200 bg-rose-50'}`}>
                        <div className="w-8 h-8 rounded-full bg-rose-100 dark:bg-rose-900/50 flex items-center justify-center shrink-0">
                          <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                        </div>
                        <div>
                          <div className="text-[10px] font-bold text-rose-500 tracking-wider uppercase">{c.type} CONFLICT</div>
                          <h4 className="text-sm font-bold mt-0.5">{c.entity}</h4>
                          <p className="text-xs text-rose-700 dark:text-rose-300 mt-1">{c.message}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'ASSIGNMENTS' && (
              <div className="space-y-4">
                {assignments.map(a => {
                  const emp = employees.find(e => e.id === a.employeeId);
                  return (
                    <div key={a.id} className={`p-4 rounded-xl border flex flex-col md:flex-row gap-4 md:items-center justify-between ${isDark ? 'border-slate-800 bg-slate-900/50' : 'border-slate-200 bg-white'}`}>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center shrink-0">
                          {a.type === 'TRANSFER' ? <ArrowRightLeft className="w-5 h-5 text-indigo-600 dark:text-indigo-400" /> : 
                           a.type === 'TEMPORARY' ? <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400" /> : 
                           <UserCog className="w-5 h-5 text-blue-600 dark:text-blue-400" />}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-bold">{emp?.firstName} {emp?.lastName}</h4>
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold tracking-wider ${
                              a.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400' :
                              a.status === 'PENDING_APPROVAL' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400' :
                              'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400'
                            }`}>
                              {a.status}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            {a.type} • {a.roleType} → {a.targetType} ({a.targetId})
                          </p>
                          <div className="text-[10px] text-slate-400 mt-1 font-mono">
                            Effective: {a.effectiveFrom} {a.effectiveTo ? ` to ${a.effectiveTo}` : ''}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {assignments.length === 0 && (
                  <p className="text-sm text-slate-500 text-center py-8">No assignment history found.</p>
                )}
              </div>
            )}

            {activeTab === 'HIERARCHY' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                 {/* This would be a tree view. We'll render a simplified summary list for demonstration. */}
                 {regions.map(r => (
                   <div key={r.id} className={`p-4 rounded-xl border ${isDark ? 'border-slate-800 bg-slate-950' : 'border-slate-200 bg-white'}`}>
                     <h3 className="font-bold text-indigo-500 flex items-center gap-2"><MapPin className="w-4 h-4"/> Region: {r.name}</h3>
                     <div className="mt-3 space-y-3 pl-2 border-l-2 border-slate-200 dark:border-slate-800">
                        {branches.filter(b => b.code.startsWith(r.code)).map(b => (
                          <div key={b.id} className="pl-4 relative">
                            <h4 className="font-bold text-sm flex items-center gap-2"><Building2 className="w-3 h-3 text-slate-400"/> Branch: {b.name}</h4>
                            <div className="mt-2 space-y-2 pl-2 border-l-2 border-slate-100 dark:border-slate-800">
                               {sites.filter(s => s.branchId === b.id).map(s => {
                                 const siteEmp = employees.filter(e => e.assignedSiteId === s.id);
                                 const mgrs = siteEmp.filter(e => ((e as any).authorityLevel === 'HIGH') || e.role === 'COMPANY_ADMIN' || e.role === 'HR_ADMIN' || ((e as any).role === 'MANAGER') || e.role === 'SUPERVISOR');
                                 return (
                                   <div key={s.id} className="pl-4">
                                     <div className="text-xs font-bold text-slate-700 dark:text-slate-300">{s.name}</div>
                                     <div className="text-[10px] text-slate-500">
                                       Staff: {siteEmp.length} | Mgrs: {mgrs.length > 0 ? mgrs.map(m => m.firstName).join(', ') : <span className="text-rose-500">NONE</span>}
                                     </div>
                                   </div>
                                 )
                               })}
                            </div>
                          </div>
                        ))}
                     </div>
                   </div>
                 ))}
              </div>
            )}
          </>
        )}
      </div>

      {showAssignModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`w-full max-w-lg p-5 md:p-6 rounded-3xl border shadow-2xl ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
            <h3 className="text-lg font-bold flex items-center gap-2 mb-4">
              <UserCog className="w-5 h-5 text-indigo-500" />
              New Organizational Assignment
            </h3>

            <div className="space-y-4 text-xs md:text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">Assignment Type</label>
                  <select 
                    value={assignForm.type}
                    onChange={(e) => setAssignForm(p => ({ ...p, type: e.target.value as any }))}
                    className={`w-full px-3 py-2 rounded-xl border focus:outline-none ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}
                  >
                    <option value="TRANSFER">Permanent Transfer</option>
                    <option value="TEMPORARY">Temporary Assignment</option>
                    <option value="DELEGATION">Delegation of Authority</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">Target Role Scope</label>
                  <select 
                    value={assignForm.roleType}
                    onChange={(e) => setAssignForm(p => ({ ...p, roleType: e.target.value as any }))}
                    className={`w-full px-3 py-2 rounded-xl border focus:outline-none ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}
                  >
                    <option value="MANAGER">Manager / Head</option>
                    <option value="SUPERVISOR">Supervisor</option>
                    <option value="OPERATIONAL">Operational / Worker</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1">Select Employee</label>
                <select 
                  value={assignForm.employeeId}
                  onChange={(e) => setAssignForm(p => ({ ...p, employeeId: e.target.value }))}
                  className={`w-full px-3 py-2 rounded-xl border focus:outline-none ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}
                >
                  <option value="">-- Choose Employee --</option>
                  {employees.map(e => <option key={e.id} value={e.id}>{e.employeeId} - {e.firstName} {e.lastName} ({e.designation})</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">Target Organization Unit</label>
                  <select 
                    value={assignForm.targetType}
                    onChange={(e) => setAssignForm(p => ({ ...p, targetType: e.target.value as any }))}
                    className={`w-full px-3 py-2 rounded-xl border focus:outline-none ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}
                  >
                    <option value="REGION">Region</option>
                    <option value="BRANCH">Branch</option>
                    <option value="SITE">Site</option>
                    <option value="DEPARTMENT">Department</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">Select Unit</label>
                  <select 
                    value={assignForm.targetId}
                    onChange={(e) => setAssignForm(p => ({ ...p, targetId: e.target.value }))}
                    className={`w-full px-3 py-2 rounded-xl border focus:outline-none ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}
                  >
                    <option value="">-- Choose --</option>
                    {assignForm.targetType === 'SITE' && sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    {assignForm.targetType === 'BRANCH' && branches.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    {assignForm.targetType === 'REGION' && regions.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    {assignForm.targetType === 'DEPARTMENT' && departments.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">Effective From</label>
                  <input 
                    type="date"
                    value={assignForm.effectiveFrom}
                    onChange={(e) => setAssignForm(p => ({ ...p, effectiveFrom: e.target.value }))}
                    className={`w-full px-3 py-2 rounded-xl border focus:outline-none ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}
                  />
                </div>
                {assignForm.type === 'TEMPORARY' && (
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-1">Effective To</label>
                    <input 
                      type="date"
                      value={assignForm.effectiveTo}
                      onChange={(e) => setAssignForm(p => ({ ...p, effectiveTo: e.target.value }))}
                      className={`w-full px-3 py-2 rounded-xl border focus:outline-none ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}
                    />
                  </div>
                )}
              </div>

            </div>

            <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
              <button 
                onClick={() => setShowAssignModal(false)}
                className="px-4 py-2 rounded-xl font-bold text-sm bg-slate-200 hover:bg-slate-300 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300"
              >
                Cancel
              </button>
              <button 
                onClick={handleSubmitAssignment}
                disabled={!assignForm.employeeId || !assignForm.targetId}
                className="px-6 py-2 rounded-xl font-bold text-sm bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg disabled:opacity-50"
              >
                Apply Assignment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
