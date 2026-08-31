const fs = require('fs');
let code = fs.readFileSync('src/services/firestoreService.ts', 'utf8');

const badCall = `await AuditTrailService.recordEvent(
        actorInfo,
        companyId,
        moduleName || 'SYSTEM',
        action,
        'EXECUTE',
        'SystemEvent',
        targetUser || logId,
        true,
        'LOW',
        logId,
        details,
        undefined,
        undefined
      );`;

const goodCall = `await AuditTrailService.recordEvent({
        session: actorInfo as any,
        companyId,
        module: moduleName || 'SYSTEM',
        action,
        method: 'EXECUTE',
        entity: 'SystemEvent',
        entityId: targetUser || logId,
        success: true,
        severity: 'LOW',
        referenceId: logId,
        details
      });`;

code = code.replace(badCall, goodCall);
fs.writeFileSync('src/services/firestoreService.ts', code);
