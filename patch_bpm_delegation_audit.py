import re

with open('src/services/bpmDelegationService.ts', 'r') as f:
    content = f.read()

if "import { AuditTrailService } from './auditTrailService';" not in content:
    content = content.replace("import { SecurityAuditService } from './securityAuditService';", "import { SecurityAuditService } from './securityAuditService';\nimport { AuditTrailService } from './auditTrailService';")

del_audit = """      // 5. GRC Audit Log
      await SecurityAuditService.logEvent(
        session.companyId,
        session.userId,
        session.role,
        session.employeeId,
        'DELEGATION_CREATED',
        'proxy_delegations',
        delegationId,
        true,
        'MEDIUM',
        `Created delegation from ${delegatorId} to ${proxyUserId}`
      );
      
      // Module 10.2 Immutable Audit Trail
      await AuditTrailService.logCreate(session, 'BPM_DELEGATION', 'ProxyDelegation', delegationId, `Delegated approvals to ${proxyUserId}`);
"""
content = re.sub(r"      // 5\. GRC Audit Log[\s\S]*?`Created delegation from \$\{delegatorId\} to \$\{proxyUserId\}`\n      \);", del_audit, content)

with open('src/services/bpmDelegationService.ts', 'w') as f:
    f.write(content)
