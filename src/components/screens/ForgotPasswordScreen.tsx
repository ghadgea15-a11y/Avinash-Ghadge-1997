import React, { useState, useEffect } from 'react';
import { Mail, KeyRound, ArrowLeft, Send, CheckCircle2, AlertCircle, Loader2, Clock } from 'lucide-react';
import { CompanyTenant, PhaseAScreen } from '../../types';
import { FirebaseAuthService } from '../../services/firebaseAuthService';

interface ForgotPasswordScreenProps {
  activeCompany: CompanyTenant | null;
  onNavigate: (screen: PhaseAScreen) => void;
}

export const ForgotPasswordScreen: React.FC<ForgotPasswordScreenProps> = ({
  activeCompany,
  onNavigate
}) => {
  const [emailOrId, setEmailOrId] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);

  useEffect(() => {
    if (cooldownSeconds > 0) {
      const timer = setInterval(() => {
        setCooldownSeconds(prev => prev - 1);
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [cooldownSeconds]);

  const handleResetRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailOrId.trim()) {
      setError('Please enter your registered Email address or Employee ID.');
      return;
    }

    if (cooldownSeconds > 0) {
      setError(`Please wait ${cooldownSeconds}s before requesting another reset code.`);
      return;
    }

    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const result = await FirebaseAuthService.requestPasswordReset(
        activeCompany?.companyId || '',
        emailOrId.trim()
      );
      setMessage(result);
      setCooldownSeconds(60);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to send reset request. Please check your internet connection.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 bg-slate-950 text-slate-100 flex flex-col justify-between p-6">
      <div className="space-y-6">
        {/* Header */}
        <div className="pt-2">
          <button
            onClick={() => onNavigate('LOGIN')}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white mb-4 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Login</span>
          </button>

          <div className="w-14 h-14 rounded-2xl bg-indigo-950 border border-indigo-800 text-indigo-400 flex items-center justify-center mb-3 shadow-lg">
            <KeyRound className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-bold text-white">Reset Security PIN / Password</h2>
          <p className="text-xs text-slate-400 mt-1">
            Instructions will be sent to your registered email or SMS endpoint
          </p>
        </div>

        {activeCompany && (
          <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl text-xs text-slate-300">
            <span className="text-slate-400">Target Tenant:</span>{' '}
            <span className="font-bold text-white">{activeCompany.brandName}</span>{' '}
            <span className="font-mono text-indigo-400">({activeCompany.companyId})</span>
          </div>
        )}

        <form onSubmit={handleResetRequest} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">
              Registered Email or Guard Employee ID
            </label>
            <div className="relative">
              <input
                type="text"
                value={emailOrId}
                onChange={(e) => setEmailOrId(e.target.value)}
                placeholder="e.g. guard@apexsecurity.com or EMP-G-8821"
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 font-mono"
              />
              <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            </div>
          </div>

          {message && (
            <div className="p-3 bg-emerald-950/80 border border-emerald-800 rounded-xl text-xs text-emerald-300 flex items-start gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
              <span>{message}</span>
            </div>
          )}

          {error && (
            <div className="p-3 bg-rose-950/80 border border-rose-800 rounded-xl text-xs text-rose-300 flex items-start gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-400 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || cooldownSeconds > 0}
            className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold py-3 px-4 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 transition text-sm"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Sending Reset Link...</span>
              </>
            ) : cooldownSeconds > 0 ? (
              <>
                <Clock className="w-4 h-4 text-amber-400" />
                <span>Resend available in {cooldownSeconds}s</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>Send Reset Request</span>
              </>
            )}
          </button>
        </form>
      </div>

      <div className="text-center pt-6 border-t border-slate-900">
        <p className="text-xs text-slate-500">
          Need immediate help? Contact your Control Room or HR Desk.
        </p>
      </div>
    </div>
  );
};
