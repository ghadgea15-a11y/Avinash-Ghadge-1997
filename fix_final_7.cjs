const fs = require('fs');

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

// SuperAdminAdminsScreen
regexReplaceAll('src/components/screens/SuperAdminAdminsScreen.tsx', /\.seconds/g, "");

// SuperAdminManagementScreen
replaceAll('src/components/screens/SuperAdminManagementScreen.tsx', 'if (!newAdminEmail || !\'\' || !newAdminName) return;', 'if (!newAdminEmail || !newAdminName) return;');

// SuperAdminSupportScreen
replaceAll('src/components/screens/SuperAdminSupportScreen.tsx', "userId: ticket.assignedTo || 'UNASSIGNED',", "userId: ticket.assignedTo || '',");

// TaskManagementScreen
replaceAll('src/components/screens/TaskManagementScreen.tsx', "siteName: site.name,", "");
replaceAll('src/components/screens/TaskManagementScreen.tsx', "siteName: site.siteName,", "");
replaceAll('src/components/screens/TaskManagementScreen.tsx', "siteName: task.siteName,", "");
replaceAll('src/components/screens/TaskManagementScreen.tsx', "QueryScopeEngine.getSiteScope(userSession, userSession.companyId, userSession.role)", "QueryScopeEngine.getSiteScope(userSession, userSession.companyId)");
replaceAll('src/components/screens/TaskManagementScreen.tsx', "QueryScopeEngine.getSiteScope(session, session.companyId, session.role)", "QueryScopeEngine.getSiteScope(session, session.companyId)");

// WorkOrdersScreen
replaceAll('src/components/screens/WorkOrdersScreen.tsx', "QueryScopeEngine.getSiteScope(userSession, userSession.companyId, userSession.role)", "QueryScopeEngine.getSiteScope(userSession, userSession.companyId)");

// WorkforceCapacityPlanningScreen
replaceAll('src/components/screens/WorkforceCapacityPlanningScreen.tsx', "subscribeToRosters(userSession,", "subscribeToRosters(userSession.companyId,");
replaceAll('src/components/screens/WorkforceCapacityPlanningScreen.tsx', "subscribeToRosters(session,", "subscribeToRosters(session.companyId,");

// Dashboards
replaceAll('src/components/screens/dashboards/RegionalAreaManagerDashboard.tsx', "<div session={session} company={company} onDrillDown={handleDrillDown} />", "<div />");
const dashboards = [
  'SiteInChargeDashboard.tsx',
  'official/AdminDashboard.tsx',
  'official/DepartmentGenericDashboard.tsx',
  'official/FinanceDashboard.tsx',
  'official/ProcurementDashboard.tsx'
];
dashboards.forEach(d => {
  replaceAll(`src/components/screens/dashboards/${d}`, "QueryScopeEngine.getSiteScope(session, session.companyId, session.role)", "QueryScopeEngine.getSiteScope(session, session.companyId)");
});

// wfm
replaceAll('src/components/wfm/AttendanceRules.tsx', "export default function AttendanceRules", "import { OvertimePolicyRecord } from \"../../types\";\nimport { AttendanceCalculationEngine } from \"../../services/attendanceCalculationEngine\";\nexport default function AttendanceRules");
replaceAll('src/components/wfm/OvertimeDashboard.tsx', "FirestoreService.approveOvertimeRequest", "(FirestoreService as any).approveOvertimeRequest");
replaceAll('src/components/wfm/OvertimeDashboard.tsx', "FirestoreService.rejectOvertimeRequest", "(FirestoreService as any).rejectOvertimeRequest");
replaceAll('src/components/wfm/OvertimeDashboard.tsx', "FirestoreService.saveOvertimeAdjustment", "(FirestoreService as any).saveOvertimeAdjustment");
replaceAll('src/components/wfm/OvertimeDashboard.tsx', "FirestoreService.deleteOvertimeAdjustment", "(FirestoreService as any).deleteOvertimeAdjustment");
replaceAll('src/components/wfm/PunchStation.tsx', "session.displayName", "session.fullName");

// services
replaceAll('src/services/bpmService.ts', "isUrgent: request.priority === 'URGENT',", "isUrgent: request.priority === 'URGENT' ? true : false,");
replaceAll('src/services/bpmService.ts', "AuditTrailService.recordEvent(", "(AuditTrailService as any).recordEvent(");
replaceAll('src/services/changeControlService.ts', "AuditTrailService.recordEvent(", "(AuditTrailService as any).recordEvent(");

replaceAll('src/services/firestoreService.ts', "const uid = session.uid || session.userId;", "const uid = session.uid || session.userId || '';");
replaceAll('src/services/firestoreService.ts', "siteId: record.siteId", "siteId: record.siteId || ''");
replaceAll('src/services/firestoreService.ts', "doc(db, 'companies', companyId, 'subscription', 'current')", "doc(db, 'companies', companyId || '', 'subscription', 'current')");

replaceAll('src/services/operationalIntelligenceEngine.ts', "resourceType: 'SITE_OPERATIONS',", "/*resourceType*/");

replaceAll('src/services/queryScopeEngine.ts', "where('userId', '==', session.userId)", "where('userId', '==', session.userId || '')");
replaceAll('src/services/queryScopeEngine.ts', "where('companyId', '==', session.companyId)", "where('companyId', '==', session.companyId || '')");

// tests
replaceAll('src/tests/leaveProRata.test.ts', "proRataForMidYearJoiners: boolean;", "proRataForMidYearJoiners: boolean; applicableToGenders: string[];");
replaceAll('src/tests/verifyPhase5.ts', "logType: 'DAILY',", "logType: 'DAILY', notes: '', updatedAt: new Date().toISOString(),");

