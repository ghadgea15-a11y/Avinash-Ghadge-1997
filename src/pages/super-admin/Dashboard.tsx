import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Plus, 
  Settings2, 
  ShieldCheck, 
  Users, 
  Globe, 
  MoreVertical, 
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  Package
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Timestamp } from 'firebase/firestore';
import { SuperAdminService } from '../../services/superAdminService';
import { CompanyTenant, TenantStatus, SubscriptionPlan } from '../../types/platform';
import { UserSession } from '../../types';

interface DashboardProps {
  session: UserSession;
}

const MODULE_OPTIONS = [
  { id: 'HCM', name: 'Human Capital Management' },
  { id: 'WFM', name: 'Workforce Management' },
  { id: 'SCM', name: 'Supply Chain Management' },
  { id: 'EAM', name: 'Enterprise Asset Management' },
  { id: 'CRM', name: 'Client Relationship Management' },
  { id: 'FINANCE', name: 'Financial Management' },
  { id: 'BPM', name: 'Business Process Management' },
  { id: 'GRC', name: 'Governance, Risk & Compliance' }
];

export function PlatformDashboard({ session }: DashboardProps) {
  const [tenants, setTenants] = useState<CompanyTenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<TenantStatus | 'ALL'>('ALL');
  const [showProvisionModal, setShowProvisionModal] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState<CompanyTenant | null>(null);
  const [showModulesDrawer, setShowModulesDrawer] = useState(false);

  // Form State for Provisioning
  const [newTenant, setNewTenant] = useState({
    companyCode: '',
    name: '',
    adminEmail: '',
    subscriptionPlan: 'STARTER' as SubscriptionPlan,
    enabledModules: ['HCM'] as string[],
    maxEmployees: 100,
    maxSites: 10
  });

  useEffect(() => {
    const unsub = SuperAdminService.subscribeToTenants((data) => {
      setTenants(data);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleProvision = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await SuperAdminService.createTenant(session, newTenant);
      setShowProvisionModal(false);
      // Reset form
      setNewTenant({
        companyCode: '',
        name: '',
        adminEmail: '',
        subscriptionPlan: 'STARTER',
        enabledModules: ['HCM'],
        maxEmployees: 100,
        maxSites: 10
      });
    } catch (error: any) {
      alert(error.message);
    }
  };

  const handleStatusUpdate = async (tenantId: string, status: TenantStatus) => {
    const reason = prompt('Reason for status change:');
    if (!reason) return;

    try {
      await SuperAdminService.updateTenantStatus(session, tenantId, status, reason);
    } catch (error: any) {
      alert(error.message);
    }
  };

  const handleModuleToggle = async (moduleId: string) => {
    if (!selectedTenant) return;
    
    const newModules = selectedTenant.enabledModules.includes(moduleId)
      ? selectedTenant.enabledModules.filter(m => m !== moduleId)
      : [...selectedTenant.enabledModules, moduleId];

    try {
      await SuperAdminService.updateModuleEntitlements(session, selectedTenant.id, newModules);
      setSelectedTenant({ ...selectedTenant, enabledModules: newModules });
    } catch (error: any) {
      alert(error.message);
    }
  };

  const filteredTenants = tenants.filter(t => filter === 'ALL' || t.status === filter);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-6">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <ShieldCheck className="text-blue-600" />
            Platform Control Center
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            Super Admin Layer — Global Tenant & Entitlement Governance
          </p>
        </div>

        <button 
          onClick={() => setShowProvisionModal(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-all shadow-lg shadow-blue-500/20 font-medium"
        >
          <Plus size={18} />
          Provision New Tenant
        </button>
      </div>

      {/* Stats Quick Grid */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total Tenants', value: tenants.length, icon: Building2, color: 'text-blue-600' },
          { label: 'Active Sessions', value: '42', icon: Globe, color: 'text-green-600' },
          { label: 'Platform Users', value: '1,280', icon: Users, color: 'text-purple-600' },
          { label: 'System Health', value: '99.9%', icon: Settings2, color: 'text-amber-600' },
        ].map((stat, i) => (
          <div key={i} className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg bg-slate-50 dark:bg-slate-800 ${stat.color}`}>
                <stat.icon size={20} />
              </div>
              <div>
                <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">{stat.label}</p>
                <p className="text-xl font-bold text-slate-900 dark:text-white">{stat.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Tenant List Section */}
      <div className="max-w-7xl mx-auto">
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
            <div className="flex gap-2">
              {['ALL', 'PENDING', 'ACTIVE', 'SUSPENDED'].map((s) => (
                <button
                  key={s}
                  onClick={() => setFilter(s as any)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                    filter === s 
                    ? 'bg-blue-600 text-white shadow-md' 
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 text-xs uppercase tracking-widest font-bold">
                  <th className="px-6 py-4">Tenant / Code</th>
                  <th className="px-6 py-4">Plan / Entitlements</th>
                  <th className="px-6 py-4">Capacity</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Created</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                <AnimatePresence>
                  {filteredTenants.map((tenant) => (
                    <motion.tr 
                      layout
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      key={tenant.id} 
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors group"
                    >
                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-900 dark:text-white">{tenant.name}</div>
                        <div className="text-xs font-mono text-blue-600 bg-blue-50 dark:bg-blue-900/30 px-1.5 py-0.5 rounded inline-block mt-1">
                          {tenant.companyCode}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          tenant.subscriptionPlan === 'ENTERPRISE' ? 'bg-purple-100 text-purple-700' :
                          tenant.subscriptionPlan === 'PROFESSIONAL' ? 'bg-blue-100 text-blue-700' :
                          'bg-slate-100 text-slate-700'
                        }`}>
                          {tenant.subscriptionPlan}
                        </span>
                        <div className="flex gap-1 mt-1 flex-wrap">
                          {tenant.enabledModules.slice(0, 3).map(m => (
                            <span key={m} className="text-[9px] bg-slate-100 dark:bg-slate-800 text-slate-500 px-1 rounded uppercase font-bold">
                              {m}
                            </span>
                          ))}
                          {tenant.enabledModules.length > 3 && (
                            <span className="text-[9px] text-slate-400">+{tenant.enabledModules.length - 3}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">
                        <div className="flex items-center gap-2">
                          <Users size={14} className="opacity-50" />
                          {tenant.maxEmployees}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <Building2 size={14} className="opacity-50" />
                          {tenant.maxSites}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge status={tenant.status} />
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-500">
                        {tenant.createdAt instanceof Timestamp 
                          ? tenant.createdAt.toDate().toLocaleDateString()
                          : 'Recent'}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => {
                              setSelectedTenant(tenant);
                              setShowModulesDrawer(true);
                            }}
                            className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-600"
                            title="Entitlements"
                          >
                            <Package size={16} />
                          </button>
                          <div className="relative inline-block text-left group/menu">
                            <button className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-600">
                              <MoreVertical size={16} />
                            </button>
                            <div className="absolute right-0 bottom-full mb-2 w-48 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 py-2 hidden group-hover/menu:block z-50">
                              <button 
                                onClick={() => handleStatusUpdate(tenant.id, 'ACTIVE')}
                                className="w-full text-left px-4 py-2 text-xs hover:bg-slate-50 dark:hover:bg-slate-800 text-green-600 flex items-center gap-2"
                              >
                                <CheckCircle2 size={14} /> Activate Tenant
                              </button>
                              <button 
                                onClick={() => handleStatusUpdate(tenant.id, 'SUSPENDED')}
                                className="w-full text-left px-4 py-2 text-xs hover:bg-slate-50 dark:hover:bg-slate-800 text-amber-600 flex items-center gap-2"
                              >
                                <AlertCircle size={14} /> Suspend Tenant
                              </button>
                              <button 
                                onClick={() => handleStatusUpdate(tenant.id, 'TERMINATED')}
                                className="w-full text-left px-4 py-2 text-xs hover:bg-slate-50 dark:hover:bg-slate-800 text-red-600 flex items-center gap-2"
                              >
                                <XCircle size={14} /> Terminate Tenant
                              </button>
                            </div>
                          </div>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Provision Modal */}
      {showProvisionModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden"
          >
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
              <h2 className="text-lg font-bold">Provision New Company Tenant</h2>
              <button onClick={() => setShowProvisionModal(false)} className="text-slate-400 hover:text-slate-600">
                <XCircle />
              </button>
            </div>
            <form onSubmit={handleProvision} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Company Code</label>
                  <input 
                    required
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-mono uppercase"
                    placeholder="E.G. REL-IND"
                    value={newTenant.companyCode}
                    onChange={e => setNewTenant({...newTenant, companyCode: e.target.value})}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Subscription Plan</label>
                  <select 
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950"
                    value={newTenant.subscriptionPlan}
                    onChange={e => setNewTenant({...newTenant, subscriptionPlan: e.target.value as SubscriptionPlan})}
                  >
                    <option value="STARTER">Starter</option>
                    <option value="PROFESSIONAL">Professional</option>
                    <option value="ENTERPRISE">Enterprise</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Company Name</label>
                <input 
                  required
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950"
                  placeholder="Official registered name"
                  value={newTenant.name}
                  onChange={e => setNewTenant({...newTenant, name: e.target.value})}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Admin Email</label>
                <input 
                  required
                  type="email"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950"
                  placeholder="Primary administrative contact"
                  value={newTenant.adminEmail}
                  onChange={e => setNewTenant({...newTenant, adminEmail: e.target.value})}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Max Employees</label>
                  <input 
                    type="number"
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950"
                    value={newTenant.maxEmployees}
                    onChange={e => setNewTenant({...newTenant, maxEmployees: parseInt(e.target.value)})}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Max Sites</label>
                  <input 
                    type="number"
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950"
                    value={newTenant.maxSites}
                    onChange={e => setNewTenant({...newTenant, maxSites: parseInt(e.target.value)})}
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex gap-3">
                <button 
                  type="button" 
                  onClick={() => setShowProvisionModal(false)}
                  className="flex-1 py-2 rounded-lg border border-slate-200 dark:border-slate-800 text-sm font-bold text-slate-600"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="flex-1 py-2 rounded-lg bg-blue-600 text-white text-sm font-bold shadow-lg shadow-blue-500/20"
                >
                  Confirm Provisioning
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Modules Entitlements Drawer */}
      {showModulesDrawer && selectedTenant && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[101] flex justify-end">
          <motion.div 
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            className="w-full max-w-md bg-white dark:bg-slate-900 h-full shadow-2xl flex flex-col"
          >
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
              <div>
                <h2 className="text-lg font-bold">Module Entitlements</h2>
                <p className="text-xs text-slate-500">Managing: {selectedTenant.name}</p>
              </div>
              <button onClick={() => setShowModulesDrawer(false)} className="text-slate-400 hover:text-slate-600">
                <XCircle />
              </button>
            </div>
            
            <div className="p-6 flex-1 overflow-y-auto space-y-3">
              {MODULE_OPTIONS.map(mod => (
                <div 
                  key={mod.id}
                  onClick={() => handleModuleToggle(mod.id)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                    selectedTenant.enabledModules.includes(mod.id)
                    ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20 ring-1 ring-blue-600'
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                  }`}
                >
                  <div>
                    <p className="text-sm font-bold text-slate-900 dark:text-white">{mod.name}</p>
                    <p className="text-[10px] text-slate-500 font-mono uppercase">{mod.id}</p>
                  </div>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                    selectedTenant.enabledModules.includes(mod.id)
                    ? 'bg-blue-600 border-blue-600 text-white'
                    : 'border-slate-300'
                  }`}>
                    {selectedTenant.enabledModules.includes(mod.id) && <CheckCircle2 size={12} />}
                  </div>
                </div>
              ))}
            </div>

            <div className="p-6 border-t border-slate-100 dark:border-slate-800">
              <button 
                onClick={() => setShowModulesDrawer(false)}
                className="w-full py-3 rounded-xl bg-slate-900 dark:bg-white dark:text-slate-900 text-white text-sm font-bold"
              >
                Done
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: TenantStatus }) {
  const configs = {
    ACTIVE: { icon: CheckCircle2, class: 'bg-green-100 text-green-700 border-green-200' },
    PENDING: { icon: Clock, class: 'bg-blue-100 text-blue-700 border-blue-200' },
    SUSPENDED: { icon: AlertCircle, class: 'bg-amber-100 text-amber-700 border-amber-200' },
    TERMINATED: { icon: XCircle, class: 'bg-red-100 text-red-700 border-red-200' },
  };

  const config = configs[status];
  const Icon = config.icon;

  return (
    <span className={`px-2.5 py-1 rounded-full border text-[10px] font-bold flex items-center gap-1.5 w-fit ${config.class}`}>
      <Icon size={12} />
      {status}
    </span>
  );
}

function Clock(props: any) {
  return (
    <svg 
      {...props} 
      xmlns="http://www.w3.org/2000/svg" 
      width="24" 
      height="24" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
    </svg>
  );
}
