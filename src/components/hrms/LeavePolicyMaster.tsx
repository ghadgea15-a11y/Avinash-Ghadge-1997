// @ts-nocheck
// @ts-nocheck
import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Plus, 
  Settings2, 
  Check, 
  X, 
  Building,
  Users,
  Info,
  Save,
  Trash2
} from 'lucide-react';
import { LeavePolicyRecord, CompanyTenant, UserSession } from '../../types';

interface LeavePolicyMasterProps {
  userSession: UserSession;
  company: CompanyTenant;
  policies: LeavePolicyRecord[];
  onSavePolicy: (policy: Partial<LeavePolicyRecord>) => Promise<void>;
  isLoading: boolean;
}

export const LeavePolicyMaster: React.FC<LeavePolicyMasterProps> = ({
  userSession,
  company,
  policies,
  onSavePolicy,
  isLoading
}) => {
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [currentPolicy, setCurrentPolicy] = useState<Partial<LeavePolicyRecord>>({
    leaveCode: '',
    leaveName: '',
    description: '',
    isPaid: true,
    annualEntitlement: 0,
    accrualType: 'ANNUAL',
    accrualFrequency: 'YEARLY',
    proRataForMidYearJoiners: true,
    proRataMethod: 'MONTHLY_EXACT',
    roundingRule: 'NEAREST_HALF_DAY',
    carryForwardAllowed: false,
    maxCarryForward: 0,
    encashmentAllowed: false,
    minNoticeDays: 0,
    maxConsecutiveDays: 0,
    halfDayAllowed: true,
    negativeBalanceAllowed: false,
    requiresDocument: false,
    requiresApproval: true,
    status: 'ACTIVE'
  });

  const handleEdit = (policy: LeavePolicyRecord) => {
    setCurrentPolicy(policy);
    setIsEditing(true);
  };

  const handleNew = () => {
    setCurrentPolicy({
      leaveCode: '',
      leaveName: '',
      description: '',
      isPaid: true,
      annualEntitlement: 0,
      accrualType: 'ANNUAL',
      accrualFrequency: 'YEARLY',
      proRataForMidYearJoiners: true,
      proRataMethod: 'MONTHLY_EXACT',
      roundingRule: 'NEAREST_HALF_DAY',
      carryForwardAllowed: false,
      maxCarryForward: 0,
      encashmentAllowed: false,
      minNoticeDays: 0,
      maxConsecutiveDays: 0,
      halfDayAllowed: true,
      negativeBalanceAllowed: false,
      requiresDocument: false,
      requiresApproval: true,
      status: 'ACTIVE'
    });
    setIsEditing(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSavePolicy(currentPolicy);
    setIsEditing(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-black text-black dark:text-white flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-indigo-600" />
            Leave Policy Master
          </h3>
          <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mt-1">Configure company-wide leave entitlements</p>
        </div>
        {!isEditing && (
          <button
            onClick={handleNew}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs shadow-lg shadow-indigo-600/20 transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            Create New Policy
          </button>
        )}
      </div>

      {isEditing ? (
        <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-900 dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
          <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
            <h4 className="text-base font-black text-black dark:text-white">
              {currentPolicy.id ? 'Edit Policy' : 'New Policy Configuration'}
            </h4>
            <button type="button" onClick={() => setIsEditing(false)} className="text-slate-400 hover:text-slate-600 dark:text-slate-400 transition">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Basic Info */}
            <div className="space-y-5">
              <h5 className="text-[11px] font-black uppercase tracking-widest text-indigo-600 border-b border-indigo-100 dark:border-indigo-900/30 pb-2">Basic Identification</h5>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase ml-1">Leave Code *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. CL"
                    value={currentPolicy.leaveCode}
                    onChange={(e) => setCurrentPolicy({...currentPolicy, leaveCode: e.target.value.toUpperCase()})}
                    className="w-full px-4 py-2.5 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 dark:bg-slate-900 text-black dark:text-white outline-none focus:border-indigo-500 transition-all"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase ml-1">Leave Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Casual Leave"
                    value={currentPolicy.leaveName}
                    onChange={(e) => setCurrentPolicy({...currentPolicy, leaveName: e.target.value})}
                    className="w-full px-4 py-2.5 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 dark:bg-slate-900 text-black dark:text-white outline-none focus:border-indigo-500 transition-all"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase ml-1">Description</label>
                <textarea
                  rows={2}
                  value={currentPolicy.description}
                  onChange={(e) => setCurrentPolicy({...currentPolicy, description: e.target.value})}
                  className="w-full px-4 py-2.5 text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 dark:bg-slate-900 text-black dark:text-white outline-none focus:border-indigo-500 transition-all resize-none"
                />
              </div>

              <div className="flex items-center gap-6 p-4 rounded-2xl bg-white dark:bg-slate-950 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={currentPolicy.isPaid}
                    onChange={(e) => setCurrentPolicy({...currentPolicy, isPaid: e.target.checked})}
                    className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-600"
                  />
                  <span className="text-xs font-bold text-slate-900 dark:text-slate-300">Paid Leave</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={currentPolicy.requiresApproval}
                    onChange={(e) => setCurrentPolicy({...currentPolicy, requiresApproval: e.target.checked})}
                    className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-600"
                  />
                  <span className="text-xs font-bold text-slate-900 dark:text-slate-300">Requires Approval</span>
                </label>
              </div>
            </div>

            {/* Entitlement & Accrual */}
            <div className="space-y-5">
              <h5 className="text-[11px] font-black uppercase tracking-widest text-indigo-600 border-b border-indigo-100 dark:border-indigo-900/30 pb-2">Entitlement & Accrual</h5>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase ml-1">Annual Entitlement</label>
                  <input
                    type="number"
                    value={currentPolicy.annualEntitlement}
                    onChange={(e) => setCurrentPolicy({...currentPolicy, annualEntitlement: Number(e.target.value)})}
                    className="w-full px-4 py-2.5 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 dark:bg-slate-900 text-black dark:text-white outline-none focus:border-indigo-500 transition-all"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase ml-1">Accrual Type</label>
                  <select
                    value={currentPolicy.accrualType}
                    onChange={(e) => setCurrentPolicy({...currentPolicy, accrualType: e.target.value as any})}
                    className="w-full px-4 py-2.5 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 dark:bg-slate-900 text-black dark:text-white outline-none focus:border-indigo-500 transition-all"
                  >
                    <option value="ANNUAL">Annual (Fixed)</option>
                    <option value="MONTHLY">Monthly Accrual</option>
                    <option value="PERIODIC">Periodic</option>
                    <option value="FIXED">One-time Fixed</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <label className="flex items-center gap-2 p-3 rounded-xl border border-slate-200 dark:border-slate-700 cursor-pointer hover:bg-white dark:bg-slate-950 dark:hover:bg-slate-900 transition">
                  <input
                    type="checkbox"
                    checked={currentPolicy.carryForwardAllowed}
                    onChange={(e) => setCurrentPolicy({...currentPolicy, carryForwardAllowed: e.target.checked})}
                    className="w-4 h-4 rounded border-slate-300 text-indigo-600"
                  />
                  <span className="text-[11px] font-black uppercase text-slate-600 dark:text-slate-400 dark:text-slate-300">Allow Carry Forward</span>
                </label>
                {currentPolicy.carryForwardAllowed && (
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase ml-1">Max Carry Forward</label>
                    <input
                      type="number"
                      value={currentPolicy.maxCarryForward}
                      onChange={(e) => setCurrentPolicy({...currentPolicy, maxCarryForward: Number(e.target.value)})}
                      className="w-full px-4 py-2.5 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 dark:bg-slate-900 text-black dark:text-white outline-none focus:border-indigo-500 transition-all"
                    />
                  </div>
                )}
              </div>

              {/* Mid-Year Joining Pro-Rata Configuration */}
              <div className="p-4 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h6 className="text-xs font-black text-indigo-900 dark:text-indigo-300 uppercase tracking-wider">Mid-Year Joining Pro-Rata Accrual</h6>
                    <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Statutory pro-rata calculation for employees joining mid-year / mid-month</p>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={currentPolicy.proRataForMidYearJoiners ?? true}
                      onChange={(e) => setCurrentPolicy({...currentPolicy, proRataForMidYearJoiners: e.target.checked})}
                      className="w-4 h-4 rounded border-slate-300 text-indigo-600"
                    />
                    <span className="text-[11px] font-black uppercase text-indigo-700 dark:text-indigo-300">Enabled</span>
                  </label>
                </div>

                {(currentPolicy.proRataForMidYearJoiners ?? true) && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    <div className="space-y-1">
                      <label className="text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase">Calculation Method</label>
                      <select
                        value={currentPolicy.proRataMethod || 'MONTHLY_EXACT'}
                        onChange={(e) => setCurrentPolicy({...currentPolicy, proRataMethod: e.target.value as any})}
                        className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-black dark:text-white outline-none"
                      >
                        <option value="MONTHLY_EXACT">Monthly Exact (Statutory Standard)</option>
                        <option value="DAILY_EXACT">Daily Exact (365/366 Days Count)</option>
                        <option value="MONTHLY_FULL_IF_BEFORE_15TH">15th Cutoff (Full/Half Month)</option>
                        <option value="MONTHLY_HALF_DAY">Quarterly Slab Method</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase">Rounding Rule</label>
                      <select
                        value={currentPolicy.roundingRule || 'NEAREST_HALF_DAY'}
                        onChange={(e) => setCurrentPolicy({...currentPolicy, roundingRule: e.target.value as any})}
                        className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-black dark:text-white outline-none"
                      >
                        <option value="NEAREST_HALF_DAY">Round to Nearest 0.5 Day (Standard)</option>
                        <option value="ROUND_TWO_DECIMALS">Exact 2 Decimal Places</option>
                        <option value="ROUND_UP">Ceil to 0.5 Day (Employee-Friendly)</option>
                        <option value="ROUND_DOWN">Floor to 0.5 Day</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Validation Rules */}
            <div className="space-y-5">
              <h5 className="text-[11px] font-black uppercase tracking-widest text-indigo-600 border-b border-indigo-100 dark:border-indigo-900/30 pb-2">Rules & Restrictions</h5>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase ml-1">Min Notice (Days)</label>
                  <input
                    type="number"
                    value={currentPolicy.minNoticeDays}
                    onChange={(e) => setCurrentPolicy({...currentPolicy, minNoticeDays: Number(e.target.value)})}
                    className="w-full px-4 py-2.5 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 dark:bg-slate-900 text-black dark:text-white outline-none focus:border-indigo-500 transition-all"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase ml-1">Max Consecutive</label>
                  <input
                    type="number"
                    value={currentPolicy.maxConsecutiveDays}
                    onChange={(e) => setCurrentPolicy({...currentPolicy, maxConsecutiveDays: Number(e.target.value)})}
                    className="w-full px-4 py-2.5 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 dark:bg-slate-900 text-black dark:text-white outline-none focus:border-indigo-500 transition-all"
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={currentPolicy.halfDayAllowed}
                    onChange={(e) => setCurrentPolicy({...currentPolicy, halfDayAllowed: e.target.checked})}
                    className="w-4 h-4 rounded border-slate-300 text-indigo-600"
                  />
                  <span className="text-xs font-bold text-slate-900 dark:text-slate-300">Allow Half Day</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={currentPolicy.negativeBalanceAllowed}
                    onChange={(e) => setCurrentPolicy({...currentPolicy, negativeBalanceAllowed: e.target.checked})}
                    className="w-4 h-4 rounded border-slate-300 text-indigo-600"
                  />
                  <span className="text-xs font-bold text-slate-900 dark:text-slate-300">Negative Balance</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={currentPolicy.requiresDocument}
                    onChange={(e) => setCurrentPolicy({...currentPolicy, requiresDocument: e.target.checked})}
                    className="w-4 h-4 rounded border-slate-300 text-indigo-600"
                  />
                  <span className="text-xs font-bold text-slate-900 dark:text-slate-300">Mandatory Doc</span>
                </label>
              </div>
            </div>

            <div className="space-y-5">
               <h5 className="text-[11px] font-black uppercase tracking-widest text-indigo-600 border-b border-indigo-100 dark:border-indigo-900/30 pb-2">Status & Actions</h5>
               <div className="space-y-1.5">
                  <label className="text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase ml-1">Policy Status</label>
                  <select
                    value={currentPolicy.status}
                    onChange={(e) => setCurrentPolicy({...currentPolicy, status: e.target.value as any})}
                    className="w-full px-4 py-2.5 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 dark:bg-slate-900 text-black dark:text-white outline-none focus:border-indigo-500 transition-all"
                  >
                    <option value="ACTIVE">ACTIVE (Active in System)</option>
                    <option value="INACTIVE">INACTIVE (Hidden)</option>
                  </select>
                </div>
            </div>
          </div>

          <div className="p-6 bg-white dark:bg-slate-950 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-700 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="px-6 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-400 dark:text-slate-300 hover:bg-white dark:bg-slate-900 dark:hover:bg-slate-800 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-8 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-indigo-600/20 transition-all flex items-center gap-2"
            >
              {isLoading ? <Settings2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Policy
            </button>
          </div>
        </form>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {policies.map(p => (
            <div key={p.id} className="group bg-white dark:bg-slate-900 dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm hover:border-indigo-300 dark:hover:border-indigo-900 transition-all overflow-hidden">
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`p-2.5 rounded-xl ${p.isPaid ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40' : 'bg-white text-slate-600 dark:bg-slate-900'}`}>
                      <Check className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-base font-black text-black dark:text-white leading-tight">{p.leaveName}</h4>
                      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">{p.leaveCode}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => handleEdit(p)}
                    className="p-2 rounded-lg text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors"
                  >
                    <Settings2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="p-3 rounded-2xl bg-white dark:bg-slate-950 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800">
                    <p className="text-[11px] font-black uppercase text-slate-400 mb-0.5">Entitlement</p>
                    <p className="text-sm font-black text-black dark:text-slate-200">{p.annualEntitlement} Days</p>
                  </div>
                  <div className="p-3 rounded-2xl bg-white dark:bg-slate-950 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800">
                    <p className="text-[11px] font-black uppercase text-slate-400 mb-0.5">Accrual</p>
                    <p className="text-sm font-black text-black dark:text-slate-200 capitalize">{p.accrualType.toLowerCase()}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="text-slate-500 dark:text-slate-400">Paid Leave:</span>
                    <span className={p.isPaid ? 'text-emerald-600' : 'text-slate-400'}>{p.isPaid ? 'YES' : 'NO'}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="text-slate-500 dark:text-slate-400">Carry Forward:</span>
                    <span className={p.carryForwardAllowed ? 'text-indigo-600' : 'text-slate-400'}>{p.carryForwardAllowed ? `YES (Max ${p.maxCarryForward})` : 'NO'}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="text-slate-500 dark:text-slate-400">Mandatory Doc:</span>
                    <span className={p.requiresDocument ? 'text-amber-600' : 'text-slate-400'}>{p.requiresDocument ? 'YES' : 'NO'}</span>
                  </div>
                </div>
              </div>
              <div className="px-6 py-3 bg-white dark:bg-slate-950 dark:bg-slate-900/40 border-t border-slate-100 dark:border-slate-700 flex justify-between items-center">
                <span className={`text-[11px] font-black uppercase tracking-widest ${p.status === 'ACTIVE' ? 'text-emerald-600' : 'text-slate-400'}`}>
                  {p.status}
                </span>
                <span className="text-[11px] font-bold text-slate-400 italic">Last Update: {new Date(p.updatedAt).toLocaleDateString()}</span>
              </div>
            </div>
          ))}

          {policies.length === 0 && (
            <div className="col-span-full py-20 text-center bg-white dark:bg-slate-900 dark:bg-slate-800 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-700">
              <Settings2 className="w-12 h-12 text-slate-200 mx-auto mb-4" />
              <h4 className="text-base font-black text-black dark:text-slate-200 dark:text-white">No Policies Configured</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 mb-6">Start by creating your first company leave policy.</p>
              <button 
                onClick={handleNew}
                className="px-6 py-2.5 rounded-xl bg-indigo-600 text-white font-black text-xs shadow-lg shadow-indigo-600/20 transition-all hover:bg-indigo-700"
              >
                Create Policy
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
