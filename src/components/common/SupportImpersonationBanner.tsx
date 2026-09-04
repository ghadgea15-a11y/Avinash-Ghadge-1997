import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, 
  Clock, 
  LogOut, 
  KeyRound, 
  Building2, 
  AlertTriangle,
  ExternalLink
} from 'lucide-react';
import { SessionManager, SupportImpersonationContext } from '../../services/sessionManager';
import { SuperAdminService } from '../../services/superAdminService';
import { UserSession, PhaseAScreen } from '../../types';

interface SupportImpersonationBannerProps {
  userSession: UserSession | null;
  onExit: () => void;
  onNavigate?: (screen: PhaseAScreen) => void;
}

export const SupportImpersonationBanner: React.FC<SupportImpersonationBannerProps> = ({
  userSession,
  onExit,
  onNavigate
}) => {
  const [impersonation, setImpersonation] = useState<SupportImpersonationContext | null>(
    SessionManager.getSupportImpersonation()
  );
  const [remainingSeconds, setRemainingSeconds] = useState<number>(0);
  const [isEnding, setIsEnding] = useState<boolean>(false);

  useEffect(() => {
    // Check initial status
    const current = SessionManager.getSupportImpersonation();
    setImpersonation(current);

    if (!current) return;

    const updateCountdown = async () => {
      const now = Date.now();
      const diff = Math.floor((current.expiresAt - now) / 1000);

      if (diff <= 0) {
        setRemainingSeconds(0);
        // Automatically validate & expire in Firestore + log audit event
        try {
          await SuperAdminService.validateSupportAccessToken(current.token || current.sessionId);
        } catch {
          // benign
        }
        SessionManager.clearSupportImpersonation();
        setImpersonation(null);
        onExit();
      } else {
        setRemainingSeconds(diff);
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [onExit]);

  if (!impersonation) {
    return null;
  }

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleExitSession = async () => {
    setIsEnding(true);
    try {
      if (userSession && impersonation) {
        await SuperAdminService.endSupportImpersonation(
          userSession,
          impersonation.token || impersonation.sessionId,
          'Super Admin exited controlled support session via top bar'
        );
      }
    } catch (err) {
      console.warn('[SupportImpersonationBanner] error ending session:', err);
    } finally {
      SessionManager.clearSupportImpersonation();
      setImpersonation(null);
      setIsEnding(false);
      onExit();
    }
  };

  const isUrgent = remainingSeconds < 120; // less than 2 minutes

  return (
    <div 
      id="support-impersonation-top-banner"
      className={`w-full z-50 text-xs px-3 py-2 border-b flex flex-wrap items-center justify-between gap-2 shadow-md transition-colors ${
        isUrgent 
          ? 'bg-rose-950 border-rose-800 text-rose-100 animate-pulse' 
          : 'bg-amber-500/15 dark:bg-amber-950/70 border-amber-500/40 text-amber-900 dark:text-amber-200'
      }`}
    >
      <div className="flex items-center flex-wrap gap-2.5">
        <span className="flex items-center gap-1.5 font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-500/20 dark:bg-amber-500/30 border border-amber-500/40 text-amber-700 dark:text-amber-300">
          <ShieldAlert className="w-3.5 h-3.5" />
          Controlled Support Access
        </span>

        <div className="flex items-center gap-1.5 font-medium">
          <Building2 className="w-3.5 h-3.5 opacity-70" />
          <span>Impersonating:</span>
          <span className="font-bold underline decoration-amber-500">
            {impersonation.targetCompanyName || impersonation.targetCompanyId}
          </span>
          <span className="opacity-60 font-mono text-[10px]">({impersonation.targetCompanyId})</span>
        </div>

        <div className="hidden sm:flex items-center gap-1.5 font-mono text-[11px] opacity-75">
          <KeyRound className="w-3 h-3" />
          <span>{impersonation.token || impersonation.sessionId}</span>
        </div>

        <span className="hidden md:inline-block px-1.5 py-0.2 rounded text-[10px] font-semibold bg-slate-900/10 dark:bg-slate-100/10 border border-slate-500/20">
          Scope: {impersonation.scope}
        </span>
      </div>

      <div className="flex items-center gap-3">
        <div className={`flex items-center gap-1.5 font-mono font-bold px-2 py-0.5 rounded ${
          isUrgent ? 'bg-rose-500 text-white' : 'bg-amber-500/20 dark:bg-amber-500/30 text-amber-900 dark:text-amber-200'
        }`}>
          <Clock className="w-3.5 h-3.5" />
          <span>Expires in: {formatTime(remainingSeconds)}</span>
        </div>

        <button
          id="exit-support-session-btn"
          onClick={handleExitSession}
          disabled={isEnding}
          className="flex items-center gap-1 px-2.5 py-1 rounded-lg font-bold text-[11px] bg-rose-600 hover:bg-rose-700 text-white shadow-sm transition disabled:opacity-50 cursor-pointer"
        >
          <LogOut className="w-3 h-3" />
          <span>{isEnding ? 'Terminating...' : 'Exit Support Session'}</span>
        </button>
      </div>
    </div>
  );
};
