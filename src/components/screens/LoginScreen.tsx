import React, { useState } from 'react';
import { 
  Building2, 
  Lock, 
  Mail, 
  KeyRound, 
  Eye, 
  EyeOff, 
  Fingerprint, 
  ArrowRight, 
  Loader2, 
  AlertCircle, 
  User, 
  ShieldCheck,
  RefreshCw
} from 'lucide-react';
import { CompanyTenant, UserSession, UserRole, PhaseAScreen } from '../../types';
import { FirebaseAuthService } from '../../services/firebaseAuthService';
import { SessionManager } from '../../services/sessionManager';
import { BiometricPromptModal } from '../common/BiometricPromptModal';
import { AppLogo } from '../common/AppLogo';
import { useTheme } from '../../context/ThemeContext';

interface LoginScreenProps {
  activeCompany: CompanyTenant;
  onLoginSuccess: (session: UserSession) => void;
  onNavigate: (screen: PhaseAScreen) => void;
  onChangeCompany: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  activeCompany,
  onLoginSuccess,
  onNavigate,
  onChangeCompany
}) => {
  const { isDark } = useTheme();
  const [loginMode, setLoginMode] = useState<'PIN' | 'PASSWORD' | 'SUPER_ADMIN'>('PASSWORD');
  const [emailOrId, setEmailOrId] = useState('');
  const [passwordOrPin, setPasswordOrPin] = useState('');
  const [showSecret, setShowSecret] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isBiometricOpen, setIsBiometricOpen] = useState(false);

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (loginMode === 'SUPER_ADMIN') {
      const adminEmail = emailOrId.trim() || 'ghadgea15@gmail.com';
      if (!passwordOrPin) {
        setError('Please enter your Super Admin password.');
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const session = await FirebaseAuthService.authenticateUser({
          companyId: 'SYSTEM_SUPER_ADMIN',
          emailOrId: adminEmail,
          passwordOrPin,
          isPinMode: false
        });
        SessionManager.setUserSession(session);
        SessionManager.setSavedCredentials(adminEmail, rememberMe);
        onLoginSuccess(session);
      } catch (err: any) {
        setError(err.message || 'Super Admin authentication failed.');
      } finally {
        setLoading(false);
      }
      return;
    }

    if (!emailOrId.trim()) {
      setError(loginMode === 'PIN' ? 'Please enter your Employee ID.' : 'Please enter your Email address.');
      return;
    }
    if (!passwordOrPin) {
      setError(loginMode === 'PIN' ? 'Please enter your PIN.' : 'Please enter your Password.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const session = await FirebaseAuthService.authenticateUser({
        companyId: activeCompany.companyId,
        emailOrId: emailOrId.trim(),
        passwordOrPin: passwordOrPin,
        isPinMode: loginMode === 'PIN'
      });

      SessionManager.setUserSession(session);
      SessionManager.setSavedCredentials(emailOrId.trim(), rememberMe);
      onLoginSuccess(session);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Authentication failed. Please verify your credentials and try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    setError(null);
    try {
      const res = await FirebaseAuthService.signInWithGoogle();
      if (res.userSession) {
        SessionManager.setUserSession(res.userSession);
        onLoginSuccess(res.userSession);
      } else if (res.isNewUser) {
        onNavigate('SIGN_UP');
      }
    } catch (err: any) {
      setError(err.message || 'Google Sign-In failed.');
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleBiometricSuccess = async () => {
    setIsBiometricOpen(false);
    // If a active session already existed locally, restore or prompt login credentials
    const existingSession = SessionManager.getUserSession();
    if (existingSession && existingSession.companyId === activeCompany.companyId) {
      const updatedSession: UserSession = {
        ...existingSession,
        lastActiveAt: Date.now(),
        loginMode: 'BIOMETRIC'
      };
      SessionManager.setUserSession(updatedSession);
      onLoginSuccess(updatedSession);
    } else {
      setError('Biometric verified. Please enter your Password or PIN to link this device session.');
    }
  };


  return (
    <div className={`flex-1 transition-colors duration-300 ${isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'} flex flex-col justify-between p-6`}>
      <div className="space-y-5">
        {/* Company Header Pill */}
        <div className={`flex items-center justify-between transition-colors duration-300 ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'} p-2.5 rounded-2xl`}>
          <div className="flex items-center gap-2 min-w-0">
            <div className={`w-8 h-8 rounded-xl ${isDark ? 'bg-indigo-950 text-indigo-400 border-indigo-800' : 'bg-indigo-50 text-indigo-600 border-indigo-200'} border flex items-center justify-center shrink-0`}>
              <Building2 className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className={`text-xs font-bold ${isDark ? 'text-white' : 'text-slate-800'} truncate`}>{activeCompany.brandName}</p>
              <p className="text-[10px] text-slate-400 font-mono">Code: {activeCompany.companyId}</p>
            </div>
          </div>
          <button
            onClick={onChangeCompany}
            className={`text-[10px] font-semibold transition ${isDark ? 'text-indigo-400 hover:text-indigo-300 bg-indigo-950/80 border-indigo-800' : 'text-indigo-600 hover:text-indigo-700 bg-indigo-50 border-indigo-200'} px-2.5 py-1 rounded-lg border shrink-0`}
          >
            Change Code
          </button>
        </div>

        {/* Title & Brand Logo */}
        <div className="flex flex-col items-center text-center space-y-2 py-1">
          <AppLogo size="xl" showSubtitle={true} variant="full" />
          <p className="text-xs text-slate-400">Select your authentication mode below</p>
        </div>

        {/* Mode Selector Tabs (PIN vs Password vs Super Admin) */}
        <div className={`transition-colors duration-300 ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-200/60 border-slate-200/80 shadow-inner'} p-1 rounded-xl border grid grid-cols-3 gap-1 text-[11px]`}>
          <button
            type="button"
            onClick={() => {
              setLoginMode('PIN');
              setEmailOrId('');
              setPasswordOrPin('');
              setError(null);
            }}
            className={`py-2 rounded-lg font-semibold flex items-center justify-center gap-1 transition ${
              loginMode === 'PIN'
                ? 'bg-indigo-600 text-white shadow-md'
                : isDark
                  ? 'text-slate-400 hover:text-slate-200'
                  : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>ID & PIN</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setLoginMode('PASSWORD');
              setEmailOrId('');
              setPasswordOrPin('');
              setError(null);
            }}
            className={`py-2 rounded-lg font-semibold flex items-center justify-center gap-1 transition ${
              loginMode === 'PASSWORD'
                ? 'bg-indigo-600 text-white shadow-md'
                : isDark
                  ? 'text-slate-400 hover:text-slate-200'
                  : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Mail className="w-3.5 h-3.5" />
            <span>Email</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setLoginMode('SUPER_ADMIN');
              setEmailOrId('ghadgea15@gmail.com');
              setPasswordOrPin('');
              setError(null);
            }}
            className={`py-2 rounded-lg font-semibold flex items-center justify-center gap-1 transition ${
              loginMode === 'SUPER_ADMIN'
                ? 'bg-amber-600 text-white shadow-md'
                : isDark
                  ? 'text-amber-400/80 hover:text-amber-300'
                  : 'text-amber-700 hover:text-amber-800'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-amber-300" />
            <span>Super Admin</span>
          </button>
        </div>

        {/* Super Admin Notice Banner */}
        {loginMode === 'SUPER_ADMIN' && (
          <div className="p-3 bg-amber-950/60 border border-amber-800/80 rounded-xl text-xs text-amber-200 flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
            <div>
              <p className="font-bold">Super Admin Portal Access</p>
              <p className="text-[10px] text-amber-300/80">
                Reserved for global system administration. Full access to registered companies, module entitlements, and tenant control.
              </p>
            </div>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleLogin} className="space-y-3">

          <div>
            <label className={`text-xs font-medium ${isDark ? 'text-slate-300' : 'text-slate-600'} block mb-1`}>
              {loginMode === 'SUPER_ADMIN' 
                ? 'Super Admin Reserved Email' 
                : loginMode === 'PIN' 
                  ? 'Guard Employee ID / Badge No' 
                  : 'Registered Email Address'}
            </label>
            <div className="relative">
              <input
                type={loginMode === 'PIN' ? 'text' : 'email'}
                value={emailOrId}
                onChange={(e) => setEmailOrId(e.target.value)}
                readOnly={loginMode === 'SUPER_ADMIN'}
                placeholder={loginMode === 'SUPER_ADMIN' ? 'ghadgea15@gmail.com' : loginMode === 'PIN' ? 'e.g. EMP-G-8821' : 'e.g. guard@apexsecurity.com'}
                className={`w-full transition-colors duration-300 ${
                  isDark 
                    ? 'bg-slate-900 border-slate-800 text-white placeholder-slate-600 focus:border-indigo-500' 
                    : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:border-indigo-600 shadow-sm'
                } rounded-xl px-4 py-2.5 text-xs focus:outline-none font-mono ${loginMode === 'SUPER_ADMIN' ? 'opacity-90 font-bold border-amber-600/50' : ''}`}
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500">
                {loginMode === 'SUPER_ADMIN' ? <ShieldCheck className="w-4 h-4 text-amber-500" /> : loginMode === 'PIN' ? <User className="w-4 h-4" /> : <Mail className="w-4 h-4" />}
              </div>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className={`text-xs font-medium ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                {loginMode === 'PIN' ? '4-Digit Guard Security PIN' : 'Password'}
              </label>
              <button
                type="button"
                onClick={() => onNavigate('FORGOT_PASSWORD')}
                className="text-[11px] font-semibold text-indigo-500 hover:text-indigo-600"
              >
                Forgot?
              </button>
            </div>
            <div className="relative">
              <input
                type={showSecret ? 'text' : 'password'}
                value={passwordOrPin}
                onChange={(e) => setPasswordOrPin(e.target.value)}
                maxLength={loginMode === 'PIN' ? 6 : 64}
                placeholder={loginMode === 'PIN' ? '••••' : '••••••••'}
                className={`w-full transition-colors duration-300 ${
                  isDark 
                    ? 'bg-slate-900 border-slate-800 text-white placeholder-slate-600 focus:border-indigo-500' 
                    : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:border-indigo-600 shadow-sm'
                } rounded-xl px-4 py-2.5 text-xs focus:outline-none font-mono tracking-widest`}
              />
              <button
                type="button"
                onClick={() => setShowSecret(!showSecret)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
              >
                {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Remember Me & Biometric Button */}
          <div className="flex items-center justify-between pt-1">
            <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="rounded border-slate-800 bg-slate-900 text-indigo-600 focus:ring-0"
              />
              <span>Remember Device</span>
            </label>

            <button
              type="button"
              onClick={() => setIsBiometricOpen(true)}
              className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1 bg-indigo-950/60 border border-indigo-800/80 px-2.5 py-1 rounded-lg"
            >
              <Fingerprint className="w-3.5 h-3.5" />
              <span>Biometric Login</span>
            </button>
          </div>

          {error && (
            <div className="p-3 bg-rose-950/80 border border-rose-800 rounded-xl text-xs text-rose-300 flex items-start gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-400 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className={`w-full font-semibold py-3 px-4 rounded-xl flex items-center justify-center gap-2 shadow-lg transition text-sm mt-4 ${
              loginMode === 'SUPER_ADMIN'
                ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-600/30'
                : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/30'
            } disabled:opacity-50`}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Authenticating Credentials...</span>
              </>
            ) : (
              <>
                <span>{loginMode === 'SUPER_ADMIN' ? 'Sign In to Super Admin Dashboard' : 'Sign In to Mobile Workstation'}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Google Authentication Button */}
        <div className="pt-2">
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={googleLoading}
            className={`w-full py-2.5 px-4 rounded-xl border text-xs font-semibold transition flex items-center justify-center gap-2.5 ${
              isDark 
                ? 'bg-slate-900 hover:bg-slate-800 border-slate-800 text-slate-200' 
                : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-800 shadow-sm'
            } disabled:opacity-50`}
          >
            {googleLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
              </svg>
            )}
            <span>Continue with Google</span>
          </button>
        </div>

        {/* Divider & Sign-Up Actions */}
        <div className="pt-2 space-y-3">
          <div className="relative flex items-center justify-center">
            <div className="border-t border-slate-700/50 w-full" />
            <span className={`text-[10px] uppercase font-mono tracking-wider px-2 ${isDark ? 'bg-slate-950 text-slate-500' : 'bg-slate-50 text-slate-400'} absolute`}>
              New to Log Sheet Muster?
            </span>
          </div>

          <button
            type="button"
            onClick={() => onNavigate('SIGN_UP')}
            className={`w-full py-2.5 px-4 rounded-xl border text-xs font-semibold transition flex items-center justify-center gap-2 ${
              isDark 
                ? 'bg-slate-900 hover:bg-slate-800 border-slate-800 text-slate-200' 
                : 'bg-white hover:bg-slate-100 border-slate-200 text-slate-800 shadow-sm'
            }`}
          >
            <User className="w-3.5 h-3.5 text-indigo-400" />
            <span>Create New Account / Sign Up</span>
          </button>
        </div>
      </div>

      <BiometricPromptModal
        isOpen={isBiometricOpen}
        onClose={() => setIsBiometricOpen(false)}
        onSuccess={handleBiometricSuccess}
        subtitle={`Fast Fingerprint login for ${activeCompany.brandName}`}
      />
    </div>
  );
};
