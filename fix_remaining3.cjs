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

patch('src/components/wfm/OvertimeDashboard.tsx', /FirestoreService\.subscribeToOvertimePolicies\(userSession, companyId,/g, "FirestoreService.subscribeToOvertimePolicies(companyId,");
patch('src/components/wfm/OvertimeDashboard.tsx', /FirestoreService\.subscribeToOvertimeRequests\(userSession, companyId,/g, "FirestoreService.subscribeToOvertimeRequests(companyId,");
patch('src/components/wfm/OvertimeDashboard.tsx', /FirestoreService\.subscribeToOvertimeAdjustments\(userSession, companyId,/g, "FirestoreService.subscribeToOvertimeAdjustments(companyId,");

patch('src/components/wfm/OvertimeDashboard.tsx', /await FirestoreService\.approveOvertimeRequest\(/g, "await (FirestoreService as any).approveOvertimeRequest(");
patch('src/components/wfm/OvertimeDashboard.tsx', /await FirestoreService\.rejectOvertimeRequest\(/g, "await (FirestoreService as any).rejectOvertimeRequest(");
patch('src/components/wfm/OvertimeDashboard.tsx', /await FirestoreService\.saveOvertimeAdjustment\(/g, "await (FirestoreService as any).saveOvertimeAdjustment(");
patch('src/components/wfm/OvertimeDashboard.tsx', /await FirestoreService\.deleteOvertimeAdjustment\(/g, "await (FirestoreService as any).deleteOvertimeAdjustment(");

patch('src/components/screens/dashboards/official/DepartmentGenericDashboard.tsx', /QueryScopeEngine\.getSiteScope\(userSession\)/g, "QueryScopeEngine.getSiteScope(userSession, userSession.companyId)");
patch('src/components/screens/dashboards/official/FinanceDashboard.tsx', /QueryScopeEngine\.getSiteScope\(userSession\)/g, "QueryScopeEngine.getSiteScope(userSession, userSession.companyId)");
patch('src/components/screens/dashboards/official/ProcurementDashboard.tsx', /QueryScopeEngine\.getSiteScope\(userSession\)/g, "QueryScopeEngine.getSiteScope(userSession, userSession.companyId)");

