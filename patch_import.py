with open('src/services/firestoreService.ts', 'r') as f:
    content = f.read()
if "import { AuditTrailService }" not in content:
    content = content.replace("import { QueryScopeEngine } from './queryScopeEngine';", "import { QueryScopeEngine } from './queryScopeEngine';\nimport { AuditTrailService } from './auditTrailService';")
with open('src/services/firestoreService.ts', 'w') as f:
    f.write(content)
