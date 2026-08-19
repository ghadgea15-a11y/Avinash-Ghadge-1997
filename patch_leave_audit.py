import re

with open('src/services/leaveService.ts', 'r') as f:
    content = f.read()

if "import { AuditTrailService } from './auditTrailService';" not in content:
    content = content.replace("import { BpmService } from './bpmService';", "import { BpmService } from './bpmService';\nimport { AuditTrailService } from './auditTrailService';")
    
leave_approve_audit = """      // 5. Submit to BPM Workflow
      const instanceId = await BpmService.submitLeaveWorkflow(session, leaveRequest);
      
      // Module 10.2: Immutable Audit Trail
      await AuditTrailService.logCreate(session, 'LEAVE', 'LeaveRequestRecord', requestId, `Requested ${leaveRequest.days} days of ${leaveRequest.leaveType}`);
"""
content = re.sub(r"      // 5\. Submit to BPM Workflow\n      const instanceId = await BpmService\.submitLeaveWorkflow\(session, leaveRequest\);", leave_approve_audit, content)

with open('src/services/leaveService.ts', 'w') as f:
    f.write(content)
