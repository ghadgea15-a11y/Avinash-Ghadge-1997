const fs = require('fs');

function patch(file, matcher, replacement) {
  try {
    let content = fs.readFileSync(file, 'utf8');
    content = content.replace(matcher, replacement);
    fs.writeFileSync(file, content);
  } catch (e) {
    console.error(e.message);
  }
}

patch('src/components/workorders/WorkOrderDetail.tsx', /await MaintenanceService\.updateWorkOrder as any\(/g, "await (MaintenanceService as any).updateWorkOrder(");
patch('src/services/firestoreService.ts', /siteId: rosters\[0\]\?\.siteId: siteId \|\| '',/g, "siteId: rosters[0]?.siteId,");

