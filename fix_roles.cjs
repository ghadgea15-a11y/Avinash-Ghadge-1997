const fs = require('fs');
let content = fs.readFileSync('src/services/contractExpiryEngine.ts', 'utf8');

content = content.replace(
  "roleScope: ['SUPER_ADMIN', 'COMPANY_ADMIN', 'MANAGER']",
  "roleScope: ['SUPER_ADMIN', 'COMPANY_ADMIN', 'OPS_MANAGER']"
);

fs.writeFileSync('src/services/contractExpiryEngine.ts', content);
