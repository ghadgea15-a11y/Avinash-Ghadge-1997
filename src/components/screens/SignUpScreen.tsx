import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Mail, 
  Lock, 
  User, 
  Phone, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  ArrowLeft, 
  Shield, 
  ShieldCheck, 
  Sparkles,
  ArrowRight,
  Eye,
  EyeOff
} from 'lucide-react';
import { CompanyTenant, DepartmentRecord, UserSession, PhaseAScreen, AccountStatus } from '../../types';
import { FirebaseAuthService } from '../../services/firebaseAuthService';
import { SessionManager } from '../../services/sessionManager';
import { AppLogo } from '../common/AppLogo';
import { useTheme } from '../../context/ThemeContext';

interface SignUpScreenProps {
  initialCompany?: CompanyTenant | null;
  onSignUpSuccess: (session: UserSession) => void;
  onNavigate: (screen: PhaseAScreen) => void;
}

export const SignUpScreen: React.FC<SignUpScreenProps> = ({
  initialCompany,
  onSignUpSuccess,
  onNavigate
}) => {
  const { isDark } = useTheme();

  // Form Fields
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [companyCode, setCompanyCode] = useState(initialCompany?.companyId || '');
  const [mobileNumber, setMobileNumber] = useState('');
  const [selectedDeptId, setSelectedDeptId] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Dynamic States
  const [verifiedCompany, setVerifiedCompany] = useState<CompanyTenant | null>(initialCompany || null);
  const [departments, setDepartments] = useState<DepartmentRecord[]>([]);
  const [verifyingCode, setVerifyingCode] = useState(false);
  const [codeError, setCodeError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Google Registration State
  const [googleStepUser, setGoogleStepUser] = useState<any | null>(null);

  // Auto-verify initial company code if provided
  useEffect(() => {
    if (initialCompany) {
      handleLoadDepartments(initialCompany.companyId);
    }
  }, [initialCompany]);

  // Load departments dynamically whenever company code is verified
  const handleLoadDepartments = async (code: string) => {
    try {
      const depts = await FirebaseAuthService.getCompanyDepartments(code);
      setDepartments(depts);
      if (depts.length > 0 && !selectedDeptId) {
        setSelectedDeptId(depts[0].id);
      }
    } catch (err) {
      console.warn('[SignUpScreen] Error loading departments:', err);
    }
  };

  // Verify Company Code input
  const handleVerifyCode = async () => {
    if (!companyCode.trim()) {
      setCodeError('Please enter a valid Company Code.');
      setVerifiedCompany(null);
      return;
    }

    setVerifyingCode(true);
    setCodeError(null);

    try {
      const company = await FirebaseAuthService.verifyCompanyCode(companyCode.trim());
      setVerifiedCompany(company);
      await handleLoadDepartments(company.companyId);
    } catch (err: any) {
      setVerifiedCompany(null);
      setCodeError(err.message || 'Invalid Company Code');
    } finally {
      setVerifyingCode(false);
    }
  };

  const isSuperAdminEmail = false;

  // Handle Email & Password Signup
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!fullName.trim()) {
      setError('Please enter your Full Name.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }
    if (!password) {
      setError('Please enter a password.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match. Please re-enter your password.');
      return;
    }
    if (!acceptedTerms) {
      setError('You must accept the terms and conditions to register.');
      return;
    }

    if (!isSuperAdminEmail) {
      if (!verifiedCompany) {
        setError('Please enter and verify a valid Company Code before completing registration.');
        return;
      }
      if (!selectedDeptId) {
        setError('Please select your department.');
        return;
      }
    }

    setLoading(true);

    try {
      const selectedDept = departments.find(d => d.id === selectedDeptId) || {
        id: selectedDeptId || 'DEPT-GENERAL',
        name: isSuperAdminEmail ? 'Super Admin' : 'General'
      };

      const result = await FirebaseAuthService.signUpWithEmailPassword({
        fullName: fullName.trim(),
        email: email.trim().toLowerCase(),
        password,
        companyCode: verifiedCompany?.companyId || companyCode.trim(),
        departmentId: selectedDept.id,
        departmentName: selectedDept.name,
        mobileNumber: mobileNumber.trim()
      });

      SessionManager.setUserSession(result.userSession);
      if (verifiedCompany) {
        SessionManager.setActiveCompany(verifiedCompany);
      }

      onSignUpSuccess(result.userSession);
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle Google Sign In
  const handleGoogleSignIn = async () => {
    setError(null);
    setLoading(true);

    try {
      const res = await FirebaseAuthService.signInWithGoogle();

      if (res.isNewUser && res.fbUser) {
        // Needs company code & department
        setGoogleStepUser(res.fbUser);
        if (res.fbUser.displayName) setFullName(res.fbUser.displayName);
        if (res.fbUser.email) setEmail(res.fbUser.email);
        setLoading(false);
        return;
      }

      if (res.userSession) {
        SessionManager.setUserSession(res.userSession);
        onSignUpSuccess(res.userSession);
      }
    } catch (err: any) {
      setError(err.message || 'Google Sign-In failed.');
    } finally {
      setLoading(false);
    }
  };

  // Handle completing Google registration step
  const handleCompleteGoogleReg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!googleStepUser) return;

    if (!verifiedCompany) {
      setError('Please verify a valid Company Code.');
      return;
    }
    if (!selectedDeptId) {
      setError('Please select a department.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const selectedDept = departments.find(d => d.id === selectedDeptId) || {
        id: selectedDeptId,
        name: 'General'
      };

      const res = await FirebaseAuthService.completeGoogleRegistration({
        fbUser: googleStepUser,
        companyCode: verifiedCompany.companyId,
        departmentId: selectedDept.id,
        departmentName: selectedDept.name,
        mobileNumber: mobileNumber.trim()
      });

      SessionManager.setUserSession(res.userSession);
      SessionManager.setActiveCompany(verifiedCompany);
      onSignUpSuccess(res.userSession);
    } catch (err: any) {
      setError(err.message || 'Failed to complete Google registration.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`flex-1 transition-colors duration-300 ${isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'} p-4 md:p-6 flex flex-col justify-between max-w-xl mx-auto w-full`}>
      <div className="space-y-5">
        {/* Navigation & Header */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => onNavigate('LOGIN')}
            className={`flex items-center gap-1.5 text-xs font-semibold ${isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'}`}
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Sign In</span>
          </button>
          <AppLogo size="sm" showSubtitle={false} />
        </div>

        {/* Title */}
        <div>
          <h2 className="text-xl font-bold tracking-tight">Create Enterprise Account</h2>
          <p className="text-xs text-slate-400 mt-1">
            Register your profile with verified company credentials to request workstation access.
          </p>
        </div>

        {/* Reserved Super Admin Email Notice Banner */}
        {isSuperAdminEmail && (
          <div className="p-3 bg-amber-950/80 border border-amber-800 rounded-xl text-xs text-amber-300 flex items-start gap-2 animate-in fade-in">
            <Sparkles className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
            <div>
              <p className="font-bold">Reserved System Identity Detected</p>
              <p className="text-[11px] text-amber-200 mt-0.5">
                You are initializing a Super Administrator identity.
              </p>
            </div>
          </div>
        )}

        {/* Google Sign-In Pending Modal/Step if needed */}
        {googleStepUser ? (
          <form onSubmit={handleCompleteGoogleReg} className="space-y-4 p-4 rounded-2xl border bg-indigo-950/20 border-indigo-800/80">
            <div className="flex items-center gap-2 text-indigo-400 font-semibold text-xs border-b border-indigo-900/60 pb-2">
              <ShieldCheck className="w-4 h-4" />
              <span>Google Account Authenticated ({googleStepUser.email})</span>
            </div>
            <p className="text-xs text-slate-300">
              Please enter your Company Code and Department to complete your approval application.
            </p>

            {/* Company Code Input */}
            <div>
              <label className="text-xs font-medium text-slate-300 block mb-1">Company Code *</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={companyCode}
                  onChange={(e) => {
                    setCompanyCode(e.target.value.toUpperCase());
                    setVerifiedCompany(null);
                  }}
                  placeholder="e.g. APEX-SEC-101"
                  className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white uppercase font-mono focus:border-indigo-500 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleVerifyCode}
                  disabled={verifyingCode || !companyCode.trim()}
                  className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold text-xs px-4 rounded-xl flex items-center gap-1.5"
                >
                  {verifyingCode ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Verify Code'}
                </button>
              </div>

              {verifiedCompany && (
                <div className="mt-2 text-[11px] text-emerald-400 font-medium flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Verified: {verifiedCompany.brandName} ({verifiedCompany.companyLegalName})</span>
                </div>
              )}
              {codeError && (
                <div className="mt-2 text-[11px] text-rose-400 font-medium flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>{codeError}</span>
                </div>
              )}
            </div>

            {/* Department Selection */}
            {verifiedCompany && (
              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">Select Department *</label>
                <select
                  value={selectedDeptId}
                  onChange={(e) => setSelectedDeptId(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:border-indigo-500 focus:outline-none"
                >
                  {departments.map((dept) => (
                    <option key={dept.id} value={dept.id}>
                      {dept.name} ({dept.code})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !verifiedCompany}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Complete Registration & Submit for Approval'}
            </button>
          </form>
        ) : (
          /* Main Signup Options */
          <div className="space-y-4">
            {/* Option A: Google Sign-In Button */}
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={loading}
              className={`w-full transition-colors duration-300 ${
                isDark 
                  ? 'bg-slate-900 hover:bg-slate-800 border-slate-800 text-white' 
                  : 'bg-white hover:bg-slate-100 border-slate-200 text-slate-800 shadow-sm'
              } border font-semibold py-3 px-4 rounded-xl flex items-center justify-center gap-2 text-xs transition`}
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
              <span>Continue with Google</span>
            </button>

            <div className="relative flex items-center justify-center">
              <div className="border-t border-slate-700/50 w-full" />
              <span className={`text-[11px] uppercase font-mono tracking-wider px-3 ${isDark ? 'bg-slate-950 text-slate-500' : 'bg-slate-50 text-slate-400'} absolute`}>
                Or Email & Password
              </span>
            </div>

            {/* Option B: Email & Password Form */}
            <form onSubmit={handleSubmit} className="space-y-3.5 pt-1">
              {/* Company Code Input */}
              {!isSuperAdminEmail && (
                <div>
                  <label className={`text-xs font-medium ${isDark ? 'text-slate-300' : 'text-slate-600'} block mb-1`}>
                    Company Code *
                  </label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <input
                        type="text"
                        value={companyCode}
                        onChange={(e) => {
                          setCompanyCode(e.target.value.toUpperCase());
                          setVerifiedCompany(null);
                          setCodeError(null);
                        }}
                        placeholder="e.g. APEX-SEC-101"
                        className={`w-full transition-colors duration-300 ${
                          isDark 
                            ? 'bg-slate-900 border-slate-800 text-white placeholder-slate-600 focus:border-indigo-500' 
                            : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:border-indigo-600 shadow-sm'
                        } rounded-xl px-4 py-2.5 text-xs focus:outline-none uppercase font-mono`}
                      />
                      <Building2 className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    </div>
                    <button
                      type="button"
                      onClick={handleVerifyCode}
                      disabled={verifyingCode || !companyCode.trim()}
                      className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold text-xs px-4 rounded-xl shrink-0 transition"
                    >
                      {verifyingCode ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Verify'}
                    </button>
                  </div>

                  {verifiedCompany && (
                    <div className="mt-1.5 p-2 bg-emerald-950/60 border border-emerald-800/80 rounded-lg text-[11px] text-emerald-300 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>Verified: <strong>{verifiedCompany.brandName}</strong> ({verifiedCompany.companyLegalName})</span>
                    </div>
                  )}

                  {codeError && (
                    <div className="mt-1.5 text-[11px] text-rose-400 font-medium flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" />
                      <span>{codeError}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Department Selection */}
              {(!isSuperAdminEmail && verifiedCompany) && (
                <div>
                  <label className={`text-xs font-medium ${isDark ? 'text-slate-300' : 'text-slate-600'} block mb-1`}>
                    Assigned Department *
                  </label>
                  <select
                    value={selectedDeptId}
                    onChange={(e) => setSelectedDeptId(e.target.value)}
                    className={`w-full transition-colors duration-300 ${
                      isDark 
                        ? 'bg-slate-900 border-slate-800 text-white focus:border-indigo-500' 
                        : 'bg-white border-slate-200 text-slate-900 focus:border-indigo-600 shadow-sm'
                    } rounded-xl px-4 py-2.5 text-xs focus:outline-none`}
                  >
                    {departments.map((dept) => (
                      <option key={dept.id} value={dept.id}>
                        {dept.name} ({dept.code})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Full Name */}
              <div>
                <label className={`text-xs font-medium ${isDark ? 'text-slate-300' : 'text-slate-600'} block mb-1`}>
                  Full Name *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Rajesh Kumar"
                    className={`w-full transition-colors duration-300 ${
                      isDark 
                        ? 'bg-slate-900 border-slate-800 text-white placeholder-slate-600 focus:border-indigo-500' 
                        : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:border-indigo-600 shadow-sm'
                    } rounded-xl px-4 py-2.5 text-xs focus:outline-none`}
                  />
                  <User className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-500" />
                </div>
              </div>

              {/* Email Address */}
              <div>
                <label className={`text-xs font-medium ${isDark ? 'text-slate-300' : 'text-slate-600'} block mb-1`}>
                  Email Address *
                </label>
                <div className="relative">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. rajesh@company.com"
                    className={`w-full transition-colors duration-300 ${
                      isDark 
                        ? 'bg-slate-900 border-slate-800 text-white placeholder-slate-600 focus:border-indigo-500' 
                        : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:border-indigo-600 shadow-sm'
                    } rounded-xl px-4 py-2.5 text-xs focus:outline-none font-mono`}
                  />
                  <Mail className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-500" />
                </div>
              </div>

              {/* Mobile Contact Number */}
              <div>
                <label className={`text-xs font-medium ${isDark ? 'text-slate-300' : 'text-slate-600'} block mb-1`}>
                  Mobile Number (Optional)
                </label>
                <div className="relative">
                  <input
                    type="tel"
                    value={mobileNumber}
                    onChange={(e) => setMobileNumber(e.target.value)}
                    placeholder="e.g. +91 9876543210"
                    className={`w-full transition-colors duration-300 ${
                      isDark 
                        ? 'bg-slate-900 border-slate-800 text-white placeholder-slate-600 focus:border-indigo-500' 
                        : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:border-indigo-600 shadow-sm'
                    } rounded-xl px-4 py-2.5 text-xs focus:outline-none font-mono`}
                  />
                  <Phone className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-500" />
                </div>
              </div>

              {/* Password & Confirm Password */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={`text-xs font-medium ${isDark ? 'text-slate-300' : 'text-slate-600'} block mb-1`}>
                    Password *
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className={`w-full transition-colors duration-300 ${
                        isDark 
                          ? 'bg-slate-900 border-slate-800 text-white placeholder-slate-600 focus:border-indigo-500' 
                          : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:border-indigo-600 shadow-sm'
                      } rounded-xl px-4 py-2.5 text-xs focus:outline-none font-mono`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className={`text-xs font-medium ${isDark ? 'text-slate-300' : 'text-slate-600'} block mb-1`}>
                    Confirm Password *
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className={`w-full transition-colors duration-300 ${
                        isDark 
                          ? 'bg-slate-900 border-slate-800 text-white placeholder-slate-600 focus:border-indigo-500' 
                          : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:border-indigo-600 shadow-sm'
                      } rounded-xl px-4 py-2.5 text-xs focus:outline-none font-mono`}
                    />
                  </div>
                </div>
              </div>

              {/* Terms Checkbox */}
              <label className="flex items-start gap-2 cursor-pointer text-xs text-slate-400 pt-1">
                <input
                  type="checkbox"
                  checked={acceptedTerms}
                  onChange={(e) => setAcceptedTerms(e.target.checked)}
                  className="rounded border-slate-800 bg-slate-900 text-indigo-600 focus:ring-0 mt-0.5"
                />
                <span>I agree to the Log Sheet Muster security policies, data privacy terms, and enterprise audit protocols.</span>
              </label>

              {error && (
                <div className="p-3 bg-rose-950/80 border border-rose-800 rounded-xl text-xs text-rose-300 flex items-start gap-2 animate-in fade-in">
                  <AlertCircle className="w-4 h-4 text-rose-400 mt-0.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading || (!isSuperAdminEmail && !verifiedCompany)}
                className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold py-3 px-4 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 transition text-sm mt-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Registering Enterprise Account...</span>
                  </>
                ) : (
                  <>
                    <span>Create Account & Submit for Approval</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
