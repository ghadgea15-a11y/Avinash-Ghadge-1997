import React, { useState, useEffect } from 'react';
import { DollarSign, FileText, TrendingUp } from 'lucide-react';
import { CompanyTenant, UserSession, PhaseAScreen, PayrollCycleRecord, SalaryAdvanceRecord } from '../../../../types';
import { FirestoreService } from '../../../../services/firestoreService';
import { RbacService } from '../../../../services/rbacService';

interface DashboardProps {
  userSession: UserSession;
  company: CompanyTenant;
  onNavigate: (screen: PhaseAScreen) => void;
}

export const FinanceDashboard: React.FC<DashboardProps> = ({ userSession, company, onNavigate }) => {
  const [payrollCycles, setPayrollCycles] = useState<PayrollCycleRecord[]>([]);
  const [advances, setAdvances] = useState<SalaryAdvanceRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubPayroll = FirestoreService.subscribeToPayrollCycles(userSession, company.companyId, setPayrollCycles);
    let unsubAdvances = FirestoreService.subscribeToSalaryAdvances(userSession, company.companyId, setAdvances);
    
    setTimeout(() => setLoading(false), 800);

    return () => {
      unsubPayroll();
      unsubAdvances();
    };
  }, [company.companyId]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-slate-500 dark:text-slate-400">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p>Loading Finance Metrics...</p>
      </div>
    );
  }

  const pendingAdvances = advances.filter(a => a.status === 'PENDING').length;
  const draftCycles = payrollCycles.filter(c => c.status === 'DRAFT').length;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-slate-900 dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700/50">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400">Draft Payroll Cycles</h3>
            <DollarSign className="w-5 h-5 text-indigo-500" />
          </div>
          <p className="text-3xl font-black text-black dark:text-white">{draftCycles}</p>
          {RbacService.hasModuleAccess(userSession, 'PAYROLL') && (
            <button 
              onClick={() => onNavigate('PAYROLL_COMPENSATION')}
              className="text-xs text-indigo-600 hover:text-indigo-700 mt-2 font-semibold flex items-center"
            >
              Process Payroll &rarr;
            </button>
          )}
        </div>

        <div className="bg-white dark:bg-slate-900 dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700/50">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400">Pending Salary Advances</h3>
            <FileText className="w-5 h-5 text-amber-500" />
          </div>
          <p className="text-3xl font-black text-black dark:text-white">{pendingAdvances}</p>
          {RbacService.hasModuleAccess(userSession, 'PAYROLL') && (
            <button 
              onClick={() => onNavigate('PAYROLL_COMPENSATION')}
              className="text-xs text-indigo-600 hover:text-indigo-700 mt-2 font-semibold flex items-center"
            >
              Review Advances &rarr;
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
