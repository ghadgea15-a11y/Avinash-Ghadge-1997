const fs = require('fs');
let f1 = fs.readFileSync('src/services/bpmIntegrationService.ts', 'utf8');
f1 = f1.replace(/let reqData = null;/g, 'let reqData: any = null;');
f1 = f1.replace(/let balanceData = null;/g, 'let balanceData: any = null;');
fs.writeFileSync('src/services/bpmIntegrationService.ts', f1);
