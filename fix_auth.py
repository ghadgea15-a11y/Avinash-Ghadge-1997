with open('src/services/firebaseAuthService.ts', 'r') as f:
    content = f.read()

content = content.replace("import { UserSession, UserRole, ApprovalRequestRecord } from '../types';", "import { UserSession, UserRole, ApprovalRequestRecord } from '../types';\nimport { SecurityAuditService } from './securityAuditService';")

with open('src/services/firebaseAuthService.ts', 'w') as f:
    f.write(content)
