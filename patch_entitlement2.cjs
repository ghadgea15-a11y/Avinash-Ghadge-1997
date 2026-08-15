const fs = require('fs');
let code = fs.readFileSync('src/services/entitlementService.ts', 'utf8');

// Replace the subcollection logic properly
const newContent = code.replace(
  /const entDocRef = doc\(db, ENTITLEMENTS_COLLECTION, \`\S+\`\);/,
  "const entDocRef = doc(db, 'companies', companyId, 'entitlements', moduleId);"
);
fs.writeFileSync('src/services/entitlementService.ts', newContent);
