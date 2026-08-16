import React, { useState } from 'react';
import { CompanyTenant, UserSession } from '../../types';
import { CalendarDays, Clock, LayoutDashboard } from 'lucide-react';
import { ShiftMaster } from '../wfm/ShiftMaster';
import { RosterScheduler } from '../wfm/RosterScheduler';

interface Props {
  userSession: UserSession;
  activeCompany: CompanyTenant;
  isOnline: boolean;
}

export const ShiftRosterScreen: React.FC<Props> = ({ userSession, activeCompany, isOnline }) => {
  const [activeTab, setActiveTab] = useState<'SCHEDULER' | 'SHIFTS'>('SCHEDULER');

  return (
    <div className="flex-1 flex flex-col w-full h-full overflow-hidden bg-slate-50 dark:bg-slate-950">
      {/* Tab Navigation */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6">
        <div className="max-w-7xl mx-auto flex items-center gap-8">
          <button
            onClick={() => setActiveTab('SCHEDULER')}
            className={`flex items-center gap-2 py-4 text-sm font-bold border-b-2 transition-all ${
              activeTab === 'SCHEDULER'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
          >
            <CalendarDays className="w-4 h-4" />
            Shift Roster
          </button>
          <button
            onClick={() => setActiveTab('SHIFTS')}
            className={`flex items-center gap-2 py-4 text-sm font-bold border-b-2 transition-all ${
              activeTab === 'SHIFTS'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
          >
            <Clock className="w-4 h-4" />
            Shift Master
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-7xl mx-auto">
          {activeTab === 'SCHEDULER' ? (
            <RosterScheduler userSession={userSession} activeCompany={activeCompany} isOnline={isOnline} />
          ) : (
            <ShiftMaster userSession={userSession} activeCompany={activeCompany} />
          )}
        </div>
      </div>
    </div>
  );
};
