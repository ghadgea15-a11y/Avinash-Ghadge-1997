import React, { useState } from 'react';
import { Lock, ShieldCheck, KeyRound, AlertCircle, ArrowRight } from 'lucide-react';
import { UserSession, CompanyTenant } from '../../types';
import { SessionManager } from '../../services/sessionManager';
import { FirebaseAuthService } from '../../services/firebaseAuthService';

interface SessionLockScreenProps {
  userSession: UserSession;
  activeCompany: CompanyTenant | null;
  onUnlockSuccess: () => void;
  onSwitchAccount: () => void;
}

export const SessionLockScreen: React.FC<SessionLockScreenProps> = ({
  userSession,
  activeCompany,
  onUnlockSuccess,
  onSwitchAccount
}) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleUnlockWithPin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pin) {
      setError('Please enter your 4-digit PIN');
      return;
    }

    setIsLoading(true);
    try {
      const isValid = await FirebaseAuthService.verifyPin(activeCompany?.companyId || userSession.companyId, userSession.employeeId, pin);
      if (isValid) {
        SessionManager.updateLastActive();
        onUnlockSuccess();
      } else {
        setError('Incorrect security PIN. Please try again.');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex-1 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-100 flex flex-col justify-between p-6 relative select-none">
      <div className="space-y-6 pt-4 text-center">
        {/* Lock Icon Banner */}
        <div className="relative w-20 h-20 mx-auto">
          <img
            src={userSession.avatarUrl || undefined}
            alt="User Avatar"
            className="w-20 h-20 rounded-full border-2 border-indigo-500 object-cover shadow-2xl"
          />
          <div className="absolute -bottom-1 -right-1 bg-amber-500 text-slate-950 p-1.5 rounded-full border-2 border-slate-950 shadow-md">
            <Lock className="w-3.5 h-3.5 font-bold" />
          </div>
        </div>

        <div>
          <h2 className="text-xl font-bold text-white">{userSession.fullName}</h2>
          <p className="text-xs text-indigo-400 font-mono mt-0.5">{userSession.employeeId} • {userSession.role}</p>
          {activeCompany && (
            <p className="text-[11px] text-slate-400 mt-1">
              {activeCompany.brandName} ({activeCompany.companyId})
            </p>
          )}
        </div>

        <div className="p-3 bg-amber-950/40 border border-amber-800/60 rounded-2xl text-xs text-amber-300 flex items-center justify-center gap-2">
          <Lock className="w-4 h-4 text-amber-400 shrink-0" />
          <span>Session Locked due to idle security timeout</span>
        </div>

        {/* PIN Input Form */}
        <form onSubmit={handleUnlockWithPin} className="space-y-3 max-w-xs mx-auto">
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">
              Enter 4-Digit Security PIN
            </label>
            <input
              type="password"
              value={pin}
              onChange={(e) => {
                setPin(e.target.value);
                setError(null);
              }}
              maxLength={6}
              placeholder="••••"
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-center text-lg font-mono text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 tracking-widest"
            />
          </div>

          {error && (
            <div className="p-2.5 bg-rose-950/80 border border-rose-800 rounded-xl text-xs text-rose-300 flex items-center justify-center gap-1.5 animate-in fade-in">
              <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          <div className="pt-2">
            <button
              type="submit" disabled={isLoading}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2.5 px-3 rounded-xl flex items-center justify-center gap-1.5 text-xs shadow-lg shadow-indigo-600/30 transition"
            >
              {isLoading ? <span>Verifying...</span> : <span>Unlock Account</span>}
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </form>
      </div>

      <div className="text-center pt-6 border-t border-slate-900">
        <button
          onClick={onSwitchAccount}
          className="text-xs text-slate-400 hover:text-rose-400 transition font-medium"
        >
          Sign Out & Switch Employee Account
        </button>
      </div>
    </div>
  );
};
