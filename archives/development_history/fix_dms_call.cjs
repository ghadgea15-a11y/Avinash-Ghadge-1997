const fs = require('fs');

let code = fs.readFileSync('src/components/screens/DeploymentManagementScreen.tsx', 'utf8');
code = code.replace(
  /await FirestoreService.saveDeployment\(activeCompany.companyId, deployment, oldDeployment\);/g,
  `await FirestoreService.saveDeployment(userSession, activeCompany.companyId, deployment, oldDeployment);`
);

fs.writeFileSync('src/components/screens/DeploymentManagementScreen.tsx', code);
