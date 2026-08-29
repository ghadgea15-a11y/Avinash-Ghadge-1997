import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, 
  Mail, 
  CheckCircle2, 
  Clock, 
  RefreshCw, 
  LogOut, 
  AlertTriangle, 
  Building2, 
  User, 
  Loader2, 
  Sparkles,
  Send,
  XCircle
} from 'lucide-react';
import { UserSession, AccountStatus, PhaseAScreen } from '../../types';
import { FirebaseAuthService } from '../../services/firebaseAuthService';
import { FirestoreService } from '../../services/firestoreService';
import { SessionManager } from '../../services/sessionManager';
import { AppLogo } from '../common/AppLogo';
import { useTheme } from '../../context/ThemeContext';

interface ApprovalPendingScreenProps {
  session: UserSession;
  onApprovalComplete: (updatedSession: UserSession) => void;
  onSignOut: () => void;
}

export const ApprovalPendingScreen: React.FC<ApprovalPendingScreenProps> = ({
  session,
  onApprovalComplete,
  onSignOut
}) => {
  const { isDark } = useTheme();

  const [loading, setLoading] = useState(false);
  const [resendingEmail, setResendingEmail] = useState(false);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Live status state
  const [emailVerified, setEmailVerified] = useState<boolean>(session.emailVerified ?? false);
  const [adminApproved, setAdminApproved] = useState<boolean>(session.companyAdminApproval === 'APPROVED');
  const [hrApproved, setHrApproved] = useState<boolean>(session.hrApproval === 'APPROVED');
  const [accountStatus, setAccountStatus] = useState<AccountStatus>(session.accountStatus || 'PENDING_APPROVAL');
  const [rejectionReason, setRejectionReason] = useState<string | null>(null);

  // 1. Live Firestore listener on user document
  useEffect(() => {
    const unsubscribe = FirestoreService.subscribeToUserStatus(session.userId, (userData) => {
      if (userData) {
        const isVerified = userData.emailVerified || (session.emailVerified ?? false);
        const adminStatus = userData.companyAdminApproval === 'APPROVED';
        const hrStatus = userData.hrApproval === 'APPROVED';
        const currentStatus = (userData.accountStatus as AccountStatus) || 'PENDING_APPROVAL';

        setEmailVerified(isVerified);
        setAdminApproved(adminStatus);
        setHrApproved(hrStatus);
        setAccountStatus(currentStatus);
        if (userData.rejectionReason) setRejectionReason(userData.rejectionReason);

        // Auto transition if ACTIVE
        if (currentStatus === 'ACTIVE' || (adminStatus && hrStatus && isVerified)) {
          const updatedSession: UserSession = {
            ...session,
            accountStatus: 'ACTIVE',
            emailVerified: true,
            role: userData.role || session.role || 'EMPLOYEE',
            companyAdminApproval: 'APPROVED',
            hrApproval: 'APPROVED'
          };
          SessionManager.setUserSession(updatedSession);
          onApprovalComplete(updatedSession);
        }
      }
    });

    return () => unsubscribe();
  }, [session.userId]);

  // 2. Manual Refresh / Reload user status
  const handleCheckStatus = async () => {
    setLoading(true);
    setInfoMessage(null);
    setErrorMessage(null);

    try {
      const res = await FirebaseAuthService.reloadUserAndCheckStatus(session.userId);
      setEmailVerified(res.emailVerified);
      setAccountStatus(res.accountStatus);

      if (res.userData) {
        setAdminApproved(res.userData.companyAdminApproval === 'APPROVED');
        setHrApproved(res.userData.hrApproval === 'APPROVED');
        if (res.userData.rejectionReason) setRejectionReason(res.userData.rejectionReason);
      }

      if (res.accountStatus === 'ACTIVE') {
        setInfoMessage('Account Approved! Transitioning to enterprise portal...');
        setTimeout(() => {
          const updatedSession: UserSession = {
            ...session,
            accountStatus: 'ACTIVE',
            emailVerified: true,
            role: res.userData?.role || 'EMPLOYEE',
            companyAdminApproval: 'APPROVED',
            hrApproval: 'APPROVED'
          };
          SessionManager.setUserSession(updatedSession);
          onApprovalComplete(updatedSession);
        }, 1200);
      } else {
        setInfoMessage('Account status checked. Application is still pending approval.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to check status. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // 3. Resend Verification Email
  const handleResendVerification = async () => {
    setResendingEmail(true);
    setInfoMessage(null);
    setErrorMessage(null);

    try {
      const msg = await FirebaseAuthService.resendVerificationEmail();
      setInfoMessage(msg);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to resend verification email.');
    } finally {
      setResendingEmail(false);
    }
  };

  return (
    <div className={`min-h-screen transition-colors duration-300 ${isDark ? 'bg-slate-950 text-slate-100' : 'bg-white text-black'} p-4 md:p-8 flex flex-col justify-between max-w-2xl mx-auto w-full`}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <AppLogo size="sm" showSubtitle={false} />
          <button
            onClick={onSignOut}
            className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border transition ${
              isDark ? 'border-slate-800 hover:bg-slate-900 text-slate-300' : 'border-slate-200 hover:bg-slate-100 text-slate-900'
            }`}
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>

        {/* Account Status Hero Card */}
        {accountStatus === 'REJECTED' ? (
          <div className="p-5 bg-rose-950/60 border border-rose-800 rounded-2xl space-y-3">
            <div className="flex items-center gap-2 text-rose-400 font-bold text-base">
              <XCircle className="w-6 h-6 text-rose-500" />
              <span>Application Decision: Rejected</span>
            </div>
            <p className="text-xs text-rose-200 leading-relaxed">
              Your registration application was reviewed and rejected by the company administration.
            </p>
            {rejectionReason && (
              <div className="p-3 bg-rose-900/40 border border-rose-800/80 rounded-xl text-xs text-rose-300">
                <strong>Reason:</strong> {rejectionReason}
              </div>
            )}
            <p className="text-[11px] text-rose-400">
              Please contact your company HR or administrator to resolve access requirements.
            </p>
          </div>
        ) : (
          <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                <Clock className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Account Approval Pending</h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Welcome <strong>{session.fullName}</strong>. Your account registration is under active security review.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs pt-2">
              <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800/80">
                <span className="text-slate-500 dark:text-slate-400 text-[10px] uppercase font-mono block">Registered Email</span>
                <span className="font-semibold text-white font-mono">{session.email}</span>
              </div>
              <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800/80">
                <span className="text-slate-500 dark:text-slate-400 text-[10px] uppercase font-mono block">Company Code</span>
                <span className="font-semibold text-white font-mono">{session.companyId}</span>
              </div>
            </div>
          </div>
        )}

        {/* Verification Checkpoints */}
        {accountStatus !== 'REJECTED' && (
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Verification & Approval Workflow
            </h3>

            {/* Checkpoint 1: Email Verification */}
            <div className={`p-4 rounded-xl border flex items-center justify-between ${
              emailVerified 
                ? 'bg-emerald-950/30 border-emerald-800/60 text-emerald-300' 
                : 'bg-amber-950/30 border-amber-800/60 text-amber-300'
            }`}>
              <div className="flex items-center gap-3">
                <Mail className="w-5 h-5 shrink-0" />
                <div>
                  <p className="font-semibold text-xs">Step 1: Email Verification</p>
                  <p className="text-[11px] opacity-80">
                    {emailVerified 
                      ? 'Your email address has been verified successfully.' 
                      : 'A verification link was sent to your email address.'}
                  </p>
                </div>
              </div>
              <div>
                {emailVerified ? (
                  <span className="px-2.5 py-1 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold rounded-full flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> VERIFIED
                  </span>
                ) : (
                  <button
                    onClick={handleResendVerification}
                    disabled={resendingEmail}
                    className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white font-semibold text-[11px] rounded-lg flex items-center gap-1 transition"
                  >
                    {resendingEmail ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                    <span>Resend Link</span>
                  </button>
                )}
              </div>
            </div>

            {/* Checkpoint 2: Company Admin Approval */}
            <div className={`p-4 rounded-xl border flex items-center justify-between ${
              adminApproved 
                ? 'bg-emerald-950/30 border-emerald-800/60 text-emerald-300' 
                : 'bg-slate-900 border-slate-800 text-slate-300'
            }`}>
              <div className="flex items-center gap-3">
                <Building2 className="w-5 h-5 shrink-0" />
                <div>
                  <p className="font-semibold text-xs">Step 2: Company Administrator Review</p>
                  <p className="text-[11px] opacity-80">
                    {adminApproved 
                      ? 'Company Admin has approved your workstation access.' 
                      : 'Awaiting Company Admin review.'}
                  </p>
                </div>
              </div>
              <span className={`px-2.5 py-1 text-[10px] font-bold rounded-full flex items-center gap-1 ${
                adminApproved 
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                  : 'bg-slate-800 text-slate-400 border border-slate-700'
              }`}>
                {adminApproved ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                {adminApproved ? 'APPROVED' : 'PENDING'}
              </span>
            </div>

            {/* Checkpoint 3: HR Department Approval */}
            <div className={`p-4 rounded-xl border flex items-center justify-between ${
              hrApproved 
                ? 'bg-emerald-950/30 border-emerald-800/60 text-emerald-300' 
                : 'bg-slate-900 border-slate-800 text-slate-300'
            }`}>
              <div className="flex items-center gap-3">
                <User className="w-5 h-5 shrink-0" />
                <div>
                  <p className="font-semibold text-xs">Step 3: HR Approval & Department Role</p>
                  <p className="text-[11px] opacity-80">
                    {hrApproved 
                      ? 'HR Manager has approved your profile and assigned department.' 
                      : 'Awaiting HR Manager approval.'}
                  </p>
                </div>
              </div>
              <span className={`px-2.5 py-1 text-[10px] font-bold rounded-full flex items-center gap-1 ${
                hrApproved 
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                  : 'bg-slate-800 text-slate-400 border border-slate-700'
              }`}>
                {hrApproved ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                {hrApproved ? 'APPROVED' : 'PENDING'}
              </span>
            </div>
          </div>
        )}

        {/* Action Feedbacks */}
        {infoMessage && (
          <div className="p-3 bg-indigo-950/80 border border-indigo-800 rounded-xl text-xs text-indigo-300 flex items-start gap-2">
            <Sparkles className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
            <span>{infoMessage}</span>
          </div>
        )}

        {errorMessage && (
          <div className="p-3 bg-rose-950/80 border border-rose-800 rounded-xl text-xs text-rose-300 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Manual Refresh Action */}
        <div className="pt-2">
          <button
            onClick={handleCheckStatus}
            disabled={loading}
            className="w-full bg-slate-900 hover:bg-slate-800 border border-slate-800 text-white font-semibold py-3 px-4 rounded-xl flex items-center justify-center gap-2 text-xs transition"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
            ) : (
              <RefreshCw className="w-4 h-4 text-indigo-400" />
            )}
            <span>Check Approval Status</span>
          </button>
        </div>
      </div>

      <div className="text-center pt-8 text-[11px] text-slate-500 dark:text-slate-400">
        Log Sheet Muster Enterprise System • Multi-Tenant Firestore Security
      </div>
    </div>
  );
};
