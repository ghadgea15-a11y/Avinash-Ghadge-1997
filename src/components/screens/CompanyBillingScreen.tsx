import React, { useState, useEffect } from 'react';
import { 
  UserSession, 
  CompanySubscription, 
  SubscriptionPlan, 
  ModuleEntitlement,
  APP_MODULES,
  EmployeeRecord
} from '../../types';
import { SubscriptionService } from '../../services/subscriptionService';
import { FirestoreService } from '../../services/firestoreService';
import { 
  ArrowLeft, Shield, Clock, AlertTriangle, CheckCircle2, 
  XCircle, Users, Activity, Check, Zap, 
  RefreshCw, Building2, Award, Layers, FileText, Send, Printer, Sparkles
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

interface Props {
  userSession: UserSession;
  activeCompany?: any;
  onNavigate: (screen: any) => void;
}

export function CompanyBillingScreen({ userSession, onNavigate }: Props) {
  const { isDark } = useTheme();
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState<CompanySubscription | null>(null);
  const [plan, setPlan] = useState<SubscriptionPlan | null>(null);
  const [availablePlans, setAvailablePlans] = useState<SubscriptionPlan[]>([]);
  const [entitlements, setEntitlements] = useState<ModuleEntitlement[]>([]);
  const [employeesCount, setEmployeesCount] = useState<number>(0);
  const [requestUpgradeModal, setRequestUpgradeModal] = useState<SubscriptionPlan | null>(null);
  const [upgradeNotes, setUpgradeNotes] = useState('');
  const [isSubmittingUpgrade, setIsSubmittingUpgrade] = useState(false);
  const [upgradeSuccessMsg, setUpgradeSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [userSession.companyId]);

  const loadData = async () => {
    try {
      if (!userSession.companyId) return;
      setLoading(true);

      const [sub, allPlans, ents, emps] = await Promise.all([
        SubscriptionService.getCompanySubscription(userSession.companyId),
        SubscriptionService.getAllPlans(),
        SubscriptionService.getCompanyEntitlements(userSession.companyId),
        FirestoreService.getEmployees(userSession.companyId)
      ]);

      setSubscription(sub);
      setAvailablePlans(allPlans);
      setEntitlements(ents);
      setEmployeesCount(emps.length);
      
      if (sub) {
        const p = allPlans.find((x: SubscriptionPlan) => x.planId === sub.planId) || await SubscriptionService.getPlan(sub.planId);
        setPlan(p);
      }
    } catch (err) {
      console.error('[CompanyBilling] Error loading subscription data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRequestUpgrade = async () => {
    if (!requestUpgradeModal || !userSession.companyId) return;
    setIsSubmittingUpgrade(true);
    try {
      await FirestoreService.createApprovalRequest(userSession.companyId, {
        type: 'SUBSCRIPTION_UPGRADE',
        requestedByUid: userSession.userId,
        targetEntity: requestUpgradeModal.planName,
        details: `Requested upgrade to ${requestUpgradeModal.planName} (${requestUpgradeModal.planCode}). Notes: ${upgradeNotes || 'Standard upgrade request'}`
      });

      setUpgradeSuccessMsg(`Upgrade request for ${requestUpgradeModal.planName} has been submitted to Super Admin.`);
      setRequestUpgradeModal(null);
      setUpgradeNotes('');
    } catch (err: any) {
      console.error('Error requesting upgrade:', err);
    } finally {
      setIsSubmittingUpgrade(false);
    }
  };

  const printCertificate = () => {
    window.print();
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

  const maxEmps = plan?.employeeLimit || subscription?.employeeLimit || 50;
  const usagePercentage = Math.min(100, Math.round((employeesCount / maxEmps) * 100));

  return (
    <div className={`min-h-screen ${isDark ? 'bg-slate-950 text-slate-200' : 'bg-slate-50 text-slate-800'}`}>
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        
        {upgradeSuccessMsg && (
          <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <span className="text-sm font-semibold">{upgradeSuccessMsg}</span>
            </div>
            <button onClick={() => setUpgradeSuccessMsg(null)} className="text-xs font-bold uppercase hover:underline">
              Dismiss
            </button>
          </div>
        )}

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
                  {userSession.companyId}
                </span>
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400">View active subscription tier, employee capacities, and module entitlements.</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={printCertificate}
              className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-xl border transition ${
                isDark ? 'bg-slate-900 border-slate-800 hover:bg-slate-800' : 'bg-white border-slate-200 hover:bg-slate-100'
              }`}
            >
              <Printer className="w-3.5 h-3.5" />
              Print License
            </button>

            <button
              onClick={loadData}
              className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-xl border transition ${
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
              Your organization currently operates on the default tenant configuration. Please contact Super Admin to activate a dedicated license plan.
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
                    Billing Cycle: <span className="font-semibold text-slate-700 dark:text-slate-300">{subscription.billingCycle}</span> • License ID: <span className="font-mono text-xs text-indigo-400">{subscription.subscriptionId}</span>
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

              {/* Quota Usage Bars */}
              <div className="mb-6 p-4 rounded-xl border border-indigo-500/20 bg-indigo-500/5">
                <div className="flex justify-between items-center text-xs font-bold mb-2">
                  <span className="flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-indigo-500" />
                    Employee Seat Utilization
                  </span>
                  <span>{employeesCount} / {maxEmps} Seats ({usagePercentage}%)</span>
                </div>
                <div className="w-full bg-slate-700/30 rounded-full h-2.5 overflow-hidden">
                  <div 
                    className={`h-2.5 rounded-full transition-all duration-500 ${
                      usagePercentage > 90 ? 'bg-rose-500' : usagePercentage > 75 ? 'bg-amber-500' : 'bg-indigo-600'
                    }`} 
                    style={{ width: `${usagePercentage}%` }}
                  />
                </div>
                {usagePercentage >= 90 && (
                  <p className="text-[11px] text-rose-400 mt-2 flex items-center gap-1 font-medium">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    You are approaching your plan seat limit. Consider upgrading for uninterrupted onboarding.
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className={`p-4 rounded-xl border ${isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                  <div className="flex items-center gap-2 mb-2 text-slate-500 dark:text-slate-400">
                    <Users className="w-4 h-4" />
                    <span className="text-xs font-bold uppercase tracking-wider">Employee Capacity</span>
                  </div>
                  <p className="text-xl font-bold text-slate-900 dark:text-white">{maxEmps} Seats</p>
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

            {/* Plan Catalog & Upgrade Request */}
            {availablePlans.length > 0 && (
              <div className={`p-6 rounded-2xl border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'} shadow-sm`}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Award className="w-5 h-5 text-indigo-500" />
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">Available Enterprise Tiers</h3>
                  </div>
                  <span className="text-xs opacity-60">Request instant tier upgrades or feature expansions</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {availablePlans.map(p => {
                    const isCurrent = subscription.planId === p.planId;
                    return (
                      <div
                        key={p.planId}
                        className={`p-5 rounded-xl border transition relative flex flex-col justify-between ${
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
                          <div className="text-lg font-black mb-2">
                            ₹{p.monthlyPrice}<span className="text-xs font-normal opacity-60">/mo</span>
                          </div>
                          <p className="text-xs text-slate-500 mb-3">{p.description || 'Enterprise Workforce Management'}</p>
                          <ul className="text-xs space-y-1.5 text-slate-600 dark:text-slate-400 mb-4">
                            <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-500" /> Up to {p.employeeLimit} Employees</li>
                            <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-500" /> {p.userLimit} Admin Seats</li>
                            <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-500" /> {Math.round(p.storageLimitMB / 1024)} GB Cloud Storage</li>
                            <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-500" /> {p.enabledModules.length} Modules Included</li>
                          </ul>
                        </div>

                        {!isCurrent && (
                          <button
                            onClick={() => setRequestUpgradeModal(p)}
                            className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg transition flex items-center justify-center gap-1.5 shadow mt-2"
                          >
                            <Zap className="w-3.5 h-3.5" />
                            <span>Request Upgrade</span>
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

      </div>

      {/* Upgrade Request Modal */}
      {requestUpgradeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className={`w-full max-w-md rounded-2xl border p-6 space-y-4 ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'} shadow-2xl`}>
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-bold text-lg">Request Upgrade to {requestUpgradeModal.planName}</h3>
                <p className="text-xs opacity-60">Submit formal upgrade request to Super Admin team.</p>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div className={`p-3 rounded-xl border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                <div className="flex justify-between items-center mb-1">
                  <span className="font-bold">{requestUpgradeModal.planName}</span>
                  <span className="font-black text-indigo-400">₹{requestUpgradeModal.monthlyPrice}/mo</span>
                </div>
                <div className="text-slate-400">Capacity: {requestUpgradeModal.employeeLimit} Employees • {requestUpgradeModal.userLimit} Admins</div>
              </div>

              <div>
                <label className="block font-bold mb-1">Additional Notes / Custom Requirements</label>
                <textarea
                  rows={3}
                  value={upgradeNotes}
                  onChange={(e) => setUpgradeNotes(e.target.value)}
                  placeholder="e.g. We are expanding to 3 new sites and need higher employee seat quotas..."
                  className={`w-full p-2.5 rounded-xl border outline-none ${isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'}`}
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setRequestUpgradeModal(null)}
                className="px-4 py-2 text-xs font-semibold rounded-xl border hover:bg-slate-800 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleRequestUpgrade}
                disabled={isSubmittingUpgrade}
                className="px-5 py-2 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white transition flex items-center gap-1.5 shadow"
              >
                {isSubmittingUpgrade ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                <span>Submit Upgrade Request</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

