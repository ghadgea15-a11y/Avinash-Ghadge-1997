const fs = require('fs');

function patch(file) {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/uid: userSession\.uid/g, "uid: userSession.uid || 'system'");
  content = content.replace(/userSession\.fullName \|\| userSession\.email/g, "(userSession.fullName || userSession.email) || 'Unknown'");
  content = content.replace(/name: userSession\.name \|\| 'Admin'/g, "name: (userSession as any).name || 'Admin'");
  fs.writeFileSync(file, content);
}

patch('src/components/screens/EnterpriseIntegrationScreen.tsx');
patch('src/components/screens/ExpenseTravelScreen.tsx');
patch('src/components/screens/PerformanceManagementScreen.tsx');

console.log('Patched');
