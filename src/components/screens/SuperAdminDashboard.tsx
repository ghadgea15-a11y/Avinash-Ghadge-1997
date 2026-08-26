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
  Activity,
  User
} from 'lucide-react';
import { CompanyTenant, UserSession, PhaseAScreen, MASTER_APP_MODULES, ApprovalRequestRecord } from '../../types';
import { FirestoreService } from '../../services/firestoreService';
import { Pagination } from '../common/Pagination';
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
  const [leadsCount, setLeadsCount] = useState(0);
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
      const [allComp, sysStats, reqs, allLeads] = await Promise.all([
        FirestoreService.getAllCompanies(),
        FirestoreService.getSuperAdminStats(),
        FirestoreService.getAllApprovalRequests('PENDING_APPROVAL'),
        FirestoreService.getLeads()
      ]);
      setCompanies(allComp);
      setStats(sysStats);
      setPendingRequests(reqs.filter(r => r.accountStatus === 'PENDING_APPROVAL'));
      setLeadsCount(allLeads.filter(l => l.status === 'NEW').length);
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
            <span>Provision New Tenant</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-4">
        
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
            <span className="text-xs font-medium">New Demo Leads</span>
            <Users className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-emerald-500">{leadsCount}</div>
          <button 
            onClick={() => onNavigate('SUPER_ADMIN_LEADS')}
            className="text-[10px] text-emerald-500 hover:underline mt-1 block font-semibold"
          >
            Manage CRM →
          </button>
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
            <span className="text-xs font-semibold">Provision New Tenant</span>
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
          onClick={() => onNavigate('SUPER_ADMIN_LEADS')}
          className={`p-3 rounded-xl border text-left transition flex items-center justify-between ${
            isDark ? 'bg-slate-900/60 hover:bg-slate-800/80 border-slate-800' : 'bg-white hover:bg-slate-100 border-slate-200 shadow-sm'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <Users className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-semibold">Leads CRM</span>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-500" />
        </button>
      </div>

      {/* Platform Alerts & Pending Requests Section */}
      <div className={`p-5 rounded-2xl border transition-colors duration-300 ${isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200 shadow-sm'} space-y-4`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <span>Platform Alerts & Pending Approvals</span>
            </h2>
            <p className="text-xs text-slate-400">Action required: global tenant onboarding requests and platform alerts.</p>
          </div>
          <button
            onClick={() => onNavigate('SUPER_ADMIN_PENDING_APPROVALS')}
            className="text-xs font-semibold text-amber-500 hover:text-amber-400 transition flex items-center gap-1"
          >
            View All Approvals <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center text-slate-400 space-y-2">
            <RefreshCw className="w-6 h-6 animate-spin text-amber-500" />
            <p className="text-xs">Loading platform alerts...</p>
          </div>
        ) : pendingRequests.length === 0 ? (
          <div className="py-12 text-center text-slate-400 space-y-3">
            <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-600/50" />
            <p className="text-xs font-medium">No pending tenant approvals or critical platform alerts.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {pendingRequests.slice(0, 5).map((req) => (
              <div key={req.id} className={`flex items-center justify-between p-3 rounded-xl border ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center border border-amber-500/20">
                    <User className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-100">{req.fullName}</p>
                    <p className="text-[10px] text-slate-400">Requested to join <span className="font-mono text-amber-400">{req.companyId}</span> as {req.requestedRole}</p>
                  </div>
                </div>
                <button
                  onClick={() => onNavigate('SUPER_ADMIN_PENDING_APPROVALS')}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-600 hover:bg-amber-500 text-white transition"
                >
                  Review
                </button>
              </div>
            ))}
            {pendingRequests.length > 5 && (
              <p className="text-center text-xs text-slate-400 pt-2">
                + {pendingRequests.length - 5} more pending requests
              </p>
            )}
          </div>
        )}
      </div>

    </div>
  );
};
