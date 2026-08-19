import re

with open('src/services/firestoreService.ts', 'r') as f:
    content = f.read()

replacement = """  static async logAuditEvent(
    companyId: string,
    actorId: string,
    actorName: string,
    action: string,
    details: string,
    targetUser?: string
  ): Promise<boolean> {
    try {
      const logId = `AUDIT-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      
      const actorInfo = { userId: actorId, role: 'SYSTEM', companyId: companyId || 'GLOBAL' };
      await AuditTrailService.logUpdate(actorInfo, 'LEGACY_MODULE', 'LegacyEvent', logId, `Action: ${action}. Details: ${details}`);

      return true;
    } catch (err) {
"""

content = re.sub(
    r"  static async logAuditEvent\([\s\S]*?targetUser\?: string\n  \): Promise<boolean> \{\n    try \{\n      const logId[\s\S]*?return true;\n    \} catch \(err\) \{",
    replacement,
    content,
    count=1
)

with open('src/services/firestoreService.ts', 'w') as f:
    f.write(content)
