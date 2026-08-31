
import React, { useState, useEffect } from 'react';
import { useBackNavigation } from '../../hooks/useBackNavigation';
import { CompanyTenant, UserSession, EmployeeRecord, SalaryStructureRecord, SalaryProfileRecord, PayrollCycleRecord, PayrollRecord, StatutoryConfigRecord, PtSlab } from '../../types';
import { Calculator, FileText, Settings, Users, CheckCircle, Clock, Search, Plus, Play, FileCheck, Download, ShieldCheck, Landmark, Edit2, Save, X } from 'lucide-react';
import { PayslipModal } from './PayslipModal';
import { FirestoreService } from '../../services/firestoreService';
import { PayrollWorkflowService } from '../../services/payrollWorkflowService';
import { StatutoryRulesService, DEFAULT_STATE_STATUTORY_CONFIGS } from '../../services/statutoryRulesService';

interface Props {
  userSession: UserSession;
  activeCompany: CompanyTenant;
  isOnline: boolean;
}

export const PayrollCompensationScreen: React.FC<Props> = ({ userSession, activeCompany, isOnline }) => {
  const [activeTab, setActiveTab] = useState<'CYCLES' | 'STRUCTURES' | 'PROFILES' | 'PAYSLIPS' | 'STATUTORY'>('CYCLES');
  const [isLoading, setIsLoading] = useState(true);
  
  const [employees, setEmployees] = useState<EmployeeRecord[]>([]);
  const [structures, setStructures] = useState<SalaryStructureRecord[]>([]);
  const [profiles, setProfiles] = useState<SalaryProfileRecord[]>([]);
  const [cycles, setCycles] = useState<PayrollCycleRecord[]>([]);
  
  // Statutory configs state
  const [statutoryConfigs, setStatutoryConfigs] = useState<StatutoryConfigRecord[]>([]);
  const [selectedStatutoryState, setSelectedStatutoryState] = useState<string>('MAHARASHTRA');
  useBackNavigation(!!selectedStatutoryState, () => setSelectedStatutoryState(null as any), 'selectedStatutoryState');
  const [editingStatutory, setEditingStatutory] = useState<StatutoryConfigRecord | null>(null);
  useBackNavigation(!!editingStatutory, () => setEditingStatutory(null as any), 'editingStatutory');
  const [isSavingStatutory, setIsSavingStatutory] = useState(false);

  // Payslips state
  const [selectedCycleId, setSelectedCycleId] = useState<string>('');
  useBackNavigation(!!selectedCycleId, () => setSelectedCycleId(null as any), 'selectedCycleId');
  const [payrollRecords, setPayrollRecords] = useState<PayrollRecord[]>([]);
  const [viewingPayslip, setViewingPayslip] = useState<PayrollRecord | null>(null);

  // New Structure State
  const [showStructureModal, setShowStructureModal] = useState(false);
  useBackNavigation(!!showStructureModal, () => setShowStructureModal(null as any), 'showStructureModal');
  const [editingStructure, setEditingStructure] = useState<Partial<SalaryStructureRecord>>({});
  useBackNavigation(!!editingStructure, () => setEditingStructure(null as any), 'editingStructure');

  // Run Cycle State
  const [showRunModal, setShowRunModal] = useState(false);
  useBackNavigation(!!showRunModal, () => setShowRunModal(null as any), 'showRunModal');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  useBackNavigation(!!selectedMonth, () => setSelectedMonth(null as any), 'selectedMonth');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  useBackNavigation(!!selectedYear, () => setSelectedYear(null as any), 'selectedYear');

  useEffect(() => {
    if (!activeCompany) return;
    const cid = activeCompany.companyId;
    
    const unsubs = [
      FirestoreService.subscribeToEmployees(userSession, cid, setEmployees),
      FirestoreService.subscribeToSalaryStructures(cid, setStructures),
      FirestoreService.subscribeToSalaryProfiles(cid, setProfiles),
      FirestoreService.subscribeToPayrollCycles(cid, setCycles)
    ];

    // Load statutory configs
    StatutoryRulesService.getCompanyStatutoryConfigs(cid).then(configs => {
      setStatutoryConfigs(configs);
      const initial = configs.find(c => c.state === 'MAHARASHTRA') || configs[0] || DEFAULT_STATE_STATUTORY_CONFIGS.MAHARASHTRA;
      setEditingStatutory(JSON.parse(JSON.stringify(initial)));
    });

    setIsLoading(false);
    return () => unsubs.forEach(u => u());
  }, [activeCompany, userSession]);

  useEffect(() => {
    if (!activeCompany || !selectedCycleId) {
      setPayrollRecords([]);
      return;
    }
    const unsub = FirestoreService.subscribeToPayrollRecords(activeCompany.companyId, selectedCycleId, setPayrollRecords);
    return () => unsub();
  }, [activeCompany, selectedCycleId]);

  const handleSelectStateConfig = (stateKey: string) => {
    setSelectedStatutoryState(stateKey);
    const existing = statutoryConfigs.find(c => c.state === stateKey);
    if (existing) {
      setEditingStatutory(JSON.parse(JSON.stringify(existing)));
    } else {
      const def = DEFAULT_STATE_STATUTORY_CONFIGS[stateKey] || DEFAULT_STATE_STATUTORY_CONFIGS.DEFAULT;
      setEditingStatutory(JSON.parse(JSON.stringify({ ...def, companyId: activeCompany.companyId })));
    }
  };

  const handleSaveStatutoryConfig = async () => {
    if (!editingStatutory || !activeCompany) return;
    setIsSavingStatutory(true);
    try {
      const ok = await StatutoryRulesService.saveStatutoryConfig(
        activeCompany.companyId, 
        editingStatutory, 
        { id: userSession.userId, name: userSession.fullName || userSession.email || 'Admin' }
      );
      if (ok) {
        alert(`Statutory rules for ${editingStatutory.stateName || editingStatutory.state} saved successfully!`);
        const updated = await StatutoryRulesService.getCompanyStatutoryConfigs(activeCompany.companyId);
        setStatutoryConfigs(updated);
      } else {
        alert('Failed to save statutory rules.');
      }
    } catch (e: any) {
      alert(e.message);
    } finally {
      setIsSavingStatutory(false);
    }
  };

  const handleAddPtSlab = () => {
    if (!editingStatutory) return;
    const newSlabs = [...(editingStatutory.ptSlabs || [])];
    const lastSlab = newSlabs[newSlabs.length - 1];
    const nextMin = lastSlab ? lastSlab.maxSalary + 1 : 0;
    newSlabs.push({ minSalary: nextMin, maxSalary: 99999999, amount: 200 });
    setEditingStatutory({ ...editingStatutory, ptSlabs: newSlabs });
  };

  const handleRemovePtSlab = (idx: number) => {
    if (!editingStatutory) return;
    const newSlabs = editingStatutory.ptSlabs.filter((_, i) => i !== idx);
    setEditingStatutory({ ...editingStatutory, ptSlabs: newSlabs });
  };

  const handlePtSlabChange = (idx: number, field: keyof PtSlab, val: any) => {
    if (!editingStatutory) return;
    const newSlabs = [...editingStatutory.ptSlabs];
    newSlabs[idx] = { ...newSlabs[idx], [field]: Number(val) };
    setEditingStatutory({ ...editingStatutory, ptSlabs: newSlabs });
  };

  const handleSaveStructure = async () => {
    if (!editingStructure.name) return alert('Name is required');
    try {
      await FirestoreService.saveSalaryStructure(activeCompany.companyId, editingStructure);
      setShowStructureModal(false);
      setEditingStructure({});
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleRunPayroll = async () => {
    try {
      await PayrollWorkflowService.calculatePayrollCycle(
        activeCompany.companyId,
        selectedMonth,
        selectedYear,
        { id: userSession.userId, name: userSession.fullName || userSession.email || 'System' }
      );
      setShowRunModal(false);
      alert('Payroll calculated successfully with dynamic statutory state rules!');
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleApproveCycle = async (cycleId: string) => {
    if (!window.confirm('Are you sure you want to approve and lock this cycle?')) return;
    try {
      await PayrollWorkflowService.approvePayrollCycle(
        activeCompany.companyId,
        cycleId,
        { id: userSession.userId, name: userSession.fullName || userSession.email || 'System' }
      );
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleProfileChange = async (empId: string, field: string, value: any) => {
    const existing = profiles.find(p => p.employeeId === empId) || { employeeId: empId };
    try {
      await FirestoreService.saveSalaryProfile(activeCompany.companyId, {
        ...existing,
        [field]: field === 'baseMonthlySalary' ? Number(value) : value,
        companyId: activeCompany.companyId
      });
    } catch (e: any) {
      console.error(e);
    }
  };

  const handleDownloadPayslip = (record: PayrollRecord) => {
    setViewingPayslip(record);
  };

  if (isLoading) return <div className="p-8">Loading Payroll...</div>;

  const statesList = [
    { key: 'MAHARASHTRA', label: 'Maharashtra' },
    { key: 'KARNATAKA', label: 'Karnataka' },
    { key: 'GUJARAT', label: 'Gujarat' },
    { key: 'TELANGANA', label: 'Telangana' },
    { key: 'WEST_BENGAL', label: 'West Bengal' },
    { key: 'DELHI', label: 'Delhi (NCR)' },
    { key: 'DEFAULT', label: 'National Default' }
  ];

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 dark:bg-slate-950 overflow-hidden">
      
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 p-6 shrink-0">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Payroll & Compensation</h1>
            <p className="text-sm text-slate-500">Manage salary structures, statutory deduction rules (PF/ESI/PT/TDS), and payroll cycles</p>
          </div>
          <div className="flex items-center gap-3">
            {activeTab === 'CYCLES' && (
              <button
                onClick={() => setShowRunModal(true)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg flex items-center gap-2 text-sm font-medium transition-colors"
              >
                <Play className="w-4 h-4" /> Run Payroll
              </button>
            )}
            {activeTab === 'STRUCTURES' && (
              <button
                onClick={() => { setEditingStructure({ basicPercentage: 50, hraPercentage: 40, pfPercentage: 12, esiPercentage: 0, status: 'ACTIVE' }); setShowStructureModal(true); }}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg flex items-center gap-2 text-sm font-medium transition-colors"
              >
                <Plus className="w-4 h-4" /> Add Structure
              </button>
            )}
          </div>
        </div>
        
        {/* Tabs */}
        <div className="max-w-7xl mx-auto mt-6 flex gap-6 border-b border-slate-200 dark:border-slate-800 overflow-x-auto">
          <button
            onClick={() => setActiveTab('CYCLES')}
            className={`pb-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${activeTab === 'CYCLES' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
          >
            Payroll Cycles
          </button>
          <button
            onClick={() => setActiveTab('STRUCTURES')}
            className={`pb-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${activeTab === 'STRUCTURES' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
          >
            Salary Structures
          </button>
          <button
            onClick={() => setActiveTab('STATUTORY')}
            className={`pb-3 text-sm font-medium border-b-2 whitespace-nowrap flex items-center gap-1.5 transition-colors ${activeTab === 'STATUTORY' ? 'border-indigo-600 text-indigo-600 font-semibold' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
          >
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            Statutory Rules (PF / ESI / PT / TDS)
          </button>
          <button
            onClick={() => setActiveTab('PROFILES')}
            className={`pb-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${activeTab === 'PROFILES' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
          >
            Employee Profiles
          </button>
          <button
            onClick={() => setActiveTab('PAYSLIPS')}
            className={`pb-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${activeTab === 'PAYSLIPS' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
          >
            Payslips & Reports
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          
          {/* STATUTORY RULES TAB */}
          {activeTab === 'STATUTORY' && (
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              
              {/* State Selection Sidebar */}
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm h-fit">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Landmark className="w-4 h-4 text-indigo-600" /> State Rule Sets
                </h3>
                <div className="space-y-1.5">
                  {statesList.map(st => {
                    const isConfigured = statutoryConfigs.some(c => c.state === st.key);
                    return (
                      <button
                        key={st.key}
                        onClick={() => handleSelectStateConfig(st.key)}
                        className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium flex items-center justify-between transition-colors ${
                          selectedStatutoryState === st.key
                            ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400 font-semibold'
                            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                        }`}
                      >
                        <span>{st.label}</span>
                        {isConfigured && (
                          <span className="text-[10px] bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400 px-1.5 py-0.5 rounded font-mono">
                            CUSTOM
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* State Configuration Editor */}
              {editingStatutory && (
                <div className="lg:col-span-3 space-y-6">
                  <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
                      <div>
                        <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                          <ShieldCheck className="w-5 h-5 text-indigo-600" />
                          {editingStatutory.stateName || editingStatutory.state} Statutory Configuration
                        </h2>
                        <p className="text-xs text-slate-500">Configures real-time dynamic deductions applied across all employees assigned to this state.</p>
                      </div>
                      <button
                        onClick={handleSaveStatutoryConfig}
                        disabled={isSavingStatutory}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg flex items-center gap-2 text-sm font-semibold transition-colors disabled:opacity-50"
                      >
                        <Save className="w-4 h-4" /> {isSavingStatutory ? 'Saving...' : 'Save Rules to Database'}
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6">
                      
                      {/* Provident Fund (PF) */}
                      <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700/60 space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="font-bold text-sm text-slate-900 dark:text-white">Provident Fund (EPF)</h4>
                          <label className="flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-300">
                            <input
                              type="checkbox"
                              checked={editingStatutory.pfEnabled}
                              onChange={e => setEditingStatutory({ ...editingStatutory, pfEnabled: e.target.checked })}
                              className="rounded text-indigo-600 focus:ring-indigo-500"
                            />
                            Enabled
                          </label>
                        </div>
                        <div className="grid grid-cols-2 gap-3 text-xs">
                          <div>
                            <label className="block text-slate-500 mb-1">Employee Rate (%)</label>
                            <input
                              type="number"
                              value={editingStatutory.pfEmployeeRate || 12}
                              onChange={e => setEditingStatutory({ ...editingStatutory, pfEmployeeRate: Number(e.target.value) })}
                              className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded"
                            />
                          </div>
                          <div>
                            <label className="block text-slate-500 mb-1">Employer Rate (%)</label>
                            <input
                              type="number"
                              value={editingStatutory.pfEmployerRate || 12}
                              onChange={e => setEditingStatutory({ ...editingStatutory, pfEmployerRate: Number(e.target.value) })}
                              className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded"
                            />
                          </div>
                          <div>
                            <label className="block text-slate-500 mb-1">Wage Ceiling (₹)</label>
                            <input
                              type="number"
                              value={editingStatutory.pfWageCeiling || 15000}
                              onChange={e => setEditingStatutory({ ...editingStatutory, pfWageCeiling: Number(e.target.value) })}
                              className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded"
                            />
                          </div>
                          <div>
                            <label className="block text-slate-500 mb-1">Cap Amount (₹/mo)</label>
                            <input
                              type="number"
                              value={editingStatutory.pfCapAmount || 1800}
                              onChange={e => setEditingStatutory({ ...editingStatutory, pfCapAmount: Number(e.target.value) })}
                              className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded"
                            />
                          </div>
                        </div>
                        <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300 pt-1">
                          <input
                            type="checkbox"
                            checked={editingStatutory.pfCappedAtCeiling}
                            onChange={e => setEditingStatutory({ ...editingStatutory, pfCappedAtCeiling: e.target.checked })}
                            className="rounded text-indigo-600 focus:ring-indigo-500"
                          />
                          Enforce Wage Ceiling Cap (₹1,800 max)
                        </label>
                      </div>

                      {/* ESIC */}
                      <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700/60 space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="font-bold text-sm text-slate-900 dark:text-white">ESIC (Employee State Insurance)</h4>
                          <label className="flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-300">
                            <input
                              type="checkbox"
                              checked={editingStatutory.esiEnabled}
                              onChange={e => setEditingStatutory({ ...editingStatutory, esiEnabled: e.target.checked })}
                              className="rounded text-indigo-600 focus:ring-indigo-500"
                            />
                            Enabled
                          </label>
                        </div>
                        <div className="grid grid-cols-2 gap-3 text-xs">
                          <div>
                            <label className="block text-slate-500 mb-1">Employee Rate (%)</label>
                            <input
                              type="number"
                              step="0.01"
                              value={editingStatutory.esiEmployeeRate || 0.75}
                              onChange={e => setEditingStatutory({ ...editingStatutory, esiEmployeeRate: Number(e.target.value) })}
                              className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded"
                            />
                          </div>
                          <div>
                            <label className="block text-slate-500 mb-1">Employer Rate (%)</label>
                            <input
                              type="number"
                              step="0.01"
                              value={editingStatutory.esiEmployerRate || 3.25}
                              onChange={e => setEditingStatutory({ ...editingStatutory, esiEmployerRate: Number(e.target.value) })}
                              className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded"
                            />
                          </div>
                          <div className="col-span-2">
                            <label className="block text-slate-500 mb-1">Gross Wage Eligibility Threshold (₹/mo)</label>
                            <input
                              type="number"
                              value={editingStatutory.esiWageCeiling || 21000}
                              onChange={e => setEditingStatutory({ ...editingStatutory, esiWageCeiling: Number(e.target.value) })}
                              className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded"
                            />
                            <span className="text-[10px] text-slate-400 mt-1 block">Employees with gross pay &gt; ₹21,000 are automatically exempt from ESIC deduction.</span>
                          </div>
                        </div>
                      </div>

                      {/* Tax Deducted at Source (TDS) */}
                      <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700/60 space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="font-bold text-sm text-slate-900 dark:text-white">Income Tax (TDS)</h4>
                          <label className="flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-300">
                            <input
                              type="checkbox"
                              checked={editingStatutory.tdsEnabled}
                              onChange={e => setEditingStatutory({ ...editingStatutory, tdsEnabled: e.target.checked })}
                              className="rounded text-indigo-600 focus:ring-indigo-500"
                            />
                            Enabled
                          </label>
                        </div>
                        <div className="grid grid-cols-2 gap-3 text-xs">
                          <div>
                            <label className="block text-slate-500 mb-1">Exemption Monthly Threshold (₹)</label>
                            <input
                              type="number"
                              value={editingStatutory.tdsThreshold || 50000}
                              onChange={e => setEditingStatutory({ ...editingStatutory, tdsThreshold: Number(e.target.value) })}
                              className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded"
                            />
                          </div>
                          <div>
                            <label className="block text-slate-500 mb-1">Standard Default Rate (%)</label>
                            <input
                              type="number"
                              value={editingStatutory.tdsDefaultRate || 5}
                              onChange={e => setEditingStatutory({ ...editingStatutory, tdsDefaultRate: Number(e.target.value) })}
                              className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Professional Tax (PT) Slabs */}
                      <div className="md:col-span-2 p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700/60 space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-bold text-sm text-slate-900 dark:text-white">Professional Tax (PT) State Slabs</h4>
                            <p className="text-xs text-slate-500">Configured slabs dynamically match the employee's gross monthly pay.</p>
                          </div>
                          <div className="flex items-center gap-3">
                            <label className="flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-300">
                              <input
                                type="checkbox"
                                checked={editingStatutory.ptEnabled}
                                onChange={e => setEditingStatutory({ ...editingStatutory, ptEnabled: e.target.checked })}
                                className="rounded text-indigo-600 focus:ring-indigo-500"
                              />
                              PT Applicable
                            </label>
                            {editingStatutory.ptEnabled && (
                              <button
                                onClick={handleAddPtSlab}
                                className="px-2.5 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-xs font-medium text-indigo-600 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-1"
                              >
                                <Plus className="w-3.5 h-3.5" /> Add Slab
                              </button>
                            )}
                          </div>
                        </div>

                        {editingStatutory.ptEnabled && (
                          <div className="overflow-x-auto">
                            <table className="w-full text-xs text-left">
                              <thead className="bg-slate-200/50 dark:bg-slate-700/50 text-slate-600 dark:text-slate-300">
                                <tr>
                                  <th className="p-2.5">Salary From (₹)</th>
                                  <th className="p-2.5">Salary To (₹)</th>
                                  <th className="p-2.5">Monthly Deduction (₹)</th>
                                  <th className="p-2.5">Feb Amount (₹)</th>
                                  <th className="p-2.5 text-center">Action</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                                {(editingStatutory.ptSlabs || []).map((slab, sIdx) => (
                                  <tr key={sIdx} className="hover:bg-white/50 dark:hover:bg-slate-800/50">
                                    <td className="p-2">
                                      <input
                                        type="number"
                                        value={slab.minSalary}
                                        onChange={e => handlePtSlabChange(sIdx, 'minSalary', e.target.value)}
                                        className="w-28 p-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded"
                                      />
                                    </td>
                                    <td className="p-2">
                                      <input
                                        type="number"
                                        value={slab.maxSalary}
                                        onChange={e => handlePtSlabChange(sIdx, 'maxSalary', e.target.value)}
                                        className="w-28 p-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded"
                                      />
                                    </td>
                                    <td className="p-2">
                                      <input
                                        type="number"
                                        value={slab.amount}
                                        onChange={e => handlePtSlabChange(sIdx, 'amount', e.target.value)}
                                        className="w-24 p-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded font-semibold text-rose-600"
                                      />
                                    </td>
                                    <td className="p-2">
                                      <input
                                        type="number"
                                        value={slab.febAmount !== undefined ? slab.febAmount : ''}
                                        placeholder="Optional"
                                        onChange={e => handlePtSlabChange(sIdx, 'febAmount', e.target.value === '' ? undefined : e.target.value)}
                                        className="w-24 p-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded font-mono text-slate-700 dark:text-slate-300"
                                      />
                                    </td>
                                    <td className="p-2 text-center">
                                      <button
                                        onClick={() => handleRemovePtSlab(sIdx)}
                                        className="text-rose-500 hover:text-rose-700 p-1"
                                      >
                                        <X className="w-4 h-4" />
                                      </button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>

                    </div>
                  </div>
                </div>
              )}

            </div>
          )}

          {activeTab === 'CYCLES' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {cycles.length === 0 ? (
                <div className="col-span-full py-12 text-center text-slate-500">
                  <Calculator className="w-12 h-12 mx-auto mb-3 opacity-20" />
                  <p>No payroll cycles found. Run a new payroll cycle to get started.</p>
                </div>
              ) : (
                cycles.sort((a,b) => b.year - a.year || b.month - a.month).map(cycle => (
                  <div key={cycle.id} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white">{cycle.cycleLabel}</h3>
                        <p className="text-xs text-slate-500">Processed: {cycle.processedAt ? new Date(cycle.processedAt).toLocaleDateString() : 'Pending'}</p>
                      </div>
                      <span className={`px-2 py-1 text-xs font-bold rounded-md uppercase tracking-wider ${
                        cycle.status === 'LOCKED' ? 'bg-emerald-100 text-emerald-700' : 
                        cycle.status === 'CALCULATED' ? 'bg-amber-100 text-amber-700' : 
                        'bg-slate-100 text-slate-700'
                      }`}>
                        {cycle.status}
                      </span>
                    </div>
                    
                    <div className="space-y-3 mb-4">
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-500">Employees</span>
                        <span className="font-medium text-slate-900 dark:text-white">{cycle.totalEmployees || 0}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-500">Gross Pay</span>
                        <span className="font-medium text-slate-900 dark:text-white">₹{(cycle.totalGrossPay || 0).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-500">Deductions</span>
                        <span className="font-medium text-rose-600">₹{(cycle.totalDeductions || 0).toLocaleString()}</span>
                      </div>
                      <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-between">
                        <span className="font-bold text-slate-900 dark:text-white">Net Pay</span>
                        <span className="font-bold text-indigo-600 dark:text-indigo-400">₹{(cycle.totalNetPay || 0).toLocaleString()}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 mt-2">
                       {cycle.status === 'CALCULATED' && (
                         <button 
                           onClick={() => handleApproveCycle(cycle.id)}
                           className="w-full py-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400 rounded-lg text-sm font-medium transition-colors"
                         >
                           Approve
                         </button>
                       )}
                       <button 
                         onClick={() => { setSelectedCycleId(cycle.id); setActiveTab('PAYSLIPS'); }}
                         className="w-full py-2 bg-slate-50 text-slate-700 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-300 rounded-lg text-sm font-medium transition-colors"
                       >
                         View Details
                       </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'STRUCTURES' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {structures.map(struct => (
                <div key={struct.id} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">{struct.name}</h3>
                    <button 
                      onClick={() => { setEditingStructure(struct); setShowStructureModal(true); }}
                      className="text-xs text-indigo-600 hover:underline"
                    >
                      Edit
                    </button>
                  </div>
                  {struct.description && <p className="text-sm text-slate-500 mb-4">{struct.description}</p>}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">Basic</span>
                      <span className="font-medium">{struct.basicPercentage}%</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">HRA</span>
                      <span className="font-medium">{struct.hraPercentage}% of Basic</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">PF</span>
                      <span className="font-medium">{struct.pfPercentage}% of Basic</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'PROFILES' && (
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="p-4 font-medium text-slate-500">Employee</th>
                    <th className="p-4 font-medium text-slate-500">Structure</th>
                    <th className="p-4 font-medium text-slate-500">Base Salary / Month (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {employees.map(emp => {
                    const profile = profiles.find(p => p.employeeId === emp.id) || {} as Partial<SalaryProfileRecord>;
                    return (
                      <tr key={emp.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        <td className="p-4">
                          <div className="font-medium text-slate-900 dark:text-white">{emp.firstName} {emp.lastName}</div>
                          <div className="text-xs text-slate-500">{emp.employeeId || emp.id}</div>
                        </td>
                        <td className="p-4">
                          <select 
                            value={profile.structureId || ''}
                            onChange={(e) => handleProfileChange(emp.id!, 'structureId', e.target.value)}
                            className="bg-transparent border border-slate-200 dark:border-slate-700 rounded p-1"
                          >
                            <option value="">-- Select Structure --</option>
                            {structures.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                          </select>
                        </td>
                        <td className="p-4">
                          <input 
                            type="number" 
                            value={profile.baseMonthlySalary || ''}
                            onChange={(e) => handleProfileChange(emp.id!, 'baseMonthlySalary', e.target.value)}
                            className="bg-transparent border border-slate-200 dark:border-slate-700 rounded p-1 w-32"
                            placeholder="e.g. 25000"
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'PAYSLIPS' && (
             <div className="space-y-6">
                <div className="flex items-center gap-4 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Select Cycle</label>
                  <select 
                    value={selectedCycleId} 
                    onChange={e => setSelectedCycleId(e.target.value)}
                    className="border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm bg-transparent"
                  >
                    <option value="">-- Select Payroll Cycle --</option>
                    {cycles.sort((a,b) => b.year - a.year || b.month - a.month).map(c => (
                      <option key={c.id} value={c.id}>{c.cycleLabel} ({c.status})</option>
                    ))}
                  </select>
                </div>
                
                {selectedCycleId && (
                  <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                    {payrollRecords.length === 0 ? (
                       <div className="p-8 text-center text-slate-500">No records found for this cycle.</div>
                    ) : (
                      <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                          <tr>
                            <th className="p-4 font-medium text-slate-500">Employee</th>
                            <th className="p-4 font-medium text-slate-500">Payable Days</th>
                            <th className="p-4 font-medium text-slate-500">Gross</th>
                            <th className="p-4 font-medium text-slate-500">Deductions</th>
                            <th className="p-4 font-medium text-slate-500">Net Pay</th>
                            <th className="p-4 font-medium text-slate-500">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                          {payrollRecords.map(record => (
                            <tr key={record.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                              <td className="p-4 font-medium text-slate-900 dark:text-white flex items-center gap-2">
                                <span>{record.employeeName}</span>
                                {record.calculations?.isEpsExempt && (
                                  <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border border-amber-300/40 rounded-full" title={record.calculations.epsExemptionFlag || 'STAT-AGE-58: EPS Exemption Applied (Age >= 58)'}>
                                    EPS Exempt
                                  </span>
                                )}
                              </td>
                              <td className="p-4">{record.calculations.payableDays}</td>
                              <td className="p-4 text-emerald-600">₹{record.calculations.totalGross.toLocaleString()}</td>
                              <td className="p-4 text-rose-600">₹{record.calculations.totalDeductions.toLocaleString()}</td>
                              <td className="p-4 font-bold text-indigo-600">₹{record.calculations.netPay.toLocaleString()}</td>
                              <td className="p-4">
                                <button 
                                  onClick={() => handleDownloadPayslip(record)}
                                  className="text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
                                >
                                  <Download className="w-4 h-4" /> Payslip
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}
             </div>
          )}

        </div>
      </div>

      {/* Structure Modal */}
      {showStructureModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-xl w-full max-w-md shadow-xl overflow-hidden p-6 space-y-4">
            <h3 className="text-lg font-bold">Salary Structure</h3>
            <div>
              <label className="block text-xs font-medium mb-1">Name</label>
              <input type="text" className="w-full p-2 border rounded dark:bg-slate-800" 
                value={editingStructure.name || ''} 
                onChange={e => setEditingStructure({...editingStructure, name: e.target.value})} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium mb-1">Basic % (of Gross)</label>
                <input type="number" className="w-full p-2 border rounded dark:bg-slate-800" 
                  value={editingStructure.basicPercentage || ''} 
                  onChange={e => setEditingStructure({...editingStructure, basicPercentage: Number(e.target.value)})} />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">HRA % (of Basic)</label>
                <input type="number" className="w-full p-2 border rounded dark:bg-slate-800" 
                  value={editingStructure.hraPercentage || ''} 
                  onChange={e => setEditingStructure({...editingStructure, hraPercentage: Number(e.target.value)})} />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">PF % (of Basic)</label>
                <input type="number" className="w-full p-2 border rounded dark:bg-slate-800" 
                  value={editingStructure.pfPercentage || ''} 
                  onChange={e => setEditingStructure({...editingStructure, pfPercentage: Number(e.target.value)})} />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">ESI % (of Gross)</label>
                <input type="number" className="w-full p-2 border rounded dark:bg-slate-800" 
                  value={editingStructure.esiPercentage || 0} 
                  onChange={e => setEditingStructure({...editingStructure, esiPercentage: Number(e.target.value)})} />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t">
              <button onClick={() => setShowStructureModal(false)} className="px-4 py-2 bg-slate-100 rounded">Cancel</button>
              <button onClick={handleSaveStructure} className="px-4 py-2 bg-indigo-600 text-white rounded">Save Structure</button>
            </div>
          </div>
        </div>
      )}

      {/* Run Payroll Modal */}
      {showRunModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-xl w-full max-w-sm shadow-xl overflow-hidden p-6 space-y-4">
            <h3 className="text-lg font-bold">Run Payroll</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium mb-1">Month</label>
                <select className="w-full p-2 border rounded dark:bg-slate-800" value={selectedMonth} onChange={e => setSelectedMonth(Number(e.target.value))}>
                  {Array.from({length: 12}).map((_, i) => <option key={i} value={i+1}>{new Date(0, i).toLocaleString('en', {month: 'long'})}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Year</label>
                <input type="number" className="w-full p-2 border rounded dark:bg-slate-800" 
                  value={selectedYear} onChange={e => setSelectedYear(Number(e.target.value))} />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t">
              <button onClick={() => setShowRunModal(false)} className="px-4 py-2 bg-slate-100 rounded">Cancel</button>
              <button onClick={handleRunPayroll} className="px-4 py-2 bg-indigo-600 text-white rounded">Calculate</button>
            </div>
          </div>
        </div>
      )}

      {/* Payslip View / Print Modal */}
      {viewingPayslip && activeCompany && (
        <PayslipModal
          record={viewingPayslip}
          company={activeCompany}
          onClose={() => setViewingPayslip(null)}
        />
      )}

    </div>
  );
};

