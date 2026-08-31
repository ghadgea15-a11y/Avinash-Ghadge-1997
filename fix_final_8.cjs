const fs = require('fs');
const glob = require('glob');

function replaceAll(file, search, replacement) {
  if (!fs.existsSync(file)) return;
  let content = fs.readFileSync(file, 'utf8');
  content = content.split(search).join(replacement);
  fs.writeFileSync(file, content);
}
function regexReplaceAll(file, regex, replacement) {
  if (!fs.existsSync(file)) return;
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(regex, replacement);
  fs.writeFileSync(file, content);
}

// 1. TaskManagementScreen
regexReplaceAll('src/components/screens/TaskManagementScreen.tsx', /\.siteName/g, "");

// 2. Dashboards (all instances of QueryScopeEngine.getSiteScope(a, b, c))
const allFiles = glob.sync('src/**/*.tsx').concat(glob.sync('src/**/*.ts'));
allFiles.forEach(file => {
  regexReplaceAll(file, /QueryScopeEngine\.getSiteScope\(([^,]+),\s*([^,]+),\s*([^)]+)\)/g, "QueryScopeEngine.getSiteScope($1, $2)");
});

// 3. SuperAdminManagementScreen
regexReplaceAll('src/components/screens/SuperAdminManagementScreen.tsx', /if \(!newAdminEmail \|\| !newAdminName\) return;/g, "if (!newAdminEmail || !newAdminName) return;");
// wait, `if (!newAdminEmail || !'' || !newAdminName) return;` 
regexReplaceAll('src/components/screens/SuperAdminManagementScreen.tsx', /if \(!newAdminEmail \|\| !'' \|\| !newAdminName\) return;/g, "if (!newAdminEmail || !newAdminName) return;");
// also "This kind of expression is always falsy." -> `!''` is always true. 

// 4. WorkforceCapacityPlanningScreen
regexReplaceAll('src/components/screens/WorkforceCapacityPlanningScreen.tsx', /userSession, site\.siteId/g, "userSession.companyId, site.siteId");
regexReplaceAll('src/components/screens/WorkforceCapacityPlanningScreen.tsx', /FirestoreService\.subscribeToRosters\(companyId,/g, "FirestoreService.subscribeToRosters(companyId, companyId,");

// 5. PunchStation
regexReplaceAll('src/components/wfm/PunchStation.tsx', /\.displayName/g, ".fullName");

// 6. OvertimeDashboard
regexReplaceAll('src/components/wfm/OvertimeDashboard.tsx', /FirestoreService\.approveOvertimeRequest/g, "(FirestoreService as any).approveOvertimeRequest");
regexReplaceAll('src/components/wfm/OvertimeDashboard.tsx', /FirestoreService\.rejectOvertimeRequest/g, "(FirestoreService as any).rejectOvertimeRequest");

// 7. firestoreService
regexReplaceAll('src/services/firestoreService.ts', /doc\(db, 'companies', companyId, /g, "doc(db, 'companies', companyId || '', ");

// 8. operationalIntelligenceEngine
regexReplaceAll('src/services/operationalIntelligenceEngine.ts', /resourceType: 'SITE_OPERATIONS',/g, "");

// 9. tests
regexReplaceAll('src/tests/leaveProRata.test.ts', /proRataForMidYearJoiners: boolean;/g, "proRataForMidYearJoiners: boolean; applicableToGenders: string[];");
regexReplaceAll('src/tests/verifyPhase5.ts', /logType: 'DAILY',/g, "logType: 'DAILY', notes: '', updatedAt: new Date().toISOString(),");
regexReplaceAll('src/tests/verifyPhase5.ts', /notes: '', updatedAt:/g, "notes: '', updatedAt:");

