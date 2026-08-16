const fs = require('fs');

function fixArgs(filePath) {
  let text = fs.readFileSync(filePath, 'utf8');
  text = text.replace(/subscribeToEmployees\(userSession, activeCompany\.companyId,/g, 'subscribeToEmployees(activeCompany.companyId,');
  text = text.replace(/subscribeToSites\(userSession, activeCompany\.companyId,/g, 'subscribeToSites(activeCompany.companyId,');
  fs.writeFileSync(filePath, text);
}

fixArgs('src/components/screens/DeploymentManagementScreen.tsx');
fixArgs('src/components/screens/ShiftRosterScreen.tsx');
