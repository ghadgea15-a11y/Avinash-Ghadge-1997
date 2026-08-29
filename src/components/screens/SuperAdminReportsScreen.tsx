import React, { useState, useEffect } from 'react';
import { 
  FileBarChart, 
  ArrowLeft, 
  RefreshCw, 
  Download, 
  Building2, 
  Users, 
  DollarSign, 
  Layers, 
  TrendingUp, 
  PieChart, 
  Calendar,
  CheckCircle2,
  FileSpreadsheet
} from 'lucide-react';
import { UserSession, PhaseAScreen } from '../../types';
import { TenantData, SubscriptionPlan } from '../../types/platform';
import { SuperAdminService } from '../../services/superAdminService';
import { useTheme } from '../../context/ThemeContext';
import { useFeedback } from '../../context/ActionFeedbackContext';

interface SuperAdminReportsScreenProps {
  currentSession: UserSession;
  onNavigate: (screen: PhaseAScreen) => void;
}

export const SuperAdminReportsScreen: React.FC<SuperAdminReportsScreenProps> = ({
  currentSession,
  onNavigate
}) => {
  const { isDark } = useTheme();
  const { showSuccess, showError } = useFeedback();

  const [tenants, setTenants] = useState<TenantData[]>([]);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [tenantsData, plansData] = await Promise.all([
        SuperAdminService.getAllTenants(),
        SuperAdminService.getSubscriptionPlans()
      ]);
      setTenants(tenantsData);
      setPlans(plansData);
    } catch (err) {
      console.error('[SuperAdminReportsScreen] Failed to load reports data:', err);
      showError('Failed to load platform SaaS metrics');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const totalTenants = tenants.length;
  const activeTenants = tenants.filter(t => t.status === 'ACTIVE').length;
  const totalEmployees = tenants.reduce((sum, t) => sum + (t.currentEmployeesCount || 0), 0);
  const totalSites = tenants.reduce((sum, t) => sum + (t.currentSitesCount || 0), 0);

  // Group tenants by plan
  const planDistribution: { [key: string]: number } = {};
  tenants.forEach(t => {
    const plan = t.subscriptionPlan || 'TRIAL';
    planDistribution[plan] = (planDistribution[plan] || 0) + 1;
  });

  const handleExportSummaryCsv = () => {
    const exportData = tenants.map(t => ({
      TenantID: t.id,
      CompanyName: t.name,
      Status: t.status,
      Plan: t.subscriptionPlan,
      EmployeesCount: t.currentEmployeesCount || 0,
      SitesCount: t.currentSitesCount || 0,
      CreatedAt: t.createdAt,
      CompanyCode: t.companyCode || ''
    }));
    SuperAdminService.exportToCsv('saas_platform_tenants_summary', exportData);
    showSuccess('Exported SaaS platform summary report');
  };

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
            <ArrowLeft className="w-5 h-5 text-slate-400" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight">Platform SaaS Analytics & Executive BI</h1>
              <span className="bg-indigo-500/10 text-indigo-500 text-xs font-semibold px-2.5 py-0.5 rounded-full border border-indigo-500/20">
                Cross-Tenant Intelligence
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              High-level SaaS business metrics, tier adoption, active workforce volume and capacity utilization.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportSummaryCsv}
            className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl border transition ${
              isDark ? 'bg-slate-900 border-slate-800 hover:bg-slate-800 text-slate-200' : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-500" />
            <span>Export Executive BI (CSV)</span>
          </button>
          <button
            onClick={() => {
              setRefreshing(true);
              loadData();
            }}
            disabled={refreshing || loading}
            className={`p-2 rounded-xl border transition ${
              isDark ? 'bg-slate-900 border-slate-800 hover:bg-slate-800' : 'bg-white border-slate-200 hover:bg-slate-50'
            }`}
          >
            <RefreshCw className={`w-4 h-4 text-slate-400 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div className={`p-4 rounded-2xl border ${isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-sm'} space-y-1`}>
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Total SaaS Tenants</span>
            <Building2 className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-2xl font-bold font-mono text-indigo-500">{totalTenants}</div>
          <span className="text-[11px] text-emerald-500 font-medium">{activeTenants} active contracts</span>
        </div>

        <div className={`p-4 rounded-2xl border ${isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-sm'} space-y-1`}>
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Managed Workforce</span>
            <Users className="w-4 h-4 text-cyan-500" />
          </div>
          <div className="text-2xl font-bold font-mono text-cyan-500">{totalEmployees.toLocaleString()}</div>
          <span className="text-[11px] text-slate-400">Total registered personnel</span>
        </div>

        <div className={`p-4 rounded-2xl border ${isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-sm'} space-y-1`}>
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Operational Sites / Hubs</span>
            <Layers className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold font-mono text-amber-500">{totalSites}</div>
          <span className="text-[11px] text-slate-400">Active geofenced locations</span>
        </div>

        <div className={`p-4 rounded-2xl border ${isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-sm'} space-y-1`}>
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Active Tier Catalog</span>
            <TrendingUp className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-500">{plans.length}</div>
          <span className="text-[11px] text-slate-400">SaaS subscription packages</span>
        </div>

      </div>

      {/* Plan Adoption Breakdown & Top Tenants */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Plan Breakdown */}
        <div className={`p-5 rounded-2xl border ${isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-sm'} space-y-4`}>
          <h3 className="font-bold text-sm flex items-center gap-2">
            <PieChart className="w-4 h-4 text-indigo-500" />
            Subscription Tier Distribution
          </h3>

          <div className="space-y-3 text-xs">
            {Object.entries(planDistribution).map(([planName, count]) => {
              const pct = totalTenants > 0 ? Math.round((count / totalTenants) * 100) : 0;
              return (
                <div key={planName} className="space-y-1.5">
                  <div className="flex justify-between font-semibold">
                    <span>{planName}</span>
                    <span className="text-slate-400">{count} tenants ({pct}%)</span>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div className="bg-indigo-500 h-full rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top Active Tenants Table */}
        <div className={`lg:col-span-2 p-5 rounded-2xl border ${isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-sm'} space-y-4`}>
          <h3 className="font-bold text-sm flex items-center gap-2">
            <Building2 className="w-4 h-4 text-cyan-500" />
            Top Enterprise Workspaces by Workforce Volume
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className={`border-b ${isDark ? 'bg-slate-950/60 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-600'} font-semibold`}>
                <tr>
                  <th className="py-2.5 px-3">Company</th>
                  <th className="py-2.5 px-3">Plan</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Workforce</th>
                  <th className="py-2.5 px-3">Sites</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${isDark ? 'divide-slate-800/60 text-slate-300' : 'divide-slate-100 text-slate-700'}`}>
                {tenants
                  .slice()
                  .sort((a, b) => (b.currentEmployeesCount || 0) - (a.currentEmployeesCount || 0))
                  .slice(0, 5)
                  .map(t => (
                    <tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="py-3 px-3 font-bold flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-slate-400" />
                        <span>{t.name}</span>
                      </td>
                      <td className="py-3 px-3 font-mono text-[11px]">{t.subscriptionPlan}</td>
                      <td className="py-3 px-3">
                        <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          t.status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'
                        }`}>
                          {t.status}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-mono font-bold">{t.currentEmployeesCount || 0}</td>
                      <td className="py-3 px-3 font-mono">{t.currentSitesCount || 0}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>

    </div>
  );
};
