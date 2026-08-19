import React, { useState, useEffect, useMemo } from 'react';
import { 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  TrendingUp, 
  Users, 
  Filter, 
  Search, 
  Sliders, 
  RefreshCw, 
  FileText, 
  Check, 
  X, 
  Calendar, 
  MapPin, 
  ShieldAlert, 
  Layers, 
  ArrowRight,
  Info,
  Edit3,
  Plus,
  Zap,
  ChevronRight,
  AlertCircle
} from 'lucide-react';
import { 
  UserSession, 
  CompanyTenant, 
  AttendanceRecord, 
  ShiftRecord, 
  SiteRecord, 
  DepartmentRecord,
  OvertimePolicyRecord,
  OvertimeRequestRecord,
  OvertimeAdjustmentRecord,
  AttendanceExceptionType,
  AttendanceCalculationResult
} from '../../types';
import { FirestoreService } from '../../services/firestoreService';
import { BulkExportGovernanceService } from '../../services/bulkExportGovernanceService';
import { AttendanceCalculationEngine } from '../../services/calculationEngine';
import { WorkflowEngine } from '../../services/workflowEngine';

interface Props {
  userSession: UserSession;
  activeCompany: CompanyTenant;
}

type SubTab = 'QUEUE' | 'EXCEPTIONS' | 'POLICIES' | 'ADJUSTMENTS';

export const OvertimeDashboard: React.FC<Props> = ({ userSession, activeCompany }) => {
  const companyId = activeCompany.companyId;

  // Data states
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [shifts, setShifts] = useState<ShiftRecord[]>([]);
  const [sites, setSites] = useState<SiteRecord[]>([]);
  const [departments, setDepartments] = useState<DepartmentRecord[]>([]);
  const [policies, setPolicies] = useState<OvertimePolicyRecord[]>([]);
  const [requests, setRequests] = useState<OvertimeRequestRecord[]>([]);
  const [adjustments, setAdjustments] = useState<OvertimeAdjustmentRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Navigation & filter states
  const [subTab, setSubTab] = useState<SubTab>('QUEUE');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSiteId, setSelectedSiteId] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedException, setSelectedException] = useState<string>('ALL');
  const [dateFilter, setDateFilter] = useState<string>(new Date().toISOString().split('T')[0]);

  // Modals & Action states
  const [selectedExplanation, setSelectedExplanation] = useState<{
    title: string;
    explanation?: string;
    breakdown?: string;
    record?: AttendanceRecord | OvertimeRequestRecord;
  } | null>(null);

  const [reviewModal, setReviewModal] = useState<{
    isOpen: boolean;
    request: OvertimeRequestRecord | null;
    status: 'APPROVED' | 'REJECTED';
    approvedHours: number;
    reason: string;
  }>({
    isOpen: false,
    request: null,
    status: 'APPROVED',
    approvedHours: 0,
    reason: ''
  });

  const [batchRecalcModal, setBatchRecalcModal] = useState<{
    isOpen: boolean;
    startDate: string;
    endDate: string;
    siteId: string;
    isProcessing: boolean;
    result: { processed: number; successCount: number; errorsCount: number } | null;
  }>({
    isOpen: false,
    startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    siteId: 'ALL',
    isProcessing: false,
    result: null
  });

  const [adjustmentModal, setAdjustmentModal] = useState<{
    isOpen: boolean;
    employeeId: string;
    employeeName: string;
    attendanceId: string;
    workDate: string;
    type: 'OVERTIME' | 'LATE' | 'EARLY_DEPARTURE' | 'WORKED_MINUTES';
    originalMinutes: number;
    requestedMinutes: number;
    reason: string;
  }>({
    isOpen: false,
    employeeId: '',
    employeeName: '',
    attendanceId: '',
    workDate: new Date().toISOString().split('T')[0],
    type: 'OVERTIME',
    originalMinutes: 0,
    requestedMinutes: 0,
    reason: ''
  });

  // Selected policy edit state
  const [editingPolicy, setEditingPolicy] = useState<OvertimePolicyRecord | null>(null);
  const [isSavingPolicy, setIsSavingPolicy] = useState(false);
  const [policySaveSuccess, setPolicySaveSuccess] = useState(false);

  // Bulk selection
  const [selectedRequestIds, setSelectedRequestIds] = useState<string[]>([]);
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);

  // Real-time subscriptions
  useEffect(() => {
    let unsubs: (() => void)[] = [];
    if (!companyId) return;

    setIsLoading(true);
    unsubs.push(FirestoreService.subscribeToAttendance(userSession, companyId, setAttendance));
    unsubs.push(FirestoreService.subscribeToShifts(userSession, companyId, setShifts));
    unsubs.push(FirestoreService.subscribeToSites(companyId, setSites));
    unsubs.push(FirestoreService.subscribeToDepartments(companyId, setDepartments));
    unsubs.push(FirestoreService.subscribeToOvertimePolicies(userSession, companyId, (pol) => {
      setPolicies(pol);
      if (pol.length > 0 && !editingPolicy) {
        setEditingPolicy(pol[0]);
      }
    }));
    unsubs.push(FirestoreService.subscribeToOvertimeRequests(userSession, companyId, setRequests));
    unsubs.push(FirestoreService.subscribeToOvertimeAdjustments(userSession, companyId, setAdjustments));
    setIsLoading(false);

    return () => unsubs.forEach(u => u());
  }, [companyId, userSession]);

  // Overall Statistics KPI computation
  const stats = useMemo(() => {
    const relevantAttendance = attendance.filter(a => !dateFilter || a.attendanceDate === dateFilter);
    const totalOTMinutes = relevantAttendance.reduce((acc, a) => acc + (a.overtimeMinutes || 0), 0);
    const approvedOTMinutes = relevantAttendance.reduce((acc, a) => acc + (a.approvedOvertimeMinutes || 0), 0);
    const pendingOTRequests = requests.filter(r => r.status === 'PENDING_APPROVAL').length;
    const lateArrivals = relevantAttendance.filter(a => (a.lateMinutes || 0) > 0).length;
    const earlyDepartures = relevantAttendance.filter(a => (a.earlyDepartureMinutes || 0) > 0).length;
    const totalShortfallMinutes = relevantAttendance.reduce((acc, a) => acc + (a.shortfallMinutes || 0), 0);

    return {
      totalOTHours: (totalOTMinutes / 60).toFixed(1),
      approvedOTHours: (approvedOTMinutes / 60).toFixed(1),
      pendingOTRequests,
      lateArrivals,
      earlyDepartures,
      shortfallHours: (totalShortfallMinutes / 60).toFixed(1)
    };
  }, [attendance, requests, dateFilter]);

  // Filtered Requests Queue
  const filteredRequests = useMemo(() => {
    return requests.filter(r => {
      if (selectedSiteId !== 'ALL' && r.siteId !== selectedSiteId) return false;
      if (selectedStatus !== 'ALL' && r.status !== selectedStatus) return false;
      if (dateFilter && r.workDate !== dateFilter) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchName = r.employeeName?.toLowerCase().includes(q);
        const matchEmpId = r.employeeId?.toLowerCase().includes(q);
        const matchSite = r.siteName?.toLowerCase().includes(q);
        if (!matchName && !matchEmpId && !matchSite) return false;
      }
      return true;
    });
  }, [requests, selectedSiteId, selectedStatus, dateFilter, searchQuery]);

  // Filtered Exceptions & Calculation rows
  const filteredAttendance = useMemo(() => {
    return attendance.filter(a => {
      if (selectedSiteId !== 'ALL' && a.siteId !== selectedSiteId) return false;
      if (dateFilter && a.attendanceDate !== dateFilter) return false;
      if (selectedException !== 'ALL') {
        if (!a.exceptions || !a.exceptions.includes(selectedException as AttendanceExceptionType)) {
          return false;
        }
      }
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchName = a.employeeName?.toLowerCase().includes(q);
        const matchEmpId = a.employeeId?.toLowerCase().includes(q);
        const matchSite = a.siteName?.toLowerCase().includes(q);
        if (!matchName && !matchEmpId && !matchSite) return false;
      }
      return true;
    });
  }, [attendance, selectedSiteId, dateFilter, selectedException, searchQuery]);

  // Handle single approve / reject modal submit
  const handleReviewSubmit = async () => {
    if (!reviewModal.request) return;
    const req = reviewModal.request;
    const approvedMins = reviewModal.status === 'APPROVED' ? Math.round(reviewModal.approvedHours * 60) : 0;

    await FirestoreService.updateOvertimeRequestStatus(
      companyId,
      req.id,
      reviewModal.status,
      {
        uid: userSession.userId,
        name: userSession.fullName || 'Supervisor',
        reason: reviewModal.reason,
        approvedMinutes: approvedMins
      }
    );

    setReviewModal({
      isOpen: false,
      request: null,
      status: 'APPROVED',
      approvedHours: 0,
      reason: ''
    });
  };

  // Handle bulk approve
  const handleBulkApprove = async () => {
    if (selectedRequestIds.length === 0) return;
    setIsBulkProcessing(true);

    // Module 10.4: Bulk Governance Evaluation
    await BulkExportGovernanceService.evaluateAndRecordBulkOperation({
      session: userSession,
      companyId,
      module: 'WFM_OVERTIME',
      entityType: 'OvertimeRequest',
      operation: 'BULK_APPROVE',
      affectedRecordCount: selectedRequestIds.length,
      affectedRecordIds: selectedRequestIds,
      reason: 'Bulk approved via Overtime Dashboard',
      metadata: { siteId: selectedSiteId }
    });

    for (const reqId of selectedRequestIds) {
      const req = requests.find(r => r.id === reqId);
      if (req && req.status === 'PENDING_APPROVAL') {
        await FirestoreService.updateOvertimeRequestStatus(
          companyId,
          req.id,
          'APPROVED',
          {
            uid: userSession.userId,
            name: userSession.fullName || 'Supervisor',
            reason: 'Bulk approved via Overtime Dashboard',
            approvedMinutes: req.roundedOvertimeMinutes
          }
        );
      }
    }
    setSelectedRequestIds([]);
    setIsBulkProcessing(false);
  };

  // Handle Batch Recalculate
  const handleBatchRecalculate = async () => {
    setBatchRecalcModal(prev => ({ ...prev, isProcessing: true, result: null }));
    const siteParam = batchRecalcModal.siteId === 'ALL' ? undefined : batchRecalcModal.siteId;
    const res = await FirestoreService.batchRecalculateAttendance(
      companyId,
      batchRecalcModal.startDate,
      batchRecalcModal.endDate,
      siteParam,
      userSession.userId
    );
    setBatchRecalcModal(prev => ({ ...prev, isProcessing: false, result: res }));
  };

  // Handle Single Record Recalculate
  const handleSingleRecalculate = async (attendanceId: string) => {
    await FirestoreService.recalculateAttendanceRecord(companyId, attendanceId, undefined, userSession.userId);
  };

  // Handle Manual Adjustment Submit
  const handleCreateAdjustment = async () => {
    if (!adjustmentModal.employeeId || !adjustmentModal.reason) return;

    await FirestoreService.createOvertimeAdjustment(companyId, {
      attendanceId: adjustmentModal.attendanceId || '',
      employeeId: adjustmentModal.employeeId,
      employeeName: adjustmentModal.employeeName,
      workDate: adjustmentModal.workDate,
      adjustmentType: adjustmentModal.type,
      originalMinutes: adjustmentModal.originalMinutes,
      requestedMinutes: adjustmentModal.requestedMinutes,
      reason: adjustmentModal.reason,
      requestedBy: userSession.userId,
      requestedByName: userSession.fullName || 'Supervisor',
      requestedAt: new Date().toISOString()
    });

    setAdjustmentModal({
      isOpen: false,
      employeeId: '',
      employeeName: '',
      attendanceId: '',
      workDate: new Date().toISOString().split('T')[0],
      type: 'OVERTIME',
      originalMinutes: 0,
      requestedMinutes: 0,
      reason: ''
    });
  };

  // Handle Adjustment Approval/Rejection
  const handleResolveAdjustment = async (adjId: string, status: 'APPROVED' | 'REJECTED') => {
    await FirestoreService.resolveOvertimeAdjustment(companyId, adjId, status, {
      uid: userSession.userId,
      name: userSession.fullName || 'Manager'
    });
  };

  // Handle Policy Save
  const handleSavePolicy = async () => {
    if (!editingPolicy) return;
    setIsSavingPolicy(true);
    const ok = await FirestoreService.saveOvertimePolicy(companyId, editingPolicy, userSession.userId);
    setIsSavingPolicy(false);
    if (ok) {
      setPolicySaveSuccess(true);
      setTimeout(() => setPolicySaveSuccess(false), 3000);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Context */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 text-xs font-bold bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 rounded-full">
              WFM Point 3
            </span>
            <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
              Overtime & Late Calculation Engine
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Deterministic rule-based overtime, late arrival grace windows, shortfall tracking, and approval workflow.
          </p>
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setBatchRecalcModal(prev => ({ ...prev, isOpen: true }))}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl transition-all"
          >
            <RefreshCw className="w-3.5 h-3.5 text-indigo-500" />
            Batch Recalculate
          </button>

          <button
            onClick={() => setAdjustmentModal(prev => ({ ...prev, isOpen: true }))}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/60 text-indigo-600 dark:text-indigo-400 rounded-xl transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            New Adjustment
          </button>
        </div>
      </div>

      {/* KPI Metrics Strip */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: 'Total OT Hours', value: `${stats.totalOTHours}h`, icon: TrendingUp, color: 'text-indigo-600', bg: 'bg-indigo-50' },
          { label: 'Approved OT', value: `${stats.approvedOTHours}h`, icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Pending OT Approvals', value: stats.pendingOTRequests, icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: 'Late Arrivals', value: stats.lateArrivals, icon: Clock, color: 'text-orange-600', bg: 'bg-orange-50' },
          { label: 'Early Departures', value: stats.earlyDepartures, icon: XCircle, color: 'text-rose-600', bg: 'bg-rose-50' },
          { label: 'Shortfall Hours', value: `${stats.shortfallHours}h`, icon: ShieldAlert, color: 'text-slate-600', bg: 'bg-slate-50' },
        ].map((kpi, i) => (
          <div key={i} className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{kpi.label}</span>
              <div className={`w-7 h-7 rounded-xl ${kpi.bg} dark:bg-slate-800 flex items-center justify-center ${kpi.color}`}>
                <kpi.icon className="w-4 h-4" />
              </div>
            </div>
            <p className="text-xl font-black text-slate-900 dark:text-white mt-2">{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Sub-Tab Navigation Bar */}
      <div className="bg-white dark:bg-slate-900 p-2 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setSubTab('QUEUE')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition-all ${
              subTab === 'QUEUE'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            Overtime Queue
            {stats.pendingOTRequests > 0 && (
              <span className="px-1.5 py-0.2 text-[10px] bg-amber-500 text-white rounded-full font-bold">
                {stats.pendingOTRequests}
              </span>
            )}
          </button>

          <button
            onClick={() => setSubTab('EXCEPTIONS')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition-all ${
              subTab === 'EXCEPTIONS'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            Calculations & Exceptions
          </button>

          <button
            onClick={() => setSubTab('POLICIES')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition-all ${
              subTab === 'POLICIES'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            Policy Rules
          </button>

          <button
            onClick={() => setSubTab('ADJUSTMENTS')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition-all ${
              subTab === 'ADJUSTMENTS'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Edit3 className="w-3.5 h-3.5" />
            Adjustments ({adjustments.length})
          </button>
        </div>

        {/* Filters strip for Queue & Exceptions */}
        {(subTab === 'QUEUE' || subTab === 'EXCEPTIONS') && (
          <div className="flex items-center gap-2 flex-wrap">
            {/* Date filter */}
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="bg-transparent border-none outline-none text-slate-800 dark:text-slate-200 text-xs font-medium cursor-pointer"
              />
              {dateFilter && (
                <button onClick={() => setDateFilter('')} className="text-slate-400 hover:text-slate-600 text-[10px]">
                  Clear
                </button>
              )}
            </div>

            {/* Site selector */}
            <select
              value={selectedSiteId}
              onChange={(e) => setSelectedSiteId(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-800 dark:text-slate-200 outline-none"
            >
              <option value="ALL">All Sites</option>
              {sites.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>

            {/* Search Box */}
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
              <Search className="w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search employee..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-transparent border-none outline-none text-slate-800 dark:text-slate-200 text-xs w-28 md:w-36"
              />
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: OVERTIME QUEUE & APPROVALS                                          */}
      {/* ========================================================================= */}
      {subTab === 'QUEUE' && (
        <div className="space-y-4">
          {/* Status Filter & Bulk Action */}
          <div className="flex items-center justify-between flex-wrap gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-slate-500 mr-1">Status:</span>
              {['ALL', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED'].map((st) => (
                <button
                  key={st}
                  onClick={() => setSelectedStatus(st)}
                  className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                    selectedStatus === st
                      ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                  }`}
                >
                  {st === 'ALL' ? 'All' : st.replace('_', ' ')}
                </button>
              ))}
            </div>

            {selectedRequestIds.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                  {selectedRequestIds.length} selected
                </span>
                <button
                  disabled={isBulkProcessing}
                  onClick={handleBulkApprove}
                  className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm"
                >
                  <Check className="w-3.5 h-3.5" />
                  Bulk Approve
                </button>
                <button
                  onClick={() => setSelectedRequestIds([])}
                  className="px-2.5 py-1.5 text-xs text-slate-500 hover:text-slate-800"
                >
                  Deselect
                </button>
              </div>
            )}
          </div>

          {/* Overtime Queue Table */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 font-bold text-slate-500">
                    <th className="py-3 px-4 w-10">
                      <input
                        type="checkbox"
                        checked={
                          filteredRequests.length > 0 &&
                          filteredRequests.every(r => selectedRequestIds.includes(r.id))
                        }
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedRequestIds(filteredRequests.map(r => r.id));
                          } else {
                            setSelectedRequestIds([]);
                          }
                        }}
                        className="rounded border-slate-300"
                      />
                    </th>
                    <th className="py-3 px-4">Employee</th>
                    <th className="py-3 px-4">Date & Site</th>
                    <th className="py-3 px-4">Shift & Timings</th>
                    <th className="py-3 px-4">Actual Punches</th>
                    <th className="py-3 px-4 text-center">Net Worked</th>
                    <th className="py-3 px-4 text-center">OT (Raw / Rounded)</th>
                    <th className="py-3 px-4 text-center">Approved OT</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium text-slate-700 dark:text-slate-300">
                  {filteredRequests.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-12 text-center text-slate-400">
                        <TrendingUp className="w-8 h-8 mx-auto mb-2 opacity-30 text-indigo-500" />
                        No overtime requests match current filter.
                      </td>
                    </tr>
                  ) : (
                    filteredRequests.map((req) => {
                      const isSelected = selectedRequestIds.includes(req.id);
                      return (
                        <tr key={req.id} className={`hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors ${isSelected ? 'bg-indigo-50/40 dark:bg-indigo-950/20' : ''}`}>
                          <td className="py-3 px-4">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedRequestIds(prev => [...prev, req.id]);
                                } else {
                                  setSelectedRequestIds(prev => prev.filter(id => id !== req.id));
                                }
                              }}
                              className="rounded border-slate-300"
                            />
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-bold text-slate-900 dark:text-white">{req.employeeName}</div>
                            <div className="text-[10px] text-slate-400">ID: {req.employeeId}</div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-semibold text-slate-800 dark:text-slate-200">{req.workDate}</div>
                            <div className="text-[10px] text-slate-500 flex items-center gap-1">
                              <MapPin className="w-2.5 h-2.5" />
                              {req.siteName || 'Default Site'}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-semibold text-slate-800 dark:text-slate-200">{req.shiftName || 'Standard'}</div>
                            <div className="text-[10px] text-slate-400">{req.shiftStart} - {req.shiftEnd}</div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="text-[11px] text-slate-700 dark:text-slate-300">
                              In: {req.actualCheckIn ? new Date(req.actualCheckIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--'}
                            </div>
                            <div className="text-[11px] text-slate-700 dark:text-slate-300">
                              Out: {req.actualCheckOut ? new Date(req.actualCheckOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--'}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className="font-bold text-slate-800 dark:text-slate-200">
                              {AttendanceCalculationEngine.formatDuration(req.netWorkedMinutes)}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <div className="font-black text-indigo-600 dark:text-indigo-400">
                              {AttendanceCalculationEngine.formatDuration(req.roundedOvertimeMinutes)}
                            </div>
                            <div className="text-[10px] text-slate-400">
                              Raw: {AttendanceCalculationEngine.formatDuration(req.rawOvertimeMinutes)}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className="font-bold text-emerald-600 dark:text-emerald-400">
                              {AttendanceCalculationEngine.formatDuration(req.approvedOvertimeMinutes || 0)}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              req.status === 'APPROVED'
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                                : req.status === 'REJECTED'
                                ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                                : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                            }`}>
                              {req.status}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Step-by-step calculation breakdown modal trigger */}
                              <button
                                onClick={() => setSelectedExplanation({
                                  title: `Overtime Breakdown: ${req.employeeName} (${req.workDate})`,
                                  breakdown: req.calculationBreakdown,
                                  record: req
                                })}
                                title="View Step-by-step Math"
                                className="p-1.5 text-slate-500 hover:text-indigo-600 bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 rounded-lg transition-colors"
                              >
                                <Info className="w-3.5 h-3.5" />
                              </button>

                              {req.status === 'PENDING_APPROVAL' && (
                                <>
                                  <button
                                    onClick={() => setReviewModal({
                                      isOpen: true,
                                      request: req,
                                      status: 'APPROVED',
                                      approvedHours: +(req.roundedOvertimeMinutes / 60).toFixed(2),
                                      reason: ''
                                    })}
                                    title="Approve"
                                    className="p-1.5 text-emerald-600 hover:text-white hover:bg-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 rounded-lg transition-colors"
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => setReviewModal({
                                      isOpen: true,
                                      request: req,
                                      status: 'REJECTED',
                                      approvedHours: 0,
                                      reason: ''
                                    })}
                                    title="Reject"
                                    className="p-1.5 text-rose-600 hover:text-white hover:bg-rose-600 bg-rose-50 dark:bg-rose-950/40 rounded-lg transition-colors"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </>
                              )}
                            </div>
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

      {/* ========================================================================= */}
      {/* TAB 2: ATTENDANCE CALCULATIONS & EXCEPTIONS EXPLORER                       */}
      {/* ========================================================================= */}
      {subTab === 'EXCEPTIONS' && (
        <div className="space-y-4">
          {/* Exception Filter Strip */}
          <div className="flex items-center gap-1.5 flex-wrap bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
            <span className="text-xs font-bold text-slate-500 mr-1">Filter Exception:</span>
            {[
              { id: 'ALL', label: 'All Records' },
              { id: 'LATE', label: 'Late Arrival' },
              { id: 'EARLY_DEPARTURE', label: 'Early Departure' },
              { id: 'SHORTFALL', label: 'Shortfall' },
              { id: 'MAX_DAILY_OT_EXCEEDED', label: 'Max OT Exceeded' },
              { id: 'HALF_DAY', label: 'Half Day' },
              { id: 'GRACE_WINDOW_USED', label: 'Grace Used' }
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setSelectedException(f.id)}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                  selectedException === f.id
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Muster Calculation Table */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 font-bold text-slate-500">
                    <th className="py-3 px-4">Employee & Site</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-center">Scheduled</th>
                    <th className="py-3 px-4 text-center">Net Worked</th>
                    <th className="py-3 px-4 text-center">Late</th>
                    <th className="py-3 px-4 text-center">Early Out</th>
                    <th className="py-3 px-4 text-center">Shortfall</th>
                    <th className="py-3 px-4 text-center">Overtime</th>
                    <th className="py-3 px-4">Exceptions & Flags</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium text-slate-700 dark:text-slate-300">
                  {filteredAttendance.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="py-12 text-center text-slate-400">
                        <AlertTriangle className="w-8 h-8 mx-auto mb-2 opacity-30 text-amber-500" />
                        No attendance calculations match current filter.
                      </td>
                    </tr>
                  ) : (
                    filteredAttendance.map((att) => (
                      <tr key={att.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900 dark:text-white">{att.employeeName}</div>
                          <div className="text-[10px] text-slate-400">{att.siteName || 'Site'}</div>
                        </td>
                        <td className="py-3 px-4 font-semibold">{att.attendanceDate}</td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            att.status === 'PRESENT'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                              : att.status === 'LATE'
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                              : att.status === 'HALF_DAY'
                              ? 'bg-orange-100 text-orange-800 dark:bg-orange-950/60 dark:text-orange-300'
                              : 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300'
                          }`}>
                            {att.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          {AttendanceCalculationEngine.formatDuration(att.scheduledMinutes || 480)}
                        </td>
                        <td className="py-3 px-4 text-center font-bold text-slate-900 dark:text-white">
                          {AttendanceCalculationEngine.formatDuration(att.workedMinutes || 0)}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {(att.lateMinutes || 0) > 0 ? (
                            <span className="font-bold text-amber-600">
                              {AttendanceCalculationEngine.formatDuration(att.lateMinutes || 0)}
                            </span>
                          ) : (
                            <span className="text-slate-400">0m</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {(att.earlyDepartureMinutes || 0) > 0 ? (
                            <span className="font-bold text-rose-600">
                              {AttendanceCalculationEngine.formatDuration(att.earlyDepartureMinutes || 0)}
                            </span>
                          ) : (
                            <span className="text-slate-400">0m</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {(att.shortfallMinutes || 0) > 0 ? (
                            <span className="font-bold text-rose-600">
                              {AttendanceCalculationEngine.formatDuration(att.shortfallMinutes || 0)}
                            </span>
                          ) : (
                            <span className="text-slate-400">0m</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {(att.overtimeMinutes || 0) > 0 ? (
                            <span className="font-black text-indigo-600 dark:text-indigo-400">
                              {AttendanceCalculationEngine.formatDuration(att.overtimeMinutes || 0)}
                            </span>
                          ) : (
                            <span className="text-slate-400">0m</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1 flex-wrap">
                            {att.exceptions && att.exceptions.length > 0 ? (
                              att.exceptions.map((ex, idx) => (
                                <span key={idx} className="px-1.5 py-0.5 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 text-[9px] font-bold rounded">
                                  {ex}
                                </span>
                              ))
                            ) : (
                              <span className="text-[10px] text-emerald-600 font-medium flex items-center gap-1">
                                <Check className="w-3 h-3" /> Clean
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            {/* Inspect Math button */}
                            <button
                              onClick={() => setSelectedExplanation({
                                title: `Attendance Audit: ${att.employeeName} (${att.attendanceDate})`,
                                explanation: att.calculationExplanation,
                                record: att
                              })}
                              title="Audit Explanation"
                              className="p-1.5 text-slate-500 hover:text-indigo-600 bg-slate-100 dark:bg-slate-800 rounded-lg transition-colors"
                            >
                              <FileText className="w-3.5 h-3.5" />
                            </button>

                            {/* Recalculate Button */}
                            <button
                              onClick={() => handleSingleRecalculate(att.id)}
                              title="Recalculate Deterministic Metrics"
                              className="p-1.5 text-indigo-600 hover:text-white hover:bg-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 rounded-lg transition-colors"
                            >
                              <RefreshCw className="w-3.5 h-3.5" />
                            </button>
                          </div>
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

      {/* ========================================================================= */}
      {/* TAB 3: OVERTIME & LATE POLICY CONFIGURATION                               */}
      {/* ========================================================================= */}
      {subTab === 'POLICIES' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Policy Selector Column */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Sliders className="w-4 h-4 text-indigo-500" />
                Active Policies
              </h3>
              <button
                onClick={() => {
                  const newPol = AttendanceCalculationEngine.getDefaultPolicy(companyId);
                  newPol.id = `OTPOL_${Date.now()}`;
                  newPol.policyName = `Site Policy ${policies.length + 1}`;
                  newPol.isDefault = false;
                  setEditingPolicy(newPol);
                }}
                className="p-1.5 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 rounded-lg text-xs font-bold flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> New
              </button>
            </div>

            <div className="space-y-2">
              {policies.map(pol => (
                <div
                  key={pol.id}
                  onClick={() => setEditingPolicy(pol)}
                  className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                    editingPolicy?.id === pol.id
                      ? 'border-indigo-600 bg-indigo-50/40 dark:bg-indigo-950/30'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 dark:text-white text-xs">{pol.policyName}</span>
                    {pol.isDefault && (
                      <span className="px-2 py-0.5 text-[9px] font-black bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300 rounded-full">
                        DEFAULT
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1">
                    Grace: {pol.gracePeriodMinutes}m | Rounding: {pol.overtimeRoundingRule} | OT Threshold: {pol.overtimeThresholdMinutes}m
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Policy Settings Form */}
          {editingPolicy && (
            <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-base">
                    Policy Configuration: {editingPolicy.policyName}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Defines deterministic rules for grace periods, OT rounding, caps, and approval boundaries.
                  </p>
                </div>
                {policySaveSuccess && (
                  <span className="px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-xl flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" /> Saved
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Policy Name</label>
                  <input
                    type="text"
                    value={editingPolicy.policyName}
                    onChange={(e) => setEditingPolicy({ ...editingPolicy, policyName: e.target.value })}
                    className="w-full mt-1 p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Default Break Deduction (Minutes)</label>
                  <input
                    type="number"
                    value={editingPolicy.defaultBreakMinutes}
                    onChange={(e) => setEditingPolicy({ ...editingPolicy, defaultBreakMinutes: +e.target.value })}
                    className="w-full mt-1 p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Late Arrival Grace Window (Minutes)</label>
                  <input
                    type="number"
                    value={editingPolicy.gracePeriodMinutes}
                    onChange={(e) => setEditingPolicy({ ...editingPolicy, gracePeriodMinutes: +e.target.value })}
                    className="w-full mt-1 p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Late Calculation Mode</label>
                  <select
                    value={editingPolicy.lateCalculationMode}
                    onChange={(e) => setEditingPolicy({ ...editingPolicy, lateCalculationMode: e.target.value as any })}
                    className="w-full mt-1 p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium outline-none focus:border-indigo-500"
                  >
                    <option value="FROM_SHIFT_START">From Shift Start Time (Full Late)</option>
                    <option value="FROM_GRACE_END">From Grace Window End (Penalty Only)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Early Departure Grace Window (Minutes)</label>
                  <input
                    type="number"
                    value={editingPolicy.earlyDepartureGraceMinutes}
                    onChange={(e) => setEditingPolicy({ ...editingPolicy, earlyDepartureGraceMinutes: +e.target.value })}
                    className="w-full mt-1 p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Minimum OT Threshold (Minutes)</label>
                  <input
                    type="number"
                    value={editingPolicy.overtimeThresholdMinutes}
                    onChange={(e) => setEditingPolicy({ ...editingPolicy, overtimeThresholdMinutes: +e.target.value })}
                    className="w-full mt-1 p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">OT Rounding Mode</label>
                  <select
                    value={editingPolicy.overtimeRoundingRule}
                    onChange={(e) => setEditingPolicy({ ...editingPolicy, overtimeRoundingRule: e.target.value as any })}
                    className="w-full mt-1 p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium outline-none focus:border-indigo-500"
                  >
                    <option value="NEAREST_15">Nearest 15 Minutes</option>
                    <option value="NEAREST_30">Nearest 30 Minutes</option>
                    <option value="FLOOR_15">Floor 15 Minutes (Strict)</option>
                    <option value="FLOOR_30">Floor 30 Minutes</option>
                    <option value="CEILING_15">Ceiling 15 Minutes</option>
                    <option value="CEILING_30">Ceiling 30 Minutes</option>
                    <option value="EXACT">Exact (No Rounding)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Daily Max Overtime Cap (Minutes)</label>
                  <input
                    type="number"
                    value={editingPolicy.maxDailyOvertimeMinutes}
                    onChange={(e) => setEditingPolicy({ ...editingPolicy, maxDailyOvertimeMinutes: +e.target.value })}
                    className="w-full mt-1 p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Weekly Max Overtime Cap (Minutes)</label>
                  <input
                    type="number"
                    value={editingPolicy.maxWeeklyOvertimeMinutes}
                    onChange={(e) => setEditingPolicy({ ...editingPolicy, maxWeeklyOvertimeMinutes: +e.target.value })}
                    className="w-full mt-1 p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Auto-Approve Under (Minutes)</label>
                  <input
                    type="number"
                    value={editingPolicy.autoApproveUnderMinutes || 0}
                    onChange={(e) => setEditingPolicy({ ...editingPolicy, autoApproveUnderMinutes: +e.target.value })}
                    className="w-full mt-1 p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Toggles */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-100 dark:border-slate-800">
                <label className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingPolicy.requireApprovalForOvertime}
                    onChange={(e) => setEditingPolicy({ ...editingPolicy, requireApprovalForOvertime: e.target.checked })}
                    className="rounded text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                  />
                  <div>
                    <div className="text-xs font-bold text-slate-900 dark:text-white">Require Supervisor Approval</div>
                    <div className="text-[10px] text-slate-500">Overtime requires explicit authorization</div>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingPolicy.eligibleForOvertime}
                    onChange={(e) => setEditingPolicy({ ...editingPolicy, eligibleForOvertime: e.target.checked })}
                    className="rounded text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                  />
                  <div>
                    <div className="text-xs font-bold text-slate-900 dark:text-white">Overtime Calculation Active</div>
                    <div className="text-[10px] text-slate-500">Enable automatic overtime computation</div>
                  </div>
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  disabled={isSavingPolicy}
                  onClick={handleSavePolicy}
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm flex items-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  {isSavingPolicy ? 'Saving...' : 'Save Policy'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: MANUAL ADJUSTMENTS & AUDIT TRAIL                                    */}
      {/* ========================================================================= */}
      {subTab === 'ADJUSTMENTS' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                  Attendance & Overtime Adjustments
                </h3>
                <p className="text-xs text-slate-500">
                  Audit-tracked supervisor adjustments with justification.
                </p>
              </div>
              <button
                onClick={() => setAdjustmentModal(prev => ({ ...prev, isOpen: true }))}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white text-xs font-bold rounded-xl shadow-sm hover:bg-indigo-700"
              >
                <Plus className="w-3.5 h-3.5" /> Request Adjustment
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 font-bold text-slate-500">
                    <th className="py-3 px-4">Employee</th>
                    <th className="py-3 px-4">Work Date</th>
                    <th className="py-3 px-4">Adjustment Type</th>
                    <th className="py-3 px-4 text-center">Original</th>
                    <th className="py-3 px-4 text-center">Requested</th>
                    <th className="py-3 px-4">Reason & Requester</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium text-slate-700 dark:text-slate-300">
                  {adjustments.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400">
                        <Edit3 className="w-8 h-8 mx-auto mb-2 opacity-30 text-indigo-500" />
                        No adjustment records found.
                      </td>
                    </tr>
                  ) : (
                    adjustments.map((adj) => (
                      <tr key={adj.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                        <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                          {adj.employeeName}
                        </td>
                        <td className="py-3 px-4 font-semibold">{adj.workDate}</td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded">
                            {adj.adjustmentType}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center text-slate-400">
                          {AttendanceCalculationEngine.formatDuration(adj.originalMinutes)}
                        </td>
                        <td className="py-3 px-4 text-center font-bold text-indigo-600 dark:text-indigo-400">
                          {AttendanceCalculationEngine.formatDuration(adj.requestedMinutes)}
                        </td>
                        <td className="py-3 px-4">
                          <div className="text-slate-800 dark:text-slate-200">{adj.reason}</div>
                          <div className="text-[10px] text-slate-400">By: {adj.requestedByName}</div>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            adj.status === 'APPROVED'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                              : adj.status === 'REJECTED'
                              ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                              : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                          }`}>
                            {adj.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          {(adj.status === 'PENDING' || (adj.status as any) === 'PENDING_APPROVAL') && (
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => handleResolveAdjustment(adj.id, 'APPROVED')}
                                className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg"
                                title="Approve Adjustment"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleResolveAdjustment(adj.id, 'REJECTED')}
                                className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg"
                                title="Reject Adjustment"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
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

      {/* ========================================================================= */}
      {/* MODAL: STEP-BY-STEP CALCULATION AUDIT & MATH                               */}
      {/* ========================================================================= */}
      {selectedExplanation && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
                <Info className="w-4 h-4 text-indigo-500" />
                {selectedExplanation.title}
              </h3>
              <button
                onClick={() => setSelectedExplanation(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl font-mono text-xs text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed max-h-96 overflow-y-auto">
              {selectedExplanation.breakdown || selectedExplanation.explanation || 'No detailed steps recorded.'}
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setSelectedExplanation(null)}
                className="px-4 py-2 bg-slate-900 text-white dark:bg-white dark:text-slate-900 text-xs font-bold rounded-xl"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: OVERTIME APPROVAL / REJECTION DIALOG                                */}
      {/* ========================================================================= */}
      {reviewModal.isOpen && reviewModal.request && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                {reviewModal.status === 'APPROVED' ? 'Approve Overtime' : 'Reject Overtime'}
              </h3>
              <button
                onClick={() => setReviewModal(prev => ({ ...prev, isOpen: false }))}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-2xl text-xs space-y-1">
              <div><strong className="text-slate-600 dark:text-slate-400">Employee:</strong> {reviewModal.request.employeeName}</div>
              <div><strong className="text-slate-600 dark:text-slate-400">Date:</strong> {reviewModal.request.workDate}</div>
              <div><strong className="text-slate-600 dark:text-slate-400">Calculated OT:</strong> {AttendanceCalculationEngine.formatDuration(reviewModal.request.roundedOvertimeMinutes)}</div>
            </div>

            {reviewModal.status === 'APPROVED' && (
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Approved OT Hours</label>
                <input
                  type="number"
                  step="0.25"
                  value={reviewModal.approvedHours}
                  onChange={(e) => setReviewModal({ ...reviewModal, approvedHours: +e.target.value })}
                  className="w-full mt-1 p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium outline-none focus:border-indigo-500"
                />
              </div>
            )}

            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                {reviewModal.status === 'APPROVED' ? 'Supervisor Remarks (Optional)' : 'Rejection Reason (Mandatory)'}
              </label>
              <textarea
                rows={3}
                value={reviewModal.reason}
                onChange={(e) => setReviewModal({ ...reviewModal, reason: e.target.value })}
                placeholder="Enter remarks..."
                className="w-full mt-1 p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setReviewModal(prev => ({ ...prev, isOpen: false }))}
                className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={handleReviewSubmit}
                className={`px-5 py-2 text-xs font-bold text-white rounded-xl transition-all ${
                  reviewModal.status === 'APPROVED' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'
                }`}
              >
                Confirm {reviewModal.status}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: BATCH RECALCULATE ATTENDANCE                                       */}
      {/* ========================================================================= */}
      {batchRecalcModal.isOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
                <RefreshCw className="w-4 h-4 text-indigo-500" />
                Batch Recalculate Attendance
              </h3>
              <button
                onClick={() => setBatchRecalcModal(prev => ({ ...prev, isOpen: false }))}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Re-evaluates attendance punches against configured site policies, updating late, overtime, grace window, and shortfall metrics.
            </p>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Start Date</label>
                <input
                  type="date"
                  value={batchRecalcModal.startDate}
                  onChange={(e) => setBatchRecalcModal({ ...batchRecalcModal, startDate: e.target.value })}
                  className="w-full mt-1 p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">End Date</label>
                <input
                  type="date"
                  value={batchRecalcModal.endDate}
                  onChange={(e) => setBatchRecalcModal({ ...batchRecalcModal, endDate: e.target.value })}
                  className="w-full mt-1 p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Site Scope</label>
              <select
                value={batchRecalcModal.siteId}
                onChange={(e) => setBatchRecalcModal({ ...batchRecalcModal, siteId: e.target.value })}
                className="w-full mt-1 p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none"
              >
                <option value="ALL">All Sites</option>
                {sites.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            {batchRecalcModal.result && (
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 rounded-xl text-xs font-medium">
                Successfully processed {batchRecalcModal.result.processed} records ({batchRecalcModal.result.successCount} updated).
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setBatchRecalcModal(prev => ({ ...prev, isOpen: false }))}
                className="px-4 py-2 text-xs font-bold text-slate-500"
              >
                Cancel
              </button>
              <button
                disabled={batchRecalcModal.isProcessing}
                onClick={handleBatchRecalculate}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm flex items-center gap-2"
              >
                {batchRecalcModal.isProcessing ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-3.5 h-3.5" />
                    Run Recalculation
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: MANUAL ADJUSTMENT REQUEST                                          */}
      {/* ========================================================================= */}
      {adjustmentModal.isOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                Request Attendance / Overtime Adjustment
              </h3>
              <button
                onClick={() => setAdjustmentModal(prev => ({ ...prev, isOpen: false }))}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Employee</label>
              <select
                value={adjustmentModal.employeeId}
                onChange={(e) => {
                  const empId = e.target.value;
                  const matchingAtt = attendance.find(a => a.employeeId === empId);
                  setAdjustmentModal({
                    ...adjustmentModal,
                    employeeId: empId,
                    employeeName: matchingAtt?.employeeName || empId,
                    attendanceId: matchingAtt?.id || ''
                  });
                }}
                className="w-full mt-1 p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none"
              >
                <option value="">Select Employee</option>
                {Array.from(new Set(attendance.map(a => a.employeeId))).map(empId => {
                  const att = attendance.find(a => a.employeeId === empId);
                  return (
                    <option key={empId} value={empId}>
                      {att?.employeeName} ({empId})
                    </option>
                  );
                })}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Adjustment Type</label>
                <select
                  value={adjustmentModal.type}
                  onChange={(e) => setAdjustmentModal({ ...adjustmentModal, type: e.target.value as any })}
                  className="w-full mt-1 p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none"
                >
                  <option value="OVERTIME">Overtime</option>
                  <option value="LATE">Late Arrival</option>
                  <option value="EARLY_DEPARTURE">Early Departure</option>
                  <option value="WORKED_MINUTES">Worked Minutes</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">New Minutes</label>
                <input
                  type="number"
                  value={adjustmentModal.requestedMinutes}
                  onChange={(e) => setAdjustmentModal({ ...adjustmentModal, requestedMinutes: +e.target.value })}
                  className="w-full mt-1 p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Reason / Justification (Required)</label>
              <textarea
                rows={3}
                value={adjustmentModal.reason}
                onChange={(e) => setAdjustmentModal({ ...adjustmentModal, reason: e.target.value })}
                placeholder="E.g. Client emergency handover overtime verified by site in-charge."
                className="w-full mt-1 p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setAdjustmentModal(prev => ({ ...prev, isOpen: false }))}
                className="px-4 py-2 text-xs font-bold text-slate-500"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateAdjustment}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm"
              >
                Submit Adjustment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
