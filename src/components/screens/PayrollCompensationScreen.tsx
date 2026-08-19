import React, { useState, useEffect, useMemo } from 'react';
import {
  DollarSign,
  FileText,
  Users,
  Settings,
  CreditCard,
  Plus,
  Search,
  Filter,
  Download,
  CheckCircle2,
  AlertCircle,
  Clock,
  Send,
  Eye,
  RefreshCw,
  Printer,
  ChevronRight,
  Shield,
  Layers,
  ArrowUpRight,
  TrendingUp,
  FileSpreadsheet,
  Edit3,
  Calendar,
  Lock,
  Building2,
  CheckSquare,
  Square,
  Sparkles,
  Landmark,
  ShieldCheck,
  Ban,
  ArrowRight
} from 'lucide-react';
import { 
  UserSession, 
  CompanyRecord, 
  PayrollCycleRecord, 
  SalarySlipRecord, 
  SalaryStructureRecord, 
  EmployeeSalaryProfileRecord, 
  SalaryAdvanceRecord, 
  EmployeeRecord,
  PaymentBatchRecord,
  CompanyBankAccountRecord,
  BankExportFormat
} from '../../types';
import { FirestoreService } from '../../services/firestoreService';
import { BulkExportGovernanceService } from '../../services/bulkExportGovernanceService';
import { PayslipService } from '../../services/payslipService';
import { PayslipModal } from '../payroll/PayslipModal';
import { BankExportModal } from '../payroll/BankExportModal';
import { BankBatchDetailModal } from '../payroll/BankBatchDetailModal';
import { CreateBankBatchModal } from '../payroll/CreateBankBatchModal';
import { CompanyBankModal } from '../payroll/CompanyBankModal';

interface PayrollCompensationScreenProps {
  userSession: UserSession;
  activeCompany: CompanyRecord | null;
  isOnline: boolean;
  onNavigate: (screen: any) => void;
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

  // Tabs
  const [activeTab, setActiveTab] = useState<'RUNS' | 'SLIPS' | 'BANK_EXPORT' | 'MY_SLIPS' | 'STRUCTURES' | 'PROFILES' | 'ADVANCES'>(
    canManagePayroll ? 'RUNS' : 'MY_SLIPS'
  );

  // Core Data States
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [cycles, setCycles] = useState<PayrollCycleRecord[]>([]);
  const [structures, setStructures] = useState<SalaryStructureRecord[]>([]);
  const [profiles, setProfiles] = useState<EmployeeSalaryProfileRecord[]>([]);
  const [advances, setAdvances] = useState<SalaryAdvanceRecord[]>([]);
  const [employees, setEmployees] = useState<EmployeeRecord[]>([]);
  const [cycleSlips, setCycleSlips] = useState<SalarySlipRecord[]>([]);
  const [mySlips, setMySlips] = useState<SalarySlipRecord[]>([]);

  // Bank Batch Export States
  const [paymentBatches, setPaymentBatches] = useState<PaymentBatchRecord[]>([]);
  const [companyBanks, setCompanyBanks] = useState<CompanyBankAccountRecord[]>([]);
  const [selectedBatchForDetail, setSelectedBatchForDetail] = useState<PaymentBatchRecord | null>(null);
  const [selectedBatchForExport, setSelectedBatchForExport] = useState<PaymentBatchRecord | null>(null);
  const [showCreateBatchModal, setShowCreateBatchModal] = useState(false);
  const [showCompanyBankModal, setShowCompanyBankModal] = useState(false);
  const [editingCompanyBank, setEditingCompanyBank] = useState<CompanyBankAccountRecord | null>(null);
  const [batchStatusFilter, setBatchStatusFilter] = useState<'ALL' | 'DRAFT' | 'READY_FOR_APPROVAL' | 'APPROVED' | 'EXPORTED' | 'VALIDATION_FAILED' | 'CANCELLED'>('ALL');
  const [batchSearchQuery, setBatchSearchQuery] = useState('');

  // Selection & Filters
  const [selectedCycleId, setSelectedCycleId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('ALL');
  const [publishStatusFilter, setPublishStatusFilter] = useState<'ALL' | 'PUBLISHED' | 'UNPUBLISHED'>('ALL');
  const [selectedSlipIds, setSelectedSlipIds] = useState<string[]>([]);
  const [selectedSlipForModal, setSelectedSlipForModal] = useState<SalarySlipRecord | null>(null);

  // Calculation Modal State
  const [showCalcModal, setShowCalcModal] = useState(false);
  const currentDate = new Date();
  const [calcMonth, setCalcMonth] = useState(currentDate.getMonth() + 1);
  const [calcYear, setCalcYear] = useState(currentDate.getFullYear());
  const [calcFeedback, setCalcFeedback] = useState<{ success?: boolean; message?: string } | null>(null);

  // Salary Structure Modal State
  const [showStructModal, setShowStructModal] = useState(false);
  const [structForm, setStructForm] = useState<Partial<SalaryStructureRecord>>({
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

  // Profile Edit Modal State
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileForm, setProfileForm] = useState<Partial<EmployeeSalaryProfileRecord> | null>(null);

  // Advance Request Modal State
  const [showAdvanceModal, setShowAdvanceModal] = useState(false);
  const [advanceForm, setAdvanceForm] = useState({
    employeeId: userSession.employeeId || userSession.userId,
    employeeName: userSession.fullName || userSession.email,
    amount: 5000,
    reason: '',
    monthlyDeductionAmount: 1000
  });

  // Subscriptions & Initial Fetch
  useEffect(() => {
    if (!companyId) return;
    setLoading(true);

    const unsubCycles = FirestoreService.subscribeToPayrollCycles(userSession, companyId, (data) => {
      setCycles(data);
      if (data.length > 0 && !selectedCycleId) {
        setSelectedCycleId(data[0].id);
      }
    });

    const unsubStructs = FirestoreService.subscribeToSalaryStructures(userSession, companyId, (data) => {
      setStructures(data);
    });

    const unsubProfiles = FirestoreService.subscribeToSalaryProfiles(userSession, companyId, (data) => {
      setProfiles(data);
    });

    const unsubAdvances = FirestoreService.subscribeToSalaryAdvances(userSession, companyId, (data) => {
      setAdvances(data);
    });

    const unsubBatches = FirestoreService.subscribePaymentBatches(companyId, (batches) => {
      setPaymentBatches(batches);
    });

    FirestoreService.getCompanyBankAccounts(companyId).then((banks) => {
      setCompanyBanks(banks);
    }).catch(err => console.error('Failed to load company banks:', err));

    FirestoreService.getEmployees(companyId).then((emps) => {
      setEmployees(emps);
      setLoading(false);
    }).catch(() => setLoading(false));

    return () => {
      unsubCycles();
      unsubStructs();
      unsubProfiles();
      unsubAdvances();
      unsubBatches();
    };
  }, [companyId]);

  // Load Slips for Selected Cycle
  useEffect(() => {
    if (!companyId) return;

    if (selectedCycleId) {
      FirestoreService.getSalarySlips(companyId, selectedCycleId).then((slips) => {
        setCycleSlips(slips);
        setSelectedSlipIds([]);
      });
    }

    // Load My Slips (for logged-in user)
    const empId = userSession.employeeId || userSession.userId;
    if (empId) {
      FirestoreService.getEmployeeSalarySlips(companyId, empId).then((slips) => {
        setMySlips(slips);
      });
    }
  }, [companyId, selectedCycleId, userSession]);

  const activeCycle = useMemo(() => {
    return cycles.find(c => c.id === selectedCycleId);
  }, [cycles, selectedCycleId]);

  // Departments List
  const departments = useMemo(() => {
    const set = new Set<string>();
    employees.forEach(e => {
      if (e.departmentId) set.add(e.departmentId);
    });
    return Array.from(set);
  }, [employees]);

  // Filtered Cycle Slips
  const filteredCycleSlips = useMemo(() => {
    return cycleSlips.filter(slip => {
      const matchesSearch = !searchQuery || 
        slip.employeeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (slip.employeeCode && slip.employeeCode.toLowerCase().includes(searchQuery.toLowerCase())) ||
        slip.employeeId.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesDept = departmentFilter === 'ALL' || slip.departmentName === departmentFilter;

      let matchesPublish = true;
      if (publishStatusFilter === 'PUBLISHED') matchesPublish = Boolean(slip.isPublished);
      if (publishStatusFilter === 'UNPUBLISHED') matchesPublish = !slip.isPublished;

      return matchesSearch && matchesDept && matchesPublish;
    });
  }, [cycleSlips, searchQuery, departmentFilter, publishStatusFilter]);

  // Bulk Actions
  const handleSelectAll = () => {
    if (selectedSlipIds.length === filteredCycleSlips.length) {
      setSelectedSlipIds([]);
    } else {
      setSelectedSlipIds(filteredCycleSlips.map(s => s.id));
    }
  };

  const handleToggleSelectSlip = (id: string) => {
    setSelectedSlipIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleBulkPublish = async () => {
    if (!companyId || selectedSlipIds.length === 0) return;
    setProcessing(true);
    try {
      await FirestoreService.publishSalarySlips(
        companyId,
        selectedCycleId,
        selectedSlipIds,
        { uid: userSession.userId, name: userSession.fullName || userSession.email }
      );
      const updated = await FirestoreService.getSalarySlips(companyId, selectedCycleId);
      setCycleSlips(updated);
      setSelectedSlipIds([]);
    } catch (err) {
      console.error('Bulk publish error:', err);
    } finally {
      setProcessing(false);
    }
  };

  const handleBulkPublishAll = async () => {
    if (!companyId || cycleSlips.length === 0) return;
    setProcessing(true);
    try {
      const allIds = cycleSlips.map(s => s.id);
      await FirestoreService.publishSalarySlips(
        companyId,
        selectedCycleId,
        allIds,
        { uid: userSession.userId, name: userSession.fullName || userSession.email }
      );
      const updated = await FirestoreService.getSalarySlips(companyId, selectedCycleId);
      setCycleSlips(updated);
    } catch (err) {
      console.error('Publish all error:', err);
    } finally {
      setProcessing(false);
    }
  };

  const handleBulkDownloadPDFs = async () => {
    const slipsToDownload = selectedSlipIds.length > 0
      ? cycleSlips.filter(s => selectedSlipIds.includes(s.id))
      : cycleSlips;

    if (slipsToDownload.length === 0) return;

    // Module 10.4: Export Governance Evaluation
    const targetCompanyId = companyId || activeCompany?.companyId || '';
    await BulkExportGovernanceService.evaluateAndRecordExport({
      session: userSession,
      companyId: targetCompanyId,
      module: 'PAYROLL',
      entityType: 'SalarySlipRecord',
      exportFormat: 'PDF',
      dataClassification: 'PAYROLL_SALARY',
      recordCount: slipsToDownload.length,
      exportName: `Payslips_Bulk_${selectedCycleId}.pdf`,
      reason: `Bulk download of ${slipsToDownload.length} payslips in PDF format`
    });

    slipsToDownload.forEach((slip, idx) => {
      setTimeout(() => {
        if (activeCompany) PayslipService.downloadPDF(slip, activeCompany);
      }, idx * 300);
    });
  };

  const handleExportCSV = async () => {
    if (cycleSlips.length === 0) return;
    const label = activeCycle?.cycleLabel || selectedCycleId;
    const targetCompanyId = companyId || activeCompany?.companyId || '';

    // Module 10.4: Export Governance Evaluation
    await BulkExportGovernanceService.evaluateAndRecordExport({
      session: userSession,
      companyId: targetCompanyId,
      module: 'PAYROLL',
      entityType: 'SalarySlipRecord',
      exportFormat: 'CSV',
      dataClassification: 'PAYROLL_SALARY',
      recordCount: cycleSlips.length,
      exportName: `Payroll_Summary_${label}.csv`,
      reason: `Exported summary payroll CSV for cycle ${label}`
    });

    PayslipService.exportSummaryCSV(cycleSlips, label);
  };

  // Bank Batches Handlers & Filters
  const filteredBatches = useMemo(() => {
    return paymentBatches.filter(b => {
      if (batchStatusFilter !== 'ALL' && b.status !== batchStatusFilter) return false;
      if (batchSearchQuery.trim()) {
        const q = batchSearchQuery.toLowerCase();
        return (
          b.batchNumber.toLowerCase().includes(q) ||
          b.payrollCycleLabel.toLowerCase().includes(q) ||
          (b.companyBankName || '').toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [paymentBatches, batchStatusFilter, batchSearchQuery]);

  const bankMetrics = useMemo(() => {
    const totalBatches = paymentBatches.length;
    const readyForApproval = paymentBatches.filter(b => b.status === 'READY_FOR_APPROVAL').length;
    const approvedCount = paymentBatches.filter(b => b.status === 'APPROVED').length;
    const exportedCount = paymentBatches.filter(b => b.status === 'EXPORTED').length;
    const totalExportedAmount = paymentBatches
      .filter(b => b.status === 'EXPORTED')
      .reduce((sum, b) => sum + (b.totalAmount || 0), 0);
    const totalBatchAmount = paymentBatches
      .filter(b => b.status !== 'CANCELLED')
      .reduce((sum, b) => sum + (b.totalAmount || 0), 0);
    return {
      totalBatches,
      readyForApproval,
      approvedCount,
      exportedCount,
      totalExportedAmount,
      totalBatchAmount
    };
  }, [paymentBatches]);

  const handleApproveBatch = async (batch: PaymentBatchRecord) => {
    if (!companyId) return;
    setProcessing(true);
    try {
      const res = await FirestoreService.approvePaymentBatch(
        companyId,
        batch.id,
        { uid: userSession.userId, name: userSession.fullName || userSession.email || 'Admin' }
      );
      if (res.success) {
        const updated = await FirestoreService.getPaymentBatches(companyId);
        setPaymentBatches(updated);
        setSelectedBatchForDetail(null);
      }
    } catch (err) {
      console.error('Approve batch error:', err);
    } finally {
      setProcessing(false);
    }
  };

  // Run Monthly Payroll
  const handleExecutePayroll = async () => {
    if (!companyId) return;
    setProcessing(true);
    setCalcFeedback(null);
    try {
      const res = await FirestoreService.executeMonthlyPayrollCalculation(
        companyId,
        calcMonth,
        calcYear,
        { uid: userSession.userId, name: userSession.fullName || userSession.email }
      );
      if (res.success) {
        setSelectedCycleId(res.cycleId);
        setCalcFeedback({ success: true, message: `Successfully computed payroll for ${res.totalSlips} employees.` });
        setShowCalcModal(false);
        const updated = await FirestoreService.getSalarySlips(companyId, res.cycleId);
        setCycleSlips(updated);
      } else {
        setCalcFeedback({ success: false, message: 'Payroll calculation completed with errors. Check run log.' });
      }
    } catch (err: any) {
      console.error('Payroll calculation failed:', err);
      setCalcFeedback({ success: false, message: err?.message || 'Payroll computation failed.' });
    } finally {
      setProcessing(false);
    }
  };

  // Approve Cycle
  const handleApproveCycle = async (cycleId: string) => {
    if (!companyId) return;
    setProcessing(true);
    try {
      await FirestoreService.updatePayrollCycleStatus(companyId, cycleId, 'APPROVED', {
        uid: userSession.userId,
        name: userSession.fullName || userSession.email
      });
      const updated = await FirestoreService.getSalarySlips(companyId, cycleId);
      setCycleSlips(updated);
    } finally {
      setProcessing(false);
    }
  };

  // Disburse Cycle
  const handleDisburseCycle = async (cycleId: string) => {
    if (!companyId) return;
    setProcessing(true);
    try {
      await FirestoreService.updatePayrollCycleStatus(companyId, cycleId, 'DISBURSED', {
        uid: userSession.userId,
        name: userSession.fullName || userSession.email
      });
      const updated = await FirestoreService.getSalarySlips(companyId, cycleId);
      setCycleSlips(updated);
    } finally {
      setProcessing(false);
    }
  };

  // Save Salary Structure
  const handleSaveStructure = async () => {
    if (!companyId || !structForm.name) return;
    setProcessing(true);
    try {
      await FirestoreService.saveSalaryStructure(companyId, structForm as SalaryStructureRecord);
      setShowStructModal(false);
    } finally {
      setProcessing(false);
    }
  };

  // Save Profile
  const handleSaveProfile = async () => {
    if (!companyId || !profileForm?.employeeId) return;
    setProcessing(true);
    try {
      await FirestoreService.saveSalaryProfile(companyId, profileForm as EmployeeSalaryProfileRecord);
      setShowProfileModal(false);
    } finally {
      setProcessing(false);
    }
  };

  // My Slips Metrics
  const mySlipsMetrics = useMemo(() => {
    const totalEarned = mySlips.reduce((sum, s) => sum + (s.netPay || 0), 0);
    const totalGross = mySlips.reduce((sum, s) => sum + (s.earnings?.totalGross || 0), 0);
    const totalDeductions = mySlips.reduce((sum, s) => sum + (s.deductions?.totalDeductions || 0), 0);
    const avgMonthly = mySlips.length > 0 ? Math.round(totalEarned / mySlips.length) : 0;
    return { totalEarned, totalGross, totalDeductions, avgMonthly, count: mySlips.length };
  }, [mySlips]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 md:p-6 space-y-6">
      
      {/* Top Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-600/20">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900 dark:text-white">
                Payroll & Payslip Management
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                ERP Finance
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Authoritative salary computation, statutory compliance, and vector payslip publishing
            </p>
          </div>
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center gap-2.5">
          {canManagePayroll && (
            <button
              type="button"
              onClick={() => setShowCalcModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition-colors"
            >
              <Sparkles className="w-4 h-4" />
              Process Monthly Payroll
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              if (companyId) {
                FirestoreService.getPayrollCycles(companyId).then(setCycles);
                if (selectedCycleId) {
                  FirestoreService.getSalarySlips(companyId, selectedCycleId).then(setCycleSlips);
                }
              }
            }}
            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            title="Refresh Data"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-slate-200 dark:border-slate-800">
        {canManagePayroll && (
          <>
            <button
              type="button"
              onClick={() => setActiveTab('RUNS')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                activeTab === 'RUNS'
                  ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Calendar className="w-4 h-4" />
              Payroll Runs ({cycles.length})
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('SLIPS')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                activeTab === 'SLIPS'
                  ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <FileText className="w-4 h-4" />
              Payslips & Distribution
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('BANK_EXPORT')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                activeTab === 'BANK_EXPORT'
                  ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Landmark className="w-4 h-4" />
              NEFT/RTGS Bank Export ({paymentBatches.length})
            </button>
          </>
        )}

        <button
          type="button"
          onClick={() => setActiveTab('MY_SLIPS')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === 'MY_SLIPS'
              ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          My Payslips ({mySlips.length})
        </button>

        {canManagePayroll && (
          <>
            <button
              type="button"
              onClick={() => setActiveTab('STRUCTURES')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                activeTab === 'STRUCTURES'
                  ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Layers className="w-4 h-4" />
              Salary Structures ({structures.length})
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('PROFILES')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                activeTab === 'PROFILES'
                  ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Users className="w-4 h-4" />
              Salary Profiles ({profiles.length})
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('ADVANCES')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                activeTab === 'ADVANCES'
                  ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <TrendingUp className="w-4 h-4" />
              Advances & Deductions ({advances.length})
            </button>
          </>
        )}
      </div>

      {/* ============================================================ */}
      {/* TAB 1: PAYROLL RUNS & CYCLES */}
      {/* ============================================================ */}
      {activeTab === 'RUNS' && canManagePayroll && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Total Payroll Cycles</p>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{cycles.length}</h3>
              <p className="text-[11px] text-slate-400 mt-1">Active fiscal cycles</p>
            </div>

            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Latest Cycle Disbursed</p>
              <h3 className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                {cycles.find(c => c.status === 'DISBURSED' || c.status === 'APPROVED')?.cycleLabel || 'None'}
              </h3>
              <p className="text-[11px] text-slate-400 mt-1">Approved & Verified</p>
            </div>

            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Active Staff in Payroll</p>
              <h3 className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">{employees.length}</h3>
              <p className="text-[11px] text-slate-400 mt-1">Enrolled profiles: {profiles.length}</p>
            </div>

            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Statutory Compliance Slabs</p>
              <h3 className="text-2xl font-bold text-purple-600 dark:text-purple-400 mt-1">PF / ESIC / PT / TDS</h3>
              <p className="text-[11px] text-slate-400 mt-1">Auto computed via engine</p>
            </div>
          </div>

          {/* Cycles Table */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Monthly Payroll Processing Runs</h3>
                <p className="text-xs text-slate-500">Authoritative calculation cycles and approval logs</p>
              </div>
              <button
                type="button"
                onClick={() => setShowCalcModal(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold shadow-xs hover:opacity-90 transition-opacity"
              >
                <Plus className="w-3.5 h-3.5" />
                New Calculation Run
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 uppercase font-semibold tracking-wider">
                  <tr>
                    <th className="px-5 py-3">Cycle Label</th>
                    <th className="px-5 py-3">Employees</th>
                    <th className="px-5 py-3">Total Gross</th>
                    <th className="px-5 py-3">Total Deductions</th>
                    <th className="px-5 py-3">Net Take Home</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3">Processed On</th>
                    <th className="px-5 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {cycles.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-5 py-8 text-center text-slate-400">
                        No payroll runs executed yet. Click &quot;Process Monthly Payroll&quot; to execute.
                      </td>
                    </tr>
                  ) : (
                    cycles.map((cycle) => (
                      <tr key={cycle.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="px-5 py-3.5 font-bold text-slate-900 dark:text-white">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-emerald-600" />
                            {cycle.cycleLabel || cycle.id}
                          </div>
                        </td>
                        <td className="px-5 py-3.5 font-medium text-slate-600 dark:text-slate-300">
                          {cycle.totalEmployees} staff
                        </td>
                        <td className="px-5 py-3.5 font-semibold text-slate-800 dark:text-slate-200">
                          ₹ {(cycle.totalGrossPay || 0).toLocaleString('en-IN')}
                        </td>
                        <td className="px-5 py-3.5 font-semibold text-rose-600 dark:text-rose-400">
                          ₹ {(cycle.totalDeductions || 0).toLocaleString('en-IN')}
                        </td>
                        <td className="px-5 py-3.5 font-bold text-emerald-600 dark:text-emerald-400">
                          ₹ {(cycle.totalNetPay || 0).toLocaleString('en-IN')}
                        </td>
                        <td className="px-5 py-3.5">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                            cycle.status === 'DISBURSED'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                              : cycle.status === 'APPROVED'
                              ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300'
                              : 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300'
                          }`}>
                            {cycle.status === 'DISBURSED' && <CheckCircle2 className="w-3 h-3" />}
                            {cycle.status === 'APPROVED' && <Shield className="w-3 h-3" />}
                            {cycle.status}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-slate-500 font-mono text-[11px]">
                          {cycle.processedAt ? new Date(cycle.processedAt).toLocaleDateString() : '—'}
                        </td>
                        <td className="px-5 py-3.5 text-right space-x-2">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedCycleId(cycle.id);
                              setActiveTab('SLIPS');
                            }}
                            className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs"
                          >
                            View Payslips
                          </button>

                          {cycle.status === 'CALCULATED' && (
                            <button
                              type="button"
                              onClick={() => handleApproveCycle(cycle.id)}
                              disabled={processing}
                              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-xs"
                            >
                              Approve Cycle
                            </button>
                          )}

                          {cycle.status === 'APPROVED' && (
                            <button
                              type="button"
                              onClick={() => handleDisburseCycle(cycle.id)}
                              disabled={processing}
                              className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs shadow-xs"
                            >
                              Mark Disbursed
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* TAB 2: CENTRAL PAYSLIP MANAGEMENT (ADMIN / HR) */}
      {/* ============================================================ */}
      {activeTab === 'SLIPS' && canManagePayroll && (
        <div className="space-y-6">
          {/* Cycle Selector & Warning Banner if not approved */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-300">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Select Payroll Period
                  </label>
                  <select
                    value={selectedCycleId}
                    onChange={(e) => setSelectedCycleId(e.target.value)}
                    className="mt-0.5 text-sm font-bold text-slate-900 dark:text-white bg-transparent border-none focus:ring-0 cursor-pointer p-0"
                  >
                    {cycles.map((c) => (
                      <option key={c.id} value={c.id} className="text-slate-900">
                        {c.cycleLabel || c.id} — ({c.status})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Cycle Status & Summary Metrics */}
              {activeCycle && (
                <div className="flex flex-wrap items-center gap-4 text-xs">
                  <div className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                    <span className="text-slate-500">Total Slips:</span>{' '}
                    <span className="font-bold text-slate-900 dark:text-white">{cycleSlips.length}</span>
                  </div>
                  <div className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                    <span className="text-slate-500">Published:</span>{' '}
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">
                      {cycleSlips.filter(s => s.isPublished).length}
                    </span>
                  </div>
                  <div className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                    <span className="text-slate-500">Net Disbursed:</span>{' '}
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">
                      ₹ {(activeCycle.totalNetPay || 0).toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Cycle Status Guard Warning */}
            {activeCycle && activeCycle.status === 'CALCULATED' && (
              <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 flex items-center justify-between text-xs text-amber-800 dark:text-amber-300">
                <div className="flex items-center gap-2.5">
                  <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
                  <span>
                    <strong>Cycle is in Calculated State:</strong> Please verify and click &quot;Approve Cycle&quot; before publishing authoritative payslips to employees.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleApproveCycle(activeCycle.id)}
                  disabled={processing}
                  className="px-3 py-1 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-lg shadow-xs"
                >
                  Approve Cycle Now
                </button>
              </div>
            )}
          </div>

          {/* Search, Filters, and Bulk Action Bar */}
          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            {/* Search & Department Filter */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative min-w-[240px]">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by name, ID or code..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>

              <select
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
                className="px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
              >
                <option value="ALL">All Departments</option>
                {departments.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>

              <select
                value={publishStatusFilter}
                onChange={(e) => setPublishStatusFilter(e.target.value as any)}
                className="px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
              >
                <option value="ALL">All Slips</option>
                <option value="PUBLISHED">Published Only</option>
                <option value="UNPUBLISHED">Unpublished Drafts</option>
              </select>
            </div>

            {/* Bulk Action Buttons */}
            <div className="flex items-center gap-2">
              {selectedSlipIds.length > 0 && (
                <button
                  type="button"
                  onClick={handleBulkPublish}
                  disabled={processing}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-xs transition-colors"
                >
                  <Send className="w-3.5 h-3.5" />
                  Publish Selected ({selectedSlipIds.length})
                </button>
              )}

              <button
                type="button"
                onClick={handleBulkPublishAll}
                disabled={processing || cycleSlips.length === 0}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white text-xs font-semibold border border-slate-700 transition-colors"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                Publish All
              </button>

              <button
                type="button"
                onClick={handleBulkDownloadPDFs}
                disabled={cycleSlips.length === 0}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold border border-slate-200 dark:border-slate-700 transition-colors"
                title="Download Vector PDFs"
              >
                <Download className="w-3.5 h-3.5" />
                Download PDFs
              </button>

              <button
                type="button"
                onClick={handleExportCSV}
                disabled={cycleSlips.length === 0}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold border border-slate-200 dark:border-slate-700 transition-colors"
                title="Export CSV Summary"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                Export CSV
              </button>
            </div>
          </div>

          {/* Payslips Table */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 uppercase font-semibold tracking-wider">
                  <tr>
                    <th className="px-4 py-3 w-10">
                      <button
                        type="button"
                        onClick={handleSelectAll}
                        className="text-slate-500 hover:text-slate-900 dark:hover:text-white"
                      >
                        {selectedSlipIds.length > 0 && selectedSlipIds.length === filteredCycleSlips.length ? (
                          <CheckSquare className="w-4 h-4 text-emerald-600" />
                        ) : (
                          <Square className="w-4 h-4" />
                        )}
                      </button>
                    </th>
                    <th className="px-4 py-3">Employee Details</th>
                    <th className="px-4 py-3">Worked / Days</th>
                    <th className="px-4 py-3">Gross Earnings</th>
                    <th className="px-4 py-3">Deductions</th>
                    <th className="px-4 py-3">Net Take-Home</th>
                    <th className="px-4 py-3">Publish Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredCycleSlips.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-slate-400">
                        No salary slips found matching criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredCycleSlips.map((slip) => {
                      const isSelected = selectedSlipIds.includes(slip.id);
                      return (
                        <tr
                          key={slip.id}
                          className={`hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors ${
                            isSelected ? 'bg-emerald-50/30 dark:bg-emerald-950/20' : ''
                          }`}
                        >
                          <td className="px-4 py-3.5">
                            <button
                              type="button"
                              onClick={() => handleToggleSelectSlip(slip.id)}
                              className="text-slate-500 hover:text-slate-900"
                            >
                              {isSelected ? (
                                <CheckSquare className="w-4 h-4 text-emerald-600" />
                              ) : (
                                <Square className="w-4 h-4" />
                              )}
                            </button>
                          </td>
                          <td className="px-4 py-3.5">
                            <div>
                              <p className="font-bold text-slate-900 dark:text-white">{slip.employeeName}</p>
                              <p className="text-[11px] text-slate-400 font-mono">
                                {slip.employeeCode || slip.employeeId} • {slip.departmentName || 'Operations'}
                              </p>
                            </div>
                          </td>
                          <td className="px-4 py-3.5">
                            <span className="font-semibold text-slate-800 dark:text-slate-200">{slip.workedDays}</span>
                            <span className="text-slate-400"> / {slip.totalMonthDays} days</span>
                            {slip.lopDays > 0 && (
                              <p className="text-[10px] text-rose-500 font-medium">{slip.lopDays} LOP days</p>
                            )}
                          </td>
                          <td className="px-4 py-3.5 font-semibold text-slate-800 dark:text-slate-200">
                            ₹ {(slip.earnings?.totalGross || 0).toLocaleString('en-IN')}
                          </td>
                          <td className="px-4 py-3.5 font-semibold text-rose-600 dark:text-rose-400">
                            ₹ {(slip.deductions?.totalDeductions || 0).toLocaleString('en-IN')}
                          </td>
                          <td className="px-4 py-3.5 font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                            ₹ {(slip.netPay || 0).toLocaleString('en-IN')}
                          </td>
                          <td className="px-4 py-3.5">
                            {slip.isPublished ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                                <CheckCircle2 className="w-3 h-3" /> Published
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                                <Clock className="w-3 h-3" /> Draft
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3.5 text-right space-x-1.5 whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => setSelectedSlipForModal(slip)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium text-xs transition-colors"
                              title="View / Preview Slip"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              View
                            </button>

                            <button
                              type="button"
                              onClick={() => PayslipService.downloadPDF(slip, activeCompany)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 font-semibold text-xs border border-emerald-200 dark:border-emerald-800 transition-colors"
                              title="Download PDF"
                            >
                              <Download className="w-3.5 h-3.5" />
                              PDF
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* TAB: NEFT / RTGS BANK BATCH EXPORT */}
      {/* ============================================================ */}
      {activeTab === 'BANK_EXPORT' && canManagePayroll && (
        <div className="space-y-6">
          {/* Top Metrics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Total Payment Batches</p>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                {bankMetrics.totalBatches}
              </h3>
              <p className="text-[11px] text-slate-400 mt-1">
                ₹ {bankMetrics.totalBatchAmount.toLocaleString('en-IN')} total batch value
              </p>
            </div>

            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Ready for Approval</p>
              <h3 className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">
                {bankMetrics.readyForApproval}
              </h3>
              <p className="text-[11px] text-slate-400 mt-1">Awaiting financial authorization</p>
            </div>

            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Exported to Bank</p>
              <h3 className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                {bankMetrics.exportedCount}
              </h3>
              <p className="text-[11px] text-slate-400 mt-1">
                ₹ {bankMetrics.totalExportedAmount.toLocaleString('en-IN')} successfully generated
              </p>
            </div>

            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Corporate Bank Accounts</p>
              <h3 className="text-2xl font-bold text-indigo-600 dark:text-indigo-400 mt-1">
                {companyBanks.length}
              </h3>
              <p className="text-[11px] text-slate-400 mt-1">Disbursement source accounts</p>
            </div>
          </div>

          {/* Action & Filter Bar */}
          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              {/* Search */}
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search batches, cycles..."
                  value={batchSearchQuery}
                  onChange={(e) => setBatchSearchQuery(e.target.value)}
                  className="pl-9 pr-4 py-2 rounded-xl text-xs border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white w-56 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              {/* Status Filter */}
              <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
                {(['ALL', 'READY_FOR_APPROVAL', 'APPROVED', 'EXPORTED', 'CANCELLED'] as const).map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setBatchStatusFilter(st)}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                      batchStatusFilter === st
                        ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                        : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    {st === 'ALL' ? 'All Batches' : st.replace(/_/g, ' ')}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setEditingCompanyBank(null);
                  setShowCompanyBankModal(true);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold border border-slate-200 dark:border-slate-700 transition-colors"
              >
                <Building2 className="w-3.5 h-3.5 text-indigo-600" />
                Manage Debit Bank Accounts
              </button>

              <button
                type="button"
                onClick={() => setShowCreateBatchModal(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/20 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Prepare Bank Payment Batch
              </button>
            </div>
          </div>

          {/* Batches Table */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Bank Payment Batches</h3>
                <p className="text-xs text-slate-500">
                  Direct corporate NEFT / RTGS disbursements from approved payroll runs
                </p>
              </div>
              <span className="text-xs text-slate-500 font-mono">
                {filteredBatches.length} of {paymentBatches.length} Batches
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 uppercase font-semibold tracking-wider text-[10px]">
                  <tr>
                    <th className="px-4 py-3">Batch Number</th>
                    <th className="px-4 py-3">Payroll Cycle</th>
                    <th className="px-4 py-3">Mode</th>
                    <th className="px-4 py-3">Beneficiaries</th>
                    <th className="px-4 py-3">Total Amount (INR)</th>
                    <th className="px-4 py-3">Debit Bank</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredBatches.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-12 text-center text-slate-400">
                        <Landmark className="w-8 h-8 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
                        <p className="font-semibold text-slate-600 dark:text-slate-400">No bank payment batches found</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">Click "Prepare Bank Payment Batch" to create one from an approved payroll cycle.</p>
                      </td>
                    </tr>
                  ) : (
                    filteredBatches.map((batch) => {
                      const defaultBank = companyBanks.find(b => b.id === batch.companyBankAccountId) || companyBanks[0] || null;
                      return (
                        <tr key={batch.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                          <td className="px-4 py-3.5">
                            <button
                              type="button"
                              onClick={() => setSelectedBatchForDetail(batch)}
                              className="font-mono font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 text-xs"
                            >
                              {batch.batchNumber}
                            </button>
                            <span className="text-[10px] text-slate-400">
                              Created by {batch.createdByName || 'Admin'}
                            </span>
                          </td>
                          <td className="px-4 py-3.5">
                            <div className="font-semibold text-slate-900 dark:text-white">
                              {batch.payrollCycleLabel}
                            </div>
                            <div className="text-[10px] text-slate-400">
                              Month {batch.month}/{batch.year}
                            </div>
                          </td>
                          <td className="px-4 py-3.5">
                            <span className={`inline-flex px-2 py-0.5 rounded-md font-bold text-[10px] ${
                              batch.paymentMethod === 'RTGS' 
                                ? 'bg-purple-100 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300' 
                                : batch.paymentMethod === 'NEFT'
                                ? 'bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300'
                                : 'bg-indigo-100 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300'
                            }`}>
                              {batch.paymentMethod}
                            </span>
                          </td>
                          <td className="px-4 py-3.5">
                            <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                              {batch.validBeneficiaryCount}
                            </span>
                            <span className="text-slate-400"> / {batch.beneficiaryCount}</span>
                            {batch.beneficiaryCount - batch.validBeneficiaryCount > 0 && (
                              <span className="text-[10px] text-rose-500 font-medium ml-1">
                                ({batch.beneficiaryCount - batch.validBeneficiaryCount} invalid)
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3.5 font-bold text-slate-900 dark:text-white text-sm">
                            ₹ {batch.totalAmount.toLocaleString('en-IN')}
                          </td>
                          <td className="px-4 py-3.5">
                            <div className="font-medium text-slate-800 dark:text-slate-200 truncate max-w-[120px]">
                              {batch.companyBankName || defaultBank?.bankName || 'Company Account'}
                            </div>
                            <div className="text-[10px] font-mono text-slate-400">
                              {batch.companyMaskedAccount || defaultBank?.maskedAccountNumber || '••••••••1234'}
                            </div>
                          </td>
                          <td className="px-4 py-3.5">
                            {batch.status === 'APPROVED' && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                                <CheckCircle2 className="w-3 h-3" /> Approved
                              </span>
                            )}
                            {batch.status === 'EXPORTED' && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-100 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                                <Download className="w-3 h-3" /> Exported (v{batch.exportVersion || 1})
                              </span>
                            )}
                            {batch.status === 'READY_FOR_APPROVAL' && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                                <Clock className="w-3 h-3" /> Ready for Approval
                              </span>
                            )}
                            {batch.status === 'VALIDATION_FAILED' && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                                <AlertCircle className="w-3 h-3" /> Validation Issues
                              </span>
                            )}
                            {batch.status === 'CANCELLED' && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                                <Ban className="w-3 h-3" /> Cancelled
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3.5 text-right space-x-1.5 whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => setSelectedBatchForDetail(batch)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium text-xs transition-colors"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              Inspect
                            </button>

                            {batch.status !== 'APPROVED' && batch.status !== 'EXPORTED' && batch.status !== 'CANCELLED' && (isSuperAdmin || isCompanyAdmin) && (
                              <button
                                type="button"
                                onClick={() => handleApproveBatch(batch)}
                                disabled={processing || batch.validBeneficiaryCount === 0}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-xs transition-colors"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                Approve
                              </button>
                            )}

                            {(batch.status === 'APPROVED' || batch.status === 'EXPORTED') && (
                              <button
                                type="button"
                                onClick={() => setSelectedBatchForExport(batch)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-xs transition-colors"
                              >
                                <Download className="w-3.5 h-3.5" />
                                Export File
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* TAB 3: MY PAYSLIPS (EMPLOYEE SELF-SERVICE) */}
      {/* ============================================================ */}
      {activeTab === 'MY_SLIPS' && (
        <div className="space-y-6">
          {/* Employee Annual Earnings Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Total Net Take-Home (YTD)</p>
              <h3 className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                ₹ {mySlipsMetrics.totalEarned.toLocaleString('en-IN')}
              </h3>
              <p className="text-[11px] text-slate-400 mt-1">Across {mySlipsMetrics.count} payslips</p>
            </div>

            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Average Monthly Salary</p>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                ₹ {mySlipsMetrics.avgMonthly.toLocaleString('en-IN')}
              </h3>
              <p className="text-[11px] text-slate-400 mt-1">Net compensation average</p>
            </div>

            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Total Gross Earnings</p>
              <h3 className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">
                ₹ {mySlipsMetrics.totalGross.toLocaleString('en-IN')}
              </h3>
              <p className="text-[11px] text-slate-400 mt-1">Base + allowances + overtime</p>
            </div>

            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Total Statutory Deductions</p>
              <h3 className="text-2xl font-bold text-rose-600 dark:text-rose-400 mt-1">
                ₹ {mySlipsMetrics.totalDeductions.toLocaleString('en-IN')}
              </h3>
              <p className="text-[11px] text-slate-400 mt-1">PF, ESIC, PT, TDS</p>
            </div>
          </div>

          {/* My Slips History List */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Monthly Payslip Archive</h3>
                <p className="text-xs text-slate-500">Official digitally verified salary statements for download</p>
              </div>
              <span className="text-xs text-slate-500 font-mono">
                Employee: {userSession.fullName || userSession.email}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 uppercase font-semibold tracking-wider">
                  <tr>
                    <th className="px-5 py-3">Salary Month</th>
                    <th className="px-5 py-3">Worked Days</th>
                    <th className="px-5 py-3">Gross Salary</th>
                    <th className="px-5 py-3">Deductions</th>
                    <th className="px-5 py-3">Net Take-Home</th>
                    <th className="px-5 py-3">Disbursement Status</th>
                    <th className="px-5 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {mySlips.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-5 py-10 text-center text-slate-400">
                        No published salary slips found for your account yet.
                      </td>
                    </tr>
                  ) : (
                    mySlips.map((slip) => {
                      const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
                      const mLabel = `${monthNames[(slip.month || 1) - 1]} ${slip.year}`;
                      return (
                        <tr key={slip.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                          <td className="px-5 py-4 font-bold text-slate-900 dark:text-white">
                            <div className="flex items-center gap-2">
                              <FileText className="w-4 h-4 text-emerald-600" />
                              {mLabel}
                            </div>
                          </td>
                          <td className="px-5 py-4 font-medium text-slate-700 dark:text-slate-300">
                            {slip.workedDays} / {slip.totalMonthDays} days
                          </td>
                          <td className="px-5 py-4 font-semibold text-slate-800 dark:text-slate-200">
                            ₹ {(slip.earnings?.totalGross || 0).toLocaleString('en-IN')}
                          </td>
                          <td className="px-5 py-4 font-semibold text-rose-600 dark:text-rose-400">
                            ₹ {(slip.deductions?.totalDeductions || 0).toLocaleString('en-IN')}
                          </td>
                          <td className="px-5 py-4 font-black text-emerald-600 dark:text-emerald-400 text-sm">
                            ₹ {(slip.netPay || 0).toLocaleString('en-IN')}
                          </td>
                          <td className="px-5 py-4">
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
                              <CheckCircle2 className="w-3 h-3" /> Disbursed
                            </span>
                          </td>
                          <td className="px-5 py-4 text-right space-x-2">
                            <button
                              type="button"
                              onClick={() => setSelectedSlipForModal(slip)}
                              className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs transition-colors"
                            >
                              Preview
                            </button>

                            <button
                              type="button"
                              onClick={() => PayslipService.downloadPDF(slip, activeCompany)}
                              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-xs transition-colors inline-flex items-center gap-1"
                            >
                              <Download className="w-3.5 h-3.5" />
                              Download PDF
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* TAB 4: SALARY STRUCTURES */}
      {/* ============================================================ */}
      {activeTab === 'STRUCTURES' && canManagePayroll && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Compensation Structures</h3>
              <p className="text-xs text-slate-500">Define statutory component breakdown and allowance percentages</p>
            </div>
            <button
              type="button"
              onClick={() => setShowStructModal(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-xs"
            >
              <Plus className="w-4 h-4" />
              Add Structure
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {structures.map((s) => (
              <div key={s.id} className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-900 dark:text-white text-sm">{s.name}</h4>
                  <span className="px-2 py-0.5 rounded-md font-mono text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                    {s.code}
                  </span>
                </div>

                <div className="space-y-2 text-xs divide-y divide-slate-100 dark:divide-slate-800">
                  <div className="flex justify-between pt-1">
                    <span className="text-slate-500">Basic Share:</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">{s.basicPercentage}%</span>
                  </div>
                  <div className="flex justify-between pt-1">
                    <span className="text-slate-500">HRA Share:</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">{s.hraPercentage}%</span>
                  </div>
                  <div className="flex justify-between pt-1">
                    <span className="text-slate-500">DA Share:</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">{s.daPercentage}%</span>
                  </div>
                  <div className="flex justify-between pt-1">
                    <span className="text-slate-500">Conveyance Allowance:</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">₹ {s.conveyanceAllowance || 0}</span>
                  </div>
                  <div className="flex justify-between pt-1">
                    <span className="text-slate-500">Medical Allowance:</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">₹ {s.medicalAllowance || 0}</span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  {s.pfApplicable && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                      PF Enabled
                    </span>
                  )}
                  {s.esicApplicable && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
                      ESIC Enabled
                    </span>
                  )}
                  {s.ptApplicable && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300">
                      PT Enabled
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* TAB 5: EMPLOYEE SALARY PROFILES */}
      {/* ============================================================ */}
      {activeTab === 'PROFILES' && canManagePayroll && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
          <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Staff Compensation Profiles</h3>
              <p className="text-xs text-slate-500">Bank accounts, statutory IDs (PAN/UAN), and monthly CTC</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 uppercase font-semibold tracking-wider">
                <tr>
                  <th className="px-5 py-3">Employee Name</th>
                  <th className="px-5 py-3">Base Salary</th>
                  <th className="px-5 py-3">Monthly CTC</th>
                  <th className="px-5 py-3">Bank Details</th>
                  <th className="px-5 py-3">PAN / UAN</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {employees.map((emp) => {
                  const prof = profiles.find(p => p.employeeId === emp.id || p.id === emp.id);
                  return (
                    <tr key={emp.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="px-5 py-3.5">
                        <p className="font-bold text-slate-900 dark:text-white">{emp.firstName} {emp.lastName}</p>
                        <p className="text-[11px] text-slate-400 font-mono">{emp.id} • {emp.designation || 'Staff'}</p>
                      </td>
                      <td className="px-5 py-3.5 font-semibold text-slate-800 dark:text-slate-200">
                        ₹ {(prof?.baseMonthlySalary || 18000).toLocaleString('en-IN')}
                      </td>
                      <td className="px-5 py-3.5 font-bold text-emerald-600 dark:text-emerald-400">
                        ₹ {(prof?.monthlyCtc || 21500).toLocaleString('en-IN')}
                      </td>
                      <td className="px-5 py-3.5 font-mono text-[11px] text-slate-600 dark:text-slate-400">
                        {prof?.bankName || 'State Bank of India'}<br />
                        <span className="text-slate-400">{prof?.accountNumber || '••••••••1234'} ({prof?.ifscCode || 'SBIN0001234'})</span>
                      </td>
                      <td className="px-5 py-3.5 font-mono text-[11px] text-slate-600 dark:text-slate-400">
                        PAN: {prof?.panNumber || 'ABCDE1234F'}<br />
                        UAN: {prof?.uanNumber || '100123456789'}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <button
                          type="button"
                          onClick={() => {
                            setProfileForm(prof || {
                              id: emp.id,
                              companyId,
                              employeeId: emp.id,
                              employeeName: `${emp.firstName} ${emp.lastName}`,
                              structureId: structures[0]?.id || 'STD_SEC',
                              monthlyCtc: 21500,
                              baseMonthlySalary: 18000,
                              bankName: 'State Bank of India',
                              accountNumber: '12345678901',
                              ifscCode: 'SBIN0001234',
                              panNumber: 'ABCDE1234F',
                              paymentMode: 'BANK_TRANSFER'
                            });
                            setShowProfileModal(true);
                          }}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
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
      )}

      {/* ============================================================ */}
      {/* TAB 6: ADVANCES & DEDUCTIONS */}
      {/* ============================================================ */}
      {activeTab === 'ADVANCES' && canManagePayroll && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Salary Advances & Loan Recoveries</h3>
              <p className="text-xs text-slate-500">Track approved loans and automatic monthly payroll installment deductions</p>
            </div>
            <button
              type="button"
              onClick={() => setShowAdvanceModal(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-xs"
            >
              <Plus className="w-4 h-4" />
              Request Advance
            </button>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 uppercase font-semibold tracking-wider">
                  <tr>
                    <th className="px-5 py-3">Employee</th>
                    <th className="px-5 py-3">Requested Amount</th>
                    <th className="px-5 py-3">Monthly Deduction</th>
                    <th className="px-5 py-3">Remaining Balance</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3">Reason</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {advances.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-5 py-8 text-center text-slate-400">
                        No active salary advance requests.
                      </td>
                    </tr>
                  ) : (
                    advances.map((adv) => (
                      <tr key={adv.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="px-5 py-3.5 font-bold text-slate-900 dark:text-white">
                          {adv.employeeName}
                        </td>
                        <td className="px-5 py-3.5 font-semibold text-slate-800 dark:text-slate-200">
                          ₹ {(adv.amount || 0).toLocaleString('en-IN')}
                        </td>
                        <td className="px-5 py-3.5 font-semibold text-rose-600 dark:text-rose-400">
                          ₹ {(adv.monthlyDeductionAmount || 0).toLocaleString('en-IN')} / mo
                        </td>
                        <td className="px-5 py-3.5 font-bold text-emerald-600 dark:text-emerald-400">
                          ₹ {(adv.remainingAmount || 0).toLocaleString('en-IN')}
                        </td>
                        <td className="px-5 py-3.5">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                            adv.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                          }`}>
                            {adv.status}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-slate-500 max-w-xs truncate">
                          {adv.reason || 'Personal necessity'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL: INTERACTIVE PAYSLIP PREVIEW & PUBLISHING */}
      {/* ============================================================ */}
      {selectedSlipForModal && (
        <PayslipModal
          slip={selectedSlipForModal}
          company={activeCompany}
          userSession={userSession}
          onClose={() => setSelectedSlipForModal(null)}
          onStatusChange={async () => {
            if (companyId && selectedCycleId) {
              const updated = await FirestoreService.getSalarySlips(companyId, selectedCycleId);
              setCycleSlips(updated);
            }
          }}
        />
      )}

      {/* ============================================================ */}
      {/* MODAL: PROCESS MONTHLY PAYROLL */}
      {/* ============================================================ */}
      {showCalcModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Run Monthly Payroll Engine</h3>
                <p className="text-xs text-slate-500">Executes statutory deduction algorithms & attendance proration</p>
              </div>
            </div>

            {calcFeedback && (
              <div className={`p-3 rounded-xl text-xs font-semibold ${
                calcFeedback.success ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'
              }`}>
                {calcFeedback.message}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Month</label>
                <select
                  value={calcMonth}
                  onChange={(e) => setCalcMonth(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
                >
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => {
                    const mName = new Date(2026, m - 1, 1).toLocaleString('default', { month: 'long' });
                    return <option key={m} value={m}>{mName}</option>;
                  })}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Year</label>
                <input
                  type="number"
                  value={calcYear}
                  onChange={(e) => setCalcYear(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
                />
              </div>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-400 space-y-1">
              <p className="font-semibold text-slate-800 dark:text-slate-200">Execution Checks:</p>
              <p>• Verified attendance & approved leave records will be ingested.</p>
              <p>• PF (12%), ESIC (0.75%), PT, and TDS statutory caps applied.</p>
              <p>• Advances with remaining balance will have recovery deducted.</p>
            </div>

            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowCalcModal(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={processing}
                onClick={handleExecutePayroll}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/20"
              >
                {processing ? 'Calculating...' : 'Run Calculation'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL: SALARY STRUCTURE CREATE/EDIT */}
      {/* ============================================================ */}
      {showStructModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Create Salary Structure</h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Structure Name</label>
                <input
                  type="text"
                  value={structForm.name || ''}
                  onChange={(e) => setStructForm({ ...structForm, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Basic %</label>
                  <input
                    type="number"
                    value={structForm.basicPercentage || 50}
                    onChange={(e) => setStructForm({ ...structForm, basicPercentage: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">HRA %</label>
                  <input
                    type="number"
                    value={structForm.hraPercentage || 20}
                    onChange={(e) => setStructForm({ ...structForm, hraPercentage: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">DA %</label>
                  <input
                    type="number"
                    value={structForm.daPercentage || 15}
                    onChange={(e) => setStructForm({ ...structForm, daPercentage: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Conveyance Allowance (₹)</label>
                  <input
                    type="number"
                    value={structForm.conveyanceAllowance || 1600}
                    onChange={(e) => setStructForm({ ...structForm, conveyanceAllowance: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Medical Allowance (₹)</label>
                  <input
                    type="number"
                    value={structForm.medicalAllowance || 1250}
                    onChange={(e) => setStructForm({ ...structForm, medicalAllowance: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2.5 pt-4">
              <button
                type="button"
                onClick={() => setShowStructModal(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={processing}
                onClick={handleSaveStructure}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-xs"
              >
                Save Structure
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL: EDIT EMPLOYEE SALARY PROFILE */}
      {/* ============================================================ */}
      {showProfileModal && profileForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Edit Salary Profile — {profileForm.employeeName}
            </h3>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Base Monthly Salary (₹)</label>
                  <input
                    type="number"
                    value={profileForm.baseMonthlySalary || 18000}
                    onChange={(e) => setProfileForm({ ...profileForm, baseMonthlySalary: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Monthly CTC (₹)</label>
                  <input
                    type="number"
                    value={profileForm.monthlyCtc || 21500}
                    onChange={(e) => setProfileForm({ ...profileForm, monthlyCtc: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Bank Name</label>
                <input
                  type="text"
                  value={profileForm.bankName || ''}
                  onChange={(e) => setProfileForm({ ...profileForm, bankName: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Account Number</label>
                  <input
                    type="text"
                    value={profileForm.accountNumber || ''}
                    onChange={(e) => setProfileForm({ ...profileForm, accountNumber: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">IFSC Code</label>
                  <input
                    type="text"
                    value={profileForm.ifscCode || ''}
                    onChange={(e) => setProfileForm({ ...profileForm, ifscCode: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono uppercase"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">PAN Number</label>
                  <input
                    type="text"
                    value={profileForm.panNumber || ''}
                    onChange={(e) => setProfileForm({ ...profileForm, panNumber: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono uppercase"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">UAN Number</label>
                  <input
                    type="text"
                    value={profileForm.uanNumber || ''}
                    onChange={(e) => setProfileForm({ ...profileForm, uanNumber: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2.5 pt-4">
              <button
                type="button"
                onClick={() => setShowProfileModal(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={processing}
                onClick={handleSaveProfile}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-xs"
              >
                Save Profile
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL: REQUEST SALARY ADVANCE */}
      {/* ============================================================ */}
      {showAdvanceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Request Salary Advance</h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Advance Amount (₹)</label>
                <input
                  type="number"
                  value={advanceForm.amount}
                  onChange={(e) => setAdvanceForm({ ...advanceForm, amount: Number(e.target.value) })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Monthly Deduction / Installment (₹)</label>
                <input
                  type="number"
                  value={advanceForm.monthlyDeductionAmount}
                  onChange={(e) => setAdvanceForm({ ...advanceForm, monthlyDeductionAmount: Number(e.target.value) })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Reason</label>
                <textarea
                  value={advanceForm.reason}
                  onChange={(e) => setAdvanceForm({ ...advanceForm, reason: e.target.value })}
                  placeholder="Medical, family necessity, festival advance..."
                  rows={3}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2.5 pt-4">
              <button
                type="button"
                onClick={() => setShowAdvanceModal(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={processing}
                onClick={async () => {
                  if (!companyId) return;
                  setProcessing(true);
                  try {
                    await FirestoreService.createSalaryAdvance(companyId, {
                      companyId,
                      employeeId: advanceForm.employeeId,
                      employeeName: advanceForm.employeeName,
                      amount: advanceForm.amount,
                      monthlyDeductionAmount: advanceForm.monthlyDeductionAmount,
                      reason: advanceForm.reason,
                      status: 'APPROVED',
                      requestedDate: new Date().toISOString()
                    } as any);
                    setShowAdvanceModal(false);
                  } finally {
                    setProcessing(false);
                  }
                }}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-xs"
              >
                Submit Advance
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL: CREATE PAYMENT BATCH */}
      {/* ============================================================ */}
      {showCreateBatchModal && companyId && (
        <CreateBankBatchModal
          companyId={companyId}
          payrollCycles={cycles}
          companyBanks={companyBanks}
          session={userSession}
          existingBatches={paymentBatches}
          onClose={() => setShowCreateBatchModal(false)}
          onSuccess={async (newBatchId) => {
            setShowCreateBatchModal(false);
            const updated = await FirestoreService.getPaymentBatches(companyId);
            setPaymentBatches(updated);
            const created = updated.find(b => b.id === newBatchId);
            if (created) {
              setSelectedBatchForDetail(created);
            }
          }}
        />
      )}

      {/* ============================================================ */}
      {/* MODAL: BANK BATCH DETAIL & AUDIT */}
      {/* ============================================================ */}
      {selectedBatchForDetail && (
        <BankBatchDetailModal
          batch={selectedBatchForDetail}
          companyBank={companyBanks.find(b => b.id === selectedBatchForDetail.companyBankAccountId) || companyBanks[0] || null}
          session={userSession}
          canApprove={isSuperAdmin || isCompanyAdmin}
          canExport={canManagePayroll}
          onClose={() => setSelectedBatchForDetail(null)}
          onApprove={handleApproveBatch}
          onOpenExport={(batch) => {
            setSelectedBatchForDetail(null);
            setSelectedBatchForExport(batch);
          }}
          onRefresh={async () => {
            if (companyId) {
              const updated = await FirestoreService.getPaymentBatches(companyId);
              setPaymentBatches(updated);
            }
          }}
        />
      )}

      {/* ============================================================ */}
      {/* MODAL: SECURE BANK FILE EXPORT */}
      {/* ============================================================ */}
      {selectedBatchForExport && companyId && (
        <BankExportModal
          batch={selectedBatchForExport}
          companyBank={companyBanks.find(b => b.id === selectedBatchForExport.companyBankAccountId) || companyBanks[0] || null}
          companyId={companyId}
          actor={{ uid: userSession.userId, name: userSession.fullName || userSession.email || 'Admin' }}
          onClose={() => setSelectedBatchForExport(null)}
          onExportSuccess={async () => {
            const updated = await FirestoreService.getPaymentBatches(companyId);
            setPaymentBatches(updated);
            setSelectedBatchForExport(null);
          }}
        />
      )}

      {/* ============================================================ */}
      {/* MODAL: COMPANY BANK ACCOUNT */}
      {/* ============================================================ */}
      {showCompanyBankModal && companyId && (
        <CompanyBankModal
          companyId={companyId}
          existingAccount={editingCompanyBank}
          actor={{ uid: userSession.userId, name: userSession.fullName || userSession.email || 'Admin' }}
          onClose={() => {
            setShowCompanyBankModal(false);
            setEditingCompanyBank(null);
          }}
          onSuccess={async () => {
            setShowCompanyBankModal(false);
            setEditingCompanyBank(null);
            const banks = await FirestoreService.getCompanyBankAccounts(companyId);
            setCompanyBanks(banks);
          }}
        />
      )}

    </div>
  );
};
