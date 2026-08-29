import React, { useState, useEffect } from 'react';
import { CompanyTenant, EmployeeRecord, ShiftRecord, SiteRecord, UserSession } from '../../types';
import { FirestoreService } from '../../services/firestoreService';
import { BiometricHubDashboard } from '../biometric/BiometricHubDashboard';
import { RefreshCw } from 'lucide-react';
import { db } from '../../firebase';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';

interface BiometricHubScreenProps {
  userSession: UserSession | null;
  activeCompany: CompanyTenant | null;
  onNavigate?: (screen: any) => void;
}

export const BiometricHubScreen: React.FC<BiometricHubScreenProps> = ({
  userSession,
  activeCompany,
  onNavigate
}) => {
  const [sites, setSites] = useState<SiteRecord[]>([]);
  const [employees, setEmployees] = useState<EmployeeRecord[]>([]);
  const [shifts, setShifts] = useState<ShiftRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const companyId = activeCompany?.companyId || userSession?.companyId || '';

  useEffect(() => {
    if (!companyId) return;

    let isMounted = true;
    const loadMasterData = async () => {
      setLoading(true);
      try {
        const [sitesSnap, empSnap, shiftsData] = await Promise.all([
          getDocs(collection(db, 'companies', companyId, 'sites')),
          getDocs(collection(db, 'companies', companyId, 'employees')),
          FirestoreService.getShifts(companyId)
        ]);

        if (isMounted) {
          const sitesList: SiteRecord[] = sitesSnap.docs.map(d => ({ id: d.id, ...d.data() } as SiteRecord));
          const empList: EmployeeRecord[] = empSnap.docs.map(d => ({ id: d.id, ...d.data() } as EmployeeRecord));
          
          setSites(sitesList);
          setEmployees(empList);
          setShifts(shiftsData || []);
        }
      } catch (err) {
        console.warn('[BiometricHubScreen] Failed to load master data:', err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadMasterData();
    return () => {
      isMounted = false;
    };
  }, [companyId]);

  if (!userSession || !companyId) {
    return (
      <div className="p-8 text-center text-slate-500 dark:text-slate-400">
        Please sign in and select a company tenant to manage biometric devices.
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-16 flex flex-col items-center justify-center space-y-3 text-slate-400">
        <RefreshCw className="w-8 h-8 animate-spin text-amber-400" />
        <p className="text-sm">Loading Universal Biometric Integration Hub...</p>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      <BiometricHubDashboard
        session={userSession}
        companyId={companyId}
        sites={sites}
        employees={employees}
        shifts={shifts}
      />
    </div>
  );
};
