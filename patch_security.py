import re

with open('src/services/securityAuditService.ts', 'r') as f:
    content = f.read()

content = content.replace("logEvent(\n    session: UserSession,\n", "logEvent(\n    companyId: string,\n    userId: string,\n    role: string,\n    employeeId: string | undefined,\n")
content = content.replace("if (!session || !session.companyId) return null;", "if (!companyId) return null;")
content = content.replace("companyId: session.companyId,", "companyId,")
content = content.replace("userId: session.userId,", "userId,")
content = content.replace("employeeId: session.employeeId,", "employeeId,")
content = content.replace("role: session.role,", "role,")

content = content.replace("const eventRef = doc(db, 'companies', session.companyId, 'security_events', eventId);", "const eventRef = doc(db, 'companies', companyId, 'security_events', eventId);")

content = content.replace("this.runAnomalyDetection(session.companyId, eventRecord)", "this.runAnomalyDetection(companyId, eventRecord)")

with open('src/services/securityAuditService.ts', 'w') as f:
    f.write(content)
