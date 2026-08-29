import React, { useState } from 'react';
import { CompanyTenant, UserSession, PhaseAScreen } from '../../types';
import { CalendarDays, Clock, Network, ShieldAlert } from 'lucide-react';
import { ShiftMaster } from '../wfm/ShiftMaster';
import { RosterScheduler } from '../wfm/RosterScheduler';
import { WorkforceCapacityPlanningScreen } from './WorkforceCapacityPlanningScreen';
import { EnterpriseConflictManagementScreen } from './EnterpriseConflictManagementScreen';

interface Props {
  userSession: UserSession;
  activeCompany: CompanyTenant;
  isOnline: boolean;
  onNavigate?: (screen: PhaseAScreen) => void;
}

export const ShiftRosterScreen: React.FC<Props> = ({ userSession, activeCompany, isOnline, onNavigate }) => {
  const [activeTab, setActiveTab] = useState<'SCHEDULER' | 'SHIFTS' | 'CAPACITY' | 'CONFLICTS'>('SCHEDULER');

  return (
    <div className="flex-1 flex flex-col w-full h-full overflow-hidden bg-white dark:bg-slate-950">
      {/* Tab Navigation */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 shrink-0">
        <div className="max-w-7xl mx-auto flex items-center gap-8 overflow-x-auto">
          <button
            onClick={() => setActiveTab('SCHEDULER')}
            className={`flex items-center gap-2 py-4 text-sm font-bold border-b-2 whitespace-nowrap transition-all ${
              activeTab === 'SCHEDULER'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-black dark:hover:text-slate-300'
            }`}
          >
            <CalendarDays className="w-4 h-4" />
            Shift Roster
          </button>
          <button
            onClick={() => setActiveTab('SHIFTS')}
            className={`flex items-center gap-2 py-4 text-sm font-bold border-b-2 whitespace-nowrap transition-all ${
              activeTab === 'SHIFTS'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-black dark:hover:text-slate-300'
            }`}
          >
            <Clock className="w-4 h-4" />
            Shift Master
          </button>
          <button
            onClick={() => setActiveTab('CAPACITY')}
            className={`flex items-center gap-2 py-4 text-sm font-bold border-b-2 whitespace-nowrap transition-all ${
              activeTab === 'CAPACITY'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-black dark:hover:text-slate-300'
            }`}
          >
            <Network className="w-4 h-4" />
            Capacity Planning
          </button>
          <button
            onClick={() => setActiveTab('CONFLICTS')}
            className={`flex items-center gap-2 py-4 text-sm font-bold border-b-2 whitespace-nowrap transition-all ${
              activeTab === 'CONFLICTS'
                ? 'border-rose-600 text-rose-600 dark:text-rose-400'
                : 'border-transparent text-slate-500 hover:text-black dark:hover:text-slate-300'
            }`}
          >
            <ShieldAlert className="w-4 h-4 text-rose-500" />
            Conflict Engine
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'SCHEDULER' ? (
          <div className="p-6 max-w-7xl mx-auto">
            <RosterScheduler userSession={userSession} activeCompany={activeCompany} isOnline={isOnline} />
          </div>
        ) : activeTab === 'SHIFTS' ? (
          <div className="p-6 max-w-7xl mx-auto">
            <ShiftMaster userSession={userSession} activeCompany={activeCompany} />
          </div>
        ) : activeTab === 'CAPACITY' ? (
          <WorkforceCapacityPlanningScreen userSession={userSession} activeCompany={activeCompany} isOnline={isOnline} />
        ) : (
          <div className="p-6 max-w-7xl mx-auto">
            <EnterpriseConflictManagementScreen userSession={userSession} activeCompany={activeCompany} isOnline={isOnline} />
          </div>
        )}
      </div>
    </div>
  );
};
