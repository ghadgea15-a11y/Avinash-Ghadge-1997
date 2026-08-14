const fs = require('fs');
let code = fs.readFileSync('src/components/screens/LoginScreen.tsx', 'utf8');

const startPattern = /        \{\/\* Login Form \*\/\}/;
const endPattern = /        \{\/\* Google Authentication Button \*\/\}/;

const startIndex = code.search(startPattern);
const endIndex = code.search(endPattern);

if (startIndex !== -1 && endIndex !== -1) {
  const replacement = `        {/* Login Form */}
        <form onSubmit={handleLogin} className="space-y-3">
          <div>
            <label className={\`text-xs font-medium \${isDark ? 'text-slate-300' : 'text-slate-600'} block mb-1\`}>
              Email Address
            </label>
            <div className="relative">
              <input
                type="email"
                value={emailOrId}
                onChange={(e) => setEmailOrId(e.target.value)}
                placeholder="name@company.com"
                className={\`w-full transition-colors duration-300 \${
                  isDark 
                    ? 'bg-slate-900 border-slate-800 text-white placeholder-slate-600 focus:border-indigo-500' 
                    : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:border-indigo-600 shadow-sm'
                } rounded-xl px-4 py-2.5 text-xs focus:outline-none font-mono\`}
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500">
                <Mail className="w-4 h-4" />
              </div>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className={\`text-xs font-medium \${isDark ? 'text-slate-300' : 'text-slate-600'}\`}>
                Password
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
                maxLength={64}
                placeholder="••••••••"
                className={\`w-full transition-colors duration-300 \${
                  isDark 
                    ? 'bg-slate-900 border-slate-800 text-white placeholder-slate-600 focus:border-indigo-500' 
                    : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:border-indigo-600 shadow-sm'
                } rounded-xl px-4 py-2.5 text-xs focus:outline-none font-mono tracking-widest\`}
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

          <div>
            <label className={\`text-xs font-medium \${isDark ? 'text-slate-300' : 'text-slate-600'} block mb-1\`}>
              Company Code / Agency Identifier
            </label>
            <div className="relative">
              <input
                type="text"
                value={companyCode}
                onChange={(e) => setCompanyCode(e.target.value.toUpperCase())}
                placeholder="e.g. APEX-SEC-101"
                className={\`w-full transition-colors duration-300 \${
                  isDark 
                    ? 'bg-slate-900 border-slate-800 text-white placeholder-slate-600 focus:border-indigo-500' 
                    : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:border-indigo-600 shadow-sm'
                } rounded-xl px-4 py-2.5 text-xs focus:outline-none font-mono uppercase tracking-wider\`}
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500">
                <Building2 className="w-4 h-4" />
              </div>
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
            className={\`w-full font-semibold py-3 px-4 rounded-xl flex items-center justify-center gap-2 shadow-lg transition text-sm mt-4 bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/30 disabled:opacity-50\`}
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

`;
  
  code = code.substring(0, startIndex) + replacement + code.substring(endIndex);
  fs.writeFileSync('src/components/screens/LoginScreen.tsx', code);
  console.log('Successfully replaced login form.');
} else {
  console.log('Pattern not found.');
}
