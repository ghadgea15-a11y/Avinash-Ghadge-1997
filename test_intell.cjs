const fs = require('fs');
let code = fs.readFileSync('src/services/enterpriseIntelligenceService.ts', 'utf-8');
console.log(code.substring(0, 200));
