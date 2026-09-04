import React, { useState, useEffect } from 'react';
import { useBackNavigation } from '../../hooks/useBackNavigation';
import { 
  Building2, 
  Lock, 
  Mail, 
  KeyRound, 
  Eye, 
  EyeOff, 
  ArrowRight, 
  Loader2, 
  AlertCircle, 
  User, 
  ShieldCheck,
  RefreshCw,
  Menu,
  X,
  QrCode
} from 'lucide-react';
import { setDoc, doc } from 'firebase/firestore';
import { db } from '../../firebase';
import { TotpService } from '../../services/totpService';
import { CompanyTenant, UserSession, UserRole, PhaseAScreen } from '../../types';
import { PlatformGlobalConfig } from '../../types/platform';
import { SuperAdminService } from '../../services/superAdminService';
import { FirebaseAuthService } from '../../services/firebaseAuthService';
import { SessionManager } from '../../services/sessionManager';
import { AppLogo } from '../common/AppLogo';
import { useTheme } from '../../context/ThemeContext';
import { LanguageSelector } from '../common/LanguageSelector';
import { NumericKeypadModal } from '../common/NumericKeypadModal';
import { LanguageService } from '../../services/voiceFeedbackService';

interface LoginScreenProps {
  activeCompany?: CompanyTenant | null;
  onLoginSuccess: (session: UserSession, company: CompanyTenant) => void;
  onNavigate: (screen: PhaseAScreen) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  onLoginSuccess,
  onNavigate,
  activeCompany
}) => {
  const { isDark } = useTheme();
  
  const [step, setStep] = useState<'COMPANY_CODE' | 'CREDENTIALS' | 'MFA' | 'MFA_ENROLL'>('COMPANY_CODE');
  const [mfaSetupData, setMfaSetupData] = useState<any | null>(null);
  const [enrollSession, setEnrollSession] = useState<any | null>(null);
  const [companyCode, setCompanyCode] = useState('');
  const [validatedCompany, setValidatedCompany] = useState<CompanyTenant | null>(null);
  const [validatingCompany, setValidatingCompany] = useState(false);
  const [ssoConfig, setSsoConfig] = useState<any | null>(null);

  const [emailOrId, setEmailOrId] = useState('');
  const [passwordOrPin, setPasswordOrPin] = useState('');
  const [showSecret, setShowSecret] = useState(false);
  useBackNavigation(!!showSecret, () => setShowSecret(null as any), 'showSecret');
  const [rememberMe, setRememberMe] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showKeypadModal, setShowKeypadModal] = useState(false);
  useBackNavigation(!!showKeypadModal, () => setShowKeypadModal(null as any), 'showKeypadModal');
  
  // MFA States
  const [mfaResolver, setMfaResolver] = useState<any | null>(null);
  const [mfaCode, setMfaCode] = useState('');
  const [mfaError, setMfaError] = useState<string | null>(null);

  // Platform Global Config for Maintenance Mode
  const [globalConfig, setGlobalConfig] = useState<PlatformGlobalConfig | null>(null);

  useEffect(() => {
    const unsub = SuperAdminService.subscribeToGlobalConfig((cfg) => {
      setGlobalConfig(cfg);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    // 1. If activeCompany is already provided via props, use it
    if (activeCompany) {
      setValidatedCompany(activeCompany);
      setStep('CREDENTIALS');
      const saved = SessionManager.getSavedCredentials();
      if (saved && saved.remember) {
        if (saved.emailOrId) setEmailOrId(saved.emailOrId);
        setRememberMe(true);
      }
      return;
    }

    // 2. Otherwise check session manager
    const savedComp = SessionManager.getActiveCompany();
    const saved = SessionManager.getSavedCredentials();
    
    if (savedComp && savedComp.companyId !== 'GLOBAL_ADMIN' && savedComp.companyId !== 'GLOBAL-ADMIN') {
      setValidatedCompany(savedComp);
      setStep('CREDENTIALS');
    } else if (saved && saved.companyCode && saved.companyCode !== 'GLOBAL_ADMIN' && saved.companyCode !== 'GLOBAL-ADMIN') {
      // Background validate the saved company code
      setValidatingCompany(true);
      FirebaseAuthService.verifyCompanyCode(saved.companyCode)
        .then(async comp => {
          try {
            const { IntegrationService } = await import('../../services/integrationService');
            const sso = await IntegrationService.getSsoConfig(comp.companyId);
            if (sso && sso.isEnabled) {
               setSsoConfig(sso);
            }
          } catch(e) {}

          setValidatedCompany(comp);
          SessionManager.setActiveCompany(comp);
          setStep('CREDENTIALS');
        })
        .catch(() => {
          setStep('COMPANY_CODE');
        })
        .finally(() => {
          setValidatingCompany(false);
        });
    } else {
      setStep('COMPANY_CODE');
    }

    if (saved && saved.remember) {
      if (saved.emailOrId) setEmailOrId(saved.emailOrId);
      setRememberMe(true);
    }
  }, [activeCompany]);

  const handleCompanyCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = companyCode.trim().toUpperCase();
    if (!cleanCode) {
      setError('Please enter a Company Code.');
      return;
    }

    // PLATFORM OWNER / GLOBAL ADMIN INTERCEPTION:
    // "GLOBAL-ADMIN" and "GLOBAL_ADMIN" are Platform Control Plane identifiers,
    // not customer tenant codes. Route directly to the Platform Admin Portal.
    if (cleanCode === 'GLOBAL-ADMIN' || cleanCode === 'GLOBAL_ADMIN') {
      onNavigate('PLATFORM_LOGIN');
      return;
    }

    setError(null);
    setValidatingCompany(true);

    try {
      const comp = await FirebaseAuthService.verifyCompanyCode(cleanCode);
      try {
        const { IntegrationService } = await import('../../services/integrationService');
        const sso = await IntegrationService.getSsoConfig(comp.companyId);
        if (sso && sso.isEnabled) {
           setSsoConfig(sso);
        }
      } catch(e) {}
      setValidatedCompany(comp);
      SessionManager.setActiveCompany(comp);
      setStep('CREDENTIALS');
    } catch (err: any) {
      setError(err.message || 'Invalid Company Code.');
    } finally {
      setValidatingCompany(false);
    }
  };

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    if (!emailOrId.trim()) {
      setError('Please enter your Email address.');
      return;
    }

    if (!passwordOrPin) {
      setError('Please enter your Password.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const companyIdToUse = validatedCompany?.companyId;
      if (!companyIdToUse) {
         throw new Error("Company not validated.");
      }

      // Authenticate the user
      const session = await FirebaseAuthService.authenticateUser({
        companyId: companyIdToUse,
        emailOrId: emailOrId.trim(),
        passwordOrPin: passwordOrPin,
        isPinMode: !emailOrId.includes('@')
      });
      
      if (session.role === 'SUPER_ADMIN' || session.companyId === 'GLOBAL_ADMIN' || session.companyId === 'GLOBAL-ADMIN') {
        SessionManager.clearActiveCompany();
        SessionManager.setUserSession(session);
        SessionManager.setSavedCredentials(emailOrId.trim(), '', rememberMe);
        onLoginSuccess(session, null as any);
        return;
      }

      // Enforce Platform Maintenance Mode for all non-Super-Admin users
      if (globalConfig?.maintenanceMode) {
        const customMsg = globalConfig.maintenanceMessage || 
          globalConfig.maintenanceBannerMessage || 
          'Platform-wide scheduled maintenance is underway. Workspaces are temporarily placed in read/write lockdown.';
        setError(`Access Denied: Platform is currently under Maintenance Mode. Super Admin Notice: "${customMsg}"`);
        setLoading(false);
        return;
      }

      let resolvedCompany = validatedCompany;
      if (!resolvedCompany || resolvedCompany.companyId !== session.companyId) {
        resolvedCompany = await FirebaseAuthService.verifyCompanyCode(session.companyId);
        SessionManager.setActiveCompany(resolvedCompany);
      }

      SessionManager.setUserSession(session);
      SessionManager.setSavedCredentials(emailOrId.trim(), session.companyId, rememberMe);

      onLoginSuccess(session, resolvedCompany as CompanyTenant);
    } catch (err: any) {
      if (err.message === 'MFA_ENROLLMENT_REQUIRED') {
        const setup = await TotpService.createMfaSetup({
          accountName: emailOrId.trim(),
          issuer: 'Log Sheet Muster'
        });
        setMfaSetupData(setup);
        setEnrollSession(err.resolver.tempSession);
        setStep('MFA_ENROLL');
        setMfaError(null);
        setMfaCode('');
        return;
      }
      if (err.message === 'MFA_REQUIRED') {
        setMfaResolver(err.resolver);
        setStep('MFA');
        setMfaError(null);
        setMfaCode('');
        return;
      }
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Authentication failed. Please verify your credentials and try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleMfaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mfaCode || mfaCode.length < 6) {
      setMfaError('Please enter a valid 6-digit code.');
      return;
    }

    setLoading(true);
    setMfaError(null);

    try {
      const companyIdToUse = validatedCompany?.companyId || undefined;
      const session = await FirebaseAuthService.authenticateWithMfa(
        mfaResolver,
        mfaCode,
        companyIdToUse,
        emailOrId.trim()
      );

      if (session.role === 'SUPER_ADMIN' || session.companyId === 'GLOBAL_ADMIN' || session.companyId === 'GLOBAL-ADMIN') {
        SessionManager.clearActiveCompany();
        SessionManager.setUserSession(session);
        SessionManager.setSavedCredentials(emailOrId.trim(), '', rememberMe);
        onLoginSuccess(session, null as any);
        return;
      }

      // Enforce Platform Maintenance Mode for all non-Super-Admin users
      if (globalConfig?.maintenanceMode) {
        const customMsg = globalConfig.maintenanceMessage || 
          globalConfig.maintenanceBannerMessage || 
          'Platform-wide scheduled maintenance is underway. Workspaces are temporarily placed in read/write lockdown.';
        setMfaError(`Access Denied: Platform is currently under Maintenance Mode. Super Admin Notice: "${customMsg}"`);
        setLoading(false);
        return;
      }

      let resolvedCompany = validatedCompany;
      if (!resolvedCompany || resolvedCompany.companyId !== session.companyId) {
        resolvedCompany = await FirebaseAuthService.verifyCompanyCode(session.companyId);
        SessionManager.setActiveCompany(resolvedCompany);
      }

      SessionManager.setUserSession(session);
      SessionManager.setSavedCredentials(emailOrId.trim(), session.companyId, rememberMe);

      onLoginSuccess(session, resolvedCompany as CompanyTenant);
    } catch (err: unknown) {
      if (err instanceof Error) {
        if (err.message === 'MFA_ENROLLMENT_REQUIRED' || (err as any).message?.includes('ENROLLMENT')) {
          try {
            const userEmail = emailOrId.trim() || 'user';
            const setup = await TotpService.createMfaSetup({ accountName: userEmail });
            setMfaSetupData(setup);
            setEnrollSession(mfaResolver?.tempSession || (err as any).resolver?.tempSession);
            setStep('MFA_ENROLL');
            setMfaCode('');
            setMfaError(null);
            return;
          } catch (enrollErr: any) {
            console.error('Failed to start MFA enrollment:', enrollErr);
          }
        }
        setMfaError(err.message);
      } else {
        setMfaError('MFA Verification failed. Please check your Authenticator app and try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSetupNewDevice = async () => {
    try {
      setLoading(true);
      setMfaError(null);
      const userEmail = emailOrId.trim() || 'user';
      const setup = await TotpService.createMfaSetup({ accountName: userEmail });
      setMfaSetupData(setup);
      setEnrollSession(mfaResolver?.tempSession);
      setStep('MFA_ENROLL');
      setMfaCode('');
    } catch (e: any) {
      setMfaError('Failed to generate new 2FA setup key. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  
  const handleSsoLogin = async () => {
    if (!validatedCompany || !ssoConfig) return;
    setGoogleLoading(true);
    setError(null);
    try {
      const res = await FirebaseAuthService.signInWithSso(validatedCompany.companyId, ssoConfig);
      if (res.userSession) {
        if (res.userSession.companyId !== validatedCompany.companyId) {
           throw new Error('SSO Account belongs to a different company.');
        }
        SessionManager.setUserSession(res.userSession);
        onLoginSuccess(res.userSession, validatedCompany);
      } else if (res.accountStatus === 'PENDING') {
        throw new Error('SSO Auth successful, but account requires Admin approval.');
      }
    } catch (err: any) {
      setError(err.message || 'SSO Login failed.');
      setGoogleLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError(null);
    setGoogleLoading(true);
    try {
      const res = await FirebaseAuthService.signInWithGoogle();
      if (res.userSession) {
        SessionManager.setUserSession(res.userSession);
        
        if (res.userSession.role === 'SUPER_ADMIN' || res.userSession.companyId === 'GLOBAL_ADMIN' || res.userSession.companyId === 'GLOBAL-ADMIN') {
          SessionManager.clearActiveCompany();
          SessionManager.setUserSession(res.userSession);
          onLoginSuccess(res.userSession, null as any);
          return;
        }

        // Ensure company is verified
        let resolvedCompany = validatedCompany;
        if (!resolvedCompany || resolvedCompany.companyId !== res.userSession.companyId) {
          resolvedCompany = await FirebaseAuthService.verifyCompanyCode(res.userSession.companyId);
          SessionManager.setActiveCompany(resolvedCompany);
        }
        
        onLoginSuccess(res.userSession, resolvedCompany as CompanyTenant);
      } else if (res.isNewUser) {
        onNavigate('SIGN_UP');
      }
    } catch (err: any) {
      setError(err.message || 'Google Login failed. Please use Email and Password.');
    } finally {
      setGoogleLoading(false);
    }
  };


  const handleMfaEnrollSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = mfaCode.replace(/[^0-9A-Z]/gi, '').toUpperCase();
    if (!cleanCode || cleanCode.length < 6) {
      setMfaError('Please enter a valid 6-digit code or 8-character backup code.');
      return;
    }
    setLoading(true);
    setMfaError(null);
    try {
      const verifyResult = await TotpService.verifyCode(cleanCode, mfaSetupData.secret, 2);
      if (!verifyResult.isValid) {
        throw new Error(verifyResult.error || 'Invalid code. Please ensure your device clock is synced and try again.');
      }
      
      const uid = enrollSession?.userId || auth.currentUser?.uid;
      if (!uid) {
        throw new Error('Session user identification lost. Please log in again.');
      }

      // Persist to users/{uid}/private/mfa
      await setDoc(doc(db, 'users', uid, 'private', 'mfa'), {
        totpSecret: mfaSetupData.secret,
        backupCodes: mfaSetupData.backupCodes,
        lastUsedToken: cleanCode,
        lastUsedAt: Date.now(),
        updatedAt: new Date().toISOString()
      }, { merge: true });
      
      // Persist to root totp_secrets/{uid}
      try {
        await setDoc(doc(db, 'totp_secrets', uid), {
          totpSecret: mfaSetupData.secret,
          backupCodes: mfaSetupData.backupCodes,
          lastUsedAt: Date.now(),
          updatedAt: new Date().toISOString()
        }, { merge: true });
      } catch (totpSecretErr) {
        console.warn('totp_secrets write notice:', totpSecretErr);
      }

      await setDoc(doc(db, 'users', uid), {
        mfaEnabled: true,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      if (enrollSession.role === 'SUPER_ADMIN' || enrollSession.companyId === 'GLOBAL_ADMIN' || enrollSession.companyId === 'GLOBAL-ADMIN') {
        SessionManager.clearActiveCompany();
        SessionManager.setUserSession(enrollSession);
        SessionManager.setSavedCredentials(emailOrId.trim(), '', rememberMe);
        onLoginSuccess(enrollSession, null as any);
        return;
      }

      let resolvedCompany = validatedCompany;
      if (!resolvedCompany || resolvedCompany.companyId !== enrollSession.companyId) {
        resolvedCompany = await FirebaseAuthService.verifyCompanyCode(enrollSession.companyId);
        SessionManager.setActiveCompany(resolvedCompany);
      }
      
      SessionManager.setActiveCompany(resolvedCompany as any);
      SessionManager.setUserSession(enrollSession);
      SessionManager.setSavedCredentials(emailOrId.trim(), enrollSession.companyId, rememberMe);
      onLoginSuccess(enrollSession, resolvedCompany as any);

    } catch (err: any) {
      setMfaError(err.message || 'Verification failed. Please check your Authenticator app.');
    } finally {
      setLoading(false);
    }
  };

  if (step === 'MFA_ENROLL') {
    return (
      <div 
      style={validatedCompany?.loginBackgroundUrl ? { backgroundImage: `url(${validatedCompany.loginBackgroundUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}
      className={`flex-1 transition-colors duration-300 ${validatedCompany?.loginBackgroundUrl ? (isDark ? 'bg-slate-950/80 backdrop-blur-md text-slate-100' : 'bg-white/80 backdrop-blur-md text-black') : (isDark ? 'bg-slate-950 text-slate-100' : 'bg-white text-black')} flex flex-col justify-center px-6`}>
        <div className="w-full max-w-sm mx-auto space-y-6">
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-indigo-500/10 text-indigo-500 mb-2">
              <QrCode className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold">Setup Two-Factor Authentication</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Scan the QR code with your authenticator app (Google Authenticator, Authy, etc.).
            </p>
          </div>

          {mfaSetupData && (
            <div className="flex flex-col items-center justify-center p-4 bg-white dark:bg-slate-900 rounded-xl space-y-4">
              <img src={mfaSetupData.qrCodeDataUrl} alt="QR Code" className="w-48 h-48" />
              <div className="text-center w-full">
                <p className="text-xs font-semibold text-slate-900 dark:text-slate-300 mb-2">Backup Recovery Codes</p>
                <div className="grid grid-cols-2 gap-2 text-xs font-mono text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-950 p-3 rounded-lg border border-slate-200">
                   {mfaSetupData.backupCodes.map((c: any, i: number) => (
                      <span key={i}>{c}</span>
                   ))}
                </div>
                <p className="text-[11px] text-slate-400 mt-2">Save these in a secure place. They will not be shown again.</p>
              </div>
            </div>
          )}

          <form onSubmit={handleMfaEnrollSubmit} className="space-y-4">
            <div>
              <label className={`text-xs font-medium ${isDark ? 'text-slate-300' : 'text-slate-600'} block mb-1`}>
                Enter 6-digit Code
              </label>
              <input
                type="text"
                value={mfaCode}
                onChange={(e) => {
                  setMfaCode(e.target.value.replace(/[^0-9A-Z]/gi, '').toUpperCase());
                  setMfaError(null);
                }}
                maxLength={8}
                placeholder="000000"
                className={`w-full transition-colors duration-300 ${isDark ? 'bg-slate-900 border-slate-800 text-white placeholder-slate-600 focus:border-indigo-500' : 'bg-white border-slate-200 text-black placeholder-slate-400 focus:border-indigo-600 shadow-sm'} rounded-xl px-4 py-2.5 text-center text-2xl tracking-[0.5em] focus:outline-none font-mono`}
              />
            </div>
            {mfaError && (
              <div className="p-3 bg-rose-950/80 border border-rose-800 rounded-xl text-xs text-rose-300 flex items-start gap-2 animate-in fade-in">
                <AlertCircle className="w-4 h-4 text-rose-400 mt-0.5 shrink-0" />
                <span>{mfaError}</span>
              </div>
            )}
            <button
              type="submit"
              disabled={loading || mfaCode.length < 6}
              style={{ backgroundColor: validatedCompany?.primaryColorHex || undefined }}
              className={`w-full font-semibold py-3 px-4 rounded-xl flex items-center justify-center gap-2 shadow-lg transition text-sm mt-4 text-white disabled:opacity-50 ${!validatedCompany?.primaryColorHex ? 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-600/30' : ''}`}
            >
              {loading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /><span>Verifying...</span></>
              ) : (
                <><ShieldCheck className="w-4 h-4" /><span>Enable MFA</span></>
              )}
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (step === 'MFA') {
    return (
      <div 
      style={validatedCompany?.loginBackgroundUrl ? { backgroundImage: `url(${validatedCompany.loginBackgroundUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}
      className={`flex-1 transition-colors duration-300 ${validatedCompany?.loginBackgroundUrl ? (isDark ? 'bg-slate-950/80 backdrop-blur-md text-slate-100' : 'bg-white/80 backdrop-blur-md text-black') : (isDark ? 'bg-slate-950 text-slate-100' : 'bg-white text-black')} flex flex-col justify-center px-6`}>
        <div className="w-full max-w-sm mx-auto space-y-6">
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-indigo-500/10 text-indigo-500 mb-2">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold">Two-Factor Authentication</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Enter the 6-digit code from your authenticator app.
            </p>
          </div>
          
          <form onSubmit={handleMfaSubmit} className="space-y-4">
            <div>
              <label className={`text-xs font-medium ${isDark ? 'text-slate-300' : 'text-slate-600'} block mb-1`}>
                Authenticator Code
              </label>
              <input
                type="text"
                maxLength={8}
                value={mfaCode}
                onChange={(e) => {
                  setMfaCode(e.target.value.replace(/[^0-9A-Z]/gi, '').toUpperCase());
                  setMfaError(null);
                }}
                placeholder="123456"
                className={`w-full transition-colors duration-300 ${
                  isDark 
                    ? 'bg-slate-900 border-slate-800 text-white placeholder-slate-600 focus:border-indigo-500' 
                    : 'bg-white border-slate-200 text-black placeholder-slate-400 focus:border-indigo-600 shadow-sm'
                } rounded-xl px-4 py-3 text-center text-2xl tracking-[0.5em] focus:outline-none font-mono`}
              />
            </div>
            
            {mfaError && (
              <div className="p-3 bg-rose-950/80 border border-rose-800 rounded-xl text-xs text-rose-300 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 mt-0.5 shrink-0" />
                <span>{mfaError}</span>
              </div>
            )}
            
            <button
              type="submit"
              disabled={loading || mfaCode.length < 6}
              className={`w-full font-semibold py-3 px-4 rounded-xl flex items-center justify-center gap-2 shadow-lg transition text-sm bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/30 disabled:opacity-50`}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Verifying...</span>
                </>
              ) : (
                <>
                  <span>Verify Code</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
            
            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={handleSetupNewDevice}
                className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                Re-configure Authenticator / Scan QR
              </button>
              <button
                type="button"
                onClick={() => {
                  setMfaResolver(null);
                  setMfaCode('');
                  setMfaError(null);
                  setStep('CREDENTIALS');
                }}
                className="text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
              >
                Back to Login
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex-1 transition-colors duration-300 ${isDark ? 'bg-slate-950 text-slate-100' : 'bg-white text-black'} flex flex-col justify-between p-6 relative`}>
      {/* Top Navigation Bar: Back to Home, Language Selector & Menu */}
      <div className="flex items-center justify-between w-full mb-2 gap-2">
        <button
          type="button"
          onClick={() => onNavigate('LANDING')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
            isDark 
              ? 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800' 
              : 'bg-white border-slate-200 text-slate-600 hover:text-black hover:bg-slate-100 shadow-sm'
          }`}
        >
          <span>← Back to Website</span>
        </button>

        <div className="flex items-center gap-2">
          {/* Language Selector Component */}
          <LanguageSelector compact showVoiceToggle />

          {/* Top Right Menu */}
          <div className="relative">
          <button
            type="button"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className={`p-2 rounded-lg transition-colors ${isDark ? 'bg-slate-900 text-slate-300 hover:bg-slate-800' : 'bg-white text-slate-600 hover:bg-slate-100 shadow-sm border border-slate-200'}`}
          >
            {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          
          {isMenuOpen && (
            <div className={`absolute top-full right-0 mt-2 w-56 rounded-xl shadow-xl border overflow-hidden animate-in slide-in-from-top-2 z-50 ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
              <div className="flex flex-col">
                <button
                  type="button"
                  onClick={() => {
                    setIsMenuOpen(false);
                    onNavigate('LANDING');
                  }}
                  className={`flex items-center gap-3 px-4 py-3 text-xs font-semibold transition ${isDark ? 'text-slate-200 hover:bg-slate-800' : 'text-slate-900 hover:bg-white'}`}
                >
                  <span>🌐 Back to Website</span>
                </button>
                
                <div className={`h-px w-full ${isDark ? 'bg-slate-800' : 'bg-slate-100'}`} />

                {step === 'COMPANY_CODE' && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsMenuOpen(false);
                      setValidatedCompany({
                        companyId: 'GLOBAL_ADMIN',
                        companyLegalName: 'Platform Administration',
                        brandName: 'System Core',
                        status: 'ACTIVE',
                        primaryColorHex: '#4f46e5',
                        secondaryColorHex: '#4338ca',
                        email: 'admin@system.local',
                        maxEmployeesAllowed: 9999,
                        maxSitesAllowed: 9999,
                        allowedBranches: [],
                        enabledModules: [],
                        licenseTier: 'ENTERPRISE',
                        phone: '',
                        address: '',
                        city: '',
                        state: '',
                        country: '',
                        
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString()
                      });
                      setStep('CREDENTIALS');
                    }}
                    className={`flex items-center gap-3 px-4 py-3 text-xs font-semibold transition ${isDark ? 'text-slate-200 hover:bg-slate-800' : 'text-slate-900 hover:bg-white'}`}
                  >
                    <ShieldCheck className="w-4 h-4 text-amber-500" />
                    <span>Platform Admin Login</span>
                  </button>
                )}

                {step === 'CREDENTIALS' && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsMenuOpen(false);
                      handleGoogleLogin();
                    }}
                    className={`flex items-center gap-3 px-4 py-3 text-xs font-semibold transition ${isDark ? 'text-slate-200 hover:bg-slate-800' : 'text-slate-900 hover:bg-white'}`}
                  >
                    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                    </svg>
                    <span>Continue with Google</span>
                  </button>
                )}
                
                <div className={`h-px w-full ${isDark ? 'bg-slate-800' : 'bg-slate-100'}`} />
                
                <button
                  type="button"
                  onClick={() => {
                    setIsMenuOpen(false);
                    onNavigate('SIGN_UP');
                  }}
                  className={`flex items-center gap-3 px-4 py-3 text-xs font-semibold transition ${isDark ? 'text-slate-200 hover:bg-slate-800' : 'text-slate-900 hover:bg-white'}`}
                >
                  <User className="w-4 h-4 text-indigo-500" />
                  <span>Create New Account</span>
                </button>
              </div>
            </div>
          )}
        </div>
        </div>
      </div>

      <div className="space-y-5">
        {/* Title & Brand Logo - Single Authoritative Source */}
        <div className="flex flex-col items-center text-center py-2">
          <AppLogo size="xl" showSubtitle={true} variant="full" layout="vertical" company={validatedCompany} />
        </div>

        {/* Global Maintenance Mode Alert Banner */}
        {globalConfig?.maintenanceMode && (
          <div className="p-3.5 rounded-xl border border-rose-300 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/40 text-rose-900 dark:text-rose-200 text-xs shadow-sm">
            <div className="flex items-center gap-2 font-bold uppercase tracking-wider text-[11px] text-rose-700 dark:text-rose-400 mb-1">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
              </span>
              <span>Platform Maintenance Mode Active</span>
            </div>
            <p className="font-medium text-xs leading-relaxed text-rose-950 dark:text-rose-100">
              {globalConfig.maintenanceMessage || globalConfig.maintenanceBannerMessage || 'Scheduled system maintenance is currently underway. Tenant workspaces are temporarily locked.'}
            </p>
            <div className="mt-2 text-[10px] text-rose-600 dark:text-rose-400 font-mono">
              * Regular tenant logins are paused. Super Admins may proceed to Platform Admin Console.
            </div>
          </div>
        )}

        {step === 'COMPANY_CODE' ? (
          <form onSubmit={handleCompanyCodeSubmit} className="space-y-3">
            <div className="text-center mb-6">
              <h2 className="text-lg font-bold">Company Login</h2>
              <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Enter your Company Code to continue.</p>
            </div>
            <div>
              <label className={`text-xs font-medium ${isDark ? 'text-slate-300' : 'text-slate-600'} block mb-1`}>
                Company Code
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={companyCode}
                  onChange={(e) => setCompanyCode(e.target.value.toUpperCase())}
                  placeholder="e.g. ACME-CORP"
                  className={`w-full transition-colors duration-300 ${
                    isDark 
                      ? 'bg-slate-900 border-slate-800 text-white placeholder-slate-600 focus:border-indigo-500' 
                      : 'bg-white border-slate-200 text-black placeholder-slate-400 focus:border-indigo-600 shadow-sm'
                  } rounded-xl px-4 py-2.5 text-xs focus:outline-none font-mono uppercase`}
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400">
                  <Building2 className="w-4 h-4" />
                </div>
              </div>
            </div>

            {error && (
              <div className="p-3 bg-rose-950/80 border border-rose-800 rounded-xl text-xs text-rose-300 flex items-start gap-2 animate-in fade-in">
                <AlertCircle className="w-4 h-4 text-rose-400 mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={validatingCompany || !companyCode}
              style={{ backgroundColor: validatedCompany?.primaryColorHex || undefined }}
              className={`w-full font-semibold py-3 px-4 rounded-xl flex items-center justify-center gap-2 shadow-lg transition text-sm mt-4 text-white disabled:opacity-50 ${!validatedCompany?.primaryColorHex ? 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-600/30' : ''}`}
            >
              {validatingCompany ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Verifying...</span>
                </>
              ) : (
                <>
                  <span>Continue</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            <div className="pt-3 text-center border-t border-slate-100 dark:border-slate-800/60 mt-3">
              <button
                type="button"
                onClick={() => onNavigate('PLATFORM_LOGIN')}
                className={`inline-flex items-center gap-1.5 text-xs font-semibold ${
                  isDark ? 'text-amber-400 hover:text-amber-300' : 'text-amber-700 hover:text-amber-800'
                } transition-colors`}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                Platform Owner or Global Admin? Access Portal &rarr;
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleLogin} className="space-y-3">
             <div className="text-center mb-4 space-y-1.5">
               <div className="flex items-center justify-center gap-2">
                 <span className={`text-xs font-mono px-2.5 py-0.5 rounded-full border ${
                   isDark ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-slate-100 border-slate-200 text-slate-700'
                 }`}>
                   Tenant: {validatedCompany?.companyId}
                 </span>
                 <button 
                   type="button" 
                   onClick={() => {
                     setStep('COMPANY_CODE');
                     setCompanyCode('');
                     setError(null);
                     setValidatedCompany(null);
                     SessionManager.clearActiveCompany(); 
                   }}
                   className="text-xs text-indigo-500 hover:text-indigo-600 underline font-medium transition"
                 >
                   Change
                 </button>
               </div>
             </div>
             
            <div>
              <label className={`text-xs font-medium ${isDark ? 'text-slate-300' : 'text-slate-600'} block mb-1`}>
                Email Address or Employee ID
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={emailOrId}
                  onChange={(e) => setEmailOrId(e.target.value)}
                  placeholder="name@company.com"
                  className={`w-full transition-colors duration-300 ${
                    isDark 
                      ? 'bg-slate-900 border-slate-800 text-white placeholder-slate-600 focus:border-indigo-500' 
                      : 'bg-white border-slate-200 text-black placeholder-slate-400 focus:border-indigo-600 shadow-sm'
                  } rounded-xl px-4 py-2.5 text-xs focus:outline-none font-mono`}
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400">
                  <User className="w-4 h-4" />
                </div>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className={`text-xs font-medium ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                  {LanguageService.translate('ENTER_PIN')} / Password
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowKeypadModal(true)}
                    className="text-xs font-bold text-indigo-400 bg-indigo-500/10 border border-indigo-500/30 hover:bg-indigo-500/20 px-2 py-0.5 rounded-lg flex items-center gap-1 transition"
                  >
                    <KeyRound className="w-3 h-3" />
                    <span>Touch Keypad</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onNavigate('FORGOT_PASSWORD')}
                    className="text-xs font-semibold text-indigo-500 hover:text-indigo-600"
                  >
                    Forgot?
                  </button>
                </div>
              </div>
              <div className="relative">
                <input
                  type={showSecret ? 'text' : 'password'}
                  value={passwordOrPin}
                  onChange={(e) => setPasswordOrPin(e.target.value)}
                  maxLength={64}
                  placeholder="••••••••"
                  className={`w-full transition-colors duration-300 ${
                    isDark 
                      ? 'bg-slate-900 border-slate-800 text-white placeholder-slate-600 focus:border-indigo-500' 
                      : 'bg-white border-slate-200 text-black placeholder-slate-400 focus:border-indigo-600 shadow-sm'
                  } rounded-xl px-4 py-2.5 text-xs focus:outline-none font-mono tracking-widest`}
                />
                <button
                  type="button"
                  onClick={() => setShowSecret(!showSecret)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400 hover:text-slate-300"
                >
                  {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <label className={`flex items-center gap-2 cursor-pointer text-xs ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-800 text-indigo-600 focus:ring-0"
                />
                <span>Remember (5 mins)</span>
              </label>
            </div>

            {/* Terms & Privacy acceptance notice */}
            <div className="pt-1 text-center">
              <p className="text-xs text-slate-400">
                By signing in, you agree to our{' '}
                <button
                  type="button"
                  onClick={() => onNavigate('LEGAL_POLICIES')}
                  className="text-indigo-400 hover:underline font-medium"
                >
                  Privacy Policy & Enterprise Terms
                </button>
                .
              </p>
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
              style={{ backgroundColor: validatedCompany?.primaryColorHex || undefined }}
              className={`w-full font-semibold py-3 px-4 rounded-xl flex items-center justify-center gap-2 shadow-lg transition text-sm mt-4 text-white disabled:opacity-50 ${!validatedCompany?.primaryColorHex ? 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-600/30' : ''}`}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Authenticating Credentials...</span>
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        )}
      </div>

      {/* Numeric Touch Keypad Modal for Workers */}
      <NumericKeypadModal
        isOpen={showKeypadModal}
        onClose={() => setShowKeypadModal(false)}
        onSubmitPin={(pin) => {
          setPasswordOrPin(pin);
          setShowKeypadModal(false);
        }}
      />
    </div>
  );
};
