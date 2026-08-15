const fs = require('fs');
let code = fs.readFileSync('src/services/entitlementService.ts', 'utf8');

// Replace the incorrect entDocRef
code = code.replace(
  /const entDocRef = doc\(db, ENTITLEMENTS_COLLECTION, \`\\\$\\{companyId\\}_\\\$\\{moduleId\\}\`\);/g,
  `const entDocRef = doc(db, 'companies', companyId, 'entitlements', moduleId);`
);

fs.writeFileSync('src/services/entitlementService.ts', code);
