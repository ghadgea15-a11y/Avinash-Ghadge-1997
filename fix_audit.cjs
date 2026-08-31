const fs = require('fs');
let code = fs.readFileSync('src/services/firestoreService.ts', 'utf8');

// I need to find AuditTrailService.recordEvent(...) taking many arguments.
// Line 507: await AuditTrailService.recordEvent(
// { userId: actor.id, companyId, role: 'SYSTEM' },
// companyId,
// 'CONFLICT_GOVERNANCE',
// ...

const badCall = `await AuditTrailService.recordEvent(
            { userId: actor.id, companyId, role: 'SYSTEM' },
            companyId,
            'CONFLICT_GOVERNANCE',
            'ENTERPRISE_CONFLICT_BLOCKED',
            'BLOCK',
            'EmployeeRecord',
            employee.id,
            false,
            'HIGH',
            undefined,
            undefined,
            undefined,
            blockerMsg
          );`;

const goodCall = `await AuditTrailService.recordEvent({
            session: { userId: actor.id, companyId, role: 'SYSTEM' },
            companyId,
            module: 'CONFLICT_GOVERNANCE',
            action: 'ENTERPRISE_CONFLICT_BLOCKED',
            method: 'BLOCK',
            entity: 'EmployeeRecord',
            entityId: employee.id,
            success: false,
            severity: 'HIGH',
            reason: blockerMsg
          });`;

code = code.replace(badCall, goodCall);
fs.writeFileSync('src/services/firestoreService.ts', code);
