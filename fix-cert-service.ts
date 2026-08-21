import * as fs from 'fs';
const file = 'src/services/certificationTrackingService.ts';
let content = fs.readFileSync(file, 'utf8');

// Fix uuid import
content = content.replace("import { v4 as uuidv4 } from 'uuid';", "function uuidv4() { return crypto.randomUUID(); }");

// Fix logEvent
content = content.replace(
  "await SecurityAuditService.logEvent(session, 'CREATE_UPDATE_CERTIFICATION', {",
  "await SecurityAuditService.logEvent(session.companyId, session.uid, session.role[0] || 'EMPLOYEE', session.employeeId, 'CREATE_UPDATE_CERTIFICATION', {"
);

content = content.replace(
  "await SecurityAuditService.logEvent(session, 'RENEW_CERTIFICATION', {",
  "await SecurityAuditService.logEvent(session.companyId, session.uid, session.role[0] || 'EMPLOYEE', session.employeeId, 'RENEW_CERTIFICATION', {"
);

// Fix roleScope
content = content.replace(/roleScope: \['SUPER_ADMIN', 'COMPANY_ADMIN', 'HR', 'MANAGER'\]/g, "roleScope: ['SUPER_ADMIN', 'COMPANY_ADMIN', 'HR_ADMIN']");

// Fix actionRoute
content = content.replace(/actionRoute: 'CERTIFICATIONS'/g, "actionRoute: 'CERTIFICATION_TRACKING'");

fs.writeFileSync(file, content);
