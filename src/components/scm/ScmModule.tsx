import React, { useState, useEffect } from 'react';
import { UserSession, CompanyTenant } from '../../types';
import { Package, MapPin, ClipboardList, LogOut, Search, Plus, List } from 'lucide-react';
import { ItemMasterTab } from './ItemMasterTab';
import { StockLedgerTab } from './StockLedgerTab';
import { GatePassTab } from './GatePassTab';
import { GateVerificationTab } from './GateVerificationTab';
import { StockLocationTab } from './StockLocationTab';
import { InventoryDashboardTab } from './InventoryDashboardTab';
import { TransferOrderTab } from './TransferOrderTab';
import { ArrowRightLeft } from 'lucide-react';
import { LayoutDashboard } from 'lucide-react';

interface ScmModuleProps {
  session: UserSession;
  company: CompanyTenant;
}

export function ScmModule({ session, company }: ScmModuleProps) {
  const [activeTab, setActiveTab] = useState<'DASHBOARD' | 'ITEMS' | 'LOCATIONS' | 'LEDGER' | 'TRANSFER_ORDERS' | 'GATE_PASS' | 'GATE_VERIFY'>('DASHBOARD');

  return (
    <div className="flex h-full flex-col bg-white dark:bg-slate-950">
      <div className="flex items-center gap-4 border-b border-slate-200 bg-white dark:bg-slate-900 px-6 py-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-blue-700">
          <Package className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-black dark:text-white">Supply Chain & Inventory</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Material Gate Passes & Stock Ledger</p>
        </div>
      </div>

      <div className="flex h-[calc(100%-73px)]">
        {/* Sidebar Nav */}
        <div className="w-64 border-r border-slate-200 bg-white dark:bg-slate-900 p-4">
          <nav className="flex flex-col gap-1">
            <NavItem 
              active={activeTab === 'DASHBOARD'} 
              onClick={() => setActiveTab('DASHBOARD')} 
              icon={<LayoutDashboard className="h-4 w-4" />} 
              label="Dashboard & Alerts" 
            />
            <NavItem 
              active={activeTab === 'ITEMS'} 
              onClick={() => setActiveTab('ITEMS')} 
              icon={<Package className="h-4 w-4" />} 
              label="Item Master" 
            />
            <NavItem 
              active={activeTab === 'LOCATIONS'} 
              onClick={() => setActiveTab('LOCATIONS')} 
              icon={<MapPin className="h-4 w-4" />} 
              label="Stock Locations" 
            />
            <NavItem 
              active={activeTab === 'LEDGER'} 
              onClick={() => setActiveTab('LEDGER')} 
              icon={<ClipboardList className="h-4 w-4" />} 
              label="Stock Ledger" 
            />
            <NavItem 
              active={activeTab === 'GATE_PASS'} 
              onClick={() => setActiveTab('GATE_PASS')} 
              icon={<LogOut className="h-4 w-4" />} 
              label="Gate Passes" 
            />
            <NavItem 
              active={activeTab === 'GATE_VERIFY'} 
              onClick={() => setActiveTab('GATE_VERIFY')} 
              icon={<Search className="h-4 w-4" />} 
              label="Gate Verification" 
            />
          </nav>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-auto bg-white dark:bg-slate-950 p-6">
          {activeTab === 'DASHBOARD' && <InventoryDashboardTab session={session} company={company} />}
          {activeTab === 'ITEMS' && <ItemMasterTab session={session} company={company} />}
          {activeTab === 'LOCATIONS' && <StockLocationTab session={session} company={company} />}
          {activeTab === 'LEDGER' && <StockLedgerTab session={session} company={company} />}
          {activeTab === 'GATE_PASS' && <GatePassTab session={session} company={company} />}
          {activeTab === 'GATE_VERIFY' && <GateVerificationTab session={session} company={company} />}
          {activeTab === 'TRANSFER_ORDERS' && <TransferOrderTab session={session} company={company} />}
        </div>
      </div>
    </div>
  );
}

function NavItem({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
        active 
          ? 'bg-blue-50 text-blue-700' 
          : 'text-slate-600 hover:bg-slate-100 hover:text-black'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
