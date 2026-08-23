import React, { useState, useEffect } from 'react';
import { CompanyTenant, UserSession, PhaseAScreen } from '../../types';
import { RbacService } from '../../services/rbacService';
import { OwnerDashboard } from './dashboards/OwnerDashboard';
import { DirectorDashboard } from './dashboards/DirectorDashboard';
import { GeneralManagerDashboard } from './dashboards/GeneralManagerDashboard';
import { OfficialStaffDashboard } from './dashboards/OfficialStaffDashboard';
import { RegionalAreaManagerDashboard } from './dashboards/RegionalAreaManagerDashboard';
import { SiteInChargeDashboard } from './dashboards/SiteInChargeDashboard';
import { SupervisorDashboard } from './dashboards/SupervisorDashboard';
import { SkilledStaffDashboard } from './dashboards/SkilledStaffDashboard';
import { SemiSkilledDashboard } from './dashboards/SemiSkilledDashboard';
import { SupportStaffDashboard } from './dashboards/SupportStaffDashboard';

interface EnterpriseDashboardScreenProps {
  userSession: UserSession;
  company: CompanyTenant;
  onNavigate: (screen: PhaseAScreen) => void;
  onLogout: () => void;
}

export const EnterpriseDashboardScreen: React.FC<EnterpriseDashboardScreenProps> = (props) => {
  // STRICT SEPARATION: Global Super Admins cannot access the tenant/company dashboard.
  if (props.userSession?.role === 'SUPER_ADMIN') {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center bg-slate-50 dark:bg-slate-900 flex-1">
        <div className="bg-red-50 dark:bg-red-900/20 text-red-600 p-4 rounded-full mb-4">
          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Platform Access Violation</h2>
        <p className="text-slate-600 dark:text-slate-400 mb-6 max-w-md">Global Super Administrators are restricted from entering tenant-specific dashboards to maintain strict multi-tenant isolation boundaries.</p>
        <button 
           onClick={() => props.onNavigate('SUPER_ADMIN_DASHBOARD')}
           className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg font-bold transition-colors"
        >
          Return to Platform Core
        </button>
      </div>
    );
  }

  const authorityLevel = RbacService.getAuthorityLevel(props.userSession);

  // Render role-specific dashboard based on strict RBAC authority level
  const renderDashboard = () => {
    switch (authorityLevel) {
      case 'A0_OWNER':
        return <OwnerDashboard {...props} />;
      case 'A1_DIRECTOR_CEO':
        return <DirectorDashboard {...props} />;
      case 'A2_GENERAL_MANAGER':
        return <GeneralManagerDashboard {...props} />;
      case 'A3_OFFICIAL_STAFF':
        return <OfficialStaffDashboard {...props} />;
      case 'A4_REGIONAL_AREA_MANAGER':
        return <RegionalAreaManagerDashboard {...props} />;
      case 'A5_SITE_IN_CHARGE':
        return <SiteInChargeDashboard {...props} />;
      case 'A6_SUPERVISOR':
        return <SupervisorDashboard {...props} />;
      case 'A7_SKILLED':
        return <SkilledStaffDashboard {...props} />;
      case 'A8_SEMI_SKILLED':
        return <SemiSkilledDashboard {...props} />;
      case 'A9_SUPPORT':
        return <SupportStaffDashboard {...props} />;
      default:
        return <SupportStaffDashboard {...props} />;
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 w-full max-w-7xl mx-auto pb-24 lg:pb-8 animate-fade-in">
      {/* Header section is provided externally by navigation frame. */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">Dashboard</h1>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">
            {props.company.brandName || props.company.companyLegalName}
          </p>
        </div>
      </div>
      
      {renderDashboard()}
      
    </div>
  );
};
