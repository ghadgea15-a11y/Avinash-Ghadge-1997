import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  MapPin, 
  GitBranch, 
  Layers, 
  Briefcase, 
  Users, 
  ShieldCheck, 
  ShieldAlert, 
  Plus, 
  Save, 
  CheckCircle2, 
  AlertCircle,
  RefreshCw,
  Search,
  Filter,
  Sliders,
  Award
} from 'lucide-react';
import { 
  UserSession, 
  CompanyTenant, 
  BranchRecord, 
  SiteRecord, 
  DepartmentRecord, 
  DesignationRecord, 
  UserMembershipRecord, 
  UserRole 
} from '../../types';
import { useTheme } from '../../context/ThemeContext';
import { FirestoreService } from '../../services/firestoreService';

interface CompanyManagementScreenProps {
  userSession: UserSession;
  activeCompany: CompanyTenant | null;
  onCompanyUpdated?: (updated: CompanyTenant) => void;
}

export const CompanyManagementScreen: React.FC<CompanyManagementScreenProps> = ({
  userSession,
  activeCompany,
  onCompanyUpdated
}) => {
  const { isDark } = useTheme();

  // Tab State
  const [activeTab, setActiveTab] = useState<'PROFILE' | 'BRANCHES' | 'SITES' | 'DEPARTMENTS' | 'DESIGNATIONS' | 'MEMBERSHIPS'>('PROFILE');

  // RBAC Permission Check
  const isAuthorized = userSession.role === 'COMPANY_ADMIN' || userSession.role === 'SUPER_ADMIN';

  // State Data
  const [tenantInfo, setTenantInfo] = useState<CompanyTenant | null>(activeCompany);
  const [branches, setBranches] = useState<BranchRecord[]>([]);
  const [sites, setSites] = useState<SiteRecord[]>([]);
  const [departments, setDepartments] = useState<DepartmentRecord[]>([]);
  const [designations, setDesignations] = useState<DesignationRecord[]>([]);
  const [memberships, setMemberships] = useState<UserMembershipRecord[]>([]);

  // Form & Interaction States
  const [loading, setLoading] = useState<boolean>(true);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modals / Item Editors
  const [editingBranch, setEditingBranch] = useState<Partial<BranchRecord> | null>(null);
  const [editingSite, setEditingSite] = useState<Partial<SiteRecord> | null>(null);
  const [editingDept, setEditingDept] = useState<Partial<DepartmentRecord> | null>(null);
  const [editingDesig, setEditingDesig] = useState<Partial<DesignationRecord> | null>(null);

  const companyId = activeCompany?.companyId || userSession.companyId;

  // Load Data
  useEffect(() => {
    if (!companyId) return;

    const loadData = async () => {
      setLoading(true);
      try {
        const [comp, bList, sList, dList, desList, mList] = await Promise.all([
          FirestoreService.getCompanyTenantDetails(companyId),
          FirestoreService.getBranches(companyId),
          FirestoreService.getSites(companyId),
          FirestoreService.getDepartments(companyId),
          FirestoreService.getDesignations(companyId),
          FirestoreService.getMemberships(companyId)
        ]);

        if (comp) setTenantInfo(comp);
        setBranches(bList);
        setSites(sList);
        setDepartments(dList);
        setDesignations(desList);
        setMemberships(mList);
      } catch (err) {
        console.error('Error loading company management data:', err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [companyId]);

  // Handle Save Tenant Profile
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantInfo) return;

    try {
      setSaveSuccess(null);
      setErrorMessage(null);
      const success = await FirestoreService.updateCompanyTenantDetails(tenantInfo);
      if (success) {
        setSaveSuccess('Company profile and branding saved successfully.');
        if (onCompanyUpdated) onCompanyUpdated(tenantInfo);
        setTimeout(() => setSaveSuccess(null), 4000);
      }
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to update company details');
    }
  };

  // Branch Save
  const handleSaveBranch = async () => {
    if (!editingBranch?.name || !editingBranch?.code) return;
    const bRecord: BranchRecord = {
      id: editingBranch.id || `BR-${Date.now().toString(36)}`,
      name: editingBranch.name,
      code: editingBranch.code.toUpperCase(),
      city: editingBranch.city || 'Mumbai',
      address: editingBranch.address || 'HQ',
      status: editingBranch.status || 'ACTIVE'
    };

    const success = await FirestoreService.saveBranch(companyId, bRecord);
    if (success) {
      setBranches(prev => {
        const existing = prev.findIndex(b => b.id === bRecord.id);
        if (existing >= 0) {
          const updated = [...prev];
          updated[existing] = bRecord;
          return updated;
        }
        return [...prev, bRecord];
      });
      setEditingBranch(null);
      setSaveSuccess('Branch saved successfully.');
      setTimeout(() => setSaveSuccess(null), 3000);
    }
  };

  // Site Save
  const handleSaveSite = async () => {
    if (!editingSite?.name || !editingSite?.branchId) return;
    const sRecord: SiteRecord = {
      id: editingSite.id || `SITE-${Date.now().toString(36)}`,
      name: editingSite.name,
      branchId: editingSite.branchId,
      clientName: editingSite.clientName || 'Corporate Client',
      address: editingSite.address || 'Site Premises',
      status: editingSite.status || 'ACTIVE'
    };

    const success = await FirestoreService.saveSite(companyId, sRecord);
    if (success) {
      setSites(prev => {
        const existing = prev.findIndex(s => s.id === sRecord.id);
        if (existing >= 0) {
          const updated = [...prev];
          updated[existing] = sRecord;
          return updated;
        }
        return [...prev, sRecord];
      });
      setEditingSite(null);
      setSaveSuccess('Site location saved successfully.');
      setTimeout(() => setSaveSuccess(null), 3000);
    }
  };

  // Dept Save
  const handleSaveDept = async () => {
    if (!editingDept?.name || !editingDept?.code) return;
    const dRecord: DepartmentRecord = {
      id: editingDept.id || `DEPT-${Date.now().toString(36)}`,
      name: editingDept.name,
      code: editingDept.code.toUpperCase(),
      description: editingDept.description || ''
    };

    const success = await FirestoreService.saveDepartment(companyId, dRecord);
    if (success) {
      setDepartments(prev => {
        const existing = prev.findIndex(d => d.id === dRecord.id);
        if (existing >= 0) {
          const updated = [...prev];
          updated[existing] = dRecord;
          return updated;
        }
        return [...prev, dRecord];
      });
      setEditingDept(null);
      setSaveSuccess('Department saved successfully.');
      setTimeout(() => setSaveSuccess(null), 3000);
    }
  };

  // Designation Save
  const handleSaveDesig = async () => {
    if (!editingDesig?.title) return;
    const desRecord: DesignationRecord = {
      id: editingDesig.id || `DESIG-${Date.now().toString(36)}`,
      title: editingDesig.title,
      level: editingDesig.level || 'L1'
    };

    const success = await FirestoreService.saveDesignation(companyId, desRecord);
    if (success) {
      setDesignations(prev => {
        const existing = prev.findIndex(d => d.id === desRecord.id);
        if (existing >= 0) {
          const updated = [...prev];
          updated[existing] = desRecord;
          return updated;
        }
        return [...prev, desRecord];
      });
      setEditingDesig(null);
      setSaveSuccess('Designation saved successfully.');
      setTimeout(() => setSaveSuccess(null), 3000);
    }
  };

  // Membership Role Update
  const handleUpdateRole = async (member: UserMembershipRecord, newRole: UserRole) => {
    const updated = { ...member, role: newRole };
    const success = await FirestoreService.updateUserMembership(companyId, updated);
    if (success) {
      setMemberships(prev => prev.map(m => m.userId === member.userId ? updated : m));
      setSaveSuccess(`Role for ${member.fullName} updated to ${newRole}.`);
      setTimeout(() => setSaveSuccess(null), 3000);
    }
  };

  // Unauthorized Screen Guard
  if (!isAuthorized) {
    return (
      <div className={`flex-1 p-6 flex flex-col items-center justify-center text-center ${isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
        <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-center justify-center mb-4">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold mb-2">Access Restricted (RBAC Protection)</h2>
        <p className="text-sm text-slate-400 max-w-md mb-6">
          You do not have administrative privilege to modify multi-tenant company settings. Only assigned <span className="font-semibold text-indigo-400">Company Admins</span> or <span className="font-semibold text-indigo-400">Super Admins</span> can access this module.
        </p>
        <div className={`px-4 py-2 rounded-xl text-xs font-mono ${isDark ? 'bg-slate-900 border-slate-800 text-slate-400' : 'bg-white border-slate-200 text-slate-600'} border`}>
          Your Current Role: <span className="font-bold text-amber-500">{userSession.role}</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex-1 flex flex-col transition-colors duration-300 ${isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'} overflow-y-auto p-4 md:p-6 space-y-6`}>
      
      {/* Top Header Banner */}
      <div className={`p-5 rounded-2xl border ${isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'} flex flex-col md:flex-row md:items-center justify-between gap-4`}>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-600/20">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold">{tenantInfo?.brandName || 'Company Management'}</h1>
              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                {tenantInfo?.licenseTier || 'ENTERPRISE'} TIER
              </span>
            </div>
            <p className="text-xs text-slate-400">Tenant ID: <span className="font-mono text-indigo-400">{companyId}</span> • Legal: {tenantInfo?.companyLegalName}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">Status:</span>
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Active Isolation
          </span>
        </div>
      </div>

      {/* Save Success / Error Toasts */}
      {saveSuccess && (
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{saveSuccess}</span>
        </div>
      )}
      {errorMessage && (
        <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-medium flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Navigation Sub-Tabs */}
      <div className={`p-1 rounded-xl border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-200/60 border-slate-200'} grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-1 text-xs font-semibold`}>
        <button
          onClick={() => setActiveTab('PROFILE')}
          className={`py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition ${
            activeTab === 'PROFILE'
              ? 'bg-indigo-600 text-white shadow-md'
              : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Building2 className="w-3.5 h-3.5" />
          <span>Profile & Branding</span>
        </button>

        <button
          onClick={() => setActiveTab('BRANCHES')}
          className={`py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition ${
            activeTab === 'BRANCHES'
              ? 'bg-indigo-600 text-white shadow-md'
              : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <GitBranch className="w-3.5 h-3.5" />
          <span>Branches ({branches.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('SITES')}
          className={`py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition ${
            activeTab === 'SITES'
              ? 'bg-indigo-600 text-white shadow-md'
              : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <MapPin className="w-3.5 h-3.5" />
          <span>Sites ({sites.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('DEPARTMENTS')}
          className={`py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition ${
            activeTab === 'DEPARTMENTS'
              ? 'bg-indigo-600 text-white shadow-md'
              : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Depts ({departments.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('DESIGNATIONS')}
          className={`py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition ${
            activeTab === 'DESIGNATIONS'
              ? 'bg-indigo-600 text-white shadow-md'
              : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Briefcase className="w-3.5 h-3.5" />
          <span>Designations ({designations.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('MEMBERSHIPS')}
          className={`py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition ${
            activeTab === 'MEMBERSHIPS'
              ? 'bg-indigo-600 text-white shadow-md'
              : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>RBAC Members ({memberships.length})</span>
        </button>
      </div>

      {/* TAB 1: PROFILE & BRANDING */}
      {activeTab === 'PROFILE' && tenantInfo && (
        <form onSubmit={handleSaveProfile} className={`p-6 rounded-2xl border space-y-6 ${isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
          <div className="flex items-center justify-between pb-4 border-b border-slate-800/40">
            <div>
              <h3 className="text-sm font-bold">Tenant Profile & White Label Branding</h3>
              <p className="text-xs text-slate-400">Configure legal entity details, primary branding colors, and quota limits.</p>
            </div>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-2 transition shadow-md shadow-indigo-600/20"
            >
              <Save className="w-4 h-4" />
              <span>Save Tenant Profile</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-slate-400 mb-1 font-medium">Company Code / Tenant ID</label>
              <input
                type="text"
                disabled
                value={tenantInfo.companyId}
                className={`w-full p-2.5 rounded-xl border font-mono ${isDark ? 'bg-slate-950 border-slate-800 text-slate-400' : 'bg-slate-100 border-slate-200 text-slate-500'}`}
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1 font-medium">Brand / Operating Name</label>
              <input
                type="text"
                required
                value={tenantInfo.brandName || ''}
                onChange={e => setTenantInfo({ ...tenantInfo, brandName: e.target.value })}
                className={`w-full p-2.5 rounded-xl border ${isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-white border-slate-300 text-slate-900'}`}
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1 font-medium">Full Legal Entity Name</label>
              <input
                type="text"
                required
                value={tenantInfo.companyLegalName || ''}
                onChange={e => setTenantInfo({ ...tenantInfo, companyLegalName: e.target.value })}
                className={`w-full p-2.5 rounded-xl border ${isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-white border-slate-300 text-slate-900'}`}
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1 font-medium">License Tier Quota</label>
              <select
                value={tenantInfo.licenseTier || 'ENTERPRISE'}
                onChange={e => setTenantInfo({ ...tenantInfo, licenseTier: e.target.value as any })}
                className={`w-full p-2.5 rounded-xl border ${isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-white border-slate-300 text-slate-900'}`}
              >
                <option value="STARTER">STARTER (Max 100 Employees)</option>
                <option value="PROFESSIONAL">PROFESSIONAL (Max 500 Employees)</option>
                <option value="ENTERPRISE">ENTERPRISE (Max 5,000 Employees)</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-400 mb-1 font-medium">Primary Brand Color Hex</label>
              <div className="flex gap-2 items-center">
                <input
                  type="color"
                  value={tenantInfo.primaryColorHex || '#4f46e5'}
                  onChange={e => setTenantInfo({ ...tenantInfo, primaryColorHex: e.target.value })}
                  className="w-10 h-10 rounded-lg cursor-pointer border border-slate-700 p-0.5 bg-transparent"
                />
                <input
                  type="text"
                  value={tenantInfo.primaryColorHex || '#4f46e5'}
                  onChange={e => setTenantInfo({ ...tenantInfo, primaryColorHex: e.target.value })}
                  className={`flex-1 p-2.5 rounded-xl border font-mono ${isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-white border-slate-300 text-slate-900'}`}
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-400 mb-1 font-medium">Secondary Brand Color Hex</label>
              <div className="flex gap-2 items-center">
                <input
                  type="color"
                  value={tenantInfo.secondaryColorHex || '#06b6d4'}
                  onChange={e => setTenantInfo({ ...tenantInfo, secondaryColorHex: e.target.value })}
                  className="w-10 h-10 rounded-lg cursor-pointer border border-slate-700 p-0.5 bg-transparent"
                />
                <input
                  type="text"
                  value={tenantInfo.secondaryColorHex || '#06b6d4'}
                  onChange={e => setTenantInfo({ ...tenantInfo, secondaryColorHex: e.target.value })}
                  className={`flex-1 p-2.5 rounded-xl border font-mono ${isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-white border-slate-300 text-slate-900'}`}
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-400 mb-1 font-medium">Max Employee Quota</label>
              <input
                type="number"
                value={tenantInfo.maxEmployeesAllowed || 1000}
                onChange={e => setTenantInfo({ ...tenantInfo, maxEmployeesAllowed: parseInt(e.target.value) || 100 })}
                className={`w-full p-2.5 rounded-xl border ${isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-white border-slate-300 text-slate-900'}`}
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1 font-medium">Max Sites Quota</label>
              <input
                type="number"
                value={tenantInfo.maxSitesAllowed || 50}
                onChange={e => setTenantInfo({ ...tenantInfo, maxSitesAllowed: parseInt(e.target.value) || 10 })}
                className={`w-full p-2.5 rounded-xl border ${isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-white border-slate-300 text-slate-900'}`}
              />
            </div>
          </div>
        </form>
      )}

      {/* TAB 2: BRANCHES */}
      {activeTab === 'BRANCHES' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold">Regional Branches</h3>
              <p className="text-xs text-slate-400">Manage operational branch offices across regions.</p>
            </div>
            <button
              onClick={() => setEditingBranch({ name: '', code: 'BR-', city: 'Mumbai', address: '' })}
              className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 transition shadow-md"
            >
              <Plus className="w-4 h-4" />
              <span>Add Branch</span>
            </button>
          </div>

          {editingBranch && (
            <div className={`p-4 rounded-2xl border space-y-3 ${isDark ? 'bg-slate-900 border-indigo-500/30' : 'bg-white border-indigo-200 shadow-sm'}`}>
              <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-wider">Branch Details</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                <input
                  type="text"
                  placeholder="Branch Name"
                  value={editingBranch.name || ''}
                  onChange={e => setEditingBranch({ ...editingBranch, name: e.target.value })}
                  className={`p-2.5 rounded-xl border ${isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-white border-slate-300'}`}
                />
                <input
                  type="text"
                  placeholder="Branch Code (e.g. BR-MUM)"
                  value={editingBranch.code || ''}
                  onChange={e => setEditingBranch({ ...editingBranch, code: e.target.value })}
                  className={`p-2.5 rounded-xl border font-mono ${isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-white border-slate-300'}`}
                />
                <input
                  type="text"
                  placeholder="City"
                  value={editingBranch.city || ''}
                  onChange={e => setEditingBranch({ ...editingBranch, city: e.target.value })}
                  className={`p-2.5 rounded-xl border ${isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-white border-slate-300'}`}
                />
                <input
                  type="text"
                  placeholder="Address"
                  value={editingBranch.address || ''}
                  onChange={e => setEditingBranch({ ...editingBranch, address: e.target.value })}
                  className={`p-2.5 rounded-xl border ${isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-white border-slate-300'}`}
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setEditingBranch(null)}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveBranch}
                  className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold"
                >
                  Save Branch
                </button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {branches.map(b => (
              <div key={b.id} className={`p-4 rounded-2xl border space-y-2 ${isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-indigo-400">{b.code}</span>
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    {b.status}
                  </span>
                </div>
                <h4 className="text-sm font-bold">{b.name}</h4>
                <p className="text-xs text-slate-400 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-500" />
                  {b.city} — {b.address}
                </p>
              </div>
            ))}
            {branches.length === 0 && (
              <div className="col-span-full p-8 text-center text-xs text-slate-400 italic">
                No branches registered for this tenant yet. Click "Add Branch" above.
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: SITES */}
      {activeTab === 'SITES' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold">Client Deployment Sites</h3>
              <p className="text-xs text-slate-400">Guarded locations, client premises, and patrol posts.</p>
            </div>
            <button
              onClick={() => setEditingSite({ name: '', branchId: branches[0]?.id || 'MAIN', clientName: '' })}
              className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 transition shadow-md"
            >
              <Plus className="w-4 h-4" />
              <span>Add Site</span>
            </button>
          </div>

          {editingSite && (
            <div className={`p-4 rounded-2xl border space-y-3 ${isDark ? 'bg-slate-900 border-indigo-500/30' : 'bg-white border-indigo-200 shadow-sm'}`}>
              <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-wider">Site Location Details</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                <input
                  type="text"
                  placeholder="Site Name"
                  value={editingSite.name || ''}
                  onChange={e => setEditingSite({ ...editingSite, name: e.target.value })}
                  className={`p-2.5 rounded-xl border ${isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-white border-slate-300'}`}
                />
                <input
                  type="text"
                  placeholder="Client Name"
                  value={editingSite.clientName || ''}
                  onChange={e => setEditingSite({ ...editingSite, clientName: e.target.value })}
                  className={`p-2.5 rounded-xl border ${isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-white border-slate-300'}`}
                />
                <select
                  value={editingSite.branchId || ''}
                  onChange={e => setEditingSite({ ...editingSite, branchId: e.target.value })}
                  className={`p-2.5 rounded-xl border ${isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-white border-slate-300'}`}
                >
                  <option value="">Select Branch</option>
                  {branches.map(b => (
                    <option key={b.id} value={b.id}>{b.name} ({b.code})</option>
                  ))}
                  <option value="MAIN_BRANCH">Main HQ Branch</option>
                </select>
                <input
                  type="text"
                  placeholder="Address"
                  value={editingSite.address || ''}
                  onChange={e => setEditingSite({ ...editingSite, address: e.target.value })}
                  className={`p-2.5 rounded-xl border ${isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-white border-slate-300'}`}
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setEditingSite(null)}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveSite}
                  className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold"
                >
                  Save Site
                </button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sites.map(s => (
              <div key={s.id} className={`p-4 rounded-2xl border space-y-2 ${isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-indigo-400">{s.id}</span>
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    {s.status}
                  </span>
                </div>
                <h4 className="text-sm font-bold">{s.name}</h4>
                <p className="text-xs text-slate-400">Client: <span className="text-slate-200 font-medium">{s.clientName}</span></p>
                <p className="text-xs text-slate-400 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-500" />
                  {s.address}
                </p>
              </div>
            ))}
            {sites.length === 0 && (
              <div className="col-span-full p-8 text-center text-xs text-slate-400 italic">
                No deployment sites registered for this tenant yet. Click "Add Site" above.
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: DEPARTMENTS */}
      {activeTab === 'DEPARTMENTS' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold">Organizational Departments</h3>
              <p className="text-xs text-slate-400">Functional divisions within the company.</p>
            </div>
            <button
              onClick={() => setEditingDept({ name: '', code: 'DEP-' })}
              className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 transition shadow-md"
            >
              <Plus className="w-4 h-4" />
              <span>Add Department</span>
            </button>
          </div>

          {editingDept && (
            <div className={`p-4 rounded-2xl border space-y-3 ${isDark ? 'bg-slate-900 border-indigo-500/30' : 'bg-white border-indigo-200 shadow-sm'}`}>
              <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-wider">Department Details</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <input
                  type="text"
                  placeholder="Department Name"
                  value={editingDept.name || ''}
                  onChange={e => setEditingDept({ ...editingDept, name: e.target.value })}
                  className={`p-2.5 rounded-xl border ${isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-white border-slate-300'}`}
                />
                <input
                  type="text"
                  placeholder="Code (e.g. SEC-OPS)"
                  value={editingDept.code || ''}
                  onChange={e => setEditingDept({ ...editingDept, code: e.target.value })}
                  className={`p-2.5 rounded-xl border font-mono ${isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-white border-slate-300'}`}
                />
                <input
                  type="text"
                  placeholder="Description"
                  value={editingDept.description || ''}
                  onChange={e => setEditingDept({ ...editingDept, description: e.target.value })}
                  className={`p-2.5 rounded-xl border ${isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-white border-slate-300'}`}
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setEditingDept(null)}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveDept}
                  className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold"
                >
                  Save Department
                </button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {departments.map(d => (
              <div key={d.id} className={`p-4 rounded-2xl border space-y-2 ${isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-indigo-400">{d.code}</span>
                </div>
                <h4 className="text-sm font-bold">{d.name}</h4>
                <p className="text-xs text-slate-400">{d.description || 'General company department'}</p>
              </div>
            ))}
            {departments.length === 0 && (
              <div className="col-span-full p-8 text-center text-xs text-slate-400 italic">
                No departments registered for this tenant yet. Click "Add Department" above.
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 5: DESIGNATIONS */}
      {activeTab === 'DESIGNATIONS' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold">Employee Designations</h3>
              <p className="text-xs text-slate-400">Ranks, designations, and hierarchy levels.</p>
            </div>
            <button
              onClick={() => setEditingDesig({ title: '', level: 'L1' })}
              className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 transition shadow-md"
            >
              <Plus className="w-4 h-4" />
              <span>Add Designation</span>
            </button>
          </div>

          {editingDesig && (
            <div className={`p-4 rounded-2xl border space-y-3 ${isDark ? 'bg-slate-900 border-indigo-500/30' : 'bg-white border-indigo-200 shadow-sm'}`}>
              <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-wider">Designation Details</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <input
                  type="text"
                  placeholder="Designation Title (e.g. Senior Patrol Officer)"
                  value={editingDesig.title || ''}
                  onChange={e => setEditingDesig({ ...editingDesig, title: e.target.value })}
                  className={`p-2.5 rounded-xl border ${isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-white border-slate-300'}`}
                />
                <select
                  value={editingDesig.level || 'L1'}
                  onChange={e => setEditingDesig({ ...editingDesig, level: e.target.value })}
                  className={`p-2.5 rounded-xl border ${isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-white border-slate-300'}`}
                >
                  <option value="L1">Level 1 (Field Guard / Frontline)</option>
                  <option value="L2">Level 2 (Supervisor / Lead)</option>
                  <option value="L3">Level 3 (Field Officer / Inspector)</option>
                  <option value="L4">Level 4 (Ops Manager / HR)</option>
                  <option value="L5">Level 5 (Director / Company Admin)</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setEditingDesig(null)}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveDesig}
                  className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold"
                >
                  Save Designation
                </button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {designations.map(d => (
              <div key={d.id} className={`p-4 rounded-2xl border space-y-2 ${isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-indigo-400">{d.level}</span>
                </div>
                <h4 className="text-sm font-bold">{d.title}</h4>
              </div>
            ))}
            {designations.length === 0 && (
              <div className="col-span-full p-8 text-center text-xs text-slate-400 italic">
                No designations registered for this tenant yet. Click "Add Designation" above.
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 6: MEMBERSHIPS & RBAC ROLES */}
      {activeTab === 'MEMBERSHIPS' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold">Company User Memberships & RBAC Roles</h3>
              <p className="text-xs text-slate-400">Assign role access levels (<span className="text-indigo-400 font-mono">GUARD</span>, <span className="text-indigo-400 font-mono">FIELD_OFFICER</span>, <span className="text-indigo-400 font-mono">OPS_MANAGER</span>, <span className="text-indigo-400 font-mono">HR_ADMIN</span>, <span className="text-indigo-400 font-mono">COMPANY_ADMIN</span>) with tenant isolation.</p>
            </div>
            <div className="flex items-center gap-2">
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
                <Search className="w-3.5 h-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search user..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="bg-transparent border-none outline-none text-xs w-32"
                />
              </div>
            </div>
          </div>

          <div className={`p-4 rounded-2xl border ${isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-sm'} overflow-x-auto`}>
            <table className="w-full text-left text-xs">
              <thead>
                <tr className={`border-b ${isDark ? 'border-slate-800 text-slate-400' : 'border-slate-200 text-slate-500'} font-semibold`}>
                  <th className="pb-3 pl-2">User / Employee</th>
                  <th className="pb-3">Email</th>
                  <th className="pb-3">Current RBAC Role</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3 pr-2 text-right">Assign New Role</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40">
                {memberships
                  .filter(m => m.fullName.toLowerCase().includes(searchQuery.toLowerCase()) || m.email.toLowerCase().includes(searchQuery.toLowerCase()))
                  .map(member => (
                    <tr key={member.userId} className="hover:bg-slate-800/20 transition">
                      <td className="py-3 pl-2 font-bold">{member.fullName}</td>
                      <td className="py-3 font-mono text-slate-400">{member.email}</td>
                      <td className="py-3">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                          member.role === 'COMPANY_ADMIN' 
                            ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' 
                            : member.role === 'HR_ADMIN' || member.role === 'OPS_MANAGER'
                              ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
                              : 'bg-slate-500/10 text-slate-400 border-slate-500/20'
                        }`}>
                          {member.role}
                        </span>
                      </td>
                      <td className="py-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          member.status === 'ACTIVE' 
                            ? 'bg-emerald-500/10 text-emerald-400' 
                            : 'bg-rose-500/10 text-rose-400'
                        }`}>
                          {member.status}
                        </span>
                      </td>
                      <td className="py-3 pr-2 text-right">
                        <select
                          value={member.role}
                          onChange={e => handleUpdateRole(member, e.target.value as UserRole)}
                          className={`p-1.5 rounded-lg border text-xs ${isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-white border-slate-300 text-slate-900'}`}
                        >
                          <option value="GUARD">GUARD</option>
                          <option value="FIELD_OFFICER">FIELD_OFFICER</option>
                          <option value="OPS_MANAGER">OPS_MANAGER</option>
                          <option value="HR_ADMIN">HR_ADMIN</option>
                          <option value="COMPANY_ADMIN">COMPANY_ADMIN</option>
                          {userSession.role === 'SUPER_ADMIN' && <option value="SUPER_ADMIN">SUPER_ADMIN</option>}
                        </select>
                      </td>
                    </tr>
                  ))}
                {memberships.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400 italic">
                      No user memberships registered under this tenant collection. Add employees in Employee Module to assign roles.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
};
