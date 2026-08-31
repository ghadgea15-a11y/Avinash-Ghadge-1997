const fs = require('fs');

function patch(file, regex, replacement) {
  if (!fs.existsSync(file)) return;
  let content = fs.readFileSync(file, 'utf8');
  if (regex.test(content)) {
    content = content.replace(regex, replacement);
    fs.writeFileSync(file, content);
  }
}

patch('src/components/screens/SuperAdminManagementScreen.tsx', /\/\*newAdminUid\*\//g, "''");
patch('src/components/screens/SuperAdminManagementScreen.tsx', /\/\*setNewAdminUid\*\//g, "const noop = ");

patch('src/services/operationalIntelligenceEngine.ts', /\/\* targetId: \*\/ log\.id,/g, "");

