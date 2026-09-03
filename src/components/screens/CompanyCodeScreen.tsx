import React, { useState } from 'react';
import { Building2, QrCode, CheckCircle2, AlertCircle, Loader2, ArrowRight, ShieldCheck, Sparkles } from 'lucide-react';
import { CompanyTenant, PhaseAScreen } from '../../types';
import { FirebaseAuthService } from '../../services/firebaseAuthService';
import { SessionManager } from '../../services/sessionManager';
import { AppLogo } from '../common/AppLogo';
import { useTheme } from '../../context/ThemeContext';

interface CompanyCodeScreenProps {
  onCompanyVerified: (company: CompanyTenant) => void;
  onNavigate: (screen: PhaseAScreen) => void;
  initialCode?: string;
}

export const CompanyCodeScreen: React.FC<CompanyCodeScreenProps> = ({
  onCompanyVerified,
  onNavigate,
  initialCode = ''
}) => {
  const { isDark } = useTheme();
  const [companyCode, setCompanyCode] = useState(initialCode);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verifiedCompany, setVerifiedCompany] = useState<CompanyTenant | null>(null);


  const handleVerify = async (codeToTest?: string) => {
    const code = (codeToTest || companyCode).trim().toUpperCase();
    if (!code) {
      setError('Please enter your Company Code.');
      return;
    }

    // Platform Owner / Global Admin Interception
    if (code === 'GLOBAL-ADMIN' || code === 'GLOBAL_ADMIN') {
      onNavigate('PLATFORM_LOGIN');
      return;
    }

    setLoading(true);
    setError(null);
    setVerifiedCompany(null);

    try {
      const company = await FirebaseAuthService.verifyCompanyCode(code);
      setVerifiedCompany(company);
      SessionManager.setActiveCompany(company);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to verify company code. Please check your network or try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleProceedToLogin = () => {
    if (verifiedCompany) {
      onCompanyVerified(verifiedCompany);
      onNavigate('LOGIN');
    }
  };

  return (
    <div className={`flex-1 transition-colors duration-300 ${isDark ? 'bg-slate-950 text-slate-100' : 'bg-white text-black'} flex flex-col justify-between p-6`}>
      <div className="space-y-6">
        {/* Header */}
        <div className="pt-2 text-center">
          <div className={`w-14 h-14 rounded-2xl ${isDark ? 'bg-indigo-950 border-indigo-800 text-indigo-400' : 'bg-indigo-50 border-indigo-200 text-indigo-600'} border flex items-center justify-center mx-auto mb-3 shadow-lg`}>
            <Building2 className="w-7 h-7" />
          </div>
          <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-black'}`}>Enter Company Code</h2>
          <p className="text-xs text-slate-400 mt-1">
            Connect Log Sheet Muster to your agency's tenant workspace
          </p>
        </div>

        {/* Form Input */}
        <div className="space-y-3">
          <label className={`text-xs font-semibold ${isDark ? 'text-slate-300' : 'text-slate-600'} block`}>
            Confidential Company Security Code
          </label>
          <div className="relative">
            <input
              type="password"
              value={companyCode}
              onChange={(e) => {
                setCompanyCode(e.target.value.toUpperCase());
                setError(null);
              }}
              placeholder="Enter your confidential company code"
              autoComplete="off"
              className={`w-full transition-colors duration-300 ${
                isDark 
                  ? 'bg-slate-900 border-slate-800 text-white placeholder-slate-600 focus:border-indigo-500' 
                  : 'bg-white border-slate-200 text-black placeholder-slate-400 focus:border-indigo-600 shadow-sm'
              } rounded-xl px-4 py-3 text-sm font-mono focus:outline-none uppercase tracking-wider`}
            />
          </div>

          {error && (
            <div className="p-3 bg-rose-950/80 border border-rose-800 rounded-xl text-xs text-rose-300 flex items-start gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-400 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Verified Company Card Preview */}
        {verifiedCompany && (
          <div className="bg-indigo-950/40 border border-indigo-500/40 rounded-2xl p-4 space-y-3 animate-in zoom-in-95 duration-200 shadow-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                  Company Verified
                </span>
              </div>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-indigo-900 text-indigo-200 border border-indigo-700">
                {verifiedCompany.licenseTier} TIER
              </span>
            </div>

            <div className="py-2 flex items-center justify-center">
              <AppLogo size="lg" company={verifiedCompany} layout="vertical" />
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-indigo-900/60">
              <div>
                <span className="text-slate-400">Tenant Code:</span>
                <p className="text-slate-200 font-mono font-medium">{verifiedCompany.companyId}</p>
              </div>
              <div>
                <span className="text-slate-400">Guard Capacity:</span>
                <p className="text-slate-200 font-medium">{verifiedCompany.maxEmployeesAllowed.toLocaleString()} Guards</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="pt-6 border-t border-slate-900 space-y-3">
        {!verifiedCompany ? (
          <>
            <button
              onClick={() => handleVerify()}
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold py-3 px-4 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 transition text-sm"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Verifying Company Tenant...</span>
                </>
              ) : (
                <>
                  <span>Verify Company Code</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={() => onNavigate('PLATFORM_LOGIN')}
                className={`inline-flex items-center gap-1.5 text-xs font-semibold ${
                  isDark ? 'text-amber-400 hover:text-amber-300' : 'text-amber-700 hover:text-amber-800'
                } transition-colors`}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                Platform Owner or Global Admin? Access Platform Portal &rarr;
              </button>
            </div>
          </>
        ) : (
          <button
            onClick={handleProceedToLogin}
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-3 px-4 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 transition text-sm"
          >
            <span>Proceed to Login</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};
