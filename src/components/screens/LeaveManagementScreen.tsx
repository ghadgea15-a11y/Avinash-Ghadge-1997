import React, { useState, useEffect, useMemo } from 'react';
import { 
  Calendar, 
  Clock, 
  Plus, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Filter, 
  Search, 
  Download, 
  FileText, 
  UserCheck, 
  Users, 
  ChevronRight, 
  Check, 
  X, 
  Eye, 
  RefreshCw,
  TrendingUp,
  Shield,
  Building,
  CalendarDays
} from 'lucide-react';
import { 
  UserSession, 
  CompanyTenant, 
  PhaseAScreen, 
  LeaveRequestRecord, 
  LeaveBalanceRecord, 
  EmployeeRecord 
} from '../../types';
import { FirestoreService } from '../../services/firestoreService';
import { WorkflowEngine, WorkflowContext } from '../../services/workflowEngine';
import { RbacService } from '../../services/rbacService';

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
  const [activeTab, setActiveTab] = useState<'MY_LEAVES' | 'APPROVAL_QUEUE' | 'REGISTER' | 'BALANCES'>('MY_LEAVES');
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequestRecord[]>([]);
  const [employees, setEmployees] = useState<EmployeeRecord[]>([]);
  const [myBalance, setMyBalance] = useState<LeaveBalanceRecord | null>(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');

  // Modals
  const [isApplyModalOpen, setIsApplyModalOpen] = useState<boolean>(false);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState<boolean>(false);
  const [selectedRequestForAction, setSelectedRequestForAction] = useState<LeaveRequestRecord | null>(null);
  const [rejectionReason, setRejectionReason] = useState<string>('');
  const [actionLoading, setActionLoading] = useState<boolean>(false);

  // Apply Form State
  const [applyForm, setApplyForm] = useState({
    employeeId: userSession.employeeId || userSession.userId,
    employeeName: userSession.fullName,
    leaveType: 'CASUAL' as LeaveRequestRecord['leaveType'],
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    reason: '',
    contactDuringLeave: userSession.mobileNumber || '',
    handoverEmployeeId: ''
  });

  // Using WorkflowEngine to check if the user has baseline authority to see the Approval queue
  const canApprove = WorkflowEngine.resolveApprovalAuthority(userSession, 'LEAVE_REQUEST', { companyId: activeCompany?.companyId || userSession.companyId }).canApprove;
  const companyId = activeCompany?.companyId || userSession.companyId;

  // Realtime Subscriptions
  useEffect(() => {
    if (!companyId) return;
    setLoading(true);

    const unsubLeaves = FirestoreService.subscribeToLeaveRequests(userSession, companyId, (data) => {
      setLeaveRequests(data);
      setLoading(false);
    });

    const loadEmployees = async () => {
      const emps = await FirestoreService.getEmployees(companyId);
      setEmployees(emps);
      const balance = await FirestoreService.getLeaveBalance(
        companyId, 
        userSession.employeeId || userSession.userId, 
        userSession.fullName
      );
      setMyBalance(balance);
    };

    loadEmployees();

    return () => {
      unsubLeaves();
    };
  }, [companyId, userSession]);

  const handleRefresh = async () => {
    if (!companyId) return;
    setRefreshing(true);
    const leaves = await FirestoreService.getLeaveRequests(companyId);
    setLeaveRequests(leaves);
    const balance = await FirestoreService.getLeaveBalance(
      companyId, 
      userSession.employeeId || userSession.userId, 
      userSession.fullName
    );
    setMyBalance(balance);
    setRefreshing(false);
  };

  // Calculate days count
  const calculateDays = (startStr: string, endStr: string): number => {
    if (!startStr || !endStr) return 1;
    const start = new Date(startStr);
    const end = new Date(endStr);
    const diffTime = end.getTime() - start.getTime();
    if (diffTime < 0) return 1;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  };

  const currentDaysCount = useMemo(() => {
    return calculateDays(applyForm.startDate, applyForm.endDate);
  }, [applyForm.startDate, applyForm.endDate]);

  // Submit Leave Application
  const handleApplyLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyId) return;
    if (!applyForm.reason.trim()) {
      alert('Please provide a reason for the leave application.');
      return;
    }

    setActionLoading(true);
    try {
      const selectedEmp = employees.find(emp => emp.id === applyForm.employeeId || emp.employeeId === applyForm.employeeId);
      const empName = selectedEmp ? `${selectedEmp.firstName} ${selectedEmp.lastName}` : applyForm.employeeName;

      const successId = await FirestoreService.createLeaveRequest(companyId, {
        companyId,
        employeeId: applyForm.employeeId,
        employeeName: empName,
        leaveType: applyForm.leaveType,
        startDate: applyForm.startDate,
        endDate: applyForm.endDate,
        daysCount: currentDaysCount,
        reason: applyForm.reason.trim(),
        contactDuringLeave: applyForm.contactDuringLeave.trim(),
        handoverEmployeeId: applyForm.handoverEmployeeId,
        status: 'PENDING',
        appliedAt: new Date().toISOString()
      });

      if (successId) {
        setIsApplyModalOpen(false);
        setApplyForm({
          employeeId: userSession.employeeId || userSession.userId,
          employeeName: userSession.fullName,
          leaveType: 'CASUAL',
          startDate: new Date().toISOString().split('T')[0],
          endDate: new Date().toISOString().split('T')[0],
          reason: '',
          contactDuringLeave: userSession.mobileNumber || '',
          handoverEmployeeId: ''
        });
      } else {
        alert('Failed to submit leave request. Please check connection and try again.');
      }
    } catch (err: any) {
      alert(err.message || 'Error submitting leave request');
    } finally {
      setActionLoading(false);
    }
  };

  // Approve Request
  const handleApprove = async (request: LeaveRequestRecord) => {
    if (!companyId) return;

    const resolution = WorkflowEngine.resolveApprovalAuthority(userSession, 'LEAVE_REQUEST', {
      companyId,
      daysCount: request.daysCount,
      targetDepartmentId: request.departmentId
    });

    if (!resolution.canApprove) {
      alert(`Approval Denied: ${resolution.reason}`);
      return;
    }

    setActionLoading(true);
    try {
      const ok = await FirestoreService.updateLeaveRequestStatus(
        companyId,
        request.id,
        'APPROVED',
        {
          uid: userSession.userId,
          name: userSession.fullName,
          reason: 'Approved by Administrator'
        }
      );

      if (ok) {
        // Deduct from balance
        const balance = await FirestoreService.getLeaveBalance(
          companyId,
          request.employeeId,
          request.employeeName
        );
        if (request.leaveType === 'CASUAL') {
          balance.casualLeave.used += request.daysCount;
          balance.casualLeave.remaining = Math.max(0, balance.casualLeave.total - balance.casualLeave.used);
        } else if (request.leaveType === 'SICK') {
          balance.sickLeave.used += request.daysCount;
          balance.sickLeave.remaining = Math.max(0, balance.sickLeave.total - balance.sickLeave.used);
        } else if (request.leaveType === 'EARNED') {
          balance.earnedLeave.used += request.daysCount;
          balance.earnedLeave.remaining = Math.max(0, balance.earnedLeave.total - balance.earnedLeave.used);
        } else if (request.leaveType === 'UNPAID') {
          balance.unpaidLeave.used += request.daysCount;
        }
        await FirestoreService.saveLeaveBalance(companyId, balance);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  // Reject Request
  const handleRejectSubmit = async () => {
    if (!companyId || !selectedRequestForAction) return;
    
    const resolution = WorkflowEngine.resolveApprovalAuthority(userSession, 'LEAVE_REQUEST', {
      companyId,
      daysCount: selectedRequestForAction.daysCount,
      targetDepartmentId: selectedRequestForAction.departmentId
    });

    if (!resolution.canApprove) {
      alert(`Rejection Denied: ${resolution.reason}`);
      return;
    }

    if (!rejectionReason.trim()) {
      alert('Please specify the reason for rejection.');
      return;
    }

    setActionLoading(true);
    try {
      await FirestoreService.updateLeaveRequestStatus(
        companyId,
        selectedRequestForAction.id,
        'REJECTED',
        {
          uid: userSession.userId,
          name: userSession.fullName,
          reason: rejectionReason.trim()
        }
      );
      setIsRejectModalOpen(false);
      setSelectedRequestForAction(null);
      setRejectionReason('');
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  // Cancel own pending request
  const handleCancelOwnRequest = async (request: LeaveRequestRecord) => {
    if (!companyId) return;
    if (!confirm('Are you sure you want to cancel this leave application?')) return;

    setActionLoading(true);
    try {
      await FirestoreService.updateLeaveRequestStatus(
        companyId,
        request.id,
        'CANCELLED',
        {
          uid: userSession.userId,
          name: userSession.fullName,
          reason: 'Cancelled by applicant'
        }
      );
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    if (leaveRequests.length === 0) {
      alert('No leave records to export.');
      return;
    }

    const headers = ['Request ID', 'Employee Name', 'Leave Type', 'Start Date', 'End Date', 'Days', 'Status', 'Reason', 'Applied At', 'Reviewed By'];
    const rows = leaveRequests.map(l => [
      l.id,
      `"${l.employeeName}"`,
      l.leaveType,
      l.startDate,
      l.endDate,
      l.daysCount,
      l.status,
      `"${l.reason.replace(/"/g, '""')}"`,
      l.appliedAt,
      `"${l.approvedByName || l.rejectedBy || ''}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Leave_Register_${companyId}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filtered lists
  const myLeaves = useMemo(() => {
    return leaveRequests.filter(l => 
      l.employeeId === userSession.employeeId || 
      l.employeeId === userSession.userId || 
      l.employeeName === userSession.fullName
    );
  }, [leaveRequests, userSession]);

  const pendingApprovals = useMemo(() => {
    return leaveRequests.filter(l => l.status === 'PENDING');
  }, [leaveRequests]);

  const filteredRegister = useMemo(() => {
    return leaveRequests.filter(l => {
      const matchesSearch = 
        l.employeeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        l.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        l.reason.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'ALL' || l.status === statusFilter;
      const matchesType = typeFilter === 'ALL' || l.leaveType === typeFilter;
      return matchesSearch && matchesStatus && matchesType;
    });
  }, [leaveRequests, searchQuery, statusFilter, typeFilter]);

  const getStatusBadge = (status: LeaveRequestRecord['status']) => {
    switch (status) {
      case 'APPROVED':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800"><CheckCircle2 className="w-3 h-3" /> Approved</span>;
      case 'PENDING':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-400 border border-amber-300 dark:border-amber-800"><Clock className="w-3 h-3" /> Pending</span>;
      case 'REJECTED':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-400 border border-rose-300 dark:border-rose-800"><XCircle className="w-3 h-3" /> Rejected</span>;
      case 'CANCELLED':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400 border border-slate-300 dark:border-slate-700"><AlertCircle className="w-3 h-3" /> Cancelled</span>;
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 w-full max-w-7xl mx-auto pb-24 animate-fade-in text-slate-900 dark:text-slate-100">
      
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400">
              <CalendarDays className="w-6 h-6" />
            </span>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight">Leave Management</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {activeCompany?.brandName || 'Tenant Portal'} • HRMS Leave Entitlements & Approvals
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition text-slate-600 dark:text-slate-300"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-indigo-600' : ''}`} />
          </button>

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold text-xs transition"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={() => setIsApplyModalOpen(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/20 transition"
          >
            <Plus className="w-4 h-4" />
            <span>Apply Leave</span>
          </button>
        </div>
      </div>

      {/* Leave Balance Overview Cards */}
      {myBalance && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">Casual Leave (CL)</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 font-bold">{myBalance.casualLeave.total} Total</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-slate-900 dark:text-white">{myBalance.casualLeave.remaining}</span>
              <span className="text-xs text-slate-500">Days Available</span>
            </div>
            <div className="w-full bg-slate-100 dark:bg-slate-700 h-1.5 rounded-full mt-3 overflow-hidden">
              <div 
                className="bg-indigo-600 h-full rounded-full" 
                style={{ width: `${Math.min(100, (myBalance.casualLeave.remaining / myBalance.casualLeave.total) * 100)}%` }} 
              />
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Sick Leave (SL)</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-900/40 text-emerald-600 font-bold">{myBalance.sickLeave.total} Total</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-slate-900 dark:text-white">{myBalance.sickLeave.remaining}</span>
              <span className="text-xs text-slate-500">Days Available</span>
            </div>
            <div className="w-full bg-slate-100 dark:bg-slate-700 h-1.5 rounded-full mt-3 overflow-hidden">
              <div 
                className="bg-emerald-600 h-full rounded-full" 
                style={{ width: `${Math.min(100, (myBalance.sickLeave.remaining / myBalance.sickLeave.total) * 100)}%` }} 
              />
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">Earned Leave (EL)</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-900/40 text-amber-600 font-bold">{myBalance.earnedLeave.total} Total</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-slate-900 dark:text-white">{myBalance.earnedLeave.remaining}</span>
              <span className="text-xs text-slate-500">Days Available</span>
            </div>
            <div className="w-full bg-slate-100 dark:bg-slate-700 h-1.5 rounded-full mt-3 overflow-hidden">
              <div 
                className="bg-amber-500 h-full rounded-full" 
                style={{ width: `${Math.min(100, (myBalance.earnedLeave.remaining / myBalance.earnedLeave.total) * 100)}%` }} 
              />
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">Unpaid / LOP</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-rose-50 dark:bg-rose-900/40 text-rose-600 font-bold">Deduction</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-slate-900 dark:text-white">{myBalance.unpaidLeave?.used || 0}</span>
              <span className="text-xs text-slate-500">Days Taken</span>
            </div>
            <div className="w-full bg-slate-100 dark:bg-slate-700 h-1.5 rounded-full mt-3 overflow-hidden">
              <div 
                className="bg-rose-500 h-full rounded-full" 
                style={{ width: `${Math.min(100, (myBalance.unpaidLeave?.used || 0) * 10)}%` }} 
              />
            </div>
          </div>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-700 mb-6 overflow-x-auto">
        <button
          onClick={() => setActiveTab('MY_LEAVES')}
          className={`px-4 py-3 border-b-2 font-bold text-xs sm:text-sm whitespace-nowrap transition ${
            activeTab === 'MY_LEAVES'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          My Applications ({myLeaves.length})
        </button>

        {canApprove && (
          <button
            onClick={() => setActiveTab('APPROVAL_QUEUE')}
            className={`px-4 py-3 border-b-2 font-bold text-xs sm:text-sm whitespace-nowrap transition relative ${
              activeTab === 'APPROVAL_QUEUE'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <span>Approval Queue</span>
            {pendingApprovals.length > 0 && (
              <span className="ml-2 px-2 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-black">
                {pendingApprovals.length}
              </span>
            )}
          </button>
        )}

        <button
          onClick={() => setActiveTab('REGISTER')}
          className={`px-4 py-3 border-b-2 font-bold text-xs sm:text-sm whitespace-nowrap transition ${
            activeTab === 'REGISTER'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          Company Leave Register ({leaveRequests.length})
        </button>
      </div>

      {/* Tab 1: My Leave Applications */}
      {activeTab === 'MY_LEAVES' && (
        <div className="space-y-4">
          {myLeaves.length === 0 ? (
            <div className="text-center py-12 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-8">
              <Calendar className="w-12 h-12 text-slate-400 mx-auto mb-3 opacity-40" />
              <h3 className="text-base font-bold text-slate-800 dark:text-white">No Leave Applications Found</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mt-1 mb-4">
                You haven't applied for any leave yet. Click below to submit your first leave application.
              </p>
              <button
                onClick={() => setIsApplyModalOpen(true)}
                className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-bold text-xs shadow hover:bg-indigo-700 transition"
              >
                Apply for Leave
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {myLeaves.map(req => (
                <div 
                  key={req.id}
                  className="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div>
                        <span className="text-xs font-mono font-bold text-slate-400">{req.id}</span>
                        <h4 className="text-base font-bold text-slate-900 dark:text-white mt-0.5">
                          {req.leaveType} Leave • {req.daysCount} Day{req.daysCount > 1 ? 's' : ''}
                        </h4>
                      </div>
                      {getStatusBadge(req.status)}
                    </div>

                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 text-xs space-y-1.5 mb-3">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Duration:</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">{req.startDate} to {req.endDate}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Applied On:</span>
                        <span className="text-slate-700 dark:text-slate-300">{new Date(req.appliedAt).toLocaleDateString()}</span>
                      </div>
                      {req.reason && (
                        <div className="pt-1 border-t border-slate-200/50 dark:border-slate-700/50">
                          <span className="text-slate-500">Reason: </span>
                          <span className="text-slate-700 dark:text-slate-300 italic">{req.reason}</span>
                        </div>
                      )}
                    </div>

                    {req.status === 'REJECTED' && req.rejectionReason && (
                      <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-xs text-rose-700 dark:text-rose-300 mb-3">
                        <strong>Rejection Reason:</strong> {req.rejectionReason}
                      </div>
                    )}
                  </div>

                  {req.status === 'PENDING' && (
                    <div className="flex justify-end pt-2 border-t border-slate-100 dark:border-slate-700/50">
                      <button
                        onClick={() => handleCancelOwnRequest(req)}
                        disabled={actionLoading}
                        className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/50 text-xs font-semibold text-slate-500 transition"
                      >
                        Cancel Request
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Approval Queue (Admins & HR) */}
      {activeTab === 'APPROVAL_QUEUE' && canApprove && (
        <div className="space-y-4">
          {pendingApprovals.length === 0 ? (
            <div className="text-center py-12 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-8">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3 opacity-60" />
              <h3 className="text-base font-bold text-slate-800 dark:text-white">All Caught Up!</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mt-1">
                There are no pending leave requests awaiting approval for this tenant.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {pendingApprovals.map(req => (
                <div 
                  key={req.id}
                  className="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-amber-200 dark:border-amber-900/40 shadow-sm flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div>
                        <h4 className="text-base font-bold text-slate-900 dark:text-white">
                          {req.employeeName}
                        </h4>
                        <p className="text-xs text-slate-500 font-mono">ID: {req.employeeId}</p>
                      </div>
                      <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-400">
                        {req.leaveType} ({req.daysCount}d)
                      </span>
                    </div>

                    <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 text-xs space-y-2 mb-4">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Dates:</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">{req.startDate} to {req.endDate}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Applied On:</span>
                        <span className="text-slate-700 dark:text-slate-300">{new Date(req.appliedAt).toLocaleDateString()}</span>
                      </div>
                      {req.contactDuringLeave && (
                        <div className="flex justify-between">
                          <span className="text-slate-500">Contact:</span>
                          <span className="text-slate-700 dark:text-slate-300 font-mono">{req.contactDuringLeave}</span>
                        </div>
                      )}
                      <div className="pt-2 border-t border-slate-200/50 dark:border-slate-700/50">
                        <span className="text-slate-500 block mb-0.5">Reason for leave:</span>
                        <span className="text-slate-800 dark:text-slate-200 italic font-medium">"{req.reason}"</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 pt-3 border-t border-slate-100 dark:border-slate-700/50">
                    <button
                      onClick={() => {
                        setSelectedRequestForAction(req);
                        setIsRejectModalOpen(true);
                      }}
                      disabled={actionLoading}
                      className="flex-1 py-2.5 rounded-xl border border-rose-200 dark:border-rose-900/50 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 font-bold text-xs transition flex items-center justify-center gap-1.5"
                    >
                      <X className="w-4 h-4" />
                      <span>Reject</span>
                    </button>

                    <button
                      onClick={() => handleApprove(req)}
                      disabled={actionLoading}
                      className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition flex items-center justify-center gap-1.5"
                    >
                      <Check className="w-4 h-4" />
                      <span>Approve</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Complete Company Leave Register */}
      {activeTab === 'REGISTER' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Search employee, ID or reason..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-200 outline-none"
              >
                <option value="ALL">All Statuses</option>
                <option value="PENDING">Pending</option>
                <option value="APPROVED">Approved</option>
                <option value="REJECTED">Rejected</option>
                <option value="CANCELLED">Cancelled</option>
              </select>

              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-200 outline-none"
              >
                <option value="ALL">All Leave Types</option>
                <option value="CASUAL">Casual Leave (CL)</option>
                <option value="SICK">Sick Leave (SL)</option>
                <option value="EARNED">Earned Leave (EL)</option>
                <option value="UNPAID">Unpaid / LOP</option>
                <option value="COMP_OFF">Compensatory Off</option>
                <option value="MATERNITY">Maternity</option>
                <option value="PATERNITY">Paternity</option>
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-700 text-slate-500 font-bold uppercase tracking-wider">
                  <tr>
                    <th className="p-3.5">Employee</th>
                    <th className="p-3.5">Type</th>
                    <th className="p-3.5">Dates</th>
                    <th className="p-3.5">Days</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5">Reason</th>
                    <th className="p-3.5">Reviewed By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                  {filteredRegister.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-400">
                        No leave records matching the selected filters.
                      </td>
                    </tr>
                  ) : (
                    filteredRegister.map(req => (
                      <tr key={req.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition">
                        <td className="p-3.5">
                          <div className="font-bold text-slate-900 dark:text-white">{req.employeeName}</div>
                          <div className="text-[10px] text-slate-400 font-mono">{req.employeeId}</div>
                        </td>
                        <td className="p-3.5">
                          <span className="font-semibold text-slate-700 dark:text-slate-300">{req.leaveType}</span>
                        </td>
                        <td className="p-3.5 font-medium text-slate-800 dark:text-slate-200">
                          {req.startDate} → {req.endDate}
                        </td>
                        <td className="p-3.5 font-bold text-slate-900 dark:text-white">
                          {req.daysCount}
                        </td>
                        <td className="p-3.5">
                          {getStatusBadge(req.status)}
                        </td>
                        <td className="p-3.5 text-slate-600 dark:text-slate-300 max-w-xs truncate" title={req.reason}>
                          {req.reason}
                        </td>
                        <td className="p-3.5 text-slate-500 dark:text-slate-400 text-[11px]">
                          {req.approvedByName || req.rejectedBy || '—'}
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

      {/* Apply Leave Modal */}
      {isApplyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-2xl max-w-md w-full p-6 animate-in zoom-in-95">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100 dark:border-slate-700">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-indigo-600" />
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Apply for Leave</h3>
              </div>
              <button 
                onClick={() => setIsApplyModalOpen(false)}
                className="p-1 rounded-full text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleApplyLeave} className="space-y-4 text-xs">
              {/* Employee selector (if admin) */}
              {canApprove && (
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Applying For</label>
                  <select
                    value={applyForm.employeeId}
                    onChange={(e) => {
                      const emp = employees.find(x => x.id === e.target.value || x.employeeId === e.target.value);
                      setApplyForm({
                        ...applyForm,
                        employeeId: e.target.value,
                        employeeName: emp ? `${emp.firstName} ${emp.lastName}` : userSession.fullName
                      });
                    }}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white outline-none focus:border-indigo-500"
                  >
                    <option value={userSession.employeeId || userSession.userId}>{userSession.fullName} (Self)</option>
                    {employees.map(emp => (
                      <option key={emp.id} value={emp.id}>{emp.firstName} {emp.lastName} ({emp.employeeId || emp.id})</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Leave Type */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Leave Type</label>
                <select
                  value={applyForm.leaveType}
                  onChange={(e) => setApplyForm({ ...applyForm, leaveType: e.target.value as any })}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white outline-none focus:border-indigo-500"
                >
                  <option value="CASUAL">Casual Leave (CL)</option>
                  <option value="SICK">Sick Leave (SL)</option>
                  <option value="EARNED">Earned Leave (EL)</option>
                  <option value="UNPAID">Unpaid / Loss of Pay (LOP)</option>
                  <option value="COMP_OFF">Compensatory Off</option>
                  <option value="MATERNITY">Maternity Leave</option>
                  <option value="PATERNITY">Paternity Leave</option>
                  <option value="EMERGENCY">Emergency Leave</option>
                </select>
              </div>

              {/* Date Pickers */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={applyForm.startDate}
                    onChange={(e) => setApplyForm({ ...applyForm, startDate: e.target.value })}
                    required
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">End Date</label>
                  <input
                    type="date"
                    value={applyForm.endDate}
                    onChange={(e) => setApplyForm({ ...applyForm, endDate: e.target.value })}
                    required
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Total Computed Days */}
              <div className="p-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900/50 flex justify-between items-center text-indigo-900 dark:text-indigo-200 font-bold">
                <span>Total Leave Duration:</span>
                <span className="text-base">{currentDaysCount} Day{currentDaysCount > 1 ? 's' : ''}</span>
              </div>

              {/* Reason */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Reason for Leave *</label>
                <textarea
                  value={applyForm.reason}
                  onChange={(e) => setApplyForm({ ...applyForm, reason: e.target.value })}
                  placeholder="State the reason for taking leave..."
                  rows={3}
                  required
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white outline-none focus:border-indigo-500"
                />
              </div>

              {/* Emergency Contact */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Emergency Contact Number</label>
                <input
                  type="tel"
                  value={applyForm.contactDuringLeave}
                  onChange={(e) => setApplyForm({ ...applyForm, contactDuringLeave: e.target.value })}
                  placeholder="+91 9876543210"
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white outline-none focus:border-indigo-500"
                />
              </div>

              {/* Buttons */}
              <div className="flex items-center gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsApplyModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-md shadow-indigo-600/20 transition flex items-center justify-center gap-1.5"
                >
                  {actionLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  <span>Submit Application</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {isRejectModalOpen && selectedRequestForAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-2xl max-w-md w-full p-6 animate-in zoom-in-95">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100 dark:border-slate-700">
              <div className="flex items-center gap-2 text-rose-600">
                <XCircle className="w-5 h-5" />
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Reject Leave Request</h3>
              </div>
              <button 
                onClick={() => {
                  setIsRejectModalOpen(false);
                  setSelectedRequestForAction(null);
                }}
                className="p-1 rounded-full text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 mb-4">
              Rejecting leave application for <strong>{selectedRequestForAction.employeeName}</strong> ({selectedRequestForAction.daysCount} days of {selectedRequestForAction.leaveType} leave).
            </p>

            <div className="space-y-3 text-xs mb-6">
              <label className="block font-bold text-slate-700 dark:text-slate-300">Rejection Reason *</label>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="State the reason why this leave is rejected..."
                rows={3}
                required
                className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white outline-none focus:border-rose-500"
              />
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setIsRejectModalOpen(false);
                  setSelectedRequestForAction(null);
                }}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRejectSubmit}
                disabled={actionLoading}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold shadow-md shadow-rose-600/20 transition flex items-center justify-center gap-1.5"
              >
                {actionLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
                <span>Confirm Rejection</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
