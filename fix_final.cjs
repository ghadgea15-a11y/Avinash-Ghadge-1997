const fs = require('fs');

// 1. OfficialStaffDashboard
let f1 = fs.readFileSync('src/components/screens/dashboards/OfficialStaffDashboard.tsx', 'utf8');
f1 = f1.replace(
  "import { DepartmentGenericDashboard } from './official/DepartmentGenericDashboard';",
  "import { DepartmentGenericDashboard } from './official/DepartmentGenericDashboard';\nimport { CrmModule } from '../../crm/CrmModule';"
);
fs.writeFileSync('src/components/screens/dashboards/OfficialStaffDashboard.tsx', f1);

// 2. ServiceDeskScreen
let f2 = fs.readFileSync('src/components/screens/ServiceDeskScreen.tsx', 'utf8');
f2 = f2.replace(/client\.clientName/g, "client.legalName");
fs.writeFileSync('src/components/screens/ServiceDeskScreen.tsx', f2);

// 3. crmService
let f3 = fs.readFileSync('src/services/crmService.ts', 'utf8');
f3 = f3.replace(
  "details: { clientId, contractId },",
  "details: JSON.stringify({ clientId, contractId }),"
);
fs.writeFileSync('src/services/crmService.ts', f3);

