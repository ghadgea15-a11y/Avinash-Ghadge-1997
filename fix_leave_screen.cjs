const fs = require('fs');
let f1 = fs.readFileSync('src/components/screens/LeaveManagementScreen.tsx', 'utf8');
f1 = f1.replace(/\{activeTab === 'DASHBOARD' \| 'ABSENCE' \| 'APPROVALS' \| 'LEDGER' \| 'POLICIES' \| 'HOLIDAYS'&& \(/g, "{activeTab === 'DASHBOARD' && (");
fs.writeFileSync('src/components/screens/LeaveManagementScreen.tsx', f1);
