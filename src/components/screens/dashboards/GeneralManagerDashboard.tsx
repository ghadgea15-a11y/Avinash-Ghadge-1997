import React, { useEffect, useState } from 'react';
import { CompanyTenant, UserSession, PhaseAScreen, EmployeeRecord, IncidentReportRecord, TaskRecord, SiteRecord } from '../../../types';
import { FirestoreService } from '../../../services/firestoreService';
import { ExecutiveBiDashboard } from "../../bi/ExecutiveBiDashboard";
import { EnterpriseIntelligenceDashboard } from "../../bi/EnterpriseIntelligenceDashboard";
import { PredictiveAnalyticsDashboard } from "../../bi/PredictiveAnalyticsDashboard";
import { Users, AlertTriangle, CheckCircle, TrendingUp, ShieldCheck } from 'lucide-react';

interface DashboardProps {
  userSession: UserSession;
  company: CompanyTenant;
  onNavigate: (screen: PhaseAScreen) => void;
}

export const GeneralManagerDashboard: React.FC<DashboardProps> = ({ userSession, company, onNavigate }) => {
  const [employees, setEmployees] = useState<EmployeeRecord[]>([]);
  const [incidents, setIncidents] = useState<IncidentReportRecord[]>([]);
  const [tasks, setTasks] = useState<TaskRecord[]>([]);
  const [sites, setSites] = useState<SiteRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let empLoaded = false;
    let incLoaded = false;
    let tasksLoaded = false;
    let sitesLoaded = false;

    const checkLoading = () => {
      if (empLoaded && incLoaded && tasksLoaded && sitesLoaded) {
        setLoading(false);
      }
    };

    const unsubEmp = FirestoreService.subscribeToEmployees(userSession, company.companyId, (data) => {
      setEmployees(data);
      empLoaded = true;
      checkLoading();
    });
    const unsubInc = FirestoreService.subscribeToIncidentReports(userSession, company.companyId, (data) => {
      setIncidents(data);
      incLoaded = true;
      checkLoading();
    });
    const unsubTasks = FirestoreService.subscribeToTasks(userSession, company.companyId, (data) => {
      setTasks(data);
      tasksLoaded = true;
      checkLoading();
    });
    const unsubSites = FirestoreService.subscribeToSites(company.companyId, (data) => {
      setSites(data);
      sitesLoaded = true;
      checkLoading();
    });

    return () => {
      unsubEmp();
      unsubInc();
      unsubTasks();
      unsubSites();
    };
  }, [company.companyId, userSession.userId]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-slate-500">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p>Loading General Manager Insights...</p>
      </div>
    );
  }

  const totalEmployees = employees.length;
  const openIncidents = incidents.filter(i => ['OPEN', 'UNDER_INVESTIGATION', 'ESCALATED'].includes(i.status)).length;
  const slaBreaches = tasks.filter(t => t.slaDeadline && new Date(t.slaDeadline).getTime() < Date.now() && !['COMPLETED', 'RESOLVED', 'CANCELLED'].includes(t.status)).length;
  const activeSites = sites.filter(s => s.status === 'ACTIVE').length;
  
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-black dark:text-white">General Manager Dashboard</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Workforce</p>
            <p className="text-3xl font-black text-black dark:text-white">{totalEmployees}</p>
          </div>
          <div className="w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
            <Users className="w-6 h-6 text-blue-600" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Operational Incidents</p>
            <p className="text-3xl font-black text-black dark:text-white">{openIncidents}</p>
          </div>
          <div className="w-12 h-12 rounded-full bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 text-orange-600" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Governance Overdue</p>
            <p className="text-3xl font-black text-rose-600">{slaBreaches}</p>
          </div>
          <div className="w-12 h-12 rounded-full bg-rose-50 dark:bg-rose-900/20 flex items-center justify-center">
            <CheckCircle className="w-6 h-6 text-rose-600" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Site Status</p>
            <p className="text-3xl font-black text-emerald-600">{activeSites}</p>
          </div>
          <div className="w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center">
            <TrendingUp className="w-6 h-6 text-emerald-600" />
          </div>
        </div>
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
