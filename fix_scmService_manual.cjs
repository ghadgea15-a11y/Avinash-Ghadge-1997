const fs = require('fs');
let code = fs.readFileSync('src/services/scmService.ts', 'utf8');

// I'll completely fix the last block manually to ensure no syntax errors.
code = code.replace(
  `const itemData = (typeof iDoc !== 'undefined' && iDoc.exists()) ? iDoc.data() : null;
          let statusStr = undefined;
          if (itemData) statusStr = await ScmService.handleThresholdAlerts(t, session, companyId, bRef.id.split('_')[0], itemData as InventoryItemRecord, pBal, nBal);
          t.set(bRef, { quantity: nBal, status: statusStr, lastUpdatedAt: new Date().toISOString() }, { merge: true });
              
            const lRef = doc(collection(db, 'companies', companyId, 'stock_ledger'));
            t.set(lRef, {
              id: lRef.id,
              companyId,
              itemId: rLine.itemId,
              locationId: pass.sourceLocationId,
              transactionType: 'RETURN',
              quantity: rLine.returnedQuantity,
              previousBalance: pBal,
              newBalance: nBal,
              referenceId: pass.id,
              referenceType: 'GATE_PASS',
              performedByUid: session.userId,
              performedByName: session.fullName,
              createdAt: new Date().toISOString()
            });
              
            const iRef = doc(db, 'companies', companyId, 'inventory_items', rLine.itemId);
            const iDoc = await t.get(iRef);
            if (iDoc.exists()) {
              t.update(iRef, { currentStock: (iDoc.data().currentStock || 0) + rLine.returnedQuantity });
            }`,
  `const iRef = doc(db, 'companies', companyId, 'inventory_items', rLine.itemId);
            const iDoc = await t.get(iRef);
            
            const itemData = (iDoc && iDoc.exists()) ? iDoc.data() : null;
            let statusStr = undefined;
            if (itemData) statusStr = await ScmService.handleThresholdAlerts(t, session, companyId, bRef.id.split('_')[0], itemData as InventoryItemRecord, pBal, nBal);
            t.set(bRef, { quantity: nBal, status: statusStr, lastUpdatedAt: new Date().toISOString() }, { merge: true });
              
            const lRef = doc(collection(db, 'companies', companyId, 'stock_ledger'));
            t.set(lRef, {
              id: lRef.id,
              companyId,
              itemId: rLine.itemId,
              locationId: pass.sourceLocationId,
              transactionType: 'RETURN',
              quantity: rLine.returnedQuantity,
              previousBalance: pBal,
              newBalance: nBal,
              referenceId: pass.id,
              referenceType: 'GATE_PASS',
              performedByUid: session.userId,
              performedByName: session.fullName,
              createdAt: new Date().toISOString()
            });
              
            if (iDoc.exists()) {
              t.update(iRef, { currentStock: (iDoc.data().currentStock || 0) + rLine.returnedQuantity });
            }`
);

fs.writeFileSync('src/services/scmService.ts', code);
