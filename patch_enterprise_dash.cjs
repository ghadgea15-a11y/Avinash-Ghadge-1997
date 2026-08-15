const fs = require('fs');
let code = fs.readFileSync('src/components/screens/EnterpriseDashboardScreen.tsx', 'utf8');

const subCard = `
  const renderSubscriptionCard = () => {
    if (userSession.role !== 'COMPANY_ADMIN') return null;
    
    return (
      <div className="bg-gradient-to-br from-indigo-900 to-slate-900 rounded-2xl p-6 text-white mb-6 relative overflow-hidden shadow-lg border border-indigo-500/30">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="px-3 py-1 bg-indigo-500/30 text-indigo-200 text-xs font-bold tracking-wider rounded-md uppercase border border-indigo-500/30">
                Professional Plan
              </span>
              <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs font-bold rounded-md uppercase flex items-center gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-green-400"></div>
                ACTIVE
              </span>
            </div>
            <h3 className="text-2xl font-bold text-white mb-1">Company Subscription</h3>
            <p className="text-indigo-200 text-sm">Renewal: 15 September 2026 (30 days remaining)</p>
          </div>
          
          <div className="flex gap-4">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/10">
              <p className="text-indigo-200 text-xs mb-1">Employees Usage</p>
              <p className="text-lg font-semibold text-white">{employees.length} / 250</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/10">
              <p className="text-indigo-200 text-xs mb-1">Modules</p>
              <p className="text-lg font-semibold text-white">8 Active</p>
            </div>
          </div>
          
          <div>
            <button className="w-full md:w-auto px-5 py-2.5 bg-white text-indigo-900 text-sm font-bold rounded-xl hover:bg-indigo-50 transition shadow-lg">
              Manage Billing
            </button>
          </div>
        </div>
      </div>
    );
  };
`;

if (!code.includes('renderSubscriptionCard')) {
  // insert before renderStats
  code = code.replace(/const renderStats = \(\) => {/, subCard + '\n  const renderStats = () => {');
  
  // insert inside the return of EnterpriseDashboardScreen
  code = code.replace(
    /<div className="max-w-7xl mx-auto space-y-6">/,
    `<div className="max-w-7xl mx-auto space-y-6">\n        {renderSubscriptionCard()}`
  );
}

fs.writeFileSync('src/components/screens/EnterpriseDashboardScreen.tsx', code);
