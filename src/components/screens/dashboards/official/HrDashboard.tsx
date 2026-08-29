import React, { useState, useEffect } from 'react';
import { Users, Calendar, Clock, CheckCircle2 } from 'lucide-react';
import { CompanyTenant, UserSession, PhaseAScreen, EmployeeRecord, ApprovalRequestRecord } from '../../../../types';
import { FirestoreService } from '../../../../services/firestoreService';
import { RbacService } from '../../../../services/rbacService';

interface DashboardProps {
  userSession: UserSession;
  company: CompanyTenant;
  onNavigate: (screen: PhaseAScreen) => void;
}

export const HrDashboard: React.FC<DashboardProps> = ({ userSession, company, onNavigate }) => {
  const [employees, setEmployees] = useState<EmployeeRecord[]>([]);
  const [approvals, setApprovals] = useState<ApprovalRequestRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubEmployees = FirestoreService.subscribeToEmployees(userSession, company.companyId, setEmployees);
    let unsubApprovals = FirestoreService.subscribeToApprovalRequests(userSession, company.companyId, setApprovals);
    
    setTimeout(() => setLoading(false), 800);

    return () => {
      unsubEmployees();
      unsubApprovals();
    };
  }, [company.companyId]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-slate-500 dark:text-slate-400">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p>Loading HR Metrics...</p>
      </div>
    );
  }

  const activeEmployees = employees.filter(e => e.status === 'ACTIVE').length;
  const pendingApprovals = approvals.filter(a => a.status === 'PENDING').length;
  const newJoinees = employees.filter(e => {
      if (!e.joinedDate) return false;
      const joined = new Date(e.joinedDate);
      const now = new Date();
      const diffTime = Math.abs(now.getTime() - joined.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays <= 30;
  }).length;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700/50">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400">Total Headcount</h3>
            <Users className="w-5 h-5 text-indigo-500" />
          </div>
          <p className="text-3xl font-black text-black dark:text-white">{activeEmployees}</p>
          {RbacService.hasModuleAccess(userSession, 'EMPLOYEES') && (
            <button 
              onClick={() => onNavigate('EMPLOYEES')}
              className="text-xs text-indigo-600 hover:text-indigo-700 mt-2 font-semibold flex items-center"
            >
              Manage Employees &rarr;
            </button>
          )}
        </div>

        <div className="bg-white dark:bg-slate-900 dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700/50">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400">Pending Approvals</h3>
            <CheckCircle2 className="w-5 h-5 text-amber-500" />
          </div>
          <p className="text-3xl font-black text-black dark:text-white">{pendingApprovals}</p>
          {RbacService.hasModuleAccess(userSession, 'APPROVAL_MANAGEMENT') && (
            <button 
              onClick={() => onNavigate('APPROVAL_MANAGEMENT')}
              className="text-xs text-indigo-600 hover:text-indigo-700 mt-2 font-semibold flex items-center"
            >
              Review Actions &rarr;
            </button>
          )}
        </div>

        <div className="bg-white dark:bg-slate-900 dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700/50">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400">New Joinees (30 days)</h3>
            <Users className="w-5 h-5 text-emerald-500" />
          </div>
          <p className="text-3xl font-black text-black dark:text-white">{newJoinees}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 font-medium">Recently onboarded</p>
        </div>
      </div>
    </div>
  );
};
