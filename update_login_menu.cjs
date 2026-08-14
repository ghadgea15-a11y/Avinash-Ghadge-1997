const fs = require('fs');

let ls = fs.readFileSync('src/components/screens/LoginScreen.tsx', 'utf8');

// Import Menu and X from lucide-react if not present
if (!ls.includes('Menu,')) {
  ls = ls.replace(/RefreshCw\n\} from 'lucide-react';/, "RefreshCw,\n  Menu,\n  X\n} from 'lucide-react';");
}

// Add state for menu
ls = ls.replace(/const \[isBiometricOpen, setIsBiometricOpen\] = useState\(false\);/, "const [isBiometricOpen, setIsBiometricOpen] = useState(false);\n  const [isMenuOpen, setIsMenuOpen] = useState(false);");

// Remove the bottom options
const googleStart = ls.indexOf('{/* Google Authentication Button */}');
const signUpEnd = ls.indexOf('      <BiometricPromptModal');

if (googleStart !== -1 && signUpEnd !== -1) {
  ls = ls.substring(0, googleStart) + '      </div>\n' + ls.substring(signUpEnd);
}

// Add the menu button at the top
const returnStart = ls.indexOf('return (\n    <div');
const flexDivEnd = ls.indexOf('>', returnStart) + 1;

const menuJSX = `
      {/* Top Right Menu */}
      <div className="absolute top-4 right-4 z-50">
        <button
          type="button"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className={\`p-2 rounded-lg transition-colors \${isDark ? 'bg-slate-900 text-slate-300 hover:bg-slate-800' : 'bg-white text-slate-600 hover:bg-slate-100 shadow-sm border border-slate-200'}\`}
        >
          {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
        
        {isMenuOpen && (
          <div className={\`absolute top-full right-0 mt-2 w-56 rounded-xl shadow-xl border overflow-hidden animate-in slide-in-from-top-2 \${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}\`}>
            <div className="flex flex-col">
              <button
                type="button"
                onClick={() => {
                  setIsMenuOpen(false);
                  handleGoogleLogin();
                }}
                className={\`flex items-center gap-3 px-4 py-3 text-xs font-semibold transition \${isDark ? 'text-slate-200 hover:bg-slate-800' : 'text-slate-700 hover:bg-slate-50'}\`}
              >
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                </svg>
                <span>Continue with Google</span>
              </button>
              
              <div className={\`h-px w-full \${isDark ? 'bg-slate-800' : 'bg-slate-100'}\`} />
              
              <button
                type="button"
                onClick={() => {
                  setIsMenuOpen(false);
                  onNavigate('SIGN_UP');
                }}
                className={\`flex items-center gap-3 px-4 py-3 text-xs font-semibold transition \${isDark ? 'text-slate-200 hover:bg-slate-800' : 'text-slate-700 hover:bg-slate-50'}\`}
              >
                <User className="w-4 h-4 text-indigo-500" />
                <span>Create New Account</span>
              </button>
            </div>
          </div>
        )}
      </div>
`;

ls = ls.substring(0, flexDivEnd) + menuJSX + ls.substring(flexDivEnd);

// Add 'relative' class to the main div
ls = ls.replace(/<div className=\{\`flex-1 transition-colors duration-300 \$\{isDark \? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'\} flex flex-col justify-between p-6\`\>/, "<div className={`relative flex-1 transition-colors duration-300 ${isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'} flex flex-col justify-between p-6`}>");

fs.writeFileSync('src/components/screens/LoginScreen.tsx', ls);
console.log('Updated LoginScreen menu.');
