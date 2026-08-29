import React, { useState } from 'react';
import { UserSession } from '../../types';
import { ShieldCheck, Lock, Unlock, AlertCircle, RefreshCw, Key, ShieldAlert } from 'lucide-react';
import { AccountProtectionService } from '../../services/accountProtectionService';
import { SessionSecurityService } from '../../services/sessionSecurityService';

interface AccountProtectionViewerProps {
  userSession: UserSession;
}

export const AccountProtectionViewer: React.FC<AccountProtectionViewerProps> = ({ userSession }) => {
  const [lookupEmail, setLookupEmail] = useState('');
  const [lockStatus, setLockStatus] = useState<{ locked: boolean; remainingMinutes?: number; reason?: string } | null>(null);
  const [checking, setChecking] = useState(false);
  const [unlockMessage, setUnlockMessage] = useState<string | null>(null);

  const handleCheckLock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lookupEmail.trim()) return;
    setChecking(true);
    setUnlockMessage(null);
    try {
      const res = await AccountProtectionService.isAccountLocked(userSession.companyId, lookupEmail.trim());
      setLockStatus(res);
    } catch {
      setLockStatus({ locked: false });
    } finally {
      setChecking(false);
    }
  };

  const handleUnlock = async () => {
    if (!lookupEmail.trim()) return;
    setChecking(true);
    try {
      await AccountProtectionService.recordSuccessfulLogin(userSession.companyId, lookupEmail.trim());
      setLockStatus({ locked: false });
      setUnlockMessage(`Account locks and failed login attempts successfully reset for ${lookupEmail.trim()}.`);
    } catch (err: any) {
      setUnlockMessage(`Failed to unlock account: ${err.message}`);
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="space-y-6" id="account-protection-viewer">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-gray-200 shadow-sm flex items-start space-x-4">
          <div className="p-3 bg-indigo-50 rounded-lg text-indigo-600">
            <Lock className="w-6 h-6" />
          </div>
          <div>
            <div className="text-sm font-medium text-gray-500">Lockout Policy</div>
            <div className="text-lg font-bold text-gray-900">5 Attempts / 15 Min</div>
            <div className="text-xs text-gray-500 mt-1">Automatic progressive rate-limiting</div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-gray-200 shadow-sm flex items-start space-x-4">
          <div className="p-3 bg-emerald-50 rounded-lg text-emerald-600">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="text-sm font-medium text-gray-500">Session Validation</div>
            <div className="text-lg font-bold text-emerald-700">Authoritative Active</div>
            <div className="text-xs text-gray-500 mt-1">Firestore token & role reconciliation</div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-gray-200 shadow-sm flex items-start space-x-4">
          <div className="p-3 bg-amber-50 rounded-lg text-amber-600">
            <Key className="w-6 h-6" />
          </div>
          <div>
            <div className="text-sm font-medium text-gray-500">Privileged Guard</div>
            <div className="text-lg font-bold text-amber-700">Zero-Trust Active</div>
            <div className="text-xs text-gray-500 mt-1">Step-up verification on 8 core actions</div>
          </div>
        </div>
      </div>

      {/* Account Lock Inspector & Resolution */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-gray-200 shadow-sm space-y-4">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-indigo-600" />
          <h3 className="text-lg font-bold text-gray-900">Account Lock & Rate-Limit Inspector</h3>
        </div>
        <p className="text-sm text-gray-600">
          Inspect and unlock user accounts locked out due to repeated invalid credential attempts or suspicious activity.
        </p>

        <form onSubmit={handleCheckLock} className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            placeholder="Enter user email or Employee ID..."
            value={lookupEmail}
            onChange={(e) => setLookupEmail(e.target.value)}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
          <button
            type="submit"
            disabled={checking || !lookupEmail.trim()}
            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {checking ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
            Check Status
          </button>
        </form>

        {lockStatus && (
          <div className={`p-4 rounded-lg border text-sm mt-4 ${lockStatus.locked ? 'bg-red-50 border-red-200 text-red-800' : 'bg-emerald-50 border-emerald-200 text-emerald-800'}`}>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                {lockStatus.locked ? <AlertCircle className="w-5 h-5 text-red-600" /> : <ShieldCheck className="w-5 h-5 text-emerald-600" />}
                <span className="font-semibold">
                  {lockStatus.locked ? `Account Locked (${lockStatus.remainingMinutes}m remaining)` : 'Account is Unlocked & Good Standing'}
                </span>
              </div>
              {lockStatus.locked && (userSession.role === 'SUPER_ADMIN' || userSession.role === 'COMPANY_ADMIN' || userSession.role === 'HR_ADMIN') && (
                <button
                  type="button"
                  onClick={handleUnlock}
                  disabled={checking}
                  className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded shadow-sm flex items-center gap-1.5 transition"
                >
                  <Unlock className="w-3.5 h-3.5" />
                  Unlock Account
                </button>
              )}
            </div>
            {lockStatus.reason && <p className="mt-2 text-xs opacity-90">{lockStatus.reason}</p>}
          </div>
        )}

        {unlockMessage && (
          <div className="p-3 bg-blue-50 border border-blue-200 text-blue-800 rounded-lg text-sm">
            {unlockMessage}
          </div>
        )}
      </div>
    </div>
  );
};
