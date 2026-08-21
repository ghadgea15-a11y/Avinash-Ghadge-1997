import * as fs from 'fs';
const file = 'src/services/certificationTrackingService.ts';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  "await SecurityAuditService.logEvent(session.companyId, session.uid, session.role[0] || 'EMPLOYEE', session.employeeId, 'CREATE_UPDATE_CERTIFICATION', {",
  "await SecurityAuditService.logEvent(session.companyId, session.userId, session.role, session.employeeId, 'CREATE_UPDATE_CERTIFICATION', 'CERTIFICATION', cert.id, true, 'LOW');\n/*"
);

content = content.replace(
  "status: cert.status\n    });",
  "status: cert.status\n    */"
);

content = content.replace(
  "await SecurityAuditService.logEvent(session.companyId, session.uid, session.role[0] || 'EMPLOYEE', session.employeeId, 'RENEW_CERTIFICATION', {",
  "await SecurityAuditService.logEvent(session.companyId, session.userId, session.role, session.employeeId, 'RENEW_CERTIFICATION', 'CERTIFICATION', newCert.id, true, 'LOW');\n/*"
);

content = content.replace(
  "employeeId: newCert.employeeId\n    });",
  "employeeId: newCert.employeeId\n    */"
);

fs.writeFileSync(file, content);
