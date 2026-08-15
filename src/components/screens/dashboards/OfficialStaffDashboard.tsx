import React from 'react';
import { CompanyTenant, UserSession, PhaseAScreen } from '../../../types';
import { HrDashboard } from './official/HrDashboard';
import { FinanceDashboard } from './official/FinanceDashboard';
import { AdminDashboard } from './official/AdminDashboard';
import { ProcurementDashboard } from './official/ProcurementDashboard';
import { EhsDashboard } from './official/EhsDashboard';

interface DashboardProps { 
  userSession: UserSession; 
  company: CompanyTenant; 
  onNavigate: (screen: PhaseAScreen) => void; 
}

export const OfficialStaffDashboard: React.FC<DashboardProps> = (props) => {
  const role = props.userSession.role;

  switch (role) {
    case 'HR':
    case 'HR_ADMIN':
      return <HrDashboard {...props} />;
    case 'FINANCE':
    case 'FINANCE_MANAGER':
      return <FinanceDashboard {...props} />;
    case 'ADMIN':
      return <AdminDashboard {...props} />;
    case 'PROCUREMENT':
      return <ProcurementDashboard {...props} />;
    case 'EHS':
    case 'SAFETY_OFFICER':
      return <EhsDashboard {...props} />;
    
    // Departments missing explicit Firestore collections in current Phase
    case 'QUALITY':
    case 'COMMERCIAL':
    case 'MIS':
    case 'CLIENT_MANAGEMENT':
    case 'IT':
    case 'OPERATIONS_OFFICE':
      return (
        <div className="p-8 text-center bg-white dark:bg-slate-800 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">{role.replace('_', ' ')} Dashboard</h3>
          <p className="text-sm text-slate-500">
            This functional department's dashboard is scaffolded but awaiting core business logic and specific Firestore collection mappings.
            <br/><br/>
            Missing Dependencies: 
            <span className="font-mono text-xs bg-slate-100 dark:bg-slate-900 p-1 ml-2 rounded text-indigo-500">
              {role}_MODULE_BUSINESS_LOGIC
            </span>
          </p>
        </div>
      );
      
    default:
      return (
        <div className="p-4 text-center border rounded-xl border-dashed">
          A3_OFFICIAL_STAFF Dashboard ({role}): Role not explicitly mapped to a sub-dashboard.
        </div>
      );
  }
};
