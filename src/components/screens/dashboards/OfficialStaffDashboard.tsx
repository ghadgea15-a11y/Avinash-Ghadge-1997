import React from 'react';
import { CompanyTenant, UserSession, PhaseAScreen } from '../../../types';
import { HrDashboard } from './official/HrDashboard';
import { FinanceDashboard } from './official/FinanceDashboard';
import { AdminDashboard } from './official/AdminDashboard';
import { ProcurementDashboard } from './official/ProcurementDashboard';
import { EhsDashboard } from './official/EhsDashboard';
import { DepartmentGenericDashboard } from './official/DepartmentGenericDashboard';


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
      return <DepartmentGenericDashboard {...props} departmentName={role} />;
      
    default:
      return (
        <div className="p-4 text-center border rounded-xl border-dashed">
          A3_OFFICIAL_STAFF Dashboard ({role}): Role not explicitly mapped to a sub-dashboard.
        </div>
      );
  }
};
