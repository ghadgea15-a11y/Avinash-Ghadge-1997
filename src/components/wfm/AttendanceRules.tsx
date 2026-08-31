import React, { useState, useEffect } from 'react';
import { UserSession, CompanyTenant, OvertimePolicyRecord } from '../../types';
import { FirestoreService } from '../../services/firestoreService';
import { AttendanceCalculationEngine } from '../../services/calculationEngine';
import { useFeedback } from '../../context/ActionFeedbackContext';
import { Settings2, Save } from 'lucide-react';

interface Props {
  userSession: UserSession;
  activeCompany: CompanyTenant;
}

export const AttendanceRules: React.FC<Props> = ({ userSession, activeCompany }) => {
  const { showLoading, showSuccess, showError } = useFeedback();
  const [policy, setPolicy] = useState<OvertimePolicyRecord | null>(null);

  useEffect(() => {
    const fetchPolicy = async () => {
      const existing = await FirestoreService.getAttendancePolicy(activeCompany.companyId);
      if (existing) {
        setPolicy(existing);
      } else {
        // Initialize with system default
        const defaultPolicy = AttendanceCalculationEngine.getDefaultPolicy(activeCompany.companyId);
        setPolicy(defaultPolicy);
      }
    };
    fetchPolicy();
  }, [activeCompany.companyId]);

  const handleSave = async () => {
    if (!policy) return;
    const dismiss = showLoading('Saving rules...');
    try {
      const success = await FirestoreService.saveAttendancePolicy(activeCompany.companyId, {
        ...policy,
        updatedBy: userSession.employeeId
      });
      dismiss();
      if (success) {
        showSuccess('Attendance rules updated successfully.');
      } else {
        showError('Failed to save rules to database.');
      }
    } catch (e) {
      dismiss();
      showError('Failed to update rules.');
    }
  };

  if (!policy) {
    return (
      <div className="p-12 flex justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-xs mt-6">
      <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-200 dark:border-slate-800">
        <Settings2 className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
        <div>
          <h2 className="text-lg font-bold">WFM & Overtime Rules</h2>
          <p className="text-xs text-slate-500">Configure attendance thresholds for payroll automation.</p>
        </div>
      </div>

      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Late & Early Exits</h3>
            <div>
              <label className="block text-xs font-bold mb-1">Late Arrival Grace Period (Minutes)</label>
              <input 
                type="number" 
                value={policy.gracePeriodMinutes} 
                onChange={e => setPolicy(p => p ? ({...p, gracePeriodMinutes: parseInt(e.target.value)}) : null)} 
                className="w-full px-3 py-2 border rounded-xl bg-slate-50 dark:bg-slate-950 dark:border-slate-800 text-sm" 
              />
            </div>
            <div>
              <label className="block text-xs font-bold mb-1">Early Departure Grace Period (Minutes)</label>
              <input 
                type="number" 
                value={policy.earlyDepartureGraceMinutes} 
                onChange={e => setPolicy(p => p ? ({...p, earlyDepartureGraceMinutes: parseInt(e.target.value)}) : null)} 
                className="w-full px-3 py-2 border rounded-xl bg-slate-50 dark:bg-slate-950 dark:border-slate-800 text-sm" 
              />
            </div>
          </div>
          
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Shift Calculations</h3>
            <div>
              <label className="block text-xs font-bold mb-1">Default Break Duration (Minutes)</label>
              <input 
                type="number" 
                value={policy.defaultBreakMinutes} 
                onChange={e => setPolicy(p => p ? ({...p, defaultBreakMinutes: parseInt(e.target.value)}) : null)} 
                className="w-full px-3 py-2 border rounded-xl bg-slate-50 dark:bg-slate-950 dark:border-slate-800 text-sm" 
              />
            </div>
            <div className="flex items-center gap-2 pt-4">
              <input 
                type="checkbox" 
                id="includeBreak"
                checked={policy.includeBreakInWorkedTime} 
                onChange={e => setPolicy(p => p ? ({...p, includeBreakInWorkedTime: e.target.checked}) : null)} 
                className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <label htmlFor="includeBreak" className="text-xs font-bold cursor-pointer">Include break in worked time</label>
            </div>
          </div>

          <div className="space-y-4 md:col-span-2">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Overtime Policy</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-bold mb-1">Minimum Overtime to Trigger (Minutes)</label>
                <input 
                  type="number" 
                  value={policy.overtimeThresholdMinutes} 
                  onChange={e => setPolicy(p => p ? ({...p, overtimeThresholdMinutes: parseInt(e.target.value)}) : null)} 
                  className="w-full px-3 py-2 border rounded-xl bg-slate-50 dark:bg-slate-950 dark:border-slate-800 text-sm" 
                />
              </div>
              <div>
                <label className="block text-xs font-bold mb-1">Maximum Overtime Permitted (Minutes/Day)</label>
                <input 
                  type="number" 
                  value={policy.maxDailyOvertimeMinutes} 
                  onChange={e => setPolicy(p => p ? ({...p, maxDailyOvertimeMinutes: parseInt(e.target.value)}) : null)} 
                  className="w-full px-3 py-2 border rounded-xl bg-slate-50 dark:bg-slate-950 dark:border-slate-800 text-sm" 
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
              <div className="flex items-center gap-2">
                <input 
                  type="checkbox" 
                  id="requireApproval"
                  checked={policy.requireApprovalForOvertime} 
                  onChange={e => setPolicy(p => p ? ({...p, requireApprovalForOvertime: e.target.checked}) : null)} 
                  className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <label htmlFor="requireApproval" className="text-xs font-bold cursor-pointer">Require manager approval for overtime</label>
              </div>
              <div className="flex items-center gap-2">
                <input 
                  type="checkbox" 
                  id="eligibleForOvertime"
                  checked={policy.eligibleForOvertime} 
                  onChange={e => setPolicy(p => p ? ({...p, eligibleForOvertime: e.target.checked}) : null)} 
                  className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <label htmlFor="eligibleForOvertime" className="text-xs font-bold cursor-pointer">Eligible for paid overtime by default</label>
              </div>
            </div>
          </div>
        </div>
        
        <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-end">
          <button onClick={handleSave} className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold transition-all">
            <Save className="w-4 h-4" />
            Save Configuration
          </button>
        </div>
      </div>
    </div>
  );
};
