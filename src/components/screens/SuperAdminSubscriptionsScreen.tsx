import React, { useState, useEffect } from 'react';
import { 
  CreditCard, TrendingUp, AlertTriangle, XCircle, 
  CheckCircle2, PlusCircle, Activity, Building2, ChevronLeft
} from 'lucide-react';
import { UserSession, PhaseAScreen, SubscriptionPlan, CompanySubscription } from '../../types';
import { SubscriptionService } from '../../services/subscriptionService';
import { useTheme } from '../../context/ThemeContext';

interface SuperAdminSubscriptionsScreenProps {
  userSession: UserSession;
  onNavigate: (screen: PhaseAScreen) => void;
}

export const SuperAdminSubscriptionsScreen: React.FC<SuperAdminSubscriptionsScreenProps> = ({
  userSession,
  onNavigate
}) => {
  const { isDark } = useTheme();
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);

  // Stats
  const [stats, setStats] = useState({
    active: 0,
    trial: 0,
    expiring: 0,
    monthlyRevenue: 0,
    yearlyRevenue: 0
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const fetchedPlans = await SubscriptionService.getAllPlans();
      setPlans(fetchedPlans);
      
      // We would fetch actual stats from subscriptions here
      setStats({
        active: 12,
        trial: 3,
        expiring: 2,
        monthlyRevenue: 45000,
        yearlyRevenue: 540000
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const createDefaultPlans = async () => {
    try {
      const starter: SubscriptionPlan = {
        planId: 'PLAN_STARTER',
        planCode: 'STARTER',
        planName: 'Starter',
        description: 'For small security agencies.',
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
        updatedAt: new Date().toISOString(),
        createdBy: userSession.userId,
        updatedBy: userSession.userId
      };
      
      const pro: SubscriptionPlan = {
        planId: 'PLAN_PRO',
        planCode: 'PRO',
        planName: 'Professional',
        description: 'For growing businesses with multiple sites.',
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
        updatedAt: new Date().toISOString(),
        createdBy: userSession.userId,
        updatedBy: userSession.userId
      };

      await SubscriptionService.createPlan(starter);
      await SubscriptionService.createPlan(pro);
      
      fetchData();
    } catch (e) {
      console.error('Failed to create default plans', e);
    }
  }

  return (
    <div className={`min-h-screen \${isDark ? 'bg-slate-950 text-slate-200' : 'bg-slate-50 text-slate-800'}`}>
      <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
        
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <button 
            onClick={() => onNavigate('SUPER_ADMIN_DASHBOARD')}
            className={`p-2 rounded-xl border transition \${isDark ? 'bg-slate-900 border-slate-800 hover:bg-slate-800' : 'bg-white border-slate-200 hover:bg-slate-100'}`}
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold">Subscription Management</h1>
            <p className="text-sm opacity-60">Manage SaaS plans, billing, and company subscriptions.</p>
          </div>
        </div>

        {/* Overview Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className={`p-4 rounded-2xl border \${isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-medium opacity-60">Active Subscriptions</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="text-2xl font-bold">{stats.active}</div>
          </div>
          
          <div className={`p-4 rounded-2xl border \${isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-medium opacity-60">Trial Companies</span>
              <Activity className="w-4 h-4 text-amber-500" />
            </div>
            <div className="text-2xl font-bold">{stats.trial}</div>
          </div>

          <div className={`p-4 rounded-2xl border \${isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-medium opacity-60">Expiring Soon</span>
              <AlertTriangle className="w-4 h-4 text-orange-500" />
            </div>
            <div className="text-2xl font-bold">{stats.expiring}</div>
          </div>

          <div className={`p-4 rounded-2xl border \${isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-medium opacity-60">Monthly Revenue</span>
              <TrendingUp className="w-4 h-4 text-indigo-500" />
            </div>
            <div className="text-2xl font-bold">₹{stats.monthlyRevenue.toLocaleString()}</div>
          </div>
          
          <div className={`p-4 rounded-2xl border \${isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-medium opacity-60">Failed Payments</span>
              <XCircle className="w-4 h-4 text-red-500" />
            </div>
            <div className="text-2xl font-bold">0</div>
          </div>
        </div>

        {/* Plans Management */}
        <div className={`rounded-2xl border overflow-hidden \${isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
          <div className={`px-6 py-4 flex justify-between items-center border-b \${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
            <h2 className="font-bold flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-indigo-500" />
              Available Plans
            </h2>
            <div className="flex gap-2">
              {plans.length === 0 && (
                <button 
                  onClick={createDefaultPlans}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg transition"
                >
                  Create Default Plans
                </button>
              )}
              <button className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg flex items-center gap-2 transition">
                <PlusCircle className="w-4 h-4" />
                New Plan
              </button>
            </div>
          </div>
          
          <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
            {plans.map(plan => (
              <div key={plan.planId} className={`p-5 rounded-xl border relative \${isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                <div className="absolute top-4 right-4">
                  <span className={`px-2 py-1 text-[10px] font-bold rounded-md \${plan.status === 'ACTIVE' ? 'bg-emerald-500/20 text-emerald-500' : 'bg-slate-500/20 text-slate-400'}`}>
                    {plan.status}
                  </span>
                </div>
                <h3 className="font-bold text-lg mb-1">{plan.planName}</h3>
                <p className="text-xs opacity-60 mb-4 h-8">{plan.description}</p>
                <div className="text-3xl font-black mb-4">
                  ₹{plan.monthlyPrice}<span className="text-sm opacity-50 font-medium">/mo</span>
                </div>
                <ul className="space-y-2 mb-6 text-sm">
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Up to {plan.employeeLimit} employees</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> {plan.userLimit} Admin users</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> {plan.enabledModules.length} Modules Enabled</li>
                </ul>
                <button className={`w-full py-2 rounded-lg text-xs font-bold border transition \${isDark ? 'border-slate-600 hover:bg-slate-700' : 'border-slate-300 hover:bg-slate-200'}`}>
                  Edit Plan
                </button>
              </div>
            ))}
            
            {plans.length === 0 && !loading && (
              <div className="col-span-3 text-center py-12 opacity-50">
                <p>No plans available. Create the default plans to get started.</p>
              </div>
            )}
          </div>
        </div>

        {/* Company Subscriptions Table */}
        <div className={`rounded-2xl border overflow-hidden \${isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
          <div className={`px-6 py-4 flex justify-between items-center border-b \${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
            <h2 className="font-bold flex items-center gap-2">
              <Building2 className="w-5 h-5 text-amber-500" />
              Company Subscriptions
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className={`\${isDark ? 'bg-slate-800/50' : 'bg-slate-50'}`}>
                <tr>
                  <th className="px-6 py-3 font-medium opacity-60">Company ID</th>
                  <th className="px-6 py-3 font-medium opacity-60">Plan</th>
                  <th className="px-6 py-3 font-medium opacity-60">Status</th>
                  <th className="px-6 py-3 font-medium opacity-60">Renewal Date</th>
                  <th className="px-6 py-3 font-medium opacity-60 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className={`divide-y \${isDark ? 'divide-slate-800' : 'divide-slate-100'}`}>
                <tr>
                  <td className="px-6 py-4 font-medium">MUSTER-CORP-101</td>
                  <td className="px-6 py-4">Professional</td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 bg-emerald-500/10 text-emerald-500 rounded-md text-xs font-bold">ACTIVE</span>
                  </td>
                  <td className="px-6 py-4 opacity-80">15 Sep 2026</td>
                  <td className="px-6 py-4 text-right">
                    <button className="text-indigo-500 font-medium hover:underline text-xs">Manage</button>
                  </td>
                </tr>
                <tr>
                  <td className="px-6 py-4 font-medium">OMEGA-SEC-202</td>
                  <td className="px-6 py-4">Starter</td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 bg-amber-500/10 text-amber-500 rounded-md text-xs font-bold">TRIAL</span>
                  </td>
                  <td className="px-6 py-4 opacity-80">22 Aug 2026</td>
                  <td className="px-6 py-4 text-right">
                    <button className="text-indigo-500 font-medium hover:underline text-xs">Manage</button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
};
