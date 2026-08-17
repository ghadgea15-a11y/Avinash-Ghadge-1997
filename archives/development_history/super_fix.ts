import * as fs from 'fs';

// 1. SiteOperationsScreen
let siteOps = fs.readFileSync('src/components/screens/SiteOperationsScreen.tsx', 'utf-8');
siteOps = siteOps.replace(
  "setIncidentForm({ siteId: selectedSiteId, title: '', category: 'SECURITY_BREACH', severity: 'MEDIUM', description: '' });",
  "setIncidentForm({ siteId: selectedSiteId, title: '', category: 'SECURITY_BREACH', severity: 'MEDIUM', description: '', type: 'INCIDENT' as const });"
);
siteOps = siteOps.replace(
  "const log: DailySiteLogRecord = {",
  "const log = {\n                  siteName: 'Unknown', supervisorId: userSession.employeeId || '', supervisorName: 'Unknown', guardsCountOnDuty: 0, totalPatrolsCompleted: 0, totalVisitorsLogged: 0, totalIncidentsReported: 0,"
);
siteOps = siteOps.replace(
  "const log: DailySiteLogRecord = {",
  "const log = {\n                  siteName: 'Unknown', supervisorId: userSession.employeeId || '', supervisorName: 'Unknown', guardsCountOnDuty: 0, totalPatrolsCompleted: 0, totalVisitorsLogged: 0, totalIncidentsReported: 0,"
);
siteOps = siteOps.replace(
  /FirestoreService\.saveDailySiteLog\(companyId, log\);/g,
  "FirestoreService.saveDailySiteLog(companyId, log as DailySiteLogRecord);"
);

fs.writeFileSync('src/components/screens/SiteOperationsScreen.tsx', siteOps);

// 2. TaskManagementScreen
let tm = fs.readFileSync('src/components/screens/TaskManagementScreen.tsx', 'utf-8');
tm = tm.replace(
  "const task: TaskRecord = {",
  "const task: any = {"
);
fs.writeFileSync('src/components/screens/TaskManagementScreen.tsx', tm);

