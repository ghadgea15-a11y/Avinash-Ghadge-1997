import re

with open('src/services/firebaseAuthService.ts', 'r') as f:
    content = f.read()

# Add import
if "SecurityAuditService" not in content:
    content = content.replace("import { UserSession, UserRole, ApprovalRequestRecord } from '../types';", "import { UserSession, UserRole, ApprovalRequestRecord } from '../types';\nimport { SecurityAuditService } from './securityAuditService';")

# Find the successful login points
content = re.compile(r"(return session;)", re.MULTILINE).sub(r"\n        SecurityAuditService.logEvent(\n          session,\n          'LOGIN_SUCCESS',\n          'authentication',\n          session.userId,\n          true,\n          'LOW',\n          'User authenticated successfully'\n        ).catch(e => console.error(e));\n        \1", content, count=2)

# Find the failed login points - we don't have session for failed, but we can craft a dummy session for the audit log or update SecurityAuditService to accept companyId and userId directly.
with open('src/services/firebaseAuthService.ts', 'w') as f:
    f.write(content)
