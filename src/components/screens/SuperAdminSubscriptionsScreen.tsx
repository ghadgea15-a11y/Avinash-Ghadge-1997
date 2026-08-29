import React, { useState, useEffect } from 'react';
import { 
  CreditCard, TrendingUp, AlertTriangle, XCircle, 
  CheckCircle2, PlusCircle, Activity, Building2, ChevronLeft, RefreshCw,
  Search, Edit3, ShieldCheck, Check, Calendar, ArrowRight, X, Sparkles, Sliders
} from 'lucide-react';
import { UserSession, PhaseAScreen, SubscriptionPlan, CompanySubscription, CompanyTenant, MASTER_APP_MODULES } from '../../types';
import { SubscriptionService } from '../../services/subscriptionService';
import { FirestoreService } from '../../services/firestoreService';
import { useTheme } from '../../context/ThemeContext';
import { useFeedback } from '../../context/ActionFeedbackContext';

interface SuperAdminSubscriptionsScreenProps {
  userSession: UserSession;
  onNavigate: (screen: PhaseAScreen) => void;
}

interface CompanySubItem {
  companyId: string;
  companyName: string;
  subscription: CompanySubscription | null;
}

export const SuperAdminSubscriptionsScreen: React.FC<SuperAdminSubscriptionsScreenProps> = ({
  userSession,
  onNavigate
}) => {
  const { isDark } = useTheme();
  const { showSuccess, showError, showLoading, showCancelled, showValidationFailed, handleError } = useFeedback();
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [companySubs, setCompanySubs] = useState<CompanySubItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Selected Tenant for Plan Assignment / Status Update Modal
  const [selectedTenant, setSelectedTenant] = useState<CompanySubItem | null>(null);
  const [targetPlanId, setTargetPlanId] = useState<string>('PLAN_PRO');
  const [billingCycle, setBillingCycle] = useState<'MONTHLY' | 'YEARLY'>('MONTHLY');
  const [durationMonths, setDurationMonths] = useState<number>(12);
  const [subStatus, setSubStatus] = useState<'ACTIVE' | 'TRIAL' | 'PAST_DUE' | 'SUSPENDED' | 'GRACE_PERIOD'>('ACTIVE');
  const [isUpdatingSub, setIsUpdatingSub] = useState(false);
  const [proratedCredit, setProratedCredit] = useState<number>(0);

  useEffect(() => {
    if (selectedTenant?.subscription && selectedTenant.subscription.status === 'ACTIVE') {
      const currentPlan = plans.find(p => p.planId === selectedTenant.subscription?.planId);
      if (currentPlan) {
        const credit = SubscriptionService.calculateProratedCredit(selectedTenant.subscription, currentPlan);
        setProratedCredit(credit);
      } else {
        setProratedCredit(0);
      }
    } else {
      setProratedCredit(0);
    }
  }, [selectedTenant, targetPlanId, billingCycle, plans]);

  // New Plan Creation Modal
  const [showCreatePlanModal, setShowCreatePlanModal] = useState(false);
  const [newPlan, setNewPlan] = useState<Partial<SubscriptionPlan>>({
    planCode: '',
    planName: '',
    description: '',
    monthlyPrice: 1999,
    yearlyPrice: 19990,
    employeeLimit: 100,
    userLimit: 3,
    storageLimitMB: 2048,
    enabledModules: ['EMPLOYEES', 'ATTENDANCE', 'REPORTS']
  });

  // Real Calculated Stats
  const [stats, setStats] = useState({
    active: 0,
    trial: 0,
    expiring: 0,
    monthlyRevenue: 0,
    totalTenants: 0
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [fetchedPlans, allCompanies] = await Promise.all([
        SubscriptionService.getAllPlans(),
        FirestoreService.getAllCompanies()
      ]);
      setPlans(fetchedPlans);

      const subsData = await SubscriptionService.getAllCompanySubscriptions(allCompanies);
      setCompanySubs(subsData);

      let activeCount = 0;
      let trialCount = 0;
      let expiringCount = 0;
      let monthlyRev = 0;

      const now = new Date().getTime();

      const planMap = new Map<string, SubscriptionPlan>();
      fetchedPlans.forEach(p => planMap.set(p.planId, p));

      subsData.forEach(item => {
        if (item.subscription) {
          const sub = item.subscription;
          const plan = planMap.get(sub.planId);
          const monthlyPrice = plan?.monthlyPrice || 0;
          if (sub.status === 'ACTIVE') {
            activeCount++;
            monthlyRev += (sub.billingCycle === 'MONTHLY' ? monthlyPrice : Math.round((plan?.yearlyPrice || monthlyPrice * 10) / 12));
          } else if (sub.status === 'TRIAL') {
            trialCount++;
          }
          if (sub.currentPeriodEnd) {
            const endDate = new Date(sub.currentPeriodEnd).getTime();
            const daysLeft = (endDate - now) / (1000 * 60 * 60 * 24);
            if (daysLeft >= 0 && daysLeft <= 7) {
              expiringCount++;
            }
          }
        }
      });

      setStats({
        active: activeCount,
        trial: trialCount,
        expiring: expiringCount,
        monthlyRevenue: monthlyRev,
        totalTenants: allCompanies.length
      });
    } catch (err) {
      console.error('[SuperAdminSubscriptionsScreen] Error fetching data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const createDefaultPlans = async () => {
    try {
      await Promise.all([
        FirestoreService.saveSubscriptionPlan({
          planId: 'PLAN_STARTER',
          planCode: 'STARTER',
          planName: 'Starter',
          name: 'Starter',
          description: 'For small security agencies with basic muster tracking.',
          status: 'ACTIVE',
          billingCycle: 'MONTHLY',
          monthlyPrice: 999,
          yearlyPrice: 9990,
          currency: 'INR',
          employeeLimit: 50,
          userLimit: 2,
          storageLimitMB: 1024,
          enabledModules: ['EMPLOYEES', 'ATTENDANCE', 'REPORTS'],
          trialEligible: true,
          trialDays: 14,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }),
        FirestoreService.saveSubscriptionPlan({
          planId: 'PLAN_PRO',
          planCode: 'PRO',
          planName: 'Professional',
          name: 'Professional',
          description: 'For growing businesses with multiple sites and advanced muster.',
          status: 'ACTIVE',
          billingCycle: 'MONTHLY',
          monthlyPrice: 2999,
          yearlyPrice: 29990,
          currency: 'INR',
          employeeLimit: 250,
          userLimit: 5,
          storageLimitMB: 5120,
          enabledModules: ['EMPLOYEES', 'ATTENDANCE', 'SHIFTS', 'LEAVE', 'PAYROLL', 'REPORTS', 'ANALYTICS', 'GUARD_PATROL'],
          trialEligible: true,
          trialDays: 14,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }),
        FirestoreService.saveSubscriptionPlan({
          planId: 'PLAN_ENTERPRISE',
          planCode: 'ENTERPRISE',
          planName: 'Enterprise Elite',
          name: 'Enterprise Elite',
          description: 'Complete multi-branch security operations with AI OCR, GPS muster, and full RBAC.',
          status: 'ACTIVE',
          billingCycle: 'MONTHLY',
          monthlyPrice: 7999,
          yearlyPrice: 79990,
          currency: 'INR',
          employeeLimit: 2000,
          userLimit: 25,
          storageLimitMB: 51200,
          enabledModules: ['EMPLOYEES', 'ATTENDANCE', 'SHIFTS', 'LEAVE', 'PAYROLL', 'REPORTS', 'ANALYTICS', 'GUARD_PATROL', 'INCIDENTS', 'VISITORS', 'MATERIALS'],
          trialEligible: true,
          trialDays: 30,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        })
      ]);
      showSuccess('✅ Default Plans Created Successfully');
      fetchData();
    } catch (e) {
      handleError(e, '✕ Creation Failed');
    }
  };

  const handleOpenAssignModal = (item: CompanySubItem) => {
    setSelectedTenant(item);
    const planId = item.subscription?.planId || plans[0]?.planId || 'PLAN_PRO';
    setTargetPlanId(planId);
    setBillingCycle((item.subscription?.billingCycle as any) || 'MONTHLY');
    setSubStatus((item.subscription?.status as any) || 'ACTIVE');
    setDurationMonths(12);

    // Calculate initial pro-rated credit if active sub exists
    if (item.subscription && item.subscription.status === 'ACTIVE') {
      const currentPlan = plans.find(p => p.planId === item.subscription?.planId);
      if (currentPlan) {
        const credit = SubscriptionService.calculateProratedCredit(item.subscription, currentPlan);
        setProratedCredit(credit);
      } else {
        setProratedCredit(0);
      }
    } else {
      setProratedCredit(0);
    }
  };

  const handleCancelAssign = () => {
    setSelectedTenant(null);
    showCancelled('🚫 Cancelled');
  };

  const handleCancelCreatePlan = () => {
    setShowCreatePlanModal(false);
    showCancelled('🚫 Cancelled');
  };

  const handleSaveSubscription = async () => {
    if (!selectedTenant || isUpdatingSub) return;
    setIsUpdatingSub(true);
    const dismiss = showLoading('Updating SaaS subscription...');
    try {
      let newSub;
      
      // Use advanced upgrade/downgrade logic if it's an existing active sub being changed
      if (selectedTenant.subscription && selectedTenant.subscription.status === 'ACTIVE' && 
          (selectedTenant.subscription.planId !== targetPlanId || selectedTenant.subscription.billingCycle !== billingCycle)) {
        newSub = await SubscriptionService.upgradeDowngradeSubscription(
          selectedTenant.companyId,
          targetPlanId,
          billingCycle,
          userSession.userId
        );
      } else {
        // Fallback for new assignments or simple status updates
        newSub = await SubscriptionService.assignPlanToCompany(
          selectedTenant.companyId,
          targetPlanId,
          billingCycle,
          durationMonths,
          userSession.userId
        );
      }

      // 2. If status was changed from ACTIVE, update status
      if (subStatus !== 'ACTIVE') {
        await SubscriptionService.updateCompanySubscriptionStatus(
          selectedTenant.companyId,
          newSub.subscriptionId,
          subStatus as any
        );
      }

      dismiss();
      showSuccess(`✓ Successfully Updated SaaS subscription for ${selectedTenant.companyName}`);
      setSelectedTenant(null);
      fetchData();
    } catch (err: any) {
      dismiss();
      console.error('Error assigning subscription:', err);
      handleError(err, '✕ Update Failed');
    } finally {
      setIsUpdatingSub(false);
    }
  };

  const handleCreateCustomPlan = async () => {
    if (!newPlan.planCode || !newPlan.planName) {
      showValidationFailed('Plan Code and Plan Name are required.');
      return;
    }
    const dismiss = showLoading('Creating custom subscription plan...');
    try {
      const pId = `PLAN_${newPlan.planCode.toUpperCase().replace(/[^A-Z0-9]/g, '_')}`;
      const planToSave: SubscriptionPlan = {
        planId: pId,
        planCode: newPlan.planCode.toUpperCase(),
        planName: newPlan.planName,
        name: newPlan.planName,
        description: newPlan.description || '',
        status: 'ACTIVE',
        billingCycle: 'MONTHLY',
        monthlyPrice: Number(newPlan.monthlyPrice) || 0,
        yearlyPrice: Number(newPlan.yearlyPrice) || 0,
        currency: 'INR',
        employeeLimit: Number(newPlan.employeeLimit) || 50,
        userLimit: Number(newPlan.userLimit) || 2,
        storageLimitMB: Number(newPlan.storageLimitMB) || 1024,
        enabledModules: newPlan.enabledModules || ['EMPLOYEES', 'ATTENDANCE'],
        trialEligible: true,
        trialDays: 14,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      await FirestoreService.saveSubscriptionPlan(planToSave);
      dismiss();
      showSuccess('✅ Subscription Plan Created');
      setShowCreatePlanModal(false);
      fetchData();
    } catch (err) {
      handleError(err, '✕ Creation Failed');
    }
  };

  const filteredSubs = companySubs.filter(item => 
    item.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.companyId.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className={`min-h-screen ${isDark ? 'bg-slate-950 text-slate-200' : 'bg-white text-black'}`}>
      <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => onNavigate('SUPER_ADMIN_DASHBOARD')}
              className={`p-2.5 rounded-xl border transition ${isDark ? 'bg-slate-900 border-slate-800 hover:bg-slate-800' : 'bg-white border-slate-200 hover:bg-slate-100'}`}
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold">SaaS Subscriptions & Billing</h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  Super Admin
                </span>
              </div>
              <p className="text-sm opacity-60">Manage tenant licenses, plan pricing tiers, quotas, and ARR metrics.</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowCreatePlanModal(true)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 shadow transition"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Create Custom Plan</span>
            </button>

            <button
              onClick={() => { setRefreshing(true); fetchData(); }}
              disabled={refreshing}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 border transition ${
                isDark 
                  ? 'bg-slate-900 border-slate-800 hover:bg-slate-800 text-slate-200' 
                  : 'bg-white border-slate-200 hover:bg-slate-100 text-black shadow-sm'
              }`}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-indigo-500' : ''}`} />
              <span>Sync Firestore</span>
            </button>
          </div>
        </div>

        {/* Overview Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          <div className={`p-4 rounded-2xl border ${isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-medium opacity-60">Active Subscriptions</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="text-2xl font-bold">{stats.active}</div>
          </div>
          
          <div className={`p-4 rounded-2xl border ${isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-medium opacity-60">Trial Tenants</span>
              <Activity className="w-4 h-4 text-amber-500" />
            </div>
            <div className="text-2xl font-bold">{stats.trial}</div>
          </div>

          <div className={`p-4 rounded-2xl border ${isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-medium opacity-60">Expiring (7 Days)</span>
              <AlertTriangle className="w-4 h-4 text-orange-500" />
            </div>
            <div className="text-2xl font-bold">{stats.expiring}</div>
          </div>

          <div className={`p-4 rounded-2xl border ${isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-medium opacity-60">Monthly ARR</span>
              <TrendingUp className="w-4 h-4 text-indigo-500" />
            </div>
            <div className="text-2xl font-bold">₹{stats.monthlyRevenue.toLocaleString()}</div>
          </div>
          
          <div className={`p-4 rounded-2xl border ${isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-medium opacity-60">Total Registered Tenants</span>
              <Building2 className="w-4 h-4 text-indigo-400" />
            </div>
            <div className="text-2xl font-bold">{stats.totalTenants}</div>
          </div>
        </div>

        {/* Plans Management */}
        <div className={`rounded-2xl border overflow-hidden ${isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
          <div className={`px-6 py-4 flex justify-between items-center border-b ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
            <div>
              <h2 className="font-bold flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-indigo-500" />
                Available SaaS Plans & Tiers
              </h2>
              <p className="text-xs opacity-60">Defines feature modules, seat capacities, and subscription prices.</p>
            </div>
            <div className="flex gap-2">
              {plans.length === 0 && (
                <button 
                  onClick={createDefaultPlans}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg transition shadow"
                >
                  Seed Standard SaaS Plans
                </button>
              )}
            </div>
          </div>
          
          <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
            {plans.map(plan => (
              <div key={plan.planId} className={`p-5 rounded-2xl border relative flex flex-col justify-between ${isDark ? 'bg-slate-800/60 border-slate-700' : 'bg-white border-slate-200'}`}>
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-indigo-500 block">
                        {plan.planCode}
                      </span>
                      <h3 className="font-bold text-lg">{plan.planName}</h3>
                    </div>
                    <span className={`px-2.5 py-0.5 text-[10px] font-bold rounded-full ${plan.status === 'ACTIVE' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white0/20 text-slate-400'}`}>
                      {plan.status}
                    </span>
                  </div>

                  <p className="text-xs opacity-60 mb-4 h-8 overflow-hidden">{plan.description}</p>
                  
                  <div className="mb-4">
                    <div className="text-3xl font-black">
                      ₹{plan.monthlyPrice}<span className="text-xs opacity-50 font-medium">/mo</span>
                    </div>
                    <div className="text-xs opacity-60">₹{plan.yearlyPrice}/yr billed annually</div>
                  </div>

                  <ul className="space-y-2 mb-6 text-xs opacity-80">
                    <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> Up to <b>{plan.employeeLimit}</b> employees</li>
                    <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> <b>{plan.userLimit}</b> Admin users</li>
                    <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> <b>{Math.round(plan.storageLimitMB / 1024)} GB</b> cloud storage</li>
                    <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> <b>{plan.enabledModules.length}</b> Modules Enabled</li>
                  </ul>
                </div>

                <div className="pt-3 border-t border-slate-700/50 flex justify-between items-center text-[10px] opacity-60">
                  <span>Trial: {plan.trialDays || 14} days</span>
                  <span>ID: {plan.planId}</span>
                </div>
              </div>
            ))}
            
            {plans.length === 0 && !loading && (
              <div className="col-span-3 text-center py-12 opacity-60">
                <p>No plans seeded in database yet. Click "Seed Standard SaaS Plans" above to initialize.</p>
              </div>
            )}
          </div>
        </div>

        {/* Company Subscriptions Table */}
        <div className={`rounded-2xl border overflow-hidden ${isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
          <div className={`px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
            <div>
              <h2 className="font-bold flex items-center gap-2">
                <Building2 className="w-5 h-5 text-amber-500" />
                Live Tenant Subscriptions & Entitlements
              </h2>
              <p className="text-xs opacity-60">Assign plans, change statuses, and adjust expiration dates in real time.</p>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 opacity-40" />
              <input
                type="text"
                placeholder="Search tenant or code..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border outline-none ${
                  isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-black'
                }`}
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className={`${isDark ? 'bg-slate-800/50' : 'bg-white'}`}>
                <tr>
                  <th className="px-6 py-3 font-medium opacity-60">Company</th>
                  <th className="px-6 py-3 font-medium opacity-60">Plan Tier</th>
                  <th className="px-6 py-3 font-medium opacity-60">Status</th>
                  <th className="px-6 py-3 font-medium opacity-60">Renewal Date</th>
                  <th className="px-6 py-3 font-medium opacity-60">Capacity</th>
                  <th className="px-6 py-3 font-medium opacity-60 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${isDark ? 'divide-slate-800' : 'divide-slate-100'}`}>
                {filteredSubs.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-slate-400">
                      No tenant companies found.
                    </td>
                  </tr>
                )}
                {filteredSubs.map(item => {
                  const currentPlan = plans.find(p => p.planId === item.subscription?.planId);
                  return (
                    <tr key={item.companyId} className="hover:bg-indigo-500/5 transition">
                      <td className="px-6 py-4 font-medium">
                        <div>
                          <span className="font-bold text-slate-200">{item.companyName}</span>
                          <span className="block text-xs font-mono text-slate-400">{item.companyId}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-semibold text-xs text-indigo-400">
                          {currentPlan?.planName || item.subscription?.planId.replace('PLAN_', '') || 'Starter Tier'}
                        </span>
                        <span className="block text-[10px] opacity-60">
                          {item.subscription?.billingCycle || 'MONTHLY'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          item.subscription?.status === 'ACTIVE' 
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                            : item.subscription?.status === 'TRIAL'
                              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                              : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        }`}>
                          {item.subscription?.status || 'ACTIVE'}
                        </span>
                      </td>
                      <td className="px-6 py-4 opacity-80 text-xs">
                        {item.subscription?.currentPeriodEnd 
                          ? new Date(item.subscription.currentPeriodEnd).toLocaleDateString() 
                          : 'Ongoing'}
                      </td>
                      <td className="px-6 py-4 text-xs opacity-70">
                        {item.subscription?.employeeLimit || currentPlan?.employeeLimit || 50} Emps / {item.subscription?.userLimit || currentPlan?.userLimit || 2} Admins
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => handleOpenAssignModal(item)}
                          className="px-3 py-1.5 bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white rounded-lg text-xs font-semibold transition flex items-center gap-1 ml-auto"
                        >
                          <Edit3 className="w-3 h-3" />
                          <span>Change Plan</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* Modal: Change / Assign Subscription */}
      {selectedTenant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className={`w-full max-w-lg rounded-2xl border p-6 space-y-5 ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'} shadow-2xl`}>
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-bold text-lg flex items-center gap-2">
                  <Sliders className="w-5 h-5 text-indigo-500" />
                  Assign SaaS Subscription
                </h3>
                <p className="text-xs opacity-60">Tenant: <span className="font-bold text-slate-200">{selectedTenant.companyName}</span> ({selectedTenant.companyId})</p>
              </div>
              <button 
                onClick={() => setSelectedTenant(null)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-bold mb-1.5">Select SaaS Plan</label>
                <select
                  value={targetPlanId}
                  onChange={(e) => setTargetPlanId(e.target.value)}
                  className={`w-full p-2.5 rounded-xl border outline-none font-semibold ${isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200'}`}
                >
                  {plans.map(p => (
                    <option key={p.planId} value={p.planId}>
                      {p.planName} (₹{p.monthlyPrice}/mo, Max {p.employeeLimit} emps, {p.enabledModules.length} mods)
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold mb-1.5">Billing Cycle</label>
                  <select
                    value={billingCycle}
                    onChange={(e) => setBillingCycle(e.target.value as any)}
                    className={`w-full p-2.5 rounded-xl border outline-none ${isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200'}`}
                  >
                    <option value="MONTHLY">Monthly</option>
                    <option value="YEARLY">Yearly</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold mb-1.5">Duration (Months)</label>
                  <select
                    value={durationMonths}
                    onChange={(e) => setDurationMonths(Number(e.target.value))}
                    className={`w-full p-2.5 rounded-xl border outline-none ${isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200'}`}
                  >
                    <option value={1}>1 Month</option>
                    <option value={3}>3 Months</option>
                    <option value={6}>6 Months</option>
                    <option value={12}>12 Months (1 Year)</option>
                    <option value={36}>36 Months (3 Years)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold mb-1.5">Subscription Status</label>
                <select
                  value={subStatus}
                  onChange={(e) => setSubStatus(e.target.value as any)}
                  className={`w-full p-2.5 rounded-xl border outline-none ${isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200'}`}
                >
                  <option value="ACTIVE">ACTIVE (Full access)</option>
                  <option value="TRIAL">TRIAL (Evaluation)</option>
                  <option value="GRACE_PERIOD">GRACE_PERIOD</option>
                  <option value="PAST_DUE">PAST_DUE</option>
                  <option value="SUSPENDED">SUSPENDED</option>
                </select>
              </div>

              <div className={`p-3.5 rounded-xl border text-[11px] leading-relaxed ${isDark ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-300' : 'bg-indigo-50 border-indigo-100 text-indigo-800'}`}>
                <Sparkles className="w-4 h-4 text-indigo-400 inline mr-1" />
                <b>Real-Time Synchronization:</b> Saving will automatically update the company's tier quotas and refresh Firestore module entitlements for all company admins and staff immediately.
                {proratedCredit > 0 && (
                  <div className="mt-2 pt-2 border-t border-indigo-500/20">
                    <span className="font-bold">Calculated Pro-rated Credit: </span>
                    <span className="text-emerald-500 font-bold">₹{proratedCredit.toLocaleString()}</span>
                    <p className="opacity-70">This amount will be credited toward the new plan's first billing cycle.</p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={handleCancelAssign}
                disabled={isUpdatingSub}
                className="px-4 py-2 text-xs font-semibold rounded-xl border hover:bg-slate-800 transition disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveSubscription}
                disabled={isUpdatingSub}
                className="px-5 py-2 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white transition flex items-center gap-1.5 shadow"
              >
                {isUpdatingSub ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                <span>Apply Plan & Entitlements</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Create Custom SaaS Plan */}
      {showCreatePlanModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className={`w-full max-w-lg rounded-2xl border p-6 space-y-4 max-h-[90vh] overflow-y-auto ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'} shadow-2xl`}>
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-bold text-lg">Create Custom SaaS Plan</h3>
                <p className="text-xs opacity-60">Define custom pricing, quotas, and module entitlements.</p>
              </div>
              <button 
                onClick={handleCancelCreatePlan}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold mb-1">Plan Code</label>
                  <input
                    type="text"
                    placeholder="e.g. ULTRA_SECURITY"
                    value={newPlan.planCode || ''}
                    onChange={(e) => setNewPlan({ ...newPlan, planCode: e.target.value })}
                    className={`w-full p-2 rounded-xl border outline-none uppercase font-mono ${isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200'}`}
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1">Plan Display Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Ultra Security Suite"
                    value={newPlan.planName || ''}
                    onChange={(e) => setNewPlan({ ...newPlan, planName: e.target.value })}
                    className={`w-full p-2 rounded-xl border outline-none ${isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200'}`}
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold mb-1">Description</label>
                <input
                  type="text"
                  placeholder="Short description of the plan target audience..."
                  value={newPlan.description || ''}
                  onChange={(e) => setNewPlan({ ...newPlan, description: e.target.value })}
                  className={`w-full p-2 rounded-xl border outline-none ${isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200'}`}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold mb-1">Monthly Price (₹)</label>
                  <input
                    type="number"
                    value={newPlan.monthlyPrice || 0}
                    onChange={(e) => setNewPlan({ ...newPlan, monthlyPrice: Number(e.target.value) })}
                    className={`w-full p-2 rounded-xl border outline-none ${isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200'}`}
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1">Yearly Price (₹)</label>
                  <input
                    type="number"
                    value={newPlan.yearlyPrice || 0}
                    onChange={(e) => setNewPlan({ ...newPlan, yearlyPrice: Number(e.target.value) })}
                    className={`w-full p-2 rounded-xl border outline-none ${isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200'}`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold mb-1">Max Employees</label>
                  <input
                    type="number"
                    value={newPlan.employeeLimit || 100}
                    onChange={(e) => setNewPlan({ ...newPlan, employeeLimit: Number(e.target.value) })}
                    className={`w-full p-2 rounded-xl border outline-none ${isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200'}`}
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1">Admin Users</label>
                  <input
                    type="number"
                    value={newPlan.userLimit || 3}
                    onChange={(e) => setNewPlan({ ...newPlan, userLimit: Number(e.target.value) })}
                    className={`w-full p-2 rounded-xl border outline-none ${isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200'}`}
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1">Storage (MB)</label>
                  <input
                    type="number"
                    value={newPlan.storageLimitMB || 2048}
                    onChange={(e) => setNewPlan({ ...newPlan, storageLimitMB: Number(e.target.value) })}
                    className={`w-full p-2 rounded-xl border outline-none ${isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200'}`}
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold mb-1.5">Enabled Modules in Plan</label>
                <div className="grid grid-cols-2 gap-2 max-h-36 overflow-y-auto p-2 border rounded-xl border-slate-700">
                  {MASTER_APP_MODULES.map(m => {
                    const checked = (newPlan.enabledModules || []).includes(m.key);
                    return (
                      <label key={m.key} className="flex items-center gap-2 cursor-pointer text-[11px]">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => {
                            const current = newPlan.enabledModules || [];
                            if (e.target.checked) {
                              setNewPlan({ ...newPlan, enabledModules: [...current, m.key] });
                            } else {
                              setNewPlan({ ...newPlan, enabledModules: current.filter(k => k !== m.key) });
                            }
                          }}
                          className="rounded text-indigo-600"
                        />
                        <span>{m.name}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3">
              <button
                onClick={handleCancelCreatePlan}
                className="px-4 py-2 text-xs font-semibold rounded-xl border hover:bg-slate-800 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateCustomPlan}
                disabled={!newPlan.planCode || !newPlan.planName}
                className="px-5 py-2 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white transition disabled:opacity-50"
              >
                Save Plan to Catalog
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

