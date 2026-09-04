import React, { useState } from 'react';
import { useBackNavigation } from '../../hooks/useBackNavigation';
import { 
  ShieldCheck, 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  ArrowRight, 
  Loader2, 
  AlertCircle,
  QrCode,
  Building2
} from 'lucide-react';
import { setDoc, doc } from 'firebase/firestore';
import { db } from '../../firebase';
import { TotpService } from '../../services/totpService';
import { UserSession, PhaseAScreen } from '../../types';
import { FirebaseAuthService } from '../../services/firebaseAuthService';
import { SessionManager } from '../../services/sessionManager';
import { AppLogo } from '../common/AppLogo';

interface PlatformLoginScreenProps {
  onLoginSuccess: (session: UserSession) => void;
  onNavigate: (screen: PhaseAScreen) => void;
}

export const PlatformLoginScreen: React.FC<PlatformLoginScreenProps> = ({
  onLoginSuccess,
  onNavigate,
}) => {
  const [step, setStep] = useState<'CREDENTIALS' | 'MFA' | 'MFA_ENROLL'>('CREDENTIALS');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // MFA States
  const [mfaSetupData, setMfaSetupData] = useState<any | null>(null);
  const [enrollSession, setEnrollSession] = useState<any | null>(null);
  const [mfaResolver, setMfaResolver] = useState<any | null>(null);
  const [mfaCode, setMfaCode] = useState('');
  const [mfaError, setMfaError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError('Credentials required.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Platform Admins always authenticate against GLOBAL_ADMIN
      const session = await FirebaseAuthService.authenticateUser({
        companyId: 'GLOBAL_ADMIN',
        emailOrId: email.trim(),
        passwordOrPin: password,
        isPinMode: false
      });
      
      // Verify role
      if (session.role !== 'SUPER_ADMIN') {
        throw new Error('This portal is restricted to Platform Owners.');
      }

      SessionManager.clearActiveCompany();
      SessionManager.setUserSession(session);
      onLoginSuccess(session);
    } catch (err: any) {
      if (err.message === 'MFA_ENROLLMENT_REQUIRED') {
        const setup = await TotpService.createMfaSetup({
          accountName: email.trim(),
          issuer: 'Log Sheet Muster (Platform)'
        });
        setMfaSetupData(setup);
        setEnrollSession(err.resolver.tempSession);
        setStep('MFA_ENROLL');
        return;
      }
      if (err.message === 'MFA_REQUIRED') {
        setMfaResolver(err.resolver);
        setStep('MFA');
        return;
      }
      setError(err.message || 'Authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleMfaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMfaError(null);

    try {
      const session = await FirebaseAuthService.authenticateWithMfa(
        mfaResolver,
        mfaCode,
        'GLOBAL_ADMIN',
        email.trim()
      );

      if (session.role !== 'SUPER_ADMIN') {
        throw new Error('Restricted to Platform Owners.');
      }

      SessionManager.clearActiveCompany();
      SessionManager.setUserSession(session);
      onLoginSuccess(session);
    } catch (err: any) {
      setMfaError(err.message || 'MFA failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleMfaEnrollSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMfaError(null);
    try {
      const cleanCode = mfaCode.replace(/[^0-9A-Z]/gi, '').toUpperCase();
      const verifyResult = await TotpService.verifyCode(cleanCode, mfaSetupData.secret, 2);
      if (!verifyResult.isValid) throw new Error(verifyResult.error || 'Invalid code.');
      
      const uid = enrollSession.userId;
      await setDoc(doc(db, 'users', uid, 'private', 'mfa'), {
        totpSecret: mfaSetupData.secret,
        backupCodes: mfaSetupData.backupCodes,
        lastUsedToken: cleanCode,
        lastUsedAt: Date.now(),
        updatedAt: new Date().toISOString()
      }, { merge: true });
      
      try {
        await setDoc(doc(db, 'totp_secrets', uid), {
          totpSecret: mfaSetupData.secret,
          backupCodes: mfaSetupData.backupCodes,
          lastUsedAt: Date.now(),
          updatedAt: new Date().toISOString()
        }, { merge: true });
      } catch (totpErr) {
        console.warn('totp_secrets write notice:', totpErr);
      }

      await setDoc(doc(db, 'users', uid), {
        mfaEnabled: true,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      SessionManager.clearActiveCompany();
      SessionManager.setUserSession(enrollSession);
      onLoginSuccess(enrollSession);
    } catch (err: any) {
      setMfaError(err.message || 'Enrollment failed.');
    } finally {
      setLoading(false);
    }
  };

  if (step === 'MFA_ENROLL') {
    return (
      <div className="flex-1 bg-white flex flex-col justify-center px-6">
        <div className="w-full max-w-sm mx-auto space-y-6">
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-amber-50 text-amber-600 mb-2">
              <QrCode className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold text-black">Platform MFA Setup</h2>
            <p className="text-sm text-slate-600">Scan code with Authenticator app.</p>
          </div>
          {mfaSetupData && (
            <div className="flex flex-col items-center justify-center p-4 bg-slate-50 rounded-xl">
              <img src={mfaSetupData.qrCodeDataUrl} alt="QR" className="w-48 h-48" />
            </div>
          )}
          <form onSubmit={handleMfaEnrollSubmit} className="space-y-4">
            <input
              type="text"
              value={mfaCode}
              onChange={(e) => setMfaCode(e.target.value.replace(/[^0-9]/g, ''))}
              maxLength={6}
              placeholder="000000"
              className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 text-center text-3xl tracking-widest focus:border-amber-600 outline-none font-mono"
            />
            {mfaError && <div className="text-xs text-red-600 text-center">{mfaError}</div>}
            <button
              type="submit"
              disabled={loading || mfaCode.length < 6}
              className="w-full font-bold py-3 px-4 rounded-xl bg-amber-600 hover:bg-amber-700 text-white transition disabled:opacity-50"
            >
              Verify & Enable
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (step === 'MFA') {
    return (
      <div className="flex-1 bg-white flex flex-col justify-center px-6">
        <div className="w-full max-w-sm mx-auto space-y-6">
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-amber-50 text-amber-600 mb-2">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold text-black">Platform Verification</h2>
            <p className="text-sm text-slate-600">Enter your 6-digit MFA code.</p>
          </div>
          <form onSubmit={handleMfaSubmit} className="space-y-4">
            <input
              type="text"
              value={mfaCode}
              onChange={(e) => setMfaCode(e.target.value.replace(/[^0-9]/g, ''))}
              maxLength={6}
              placeholder="000000"
              className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 text-center text-3xl tracking-widest focus:border-amber-600 outline-none font-mono"
            />
            {mfaError && <div className="text-xs text-red-600 text-center">{mfaError}</div>}
            <button
              type="submit"
              disabled={loading || mfaCode.length < 6}
              className="w-full font-bold py-3 px-4 rounded-xl bg-amber-600 hover:bg-amber-700 text-white transition disabled:opacity-50"
            >
              Verify Identity
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-white flex flex-col justify-center px-6 min-h-screen">
      <div className="w-full max-w-md mx-auto space-y-8">
        <div className="flex flex-col items-center text-center">
          <AppLogo size="xl" showSubtitle={false} variant="full" />
          <div className="mt-6 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-xs font-bold uppercase tracking-wider">
            <ShieldCheck className="w-3.5 h-3.5" />
            Platform Owner Portal
          </div>
        </div>

        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-black text-black tracking-tight">Super Admin Login</h1>
          <p className="text-slate-500 text-sm font-medium">Restricted access for authorized platform personnel only.</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-900 uppercase tracking-wide">Administrator Email</label>
            <div className="relative">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@logsheetmuster.online"
                className="w-full h-12 border-2 border-slate-100 rounded-xl px-11 text-sm font-medium focus:border-amber-600 focus:bg-white bg-slate-50 outline-none transition-all"
              />
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400" />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-900 uppercase tracking-wide">Master Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full h-12 border-2 border-slate-100 rounded-xl px-11 text-sm font-medium focus:border-amber-600 focus:bg-white bg-slate-50 outline-none transition-all tracking-widest"
              />
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400" />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
              >
                {showPassword ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
              </button>
            </div>
          </div>

          {error && (
            <div className="p-4 bg-red-50 border border-red-100 rounded-xl flex items-start gap-3 animate-in fade-in zoom-in duration-200">
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <p className="text-xs font-bold text-red-700 leading-relaxed">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full h-13 bg-black hover:bg-slate-900 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-slate-200 disabled:opacity-50 disabled:cursor-not-allowed group"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <span>Enter Admin Console</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </button>
        </form>

        <div className="pt-4 border-t border-slate-100 flex flex-col items-center gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => onNavigate('LOGIN')}
              className="text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors uppercase tracking-wider flex items-center gap-1.5"
            >
              <Building2 className="w-3.5 h-3.5" />
              Customer / Tenant Login
            </button>
            <span className="text-slate-300">•</span>
            <button
              onClick={() => onNavigate('LANDING')}
              className="text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors uppercase tracking-wider"
            >
              Public Site
            </button>
          </div>
          
          <p className="text-[11px] text-slate-300 font-medium max-w-[240px] text-center leading-relaxed">
            All access attempts are monitored and logged. Unauthorized access is prohibited.
          </p>
        </div>
      </div>
    </div>
  );
};
