const fs = require('fs');

// 1. Fix ClientDirectoryTab.tsx
let f1 = fs.readFileSync('src/components/crm/ClientDirectoryTab.tsx', 'utf8');
f1 = f1.replace(/session\.uid/g, 'session.userId');
f1 = f1.replace(/session\.displayName \|\| session\.email/g, 'session.fullName || session.email');
fs.writeFileSync('src/components/crm/ClientDirectoryTab.tsx', f1);

// 2. Fix ContractRegisterTab.tsx
let f2 = fs.readFileSync('src/components/crm/ContractRegisterTab.tsx', 'utf8');
f2 = f2.replace(/session\.uid/g, 'session.userId');
f2 = f2.replace(/session\.displayName \|\| session\.email/g, 'session.fullName || session.email');
fs.writeFileSync('src/components/crm/ContractRegisterTab.tsx', f2);

// 3. Fix OfficialStaffDashboard.tsx
let f3 = fs.readFileSync('src/components/screens/dashboards/OfficialStaffDashboard.tsx', 'utf8');
f3 = f3.replace(/import \{ CrmModule \} from '\.\.\/\.\.\/crm\/CrmModule';/, "import { CrmModule } from '../../crm/CrmModule';");
f3 = f3.replace(/<CrmModule session=\{props\.userSession\} company=\{props\.activeCompany\} \/>/g, "<CrmModule session={props.userSession} company={props.company} />");
fs.writeFileSync('src/components/screens/dashboards/OfficialStaffDashboard.tsx', f3);

// 4. Fix DeploymentManagementScreen.tsx
let f4 = fs.readFileSync('src/components/screens/DeploymentManagementScreen.tsx', 'utf8');
f4 = f4.replace(/clientName: ''/g, "legalName: ''");
f4 = f4.replace(/client\.clientName/g, "client.legalName");
fs.writeFileSync('src/components/screens/DeploymentManagementScreen.tsx', f4);

// 5. Fix ServiceDeskScreen.tsx
let f5 = fs.readFileSync('src/components/screens/ServiceDeskScreen.tsx', 'utf8');
f5 = f5.replace(/client\.clientName/g, "client.legalName");
fs.writeFileSync('src/components/screens/ServiceDeskScreen.tsx', f5);

// 6. Fix crmService.ts
let f6 = fs.readFileSync('src/services/crmService.ts', 'utf8');
f6 = f6.replace(/AuditLog/g, 'AuditLogRecord');
fs.writeFileSync('src/services/crmService.ts', f6);

