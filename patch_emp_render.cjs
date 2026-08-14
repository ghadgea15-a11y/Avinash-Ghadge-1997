const fs = require('fs');
let file = fs.readFileSync('src/components/screens/EmployeeModuleScreen.tsx', 'utf8');

file = file.replace(
  "{activeTab === 'REGISTER' && (",
  "{activeTab === 'REGISTER' && canManageEmployees && ("
);

file = file.replace(
  "{activeTab === 'APPROVALS' && (",
  "{activeTab === 'APPROVALS' && canApproveOnboarding && ("
);

// Also reset tab if permissions change
const effectCode = `  // Subscriptions
  useEffect(() => {
    if (!canManageEmployees && activeTab === 'REGISTER') setActiveTab('DIRECTORY');
    if (!canApproveOnboarding && activeTab === 'APPROVALS') setActiveTab('DIRECTORY');
  }, [canManageEmployees, canApproveOnboarding, activeTab]);

  useEffect(() => {`;

file = file.replace('  // Subscriptions\n  useEffect(() => {', effectCode);

fs.writeFileSync('src/components/screens/EmployeeModuleScreen.tsx', file);
console.log('Employee render patched');
