import React, { useEffect, useState } from 'react';
import { CompanyTenant, UserSession, PhaseAScreen, EmployeeRecord, IncidentReportRecord, TaskRecord, SiteRecord } from '../../../types';
import { FirestoreService } from '../../../services/firestoreService';
import { ExecutiveBiDashboard } from "../../bi/ExecutiveBiDashboard";
import { PredictiveAnalyticsDashboard } from "../../bi/PredictiveAnalyticsDashboard";
import { Users, AlertTriangle, CheckCircle, TrendingUp } from 'lucide-react';

interface DashboardProps {
  userSession: UserSession;
  company: CompanyTenant;
  onNavigate: (screen: PhaseAScreen) => void;
}

export const DirectorDashboard: React.FC<DashboardProps> = ({ userSession, company }) => {
  const [employees, setEmployees] = useState<EmployeeRecord[]>([]);
  const [incidents, setIncidents] = useState<IncidentReportRecord[]>([]);
  const [tasks, setTasks] = useState<TaskRecord[]>([]);
  const [sites, setSites] = useState<SiteRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubEmp: () => void;
    let unsubInc: () => void;
    let unsubTasks: () => void;
    let unsubSites: () => void;

    // Use parallel subscriptions
    const init = async () => {
      unsubEmp = FirestoreService.subscribeToEmployees(userSession, company.companyId, setEmployees);
      unsubInc = FirestoreService.subscribeToIncidentReports(userSession, company.companyId, setIncidents);
      unsubTasks = FirestoreService.subscribeToTasks(userSession, company.companyId, setTasks);
      unsubSites = FirestoreService.subscribeToSites(company.companyId, setSites);
      setLoading(false);
    };

    init();

    return () => {
      if (unsubEmp) unsubEmp();
      if (unsubInc) unsubInc();
      if (unsubTasks) unsubTasks();
      if (unsubSites) unsubSites();
    };
  }, [company.companyId, userSession]);

  if (loading) {
    return <div className="p-4 text-center">Loading Executive Dashboard...</div>;
  }

  const totalEmployees = employees.length;
  const openIncidents = incidents.filter(i => ['OPEN', 'UNDER_INVESTIGATION', 'ESCALATED'].includes(i.status)).length;
  const slaBreaches = tasks.filter(t => t.slaDeadline && new Date(t.slaDeadline).getTime() < Date.now() && !['COMPLETED', 'RESOLVED', 'CANCELLED'].includes(t.status)).length;
  const activeSites = sites.filter(s => s.status === 'ACTIVE').length;
  
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-900">Executive Dashboard</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500">Active Employees</p>
            <p className="text-3xl font-black text-slate-900">{totalEmployees}</p>
          </div>
          <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center">
            <Users className="w-6 h-6 text-blue-600" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500">Open Incidents</p>
            <p className="text-3xl font-black text-slate-900">{openIncidents}</p>
          </div>
          <div className="w-12 h-12 rounded-full bg-orange-50 flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 text-orange-600" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500">SLA Breaches</p>
            <p className="text-3xl font-black text-rose-600">{slaBreaches}</p>
          </div>
          <div className="w-12 h-12 rounded-full bg-rose-50 flex items-center justify-center">
            <CheckCircle className="w-6 h-6 text-rose-600" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500">Active Sites</p>
            <p className="text-3xl font-black text-emerald-600">{activeSites}</p>
          </div>
          <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center">
            <TrendingUp className="w-6 h-6 text-emerald-600" />
          </div>
        </div>
      </div>

      <ExecutiveBiDashboard session={userSession} company={company} />
      <PredictiveAnalyticsDashboard session={userSession} company={company} />
    </div>
  );
};
