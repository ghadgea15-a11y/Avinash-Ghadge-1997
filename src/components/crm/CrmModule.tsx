import React, { useState } from 'react';
import { UserSession, CompanyTenant } from '../../types';
import { Building2, FileText, LayoutDashboard, Settings } from 'lucide-react';

import { CrmDashboardTab } from './CrmDashboardTab';
import { ClientDirectoryTab } from './ClientDirectoryTab';
import { ContractRegisterTab } from './ContractRegisterTab';
import { SlaScorecardTab } from './SlaScorecardTab';
import { BillingRatesTab } from './BillingRatesTab';
import { Receipt } from 'lucide-react';
import { Target } from 'lucide-react';

interface CrmModuleProps {
  session: UserSession;
  company: CompanyTenant;
}

export const CrmModule: React.FC<CrmModuleProps> = ({ session, company }) => {
  const [activeTab, setActiveTab] = useState<'DASHBOARD' | 'CLIENTS' | 'CONTRACTS' | 'SLA' | 'BILLING'>('DASHBOARD');

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-fade-in">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Building2 className="w-6 h-6 text-indigo-600" /> 
            CRM & Contracts
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Manage client directory, contacts, service scopes, and contract lifecycle.</p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="border-b border-slate-200 bg-white dark:bg-slate-950 p-2">
          <nav className="flex space-x-2">
            <NavItem 
              active={activeTab === 'DASHBOARD'} 
              onClick={() => setActiveTab('DASHBOARD')} 
              icon={<LayoutDashboard className="h-4 w-4" />} 
              label="Dashboard" 
            />
            <NavItem 
              active={activeTab === 'CLIENTS'} 
              onClick={() => setActiveTab('CLIENTS')} 
              icon={<Building2 className="h-4 w-4" />} 
              label="Client Directory" 
            />
            <NavItem 
              active={activeTab === 'CONTRACTS'} 
              onClick={() => setActiveTab('CONTRACTS')} 
              icon={<FileText className="h-4 w-4" />} 
              label="Contracts Register" 
            />
          </nav>
        </div>
        
        <div className="p-6">
          {activeTab === 'DASHBOARD' && <CrmDashboardTab session={session} company={company} onNavigate={setActiveTab} />}
          {activeTab === 'CLIENTS' && <ClientDirectoryTab session={session} company={company} />}
          {activeTab === 'CONTRACTS' && <ContractRegisterTab session={session} company={company} />}
          {activeTab === 'SLA' && <SlaScorecardTab session={session} company={company} />}
          {activeTab === 'BILLING' && <BillingRatesTab session={session} company={company} />}
        </div>
      </div>
    </div>
  );
};


function NavItem({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
        active 
          ? 'bg-indigo-50 text-indigo-700' 
          : 'text-slate-600 hover:bg-slate-100 hover:text-black'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
