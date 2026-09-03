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
  User,
  UserCog,
  LifeBuoy,
  ShieldAlert,
  History,
  BarChart3,
  ExternalLink
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
    (c.brandName && c.brandName.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (c.companyId && c.companyId.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (c.companyLegalName && c.companyLegalName.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const paginatedCompanies = filteredCompanies.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // Platform capabilities mapped for Platform Owners
  const platformTools = [
    {
      category: 'Tenants & Licensing',
      items: [
        {
          id: 'tool-companies',
          label: 'Tenant Directory',
          desc: 'All onboarded enterprise client organizations',
          screen: 'SUPER_ADMIN_COMPANIES' as PhaseAScreen,
          icon: Building2,
          color: 'text-indigo-500',
          badge: `${stats.totalCompanies} Tenants`
        },
        {
          id: 'tool-create-company',
          label: 'Provision Tenant',
          desc: 'Onboard new tenant, admin credentials & license',
          screen: 'SUPER_ADMIN_CREATE_COMPANY' as PhaseAScreen,
          icon: PlusCircle,
          color: 'text-amber-500',
          badge: 'New'
        },
        {
          id: 'tool-subscriptions',
          label: 'Subscriptions & Billing',
          desc: 'SaaS plans, quotas, usage limits & revenue metrics',
          screen: 'SUPER_ADMIN_SUBSCRIPTIONS' as PhaseAScreen,
          icon: CreditCard,
          color: 'text-emerald-500',
          badge: 'SaaS Plans'
        },
        {
          id: 'tool-modules',
          label: 'Module Entitlements',
          desc: 'Enable or restrict functional modules per tenant',
          screen: 'SUPER_ADMIN_MODULES' as PhaseAScreen,
          icon: Layers,
          color: 'text-cyan-500',
          badge: `${MASTER_APP_MODULES.length} Modules`
        }
      ]
    },
    {
      category: 'Operations & Security',
      items: [
        {
          id: 'tool-admins',
          label: 'Platform Administrators',
          desc: 'Manage super admins, support auditors & platform ops',
          screen: 'SUPER_ADMIN_ADMINS' as PhaseAScreen,
          icon: UserCog,
          color: 'text-violet-500',
          badge: 'RBAC'
        },
        {
          id: 'tool-support',
          label: 'Controlled Support Access',
          desc: 'Audited, time-bounded sessions for tenant troubleshooting',
          screen: 'SUPER_ADMIN_SUPPORT' as PhaseAScreen,
          icon: LifeBuoy,
          color: 'text-blue-500',
          badge: 'Live Access'
        },
        {
          id: 'tool-security',
          label: 'Platform Security & Threats',
          desc: 'Custom claims enforcement & real-time threat detection',
          screen: 'SUPER_ADMIN_SECURITY' as PhaseAScreen,
          icon: ShieldAlert,
          color: 'text-rose-500',
          badge: 'Threats'
        },
        {
          id: 'tool-audit',
          label: 'Cryptographic Audit Trail',
          desc: 'Tamper-evident platform mutation logs & export',
          screen: 'SUPER_ADMIN_AUDIT' as PhaseAScreen,
          icon: History,
          color: 'text-amber-500',
          badge: 'Immutable'
        }
      ]
    },
    {
      category: 'Governance & Intelligence',
      items: [
        {
          id: 'tool-monitoring',
          label: 'System Telemetry & Health',
          desc: 'Live latency diagnostics, Firestore health & error rates',
          screen: 'SUPER_ADMIN_MONITORING' as PhaseAScreen,
          icon: Activity,
          color: 'text-emerald-500',
          badge: 'Online'
        },
        {
          id: 'tool-config',
          label: 'Global Governance & Flags',
          desc: 'Multi-tenant parameters, maintenance mode & toggles',
          screen: 'SUPER_ADMIN_CONFIG' as PhaseAScreen,
          icon: Sliders,
          color: 'text-slate-500',
          badge: 'Config'
        },
        {
          id: 'tool-reports',
          label: 'Platform BI & Reports',
          desc: 'Cross-tenant analytics, distribution & CSV export',
          screen: 'SUPER_ADMIN_REPORTS' as PhaseAScreen,
          icon: BarChart3,
          color: 'text-purple-500',
          badge: 'Analytics'
        },
        {
          id: 'tool-leads',
          label: 'Sales Pipeline & Leads',
          desc: 'Inbound customer inquiries, demos & conversion CRM',
          screen: 'SUPER_ADMIN_LEADS' as PhaseAScreen,
          icon: Users,
          color: 'text-teal-500',
          badge: `${leadsCount} Inquiries`
        }
      ]
    }
  ];

  return (
    <div className={`flex-1 transition-colors duration-300 ${isDark ? 'bg-slate-950 text-slate-100' : 'bg-white text-black'} p-4 md:p-6 space-y-6 max-w-7xl mx-auto w-full`}>
      
      {/* Header Banner */}
      <div className={`transition-colors duration-300 ${isDark ? 'bg-gradient-to-r from-amber-950/80 via-slate-900 to-slate-900 border-amber-800/60' : 'bg-gradient-to-r from-amber-500/10 via-indigo-500/5 to-white border-amber-200 shadow-sm'} border p-5 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4`}>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-500 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[11px] font-bold tracking-wider uppercase bg-amber-500/20 text-amber-400 border border-amber-500/30">
                Platform Owner Control Center
              </span>
              <span className="text-xs text-slate-400 font-mono">Session ID: {currentSession.userId}</span>
            </div>
            <h1 className="text-lg font-bold mt-0.5">Multi-Tenant Platform Control Plane</h1>
            <p className="text-xs text-slate-400">Manage tenant enterprises, module entitlements, SaaS subscriptions, and platform security.</p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end md:self-auto">
          <button
            onClick={loadData}
            disabled={refreshing}
            className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 border transition ${
              isDark 
                ? 'bg-slate-900 border-slate-800 hover:bg-slate-800 text-slate-200' 
                : 'bg-white border-slate-200 hover:bg-slate-100 text-black shadow-sm'
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

      {/* KPI Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 md:gap-4">
        
        <div 
          onClick={() => onNavigate('SUPER_ADMIN_COMPANIES')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer hover:border-indigo-500/50 ${isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}
        >
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Organizations</span>
            <Building2 className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-2xl font-black text-indigo-400">{stats.totalCompanies}</div>
          <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
            <span className="text-emerald-400 font-bold">{stats.activeCompanies} Active</span> • {stats.pendingCompanies} Pending
          </p>
        </div>

        <div 
          onClick={() => onNavigate('SUPER_ADMIN_COMPANIES')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer hover:border-emerald-500/50 ${isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}
        >
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Global Users</span>
            <Users className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-emerald-400">{stats.totalUsers}</div>
          <p className="text-[11px] text-slate-400 mt-1">Across all organizations</p>
        </div>

        <div 
          onClick={() => onNavigate('SUPER_ADMIN_SUBSCRIPTIONS')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer hover:border-blue-500/50 ${isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}
        >
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Subscriptions</span>
            <CreditCard className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-black text-blue-400">{stats.activeCompanies}</div>
          <p className="text-[11px] text-slate-400 mt-1">Active SaaS Licenses</p>
        </div>

        <div 
          onClick={() => onNavigate('SUPER_ADMIN_LEADS')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer hover:border-teal-500/50 ${isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}
        >
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Sales Pipeline</span>
            <TrendingUp className="w-4 h-4 text-teal-500" />
          </div>
          <div className="text-2xl font-black text-teal-400">{leadsCount}</div>
          <p className="text-[11px] text-slate-400 mt-1">Active CRM Inquiries</p>
        </div>

        <div 
          onClick={() => onNavigate('SUPER_ADMIN_PENDING_APPROVALS')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer hover:border-amber-500/50 ${isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}
        >
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Pending Approvals</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-amber-400">{pendingRequests.length}</div>
          <p className="text-[11px] text-slate-400 mt-1">Require Super Admin action</p>
        </div>

        <div 
          onClick={() => onNavigate('SUPER_ADMIN_MODULES')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer hover:border-cyan-500/50 ${isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}
        >
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Core Modules</span>
            <Layers className="w-4 h-4 text-cyan-500" />
          </div>
          <div className="text-2xl font-black text-cyan-400">{MASTER_APP_MODULES.length}</div>
          <p className="text-[11px] text-slate-400 mt-1">Multi-tenant catalog</p>
        </div>

      </div>

      {/* Platform Capabilities Hub */}
      <div className="space-y-4">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
          <Sliders className="w-4 h-4 text-amber-500" />
          <span>Platform Capabilities & Control Operations</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {platformTools.map((group) => (
            <div 
              key={group.category}
              className={`p-4 rounded-2xl border transition-colors ${
                isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-50/70 border-slate-200 shadow-sm'
              } space-y-3`}
            >
              <h3 className="text-xs font-black tracking-wider uppercase text-slate-400">
                {group.category}
              </h3>
              <div className="space-y-2">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      onClick={() => onNavigate(item.screen)}
                      className={`w-full p-2.5 rounded-xl border text-left transition flex items-center justify-between group ${
                        isDark 
                          ? 'bg-slate-900/90 hover:bg-slate-800/90 border-slate-800 hover:border-slate-700' 
                          : 'bg-white hover:bg-slate-100 border-slate-200 hover:border-slate-300 shadow-xs'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                          isDark ? 'bg-slate-800' : 'bg-slate-100'
                        }`}>
                          <Icon className={`w-4 h-4 ${item.color}`} />
                        </div>
                        <div className="truncate">
                          <p className="text-xs font-bold text-slate-900 dark:text-slate-100 group-hover:text-amber-500 transition-colors truncate">
                            {item.label}
                          </p>
                          <p className="text-[11px] text-slate-400 truncate">{item.desc}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0 pl-2">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                          {item.badge}
                        </span>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Tenant Organizations Directory Table */}
      <div className={`p-5 rounded-2xl border transition-colors duration-300 ${isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200 shadow-sm'} space-y-4`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold flex items-center gap-2">
              <Building2 className="w-4 h-4 text-indigo-500" />
              <span>Active Organizations Directory</span>
            </h2>
            <p className="text-xs text-slate-400">Real-time tenant licensing, employee limits, and configuration.</p>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search tenant name or code..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`pl-8 pr-3 py-1.5 rounded-xl text-xs border outline-none transition ${
                  isDark ? 'bg-slate-950 border-slate-800 text-slate-200 focus:border-amber-500' : 'bg-slate-50 border-slate-200 text-black focus:border-amber-500'
                }`}
              />
            </div>
            <button
              onClick={() => onNavigate('SUPER_ADMIN_COMPANIES')}
              className="text-xs font-semibold text-indigo-500 hover:underline flex items-center gap-1"
            >
              Full Directory <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center text-slate-400 space-y-2">
            <RefreshCw className="w-6 h-6 animate-spin text-amber-500" />
            <p className="text-xs">Loading tenant organizations...</p>
          </div>
        ) : filteredCompanies.length === 0 ? (
          <div className="py-12 text-center text-slate-400 space-y-2">
            <Building2 className="w-10 h-10 mx-auto text-slate-600" />
            <p className="text-xs font-medium">No organizations matching "{searchTerm}"</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className={`border-b ${isDark ? 'border-slate-800 text-slate-400' : 'border-slate-200 text-slate-600'} font-semibold`}>
                  <th className="py-2.5 px-3">Organization</th>
                  <th className="py-2.5 px-3">Company Code</th>
                  <th className="py-2.5 px-3">Plan Tier</th>
                  <th className="py-2.5 px-3">Allowed Limits</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {paginatedCompanies.map((c) => (
                  <tr key={c.companyId} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                    <td className="py-3 px-3">
                      <div>
                        <p className="font-bold text-slate-900 dark:text-slate-100">{c.brandName || c.companyLegalName}</p>
                        {c.companyLegalName && c.companyLegalName !== c.brandName && (
                          <p className="text-[11px] text-slate-400 truncate max-w-xs">{c.companyLegalName}</p>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold">
                        {c.companyId}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                        c.licenseTier === 'ENTERPRISE' 
                          ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                          : c.licenseTier === 'PROFESSIONAL'
                          ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                          : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      }`}>
                        {c.licenseTier || 'STARTER'}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-500 dark:text-slate-400">
                      {c.maxEmployeesAllowed ?? '∞'} Employees • {c.maxSitesAllowed ?? '∞'} Sites
                    </td>
                    <td className="py-3 px-3">
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                        c.status === 'ACTIVE' 
                          ? 'bg-emerald-500/10 text-emerald-400' 
                          : 'bg-amber-500/10 text-amber-400'
                      }`}>
                        {c.status}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => onNavigate('SUPER_ADMIN_MODULES')}
                          title="Configure Module Entitlements"
                          className="px-2 py-1 rounded text-[11px] font-medium bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-500 transition"
                        >
                          Modules
                        </button>
                        <button
                          onClick={() => onNavigate('SUPER_ADMIN_SUBSCRIPTIONS')}
                          title="Manage Subscription"
                          className="px-2 py-1 rounded text-[11px] font-medium bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 transition"
                        >
                          Billing
                        </button>
                        <button
                          onClick={() => onNavigate('SUPER_ADMIN_SUPPORT')}
                          title="Controlled Support Session"
                          className="px-2 py-1 rounded text-[11px] font-medium bg-blue-500/10 hover:bg-blue-500/20 text-blue-500 transition"
                        >
                          Support
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {filteredCompanies.length > itemsPerPage && (
              <div className="pt-3">
                <Pagination
                  currentPage={currentPage}
                  totalItems={filteredCompanies.length}
                  itemsPerPage={itemsPerPage}
                  onPageChange={setCurrentPage}
                  onItemsPerPageChange={setItemsPerPage}
                  pageSizeOptions={[5, 10, 20]}
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Platform Alerts & Pending Requests Section */}
      <div className={`p-5 rounded-2xl border transition-colors duration-300 ${isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200 shadow-sm'} space-y-4`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <span>Platform Alerts & Pending Approvals Queue</span>
            </h2>
            <p className="text-xs text-slate-400">Action required: global tenant onboarding requests and user registrations.</p>
          </div>
          <button
            onClick={() => onNavigate('SUPER_ADMIN_PENDING_APPROVALS')}
            className="text-xs font-semibold text-amber-500 hover:text-amber-400 transition flex items-center gap-1"
          >
            Review All In Inbox <ChevronRight className="w-3.5 h-3.5" />
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
            <p className="text-xs font-medium">All clear! No pending tenant approvals or platform alerts.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {pendingRequests.slice(0, 5).map((req) => (
              <div key={req.id} className={`flex items-center justify-between p-3 rounded-xl border ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-white border-slate-200'}`}>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center border border-amber-500/20">
                    <User className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-100">{req.fullName}</p>
                    <p className="text-[11px] text-slate-400">Requested to join <span className="font-mono text-amber-400">{req.companyId}</span> as {req.requestedRole}</p>
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

