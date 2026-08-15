const fs = require('fs');
let code = fs.readFileSync('src/services/entitlementService.ts', 'utf8');

code = code.replace(
  /const entDocRef = doc\(db, ENTITLEMENTS_COLLECTION, \`\\\$\\{companyId\\}_\\\$\\{moduleId\\}\`\);/,
  `const entDocRef = doc(db, 'companies', companyId, 'entitlements', moduleId);`
);
code = code.replace(
  /const SUBSCRIPTIONS_COLLECTION = 'company_subscriptions';/,
  `const SUBSCRIPTIONS_COLLECTION = 'subscriptions';`
);

fs.writeFileSync('src/services/entitlementService.ts', code);
