const fs = require('fs');
let code = fs.readFileSync('src/services/scmService_temp.ts', 'utf8');

const regex = /t\.set\(bRef, \{ quantity: nBal, lastUpdatedAt: new Date\(\)\.toISOString\(\) \}, \{ merge: true \}\);/g;

code = code.replace(regex, `const itemData = (typeof iDoc !== 'undefined' && iDoc.exists()) ? iDoc.data() : null;
          let statusStr = undefined;
          if (itemData) statusStr = await ScmService.handleThresholdAlerts(t, session, companyId, bRef.id.split('_')[0], itemData as InventoryItemRecord, pBal, nBal);
          t.set(bRef, { quantity: nBal, status: statusStr, lastUpdatedAt: new Date().toISOString() }, { merge: true });`);

fs.writeFileSync('src/services/scmService.ts', code);
