import React, { useState, useEffect, useMemo } from 'react';
import { 
  DollarSign, 
  CreditCard, 
  Calendar, 
  Plus, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Search, 
  Download, 
  FileText, 
  Users, 
  Check, 
  X, 
  Eye, 
  RefreshCw,
  TrendingUp,
  Shield,
  Building,
  Printer,
  ChevronRight,
  Sliders,
  Landmark,
  ArrowDownCircle,
  Clock,
  Sparkles,
  PieChart
} from 'lucide-react';
import { 
  UserSession, 
  CompanyTenant, 
  PhaseAScreen, 
  SalaryStructureRecord,
  EmployeeSalaryProfileRecord,
  SalaryAdvanceRecord,
  PayrollCycleRecord,
  SalarySlipRecord,
  EmployeeRecord 
} from '../../types';
import { FirestoreService } from '../../services/firestoreService';

interface PayrollCompensationScreenProps {
  userSession: UserSession;
  activeCompany: CompanyTenant | null;
  isOnline: boolean;
  onNavigate: (screen: PhaseAScreen) => void;
}

export const PayrollCompensationScreen: React.FC<PayrollCompensationScreenProps> = ({
  userSession,
  activeCompany,
  isOnline,
  onNavigate
}) => {
  const companyId = activeCompany?.companyId || userSession.companyId;
  const isSuperAdmin = userSession.role === 'SUPER_ADMIN';
  const isCompanyAdmin = userSession.role === 'COMPANY_ADMIN';
  const isHrAdmin = userSession.role === 'HR_ADMIN';
  const canManagePayroll = isSuperAdmin || isCompanyAdmin || isHrAdmin;

  // Default tab based on role
  const [activeTab, setActiveTab] = useState<'RUNS' | 'SLIPS' | 'ADVANCES' | 'STRUCTURES' | 'PROFILES'>(
    canManagePayroll ? 'RUNS' : 'SLIPS'
  );

  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  // Firestore Data States
  const [payrollCycles, setPayrollCycles] = useState<PayrollCycleRecord[]>([]);
  const [salaryStructures, setSalaryStructures] = useState<SalaryStructureRecord[]>([]);
  const [salaryProfiles, setSalaryProfiles] = useState<EmployeeSalaryProfileRecord[]>([]);
  const [advances, setAdvances] = useState<SalaryAdvanceRecord[]>([]);
  const [employees, setEmployees] = useState<EmployeeRecord[]>([]);
  const [selectedCycleSlips, setSelectedCycleSlips] = useState<SalarySlipRecord[]>([]);
  const [employeeSlips, setEmployeeSlips] = useState<SalarySlipRecord[]>([]);

  // Filters & Selected states
  const [selectedCycleId, setSelectedCycleId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedSlipForModal, setSelectedSlipForModal] = useState<SalarySlipRecord | null>(null);

  // Modal Triggers
  const [showRunPayrollModal, setShowRunPayrollModal] = useState<boolean>(false);
  const [showAdvanceModal, setShowAdvanceModal] = useState<boolean>(false);
  const [showStructureModal, setShowStructureModal] = useState<boolean>(false);
  const [showProfileModal, setShowProfileModal] = useState<boolean>(false);
  const [selectedProfileForEdit, setSelectedProfileForEdit] = useState<EmployeeSalaryProfileRecord | null>(null);
  const [processingAction, setProcessingAction] = useState<boolean>(false);

  // Form States for Run Payroll
  const currentDate = new Date();
  const [runMonth, setRunMonth] = useState<number>(currentDate.getMonth() + 1);
  const [runYear, setRunYear] = useState<number>(currentDate.getFullYear());

  // Form States for Advance Request
  const [advanceForm, setAdvanceForm] = useState({
    employeeId: userSession.employeeId || userSession.userId,
    employeeName: userSession.fullName || userSession.email,
    amount: 5000,
    reason: '',
    monthlyDeductionAmount: 1000
  });

  // Form States for Structure Modal
  const [editingStructure, setEditingStructure] = useState<Partial<SalaryStructureRecord>>({
    name: 'Standard Security Staff Structure',
    code: 'SEC_STD',
    basicPercentage: 50,
    hraPercentage: 20,
    daPercentage: 15,
    conveyanceAllowance: 1600,
    medicalAllowance: 1250,
    specialAllowance: 0,
    pfApplicable: true,
    esicApplicable: true,
    ptApplicable: true,
    status: 'ACTIVE'
  });

  // 1. Real-time Subscriptions
  useEffect(() => {
    if (!companyId) return;
    setLoading(true);

    const unsubCycles = FirestoreService.subscribeToPayrollCycles(userSession, companyId, (data) => {
      setPayrollCycles(data);
      if (data.length > 0 && !selectedCycleId) {
        setSelectedCycleId(data[0].id);
      }
    });

    const unsubStructures = FirestoreService.subscribeToSalaryStructures(userSession, companyId, (data) => {
      setSalaryStructures(data);
    });

    const unsubProfiles = FirestoreService.subscribeToSalaryProfiles(userSession, companyId, (data) => {
      setSalaryProfiles(data);
    });

    const unsubAdvances = FirestoreService.subscribeToSalaryAdvances(userSession, companyId, (data) => {
      setAdvances(data);
    });

    // Fetch Employees
    FirestoreService.getEmployees(companyId).then((emps) => {
      setEmployees(emps);
      setLoading(false);
    }).catch(() => setLoading(false));

    return () => {
      unsubCycles();
      unsubStructures();
      unsubProfiles();
      unsubAdvances();
    };
  }, [companyId]);

  // 2. Fetch Slips when selected cycle changes
  useEffect(() => {
    if (!companyId) return;

    if (selectedCycleId) {
      FirestoreService.getSalarySlips(companyId, selectedCycleId).then((slips) => {
        setSelectedCycleSlips(slips);
      });
    }

    // If regular employee, fetch personal slips
    if (!canManagePayroll) {
      const empId = userSession.employeeId || userSession.userId;
      FirestoreService.getEmployeeSalarySlips(companyId, empId).then((slips) => {
        setEmployeeSlips(slips);
      });
    }
  }, [companyId, selectedCycleId, canManagePayroll, userSession]);

  const handleRefresh = async () => {
    if (!companyId) return;
    setRefreshing(true);
    try {
      const [cycles, structs, profs, advs, emps] = await Promise.all([
        FirestoreService.getPayrollCycles(companyId),
        FirestoreService.getSalaryStructures(companyId),
        FirestoreService.getSalaryProfiles(companyId),
        FirestoreService.getSalaryAdvances(companyId),
        FirestoreService.getEmployees(companyId)
      ]);
      setPayrollCycles(cycles);
      setSalaryStructures(structs);
      setSalaryProfiles(profs);
      setAdvances(advs);
      setEmployees(emps);
      if (selectedCycleId) {
        const slips = await FirestoreService.getSalarySlips(companyId, selectedCycleId);
        setSelectedCycleSlips(slips);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setRefreshing(false);
    }
  };

  // Run Monthly Payroll
  const handleExecutePayroll = async () => {
    if (!companyId) return;
    setProcessingAction(true);
    try {
      const res = await FirestoreService.executeMonthlyPayrollCalculation(
        companyId,
        runMonth,
        runYear,
        { uid: userSession.userId, name: userSession.fullName || userSession.email }
      );
      if (res.success) {
        setSelectedCycleId(res.cycleId);
        setShowRunPayrollModal(false);
        const slips = await FirestoreService.getSalarySlips(companyId, res.cycleId);
        setSelectedCycleSlips(slips);
      }
    } catch (err) {
      console.error('Payroll calculation failed:', err);
    } finally {
      setProcessingAction(false);
    }
  };

  // Approve Cycle
  const handleApproveCycle = async (cycleId: string) => {
    if (!companyId) return;
    setProcessingAction(true);
    try {
      await FirestoreService.updatePayrollCycleStatus(
        companyId,
        cycleId,
        'APPROVED',
        { uid: userSession.userId, name: userSession.fullName || userSession.email }
      );
    } finally {
      setProcessingAction(false);
    }
  };

  // Disburse Cycle
  const handleDisburseCycle = async (cycleId: string) => {
    if (!companyId) return;
    setProcessingAction(true);
    try {
      await FirestoreService.updatePayrollCycleStatus(
        companyId,
        cycleId,
        'DISBURSED',
        { uid: userSession.userId, name: userSession.fullName || userSession.email }
      );
    } finally {
      setProcessingAction(false);
    }
  };

  // Save Structure
  const handleSaveStructure = async () => {
    if (!companyId || !editingStructure.name) return;
    setProcessingAction(true);
    try {
      await FirestoreService.saveSalaryStructure(companyId, editingStructure as any);
      setShowStructureModal(false);
    } finally {
      setProcessingAction(false);
    }
  };

  // Save Profile
  const handleSaveProfile = async () => {
    if (!companyId || !selectedProfileForEdit) return;
    setProcessingAction(true);
    try {
      await FirestoreService.saveSalaryProfile(companyId, selectedProfileForEdit);
      setShowProfileModal(false);
      setSelectedProfileForEdit(null);
    } finally {
      setProcessingAction(false);
    }
  };

  // Request Advance
  const handleCreateAdvance = async () => {
    if (!companyId || advanceForm.amount <= 0 || !advanceForm.reason.trim()) return;
    setProcessingAction(true);
    try {
      await FirestoreService.createSalaryAdvance(companyId, {
        companyId,
        employeeId: advanceForm.employeeId,
        employeeName: advanceForm.employeeName,
        amount: advanceForm.amount,
        reason: advanceForm.reason,
        requestedDate: new Date().toISOString().split('T')[0],
        status: 'PENDING',
        monthlyDeductionAmount: advanceForm.monthlyDeductionAmount
      });
      setShowAdvanceModal(false);
      setAdvanceForm({
        employeeId: userSession.employeeId || userSession.userId,
        employeeName: userSession.fullName || userSession.email,
        amount: 5000,
        reason: '',
        monthlyDeductionAmount: 1000
      });
    } finally {
      setProcessingAction(false);
    }
  };

  // Update Advance Status
  const handleUpdateAdvanceStatus = async (advanceId: string, status: 'APPROVED' | 'REJECTED') => {
    if (!companyId) return;
    setProcessingAction(true);
    try {
      await FirestoreService.updateSalaryAdvanceStatus(
        companyId,
        advanceId,
        status,
        { uid: userSession.userId, name: userSession.fullName || userSession.email }
      );
    } finally {
      setProcessingAction(false);
    }
  };

  // CSV Export for Payroll Register
  const handleExportPayrollRegisterCSV = () => {
    if (selectedCycleSlips.length === 0) return;
    const headers = [
      'Slip ID', 'Employee ID', 'Employee Name', 'Department', 'Designation',
      'Worked Days', 'LOP Days', 'Payable Days',
      'Basic', 'HRA', 'DA', 'Conveyance', 'Medical', 'Special Allowance', 'Gross Pay',
      'PF Deduction', 'ESIC Deduction', 'PT Deduction', 'Advance Deduction', 'Total Deductions',
      'Net Pay', 'Bank Name', 'Account Number', 'IFSC Code', 'PAN Number', 'Status'
    ];

    const rows = selectedCycleSlips.map(s => [
      s.id,
      s.employeeId,
      `"${s.employeeName}"`,
      `"${s.departmentName || ''}"`,
      `"${s.designation || ''}"`,
      s.workedDays,
      s.lopDays,
      s.payableDays,
      s.earnings.basic,
      s.earnings.hra,
      s.earnings.da,
      s.earnings.conveyance,
      s.earnings.medical,
      s.earnings.specialAllowance,
      s.earnings.totalGross,
      s.deductions.pf,
      s.deductions.esic,
      s.deductions.pt,
      s.deductions.advanceDeduction,
      s.deductions.totalDeductions,
      s.netPay,
      `"${s.bankName || ''}"`,
      `"${s.accountNumber || ''}"`,
      `"${s.ifscCode || ''}"`,
      `"${s.panNumber || ''}"`,
      s.status
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Payroll_Register_${selectedCycleId || 'Export'}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // CSV Export for Bank NEFT Disbursal Statement
  const handleExportBankTransferCSV = () => {
    if (selectedCycleSlips.length === 0) return;
    const headers = ['Beneficiary Name', 'Bank Name', 'Account Number', 'IFSC Code', 'Amount (INR)', 'Payment Mode', 'Remarks'];
    const rows = selectedCycleSlips.map(s => [
      `"${s.employeeName}"`,
      `"${s.bankName || 'SBI'}"`,
      `"${s.accountNumber || ''}"`,
      `"${s.ifscCode || ''}"`,
      s.netPay,
      'NEFT',
      `"Salary for ${selectedCycleId}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Bank_Disbursal_NEFT_${selectedCycleId || 'Statement'}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Metrics
  const activeCycle = payrollCycles.find(c => c.id === selectedCycleId) || payrollCycles[0];
  const totalEmployeesCount = employees.filter(e => e.status === 'ACTIVE').length;
  const totalActiveAdvancesAmount = advances
    .filter(a => a.status === 'APPROVED' && a.remainingAmount > 0)
    .reduce((sum, a) => sum + a.remainingAmount, 0);

  // Filtered Slips for View
  const displayedSlips = useMemo(() => {
    const list = canManagePayroll ? selectedCycleSlips : employeeSlips;
    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase();
    return list.filter(s => 
      s.employeeName.toLowerCase().includes(q) ||
      s.employeeId.toLowerCase().includes(q) ||
      (s.departmentName && s.departmentName.toLowerCase().includes(q))
    );
  }, [canManagePayroll, selectedCycleSlips, employeeSlips, searchQuery]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pb-16">
      {/* Top Header */}
      <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                <DollarSign className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  Payroll & Compensation
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 font-semibold">
                    HRMS Module
                  </span>
                </h1>
                <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                  <Building className="w-3.5 h-3.5" />
                  {activeCompany?.brandName || activeCompany?.companyLegalName || 'Enterprise'} • Real-Time Statutory & Salary Engine
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
                title="Refresh Data"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              </button>

              {canManagePayroll && (
                <button
                  onClick={() => setShowRunPayrollModal(true)}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium text-xs sm:text-sm flex items-center gap-2 shadow-sm transition-colors"
                >
                  <Sparkles className="w-4 h-4" />
                  Run Payroll
                </button>
              )}

              <button
                onClick={() => setShowAdvanceModal(true)}
                className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium text-xs sm:text-sm flex items-center gap-1.5 shadow-sm transition-colors"
              >
                <Plus className="w-4 h-4" />
                Request Advance
              </button>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex space-x-1 border-t border-slate-100 dark:border-slate-700/60 overflow-x-auto scrollbar-none py-1">
            {canManagePayroll && (
              <button
                onClick={() => setActiveTab('RUNS')}
                className={`px-4 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-colors whitespace-nowrap flex items-center gap-2 ${
                  activeTab === 'RUNS'
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Calendar className="w-4 h-4" />
                Payroll Cycles ({payrollCycles.length})
              </button>
            )}

            <button
              onClick={() => setActiveTab('SLIPS')}
              className={`px-4 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-colors whitespace-nowrap flex items-center gap-2 ${
                activeTab === 'SLIPS'
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <FileText className="w-4 h-4" />
              {canManagePayroll ? 'Salary Slips & Register' : 'My Payslips'}
            </button>

            <button
              onClick={() => setActiveTab('ADVANCES')}
              className={`px-4 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-colors whitespace-nowrap flex items-center gap-2 ${
                activeTab === 'ADVANCES'
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <CreditCard className="w-4 h-4" />
              Advances & Loans ({advances.length})
            </button>

            {canManagePayroll && (
              <>
                <button
                  onClick={() => setActiveTab('STRUCTURES')}
                  className={`px-4 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-colors whitespace-nowrap flex items-center gap-2 ${
                    activeTab === 'STRUCTURES'
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Sliders className="w-4 h-4" />
                  Salary Structures ({salaryStructures.length})
                </button>

                <button
                  onClick={() => setActiveTab('PROFILES')}
                  className={`px-4 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-colors whitespace-nowrap flex items-center gap-2 ${
                    activeTab === 'PROFILES'
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Landmark className="w-4 h-4" />
                  Staff Salary Profiles ({salaryProfiles.length || employees.length})
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        {/* Top Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Staff on Payroll
              </span>
              <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center text-blue-600 dark:text-blue-400">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-bold text-slate-900 dark:text-white mt-2">
              {totalEmployeesCount}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Active company workforce
            </p>
          </div>

          <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Monthly Net Disbursal
              </span>
              <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                <DollarSign className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-2">
              ₹{(activeCycle?.totalNetPay || 0).toLocaleString('en-IN')}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {activeCycle ? activeCycle.cycleLabel : 'No cycle selected'}
            </p>
          </div>

          <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Gross & Deductions
              </span>
              <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center text-amber-600 dark:text-amber-400">
                <PieChart className="w-4 h-4" />
              </div>
            </div>
            <div className="text-xl font-bold text-slate-900 dark:text-white mt-2">
              ₹{(activeCycle?.totalGrossPay || 0).toLocaleString('en-IN')}
            </div>
            <p className="text-xs text-rose-500 dark:text-rose-400 mt-1 font-medium">
              -₹{(activeCycle?.totalDeductions || 0).toLocaleString('en-IN')} Statutory/Advances
            </p>
          </div>

          <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Outstanding Advances
              </span>
              <div className="w-8 h-8 rounded-lg bg-purple-50 dark:bg-purple-500/10 flex items-center justify-center text-purple-600 dark:text-purple-400">
                <CreditCard className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400 mt-2">
              ₹{totalActiveAdvancesAmount.toLocaleString('en-IN')}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Active loan recovery balance
            </p>
          </div>
        </div>

        {/* ========================================================== */}
        {/* TAB 1: PAYROLL RUNS / CYCLES */}
        {/* ========================================================== */}
        {activeTab === 'RUNS' && canManagePayroll && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-700/60 pb-4">
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">
                    Payroll Processing Cycles
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Monthly computation records, approval workflow, and bank disbursal status
                  </p>
                </div>
                <button
                  onClick={() => setShowRunPayrollModal(true)}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-sm transition-colors self-start sm:self-auto"
                >
                  <Plus className="w-4 h-4" />
                  Calculate New Cycle
                </button>
              </div>

              {payrollCycles.length === 0 ? (
                <div className="py-12 text-center">
                  <Calendar className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                  <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                    No Payroll Cycles Processed Yet
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mt-1 mb-4">
                    Run the first monthly computation to generate payslips, calculate PF/ESIC deductions, and prepare bank statements.
                  </p>
                  <button
                    onClick={() => setShowRunPayrollModal(true)}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-medium inline-flex items-center gap-2"
                  >
                    <Sparkles className="w-4 h-4" />
                    Process First Payroll Run
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-700/60 mt-2">
                  {payrollCycles.map((cycle) => (
                    <div
                      key={cycle.id}
                      className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/60 dark:hover:bg-slate-700/20 px-3 rounded-xl transition-colors"
                    >
                      <div className="flex items-start space-x-3.5">
                        <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-300 font-bold text-sm">
                          {cycle.month}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                              {cycle.cycleLabel}
                            </h4>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              cycle.status === 'DISBURSED'
                                ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
                                : cycle.status === 'APPROVED'
                                ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                                : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300'
                            }`}>
                              {cycle.status}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            {cycle.totalEmployees} employees • Gross: ₹{cycle.totalGrossPay.toLocaleString('en-IN')} • Deductions: ₹{cycle.totalDeductions.toLocaleString('en-IN')}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between md:justify-end gap-3">
                        <div className="text-right">
                          <span className="text-xs text-slate-400 block">Total Net Pay</span>
                          <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                            ₹{cycle.totalNetPay.toLocaleString('en-IN')}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              setSelectedCycleId(cycle.id);
                              setActiveTab('SLIPS');
                            }}
                            className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            View Slips
                          </button>

                          {cycle.status === 'CALCULATED' && (
                            <button
                              disabled={processingAction}
                              onClick={() => handleApproveCycle(cycle.id)}
                              className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1 shadow-sm"
                            >
                              <Check className="w-3.5 h-3.5" />
                              Approve
                            </button>
                          )}

                          {cycle.status === 'APPROVED' && (
                            <button
                              disabled={processingAction}
                              onClick={() => handleDisburseCycle(cycle.id)}
                              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1 shadow-sm"
                            >
                              <DollarSign className="w-3.5 h-3.5" />
                              Disburse
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================== */}
        {/* TAB 2: SALARY SLIPS & REGISTER */}
        {/* ========================================================== */}
        {activeTab === 'SLIPS' && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm">
              {/* Header Controls */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5">
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">
                    {canManagePayroll ? 'Salary Slips & Payroll Register' : 'My Generated Payslips'}
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Official payslips with statutory earnings, PF, ESIC, Professional Tax, and net disbursals
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {canManagePayroll && payrollCycles.length > 0 && (
                    <select
                      value={selectedCycleId}
                      onChange={(e) => setSelectedCycleId(e.target.value)}
                      className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200"
                    >
                      {payrollCycles.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.cycleLabel} ({c.status})
                        </option>
                      ))}
                    </select>
                  )}

                  {canManagePayroll && (
                    <>
                      <button
                        onClick={handleExportPayrollRegisterCSV}
                        disabled={selectedCycleSlips.length === 0}
                        className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5"
                      >
                        <Download className="w-3.5 h-3.5" />
                        Register CSV
                      </button>

                      <button
                        onClick={handleExportBankTransferCSV}
                        disabled={selectedCycleSlips.length === 0}
                        className="px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 border border-emerald-200 dark:border-emerald-800 text-xs font-semibold flex items-center gap-1.5"
                      >
                        <Landmark className="w-3.5 h-3.5" />
                        Bank NEFT CSV
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Search Bar */}
              <div className="relative mb-4">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search by Employee Name, ID, or Department..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Slips Table */}
              {displayedSlips.length === 0 ? (
                <div className="py-12 text-center">
                  <FileText className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                  <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                    No Payslips Available
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mt-1">
                    {canManagePayroll
                      ? 'Process a payroll cycle to generate payslips for all active employees.'
                      : 'Your payslip will appear here once the monthly cycle is processed by HR.'}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-600 dark:text-slate-400">
                    <thead className="bg-slate-50 dark:bg-slate-700/50 text-slate-700 dark:text-slate-300 font-semibold uppercase text-[10px] tracking-wider">
                      <tr>
                        <th className="py-3 px-4 rounded-l-lg">Staff Details</th>
                        <th className="py-3 px-3">Attendance</th>
                        <th className="py-3 px-3">Gross Salary</th>
                        <th className="py-3 px-3">Deductions</th>
                        <th className="py-3 px-3">Net Pay</th>
                        <th className="py-3 px-3">Status</th>
                        <th className="py-3 px-4 text-right rounded-r-lg">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                      {displayedSlips.map((slip) => (
                        <tr key={slip.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-700/30 transition-colors">
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-slate-900 dark:text-white text-xs">
                              {slip.employeeName}
                            </div>
                            <div className="text-[11px] text-slate-400">
                              {slip.employeeId} • {slip.designation || 'Staff'}
                            </div>
                          </td>

                          <td className="py-3.5 px-3">
                            <div className="font-semibold text-slate-700 dark:text-slate-300">
                              {slip.payableDays} / {slip.totalMonthDays} Days
                            </div>
                            {slip.lopDays > 0 && (
                              <span className="text-[10px] text-rose-500 font-medium">
                                {slip.lopDays} Days LOP
                              </span>
                            )}
                          </td>

                          <td className="py-3.5 px-3 font-semibold text-slate-800 dark:text-slate-200">
                            ₹{slip.earnings.totalGross.toLocaleString('en-IN')}
                          </td>

                          <td className="py-3.5 px-3 font-medium text-rose-600 dark:text-rose-400">
                            -₹{slip.deductions.totalDeductions.toLocaleString('en-IN')}
                          </td>

                          <td className="py-3.5 px-3">
                            <span className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                              ₹{slip.netPay.toLocaleString('en-IN')}
                            </span>
                          </td>

                          <td className="py-3.5 px-3">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              slip.status === 'PAID'
                                ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
                                : slip.status === 'APPROVED'
                                ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                                : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                            }`}>
                              {slip.status}
                            </span>
                          </td>

                          <td className="py-3.5 px-4 text-right">
                            <button
                              onClick={() => setSelectedSlipForModal(slip)}
                              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition-colors"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              View Payslip
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
        )}

        {/* ========================================================== */}
        {/* TAB 3: SALARY ADVANCES & LOANS */}
        {/* ========================================================== */}
        {activeTab === 'ADVANCES' && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-700/60 pb-4">
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">
                    Salary Advances & Loan Recoveries
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Track emergency advances, approval workflows, and monthly salary deductions
                  </p>
                </div>
                <button
                  onClick={() => setShowAdvanceModal(true)}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-sm transition-colors self-start sm:self-auto"
                >
                  <Plus className="w-4 h-4" />
                  New Advance Request
                </button>
              </div>

              {advances.length === 0 ? (
                <div className="py-12 text-center">
                  <CreditCard className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                  <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                    No Advance Records
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mt-1">
                    Staff advance requests and recovery schedules will appear here.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-700/60 mt-2">
                  {advances.map((adv) => (
                    <div
                      key={adv.id}
                      className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/60 dark:hover:bg-slate-700/20 px-3 rounded-xl transition-colors"
                    >
                      <div className="flex items-start space-x-3.5">
                        <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-500/10 flex items-center justify-center text-purple-600 dark:text-purple-400 font-bold text-sm">
                          <DollarSign className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                              {adv.employeeName}
                            </h4>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              adv.status === 'APPROVED'
                                ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
                                : adv.status === 'RECOVERED'
                                ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                                : adv.status === 'REJECTED'
                                ? 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300'
                                : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300'
                            }`}>
                              {adv.status}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            Reason: {adv.reason} • Applied on: {adv.requestedDate}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between md:justify-end gap-4">
                        <div className="text-right">
                          <span className="text-xs text-slate-400 block">Total / Remaining</span>
                          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                            ₹{adv.amount.toLocaleString('en-IN')} / 
                          </span>{' '}
                          <span className="text-xs font-bold text-purple-600 dark:text-purple-400">
                            ₹{adv.remainingAmount.toLocaleString('en-IN')}
                          </span>
                          <span className="text-[10px] text-slate-400 block">
                            ₹{adv.monthlyDeductionAmount}/mo EMI
                          </span>
                        </div>

                        {canManagePayroll && adv.status === 'PENDING' && (
                          <div className="flex items-center gap-2">
                            <button
                              disabled={processingAction}
                              onClick={() => handleUpdateAdvanceStatus(adv.id, 'APPROVED')}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1 shadow-sm"
                            >
                              <Check className="w-3.5 h-3.5" />
                              Approve
                            </button>

                            <button
                              disabled={processingAction}
                              onClick={() => handleUpdateAdvanceStatus(adv.id, 'REJECTED')}
                              className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1 shadow-sm"
                            >
                              <X className="w-3.5 h-3.5" />
                              Reject
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================== */}
        {/* TAB 4: SALARY STRUCTURES */}
        {/* ========================================================== */}
        {activeTab === 'STRUCTURES' && canManagePayroll && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-700/60 pb-4">
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">
                    Salary Structures & Statutory Rules
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Define Basic %, HRA %, PF (12%), ESIC (0.75%), and Professional Tax parameters
                  </p>
                </div>
                <button
                  onClick={() => {
                    setEditingStructure({
                      name: '',
                      code: '',
                      basicPercentage: 50,
                      hraPercentage: 20,
                      daPercentage: 15,
                      conveyanceAllowance: 1600,
                      medicalAllowance: 1250,
                      specialAllowance: 0,
                      pfApplicable: true,
                      esicApplicable: true,
                      ptApplicable: true,
                      status: 'ACTIVE'
                    });
                    setShowStructureModal(true);
                  }}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-sm transition-colors self-start sm:self-auto"
                >
                  <Plus className="w-4 h-4" />
                  Create Structure
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
                {salaryStructures.map((str) => (
                  <div
                    key={str.id}
                    className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/40 hover:border-emerald-500 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                        {str.name}
                      </h4>
                      <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 rounded-full">
                        {str.code}
                      </span>
                    </div>

                    <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-400 my-3">
                      <div className="flex justify-between">
                        <span>Basic Pay:</span>
                        <span className="font-semibold text-slate-900 dark:text-white">{str.basicPercentage}% of Gross</span>
                      </div>
                      <div className="flex justify-between">
                        <span>HRA:</span>
                        <span className="font-semibold text-slate-900 dark:text-white">{str.hraPercentage}% of Basic</span>
                      </div>
                      <div className="flex justify-between">
                        <span>DA:</span>
                        <span className="font-semibold text-slate-900 dark:text-white">{str.daPercentage}% of Basic</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Conveyance + Medical:</span>
                        <span className="font-semibold text-slate-900 dark:text-white">₹{str.conveyanceAllowance + str.medicalAllowance}/mo</span>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-200 dark:border-slate-700 flex flex-wrap gap-1.5">
                      {str.pfApplicable && (
                        <span className="text-[10px] bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded font-medium">
                          PF (12%)
                        </span>
                      )}
                      {str.esicApplicable && (
                        <span className="text-[10px] bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 px-2 py-0.5 rounded font-medium">
                          ESIC (0.75%)
                        </span>
                      )}
                      {str.ptApplicable && (
                        <span className="text-[10px] bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 px-2 py-0.5 rounded font-medium">
                          PT (₹200)
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================== */}
        {/* TAB 5: EMPLOYEE SALARY PROFILES */}
        {/* ========================================================== */}
        {activeTab === 'PROFILES' && canManagePayroll && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">
                    Staff Salary Profiles & Bank Details
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Individual monthly CTC, base wages, bank account, IFSC, PAN, and UAN mappings
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-600 dark:text-slate-400">
                  <thead className="bg-slate-50 dark:bg-slate-700/50 text-slate-700 dark:text-slate-300 font-semibold uppercase text-[10px] tracking-wider">
                    <tr>
                      <th className="py-3 px-4 rounded-l-lg">Employee</th>
                      <th className="py-3 px-3">Monthly Base / CTC</th>
                      <th className="py-3 px-3">Bank Details</th>
                      <th className="py-3 px-3">PAN & UAN</th>
                      <th className="py-3 px-3">Structure</th>
                      <th className="py-3 px-4 text-right rounded-r-lg">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                    {employees.map((emp) => {
                      const prof = salaryProfiles.find(p => p.employeeId === emp.id || p.id === emp.id);
                      const baseSalary = prof?.baseMonthlySalary || 18000;
                      const ctc = prof?.monthlyCtc || 21500;
                      return (
                        <tr key={emp.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-700/30 transition-colors">
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-slate-900 dark:text-white text-xs">
                              {emp.firstName} {emp.lastName}
                            </div>
                            <div className="text-[11px] text-slate-400">
                              {emp.id} • {emp.designation || 'Staff'}
                            </div>
                          </td>

                          <td className="py-3.5 px-3">
                            <div className="font-bold text-slate-900 dark:text-white">
                              ₹{baseSalary.toLocaleString('en-IN')} / mo
                            </div>
                            <div className="text-[10px] text-slate-400">
                              CTC: ₹{ctc.toLocaleString('en-IN')}
                            </div>
                          </td>

                          <td className="py-3.5 px-3">
                            <div className="font-medium text-slate-800 dark:text-slate-200">
                              {prof?.bankName || 'State Bank of India'}
                            </div>
                            <div className="text-[11px] text-slate-400 font-mono">
                              {prof?.accountNumber || '••••••••1234'} • {prof?.ifscCode || 'SBIN0001234'}
                            </div>
                          </td>

                          <td className="py-3.5 px-3 font-mono text-[11px]">
                            <div>PAN: {prof?.panNumber || 'ABCDE1234F'}</div>
                            <div className="text-slate-400">UAN: {prof?.uanNumber || '101234567890'}</div>
                          </td>

                          <td className="py-3.5 px-3">
                            <span className="text-[10px] font-semibold px-2 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-full">
                              Standard Structure
                            </span>
                          </td>

                          <td className="py-3.5 px-4 text-right">
                            <button
                              onClick={() => {
                                setSelectedProfileForEdit(prof || {
                                  id: emp.id,
                                  companyId,
                                  employeeId: emp.id,
                                  employeeName: `${emp.firstName} ${emp.lastName}`,
                                  structureId: salaryStructures[0]?.id || 'STD',
                                  monthlyCtc: 21500,
                                  baseMonthlySalary: 18000,
                                  bankName: 'State Bank of India',
                                  accountNumber: '123456789012',
                                  ifscCode: 'SBIN0001234',
                                  panNumber: 'ABCDE1234F',
                                  paymentMode: 'BANK_TRANSFER',
                                  updatedAt: new Date().toISOString()
                                });
                                setShowProfileModal(true);
                              }}
                              className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 rounded-lg text-xs font-semibold transition-colors"
                            >
                              Edit Profile
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ============================================================== */}
      {/* MODAL 1: RUN MONTHLY PAYROLL */}
      {/* ============================================================== */}
      {showRunPayrollModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 dark:border-slate-700 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-emerald-600" />
                Run Monthly Payroll
              </h3>
              <button
                onClick={() => setShowRunPayrollModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              This will calculate payable days, loss of pay (LOP), Basic, HRA, DA, PF (12%), ESIC, Professional Tax, and advance deductions for all active staff.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Select Month
                </label>
                <select
                  value={runMonth}
                  onChange={(e) => setRunMonth(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white font-medium"
                >
                  {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map((m, idx) => (
                    <option key={m} value={idx + 1}>{m}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Select Year
                </label>
                <input
                  type="number"
                  value={runYear}
                  onChange={(e) => setRunYear(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white font-medium"
                />
              </div>

              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-300">
                <strong>{totalEmployeesCount} Employees</strong> will be processed for this cycle.
              </div>
            </div>

            <div className="flex justify-end gap-2.5 mt-6">
              <button
                type="button"
                onClick={() => setShowRunPayrollModal(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={processingAction}
                onClick={handleExecutePayroll}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-2 shadow-sm"
              >
                {processingAction ? 'Calculating...' : 'Start Computation'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 2: INTERACTIVE PRINTABLE PAYSLIP VIEWER */}
      {/* ============================================================== */}
      {selectedSlipForModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 my-8">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-emerald-600" />
                <span className="font-bold text-slate-900 dark:text-white text-sm">
                  Official Salary Slip • {selectedSlipForModal.payrollCycleId}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Print / PDF
                </button>
                <button
                  onClick={() => setSelectedSlipForModal(null)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Payslip Body */}
            <div className="p-4 my-4 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50/50 dark:bg-slate-900/40 font-sans">
              {/* Company Header */}
              <div className="text-center pb-4 border-b border-slate-200 dark:border-slate-700">
                <h2 className="text-base font-extrabold text-slate-900 dark:text-white tracking-wide uppercase">
                  {activeCompany?.brandName || activeCompany?.companyLegalName || 'LOG SHEET MUSTER ENTERPRISE'}
                </h2>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Registered Security & Facility Management Services • GSTIN: 27AABCU9603R1ZM
                </p>
                <span className="inline-block mt-1 px-3 py-0.5 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300 text-[10px] font-bold rounded-full">
                  PAYSLIP FOR {selectedSlipForModal.payrollCycleId}
                </span>
              </div>

              {/* Employee & Bank Info Grid */}
              <div className="grid grid-cols-2 gap-4 py-3 text-xs border-b border-slate-200 dark:border-slate-700">
                <div>
                  <div className="text-slate-400 text-[10px] uppercase font-bold">Employee Information</div>
                  <div className="font-bold text-slate-900 dark:text-white text-sm">{selectedSlipForModal.employeeName}</div>
                  <div className="text-slate-600 dark:text-slate-400">ID: {selectedSlipForModal.employeeId}</div>
                  <div className="text-slate-600 dark:text-slate-400">Designation: {selectedSlipForModal.designation || 'Staff'}</div>
                  <div className="text-slate-600 dark:text-slate-400">Department: {selectedSlipForModal.departmentName || 'Operations'}</div>
                </div>

                <div className="text-right">
                  <div className="text-slate-400 text-[10px] uppercase font-bold">Bank & Statutory</div>
                  <div className="font-semibold text-slate-900 dark:text-white">{selectedSlipForModal.bankName || 'State Bank of India'}</div>
                  <div className="text-slate-600 dark:text-slate-400 font-mono">A/C: {selectedSlipForModal.accountNumber || '••••••••1234'}</div>
                  <div className="text-slate-600 dark:text-slate-400 font-mono">IFSC: {selectedSlipForModal.ifscCode || 'SBIN0001234'}</div>
                  <div className="text-slate-600 dark:text-slate-400 font-mono">PAN: {selectedSlipForModal.panNumber || 'ABCDE1234F'}</div>
                </div>
              </div>

              {/* Attendance Breakdown */}
              <div className="py-2.5 px-3 bg-white dark:bg-slate-800 rounded-lg my-3 border border-slate-200 dark:border-slate-700 flex justify-between text-xs font-semibold">
                <div>Total Month Days: <span className="text-slate-900 dark:text-white font-bold">{selectedSlipForModal.totalMonthDays}</span></div>
                <div>Worked / Paid Days: <span className="text-emerald-600 dark:text-emerald-400 font-bold">{selectedSlipForModal.payableDays}</span></div>
                <div>LOP (Unpaid): <span className="text-rose-500 font-bold">{selectedSlipForModal.lopDays}</span></div>
              </div>

              {/* Two Column Earnings vs Deductions */}
              <div className="grid grid-cols-2 gap-4 text-xs">
                {/* Earnings */}
                <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-3 bg-white dark:bg-slate-800">
                  <div className="font-bold text-slate-900 dark:text-white pb-2 border-b border-slate-100 dark:border-slate-700 uppercase text-[10px] text-emerald-600">
                    Earnings (उपार्जन)
                  </div>
                  <div className="space-y-1.5 pt-2 text-slate-700 dark:text-slate-300">
                    <div className="flex justify-between"><span>Basic Pay</span><span className="font-semibold">₹{selectedSlipForModal.earnings.basic.toLocaleString('en-IN')}</span></div>
                    <div className="flex justify-between"><span>HRA</span><span className="font-semibold">₹{selectedSlipForModal.earnings.hra.toLocaleString('en-IN')}</span></div>
                    <div className="flex justify-between"><span>Dearness Allowance (DA)</span><span className="font-semibold">₹{selectedSlipForModal.earnings.da.toLocaleString('en-IN')}</span></div>
                    <div className="flex justify-between"><span>Conveyance</span><span className="font-semibold">₹{selectedSlipForModal.earnings.conveyance.toLocaleString('en-IN')}</span></div>
                    <div className="flex justify-between"><span>Medical Allowance</span><span className="font-semibold">₹{selectedSlipForModal.earnings.medical.toLocaleString('en-IN')}</span></div>
                    {selectedSlipForModal.earnings.specialAllowance > 0 && (
                      <div className="flex justify-between"><span>Special Allowance</span><span className="font-semibold">₹{selectedSlipForModal.earnings.specialAllowance.toLocaleString('en-IN')}</span></div>
                    )}
                  </div>
                  <div className="pt-3 mt-3 border-t border-slate-100 dark:border-slate-700 flex justify-between font-bold text-slate-900 dark:text-white">
                    <span>Total Gross</span>
                    <span>₹{selectedSlipForModal.earnings.totalGross.toLocaleString('en-IN')}</span>
                  </div>
                </div>

                {/* Deductions */}
                <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-3 bg-white dark:bg-slate-800">
                  <div className="font-bold text-slate-900 dark:text-white pb-2 border-b border-slate-100 dark:border-slate-700 uppercase text-[10px] text-rose-600">
                    Deductions (कपात)
                  </div>
                  <div className="space-y-1.5 pt-2 text-slate-700 dark:text-slate-300">
                    <div className="flex justify-between"><span>Provident Fund (PF)</span><span className="font-semibold">₹{selectedSlipForModal.deductions.pf.toLocaleString('en-IN')}</span></div>
                    <div className="flex justify-between"><span>ESIC (0.75%)</span><span className="font-semibold">₹{selectedSlipForModal.deductions.esic.toLocaleString('en-IN')}</span></div>
                    <div className="flex justify-between"><span>Professional Tax (PT)</span><span className="font-semibold">₹{selectedSlipForModal.deductions.pt.toLocaleString('en-IN')}</span></div>
                    {selectedSlipForModal.deductions.advanceDeduction > 0 && (
                      <div className="flex justify-between text-purple-600 font-semibold"><span>Advance Recovery</span><span>₹{selectedSlipForModal.deductions.advanceDeduction.toLocaleString('en-IN')}</span></div>
                    )}
                  </div>
                  <div className="pt-3 mt-3 border-t border-slate-100 dark:border-slate-700 flex justify-between font-bold text-rose-600">
                    <span>Total Deductions</span>
                    <span>-₹{selectedSlipForModal.deductions.totalDeductions.toLocaleString('en-IN')}</span>
                  </div>
                </div>
              </div>

              {/* Net Pay Highlight Banner */}
              <div className="mt-4 p-4 rounded-xl bg-emerald-600 text-white flex items-center justify-between shadow-sm">
                <div>
                  <div className="text-[10px] uppercase font-bold tracking-wider opacity-90">Net Payable Amount (निव्वळ वेतन)</div>
                  <div className="text-xl font-extrabold">₹{selectedSlipForModal.netPay.toLocaleString('en-IN')}</div>
                  <div className="text-[11px] opacity-90 italic">{selectedSlipForModal.netPayInWords}</div>
                </div>
                <div className="text-right text-xs">
                  <div className="font-bold">STATUS: {selectedSlipForModal.status}</div>
                  <div className="text-[10px] opacity-80">Auto Generated System Payslip</div>
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setSelectedSlipForModal(null)}
                className="px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl text-xs font-bold"
              >
                Close Payslip
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 3: REQUEST SALARY ADVANCE */}
      {/* ============================================================== */}
      {showAdvanceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-indigo-600" />
                Request Salary Advance
              </h3>
              <button
                onClick={() => setShowAdvanceModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {canManagePayroll && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Select Employee
                  </label>
                  <select
                    value={advanceForm.employeeId}
                    onChange={(e) => {
                      const emp = employees.find(em => em.id === e.target.value);
                      setAdvanceForm({
                        ...advanceForm,
                        employeeId: e.target.value,
                        employeeName: emp ? `${emp.firstName} ${emp.lastName}` : userSession.fullName || ''
                      });
                    }}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white font-medium"
                  >
                    {employees.map(em => (
                      <option key={em.id} value={em.id}>{em.firstName} {em.lastName} ({em.id})</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Advance Amount (₹)
                </label>
                <input
                  type="number"
                  min="500"
                  max="100000"
                  value={advanceForm.amount}
                  onChange={(e) => setAdvanceForm({ ...advanceForm, amount: Number(e.target.value) })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Monthly Deduction (₹ EMI per cycle)
                </label>
                <input
                  type="number"
                  min="500"
                  max={advanceForm.amount}
                  value={advanceForm.monthlyDeductionAmount}
                  onChange={(e) => setAdvanceForm({ ...advanceForm, monthlyDeductionAmount: Number(e.target.value) })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Reason for Advance
                </label>
                <textarea
                  rows={2}
                  placeholder="Medical emergency, festival, family urgent expense..."
                  value={advanceForm.reason}
                  onChange={(e) => setAdvanceForm({ ...advanceForm, reason: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white font-medium"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2.5 mt-6">
              <button
                type="button"
                onClick={() => setShowAdvanceModal(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={processingAction}
                onClick={handleCreateAdvance}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold flex items-center gap-2 shadow-sm"
              >
                {processingAction ? 'Submitting...' : 'Submit Request'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 4: SALARY STRUCTURE CONFIGURATION */}
      {/* ============================================================== */}
      {showStructureModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200 dark:border-slate-700 my-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Sliders className="w-5 h-5 text-emerald-600" />
                Configure Salary Structure
              </h3>
              <button
                onClick={() => setShowStructureModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Structure Name</label>
                  <input
                    type="text"
                    value={editingStructure.name || ''}
                    onChange={(e) => setEditingStructure({ ...editingStructure, name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white font-medium"
                    placeholder="e.g. Guard Tier 1"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Structure Code</label>
                  <input
                    type="text"
                    value={editingStructure.code || ''}
                    onChange={(e) => setEditingStructure({ ...editingStructure, code: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white font-medium uppercase"
                    placeholder="e.g. SEC_T1"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Basic %</label>
                  <input
                    type="number"
                    value={editingStructure.basicPercentage || 50}
                    onChange={(e) => setEditingStructure({ ...editingStructure, basicPercentage: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white font-medium"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">HRA % of Basic</label>
                  <input
                    type="number"
                    value={editingStructure.hraPercentage || 20}
                    onChange={(e) => setEditingStructure({ ...editingStructure, hraPercentage: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white font-medium"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">DA % of Basic</label>
                  <input
                    type="number"
                    value={editingStructure.daPercentage || 15}
                    onChange={(e) => setEditingStructure({ ...editingStructure, daPercentage: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Conveyance (₹/mo)</label>
                  <input
                    type="number"
                    value={editingStructure.conveyanceAllowance || 1600}
                    onChange={(e) => setEditingStructure({ ...editingStructure, conveyanceAllowance: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white font-medium"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Medical (₹/mo)</label>
                  <input
                    type="number"
                    value={editingStructure.medicalAllowance || 1250}
                    onChange={(e) => setEditingStructure({ ...editingStructure, medicalAllowance: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white font-medium"
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-slate-700 space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingStructure.pfApplicable ?? true}
                    onChange={(e) => setEditingStructure({ ...editingStructure, pfApplicable: e.target.checked })}
                    className="w-4 h-4 text-emerald-600 rounded"
                  />
                  <span>Provident Fund (12% of Basic up to ₹15,000)</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingStructure.esicApplicable ?? true}
                    onChange={(e) => setEditingStructure({ ...editingStructure, esicApplicable: e.target.checked })}
                    className="w-4 h-4 text-emerald-600 rounded"
                  />
                  <span>ESIC (0.75% of Gross if Gross ≤ ₹21,000)</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingStructure.ptApplicable ?? true}
                    onChange={(e) => setEditingStructure({ ...editingStructure, ptApplicable: e.target.checked })}
                    className="w-4 h-4 text-emerald-600 rounded"
                  />
                  <span>Professional Tax (₹200 / ₹175 slab)</span>
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-2.5 mt-6">
              <button
                type="button"
                onClick={() => setShowStructureModal(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={processingAction}
                onClick={handleSaveStructure}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-2 shadow-sm"
              >
                {processingAction ? 'Saving...' : 'Save Structure'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 5: EDIT EMPLOYEE SALARY PROFILE */}
      {/* ============================================================== */}
      {showProfileModal && selectedProfileForEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 dark:border-slate-700 my-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Landmark className="w-5 h-5 text-emerald-600" />
                Staff Salary Profile: {selectedProfileForEdit.employeeName}
              </h3>
              <button
                onClick={() => setShowProfileModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Base Monthly Salary (₹)</label>
                  <input
                    type="number"
                    value={selectedProfileForEdit.baseMonthlySalary || 18000}
                    onChange={(e) => setSelectedProfileForEdit({ ...selectedProfileForEdit, baseMonthlySalary: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white font-medium"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Monthly CTC (₹)</label>
                  <input
                    type="number"
                    value={selectedProfileForEdit.monthlyCtc || 21500}
                    onChange={(e) => setSelectedProfileForEdit({ ...selectedProfileForEdit, monthlyCtc: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Bank Name</label>
                <input
                  type="text"
                  value={selectedProfileForEdit.bankName || ''}
                  onChange={(e) => setSelectedProfileForEdit({ ...selectedProfileForEdit, bankName: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white font-medium"
                  placeholder="e.g. State Bank of India"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Account Number</label>
                  <input
                    type="text"
                    value={selectedProfileForEdit.accountNumber || ''}
                    onChange={(e) => setSelectedProfileForEdit({ ...selectedProfileForEdit, accountNumber: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">IFSC Code</label>
                  <input
                    type="text"
                    value={selectedProfileForEdit.ifscCode || ''}
                    onChange={(e) => setSelectedProfileForEdit({ ...selectedProfileForEdit, ifscCode: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white font-mono uppercase"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">PAN Number</label>
                  <input
                    type="text"
                    value={selectedProfileForEdit.panNumber || ''}
                    onChange={(e) => setSelectedProfileForEdit({ ...selectedProfileForEdit, panNumber: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white font-mono uppercase"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">UAN / PF Number</label>
                  <input
                    type="text"
                    value={selectedProfileForEdit.uanNumber || ''}
                    onChange={(e) => setSelectedProfileForEdit({ ...selectedProfileForEdit, uanNumber: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white font-mono"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2.5 mt-6">
              <button
                type="button"
                onClick={() => setShowProfileModal(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={processingAction}
                onClick={handleSaveProfile}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-2 shadow-sm"
              >
                {processingAction ? 'Saving...' : 'Save Profile'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
