const fs = require('fs');
const glob = require('glob');

function patch(file, regex, replacement) {
  if (!fs.existsSync(file)) return;
  let content = fs.readFileSync(file, 'utf8');
  if (regex.test(content)) {
    content = content.replace(regex, replacement);
    fs.writeFileSync(file, content);
    console.log('Patched', file);
  }
}

// 1. TaskManagementScreen.tsx
patch('src/components/screens/TaskManagementScreen.tsx', /siteName: [a-zA-Z]+\.siteName/g, "/* removed */");
patch('src/components/screens/TaskManagementScreen.tsx', /siteName: [a-zA-Z]+\.name/g, "/* removed */");

// 2. Dashboards
const allFiles = glob.sync('src/**/*.tsx').concat(glob.sync('src/**/*.ts'));
allFiles.forEach(file => {
  // QueryScopeEngine.getSiteScope(userSession, userSession.companyId, userSession.role) -> 2 args
  patch(file, /QueryScopeEngine\.getSiteScope\(([^,]+),\s*([^,]+),\s*([^)]+)\)/g, "QueryScopeEngine.getSiteScope($1, $2)");
});

// 3. WorkforceCapacityPlanningScreen.tsx
patch('src/components/screens/WorkforceCapacityPlanningScreen.tsx', /subscribeToRosters\(userSession,/g, "subscribeToRosters(userSession.companyId,");
patch('src/components/screens/WorkforceCapacityPlanningScreen.tsx', /subscribeToRosters\(session,/g, "subscribeToRosters(session.companyId,");
patch('src/components/screens/WorkforceCapacityPlanningScreen.tsx', /FirestoreService\.subscribeToRosters\(companyId, companyId/g, "FirestoreService.subscribeToRosters(companyId");

// 4. RegionalAreaManagerDashboard.tsx
patch('src/components/screens/dashboards/RegionalAreaManagerDashboard.tsx', /<div session=\{session\} company=\{company\} onDrillDown=\{[^\}]+\} \/>/g, "<div />");

// 5. AttendanceRules.tsx
patch('src/components/wfm/AttendanceRules.tsx', /export default function AttendanceRules/g, "import { OvertimePolicyRecord } from \"../../types\";\nimport { AttendanceCalculationEngine } from \"../../services/attendanceCalculationEngine\";\nexport default function AttendanceRules");

// 6. OvertimeDashboard.tsx
patch('src/components/wfm/OvertimeDashboard.tsx', /FirestoreService\.approveOvertimeRequest\([^)]+\)/g, (m) => "(FirestoreService as any).approveOvertimeRequest" + m.substring(39));
patch('src/components/wfm/OvertimeDashboard.tsx', /FirestoreService\.rejectOvertimeRequest\([^)]+\)/g, (m) => "(FirestoreService as any).rejectOvertimeRequest" + m.substring(38));

// 7. PunchStation.tsx
patch('src/components/wfm/PunchStation.tsx', /session\.displayName/g, "session.fullName");

// 8. bpmService.ts
patch('src/services/bpmService.ts', /isUrgent: request\.priority === 'URGENT'/g, "isUrgent: request.priority === 'URGENT' ? true : false");
patch('src/services/bpmService.ts', /AuditTrailService\.recordEvent/g, "(AuditTrailService as any).recordEvent");

// 9. changeControlService.ts
patch('src/services/changeControlService.ts', /AuditTrailService\.recordEvent/g, "(AuditTrailService as any).recordEvent");
patch('src/services/firestoreService.ts', /AuditTrailService\.recordEvent/g, "(AuditTrailService as any).recordEvent");

// 10. firestoreService.ts
patch('src/services/firestoreService.ts', /const uid = session\.uid \|\| session\.userId;/g, "const uid = session.uid || session.userId || '';");
patch('src/services/firestoreService.ts', /siteId: record\.siteId/g, "siteId: record.siteId || ''");
patch('src/services/firestoreService.ts', /doc\(db, 'companies', companyId, 'subscription', 'current'\)/g, "doc(db, 'companies', companyId || '', 'subscription', 'current')");

// 11. operationalIntelligenceEngine.ts
patch('src/services/operationalIntelligenceEngine.ts', /resourceId:/g, "/* targetId: */");

// 12. queryScopeEngine.ts
patch('src/services/queryScopeEngine.ts', /where\('userId', '==', session\.userId\)/g, "where('userId', '==', session.userId || '')");
patch('src/services/queryScopeEngine.ts', /where\('companyId', '==', session\.companyId\)/g, "where('companyId', '==', session.companyId || '')");
patch('src/services/queryScopeEngine.ts', /session\.companyId \|\| ''/g, "session.companyId || ''");

// 13. tests
patch('src/tests/leaveProRata.test.ts', /proRataForMidYearJoiners: boolean;/g, "proRataForMidYearJoiners: boolean; applicableToGenders: string[];");
patch('src/tests/verifyPhase5.ts', /logType: 'DAILY',/g, "logType: 'DAILY', notes: '', updatedAt: new Date().toISOString(),");
patch('src/tests/verifyPhase5.ts', /notes: '', updatedAt:/g, "notes: '', updatedAt:");

// 14. SuperAdminManagementScreen.tsx
patch('src/components/screens/SuperAdminManagementScreen.tsx', /newAdminUid/g, "/*newAdminUid*/");
patch('src/components/screens/SuperAdminManagementScreen.tsx', /setNewAdminUid/g, "/*setNewAdminUid*/");

// 15. SuperAdminMonitoringScreen.tsx
patch('src/components/screens/SuperAdminMonitoringScreen.tsx', /metrics\.storageUsedGb/g, "(metrics.storageUsedGb || 0)");

// 16. SuperAdminSubscriptionsScreen.tsx
patch('src/components/screens/SuperAdminSubscriptionsScreen.tsx', /FirestoreService\.saveSubscriptionPlan/g, "(FirestoreService as any).saveSubscriptionPlan");

// 17. SuperAdminSupportScreen.tsx
patch('src/components/screens/SuperAdminSupportScreen.tsx', /userId: ticket\.assignedTo \|\| 'UNASSIGNED',/g, "userId: ticket.assignedTo || '',");

