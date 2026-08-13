const fs = require('fs');
let code = fs.readFileSync('src/components/screens/SiteOperationsScreen.tsx', 'utf8');

code = code.replace(
  /OfflineSyncService\.queueAction\('VISITOR_LOG', \{ companyId, data: newVis \}\);\n\s*const ok = true; \/\/ Assume success for offline queueing/,
  `let ok = false;
    if (!isOnline) {
      OfflineSyncService.queueAction('VISITOR_LOG', { companyId, data: newVis });
      ok = true;
      setStatusMsg({ type: 'INFO', text: 'Offline: Visitor check-in queued.' });
    } else {
      ok = await FirestoreService.checkInVisitor(companyId, newVis);
    }`
);

code = code.replace(
  /OfflineSyncService\.queueAction\('VISITOR_CHECK_OUT', \{ companyId, visitorId, checkOutTime: new Date\(\)\.toISOString\(\) \}\);\n\s*const ok = true;/,
  `let ok = false;
    if (!isOnline) {
      OfflineSyncService.queueAction('VISITOR_CHECK_OUT', { companyId, visitorId, checkOutTime: new Date().toISOString() });
      ok = true;
      setStatusMsg({ type: 'INFO', text: 'Offline: Visitor check-out queued.' });
    } else {
      ok = await FirestoreService.checkOutVisitor(companyId, visitorId);
    }`
);

code = code.replace(
  /OfflineSyncService\.queueAction\('MATERIAL_PASS', \{ companyId, data: newPass \}\);\n\s*const ok = true;/,
  `let ok = false;
    if (!isOnline) {
      OfflineSyncService.queueAction('MATERIAL_PASS', { companyId, data: newPass });
      ok = true;
      setStatusMsg({ type: 'INFO', text: 'Offline: Material pass creation queued.' });
    } else {
      ok = await FirestoreService.saveMaterialMovementLog(companyId, newPass);
    }`
);

code = code.replace(
  /OfflineSyncService\.queueAction\('MATERIAL_APPROVE', \{ companyId, passId, approvedBy: userSession\.employeeId, approvedAt: new Date\(\)\.toISOString\(\) \}\);\n\s*const ok = true;/,
  `let ok = false;
    if (!isOnline) {
      OfflineSyncService.queueAction('MATERIAL_APPROVE', { companyId, passId, approvedBy: userSession.employeeId, approvedAt: new Date().toISOString() });
      ok = true;
      setStatusMsg({ type: 'INFO', text: 'Offline: Material pass approval queued.' });
    } else {
      ok = await FirestoreService.updateMaterialStatus(companyId, passId, 'APPROVED', userSession.userId, userSession.fullName);
    }`
);

fs.writeFileSync('src/components/screens/SiteOperationsScreen.tsx', code);
