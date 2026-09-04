// @ts-nocheck

import React, { useState, useEffect, useMemo } from 'react';
import { useBackNavigation } from '../../hooks/useBackNavigation';
import { 
  CalendarDays, 
  RefreshCw, 
  Settings2, 
  Plus,
  LayoutDashboard,
  ClipboardList,
  ShieldCheck,
  AlertCircle,
  Clock,
  CheckCircle2,
  X,
  Check,
  FileSpreadsheet,
  Calculator,
  ArrowDownRight,
  ArrowUpRight
} from 'lucide-react';
import { 
  UserSession, 
  CompanyTenant, 
  PhaseAScreen, 
  LeaveRequestRecord, 
  LeaveBalanceRecord, 
  LeavePolicyRecord,
  HolidayRecord,
  RosterRecord,
  AttendanceRecord,
  AbsenceRegularizationRecord
} from '../../types';
import { FirestoreService } from '../../services/firestoreService';
import { LeaveDashboard } from '../hrms/LeaveDashboard';
import { LeaveApplyForm } from '../hrms/LeaveApplyForm';
import { LeavePolicyMaster } from '../hrms/LeavePolicyMaster';
import { HolidayCalendarMaster } from '../hrms/HolidayCalendarMaster';
import { AbsenceRegularization } from '../hrms/AbsenceRegularization';
import { RbacService } from '../../services/rbacService';
import { WorkflowEngine } from '../../services/workflowEngine';
import { useFeedback } from '../../context/ActionFeedbackContext';

interface LeaveManagementScreenProps {
  userSession: UserSession;
  activeCompany: CompanyTenant | null;
  isOnline: boolean;
  onNavigate: (screen: PhaseAScreen) => void;
}

export const LeaveManagementScreen: React.FC<LeaveManagementScreenProps> = ({
  userSession,
  activeCompany,
  isOnline,
  onNavigate
}) => {
  const { showSuccess, showError, showLoading, showCancelled, showValidationFailed, handleError, confirm } = useFeedback();
  const [activeTab, setActiveTab] = useState<'DASHBOARD' | 'ABSENCE' | 'APPROVALS' | 'LEDGER' | 'POLICIES' | 'HOLIDAYS'|'DASHBOARD' | 'ABSENCE' | 'APPROVALS' | 'LEDGER' | 'POLICIES' | 'HOLIDAYS'|'DASHBOARD' | 'ABSENCE' | 'APPROVALS' | 'LEDGER' | 'POLICIES' | 'HOLIDAYS'|'DASHBOARD' | 'ABSENCE' | 'APPROVALS' | 'LEDGER' | 'POLICIES' | 'HOLIDAYS'|'DASHBOARD' | 'ABSENCE' | 'APPROVALS' | 'LEDGER' | 'POLICIES' | 'HOLIDAYS'>('DASHBOARD');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [showApplyModal, setShowApplyModal] = useState<boolean>(false);
  useBackNavigation(!!showApplyModal, () => setShowApplyModal(null as any), 'showApplyModal');

  // Data State
  const [policies, setPolicies] = useState<LeavePolicyRecord[]>([]);
  const [myBalance, setMyBalance] = useState<LeaveBalanceRecord | null>(null);
  const [myRequests, setMyRequests] = useState<LeaveRequestRecord[]>([]);
  const [allRequests, setAllRequests] = useState<LeaveRequestRecord[]>([]);
  const [holidays, setHolidays] = useState<HolidayRecord[]>([]);
  const [rosters, setRosters] = useState<RosterRecord[]>([]);
  const [attendances, setAttendances] = useState<AttendanceRecord[]>([]);

  const companyId = activeCompany?.companyId || userSession.companyId;
  const isAdmin = RbacService.hasPermission(userSession, 'READ', { module: 'LEAVE', targetCompanyId: companyId });
  const canApprove = RbacService.hasPermission(userSession, 'APPROVE', { module: 'LEAVE', targetCompanyId: companyId });

  // Load Data
  useEffect(() => {
    if (!companyId) return;

    setIsLoading(true);

    const unsubPolicies = FirestoreService.subscribeToLeavePolicies(companyId, (data) => {
      setPolicies(data);
    });

    const unsubRequests = FirestoreService.subscribeToLeaveRequests(companyId, {}, (data) => {
      setAllRequests(data);
      const myId = userSession.employeeId || userSession.userId;
      setMyRequests(data.filter(r => r.employeeId === myId));
    });

    const loadStaticData = async () => {
      try {
        const [hols, bal] = await Promise.all([
          FirestoreService.getHolidays(companyId, new Date().getFullYear()),
          FirestoreService.getLeaveBalance(companyId, userSession.employeeId || userSession.userId)
        ]);
        setHolidays(hols);
        setMyBalance(bal);

        // Load rosters and attendance for absence detection (last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const [rost, att] = await Promise.all([
          FirestoreService.getRosters(companyId, thirtyDaysAgo.toISOString().split('T')[0]),
          FirestoreService.getAttendanceRecords(companyId, thirtyDaysAgo.toISOString().split('T')[0])
        ]);
        setRosters(rost);
        setAttendances(att);
      } catch (err) {
        console.error("Failed to load leave data", err);
      } finally {
        setIsLoading(false);
      }
    };

    loadStaticData();

    return () => {
      unsubPolicies();
      unsubRequests();
    };
  }, [companyId, userSession]);

  const handleApplyLeave = async (data: any) => {
    setIsRefreshing(true);
    const dismiss = showLoading('Submitting leave application...');
    try {
      await FirestoreService.createLeaveRequest(companyId, data);
      dismiss();
      setShowApplyModal(false);
      showSuccess('✓ Leave application submitted successfully!');
      // Refresh balance
      const bal = await FirestoreService.getLeaveBalance(companyId, userSession.employeeId || userSession.userId);
      setMyBalance(bal);
    } catch (err: any) {
      dismiss();
      handleError(err, '✕ Failed to submit leave request');
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleCancelRequest = async (req: LeaveRequestRecord) => {
    const ok = await confirm({
      title: 'Withdraw Leave Request',
      message: 'Are you sure you want to withdraw this application?',
      confirmLabel: 'Withdraw Application',
      cancelLabel: 'Cancel',
      isDestructive: true
    });
    if (!ok) {
      showCancelled('🚫 Leave withdrawal cancelled');
      return;
    }

    setIsRefreshing(true);
    const dismiss = showLoading('Withdrawing leave application...');
    try {
      await FirestoreService.updateLeaveRequestStatus(companyId, req.id, 'WITHDRAWN', {
        id: userSession.userId,
        name: userSession.fullName,
        reason: "Withdrawn by employee"
      });
      dismiss();
      showSuccess('✓ Leave application withdrawn successfully');
    } catch (err: any) {
      dismiss();
      handleError(err, '✕ Failed to withdraw request');
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleApprove = async (req: LeaveRequestRecord) => {
    const resolution = WorkflowEngine.resolveApprovalAuthority(userSession, 'LEAVE_REQUEST', {
      companyId,
      daysCount: req.daysCount,
      targetDepartmentId: req.departmentId,
      targetSiteId: req.siteId
    });

    if (!resolution.canApprove) {
      showValidationFailed(`Approval Denied: ${resolution.reason}`);
      return;
    }

    setIsRefreshing(true);
    const dismiss = showLoading('Approving leave request...');
    try {
      await FirestoreService.updateLeaveRequestStatus(companyId, req.id, 'APPROVED', {
        id: userSession.userId,
        name: userSession.fullName,
        reason: "Approved by manager"
      });
      if (req.employeeId === (userSession.employeeId || userSession.userId)) {
        const bal = await FirestoreService.getLeaveBalance(companyId, userSession.employeeId || userSession.userId);
        setMyBalance(bal);
      }
      dismiss();
      showSuccess(`✓ Leave request for ${req.employeeName || 'employee'} approved successfully!`);
    } catch (err: any) {
      dismiss();
      handleError(err, '✕ Approval failed');
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleReject = async (req: LeaveRequestRecord, reason: string) => {
    const resolution = WorkflowEngine.resolveApprovalAuthority(userSession, 'LEAVE_REQUEST', {
      companyId,
      daysCount: req.daysCount,
      targetDepartmentId: req.departmentId,
      targetSiteId: req.siteId
    });

    if (!resolution.canApprove) {
      showValidationFailed(`Rejection Denied: ${resolution.reason}`);
      return;
    }

    setIsRefreshing(true);
    const dismiss = showLoading('Rejecting leave request...');
    try {
      await FirestoreService.updateLeaveRequestStatus(companyId, req.id, 'REJECTED', {
        id: userSession.userId,
        name: userSession.fullName,
        reason
      });
      dismiss();
      showSuccess(`✓ Leave request for ${req.employeeName || 'employee'} rejected.`);
    } catch (err: any) {
      dismiss();
      handleError(err, '✕ Rejection failed');
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleSavePolicy = async (policy: any) => {
    setIsRefreshing(true);
    const dismiss = showLoading('Saving leave policy...');
    try {
      await FirestoreService.saveLeavePolicy(companyId, {
        ...policy,
        companyId,
      });
      dismiss();
      showSuccess(`✓ Leave policy "${policy.policyName || policy.code}" saved successfully!`);
    } catch (err: any) {
      dismiss();
      handleError(err, '✕ Failed to save policy');
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleRegularize = async (data: any) => {
    setIsRefreshing(true);
    const dismiss = showLoading('Submitting regularization request...');
    try {
      await FirestoreService.createAbsenceRegularization(companyId, data);
      dismiss();
      showSuccess('✓ Absence regularization request submitted successfully!');
    } catch (err: any) {
      dismiss();
      handleError(err, '✕ Failed to submit regularization request');
    } finally {
      setIsRefreshing(false);
    }
  };

  const pendingApprovals = useMemo(() => 
    allRequests.filter(r => r.status === 'SUBMITTED' || r.status === 'PENDING_APPROVAL' || r.status === 'PENDING'),
  [allRequests]);

  return (
    <div className="flex-1 flex flex-col w-full h-full overflow-hidden bg-white dark:bg-slate-950">
      
      {/* Dynamic Header */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 py-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-600/20">
              <CalendarDays className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-black text-black dark:text-white leading-tight">Leave & Absence</h1>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                {activeCompany?.brandName || 'Log Sheet Muster'} • Workforce Management
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              <div className={`w-2 h-2 rounded-full mr-2 ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-400">
                {isOnline ? 'Cloud Sync Active' : 'Offline Mode'}
              </span>
            </div>
            <button
              onClick={() => window.location.reload()}
              className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-indigo-600' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Primary Navigation Tabs */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto flex items-center gap-8 overflow-x-auto scrollbar-none">
          <button
            onClick={() => setActiveTab('DASHBOARD')}
            className={`flex items-center gap-2 py-4 text-xs font-black uppercase tracking-widest border-b-4 transition-all whitespace-nowrap ${
              activeTab === 'DASHBOARD'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-black'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            My Dashboard
          </button>
          
          <button
            onClick={() => setActiveTab('ABSENCE')}
            className={`flex items-center gap-2 py-4 text-xs font-black uppercase tracking-widest border-b-4 transition-all whitespace-nowrap ${
              activeTab === 'ABSENCE'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-black'
            }`}
          >
            <AlertCircle className="w-4 h-4" />
            Absence Management
          </button>

          {canApprove && (
            <button
              onClick={() => setActiveTab('APPROVALS')}
              className={`flex items-center gap-2 py-4 text-xs font-black uppercase tracking-widest border-b-4 transition-all whitespace-nowrap relative ${
                activeTab === 'APPROVALS'
                  ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                  : 'border-transparent text-slate-500 hover:text-black'
              }`}
            >
              <ClipboardList className="w-4 h-4" />
              Approval Queue
              {pendingApprovals.length > 0 && (
                <span className="absolute -top-1 -right-4 w-4 h-4 rounded-full bg-rose-500 text-white text-[8px] flex items-center justify-center font-black animate-bounce">
                  {pendingApprovals.length}
                </span>
              )}
            </button>
          )}

          <button
            onClick={() => setActiveTab('LEDGER')}
            className={`flex items-center gap-2 py-4 text-xs font-black uppercase tracking-widest border-b-4 transition-all whitespace-nowrap ${
              activeTab === 'LEDGER'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-black dark:hover:text-white'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            Accrual Ledger
          </button>

          {isAdmin && (
            <button
              onClick={() => setActiveTab('POLICIES')}
              className={`flex items-center gap-2 py-4 text-xs font-black uppercase tracking-widest border-b-4 transition-all whitespace-nowrap ${
                activeTab === 'POLICIES'
                  ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                  : 'border-transparent text-slate-500 hover:text-black dark:hover:text-white'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              Policy Master
            </button>
          )}
          {isAdmin && (
            <button
              onClick={() => setActiveTab('HOLIDAYS')}
              className={`flex items-center gap-2 pb-4 border-b-2 font-bold text-sm transition-colors whitespace-nowrap ${
                activeTab === 'HOLIDAYS'
                  ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                  : 'border-transparent text-slate-500 hover:text-black dark:hover:text-white'
              }`}
            >
              <Calendar className="w-4 h-4" />
              Holiday Calendar
            </button>
          )}
        </div>
      </div>

      {/* Screen Content */}
      <div className="flex-1 overflow-y-auto p-6 md:p-8">
        <div className="max-w-7xl mx-auto pb-24">
          
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <div className="relative">
                <div className="w-16 h-16 rounded-3xl border-4 border-indigo-100 dark:border-indigo-900/30 border-t-indigo-600 animate-spin" />
                <CalendarDays className="absolute inset-0 m-auto w-6 h-6 text-indigo-600" />
              </div>
              <p className="text-sm font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest animate-pulse">Syncing Employee Ledger...</p>
            </div>
          ) : (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              {activeTab === 'DASHBOARD' && (
                <LeaveDashboard 
                  balance={myBalance}
                  myRequests={myRequests}
                  onApplyLeave={() => setShowApplyModal(true)}
                  onCancelRequest={handleCancelRequest}
                  isLoading={isRefreshing}
                />
              )}

              {activeTab === 'ABSENCE' && (
                <AbsenceRegularization 
                  userSession={userSession}
                  company={activeCompany!}
                  rosters={rosters}
                  attendances={attendances}
                  leaves={allRequests}
                  holidays={holidays}
                  policies={policies}
                  onApplyRegularization={handleRegularize}
                  isLoading={isRefreshing}
                />
              )}

              {activeTab === 'APPROVALS' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xl font-black text-black dark:text-white">Approval Workflows</h3>
                      <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mt-1">Manage pending leave requests from your team</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {pendingApprovals.map(req => (
                      <div key={req.id} className="p-6 rounded-[2rem] bg-white dark:bg-slate-900 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-900/40 flex items-center justify-center">
                              <span className="text-lg font-black text-indigo-600 uppercase">{req.employeeName.charAt(0)}</span>
                            </div>
                            <div>
                              <h4 className="text-base font-black text-black dark:text-white leading-tight">{req.employeeName}</h4>
                              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Employee ID: {req.employeeId}</p>
                            </div>
                          </div>
                          <span className="px-3 py-1 rounded-full bg-amber-50 text-amber-600 text-[11px] font-black uppercase tracking-wider border border-amber-200">Pending</span>
                        </div>

                        <div className="p-4 rounded-2xl bg-white dark:bg-slate-950 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 mb-6 space-y-2">
                          <div className="flex justify-between items-center text-xs font-bold">
                            <span className="text-slate-400 uppercase tracking-widest text-[9px]">Request Type</span>
                            <span className="text-black dark:text-white">{req.leaveTypeName}</span>
                          </div>
                          <div className="flex justify-between items-center text-xs font-bold">
                            <span className="text-slate-400 uppercase tracking-widest text-[9px]">Duration</span>
                            <span className="text-black dark:text-white">{req.startDate} → {req.endDate} ({req.daysCount}d)</span>
                          </div>
                          <div className="pt-2 border-t border-slate-200/50 dark:border-slate-700/50">
                            <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1">Reason</p>
                            <p className="text-xs font-medium text-slate-900 dark:text-slate-300 italic leading-relaxed">"{req.reason}"</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => handleReject(req, "Rejected by authority")}
                            className="flex-1 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs font-black uppercase tracking-wider text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition active:scale-95"
                          >
                            Reject
                          </button>
                          <button
                            onClick={() => handleApprove(req)}
                            className="flex-2 py-3 px-6 rounded-2xl bg-emerald-600 text-white text-xs font-black uppercase tracking-wider shadow-lg shadow-emerald-600/20 hover:bg-emerald-700 transition active:scale-95 flex items-center justify-center gap-2"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                            Approve
                          </button>
                        </div>
                      </div>
                    ))}
                    {pendingApprovals.length === 0 && (
                      <div className="col-span-full py-20 text-center bg-white dark:bg-slate-900 dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm">
                        <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
                        <h4 className="text-base font-black text-black dark:text-slate-200 dark:text-white">All Caught Up!</h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">No leave requests are currently pending for approval.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'LEDGER' && (
                <div className="space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h3 className="text-xl font-black text-black dark:text-white flex items-center gap-2">
                        <FileSpreadsheet className="w-5 h-5 text-indigo-600" />
                        Leave Accrual & Transaction Ledger
                      </h3>
                      <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mt-1">
                        Auditable statutory pro-rata accruals, allocations & debit history
                      </p>
                    </div>
                  </div>

                  {/* Pro-rata Summary Info Card */}
                  <div className="p-6 rounded-3xl bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-pink-500/10 border border-indigo-200/50 dark:border-indigo-800/40">
                    <div className="flex items-start gap-4">
                      <div className="p-3 rounded-2xl bg-indigo-600 text-white">
                        <Calculator className="w-6 h-6" />
                      </div>
                      <div className="space-y-1">
                        <h4 className="text-sm font-black text-slate-900 dark:text-white">Pro-Rata Calculation Engine</h4>
                        <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                          For mid-year joining employees, entitlement is calculated pro-rata: <code className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-900 text-indigo-600 font-mono text-xs font-bold">Pro-Rata Entitlement = Annual Entitlement × (Remaining Service Days / Total Days in Year)</code>, rounded strictly by statutory compliance rules (Nearest 0.5 Day).
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Balance Entitlement Table */}
                  <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                    <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                      <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">Active Entitlement Ledger</h4>
                      <span className="text-[11px] font-bold text-slate-400">Employee: {userSession.fullName} ({userSession.employeeId || userSession.userId})</span>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm">
                        <thead>
                          <tr className="border-b border-slate-100 dark:border-slate-800 text-[11px] font-black uppercase text-slate-400 bg-slate-50/50 dark:bg-slate-950/50">
                            <th className="py-3.5 px-5">Leave Code</th>
                            <th className="py-3.5 px-5">Leave Name</th>
                            <th className="py-3.5 px-5 text-right">Opening</th>
                            <th className="py-3.5 px-5 text-right">Accrued</th>
                            <th className="py-3.5 px-5 text-right">Used</th>
                            <th className="py-3.5 px-5 text-right">Pending</th>
                            <th className="py-3.5 px-5 text-right">Available</th>
                            <th className="py-3.5 px-5 text-center">Pro-Rata Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                          {myBalance?.balances.map((b) => (
                            <tr key={b.leaveCode} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition">
                              <td className="py-3.5 px-5 font-black text-indigo-600">{b.leaveCode}</td>
                              <td className="py-3.5 px-5 text-slate-900 dark:text-white font-bold">{b.leaveName}</td>
                              <td className="py-3.5 px-5 text-right">{b.openingBalance.toFixed(1)}</td>
                              <td className="py-3.5 px-5 text-right text-emerald-600 font-bold">+{b.accrued.toFixed(1)}</td>
                              <td className="py-3.5 px-5 text-right text-rose-600">-{b.used.toFixed(1)}</td>
                              <td className="py-3.5 px-5 text-right text-amber-600">{b.pending.toFixed(1)}</td>
                              <td className="py-3.5 px-5 text-right font-black text-slate-900 dark:text-white text-sm">
                                {(b.openingBalance + b.accrued - b.used - b.pending).toFixed(1)}
                              </td>
                              <td className="py-3.5 px-5 text-center">
                                {b.isProRataApplied ? (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-black bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                                    Pro-Rata ({b.joiningDate ? `DOJ: ${b.joiningDate}` : `${((b.proRataFactor || 1)*100).toFixed(0)}%`})
                                  </span>
                                ) : (
                                  <span className="text-[11px] text-slate-400 font-bold">Standard (100%)</span>
                                )}
                              </td>
                            </tr>
                          ))}
                          {!myBalance?.balances?.length && (
                            <tr>
                              <td colSpan={8} className="py-12 text-center text-slate-400 text-xs">
                                No active leave balances found for current financial cycle.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Transaction History (Debits & Approvals) */}
                  <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                    <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                      <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">Transaction & Utilization Log</h4>
                      <span className="text-[11px] font-bold text-slate-400">{myRequests.length} Total Applications</span>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm">
                        <thead>
                          <tr className="border-b border-slate-100 dark:border-slate-800 text-[11px] font-black uppercase text-slate-400 bg-slate-50/50 dark:bg-slate-950/50">
                            <th className="py-3.5 px-5">Date / Time</th>
                            <th className="py-3.5 px-5">Leave Type</th>
                            <th className="py-3.5 px-5">Span</th>
                            <th className="py-3.5 px-5 text-right">Days</th>
                            <th className="py-3.5 px-5">Status</th>
                            <th className="py-3.5 px-5">Reason</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                          {myRequests.map((r) => (
                            <tr key={r.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition">
                              <td className="py-3.5 px-5 text-slate-500">{new Date(r.createdAt || Date.now()).toLocaleDateString()}</td>
                              <td className="py-3.5 px-5 font-bold text-slate-900 dark:text-white">{r.leaveTypeName}</td>
                              <td className="py-3.5 px-5 text-slate-600 dark:text-slate-300">{r.startDate} → {r.endDate}</td>
                              <td className="py-3.5 px-5 text-right font-black text-slate-900 dark:text-white">
                                {r.daysCount}d
                              </td>
                              <td className="py-3.5 px-5">
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                                  r.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400' :
                                  r.status === 'REJECTED' ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-400' :
                                  'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-400'
                                }`}>
                                  {r.status}
                                </span>
                              </td>
                              <td className="py-3.5 px-5 text-slate-500 max-w-xs truncate">{r.reason}</td>
                            </tr>
                          ))}
                          {!myRequests.length && (
                            <tr>
                              <td colSpan={6} className="py-12 text-center text-slate-400 text-xs">
                                No leave applications or transactions recorded yet.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'POLICIES' && isAdmin && (
                <LeavePolicyMaster 
                  userSession={userSession}
                  company={activeCompany!}
                  policies={policies}
                  onSavePolicy={handleSavePolicy}
                  isLoading={isRefreshing}
                />
              )}
              {activeTab === 'HOLIDAYS' && (
                <HolidayCalendarMaster
                  companyId={companyId}
                  userSession={userSession}
                  company={activeCompany!}
                  holidays={holidays}
                  onHolidaysChange={() => {
                    FirestoreService.getHolidays(companyId, new Date().getFullYear()).then(setHolidays);
                  }}
                  isLoading={isRefreshing}
                />
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {showApplyModal && (
        <LeaveApplyForm 
          userSession={userSession}
          policies={policies}
          balance={myBalance}
          holidays={holidays}
          existingRequests={myRequests}
          onClose={() => setShowApplyModal(false)}
          onSubmit={handleApplyLeave}
          isLoading={isRefreshing}
        />
      )}

    </div>
  );
};
