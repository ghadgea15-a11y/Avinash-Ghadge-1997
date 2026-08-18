const fs = require('fs');
let content = fs.readFileSync('src/services/billingRateService.ts', 'utf8');

content = content.replace("a.status === 'PRESENT' && a.totalHours", "a.status === 'PRESENT' && a.workedMinutes");
content = content.replace("qty = matchingAtt.reduce((sum, a) => sum + (a.totalHours || 0), 0);", "qty = matchingAtt.reduce((sum, a) => sum + (a.workedMinutes ? a.workedMinutes / 60 : 0), 0);");

fs.writeFileSync('src/services/billingRateService.ts', content);
