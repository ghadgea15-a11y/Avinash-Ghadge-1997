import React, { useState, useEffect } from 'react';
import { 
  Building2, CreditCard, 
  Users, 
  ShieldCheck, 
  PlusCircle, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Key, 
  Sliders, 
  Search, 
  RefreshCw, 
  Layers, 
  ArrowRight, 
  Lock, 
  AlertTriangle,
  ChevronRight,
  TrendingUp,
  Globe,
  FileText,
  Activity
} from 'lucide-react';
import { CompanyTenant, UserSession, PhaseAScreen, MASTER_APP_MODULES, ApprovalRequestRecord } from '../../types';
import { FirestoreService } from '../../services/firestoreService';
import { SubscriptionService } from '../../services/subscriptionService';
import { SubscriptionPlan, CompanySubscription } from '../../types';

import { useTheme } from '../../context/ThemeContext';

interface SuperAdminDashboardProps {
  currentSession: UserSession;
  onNavigate: (screen: PhaseAScreen) => void;
  onSelectCompanyForDetails?: (company: CompanyTenant) => void;
}

export const SuperAdminDashboard: React.FC<SuperAdminDashboardProps> = ({
  currentSession,
  onNavigate,
  onSelectCompanyForDetails
}) => {
  const { isDark } = useTheme();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [companies, setCompanies] = useState<CompanyTenant[]>([]);
  const [pendingRequests, setPendingRequests] = useState<ApprovalRequestRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  
  useEffect(() => { setCurrentPage(1); }, [searchTerm]);
  const [stats, setStats] = useState({
    totalCompanies: 0,
    activeCompanies: 0,
    pendingCompanies: 0,
    totalUsers: 0,
    pendingUserApprovals: 0,
    activeSites: 0,
    todayVisitors: 0,
    todayIncidents: 0
  });

  const loadData = async () => {
    setRefreshing(true);
    try {
      const [allComp, sysStats, reqs] = await Promise.all([
        FirestoreService.getAllCompanies(),
        FirestoreService.getSuperAdminStats(),
        FirestoreService.getAllApprovalRequests()
      ]);
      setCompanies(allComp);
      setStats(sysStats);
      setPendingRequests(reqs.filter(r => r.accountStatus === 'PENDING_APPROVAL'));
    } catch (err) {
      console.error('[SuperAdminDashboard] Error loading system data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);


  const filteredCompanies = companies.filter(c => 
    c.brandName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.companyId.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.companyLegalName && c.companyLegalName.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const paginatedCompanies = filteredCompanies.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);


  return (
    <div className={`flex-1 transition-colors duration-300 ${isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'} p-4 md:p-6 space-y-6 max-w-7xl mx-auto w-full`}>
      
      {/* Header Banner */}
      <div className={`transition-colors duration-300 ${isDark ? 'bg-gradient-to-r from-amber-950/80 via-slate-900 to-slate-900 border-amber-800/60' : 'bg-gradient-to-r from-amber-500/10 via-indigo-500/5 to-white border-amber-200 shadow-sm'} border p-5 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4`}>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-500 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase bg-amber-500/20 text-amber-400 border border-amber-500/30">
                System Super Admin
              </span>
              <span className="text-xs text-slate-400 font-mono">ID: {currentSession.userId}</span>
            </div>
            <h1 className="text-lg font-bold mt-0.5">Log Sheet Muster (LSM) Control Center</h1>
            <p className="text-xs text-slate-400">Manage company tenants, module entitlements, and global access rules.</p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end md:self-auto">
          <button
            onClick={loadData}
            disabled={refreshing}
            className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 border transition ${
              isDark 
                ? 'bg-slate-900 border-slate-800 hover:bg-slate-800 text-slate-200' 
                : 'bg-white border-slate-200 hover:bg-slate-100 text-slate-800 shadow-sm'
            }`}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-amber-500' : ''}`} />
            <span>Sync Live Stats</span>
          </button>

          <button
            onClick={() => onNavigate('SUPER_ADMIN_CREATE_COMPANY')}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-amber-600 hover:bg-amber-500 text-white flex items-center gap-1.5 shadow-lg shadow-amber-600/30 transition"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Register New Company</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        
        <div className={`p-4 rounded-2xl border transition-all ${isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Total Companies</span>
            <Building2 className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-2xl font-black text-indigo-400">{stats.totalCompanies}</div>
          <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
            <span className="text-emerald-400 font-bold">{stats.activeCompanies} Active</span> • {stats.pendingCompanies} Pending
          </p>
        </div>

        <div className={`p-4 rounded-2xl border transition-all ${isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Global Users</span>
            <Users className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-emerald-400">{stats.totalUsers}</div>
          <p className="text-[10px] text-slate-400 mt-1">Across all tenant organizations</p>
        </div>

        <div className={`p-4 rounded-2xl border transition-all ${isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Pending Approvals</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-amber-400">{pendingRequests.length}</div>
          <button 
            onClick={() => onNavigate('SUPER_ADMIN_PENDING_APPROVALS')}
            className="text-[10px] text-amber-400 hover:underline mt-1 block font-semibold"
          >
            Review Applications →
          </button>
        </div>

        <div className={`p-4 rounded-2xl border transition-all ${isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Master Modules</span>
            <Layers className="w-4 h-4 text-cyan-500" />
          </div>
          <div className="text-2xl font-black text-cyan-400">{MASTER_APP_MODULES.length}</div>
          <button 
            onClick={() => onNavigate('SUPER_ADMIN_MODULES')}
            className="text-[10px] text-cyan-400 hover:underline mt-1 block font-semibold"
          >
            Configure Entitlements →
          </button>
        </div>

      </div>

      {/* Action Shortcut Pills */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <button
          onClick={() => onNavigate('SUPER_ADMIN_COMPANIES')}
          className={`p-3 rounded-xl border text-left transition flex items-center justify-between ${
            isDark ? 'bg-slate-900/60 hover:bg-slate-800/80 border-slate-800' : 'bg-white hover:bg-slate-100 border-slate-200 shadow-sm'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <Building2 className="w-4 h-4 text-indigo-400" />
            <span className="text-xs font-semibold">Company Directory</span>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-500" />
        </button>

        <button
          onClick={() => onNavigate('SUPER_ADMIN_CREATE_COMPANY')}
          className={`p-3 rounded-xl border text-left transition flex items-center justify-between ${
            isDark ? 'bg-slate-900/60 hover:bg-slate-800/80 border-slate-800' : 'bg-white hover:bg-slate-100 border-slate-200 shadow-sm'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <PlusCircle className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-semibold">New Tenant Signup</span>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-500" />
        </button>

        <button
          onClick={() => onNavigate('SUPER_ADMIN_MODULES')}
          className={`p-3 rounded-xl border text-left transition flex items-center justify-between ${
            isDark ? 'bg-slate-900/60 hover:bg-slate-800/80 border-slate-800' : 'bg-white hover:bg-slate-100 border-slate-200 shadow-sm'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <Sliders className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-semibold">Module Access Rules</span>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-500" />
        </button>

        <button
          onClick={() => onNavigate('SUPER_ADMIN_USERS')}
          className={`p-3 rounded-xl border text-left transition flex items-center justify-between ${
            isDark ? 'bg-slate-900/60 hover:bg-slate-800/80 border-slate-800' : 'bg-white hover:bg-slate-100 border-slate-200 shadow-sm'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <Users className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-semibold">Global Users & RBAC</span>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-500" />
        </button>
      </div>

      {/* Companies List Section */}
      <div className={`p-5 rounded-2xl border transition-colors duration-300 ${isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200 shadow-sm'} space-y-4`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold flex items-center gap-2">
              <Building2 className="w-4 h-4 text-amber-500" />
              <span>Registered Companies & Tenant Organizations</span>
            </h2>
            <p className="text-xs text-slate-400">Live directory of all companies registered on the LSM platform.</p>
          </div>

          <div className="relative min-w-[240px]">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search code, name..."
              className={`w-full pl-9 pr-3 py-1.5 rounded-xl text-xs border ${
                isDark 
                  ? 'bg-slate-950 border-slate-800 text-white placeholder-slate-500 focus:border-amber-500' 
                  : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-amber-600'
              } focus:outline-none`}
            />
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          </div>
        </div>

        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center text-slate-400 space-y-2">
            <RefreshCw className="w-6 h-6 animate-spin text-amber-500" />
            <p className="text-xs">Loading company records from Firestore...</p>
          </div>
        ) : filteredCompanies.length === 0 ? (
          <div className="py-12 text-center text-slate-400 space-y-3">
            <Building2 className="w-10 h-10 mx-auto text-slate-600" />
            <p className="text-xs font-medium">No registered companies found.</p>
            <button
              onClick={() => onNavigate('SUPER_ADMIN_CREATE_COMPANY')}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold rounded-xl"
            >
              Register First Company
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className={`border-b ${isDark ? 'border-slate-800 text-slate-400' : 'border-slate-200 text-slate-500'}`}>
                  <th className="py-3 px-3 font-semibold">Company Code</th>
                  <th className="py-3 px-3 font-semibold">Brand / Legal Name</th>
                  <th className="py-3 px-3 font-semibold">License Tier</th>
                  <th className="py-3 px-3 font-semibold">Enabled Modules</th>
                  <th className="py-3 px-3 font-semibold">Company Admin</th>
                  <th className="py-3 px-3 font-semibold">Status</th>
                  <th className="py-3 px-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${isDark ? 'divide-slate-800/60' : 'divide-slate-100'}`}>
                {paginatedCompanies.map((company) => {
                  const enabledCount = company.enabledModules?.length || 0;
                  return (
                    <tr key={company.companyId} className={`hover:${isDark ? 'bg-slate-800/40' : 'bg-slate-50'} transition`}>
                      <td className="py-3 px-3 font-mono font-bold text-amber-400">
                        {company.companyId}
                      </td>
                      <td className="py-3 px-3 font-semibold">
                        <div>{company.brandName}</div>
                        {company.companyLegalName && (
                          <div className="text-[10px] text-slate-400 truncate max-w-[200px]">{company.companyLegalName}</div>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          company.licenseTier === 'ENTERPRISE' ? 'bg-indigo-950 text-indigo-300 border border-indigo-800' :
                          company.licenseTier === 'PROFESSIONAL' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' :
                          'bg-slate-800 text-slate-300 border border-slate-700'
                        }`}>
                          {company.licenseTier}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-950 text-cyan-300 border border-cyan-800">
                          {enabledCount} / {MASTER_APP_MODULES.length} Modules
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        {company.adminEmail ? (
                          <div>
                            <div className="font-medium text-slate-200">{company.adminName || 'Admin'}</div>
                            <div className="text-[10px] text-slate-400 font-mono">{company.adminEmail}</div>
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-500 italic">Unassigned</span>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 w-fit ${
                          company.status === 'ACTIVE' 
                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' 
                            : 'bg-rose-950 text-rose-400 border border-rose-800'
                        }`}>
                          {company.status === 'ACTIVE' ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                          <span>{company.status}</span>
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right space-x-1">
                        <button
                          onClick={() => onNavigate('SUPER_ADMIN_MODULES')}
                          className="px-2 py-1 rounded text-[10px] font-semibold bg-cyan-950 hover:bg-cyan-900 text-cyan-300 border border-cyan-800 transition"
                          title="Manage Modules"
                        >
                          Modules
                        </button>
                        <button
                          onClick={() => onSelectCompanyForDetails ? onSelectCompanyForDetails(company) : onNavigate('SUPER_ADMIN_COMPANIES')}
                          className="px-2 py-1 rounded text-[10px] font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
                        >
                          Details
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
};
