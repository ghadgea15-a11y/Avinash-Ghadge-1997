import { Pagination } from "../common/Pagination";
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
  UserRole,
  VendorRecord
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
  const [activeTab, setActiveTab] = useState<'PROFILE' | 'BRANCHES' | 'SITES' | 'DEPARTMENTS' | 'DESIGNATIONS' | 'MEMBERSHIPS' | 'VENDORS'>('PROFILE');

  // RBAC Permission Check
  const isAuthorized = userSession.role === 'COMPANY_ADMIN' || userSession.role === 'SUPER_ADMIN';

  // State Data
  const [tenantInfo, setTenantInfo] = useState<CompanyTenant | null>(activeCompany);
  const [branches, setBranches] = useState<BranchRecord[]>([]);
  const [sites, setSites] = useState<SiteRecord[]>([]);
  const [departments, setDepartments] = useState<DepartmentRecord[]>([]);
  const [designations, setDesignations] = useState<DesignationRecord[]>([]);
  const [memberships, setMemberships] = useState<UserMembershipRecord[]>([]);
  const [vendors, setVendors] = useState<VendorRecord[]>([]);

  // Form & Interaction States
  const [loading, setLoading] = useState<boolean>(true);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  
  useEffect(() => { setCurrentPage(1); }, [searchQuery]);
  // Modals / Item Editors
  const filteredMemberships = memberships.filter(m => m.fullName.toLowerCase().includes(searchQuery.toLowerCase()) || m.email.toLowerCase().includes(searchQuery.toLowerCase()));
  const paginatedMemberships = filteredMemberships.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  
  const [editingBranch, setEditingBranch] = useState<Partial<BranchRecord> | null>(null);
  const [editingSite, setEditingSite] = useState<Partial<SiteRecord> | null>(null);
  const [editingDept, setEditingDept] = useState<Partial<DepartmentRecord> | null>(null);
  const [editingDesig, setEditingDesig] = useState<Partial<DesignationRecord> | null>(null);
  const [editingVendor, setEditingVendor] = useState<Partial<VendorRecord> | null>(null);

  const companyId = activeCompany?.companyId || userSession.companyId;

  // Load Data
  useEffect(() => {
    if (!companyId) return;

    const loadData = async () => {
      setLoading(true);
      try {
        const [comp, bList, sList, dList, desList, mList, vList] = await Promise.all([
          FirestoreService.getCompanyTenantDetails(companyId),
          FirestoreService.getBranches(companyId),
          FirestoreService.getSites(companyId),
          FirestoreService.getDepartments(companyId),
          FirestoreService.getDesignations(companyId),
          FirestoreService.getMemberships(companyId),
          FirestoreService.getVendors(companyId)
        ]);

        if (comp) setTenantInfo(comp);
        setBranches(bList);
        setSites(sList);
        setDepartments(dList);
        setDesignations(desList);
        setMemberships(mList);
        setVendors(vList);
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
      status: editingSite.status || 'ACTIVE',
      latitude: editingSite.latitude,
      longitude: editingSite.longitude,
      geofenceRadius: editingSite.geofenceRadius || 100
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

  // Vendor Save
  const handleSaveVendor = async () => {
    if (!editingVendor?.vendorName || !editingVendor?.vendorCode || !editingVendor?.serviceType || !editingVendor?.contactPerson || !editingVendor?.contactPhone) return;
    const vRecord: VendorRecord = {
      id: editingVendor.id || `VEND-${Date.now().toString(36)}`,
      companyId: companyId,
      vendorName: editingVendor.vendorName,
      vendorCode: editingVendor.vendorCode.toUpperCase(),
      serviceType: editingVendor.serviceType || 'SECURITY_AGENCY',
      gstinNumber: editingVendor.gstinNumber || '',
      panNumber: editingVendor.panNumber || '',
      contactPerson: editingVendor.contactPerson,
      contactPhone: editingVendor.contactPhone,
      contactEmail: editingVendor.contactEmail || '',
      address: editingVendor.address || '',
      contractStartDate: editingVendor.contractStartDate || new Date().toISOString(),
      status: editingVendor.status || 'ACTIVE',
      createdAt: editingVendor.createdAt || new Date().toISOString()
    };

    const success = await FirestoreService.saveVendor(companyId, vRecord);
    if (success) {
      setVendors(prev => {
        const existing = prev.findIndex(v => v.id === vRecord.id);
        if (existing >= 0) {
          const updated = [...prev];
          updated[existing] = vRecord;
          return updated;
        }
        return [...prev, vRecord];
      });
      setEditingVendor(null);
      setSaveSuccess('Vendor saved successfully.');
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
      <div className={`p-1 rounded-xl border flex flex-wrap gap-1 text-xs font-semibold ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-200/60 border-slate-200'}`}>
        <button
          onClick={() => setActiveTab('PROFILE')}
          className={`flex-1 min-w-[120px] py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition ${
            activeTab === 'PROFILE'
              ? 'bg-indigo-600 text-white shadow-md'
              : isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-600 hover:text-slate-900 hover:bg-white'
          }`}
        >
          <Building2 className="w-3.5 h-3.5" />
          <span className="whitespace-nowrap">Profile & Branding</span>
        </button>

        <button
          onClick={() => setActiveTab('BRANCHES')}
          className={`flex-1 min-w-[120px] py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition ${
            activeTab === 'BRANCHES'
              ? 'bg-indigo-600 text-white shadow-md'
              : isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-600 hover:text-slate-900 hover:bg-white'
          }`}
        >
          <GitBranch className="w-3.5 h-3.5" />
          <span className="whitespace-nowrap">Branches ({branches.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('SITES')}
          className={`flex-1 min-w-[120px] py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition ${
            activeTab === 'SITES'
              ? 'bg-indigo-600 text-white shadow-md'
              : isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-600 hover:text-slate-900 hover:bg-white'
          }`}
        >
          <MapPin className="w-3.5 h-3.5" />
          <span className="whitespace-nowrap">Sites ({sites.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('DEPARTMENTS')}
          className={`flex-1 min-w-[120px] py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition ${
            activeTab === 'DEPARTMENTS'
              ? 'bg-indigo-600 text-white shadow-md'
              : isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-600 hover:text-slate-900 hover:bg-white'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span className="whitespace-nowrap">Depts ({departments.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('DESIGNATIONS')}
          className={`flex-1 min-w-[120px] py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition ${
            activeTab === 'DESIGNATIONS'
              ? 'bg-indigo-600 text-white shadow-md'
              : isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-600 hover:text-slate-900 hover:bg-white'
          }`}
        >
          <Briefcase className="w-3.5 h-3.5" />
          <span className="whitespace-nowrap">Designations ({designations.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('MEMBERSHIPS')}
          className={`flex-1 min-w-[120px] py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition ${
            activeTab === 'MEMBERSHIPS'
              ? 'bg-indigo-600 text-white shadow-md'
              : isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-600 hover:text-slate-900 hover:bg-white'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span className="whitespace-nowrap">Members ({memberships.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('VENDORS')}
          className={`flex-1 min-w-[120px] py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition ${
            activeTab === 'VENDORS'
              ? 'bg-indigo-600 text-white shadow-md'
              : isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-600 hover:text-slate-900 hover:bg-white'
          }`}
        >
          < Building2 className="w-3.5 h-3.5" />
          <span className="whitespace-nowrap">Vendors ({vendors.length})</span>
        </button>
      </div>

      {activeTab === 'MEMBERSHIPS' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold">Company Memberships</h3>
              <p className="text-xs text-slate-400">Manage access roles for employees across this company collection.</p>
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

          <div className={`rounded-2xl border overflow-x-auto ${isDark ? 'bg-slate-900/50 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
            <table className="w-full text-xs text-left">
              <thead className={`text-[10px] uppercase tracking-wider ${isDark ? 'bg-slate-800/80 text-slate-400' : 'bg-slate-50 text-slate-500'}`}>
                <tr>
                  <th className="py-3 px-4 font-semibold">User Name</th>
                  <th className="py-3 px-4 font-semibold">Email</th>
                  <th className="py-3 px-4 font-semibold">Current Role</th>
                  <th className="py-3 px-4 font-semibold">Status</th>
                  <th className="py-3 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40">
                {paginatedMemberships.map(member => (
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
                {filteredMemberships.length > 0 && (
                  <tfoot>
                    <tr>
                      <td colSpan={4} className="p-0">
                        <Pagination
                          currentPage={currentPage}
                          totalItems={filteredMemberships.length}
                          itemsPerPage={itemsPerPage}
                          onPageChange={setCurrentPage}
                          onItemsPerPageChange={setItemsPerPage}
                        />
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
          </div>
        </div>
      )}

      {/* TAB 7: VENDORS */}
      {activeTab === 'VENDORS' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold">Vendor & Contractor Management</h3>
              <p className="text-xs text-slate-400">Manage third-party agencies supplying contract staff, security guards, and services.</p>
            </div>
            <button
              onClick={() => setEditingVendor({ status: 'ACTIVE', serviceType: 'SECURITY_AGENCY' })}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-2 transition shadow-md shadow-indigo-600/20"
            >
              <Plus className="w-4 h-4" />
              <span>Add New Vendor</span>
            </button>
          </div>

          {editingVendor && (
            <div className={`p-5 rounded-2xl border ${isDark ? 'bg-indigo-950/20 border-indigo-500/30' : 'bg-indigo-50/50 border-indigo-200'} space-y-4`}>
              <h4 className="text-sm font-bold text-indigo-400">{editingVendor.id ? 'Edit Vendor Details' : 'Register New Vendor Agency'}</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block text-slate-400 mb-1">Vendor Agency Name *</label>
                  <input
                    type="text"
                    value={editingVendor.vendorName || ''}
                    onChange={e => setEditingVendor({...editingVendor, vendorName: e.target.value})}
                    placeholder="e.g. Eagle Security Services"
                    className={`w-full p-2.5 rounded-xl border ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-300'}`}
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Vendor Code *</label>
                  <input
                    type="text"
                    value={editingVendor.vendorCode || ''}
                    onChange={e => setEditingVendor({...editingVendor, vendorCode: e.target.value.toUpperCase()})}
                    placeholder="e.g. ESS-MUM-01"
                    className={`w-full p-2.5 rounded-xl border font-mono uppercase ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-300'}`}
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Service Type</label>
                  <select
                    value={editingVendor.serviceType || 'SECURITY_AGENCY'}
                    onChange={e => setEditingVendor({...editingVendor, serviceType: e.target.value as any})}
                    className={`w-full p-2.5 rounded-xl border ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-300'}`}
                  >
                    <option value="SECURITY_AGENCY">Security Guarding</option>
                    <option value="HOUSEKEEPING">Housekeeping</option>
                    <option value="MANPOWER">General Manpower / Labour</option>
                    <option value="FACILITY_MANAGEMENT">Facility Management</option>
                    <option value="OTHER">Other Services</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Status</label>
                  <select
                    value={editingVendor.status || 'ACTIVE'}
                    onChange={e => setEditingVendor({...editingVendor, status: e.target.value as any})}
                    className={`w-full p-2.5 rounded-xl border ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-300'}`}
                  >
                    <option value="ACTIVE">Active (Current Vendor)</option>
                    <option value="INACTIVE">Inactive (Contract Expired)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Contact Person *</label>
                  <input
                    type="text"
                    value={editingVendor.contactPerson || ''}
                    onChange={e => setEditingVendor({...editingVendor, contactPerson: e.target.value})}
                    placeholder="e.g. Rajesh Kumar"
                    className={`w-full p-2.5 rounded-xl border ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-300'}`}
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Contact Mobile Number *</label>
                  <input
                    type="text"
                    value={editingVendor.contactPhone || ''}
                    onChange={e => setEditingVendor({...editingVendor, contactPhone: e.target.value})}
                    placeholder="e.g. +91 9876543210"
                    className={`w-full p-2.5 rounded-xl border font-mono ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-300'}`}
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">GSTIN Number</label>
                  <input
                    type="text"
                    value={editingVendor.gstinNumber || ''}
                    onChange={e => setEditingVendor({...editingVendor, gstinNumber: e.target.value.toUpperCase()})}
                    className={`w-full p-2.5 rounded-xl border font-mono uppercase ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-300'}`}
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">PAN Number</label>
                  <input
                    type="text"
                    value={editingVendor.panNumber || ''}
                    onChange={e => setEditingVendor({...editingVendor, panNumber: e.target.value.toUpperCase()})}
                    className={`w-full p-2.5 rounded-xl border font-mono uppercase ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-300'}`}
                  />
                </div>
              </div>
              <div className="flex gap-2 justify-end pt-2">
                <button
                  onClick={() => setEditingVendor(null)}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold border ${isDark ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-white border-slate-300 text-slate-700'}`}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveVendor}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 text-white flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  Save Vendor
                </button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {vendors.map(v => (
              <div key={v.id} className={`p-4 rounded-2xl border space-y-2 relative group ${isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-indigo-400">{v.vendorCode}</span>
                  <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${v.status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'}`}>
                    {v.status}
                  </span>
                </div>
                <div>
                  <h4 className="text-sm font-bold">{v.vendorName}</h4>
                  <p className="text-[10px] text-slate-400 font-mono mt-0.5">{v.serviceType.replace('_', ' ')}</p>
                </div>
                <div className="pt-2 mt-2 border-t border-slate-800/40 text-[10px] text-slate-400 space-y-1">
                  <p>Contact: <span className="font-medium text-slate-300">{v.contactPerson}</span></p>
                  <p>Phone: <span className="font-mono text-slate-300">{v.contactPhone}</span></p>
                  {v.gstinNumber && <p>GST: <span className="font-mono text-slate-300">{v.gstinNumber}</span></p>}
                </div>
                
                <button
                  onClick={() => setEditingVendor(v)}
                  className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg bg-indigo-600 text-white"
                  title="Edit Vendor"
                >
                  <Sliders className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
            {vendors.length === 0 && (
              <div className="col-span-full p-8 text-center text-xs text-slate-400 italic">
                No vendors or contracting agencies registered yet. Click "Add New Vendor" above.
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
};
