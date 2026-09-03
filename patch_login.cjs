const fs = require('fs');
let file = fs.readFileSync('src/components/screens/LoginScreen.tsx', 'utf8');

if (!file.includes('const [ssoConfig')) {
  file = file.replace("const [validatingCompany, setValidatingCompany] = useState(false);",
    "const [validatingCompany, setValidatingCompany] = useState(false);\n  const [ssoConfig, setSsoConfig] = useState<any | null>(null);");
}

file = file.replace(/const comp = await FirebaseAuthService\.verifyCompanyCode\(companyCode\.trim\(\)\);/,
  `const comp = await FirebaseAuthService.verifyCompanyCode(companyCode.trim());
      try {
        const { IntegrationService } = await import('../../services/integrationService');
        const sso = await IntegrationService.getSsoConfig(comp.companyId);
        if (sso && sso.isEnabled) {
           setSsoConfig(sso);
        }
      } catch(e) {}`);

const importSso = `
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
        SessionManager.saveSession(res.userSession);
        onLoginSuccess(res.userSession);
      } else if (res.accountStatus === 'PENDING') {
        throw new Error('SSO Auth successful, but account requires Admin approval.');
      }
    } catch (err: any) {
      setError(err.message || 'SSO Login failed.');
      setGoogleLoading(false);
    }
  };
`;

if (!file.includes('handleSsoLogin')) {
  file = file.replace("const handleGoogleLogin = async () => {", importSso + "\n  const handleGoogleLogin = async () => {");
}

const ssoBtn = `
                {ssoConfig && (
                  <button
                    type="button"
                    disabled={googleLoading || loading}
                    onClick={handleSsoLogin}
                    className="w-full relative flex items-center justify-center gap-3 bg-white border border-slate-300 text-slate-700 py-3 rounded-xl font-semibold hover:bg-slate-50 transition shadow-sm disabled:opacity-50"
                  >
                    {googleLoading ? (
                      <RefreshCw className="w-5 h-5 animate-spin text-slate-400" />
                    ) : (
                      <ShieldCheck className="w-5 h-5 text-indigo-600" />
                    )}
                    <span>Continue with {ssoConfig.displayName || 'Enterprise SSO'}</span>
                  </button>
                )}
`;

if (!file.includes('handleSsoLogin}')) {
  file = file.replace(/<button\s+type="button"\s+disabled=\{googleLoading \|\| loading\}\s+onClick=\{handleGoogleLogin\}/,
    ssoBtn + "\n                  <button\n                    type=\"button\"\n                    disabled={googleLoading || loading}\n                    onClick={handleGoogleLogin}");
}

fs.writeFileSync('src/components/screens/LoginScreen.tsx', file);
console.log('Patched login');
