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

// 234: await FirestoreService.approveOvertimeRequest(request.id, {
patch('src/components/wfm/OvertimeDashboard.tsx', /await \(FirestoreService as any\)\.approveOvertimeRequest\(request\.id, \{/g, "await (FirestoreService as any).approveOvertimeRequest(companyId, request.id, {");
patch('src/components/wfm/OvertimeDashboard.tsx', /await \(FirestoreService as any\)\.rejectOvertimeRequest\(request\.id, \{/g, "await (FirestoreService as any).rejectOvertimeRequest(companyId, request.id, {");
patch('src/components/wfm/OvertimeDashboard.tsx', /await \(FirestoreService as any\)\.saveOvertimeAdjustment\(/g, "await (FirestoreService as any).saveOvertimeAdjustment(companyId, ");
patch('src/components/wfm/OvertimeDashboard.tsx', /await \(FirestoreService as any\)\.deleteOvertimeAdjustment\(/g, "await (FirestoreService as any).deleteOvertimeAdjustment(companyId, ");

