import React, { useState, useEffect } from 'react';
import { Pagination } from '../common/Pagination';
import {
  Building2,
  Search, 
  PlusCircle, 
  CheckCircle2, 
  XCircle, 
  Sliders, 
  ArrowLeft, 
  RefreshCw, 
  ShieldCheck, 
  SlidersHorizontal,
  Mail,
  Phone,
  MapPin,
  Edit,
  Save,
  AlertCircle
} from 'lucide-react';
import { CompanyTenant, UserSession, PhaseAScreen, MASTER_APP_MODULES } from '../../types';
import { FirestoreService } from '../../services/firestoreService';
import { useTheme } from '../../context/ThemeContext';

interface SuperAdminCompaniesScreenProps {
  currentSession: UserSession;
  onNavigate: (screen: PhaseAScreen) => void;
}

export const SuperAdminCompaniesScreen: React.FC<SuperAdminCompaniesScreenProps> = ({
  currentSession,
  onNavigate
}) => {
  const { isDark } = useTheme();
  const [loading, setLoading] = useState(true);
  const [companies, setCompanies] = useState<CompanyTenant[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'SUSPENDED'>('ALL');
  const [editingCompany, setEditingCompany] = useState<CompanyTenant | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    loadCompanies();
  }, []);

  const loadCompanies = async () => {
    setLoading(true);
    try {
      const list = await FirestoreService.getAllCompanies();
      setCompanies(list);
    } catch (err) {
      console.error('[SuperAdminCompaniesScreen] Error loading companies:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (company: CompanyTenant) => {
    const newStatus = company.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    try {
      const ok = await FirestoreService.updateCompanyDetails(company.companyId, { status: newStatus });
      if (ok) {
        setCompanies(companies.map(c => c.companyId === company.companyId ? { ...c, status: newStatus } : c));
        setMessage(`Company ${company.brandName} status updated to ${newStatus}.`);
      }
    } catch (err: any) {
      console.error('Error updating company status:', err);
    }
  };

  const handleSaveEdit = async () => {
    if (!editingCompany) return;
    setSaving(true);
    try {
      const ok = await FirestoreService.updateCompanyDetails(editingCompany.companyId, {
        brandName: editingCompany.brandName,
        companyLegalName: editingCompany.companyLegalName,
        licenseTier: editingCompany.licenseTier,
        maxEmployeesAllowed: editingCompany.maxEmployeesAllowed,
        maxSitesAllowed: editingCompany.maxSitesAllowed,
        email: editingCompany.email,
        phone: editingCompany.phone,
        status: editingCompany.status
      });

      if (ok) {
        setCompanies(companies.map(c => c.companyId === editingCompany.companyId ? editingCompany : c));
        setEditingCompany(null);
        setMessage('Company details updated successfully.');
      }
    } catch (err: any) {
      console.error('Error saving company details:', err);
    } finally {
      setSaving(false);
    }
  };

  const filteredCompanies = companies.filter(c => {
    const matchesStatus = statusFilter === 'ALL' || c.status === statusFilter;
    const matchesSearch = c.brandName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          c.companyId.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (c.companyLegalName && c.companyLegalName.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesStatus && matchesSearch;
  });

  const paginatedCompanies = filteredCompanies.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className={`flex-1 transition-colors duration-300 ${isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'} p-4 md:p-6 space-y-6 max-w-7xl mx-auto w-full`}>
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => onNavigate('SUPER_ADMIN_DASHBOARD')}
            className={`p-2 rounded-xl border transition ${
              isDark ? 'bg-slate-900 border-slate-800 hover:bg-slate-800' : 'bg-white border-slate-200 hover:bg-slate-100'
            }`}
          >
            <ArrowLeft className="w-4 h-4 text-slate-400" />
          </button>
          <div>
            <h1 className="text-lg font-bold flex items-center gap-2">
              <Building2 className="w-5 h-5 text-amber-500" />
              <span>Registered Companies & Organizations ({companies.length})</span>
            </h1>
            <p className="text-xs text-slate-400">View and manage tenant organizations, license limits, and operational status.</p>
          </div>
        </div>

        <button
          onClick={() => onNavigate('SUPER_ADMIN_CREATE_COMPANY')}
          className="px-4 py-2.5 bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-amber-600/30 flex items-center gap-1.5"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Register New Company</span>
        </button>
      </div>

      {message && (
        <div className="p-3 bg-emerald-950/80 border border-emerald-800 rounded-xl text-xs text-emerald-300 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{message}</span>
        </div>
      )}

      {/* Search & Filter Controls */}
      <div className={`p-4 rounded-2xl border transition-colors duration-300 ${isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200 shadow-sm'} flex flex-col md:flex-row md:items-center justify-between gap-3`}>
        <div className="relative flex-1">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search company code, brand name, legal entity..."
            className={`w-full pl-9 pr-3 py-2 text-xs rounded-xl border ${
              isDark ? 'bg-slate-950 border-slate-800 text-white placeholder-slate-500' : 'bg-slate-50 border-slate-200 text-slate-900'
            } focus:outline-none focus:border-amber-500`}
          />
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
        </div>

        <div className="flex items-center gap-2">
          {(['ALL', 'ACTIVE', 'SUSPENDED'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                statusFilter === st
                  ? 'bg-amber-600 text-white'
                  : isDark
                    ? 'bg-slate-950 text-slate-400 border border-slate-800'
                    : 'bg-slate-100 text-slate-600 border border-slate-200'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Companies List */}
      {loading ? (
        <div className="py-12 text-center text-slate-400 space-y-2">
          <RefreshCw className="w-6 h-6 animate-spin text-amber-500 mx-auto" />
          <p className="text-xs">Loading tenant companies from Firestore...</p>
        </div>
      ) : filteredCompanies.length === 0 ? (
        <div className="py-12 text-center text-slate-400 space-y-2">
          <Building2 className="w-8 h-8 text-slate-600 mx-auto" />
          <p className="text-xs font-medium">No tenant companies match your filter criteria.</p>
        </div>
      ) : (
        <>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {paginatedCompanies.map((company) => {
            const enabledCount = company.enabledModules?.length || 0;
            return (
              <div
                key={company.companyId}
                className={`p-5 rounded-2xl border transition-all ${
                  isDark ? 'bg-slate-900/80 border-slate-800 hover:border-slate-700' : 'bg-white border-slate-200 shadow-sm hover:shadow'
                } space-y-4`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-950 text-amber-400 border border-amber-800">
                      {company.companyId}
                    </span>
                    <h2 className="text-sm font-bold text-slate-100 mt-1">{company.brandName}</h2>
                    {company.companyLegalName && (
                      <p className="text-[11px] text-slate-400">{company.companyLegalName}</p>
                    )}
                  </div>

                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                    company.status === 'ACTIVE' 
                      ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' 
                      : 'bg-rose-950 text-rose-400 border border-rose-800'
                  }`}>
                    {company.status}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs border-y border-slate-800/60 py-2.5">
                  <div>
                    <p className="text-[10px] text-slate-400">License Tier</p>
                    <p className="font-semibold text-slate-200">{company.licenseTier}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400">Enabled Modules</p>
                    <p className="font-semibold text-cyan-400 font-mono">{enabledCount} / {MASTER_APP_MODULES.length}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400">Max Employees</p>
                    <p className="font-semibold text-slate-200 font-mono">{company.maxEmployeesAllowed}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400">Max Sites</p>
                    <p className="font-semibold text-slate-200 font-mono">{company.maxSitesAllowed}</p>
                  </div>
                </div>

                {company.adminEmail && (
                  <div className="text-xs space-y-0.5">
                    <p className="text-[10px] text-slate-400">Company Admin</p>
                    <p className="font-medium text-slate-200">{company.adminName || 'Admin'}</p>
                    <p className="text-[10px] text-slate-400 font-mono">{company.adminEmail}</p>
                  </div>
                )}

                <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-800/60">
                  <button
                    onClick={() => onNavigate('SUPER_ADMIN_MODULES')}
                    className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-cyan-950 hover:bg-cyan-900 text-cyan-300 border border-cyan-800 flex items-center gap-1"
                  >
                    <Sliders className="w-3.5 h-3.5" />
                    <span>Modules</span>
                  </button>

                  <button
                    onClick={() => handleToggleStatus(company)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition ${
                      company.status === 'ACTIVE'
                        ? 'bg-rose-950/80 hover:bg-rose-900 text-rose-300 border-rose-800'
                        : 'bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 border-emerald-800'
                    }`}
                  >
                    {company.status === 'ACTIVE' ? 'Suspend' : 'Activate'}
                  </button>

                  <button
                    onClick={() => setEditingCompany(company)}
                    className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1"
                  >
                    <Edit className="w-3.5 h-3.5" />
                    <span>Edit</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-4">
          <Pagination
            currentPage={currentPage}
            totalItems={filteredCompanies.length}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
            onItemsPerPageChange={setItemsPerPage}
          />
        </div>
        </>
      )}

      {/* Edit Modal */}
      {editingCompany && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`w-full max-w-lg p-6 rounded-2xl border ${isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'} space-y-4 shadow-2xl`}>
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold flex items-center gap-2">
                <Edit className="w-5 h-5 text-amber-500" />
                <span>Edit Tenant: {editingCompany.companyId}</span>
              </h2>
              <button onClick={() => setEditingCompany(null)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs text-slate-400 block mb-1">Brand Name</label>
                <input
                  type="text"
                  value={editingCompany.brandName || ''}
                  onChange={(e) => setEditingCompany({ ...editingCompany, brandName: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border bg-slate-950 border-slate-800 text-white"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">Legal Registered Entity Name</label>
                <input
                  type="text"
                  value={editingCompany.companyLegalName || ''}
                  onChange={(e) => setEditingCompany({ ...editingCompany, companyLegalName: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border bg-slate-950 border-slate-800 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Max Employees</label>
                  <input
                    type="number"
                    value={editingCompany.maxEmployeesAllowed ?? 0}
                    onChange={(e) => setEditingCompany({ ...editingCompany, maxEmployeesAllowed: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 text-xs rounded-xl border bg-slate-950 border-slate-800 text-white font-mono"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-400 block mb-1">Max Sites</label>
                  <input
                    type="number"
                    value={editingCompany.maxSitesAllowed ?? 0}
                    onChange={(e) => setEditingCompany({ ...editingCompany, maxSitesAllowed: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 text-xs rounded-xl border bg-slate-950 border-slate-800 text-white font-mono"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setEditingCompany(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 text-slate-300"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={saving}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-amber-600 hover:bg-amber-500 text-white"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
