import React, { useState, useEffect } from 'react';
import { 
  UserSession, 
  CompanySubscription, 
  SubscriptionPlan, 
  ModuleEntitlement,
  APP_MODULES
} from '../../types';
import { SubscriptionService } from '../../services/subscriptionService';
import { 
  ArrowLeft, Shield, Clock, AlertTriangle, CheckCircle2, 
  XCircle, Users, Activity, Check, Zap, 
  RefreshCw, Building2, Award, Layers
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

interface Props {
  userSession: UserSession;
  onNavigate: (screen: any) => void;
}

export function CompanyBillingScreen({ userSession, onNavigate }: Props) {
  const { isDark } = useTheme();
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState<CompanySubscription | null>(null);
  const [plan, setPlan] = useState<SubscriptionPlan | null>(null);
  const [availablePlans, setAvailablePlans] = useState<SubscriptionPlan[]>([]);
  const [entitlements, setEntitlements] = useState<ModuleEntitlement[]>([]);

  useEffect(() => {
    loadData();
  }, [userSession.companyId]);

  const loadData = async () => {
    try {
      if (!userSession.companyId) return;
      setLoading(true);

      const sub = await SubscriptionService.getCompanySubscription(userSession.companyId);
      setSubscription(sub);
      
      const allPlans = await SubscriptionService.getAllPlans();
      setAvailablePlans(allPlans);
      
      if (sub) {
        const p = allPlans.find(x => x.planId === sub.planId) || await SubscriptionService.getPlan(sub.planId);
        setPlan(p);
      }
      
      const ents = await SubscriptionService.getCompanyEntitlements(userSession.companyId);
      setEntitlements(ents);
    } catch (err) {
      console.error('[CompanyBilling] Error loading subscription data:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 dark:text-emerald-400 border-emerald-200';
      case 'TRIAL': return 'text-blue-600 bg-blue-50 dark:bg-blue-500/10 dark:text-blue-400 border-blue-200';
      case 'PAST_DUE': return 'text-rose-600 bg-rose-50 dark:bg-rose-500/10 dark:text-rose-400 border-rose-200';
      case 'GRACE_PERIOD': return 'text-amber-600 bg-amber-50 dark:bg-amber-500/10 dark:text-amber-400 border-amber-200';
      default: return 'text-slate-600 bg-slate-50 dark:bg-slate-500/10 dark:text-slate-400 border-slate-200';
    }
  };

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isDark ? 'bg-slate-950' : 'bg-slate-50'}`}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${isDark ? 'bg-slate-950 text-slate-200' : 'bg-slate-50 text-slate-800'}`}>
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => onNavigate('ENTERPRISE_DASHBOARD')}
              className={`p-2.5 rounded-xl border transition ${isDark ? 'bg-slate-900 border-slate-800 hover:bg-slate-800' : 'bg-white border-slate-200 hover:bg-slate-100'}`}
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Plan & Subscriptions</h1>
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/30">
                  Enterprise License
                </span>
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400">View active subscription tier, employee capacities, and module entitlements.</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={loadData}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl border transition ${
                isDark ? 'bg-slate-900 border-slate-800 hover:bg-slate-800' : 'bg-white border-slate-200 hover:bg-slate-100'
              }`}
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Refresh
            </button>
          </div>
        </div>

        {!subscription ? (
          <div className={`p-8 text-center rounded-2xl border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
            <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-amber-500" />
            <h2 className="text-xl font-bold mb-2">No Active Subscription Record</h2>
            <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto mb-6">
              Your organization currently operates on the default tenant configuration.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Plan Overview Card */}
            <div className={`p-6 rounded-2xl border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'} shadow-sm`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <h2 className="text-2xl font-bold">{plan?.planName || 'Enterprise Tier'}</h2>
                    <span className={`px-2.5 py-0.5 text-xs font-bold rounded-full border ${getStatusColor(subscription.status)}`}>
                      {subscription.status}
                    </span>
                  </div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Billing Cycle: <span className="font-semibold text-slate-700 dark:text-slate-300">{subscription.billingCycle}</span>
                  </p>
                </div>

                <div className={`p-3.5 rounded-xl flex items-center gap-3 ${isDark ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' : 'bg-indigo-50 text-indigo-700 border border-indigo-100'}`}>
                  <Clock className="w-5 h-5 text-indigo-500" />
                  <div>
                    <div className="text-xs uppercase tracking-wider font-bold">Valid Until / Renewal</div>
                    <div className="text-sm font-semibold">{new Date(subscription.currentPeriodEnd).toLocaleDateString()}</div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className={`p-4 rounded-xl border ${isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                  <div className="flex items-center gap-2 mb-2 text-slate-500 dark:text-slate-400">
                    <Users className="w-4 h-4" />
                    <span className="text-xs font-bold uppercase tracking-wider">Employee Capacity</span>
                  </div>
                  <p className="text-xl font-bold text-slate-900 dark:text-white">{plan?.employeeLimit || subscription.employeeLimit || 'Unlimited'} Seats</p>
                </div>

                <div className={`p-4 rounded-xl border ${isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                  <div className="flex items-center gap-2 mb-2 text-slate-500 dark:text-slate-400">
                    <Shield className="w-4 h-4" />
                    <span className="text-xs font-bold uppercase tracking-wider">Admin User Seats</span>
                  </div>
                  <p className="text-xl font-bold text-slate-900 dark:text-white">{plan?.userLimit || subscription.userLimit || 5} Admins</p>
                </div>

                <div className={`p-4 rounded-xl border ${isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                  <div className="flex items-center gap-2 mb-2 text-slate-500 dark:text-slate-400">
                    <Activity className="w-4 h-4" />
                    <span className="text-xs font-bold uppercase tracking-wider">Cloud Storage</span>
                  </div>
                  <p className="text-xl font-bold text-slate-900 dark:text-white">
                    {plan?.storageLimitMB ? `${Math.round(plan.storageLimitMB / 1024)} GB` : `${Math.round((subscription.storageLimitMB || 5120) / 1024)} GB`}
                  </p>
                </div>
              </div>
            </div>

            {/* Modules / Entitlements */}
            <div className={`p-6 rounded-2xl border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'} shadow-sm`}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Layers className="w-5 h-5 text-indigo-500" />
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">Active Module Entitlements</h3>
                </div>
                <span className="text-xs text-slate-500">Real-time synchronized with Firestore RBAC rules</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {entitlements.map(ent => (
                  <div key={ent.moduleId} className={`flex items-center justify-between p-3.5 rounded-xl border ${isDark ? 'border-slate-800 bg-slate-800/40' : 'border-slate-100 bg-slate-50'}`}>
                    <div className="flex items-center gap-2.5">
                      {ent.enabled ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                      ) : (
                        <XCircle className="w-4 h-4 text-rose-500 shrink-0" />
                      )}
                      <span className="font-semibold text-xs text-slate-800 dark:text-slate-200">{ent.moduleId.replace('_', ' ')}</span>
                    </div>
                    <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${ent.enabled ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400' : 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400'}`}>
                      {ent.enabled ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>
                ))}
                {entitlements.length === 0 && (
                  <p className="text-sm text-slate-500 col-span-3">All standard modules available on active plan.</p>
                )}
              </div>
            </div>

            {/* Plan Catalog Reference */}
            {availablePlans.length > 0 && (
              <div className={`p-6 rounded-2xl border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'} shadow-sm`}>
                <div className="flex items-center gap-2 mb-4">
                  <Award className="w-5 h-5 text-indigo-500" />
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">Available Enterprise Tiers</h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {availablePlans.map(p => {
                    const isCurrent = subscription.planId === p.planId;
                    return (
                      <div
                        key={p.planId}
                        className={`p-4 rounded-xl border transition relative flex flex-col justify-between ${
                          isCurrent
                            ? 'border-indigo-600 bg-indigo-50/40 dark:bg-indigo-500/10'
                            : isDark ? 'border-slate-800 bg-slate-800/40' : 'border-slate-200 bg-white'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <h4 className="font-bold text-sm text-slate-900 dark:text-white">{p.planName}</h4>
                            {isCurrent && (
                              <span className="text-[10px] uppercase font-extrabold px-2 py-0.5 rounded bg-indigo-600 text-white">Current</span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 mb-3">{p.description || 'Enterprise Workforce Management'}</p>
                          <ul className="text-xs space-y-1.5 text-slate-600 dark:text-slate-400 mb-4">
                            <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-500" /> Up to {p.employeeLimit} Employees</li>
                            <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-500" /> {p.userLimit} Admin Seats</li>
                            <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-500" /> {Math.round(p.storageLimitMB / 1024)} GB Cloud Storage</li>
                            <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-500" /> All Core Operations</li>
                          </ul>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
