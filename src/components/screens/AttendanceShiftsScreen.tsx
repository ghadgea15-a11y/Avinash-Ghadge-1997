import React, { useState } from 'react';
import { UserSession, CompanyTenant, PhaseAScreen } from '../../types';
import { LayoutDashboard, Users, Fingerprint, TrendingUp } from 'lucide-react';
import { AttendanceDashboard } from '../wfm/AttendanceDashboard';
import { MusterRegister } from '../wfm/MusterRegister';
import { EmployeePunch } from '../wfm/EmployeePunch';
import { OvertimeDashboard } from '../wfm/OvertimeDashboard';

interface AttendanceShiftsScreenProps {
  userSession: UserSession;
  activeCompany: CompanyTenant | null;
  isOnline: boolean;
  onNavigate: (screen: PhaseAScreen) => void;
}

export const AttendanceShiftsScreen: React.FC<AttendanceShiftsScreenProps> = ({
  userSession,
  activeCompany,
  isOnline,
  onNavigate
}) => {
  const company = activeCompany || ({ companyId: userSession.companyId } as CompanyTenant);
  const [activeTab, setActiveTab] = useState<'DASHBOARD' | 'MUSTER' | 'PUNCH' | 'OVERTIME'>('DASHBOARD');

  return (
    <div className="flex-1 flex flex-col w-full h-full overflow-hidden bg-slate-50 dark:bg-slate-950">
      {/* Tab Navigation */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6">
        <div className="max-w-7xl mx-auto flex items-center gap-8 overflow-x-auto scrollbar-none">
          <button
            onClick={() => setActiveTab('DASHBOARD')}
            className={`flex items-center gap-2 py-4 text-sm font-bold border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'DASHBOARD'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            Dashboard
          </button>
          
          <button
            onClick={() => setActiveTab('MUSTER')}
            className={`flex items-center gap-2 py-4 text-sm font-bold border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'MUSTER'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
          >
            <Users className="w-4 h-4" />
            Muster Register
          </button>

          <button
            onClick={() => setActiveTab('OVERTIME')}
            className={`flex items-center gap-2 py-4 text-sm font-bold border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'OVERTIME'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            Overtime & Late Engine
          </button>

          <button
            onClick={() => setActiveTab('PUNCH')}
            className={`flex items-center gap-2 py-4 text-sm font-bold border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'PUNCH'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
          >
            <Fingerprint className="w-4 h-4" />
            My Attendance
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        <div className="max-w-7xl mx-auto">
          {activeTab === 'DASHBOARD' && (
            <AttendanceDashboard userSession={userSession} activeCompany={company} />
          )}
          {activeTab === 'MUSTER' && (
            <MusterRegister userSession={userSession} activeCompany={company} />
          )}
          {activeTab === 'OVERTIME' && (
            <OvertimeDashboard userSession={userSession} activeCompany={company} />
          )}
          {activeTab === 'PUNCH' && (
            <EmployeePunch userSession={userSession} activeCompany={company} />
          )}
        </div>
      </div>
    </div>
  );
};
