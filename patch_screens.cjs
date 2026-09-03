const fs = require('fs');

function patchFile(filepath) {
  let file = fs.readFileSync(filepath, 'utf8');
  file = file.replace(/currentCompany\.id/g, 'currentCompany.companyId');
  file = file.replace(/activeCompany\.id/g, 'activeCompany.companyId');
  file = file.replace(/userSession\.name/g, '(userSession.fullName || userSession.email)');
  fs.writeFileSync(filepath, file);
}

patchFile('src/components/screens/EnterpriseIntegrationScreen.tsx');
patchFile('src/components/screens/ExpenseTravelScreen.tsx');
patchFile('src/components/screens/PerformanceManagementScreen.tsx');
console.log('Patched screens');
