with open('src/services/bpmDelegationService.ts', 'r') as f:
    content = f.read()
if "import { SecurityAuditService } from './securityAuditService';" not in content:
    content = content.replace("import { db } from '../firebase';", "import { db } from '../firebase';\nimport { SecurityAuditService } from './securityAuditService';")
with open('src/services/bpmDelegationService.ts', 'w') as f:
    f.write(content)
