const fs = require('fs');
let code = fs.readFileSync('src/services/enterpriseIntelligenceService.ts', 'utf-8');
code = code.replace("export class EnterpriseIntelligenceEngine {\n  // We will build the methods here\n}", "");
fs.writeFileSync('src/services/enterpriseIntelligenceService.ts', code);
