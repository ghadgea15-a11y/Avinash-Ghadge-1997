const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

if (!code.includes('import { CompanyBillingScreen }')) {
  code = code.replace(
    /import \{ EnterpriseDashboardScreen \} from '\.\/components\/screens\/EnterpriseDashboardScreen';/,
    `import { EnterpriseDashboardScreen } from './components/screens/EnterpriseDashboardScreen';\nimport { CompanyBillingScreen } from './components/screens/CompanyBillingScreen';`
  );
}

if (!code.includes("currentScreen === 'COMPANY_BILLING'")) {
  code = code.replace(
    /\{currentScreen === 'ENTERPRISE_DASHBOARD' && \(/,
    `{currentScreen === 'COMPANY_BILLING' && (
      <CompanyBillingScreen
        userSession={userSession!}
        onNavigate={setCurrentScreen}
      />
    )}\n    {currentScreen === 'ENTERPRISE_DASHBOARD' && (`
  );
}

fs.writeFileSync('src/App.tsx', code);

// Now patch EnterpriseDashboardScreen.tsx to add the button
let dashboard = fs.readFileSync('src/components/screens/EnterpriseDashboardScreen.tsx', 'utf8');
if (!dashboard.includes("onNavigate('COMPANY_BILLING')")) {
  dashboard = dashboard.replace(
    /<div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-500\/10 flex items-center justify-center text-blue-600 dark:text-blue-400 mb-3 group-hover:scale-110 transition-transform">/,
    `<div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center text-blue-600 dark:text-blue-400 mb-3 group-hover:scale-110 transition-transform">`
  ); // just ensuring it's there
  
  const billingButton = `
          <button onClick={() => onNavigate('COMPANY_BILLING')} className="flex flex-col items-center justify-center p-4 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors text-center group">
            <div className="w-10 h-10 rounded-full bg-purple-50 dark:bg-purple-500/10 flex items-center justify-center text-purple-600 dark:text-purple-400 mb-3 group-hover:scale-110 transition-transform">
              <Shield className="w-5 h-5" />
            </div>
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Billing & Plan</span>
          </button>
  `;

  dashboard = dashboard.replace(
    /import \{ Users, Clock, Building, FileText, ChevronRight, Activity, Calendar, UserCheck \} from 'lucide-react';/,
    `import { Users, Clock, Building, FileText, ChevronRight, Activity, Calendar, UserCheck, Shield } from 'lucide-react';`
  );

  dashboard = dashboard.replace(
    /\{moduleAccess\.COMPANY_MANAGEMENT && \(/,
    `${billingButton}\n          {moduleAccess.COMPANY_MANAGEMENT && (`
  );
  
  fs.writeFileSync('src/components/screens/EnterpriseDashboardScreen.tsx', dashboard);
}
