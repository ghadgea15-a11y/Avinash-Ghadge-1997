import { AttendanceRules } from "../wfm/AttendanceRules";
import React, { useState, useEffect } from 'react';
import { CompanyTenant, UserSession, PhaseAScreen, AttendanceRecord } from '../../types';
import { FirestoreService } from '../../services/firestoreService';
import { 
  CalendarDays, Clock, MapPin, CheckCircle2, UserCheck, 
  Settings2, AlertCircle, RefreshCw, XCircle, FileText, Search
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useFeedback } from '../../context/ActionFeedbackContext';

// Feature components (we will build them inline to avoid token limits)
import { PunchStation } from '../wfm/PunchStation';
import { SupervisorRollCall } from '../wfm/SupervisorRollCall';
import { AttendanceLogs } from '../wfm/AttendanceLogs';
import { AttendanceAdjustmentWorkflow } from '../wfm/AttendanceAdjustmentWorkflow';

interface Props {
  userSession: UserSession;
  activeCompany: CompanyTenant | null;
  isOnline: boolean;
  onNavigate?: (screen: PhaseAScreen) => void;
}

export const AttendanceShiftsScreen: React.FC<Props> = ({ 
  userSession, activeCompany, isOnline, onNavigate 
}) => {
  const { isDark } = useTheme();
  const [activeTab, setActiveTab] = useState<'PUNCH' | 'LOGS' | 'ROLL_CALL' | 'REGULARIZATION' | 'RULES'>('PUNCH');

  const isAdminOrHR = ['PLATFORM_SUPER_ADMIN', 'COMPANY_ADMIN', 'HR_MANAGER'].includes(userSession.role);
  const isSupervisor = isAdminOrHR || ['SUPERVISOR', 'SITE_INCHARGE'].includes(userSession.role);

  if (!activeCompany) {
    return <div className="p-8 text-center text-rose-500">No active company context found.</div>;
  }

  return (
    <div className="flex-1 flex flex-col w-full h-full overflow-hidden bg-white dark:bg-slate-950">
      {/* Header & Tabs */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 shrink-0 z-10">
        <div className="max-w-7xl mx-auto flex items-center gap-8 overflow-x-auto">
          {(isSupervisor || isAdminOrHR) && (<button
            onClick={() => setActiveTab('REGULARIZATION')}
            className={`flex items-center gap-2 py-4 text-sm font-bold border-b-2 whitespace-nowrap transition-all ${
              activeTab === 'REGULARIZATION'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-black dark:hover:text-slate-300'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            Regularization
          </button>)}

          {isAdminOrHR && (
            <button
              onClick={() => setActiveTab('RULES')}
              className={`flex items-center gap-2 py-4 text-sm font-bold border-b-2 whitespace-nowrap transition-all ${
                activeTab === 'RULES'
                  ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                  : 'border-transparent text-slate-500 hover:text-black dark:hover:text-slate-300'
              }`}
            >
              <Settings2 className="w-4 h-4" />
              WFM Rules
            </button>
          )}
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-950 p-6">
        <div className="max-w-7xl mx-auto h-full">
          {activeTab === 'PUNCH' && (
            <PunchStation userSession={userSession} activeCompany={activeCompany} />
          )}
          {activeTab === 'ROLL_CALL' && isSupervisor && (
            <SupervisorRollCall userSession={userSession} activeCompany={activeCompany} />
          )}
          {activeTab === 'LOGS' && (
            <AttendanceLogs userSession={userSession} activeCompany={activeCompany} />
          )}
          {activeTab === 'REGULARIZATION' && (isSupervisor || isAdminOrHR) && (
            <AttendanceAdjustmentWorkflow userSession={userSession} companyId={activeCompany.companyId} />
          )}
          {activeTab === 'RULES' && isAdminOrHR && (
            <AttendanceRules userSession={userSession} activeCompany={activeCompany} />
          )}
        </div>
      </div>
    </div>
  );
};
