const fs = require('fs');
let code = fs.readFileSync('src/services/queryScopeEngine.ts', 'utf8');

code = code.replace(
  /'EMPLOYEES' \| 'ATTENDANCE' \| 'LEAVES' \| 'ASSETS' \| 'INCIDENTS' \| 'VISITORS' \| 'MATERIALS' \| 'PAYROLL' \| 'APPROVALS' \| 'TASKS' \| 'ANNOUNCEMENTS' \| 'DOCUMENTS' \| 'LOGS'/g,
  `'EMPLOYEES' | 'ATTENDANCE' | 'LEAVES' | 'ASSETS' | 'INCIDENTS' | 'VISITORS' | 'MATERIALS' | 'PAYROLL' | 'APPROVALS' | 'TASKS' | 'ANNOUNCEMENTS' | 'DOCUMENTS' | 'LOGS' | 'CLIENTS' | 'DEPLOYMENTS' | 'SHIFT_ROSTERS'`
);

// We need to add rules for 'CLIENTS', 'DEPLOYMENTS', 'SHIFT_ROSTERS'
code = code.replace(/else if \(\['ATTENDANCE', 'INCIDENTS', 'VISITORS', 'MATERIALS', 'LEAVES', 'ASSETS', 'TASKS', 'ANNOUNCEMENTS', 'DOCUMENTS', 'LOGS'\]\.includes\(collectionType\)\)/g, 
"else if (['ATTENDANCE', 'INCIDENTS', 'VISITORS', 'MATERIALS', 'LEAVES', 'ASSETS', 'TASKS', 'ANNOUNCEMENTS', 'DOCUMENTS', 'LOGS', 'DEPLOYMENTS', 'SHIFT_ROSTERS'].includes(collectionType))");

// Clients are global? 
// Yes, Regional managers can only see clients in their region?
// Let's not restrict clients yet unless needed. We'll fallback to returning constraints directly.

fs.writeFileSync('src/services/queryScopeEngine.ts', code);
