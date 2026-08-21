import React, { useState, useEffect } from 'react';
import { 
  UserSession, SiteRecord, EmployeeRecord, AssetRecord, 
  MaintenancePlan, MaintenanceOccurrence 
} from '../../types';
import { MaintenanceService } from '../../services/maintenanceService';
import { 
  Calendar, Clock, Wrench, Plus, Search, Filter, 
  CheckCircle2, AlertCircle, ChevronRight, Settings,
  History, User, MapPin
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface MaintenanceSchedulingProps {
  session: UserSession;
  companyId: string;
  assets: AssetRecord[];
  sites: SiteRecord[];
  employees: EmployeeRecord[];
}

export function MaintenanceScheduling({ session, companyId, assets, sites, employees }: MaintenanceSchedulingProps) {
  const [activeSubTab, setActiveSubTab] = useState<'PLANS' | 'OCCURRENCES'>('OCCURRENCES');
  const [plans, setPlans] = useState<MaintenancePlan[]>([]);
  const [occurrences, setOccurrences] = useState<MaintenanceOccurrence[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  
  // Form State for new plan
  const [newPlan, setNewPlan] = useState<Partial<MaintenancePlan>>({
    maintenanceType: 'PREVENTIVE',
    frequency: 1,
    frequencyUnit: 'MONTHLY',
    priority: 'MEDIUM',
    status: 'ACTIVE',
    startDate: new Date().toISOString().split('T')[0],
    gracePeriod: 0
  });

  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadData();
  }, [companyId]);

  const loadData = async () => {
    if (!companyId) return;
    setLoading(true);
    try {
      const [p, o] = await Promise.all([
        MaintenanceService.getMaintenancePlans(companyId),
        MaintenanceService.getMaintenanceOccurrences(companyId)
      ]);
      setPlans(p);
      setOccurrences(o);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlan.assetId || !newPlan.siteId) return;

    const planData: MaintenancePlan = {
      id: `PLAN-${Date.now()}`,
      maintenancePlanId: `PLAN-${Date.now()}`,
      companyId,
      assetId: newPlan.assetId,
      siteId: newPlan.siteId,
      title: (newPlan as any).title || `${newPlan.maintenanceType || 'Preventive'} Maintenance`,
      maintenanceType: newPlan.maintenanceType as any,
      frequency: newPlan.frequency || 1,
      frequencyUnit: newPlan.frequencyUnit as any,
      startDate: new Date(newPlan.startDate || Date.now()).toISOString(),
      nextDueDate: new Date(newPlan.startDate || Date.now()).toISOString(),
      priority: newPlan.priority as any,
      status: 'ACTIVE',
      assignedTo: newPlan.assignedTo,
      gracePeriod: newPlan.gracePeriod || 0,
      createdAt: '',
      updatedAt: ''
    };

    const success = await MaintenanceService.saveMaintenancePlan(companyId, planData, {
      id: session.employeeId || session.userId,
      name: session.fullName || 'User'
    });

    if (success) {
      setIsPlanModalOpen(false);
      loadData();
    }
  };

  const handleProcessDue = async () => {
    const count = await MaintenanceService.processDueOccurrences(companyId, {
      id: session.employeeId || session.userId,
      name: session.fullName || 'User'
    });
    if (count > 0) {
      loadData();
    }
  };

  const filteredOccurrences = occurrences.filter(occ => {
    const asset = assets.find(a => a.id === occ.assetId);
    const searchMatch = !searchQuery || 
      occ.assetId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (asset?.assetName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (asset?.assetCode || '').toLowerCase().includes(searchQuery.toLowerCase());
    return searchMatch;
  });

  return (
    <div className="p-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div className="flex bg-slate-100 p-1 rounded-lg">
          <button
            onClick={() => setActiveSubTab('OCCURRENCES')}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
              activeSubTab === 'OCCURRENCES' 
                ? 'bg-white text-indigo-600 shadow-sm' 
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Maintenance Schedule
          </button>
          <button
            onClick={() => setActiveSubTab('PLANS')}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
              activeSubTab === 'PLANS' 
                ? 'bg-white text-indigo-600 shadow-sm' 
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Maintenance Plans
          </button>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search assets..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm w-64 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>
          <button 
            onClick={handleProcessDue}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors shadow-sm"
          >
            <Settings className="w-4 h-4" />
            Process Due
          </button>
          <button 
            onClick={() => setIsPlanModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            New Plan
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
          <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4" />
          <p>Loading maintenance data...</p>
        </div>
      ) : activeSubTab === 'OCCURRENCES' ? (
        <div className="space-y-4">
          {filteredOccurrences.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200 text-slate-400">
              <Calendar className="w-12 h-12 mb-4 opacity-20" />
              <p className="text-lg font-medium">No maintenance occurrences scheduled</p>
              <p className="text-sm">Create a plan to start automated scheduling</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {filteredOccurrences.map((occ) => {
                const asset = assets.find(a => a.id === occ.assetId);
                const isOverdue = occ.status === 'OVERDUE';
                const isDue = occ.status === 'DUE';
                
                return (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    key={occ.maintenanceOccurrenceId}
                    className="p-4 bg-white border border-slate-200 rounded-xl shadow-sm hover:shadow-md transition-shadow flex items-center justify-between"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`p-3 rounded-lg ${
                        isOverdue ? 'bg-red-50 text-red-600' : 
                        isDue ? 'bg-amber-50 text-amber-600' : 
                        occ.status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-600' :
                        occ.status === 'IN_PROGRESS' ? 'bg-blue-50 text-blue-600' :
                        'bg-slate-50 text-slate-600'
                      }`}>
                        <Calendar className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold text-slate-900">{asset?.assetName || 'Unknown Asset'}</h4>
                          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                            {asset?.assetCode}
                          </span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                            isOverdue ? 'bg-red-100 text-red-700' : 
                            isDue ? 'bg-amber-100 text-amber-700' : 
                            occ.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-700' :
                            'bg-slate-100 text-slate-700'
                          }`}>
                            {occ.status}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 mt-1 text-xs text-slate-500">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            Due: {occ.dueDate ? new Date(occ.dueDate).toLocaleDateString() : 'N/A'}
                          </span>
                          {occ.workOrderId && (
                            <span className="flex items-center gap-1 text-indigo-600 font-medium">
                              <History className="w-3.5 h-3.5" />
                              WO: {occ.workOrderId}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {occ.status === 'UPCOMING' && (
                        <button className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 rounded-lg">
                          Reschedule
                        </button>
                      )}
                      <button className="p-2 text-slate-400 hover:text-slate-900 rounded-lg transition-colors">
                        <ChevronRight className="w-5 h-5" />
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {plans.length === 0 ? (
             <div className="flex flex-col items-center justify-center py-20 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200 text-slate-400">
             <Settings className="w-12 h-12 mb-4 opacity-20" />
             <p className="text-lg font-medium">No maintenance plans defined</p>
             <p className="text-sm">Create plans to automate recurring asset maintenance</p>
           </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {plans.map(plan => {
                const asset = assets.find(a => a.id === plan.assetId);
                const assignee = employees.find(e => e.id === plan.assignedTo);
                
                return (
                  <div key={plan.maintenancePlanId} className="p-5 bg-white border border-slate-200 rounded-xl shadow-sm">
                    <div className="flex justify-between items-start mb-4">
                      <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                        <Settings className="w-5 h-5" />
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                        plan.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700'
                      }`}>
                        {plan.status}
                      </span>
                    </div>
                    
                    <h4 className="font-bold text-slate-900 mb-1">{asset?.assetName}</h4>
                    <p className="text-xs text-slate-500 mb-4">{plan.maintenanceType} - {plan.frequency} {plan.frequencyUnit}</p>
                    
                    <div className="space-y-2 border-t border-slate-100 pt-4">
                      <div className="flex items-center justify-between text-xs text-slate-600">
                        <span className="flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          Assignee:
                        </span>
                        <span className="font-medium">{assignee ? `${assignee.firstName} ${assignee.lastName}` : 'Unassigned'}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-slate-600">
                        <span className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          Next Due:
                        </span>
                        <span className="font-medium">{new Date(plan.nextDueDate).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Plan Modal */}
      <AnimatePresence>
        {isPlanModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsPlanModalOpen(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                <h3 className="text-lg font-bold text-slate-900">New Maintenance Plan</h3>
                <button onClick={() => setIsPlanModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                  <Plus className="w-6 h-6 rotate-45" />
                </button>
              </div>

              <form onSubmit={handleCreatePlan} className="p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase">Asset</label>
                    <select
                      value={newPlan.assetId || ''}
                      onChange={(e) => {
                        const asset = assets.find(a => a.id === e.target.value);
                        setNewPlan({ ...newPlan, assetId: e.target.value, siteId: asset?.siteId });
                      }}
                      className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                      required
                    >
                      <option value="">Select Asset</option>
                      {assets.map(a => (
                        <option key={a.id} value={a.id}>{a.assetName} ({a.assetCode})</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase">Type</label>
                    <select
                      value={newPlan.maintenanceType || ''}
                      onChange={(e) => setNewPlan({ ...newPlan, maintenanceType: e.target.value as any })}
                      className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                      required
                    >
                      <option value="PREVENTIVE">Preventive</option>
                      {/* <option value="CALIBRATION">Calibration</option> */}
                      {/* <option value="INSPECTION">Inspection</option> */}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase">Frequency</label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        min="1"
                        value={newPlan.frequency || 1}
                        onChange={(e) => setNewPlan({ ...newPlan, frequency: parseInt(e.target.value) })}
                        className="w-20 px-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                        required
                      />
                      <select
                        value={newPlan.frequencyUnit || ''}
                        onChange={(e) => setNewPlan({ ...newPlan, frequencyUnit: e.target.value as any })}
                        className="flex-1 px-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                        required
                      >
                        <option value="DAILY">Day(s)</option>
                        <option value="WEEKLY">Week(s)</option>
                        <option value="MONTHLY">Month(s)</option>
                        <option value="YEARLY">Year(s)</option>
                      </select>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase">Start Date</label>
                    <input
                      type="date"
                      value={newPlan.startDate || ''}
                      onChange={(e) => setNewPlan({ ...newPlan, startDate: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase">Assignee (Optional)</label>
                  <select
                    value={newPlan.assignedTo || ''}
                    onChange={(e) => setNewPlan({ ...newPlan, assignedTo: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  >
                    <option value="">Auto-Assign Later</option>
                    {employees.map(e => (
                      <option key={e.id} value={e.id}>{e.firstName} {e.lastName} ({e.employeeId})</option>
                    ))}
                  </select>
                </div>

                <div className="pt-4 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setIsPlanModalOpen(false)}
                    className="flex-1 px-4 py-2 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200"
                  >
                    Create Plan
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
