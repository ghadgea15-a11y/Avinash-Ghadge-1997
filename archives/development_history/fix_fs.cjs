const fs = require('fs');
let code = fs.readFileSync('src/services/firestoreService.ts', 'utf8');

const assetBlockRegex = /\/\/ If site or assignee changed, create a SITE_TRANSFER or CHECK_OUT movement automatically\s+if \(oldAsset && \(oldAsset\.siteId !== asset\.siteId \|\| oldAsset\.assignedEmployeeId !== asset\.assignedEmployeeId\)\) \{\s+const movementId = `MOV-\$\{Date\.now\(\)\}`;\s+const action = oldAsset\.siteId !== asset\.siteId \? 'SITE_TRANSFER' : 'CHECK_OUT';\s+const movementPayload: AssetMovementHistoryRecord = \{\s+id: movementId,\s+companyId,\s+assetId: asset\.id,\s+assetCode: asset\.assetCode,\s+assetName: asset\.assetName,\s+action,\s+employeeId: asset\.assignedEmployeeId,\s+employeeName: asset\.assignedEmployeeName,\s+siteId: asset\.siteId,\s+siteName: asset\.siteName,\s+conditionAtAction: asset\.condition,\s+performedByUid: actor\.uid,\s+performedByName: actor\.name,\s+remarks: 'Updated via Asset Edit',\s+timestamp: now\s+\};\s+await setDoc\(doc\(db, 'companies', companyId, 'asset_movements', movementId\), movementPayload\);\s+\}/g;

let matches = [...code.matchAll(assetBlockRegex)];
// Keep only the last match (which should be in saveAsset)
if (matches.length > 1) {
  for (let i = 0; i < matches.length - 1; i++) {
    code = code.replace(matches[i][0], '');
  }
}

fs.writeFileSync('src/services/firestoreService.ts', code);
