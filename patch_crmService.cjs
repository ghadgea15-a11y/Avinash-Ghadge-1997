const fs = require('fs');
let code = fs.readFileSync('src/services/crmService.ts', 'utf8');

code = code.replace(
  "    await this.logAudit(companyId, \\`contract.\\${status.toLowerCase()}\\`, clientId, contractId, userId, userName);",
  "    await this.logAudit(companyId, `contract.${status.toLowerCase()}`, clientId, contractId, userId, userName);"
);

fs.writeFileSync('src/services/crmService.ts', code);
