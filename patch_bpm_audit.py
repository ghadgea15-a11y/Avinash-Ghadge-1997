import re

with open('src/services/bpmService.ts', 'r') as f:
    content = f.read()

if "import { AuditTrailService } from './auditTrailService';" not in content:
    content = content.replace("import { SecurityAuditService } from './securityAuditService';", "import { SecurityAuditService } from './securityAuditService';\nimport { AuditTrailService } from './auditTrailService';")

bpm_audit = """    // Proxy Audit & Delegator Notification
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
      
      // Module 10.2: Immutable Audit Trail for Workflow Proxy Action
      AuditTrailService.logUpdate(session, 'BPM', 'BpmApprovalInstance', instanceId, `Proxy action ${actionType} performed on behalf of ${proxyDetails.delegatorId}`, { proxyUserId: session.userId, delegatorId: proxyDetails.delegatorId }, instanceId).catch(() => {});
"""
content = re.sub(r"    // Proxy Audit & Delegator Notification[\s\S]*?`Acted as proxy for \$\{proxyDetails\.delegatorId\} \(Action: \$\{actionType\}\)`\n      \)\.catch\(\(\) => \{\}\);", bpm_audit, content)

with open('src/services/bpmService.ts', 'w') as f:
    f.write(content)
