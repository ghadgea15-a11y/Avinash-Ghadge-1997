import React, { useState, useEffect } from 'react';
import { CompanyTenant, UserSession, SiteRecord, EmployeeRecord } from '../../types';
import { FirestoreService } from '../../services/firestoreService';
import { EnterpriseAssetManagement } from '../eam';
import { Boxes } from 'lucide-react';

interface AssetTrackingScreenProps {
  
  userSession: UserSession;
  activeCompany?: CompanyTenant | null;
  sites?: SiteRecord[];
  onNavigate?: any;
  employees?: EmployeeRecord[];
  isDark?: boolean;
}

export const AssetTrackingScreen: React.FC<AssetTrackingScreenProps> = ({
  activeCompany,
  userSession,
  sites = [],
  employees = [],
  isDark = false
}) => {
  const companyId = activeCompany?.companyId || userSession?.companyId || '';
  const [liveSites, setLiveSites] = useState<SiteRecord[]>(sites);
  const [liveEmployees, setLiveEmployees] = useState<EmployeeRecord[]>(employees);

  useEffect(() => {
    if (sites.length === 0 && companyId) {
      const unsub = FirestoreService.subscribeToSites(companyId, setLiveSites);
      return () => unsub();
    }
  }, [companyId, sites.length]);

  useEffect(() => {
    if (employees.length === 0 && companyId) {
      const unsub = FirestoreService.subscribeToEmployees(userSession, companyId, setLiveEmployees);
      return () => unsub();
    }
  }, [companyId, employees.length, userSession]);

  return (
    <div className={`h-full flex flex-col ${isDark ? 'dark' : ''}`}>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Boxes className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
            Enterprise Asset Management
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            End-to-end asset lifecycle, deployment, custody tracking, and condition monitoring
          </p>
        </div>
      </div>
      
      <div className="flex-1 overflow-auto">
        <EnterpriseAssetManagement 
          session={userSession}
          companyId={companyId}
          sites={liveSites}
          employees={liveEmployees}
        />
      </div>
    </div>
  );
};
