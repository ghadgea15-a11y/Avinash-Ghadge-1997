const fs = require('fs');
let code = fs.readFileSync('src/services/changeControlService.ts', 'utf8');

const regex = /await AuditTrailService\.recordEvent\(\s*\{\s*userId:\s*session\.userId\s*\|\|\s*session\.uid,\s*companyId:\s*session\.companyId,\s*role:\s*session\.role\s*\},\s*session\.companyId,\s*'([^']*)',\s*'([^']*)',\s*'([^']*)',\s*'([^']*)',\s*([^,]+),\s*(true|false),\s*'([^']*)',\s*'([^']*)'\s*\);/g;

// Ah wait, it's 13 arguments! Let's just find "await AuditTrailService.recordEvent(" and replace till ");" for these two.
// Let's use a simpler replace.
code = code.replace(/await AuditTrailService\.recordEvent\([^;]+;/g, (match) => {
  if (match.includes("CHANGE_REJECTED")) {
    return `await AuditTrailService.recordEvent({
        session: session as any,
        companyId: session.companyId,
        module: 'CHANGE_CONTROL',
        action: 'CHANGE_REJECTED',
        method: 'REJECT',
        entity: record.entityType,
        entityId: record.entityId,
        success: true,
        severity: 'LOW',
        reason: \`Rejected change for \${record.entityType} \${record.entityId}\`
      });`;
  }
  if (match.includes("MODIFY_SENSITIVE")) {
    return `await AuditTrailService.recordEvent({
        session: session as any,
        companyId: session.companyId,
        module: 'CHANGE_CONTROL',
        action: 'MODIFY_SENSITIVE',
        method: 'EXECUTE',
        entity: record.entityType,
        entityId: record.entityId,
        success: true,
        severity: 'HIGH',
        referenceId: changeId,
        details: \`Authorized change applied to \${record.entityType}\`,
        payload: { before: record.beforeData, after: record.afterData }
      });`;
  }
  return match;
});

fs.writeFileSync('src/services/changeControlService.ts', code);
