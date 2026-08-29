import React, { useState, useEffect } from 'react';
import { AlertTriangle, ClipboardList } from 'lucide-react';
import { CompanyTenant, UserSession, PhaseAScreen, IncidentReportRecord } from '../../../../types';
import { FirestoreService } from '../../../../services/firestoreService';
import { RbacService } from '../../../../services/rbacService';

interface DashboardProps {
  userSession: UserSession;
  company: CompanyTenant;
  onNavigate: (screen: PhaseAScreen) => void;
}

export const EhsDashboard: React.FC<DashboardProps> = ({ userSession, company, onNavigate }) => {
  const [incidents, setIncidents] = useState<IncidentReportRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubIncidents = FirestoreService.subscribeToIncidentReports(userSession, company.companyId, setIncidents);
    setTimeout(() => setLoading(false), 800);
    return () => unsubIncidents();
  }, [company.companyId]);

  if (loading) {
    return <div className="p-8 text-center text-slate-500 dark:text-slate-400">Loading EHS Metrics...</div>;
  }

  const openIncidents = incidents.filter(i => i.status === 'OPEN' || i.status === 'UNDER_INVESTIGATION').length;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-slate-900 dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700/50">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400">Unresolved Safety Incidents</h3>
            <AlertTriangle className="w-5 h-5 text-red-500" />
          </div>
          <p className="text-3xl font-black text-black dark:text-white">{openIncidents}</p>
          {RbacService.hasModuleAccess(userSession, 'SITE_OPERATIONS') && (
            <button 
              onClick={() => onNavigate('SITE_OPERATIONS')}
              className="text-xs text-indigo-600 hover:text-indigo-700 mt-2 font-semibold flex items-center"
            >
              Review Incidents &rarr;
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
