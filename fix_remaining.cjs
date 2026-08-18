const fs = require('fs');

let f1 = fs.readFileSync('src/components/screens/DeploymentManagementScreen.tsx', 'utf8');
f1 = f1.replace(/legalName: ''/g, "clientName: ''"); // revert the bad replace
f1 = f1.replace(/client\?\.clientName/g, "client?.legalName");
f1 = f1.replace(/c\.clientName/g, "c.legalName");
fs.writeFileSync('src/components/screens/DeploymentManagementScreen.tsx', f1);

let f2 = fs.readFileSync('src/components/screens/ServiceDeskScreen.tsx', 'utf8');
f2 = f2.replace(/client\?\.clientName/g, "client?.legalName");
f2 = f2.replace(/c\.clientName/g, "c.legalName");
fs.writeFileSync('src/components/screens/ServiceDeskScreen.tsx', f2);

let f3 = fs.readFileSync('src/services/crmService.ts', 'utf8');
f3 = f3.replace(/actorUid/g, "actorId");
fs.writeFileSync('src/services/crmService.ts', f3);
