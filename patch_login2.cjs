const fs = require('fs');
let code = fs.readFileSync('src/components/screens/LoginScreen.tsx', 'utf8');

const mfaEnrollSubmitCode = `
  const handleMfaEnrollSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mfaCode || mfaCode.length < 6) {
      setMfaError('Please enter a valid 6-digit code.');
      return;
    }
    setLoading(true);
    setMfaError(null);
    try {
      const verifyResult = await TotpService.verifyCode(mfaCode, mfaSetupData.secret);
      if (!verifyResult.isValid) {
        throw new Error(verifyResult.error || 'Invalid code. Please try again.');
      }
      
      const uid = enrollSession.userId;
      await setDoc(doc(db, 'users', uid, 'private', 'mfa'), {
        totpSecret: mfaSetupData.secret,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      
      await setDoc(doc(db, 'users', uid), {
        mfaEnabled: true,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      let resolvedCompany = validatedCompany;
      if (!resolvedCompany || resolvedCompany.companyId !== enrollSession.companyId) {
        if (enrollSession.companyId === 'GLOBAL_ADMIN') {
          resolvedCompany = {
            companyId: 'GLOBAL_ADMIN',
            companyLegalName: 'Super Administration',
            brandName: 'System Core'
          } as any;
        }
      }
      
      SessionManager.setActiveCompany(resolvedCompany as any);
      SessionManager.setUserSession(enrollSession);
      SessionManager.setSavedCredentials(emailOrId.trim(), enrollSession.companyId, rememberMe);
      onLoginSuccess(enrollSession, resolvedCompany as any);

    } catch (err: any) {
      setMfaError(err.message || 'Verification failed.');
    } finally {
      setLoading(false);
    }
  };
`;

code = code.replace(
  "  if (step === 'MFA') {",
  mfaEnrollSubmitCode + "\n  if (step === 'MFA_ENROLL') {\n    return (\n      <div className={`flex-1 transition-colors duration-300 ${isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'} flex flex-col justify-center px-6`}>\n        <div className=\"w-full max-w-sm mx-auto space-y-6\">\n          <div className=\"text-center space-y-2\">\n            <div className=\"inline-flex items-center justify-center w-12 h-12 rounded-xl bg-indigo-500/10 text-indigo-500 mb-2\">\n              <QrCode className=\"w-6 h-6\" />\n            </div>\n            <h2 className=\"text-xl font-bold\">Setup Two-Factor Authentication</h2>\n            <p className=\"text-sm text-slate-500\">\n              Scan the QR code with your authenticator app (Google Authenticator, Authy, etc.).\n            </p>\n          </div>\n          {mfaSetupData && (\n            <div className=\"flex justify-center p-4 bg-white rounded-xl\">\n              <img src={mfaSetupData.qrCodeDataUrl} alt=\"QR Code\" className=\"w-48 h-48\" />\n            </div>\n          )}\n          <form onSubmit={handleMfaEnrollSubmit} className=\"space-y-4\">\n            <div>\n              <label className={`text-xs font-medium ${isDark ? 'text-slate-300' : 'text-slate-600'} block mb-1`}>\n                Enter 6-digit Code\n              </label>\n              <input\n                type=\"text\"\n                value={mfaCode}\n                onChange={(e) => {\n                  setMfaCode(e.target.value.replace(/[^0-9]/g, ''));\n                  setMfaError(null);\n                }}\n                maxLength={6}\n                placeholder=\"000000\"\n                className={`w-full transition-colors duration-300 ${isDark ? 'bg-slate-900 border-slate-800 text-white placeholder-slate-600 focus:border-indigo-500' : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:border-indigo-600 shadow-sm'} rounded-xl px-4 py-2.5 text-center text-2xl tracking-[0.5em] focus:outline-none font-mono`}\n              />\n            </div>\n            {mfaError && (\n              <div className=\"p-3 bg-rose-950/80 border border-rose-800 rounded-xl text-xs text-rose-300 flex items-start gap-2 animate-in fade-in\">\n                <AlertCircle className=\"w-4 h-4 text-rose-400 mt-0.5 shrink-0\" />\n                <span>{mfaError}</span>\n              </div>\n            )}\n            <button\n              type=\"submit\"\n              disabled={loading || mfaCode.length < 6}\n              className={`w-full font-semibold py-3 px-4 rounded-xl flex items-center justify-center gap-2 shadow-lg transition text-sm mt-4 bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/30 disabled:opacity-50`}\n            >\n              {loading ? (\n                <><Loader2 className=\"w-4 h-4 animate-spin\" /><span>Verifying...</span></>\n              ) : (\n                <><ShieldCheck className=\"w-4 h-4\" /><span>Enable MFA</span></>\n              )}\n            </button>\n          </form>\n        </div>\n      </div>\n    );\n  }\n\n  if (step === 'MFA') {"
);

fs.writeFileSync('src/components/screens/LoginScreen.tsx', code);
console.log('LoginScreen patched.');
