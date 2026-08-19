import re

with open('src/services/bpmService.ts', 'r') as f:
    content = f.read()

if "SecurityAuditService" not in content:
    content = content.replace("import { BpmDelegationService } from './bpmDelegationService';", "import { BpmDelegationService } from './bpmDelegationService';\nimport { SecurityAuditService } from './securityAuditService';")

proxy_audit = """    // Proxy Audit & Delegator Notification
    if (proxyDetails.asProxy && proxyDetails.delegatorId) {
      SecurityAuditService.logEvent(
        session.companyId,
        session.userId,
        session.role,
        session.employeeId,
        'DELEGATION_ACTED',
        'bpm_instances',
        instanceId,
        true,
        'MEDIUM',
        `Acted as proxy for ${proxyDetails.delegatorId} (Action: ${actionType})`
      ).catch(() => {});
"""
content = re.sub(r"    // Proxy Audit & Delegator Notification\n    if \(proxyDetails\.asProxy && proxyDetails\.delegatorId\) \{", proxy_audit, content)

with open('src/services/bpmService.ts', 'w') as f:
    f.write(content)
