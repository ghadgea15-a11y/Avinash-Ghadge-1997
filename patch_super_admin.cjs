const fs = require('fs');
let code = fs.readFileSync('src/components/screens/SuperAdminDashboard.tsx', 'utf8');

// Add SUBSCRIPTIONS to the tabs
code = code.replace(
  `| 'MODULES'`,
  `| 'MODULES' | 'SUBSCRIPTIONS'`
);

code = code.replace(
  `{ id: 'MODULES', label: 'Modules', icon: Settings },`,
  `{ id: 'MODULES', label: 'Modules', icon: Settings },
    { id: 'SUBSCRIPTIONS', label: 'Subscriptions', icon: CreditCard },`
);

if (!code.includes('CreditCard')) {
  code = code.replace(`Building2, `, `Building2, CreditCard, `);
}

// Add the rendering logic for SUBSCRIPTIONS
const subscriptionModule = `
  const renderSubscriptionsTab = () => {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-slate-800 dark:text-white">Subscription Management</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">Manage SaaS plans, billing, and company subscriptions.</p>
          </div>
          <button className="px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 transition">
            Create Plan
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 shadow-sm">
            <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400">Active Subscriptions</h3>
            <p className="text-2xl font-bold text-slate-800 dark:text-white mt-1">12</p>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 shadow-sm">
            <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400">Trial Companies</h3>
            <p className="text-2xl font-bold text-slate-800 dark:text-white mt-1">3</p>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 shadow-sm">
            <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400">Expiring Soon</h3>
            <p className="text-2xl font-bold text-slate-800 dark:text-white mt-1">2</p>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 shadow-sm">
            <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400">Monthly Revenue</h3>
            <p className="text-2xl font-bold text-slate-800 dark:text-white mt-1">₹45,000</p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700">
            <h3 className="font-semibold text-slate-800 dark:text-white">Recent Subscriptions</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400">
                <tr>
                  <th className="px-6 py-3 font-medium">Company</th>
                  <th className="px-6 py-3 font-medium">Plan</th>
                  <th className="px-6 py-3 font-medium">Status</th>
                  <th className="px-6 py-3 font-medium">Renewal Date</th>
                  <th className="px-6 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <td className="px-6 py-4 text-slate-800 dark:text-white font-medium">Apex Security</td>
                  <td className="px-6 py-4 text-slate-600 dark:text-slate-300">Professional</td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400 rounded-md text-xs font-medium">ACTIVE</span>
                  </td>
                  <td className="px-6 py-4 text-slate-600 dark:text-slate-300">2026-09-15</td>
                  <td className="px-6 py-4">
                    <button className="text-indigo-600 hover:text-indigo-700 font-medium">Manage</button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };
`;

if (!code.includes('renderSubscriptionsTab')) {
  code = code.replace(
    `const renderContent = () => {`,
    subscriptionModule + `\n  const renderContent = () => {`
  );

  code = code.replace(
    `case 'MODULES':
        return renderModulesTab();`,
    `case 'MODULES':
        return renderModulesTab();
      case 'SUBSCRIPTIONS':
        return renderSubscriptionsTab();`
  );
}

fs.writeFileSync('src/components/screens/SuperAdminDashboard.tsx', code);
