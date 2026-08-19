with open('src/services/securityAuditService.ts', 'r') as f:
    content = f.read()

content = content.replace("import { v4 as uuidv4 } from 'uuid';", "")
content = content.replace("uuidv4()", "(typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `ID-${Date.now()}-${Math.random().toString(36).substring(2,6)}`)")

# fix 281
content = content.replace("`Updated anomaly status to ${status}`", "`Updated anomaly status to ${status}`,\n        undefined")

with open('src/services/securityAuditService.ts', 'w') as f:
    f.write(content)
