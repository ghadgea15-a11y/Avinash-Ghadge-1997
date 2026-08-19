import re

with open('src/types/index.ts', 'r') as f:
    content = f.read()

audit_trail_def = """export interface AuditTrailRecord {
  id: string;
  companyId: string;
  actorId: string;
  actorEmployeeId?: string;
  actorRole?: string;
  module: string;
  action: string;
  operation: string;
  entityType: string;
  entityId: string;
  timestamp: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  success: boolean;
  failureReason?: string;
  correlationId?: string;
  source: string;
  changeSummary?: string;
  metadata?: any;
}
"""

if "export interface AuditTrailRecord" not in content:
    content = content.replace("export interface AuditLogRecord {", audit_trail_def + "\nexport interface AuditLogRecord {")

with open('src/types/index.ts', 'w') as f:
    f.write(content)
