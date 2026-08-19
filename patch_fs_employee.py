import re

with open('src/services/firestoreService.ts', 'r') as f:
    content = f.read()

# Make sure we import AuditTrailService
if "import { AuditTrailService }" not in content:
    content = content.replace("import { getStorage", "import { AuditTrailService }\nfrom './auditTrailService';\nimport { getStorage")
    content = content.replace("import { AuditTrailService }\nfrom", "import { AuditTrailService } from")

audit_replacement = """      // 3. Audit Log
      const auditActor = { userId: actor.id, companyId, role: 'SYSTEM' };
      if (isUpdate) {
          await AuditTrailService.logUpdate(auditActor, 'EMPLOYEES', 'EmployeeRecord', employee.id, `Updated employee ${employee.firstName} ${employee.lastName}`);
      } else {
          await AuditTrailService.logCreate(auditActor, 'EMPLOYEES', 'EmployeeRecord', employee.id, `Created employee ${employee.firstName} ${employee.lastName}`);
      }
"""
content = re.sub(r"      // 3\. Audit Log\n      await this\.logAuditEvent\([\s\S]*?\);\n", audit_replacement, content, count=1)

with open('src/services/firestoreService.ts', 'w') as f:
    f.write(content)
