import React, { useState, useEffect } from 'react';
import { ExecutiveBiDashboard } from "../../bi/ExecutiveBiDashboard";
import { EnterpriseIntelligenceDashboard } from "../../bi/EnterpriseIntelligenceDashboard";
import { PredictiveAnalyticsDashboard } from "../../bi/PredictiveAnalyticsDashboard";
import { Users, Building, Activity, ShieldCheck, DollarSign, Clock } from 'lucide-react';
import { CompanyTenant, UserSession, PhaseAScreen, EmployeeRecord, ApprovalRequestRecord } from '../../../types';
import { FirestoreService } from '../../../services/firestoreService';
import { RbacService } from '../../../services/rbacService';

interface DashboardProps {
  userSession: UserSession;
  company: CompanyTenant;
  onNavigate: (screen: PhaseAScreen) => void;
}

export const OwnerDashboard: React.FC<DashboardProps> = ({ userSession, company, onNavigate }) => {
  const [employees, setEmployees] = useState<EmployeeRecord[]>([]);
  const [approvals, setApprovals] = useState<ApprovalRequestRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubEmployees = FirestoreService.subscribeToEmployees(userSession, company.companyId, setEmployees);
    let unsubApprovals = FirestoreService.subscribeToApprovalRequests(userSession, company.companyId, setApprovals);
    
    // Simulating loading state for initial fetch
    setTimeout(() => setLoading(false), 800);

    return () => {
      unsubEmployees();
      unsubApprovals();
    };
  }, [company.companyId]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-slate-500">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p>Loading Owner Metrics...</p>
      </div>
    );
  }

  const activeEmployees = employees.filter(e => e.status === 'ACTIVE').length;
  const pendingApprovals = approvals.filter(a => a.status === 'PENDING').length;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700/50">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400">Total Workforce</h3>
            <Users className="w-5 h-5 text-indigo-500" />
          </div>
          <p className="text-3xl font-black text-slate-900 dark:text-white">{activeEmployees}</p>
          <p className="text-xs text-green-600 mt-2 font-medium">Enterprise Scope</p>
        </div>

        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700/50">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400">Action Required</h3>
            <ShieldCheck className="w-5 h-5 text-amber-500" />
          </div>
          <p className="text-3xl font-black text-slate-900 dark:text-white">{pendingApprovals}</p>
          {RbacService.hasModuleAccess(userSession, 'APPROVAL_MANAGEMENT') && (
            <button 
              onClick={() => onNavigate('APPROVAL_MANAGEMENT')}
              className="text-xs text-indigo-600 hover:text-indigo-700 mt-2 font-semibold flex items-center"
            >
              Review Approvals &rarr;
            </button>
          )}
        </div>
      </div>
      
      <div className="bg-indigo-50/50 dark:bg-indigo-900/10 p-6 rounded-2xl border border-indigo-100 dark:border-indigo-800/30">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Executive Summary</h3>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Welcome to the Enterprise Owner Dashboard. You are viewing the global operational state of {company.companyLegalName}. All regional boundaries are lifted for your authority level (A0_OWNER).
        </p>
      </div>

      <div className="flex gap-4">
        <button 
          onClick={() => onNavigate('SECURITY_AUDIT')}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-medium shadow-sm transition-colors flex items-center gap-2"
        >
          <ShieldCheck className="w-5 h-5" />
          Security Audit & Anomalies
        </button>
      </div>
      <EnterpriseIntelligenceDashboard 
        session={userSession} 
        company={company} 
        onDrillDown={(mod, data) => {}} 
      />
      <ExecutiveBiDashboard session={userSession} company={company} />
      <PredictiveAnalyticsDashboard session={userSession} company={company} />
    </div>
  );
};
