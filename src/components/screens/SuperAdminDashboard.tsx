import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../../firebase';
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
  ExternalLink,
  Check,
  X
} from 'lucide-react';
import { CompanyTenant, UserSession, PhaseAScreen, MASTER_APP_MODULES, ApprovalRequestRecord } from '../../types';
import { PlatformSecurityEvent } from '../../types/platform';
import { FirestoreService } from '../../services/firestoreService';
import { SuperAdminService } from '../../services/superAdminService';
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
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'SUSPENDED' | 'EXPIRED' | 'PENDING'>('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [updatingCompanyId, setUpdatingCompanyId] = useState<string | null>(null);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);
  const [securityEvents, setSecurityEvents] = useState<PlatformSecurityEvent[]>([]);
  
  useEffect(() => { setCurrentPage(1); }, [searchTerm, statusFilter]);
  const [stats, setStats] = useState({
    totalCompanies: 0,
    activeCompanies: 0,
    suspendedCompanies: 0,
    trialExpiredCompanies: 0,
    pendingCompanies: 0,
    totalUsers: 0,
    activeUsers: 0,
    totalGuards: 0,
    totalStaff: 0,
    totalSuperAdmins: 0,
    pendingUserApprovals: 0,
    activeSites: 0,
    todayVisitors: 0,
    todayIncidents: 0
  });

  // Comprehensive Live Data Loader
  const loadData = async () => {
    setRefreshing(true);
    try {
      if (auth.currentUser) {
        await auth.currentUser.getIdToken(true).catch(e => console.warn('Refresh token err', e));
      }
      const [allComp, sysStats, reqs, allLeads, secEvts] = await Promise.all([
        FirestoreService.getAllCompanies(),
        FirestoreService.getSuperAdminStats(),
        FirestoreService.getAllApprovalRequests(),
        FirestoreService.getLeads(),
        SuperAdminService.getPlatformSecurityEvents({ limitCount: 20 })
      ]);
      setCompanies(allComp);
      setStats(sysStats);
      setPendingRequests(reqs.filter(r => (r.accountStatus || r.status || '') === 'PENDING_APPROVAL'));
      setLeadsCount(allLeads.filter(l => l.status === 'NEW').length);
      setSecurityEvents(secEvts);
    } catch (err) {
      console.error('[SuperAdminDashboard] Error loading system data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Real-time Firestore Listeners
  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    // Initial query
    loadData();

    // 1. Real-time Companies listener
    let unsubCompanies: (() => void) | null = null;
    try {
      const compColRef = collection(db, 'companies');
      unsubCompanies = onSnapshot(compColRef, (snapshot) => {
        if (!isMounted) return;
        const compList = snapshot.docs.map(docSnap => {
          const data = docSnap.data();
          return {
            companyId: docSnap.id,
            companyCode: data.companyCode || data.companyId || docSnap.id,
            companyLegalName: data.companyLegalName || data.brandName || docSnap.id,
            brandName: data.brandName || data.companyLegalName || docSnap.id,
            licenseTier: data.licenseTier || 'ENTERPRISE',
            status: data.status || 'ACTIVE',
            primaryColorHex: data.primaryColorHex || '#4f46e5',
            secondaryColorHex: data.secondaryColorHex || '#06b6d4',
            allowedBranches: data.allowedBranches || ['MAIN'],
            maxEmployeesAllowed: Number(data.maxEmployeesAllowed) || 1000,
            maxSitesAllowed: Number(data.maxSitesAllowed) || 50,
            enabledModules: data.enabledModules || MASTER_APP_MODULES.map(m => m.key),
            logoUrl: data.logoUrl || '',
            websiteUrl: data.websiteUrl || '',
            portalSubdomain: data.portalSubdomain || '',
            email: data.email || '',
            phone: data.phone || '',
            address: data.address || '',
            city: data.city || '',
            state: data.state || '',
            country: data.country || 'India',
            adminName: data.adminName || '',
            adminEmail: data.adminEmail || '',
            adminUid: data.adminUid || '',
            createdAt: data.createdAt?.seconds ? new Date(data.createdAt.seconds * 1000).toISOString() : (typeof data.createdAt === 'string' ? data.createdAt : new Date().toISOString()),
            updatedAt: data.updatedAt?.seconds ? new Date(data.updatedAt.seconds * 1000).toISOString() : (typeof data.updatedAt === 'string' ? data.updatedAt : new Date().toISOString())
          } as CompanyTenant;
        });

        compList.sort((a, b) => {
          const dateA = typeof a.createdAt === 'string' ? a.createdAt : '';
          const dateB = typeof b.createdAt === 'string' ? b.createdAt : '';
          return dateB.localeCompare(dateA);
        });

        setCompanies(compList);
        
        // Update company stat counts in real-time
        setStats(prev => ({
          ...prev,
          totalCompanies: compList.length,
          activeCompanies: compList.filter(c => (c.status || '').toUpperCase() === 'ACTIVE').length,
          suspendedCompanies: compList.filter(c => (c.status || '').toUpperCase() === 'SUSPENDED').length,
          trialExpiredCompanies: compList.filter(c => (c.status || '').toUpperCase() === 'TRIAL_EXPIRED' || (c.status || '').toUpperCase() === 'EXPIRED').length,
          pendingCompanies: compList.filter(c => (c.status || '').toUpperCase() === 'PENDING').length
        }));
      }, (err) => {
        console.warn('[SuperAdminDashboard] Realtime companies listener notice:', err);
      });
    } catch (e) {
      console.warn('[SuperAdminDashboard] Realtime companies attach notice:', e);
    }

    // 2. Real-time Approval Requests listener
    let unsubRequests: (() => void) | null = null;
    try {
      const reqColRef = collection(db, 'approval_requests');
      unsubRequests = onSnapshot(reqColRef, (snapshot) => {
        if (!isMounted) return;
        const reqList = snapshot.docs.map(docSnap => ({
          id: docSnap.id,
          ...docSnap.data()
        } as ApprovalRequestRecord));
        
        const pendingOnly = reqList.filter(r => (r.accountStatus || r.status || '') === 'PENDING_APPROVAL');
        setPendingRequests(pendingOnly);
        setStats(prev => ({
          ...prev,
          pendingUserApprovals: pendingOnly.length
        }));
      }, (err) => {
        console.warn('[SuperAdminDashboard] Realtime requests listener notice:', err);
      });
    } catch (e) {
      console.warn('[SuperAdminDashboard] Realtime requests attach notice:', e);
    }

    // 3. Real-time Security Events & Intrusion Alarms listener
    let unsubSecurity: (() => void) | null = null;
    try {
      const secColRef = collection(db, 'platform_security_events');
      unsubSecurity = onSnapshot(secColRef, (snapshot) => {
        if (!isMounted) return;
        const evts: PlatformSecurityEvent[] = snapshot.docs.map(docSnap => {
          const data = docSnap.data();
          return {
            id: docSnap.id,
            eventType: data.eventType || data.type || 'UNAUTHORIZED_ACCESS_ATTEMPT',
            type: data.type || data.eventType || 'UNAUTHORIZED_ACCESS_ATTEMPT',
            severity: data.severity || 'WARNING',
            actorEmail: data.actorEmail || data.userEmail || '',
            userEmail: data.userEmail || data.actorEmail || '',
            companyId: data.companyId || '',
            details: data.details || '',
            resolved: data.resolved || false,
            timestamp: data.timestamp || new Date().toISOString()
          };
        });
        evts.sort((a, b) => new Date(b.timestamp as string).getTime() - new Date(a.timestamp as string).getTime());
        setSecurityEvents(evts);
      }, (err) => {
        console.warn('[SuperAdminDashboard] Realtime security listener notice:', err);
      });
    } catch (e) {
      console.warn('[SuperAdminDashboard] Realtime security attach notice:', e);
    }

    return () => {
      isMounted = false;
      if (unsubCompanies) unsubCompanies();
      if (unsubRequests) unsubRequests();
      if (unsubSecurity) unsubSecurity();
    };
  }, []);

  // Quick Live Status Switcher for testing/production control
  const handleUpdateCompanyStatus = async (companyId: string, newStatus: 'ACTIVE' | 'SUSPENDED' | 'EXPIRED' | 'PENDING') => {
    setUpdatingCompanyId(companyId);
    setActionSuccessMsg(null);
    try {
      const normalizedStatus = newStatus === 'EXPIRED' ? 'TRIAL_EXPIRED' : newStatus;
      const targetCompany = companies.find(c => c.companyId === companyId);
      const prevStatus = targetCompany?.status || 'ACTIVE';

      await SuperAdminService.updateTenantStatus(
        currentSession,
        companyId,
        normalizedStatus === 'SUSPENDED' ? 'SUSPENDED' : 'ACTIVE',
        `Super Admin switched status from ${prevStatus} to ${newStatus} on live dashboard`
      );

      setActionSuccessMsg(`✓ Updated status for ${companyId} to ${newStatus} in real-time. Platform mutation logged to immutable audit trail.`);
      setTimeout(() => setActionSuccessMsg(null), 4000);
    } catch (err: any) {
      console.error('[SuperAdminDashboard] Status update error:', err);
    } finally {
      setUpdatingCompanyId(null);
    }
  };

  const filteredCompanies = companies.filter(c => {
    const matchesSearch = 
      (c.brandName && c.brandName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (c.companyId && c.companyId.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (c.companyLegalName && c.companyLegalName.toLowerCase().includes(searchTerm.toLowerCase()));
    
    if (!matchesSearch) return false;
    if (statusFilter === 'ALL') return true;
    if (statusFilter === 'ACTIVE') return (c.status || '').toUpperCase() === 'ACTIVE';
    if (statusFilter === 'SUSPENDED') return (c.status || '').toUpperCase() === 'SUSPENDED';
    if (statusFilter === 'EXPIRED') return (c.status || '').toUpperCase() === 'TRIAL_EXPIRED' || (c.status || '').toUpperCase() === 'EXPIRED';
    if (statusFilter === 'PENDING') return (c.status || '').toUpperCase() === 'PENDING';
    return true;
  });

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
          badge: securityEvents.filter(e => !e.resolved && (e.severity === 'HIGH' || e.severity === 'CRITICAL' || e.eventType === 'FAILED_LOGIN' || (e.type || '').includes('FAILED') || (e.type || '').includes('BRUTE_FORCE'))).length > 0 
            ? `${securityEvents.filter(e => !e.resolved && (e.severity === 'HIGH' || e.severity === 'CRITICAL' || e.eventType === 'FAILED_LOGIN' || (e.type || '').includes('FAILED') || (e.type || '').includes('BRUTE_FORCE'))).length} Active Threat${securityEvents.filter(e => !e.resolved && (e.severity === 'HIGH' || e.severity === 'CRITICAL' || e.eventType === 'FAILED_LOGIN' || (e.type || '').includes('FAILED') || (e.type || '').includes('BRUTE_FORCE'))).length > 1 ? 's' : ''}` 
            : 'Threats'
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
        },
        {
          id: 'tool-website-editor',
          label: 'Website Editor (CMS)',
          desc: 'Visually edit public landing page, theme, and copy',
          screen: 'SUPER_ADMIN_LANDING_EDITOR' as PhaseAScreen,
          icon: Globe,
          color: 'text-pink-500',
          badge: 'Live Preview'
        }
      ]
    }
  ];

  return (
    <div className={`flex-1 transition-colors duration-300 ${isDark ? 'bg-slate-950 text-slate-100' : 'bg-white text-black'} p-4 md:p-6 space-y-6 max-w-7xl mx-auto w-full`}>
      
      {/* Toast Notification */}
      {actionSuccessMsg && (
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold flex items-center justify-between animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{actionSuccessMsg}</span>
          </div>
          <button onClick={() => setActionSuccessMsg(null)} className="text-emerald-400 hover:text-emerald-200">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Security Anomaly & Intrusion Alarm Banner */}
      {(() => {
        const activeAlarms = securityEvents.filter(e => !e.resolved && (e.severity === 'HIGH' || e.severity === 'CRITICAL' || e.eventType === 'FAILED_LOGIN' || (e.type || '').includes('FAILED') || (e.type || '').includes('BRUTE_FORCE')));
        if (activeAlarms.length === 0) return null;
        const topAlarm = activeAlarms[0];

        return (
          <div className="p-4 rounded-2xl bg-rose-950/40 border-2 border-rose-500/60 shadow-lg shadow-rose-950/30 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start md:items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-rose-500/20 border border-rose-500/50 text-rose-400 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-rose-400 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2 py-0.5 rounded text-[10px] font-extrabold tracking-wider uppercase bg-rose-600 text-white shadow-sm">
                    SECURITY ALARM TRIGGERED
                  </span>
                  <span className="text-xs text-rose-300 font-bold">
                    {activeAlarms.length} Active Security Alert{activeAlarms.length > 1 ? 's' : ''} / Intrusion Anomaly
                  </span>
                  {topAlarm.companyId && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-rose-900/60 text-rose-200 border border-rose-700/50">
                      Tenant: {topAlarm.companyId}
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-200 mt-1">
                  <span className="font-semibold text-rose-200">Latest Event: </span>
                  <span>{topAlarm.details || topAlarm.type}</span>
                  {topAlarm.actorEmail && <span className="text-slate-300 ml-1 font-mono">({topAlarm.actorEmail})</span>}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 self-end md:self-auto shrink-0">
              <button
                onClick={() => onNavigate('SUPER_ADMIN_SECURITY')}
                className="px-3.5 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white flex items-center gap-1.5 shadow transition"
              >
                <ShieldAlert className="w-4 h-4" />
                <span>Inspect Threats & Lockouts</span>
              </button>
            </div>
          </div>
        );
      })()}

      {/* Header Banner */}
      <div className={`transition-colors duration-300 ${isDark ? 'bg-gradient-to-r from-amber-950/80 via-slate-900 to-slate-900 border-amber-800/60' : 'bg-gradient-to-r from-amber-500/10 via-indigo-500/5 to-white border-amber-200 shadow-sm'} border p-5 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4`}>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-500 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[11px] font-bold tracking-wider uppercase bg-amber-500/20 text-amber-400 border border-amber-500/30">
                Executive Platform Dashboard
              </span>
              <span className="text-xs text-slate-400 font-mono">Real-Time Firestore Sync</span>
            </div>
            <h1 className="text-lg font-bold mt-0.5">Multi-Tenant Platform Control Plane</h1>
            <p className="text-xs text-slate-400">Live monitoring for tenant enterprises (T-APEX, T-SHIELD, T-GARUDA), aggregated manpower, and global approvals.</p>
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
            <span className="text-xs font-medium">Tenant Enterprises</span>
            <Building2 className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-2xl font-black text-indigo-400">{stats.totalCompanies}</div>
          <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1 flex-wrap">
            <span className="text-emerald-400 font-bold">{stats.activeCompanies} Active</span>
            {stats.suspendedCompanies > 0 && <span className="text-rose-400 font-bold">• {stats.suspendedCompanies} Susp</span>}
            {stats.trialExpiredCompanies > 0 && <span className="text-orange-400 font-bold">• {stats.trialExpiredCompanies} Exp</span>}
            {stats.pendingCompanies > 0 && <span className="text-amber-400 font-bold">• {stats.pendingCompanies} Pend</span>}
          </p>
        </div>

        <div 
          onClick={() => onNavigate('SUPER_ADMIN_COMPANIES')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer hover:border-emerald-500/50 ${isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}
        >
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Global Workforce</span>
            <Users className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-emerald-400">{stats.totalUsers}</div>
          <p className="text-[11px] text-slate-400 mt-1 truncate">
            <span className="text-emerald-400 font-bold">{stats.activeUsers} Active</span> • {stats.totalGuards} Guards • {stats.totalStaff} Staff
          </p>
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
          <p className="text-[11px] text-slate-400 mt-1">Registration queue items</p>
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

      {/* Tenant Organizations Directory Table with Real-time Status Control */}
      <div className={`p-5 rounded-2xl border transition-colors duration-300 ${isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200 shadow-sm'} space-y-4`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold flex items-center gap-2">
              <Building2 className="w-4 h-4 text-indigo-500" />
              <span>Active Organizations Directory (Live Firestore View)</span>
            </h2>
            <p className="text-xs text-slate-400">Live tenant licensing, status toggles (Active / Suspended / Expired), and 150-manpower verification.</p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Status Filter Pills */}
            <div className={`flex items-center p-1 rounded-xl border text-[11px] font-semibold ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-100 border-slate-200'}`}>
              {(['ALL', 'ACTIVE', 'SUSPENDED', 'EXPIRED', 'PENDING'] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-2.5 py-1 rounded-lg transition ${
                    statusFilter === st
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {st === 'ALL' ? `All (${companies.length})` : st === 'ACTIVE' ? `Active (${stats.activeCompanies})` : st === 'SUSPENDED' ? `Susp (${stats.suspendedCompanies})` : st === 'EXPIRED' ? `Exp (${stats.trialExpiredCompanies})` : `Pend (${stats.pendingCompanies})`}
                </button>
              ))}
            </div>

            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search name or code..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`pl-8 pr-3 py-1.5 rounded-xl text-xs border outline-none transition ${
                  isDark ? 'bg-slate-950 border-slate-800 text-slate-200 focus:border-amber-500' : 'bg-slate-50 border-slate-200 text-black focus:border-amber-500'
                }`}
              />
            </div>
            <button
              onClick={() => onNavigate('SUPER_ADMIN_COMPANIES')}
              className="text-xs font-semibold text-indigo-500 hover:underline flex items-center gap-1 shrink-0"
            >
              Full Directory <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center text-slate-400 space-y-2">
            <RefreshCw className="w-6 h-6 animate-spin text-amber-500" />
            <p className="text-xs">Loading live tenant organizations...</p>
          </div>
        ) : filteredCompanies.length === 0 ? (
          <div className="py-12 text-center text-slate-400 space-y-2">
            <Building2 className="w-10 h-10 mx-auto text-slate-600" />
            <p className="text-xs font-medium">No organizations matching "{searchTerm}" ({statusFilter})</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className={`border-b ${isDark ? 'border-slate-800 text-slate-400' : 'border-slate-200 text-slate-600'} font-semibold`}>
                  <th className="py-2.5 px-3">Organization</th>
                  <th className="py-2.5 px-3">Company Code</th>
                  <th className="py-2.5 px-3">Plan Tier</th>
                  <th className="py-2.5 px-3">Live Status</th>
                  <th className="py-2.5 px-3">Quick Status Switcher</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {paginatedCompanies.map((c) => {
                  const isUpdating = updatingCompanyId === c.companyId;
                  const currentStatus = (c.status || 'ACTIVE').toUpperCase();
                  return (
                    <tr key={c.companyId} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                      <td className="py-3 px-3">
                        <div>
                          <p className="font-bold text-slate-900 dark:text-slate-100">{c.brandName || c.companyLegalName}</p>
                          {c.companyLegalName && c.companyLegalName !== c.brandName && (
                            <p className="text-[11px] text-slate-400 truncate max-w-xs">{c.companyLegalName}</p>
                          )}
                          <p className="text-[10px] text-indigo-400 font-mono mt-0.5">Admin: {c.adminEmail || 'admin@' + c.companyId.toLowerCase() + '.in'}</p>
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
                      <td className="py-3 px-3">
                        <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border inline-flex items-center gap-1.5 ${
                          currentStatus === 'ACTIVE'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                            : currentStatus === 'SUSPENDED'
                            ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                            : currentStatus === 'PENDING'
                            ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                            : 'bg-orange-500/10 text-orange-400 border-orange-500/20'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            currentStatus === 'ACTIVE' ? 'bg-emerald-400 animate-pulse' : currentStatus === 'SUSPENDED' ? 'bg-rose-400' : 'bg-amber-400'
                          }`} />
                          {currentStatus === 'TRIAL_EXPIRED' ? 'EXPIRED' : currentStatus}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1">
                          <button
                            disabled={isUpdating || currentStatus === 'ACTIVE'}
                            onClick={() => handleUpdateCompanyStatus(c.companyId, 'ACTIVE')}
                            title="Set Active"
                            className={`px-2 py-1 rounded text-[10px] font-bold transition ${
                              currentStatus === 'ACTIVE'
                                ? 'bg-emerald-600 text-white shadow-xs opacity-60 cursor-default'
                                : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20'
                            }`}
                          >
                            Active
                          </button>
                          <button
                            disabled={isUpdating || currentStatus === 'SUSPENDED'}
                            onClick={() => handleUpdateCompanyStatus(c.companyId, 'SUSPENDED')}
                            title="Suspend Tenant"
                            className={`px-2 py-1 rounded text-[10px] font-bold transition ${
                              currentStatus === 'SUSPENDED'
                                ? 'bg-rose-600 text-white shadow-xs opacity-60 cursor-default'
                                : 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20'
                            }`}
                          >
                            Suspend
                          </button>
                          <button
                            disabled={isUpdating || currentStatus === 'TRIAL_EXPIRED' || currentStatus === 'EXPIRED'}
                            onClick={() => handleUpdateCompanyStatus(c.companyId, 'EXPIRED')}
                            title="Set Trial Expired"
                            className={`px-2 py-1 rounded text-[10px] font-bold transition ${
                              currentStatus === 'TRIAL_EXPIRED' || currentStatus === 'EXPIRED'
                                ? 'bg-orange-600 text-white shadow-xs opacity-60 cursor-default'
                                : 'bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 border border-orange-500/20'
                            }`}
                          >
                            Expire
                          </button>
                          {isUpdating && <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-500 ml-1" />}
                        </div>
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
                  );
                })}
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

      {/* Platform Alerts & Pending Approvals Queue */}
      <div className={`p-5 rounded-2xl border transition-colors duration-300 ${isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200 shadow-sm'} space-y-4`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <span>Pending Tenant & User Registration Approvals Queue</span>
            </h2>
            <p className="text-xs text-slate-400">Live approvals stream from Firestore (`approval_requests`).</p>
          </div>
          <button
            onClick={() => onNavigate('SUPER_ADMIN_PENDING_APPROVALS')}
            className="text-xs font-semibold text-amber-500 hover:text-amber-400 transition flex items-center gap-1"
          >
            Review All In Inbox ({pendingRequests.length}) <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center text-slate-400 space-y-2">
            <RefreshCw className="w-6 h-6 animate-spin text-amber-500" />
            <p className="text-xs">Loading platform alerts...</p>
          </div>
        ) : pendingRequests.length === 0 ? (
          <div className="py-8 text-center text-slate-400 space-y-2 border border-dashed border-slate-800 rounded-xl">
            <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-500/60" />
            <p className="text-xs font-medium">All clear! No pending registration approvals in queue.</p>
            <p className="text-[11px] text-slate-500">When new employees register, they appear here in real-time for Super Admin / Tenant Admin review.</p>
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
                    <p className="text-[11px] text-slate-400">
                      Requested to join <span className="font-mono text-amber-400 font-semibold">{req.companyId}</span> as <span className="font-semibold text-slate-300">{req.requestedRole || 'EMPLOYEE'}</span>
                    </p>
                    <p className="text-[10px] text-slate-500">Email: {req.email} • Mobile: {req.mobileNumber || 'N/A'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onNavigate('SUPER_ADMIN_PENDING_APPROVALS')}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-600 hover:bg-amber-500 text-white transition flex items-center gap-1"
                  >
                    <span>Review</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
            {pendingRequests.length > 5 && (
              <p className="text-center text-xs text-slate-400 pt-2">
                + {pendingRequests.length - 5} more pending requests in queue
              </p>
            )}
          </div>
        )}
      </div>

    </div>
  );
};


