const fs = require('fs');
let code = fs.readFileSync('src/services/scmService.ts', 'utf8');

// Fix TS compilation issue with evaluateThreshold logic
code = code.replace(
  "if (oldStatus !== newStatus && item.notificationEnabled && newStatus !== 'NORMAL' && newStatus !== 'OVER_STOCK') {",
  "if (oldStatus !== newStatus && item.notificationEnabled && newStatus !== 'OVER_STOCK') {"
);

// Fix iDoc used before definition
const iDocFix = `
            const iRef = doc(db, 'companies', companyId, 'inventory_items', rLine.itemId);
            const iDoc = await t.get(iRef);
            
            const itemData = (typeof iDoc !== 'undefined' && iDoc.exists()) ? iDoc.data() : null;
            let statusStr = undefined;
            if (itemData) statusStr = await ScmService.handleThresholdAlerts(t, session, companyId, bRef.id.split('_')[0], itemData as InventoryItemRecord, pBal, nBal);
            t.set(bRef, { quantity: nBal, status: statusStr, lastUpdatedAt: new Date().toISOString() }, { merge: true });
`;
code = code.replace(
  `const itemData = (typeof iDoc !== 'undefined' && iDoc.exists()) ? iDoc.data() : null;
          let statusStr = undefined;
          if (itemData) statusStr = await ScmService.handleThresholdAlerts(t, session, companyId, bRef.id.split('_')[0], itemData as InventoryItemRecord, pBal, nBal);
          t.set(bRef, { quantity: nBal, status: statusStr, lastUpdatedAt: new Date().toISOString() }, { merge: true });`,
  iDocFix
);

// Remove the redundant fetch
code = code.replace(
  `const iRef = doc(db, 'companies', companyId, 'inventory_items', rLine.itemId);
            const iDoc = await t.get(iRef);
            if (iDoc.exists()) {
              t.update(iRef, { currentStock: (iDoc.data().currentStock || 0) + rLine.returnedQuantity });
            }`,
  `if (iDoc && iDoc.exists()) {
              t.update(iRef, { currentStock: (iDoc.data().currentStock || 0) + rLine.returnedQuantity });
            }`
);

fs.writeFileSync('src/services/scmService.ts', code);
