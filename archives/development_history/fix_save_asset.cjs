const fs = require('fs');

let code = fs.readFileSync('src/services/firestoreService.ts', 'utf8');

code = code.replace(
  /static async saveAsset\(\s*companyId: string,\s*asset: AssetRecord,\s*actor: \{ uid: string; name: string \}\s*\): Promise<boolean> \{/g,
  `static async saveAsset(
    companyId: string,
    asset: AssetRecord,
    actor: { uid: string; name: string },
    oldAsset?: AssetRecord
  ): Promise<boolean> {`
);

code = code.replace(
  /await setDoc\(docRef, payload, \{ merge: true \}\);/g,
  `await setDoc(docRef, payload, { merge: true });

      // If site or assignee changed, create a SITE_TRANSFER or CHECK_OUT movement automatically
      if (oldAsset && (oldAsset.siteId !== asset.siteId || oldAsset.assignedEmployeeId !== asset.assignedEmployeeId)) {
        const movementId = \`MOV-\${Date.now()}\`;
        const action = oldAsset.siteId !== asset.siteId ? 'SITE_TRANSFER' : 'CHECK_OUT';
        const movementPayload: AssetMovementHistoryRecord = {
          id: movementId,
          companyId,
          assetId: asset.id,
          assetCode: asset.assetCode,
          assetName: asset.assetName,
          action,
          employeeId: asset.assignedEmployeeId,
          employeeName: asset.assignedEmployeeName,
          siteId: asset.siteId,
          siteName: asset.siteName,
          conditionAtAction: asset.condition,
          performedByUid: actor.uid,
          performedByName: actor.name,
          remarks: 'Updated via Asset Edit',
          timestamp: now
        };
        await setDoc(doc(db, 'companies', companyId, 'asset_movements', movementId), movementPayload);
      }`
);

fs.writeFileSync('src/services/firestoreService.ts', code);
