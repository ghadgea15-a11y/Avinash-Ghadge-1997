const fs = require('fs');
let code = fs.readFileSync('src/components/screens/SiteOperationsScreen.tsx', 'utf8');

// Visitor check in
code = code.replace(
  /const ok = await FirestoreService\.checkInVisitor\(companyId, newVis\);/,
  `OfflineSyncService.queueAction('VISITOR_LOG', { companyId, data: newVis });
    const ok = true; // Assume success for offline queueing`
);

// Visitor check out
code = code.replace(
  /const ok = await FirestoreService\.checkOutVisitor\(companyId, visitorId\);/,
  `OfflineSyncService.queueAction('VISITOR_CHECK_OUT', { companyId, visitorId, checkOutTime: new Date().toISOString() });
    const ok = true;`
);

// Material Pass save
code = code.replace(
  /const ok = await FirestoreService\.saveMaterialMovementLog\(companyId, newPass\);/,
  `OfflineSyncService.queueAction('MATERIAL_PASS', { companyId, data: newPass });
    const ok = true;`
);

// Material Approve
code = code.replace(
  /const ok = await FirestoreService\.updateMaterialStatus\(companyId, passId, 'APPROVED', userSession\.employeeId\);/,
  `OfflineSyncService.queueAction('MATERIAL_APPROVE', { companyId, passId, approvedBy: userSession.employeeId, approvedAt: new Date().toISOString() });
    const ok = true;`
);

fs.writeFileSync('src/components/screens/SiteOperationsScreen.tsx', code);
