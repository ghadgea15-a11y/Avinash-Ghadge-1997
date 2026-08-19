with open('src/services/bpmDelegationService.ts', 'r') as f:
    content = f.read()

content = content.replace("instance.instanceId", "instance.id")
content = content.replace("import { SecurityAuditService } from './securityAuditService';", "import { SecurityAuditService } from './securityAuditService';\n") # ensure new line

with open('src/services/bpmDelegationService.ts', 'w') as f:
    f.write(content)
