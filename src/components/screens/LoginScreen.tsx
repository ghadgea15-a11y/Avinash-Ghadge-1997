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
import { MOCK_USERS } from '../../services/mockData';
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
  const [loginMode, setLoginMode] = useState<'PIN' | 'PASSWORD'>('PIN');
  const [emailOrId, setEmailOrId] = useState('EMP-G-8821');
  const [passwordOrPin, setPasswordOrPin] = useState('1234');
  const [showSecret, setShowSecret] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isBiometricOpen, setIsBiometricOpen] = useState(false);

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!emailOrId.trim()) {
      setError(loginMode === 'PIN' ? 'Please enter your Guard Employee ID.' : 'Please enter your Email address.');
      return;
    }
    if (!passwordOrPin) {
      setError(loginMode === 'PIN' ? 'Please enter your 4-digit PIN.' : 'Please enter your Password.');
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

  const handleSelectRolePreset = (role: UserRole) => {
    const preset = MOCK_USERS.find(u => u.role === role);
    if (preset) {
      if (loginMode === 'PIN') {
        setEmailOrId(preset.employeeId);
        setPasswordOrPin(preset.pin);
      } else {
        setEmailOrId(preset.email);
        setPasswordOrPin(preset.password);
      }
      setError(null);
    }
  };

  const handleBiometricSuccess = async () => {
    setIsBiometricOpen(false);
    // Find default guard or logged user
    const defaultUser = MOCK_USERS[0];
    const session: UserSession = {
      userId: `USR-${defaultUser.employeeId}`,
      employeeId: defaultUser.employeeId,
      fullName: defaultUser.fullName,
      email: defaultUser.email,
      role: defaultUser.role,
      companyId: activeCompany.companyId,
      branchId: activeCompany.allowedBranches[0] || 'MAIN_BRANCH',
      assignedSiteId: defaultUser.assignedSiteId,
      avatarUrl: defaultUser.avatarUrl,
      token: `BIOMETRIC-TOKEN-${Date.now()}`,
      tokenExpiresAt: Date.now() + (24 * 60 * 60 * 1000),
      isBiometricEnabled: true,
      lastActiveAt: Date.now(),
      loginMode: 'BIOMETRIC'
    };
    SessionManager.setUserSession(session);
    onLoginSuccess(session);
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

        {/* Mode Selector Tabs (PIN vs Password) */}
        <div className={`transition-colors duration-300 ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-200/60 border-slate-200/80 shadow-inner'} p-1 rounded-xl border grid grid-cols-2 gap-1 text-xs`}>
          <button
            onClick={() => {
              setLoginMode('PIN');
              setEmailOrId('EMP-G-8821');
              setPasswordOrPin('1234');
              setError(null);
            }}
            className={`py-2 rounded-lg font-semibold flex items-center justify-center gap-1.5 transition ${
              loginMode === 'PIN'
                ? 'bg-indigo-600 text-white shadow-md'
                : isDark
                  ? 'text-slate-400 hover:text-slate-200'
                  : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>Guard ID & PIN</span>
          </button>
          <button
            onClick={() => {
              setLoginMode('PASSWORD');
              setEmailOrId('guard@apexsecurity.com');
              setPasswordOrPin('password123');
              setError(null);
            }}
            className={`py-2 rounded-lg font-semibold flex items-center justify-center gap-1.5 transition ${
              loginMode === 'PASSWORD'
                ? 'bg-indigo-600 text-white shadow-md'
                : isDark
                  ? 'text-slate-400 hover:text-slate-200'
                  : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Mail className="w-3.5 h-3.5" />
            <span>Email Password</span>
          </button>
        </div>

        {/* Role Presets Bar */}
        <div className={`transition-colors duration-300 ${isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-100 border-slate-200'} p-2.5 rounded-2xl space-y-1.5 border`}>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Fill Role Preset Credentials:
          </p>
          <div className="flex flex-wrap gap-1">
            {(['GUARD', 'FIELD_OFFICER', 'OPS_MANAGER', 'HR_ADMIN', 'COMPANY_ADMIN'] as UserRole[]).map(role => (
              <button
                key={role}
                type="button"
                onClick={() => handleSelectRolePreset(role)}
                className={`text-[10px] font-semibold px-2 py-1 rounded transition border ${
                  isDark 
                    ? 'bg-slate-950 hover:bg-indigo-950 border-slate-800 hover:border-indigo-700 text-slate-300 hover:text-indigo-200' 
                    : 'bg-white hover:bg-indigo-50 border-slate-200 hover:border-indigo-300 text-slate-600 hover:text-indigo-600 shadow-sm'
                }`}
              >
                {role.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        {/* Login Form */}
        <form onSubmit={handleLogin} className="space-y-3">
          <div>
            <label className={`text-xs font-medium ${isDark ? 'text-slate-300' : 'text-slate-600'} block mb-1`}>
              {loginMode === 'PIN' ? 'Guard Employee ID / Badge No' : 'Registered Email Address'}
            </label>
            <div className="relative">
              <input
                type={loginMode === 'PIN' ? 'text' : 'email'}
                value={emailOrId}
                onChange={(e) => setEmailOrId(e.target.value)}
                placeholder={loginMode === 'PIN' ? 'e.g. EMP-G-8821' : 'e.g. guard@apexsecurity.com'}
                className={`w-full transition-colors duration-300 ${
                  isDark 
                    ? 'bg-slate-900 border-slate-800 text-white placeholder-slate-600 focus:border-indigo-500' 
                    : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:border-indigo-600 shadow-sm'
                } rounded-xl px-4 py-2.5 text-xs focus:outline-none font-mono`}
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500">
                {loginMode === 'PIN' ? <User className="w-4 h-4" /> : <Mail className="w-4 h-4" />}
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
            className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold py-3 px-4 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 transition text-sm mt-4"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Authenticating Credentials...</span>
              </>
            ) : (
              <>
                <span>Sign In to Mobile Workstation</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
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
