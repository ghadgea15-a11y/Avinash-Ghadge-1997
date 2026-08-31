import React, { useState, useEffect } from 'react';
import { ExecutiveBiDashboard } from "../../bi/ExecutiveBiDashboard";
import { EnterpriseIntelligenceDashboard } from "../../bi/EnterpriseIntelligenceDashboard";
import { Users, ShieldCheck } from 'lucide-react';
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
  }, [company.companyId]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-slate-500 dark:text-slate-400">
        <div className="w-8 h-8 border-4 border-slate-300 dark:border-slate-700 border-t-black dark:border-t-white rounded-full animate-spin mb-4"></div>
        <p className="font-medium text-sm">Loading Owner Metrics...</p>
      </div>
    );
  }

  const activeEmployees = employees.filter(e => e.status === 'ACTIVE').length;
  const pendingApprovals = approvals.filter(a => a.status === 'PENDING').length;

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-[#0f1115] p-6 rounded-[12px] border border-[#eaebec] dark:border-[#1f2228]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">Total Workforce</h3>
            <Users className="w-5 h-5 text-slate-800 dark:text-slate-200" />
          </div>
          <p className="text-4xl font-black text-black dark:text-white">{activeEmployees}</p>
          <p className="text-sm text-emerald-600 dark:text-emerald-500 mt-2 font-medium">Enterprise Scope</p>
        </div>

        <div className="bg-white dark:bg-[#0f1115] p-6 rounded-[12px] border border-[#eaebec] dark:border-[#1f2228]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">Action Required</h3>
            <ShieldCheck className="w-5 h-5 text-slate-800 dark:text-slate-200" />
          </div>
          <p className="text-4xl font-black text-black dark:text-white">{pendingApprovals}</p>
          {RbacService.hasModuleAccess(userSession, 'APPROVAL_MANAGEMENT') && (
            <button 
              onClick={() => onNavigate('APPROVAL_MANAGEMENT')}
              className="text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 mt-2 font-bold flex items-center transition-colors"
            >
              Review Approvals &rarr;
            </button>
          )}
        </div>
      </div>
      
      <div className="bg-[#fcfcfd] dark:bg-[#141517] p-8 rounded-[12px] border border-[#eaebec] dark:border-[#1f2228]">
        <h3 className="text-xl font-black text-black dark:text-white mb-2 tracking-tight">Executive Summary</h3>
        <p className="text-base text-slate-600 dark:text-slate-400 leading-relaxed max-w-3xl">
          Welcome to the Enterprise Owner Dashboard. All telemetry and analytics below are powered by real-time Firestore synchronization.
        </p>
      </div>

      <div className="flex gap-4">
        <button 
          onClick={() => onNavigate('SECURITY_AUDIT')}
          className="bg-black hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-200 dark:text-black text-white px-6 py-3 rounded-lg font-bold transition-colors flex items-center gap-2"
        >
          <ShieldCheck className="w-5 h-5" />
          Security Audit & Anomalies
        </button>
      </div>

      <EnterpriseIntelligenceDashboard 
        session={userSession} 
        company={company} 
        onDrillDown={(mod, data) => onNavigate(mod as PhaseAScreen)} 
      />
      
      <ExecutiveBiDashboard session={userSession} company={company} />
    </div>
  );
};
