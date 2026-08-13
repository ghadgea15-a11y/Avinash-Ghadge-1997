import React, { useState, useEffect } from 'react';
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  UserCheck, 
  Search, 
  Filter, 
  ShieldCheck, 
  Building2, 
  Mail, 
  Phone, 
  Loader2, 
  AlertCircle,
  FileText,
  User,
  ArrowLeft,
  RefreshCw,
  Sparkles
} from 'lucide-react';
import { ApprovalRequestRecord, UserSession, PhaseAScreen, AccountStatus } from '../../types';
import { FirestoreService } from '../../services/firestoreService';
import { useTheme } from '../../context/ThemeContext';

interface ApprovalManagementScreenProps {
  session: UserSession;
  onNavigateBack: () => void;
}

export const ApprovalManagementScreen: React.FC<ApprovalManagementScreenProps> = ({
  session,
  onNavigateBack
}) => {
  const { isDark } = useTheme();

  const [requests, setRequests] = useState<ApprovalRequestRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'PENDING' | 'APPROVED' | 'REJECTED' | 'ALL'>('PENDING');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Rejection modal state
  const [rejectingRequest, setRejectingRequest] = useState<ApprovalRequestRecord | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Subscribe to approval requests
  useEffect(() => {
    setLoading(true);
    const companyId = session.companyId || 'GLOBAL';
    const unsubscribe = FirestoreService.subscribeToApprovalRequests(companyId, (data) => {
      setRequests(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [session.companyId]);

  // Handle Company Admin Approval Action
  const handleApproveAdmin = async (req: ApprovalRequestRecord) => {
    setActionLoading(req.id);
    setActionSuccess(null);
    setActionError(null);

    try {
      const ok = await FirestoreService.approveUserByCompanyAdmin(
        req.companyId,
        req.id,
        session.userId,
        session.fullName
      );

      if (ok) {
        setActionSuccess(`Admin approval granted for ${req.fullName}.`);
      } else {
        setActionError('Failed to record Admin approval.');
      }
    } catch (err: any) {
      setActionError(err.message || 'Error processing Admin approval.');
    } finally {
      setActionLoading(null);
    }
  };

  // Handle HR Approval Action
  const handleApproveHR = async (req: ApprovalRequestRecord) => {
    setActionLoading(req.id);
    setActionSuccess(null);
    setActionError(null);

    try {
      const ok = await FirestoreService.approveUserByHR(
        req.companyId,
        req.id,
        session.userId,
        session.fullName
      );

      if (ok) {
        setActionSuccess(`HR approval granted for ${req.fullName}.`);
      } else {
        setActionError('Failed to record HR approval.');
      }
    } catch (err: any) {
      setActionError(err.message || 'Error processing HR approval.');
    } finally {
      setActionLoading(null);
    }
  };

  // Handle Rejection Submit
  const handleConfirmRejection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectingRequest) return;

    if (!rejectionReason.trim()) {
      setActionError('Please enter a valid rejection reason.');
      return;
    }

    setActionLoading(rejectingRequest.id);
    setActionSuccess(null);
    setActionError(null);

    try {
      const ok = await FirestoreService.rejectUserApplication(
        rejectingRequest.companyId,
        rejectingRequest.id,
        session.userId,
        rejectionReason.trim()
      );

      if (ok) {
        setActionSuccess(`Application for ${rejectingRequest.fullName} was rejected.`);
        setRejectingRequest(null);
        setRejectionReason('');
      } else {
        setActionError('Failed to reject application.');
      }
    } catch (err: any) {
      setActionError(err.message || 'Error rejecting application.');
    } finally {
      setActionLoading(null);
    }
  };

  // Filter requests
  const filteredRequests = requests.filter((req) => {
    // Search match
    const matchSearch = 
      req.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.departmentName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.id.toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchSearch) return false;

    if (activeTab === 'PENDING') {
      return req.accountStatus !== 'ACTIVE' && req.accountStatus !== 'REJECTED';
    }
    if (activeTab === 'APPROVED') {
      return req.accountStatus === 'ACTIVE' || req.accountStatus === 'ADMIN_APPROVED' || req.accountStatus === 'HR_APPROVED';
    }
    if (activeTab === 'REJECTED') {
      return req.accountStatus === 'REJECTED';
    }
    return true;
  });

  return (
    <div className={`min-h-screen transition-colors duration-300 ${isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'} p-4 md:p-6 space-y-6 max-w-6xl mx-auto w-full`}>
      {/* Top Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onNavigateBack}
            className={`p-2 rounded-xl border transition ${
              isDark ? 'bg-slate-900 border-slate-800 hover:bg-slate-800 text-slate-300' : 'bg-white border-slate-200 hover:bg-slate-100 text-slate-700'
            }`}
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Account Approval Management</h1>
            <p className="text-xs text-slate-400">
              Multi-level approval workflow for company user access requests.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1.5 bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 font-mono text-xs font-bold rounded-xl flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4" />
            <span>Company: {session.companyId}</span>
          </span>
        </div>
      </div>

      {/* Notifications / Banners */}
      {actionSuccess && (
        <div className="p-3 bg-emerald-950/80 border border-emerald-800 rounded-xl text-xs text-emerald-300 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {actionError && (
        <div className="p-3 bg-rose-950/80 border border-rose-800 rounded-xl text-xs text-rose-300 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {/* Search & Tabs Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Filter Tabs */}
        <div className={`p-1 rounded-xl border flex gap-1 ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
          {(['PENDING', 'APPROVED', 'REJECTED', 'ALL'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeTab === tab
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search applicant name, email, department..."
            className={`w-full transition-colors duration-300 ${
              isDark ? 'bg-slate-900 border-slate-800 text-white placeholder-slate-500' : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400'
            } rounded-xl px-4 py-2 text-xs pl-9 focus:outline-none focus:border-indigo-500`}
          />
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
        </div>
      </div>

      {/* Applications List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((n) => (
            <div key={n} className="p-5 bg-slate-900/60 border border-slate-800/80 rounded-2xl animate-pulse space-y-3">
              <div className="h-4 bg-slate-800 rounded w-1/3" />
              <div className="h-3 bg-slate-800/60 rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : filteredRequests.length === 0 ? (
        <div className="p-12 text-center border border-dashed border-slate-800 rounded-2xl space-y-3">
          <UserCheck className="w-10 h-10 text-slate-600 mx-auto" />
          <p className="text-sm font-semibold text-slate-300">No approval requests found</p>
          <p className="text-xs text-slate-500">
            {activeTab === 'PENDING'
              ? 'There are currently no pending applicant requests requiring review.'
              : 'No matching records match your filter criteria.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredRequests.map((req) => {
            const isProcessing = actionLoading === req.id;
            const isAdminApproved = req.companyAdminApproval === 'APPROVED';
            const isHrApproved = req.hrApproval === 'APPROVED';

            return (
              <div
                key={req.id}
                className={`p-5 rounded-2xl border transition-all ${
                  isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* Left Column: Applicant Details */}
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-white">{req.fullName}</span>
                      <span className="px-2 py-0.5 bg-slate-800 text-slate-300 rounded-md text-[10px] font-mono">
                        {req.departmentName || 'General'}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        req.accountStatus === 'ACTIVE' 
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                          : req.accountStatus === 'REJECTED'
                          ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                          : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      }`}>
                        STATUS: {req.accountStatus}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-slate-400">
                      <div className="flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5 text-slate-500" />
                        <span className="font-mono">{req.email}</span>
                      </div>
                      {req.mobileNumber && (
                        <div className="flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5 text-slate-500" />
                          <span>{req.mobileNumber}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-slate-500" />
                        <span>Submitted: {new Date(req.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>

                    {/* Step Approval Badges */}
                    <div className="flex flex-wrap gap-2 pt-1">
                      {/* Email Verification */}
                      <span className={`px-2.5 py-1 rounded-lg text-[11px] font-medium flex items-center gap-1 ${
                        req.emailVerified 
                          ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-800/80' 
                          : 'bg-amber-950/60 text-amber-300 border border-amber-800/80'
                      }`}>
                        {req.emailVerified ? <CheckCircle2 className="w-3 h-3 text-emerald-400" /> : <Clock className="w-3 h-3 text-amber-400" />}
                        Email: {req.emailVerified ? 'Verified' : 'Unverified'}
                      </span>

                      {/* Company Admin Badge */}
                      <span className={`px-2.5 py-1 rounded-lg text-[11px] font-medium flex items-center gap-1 ${
                        isAdminApproved 
                          ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-800/80' 
                          : 'bg-slate-950 text-slate-400 border border-slate-800'
                      }`}>
                        {isAdminApproved ? <CheckCircle2 className="w-3 h-3 text-emerald-400" /> : <Clock className="w-3 h-3 text-slate-500" />}
                        Admin Review: {isAdminApproved ? 'Approved' : 'Pending'}
                      </span>

                      {/* HR Badge */}
                      <span className={`px-2.5 py-1 rounded-lg text-[11px] font-medium flex items-center gap-1 ${
                        isHrApproved 
                          ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-800/80' 
                          : 'bg-slate-950 text-slate-400 border border-slate-800'
                      }`}>
                        {isHrApproved ? <CheckCircle2 className="w-3 h-3 text-emerald-400" /> : <Clock className="w-3 h-3 text-slate-500" />}
                        HR Review: {isHrApproved ? 'Approved' : 'Pending'}
                      </span>
                    </div>
                  </div>

                  {/* Right Column: Approval Action Buttons */}
                  {req.accountStatus !== 'REJECTED' && (
                    <div className="flex flex-wrap lg:flex-col gap-2 shrink-0">
                      {/* Admin Approve Button */}
                      {!isAdminApproved && (
                        <button
                          onClick={() => handleApproveAdmin(req)}
                          disabled={isProcessing}
                          className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold text-xs px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition shadow-sm"
                        >
                          {isProcessing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />}
                          <span>Approve as Admin</span>
                        </button>
                      )}

                      {/* HR Approve Button */}
                      {!isHrApproved && (
                        <button
                          onClick={() => handleApproveHR(req)}
                          disabled={isProcessing}
                          className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold text-xs px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition shadow-sm"
                        >
                          {isProcessing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserCheck className="w-3.5 h-3.5" />}
                          <span>Approve as HR</span>
                        </button>
                      )}

                      {/* Reject Application Button */}
                      <button
                        onClick={() => {
                          setRejectingRequest(req);
                          setRejectionReason('');
                        }}
                        disabled={isProcessing}
                        className="bg-rose-950/80 hover:bg-rose-900 border border-rose-800 text-rose-300 font-semibold text-xs px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        <span>Reject Application</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Rejection Reason Modal */}
      {rejectingRequest && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form
            onSubmit={handleConfirmRejection}
            className={`w-full max-w-md p-6 rounded-2xl border space-y-4 ${
              isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-rose-400 flex items-center gap-2">
                <XCircle className="w-5 h-5" />
                <span>Reject Application</span>
              </h3>
              <button
                type="button"
                onClick={() => setRejectingRequest(null)}
                className="text-slate-400 hover:text-white text-xs font-semibold"
              >
                Cancel
              </button>
            </div>

            <p className="text-xs text-slate-300">
              You are rejecting the user application for <strong>{rejectingRequest.fullName}</strong> ({rejectingRequest.email}). Please state the rejection reason below:
            </p>

            <div>
              <label className="text-xs font-medium text-slate-400 block mb-1">Rejection Reason *</label>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="e.g. Unverified employee credentials, incorrect department selection, or unauthorized company code."
                rows={3}
                required
                className={`w-full transition-colors duration-300 ${
                  isDark ? 'bg-slate-950 border-slate-800 text-white placeholder-slate-600' : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400'
                } rounded-xl p-3 text-xs focus:outline-none focus:border-rose-500`}
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setRejectingRequest(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={actionLoading === rejectingRequest.id || !rejectionReason.trim()}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white flex items-center gap-1.5"
              >
                {actionLoading === rejectingRequest.id && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Confirm Rejection</span>
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
