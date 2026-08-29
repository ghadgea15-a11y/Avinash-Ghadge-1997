import React, { useState, useEffect } from 'react';
import { Users, ShieldCheck } from 'lucide-react';
import { CompanyTenant, UserSession, PhaseAScreen, EmployeeRecord, ApprovalRequestRecord } from '../../../types';
import { FirestoreService } from '../../../services/firestoreService';
import { RbacService } from '../../../services/rbacService';

interface DashboardProps {
  userSession: UserSession;
  company: CompanyTenant;
  onNavigate: (screen: PhaseAScreen) => void;
}

export const RegionalAreaManagerDashboard: React.FC<DashboardProps> = ({ userSession, company, onNavigate }) => {
  const [employees, setEmployees] = useState<EmployeeRecord[]>([]);
  const [approvals, setApprovals] = useState<ApprovalRequestRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let employeesLoaded = false;
    let approvalsLoaded = false;

    const checkLoading = () => {
      if (employeesLoaded && approvalsLoaded) {
        setLoading(false);
      }
    };

    const unsubEmployees = FirestoreService.subscribeToEmployees(userSession, company.companyId, (data) => {
      setEmployees(data);
      employeesLoaded = true;
      checkLoading();
    });
    const unsubApprovals = FirestoreService.subscribeToApprovalRequests(userSession, company.companyId, (data) => {
      setApprovals(data);
      approvalsLoaded = true;
      checkLoading();
    });
    
    return () => {
      unsubEmployees();
      unsubApprovals();
    };
  }, [company.companyId, userSession]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-slate-500 dark:text-slate-400">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p>Loading Regional Metrics...</p>
      </div>
    );
  }

  const activeEmployees = employees.filter(e => e.status === 'ACTIVE').length;
  const pendingApprovals = approvals.filter(a => a.status === 'PENDING').length;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700/50">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400">Regional Workforce</h3>
            <Users className="w-5 h-5 text-indigo-500" />
          </div>
          <p className="text-3xl font-black text-black dark:text-white">{activeEmployees}</p>
          <p className="text-xs text-green-600 mt-2 font-medium">Assigned Region</p>
        </div>

        <div className="bg-white dark:bg-slate-900 dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700/50">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400">Action Required</h3>
            <ShieldCheck className="w-5 h-5 text-amber-500" />
          </div>
          <p className="text-3xl font-black text-black dark:text-white">{pendingApprovals}</p>
          {RbacService.hasModuleAccess(userSession, 'APPROVAL_MANAGEMENT') && (
            <button 
              onClick={() => onNavigate('APPROVAL_MANAGEMENT')}
              className="text-xs text-indigo-600 hover:text-indigo-700 mt-2 font-semibold flex items-center"
            >
              Review Regional Approvals &rarr;
            </button>
          )}
        </div>
      </div>
      
      <div className="bg-indigo-50/50 dark:bg-indigo-900/10 p-6 rounded-2xl border border-indigo-100 dark:border-indigo-800/30">
        <h3 className="text-lg font-bold text-black dark:text-white mb-2">Regional Summary</h3>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Welcome to the Regional Dashboard. You are viewing operational data scoped strictly to your assigned region.
        </p>
      </div>

      <EnterpriseIntelligenceDashboard 
        session={userSession} 
        company={company} 
        onDrillDown={(mod, data) => {}} 
      />
    </div>
  );
};