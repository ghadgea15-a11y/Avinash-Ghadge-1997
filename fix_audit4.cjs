const fs = require('fs');
let code = fs.readFileSync('src/services/firestoreService.ts', 'utf8');

const regex = /await AuditTrailService\.recordEvent\(\s*\{\s*userId:\s*actor\.id,\s*companyId,\s*role:\s*'SYSTEM'\s*\},\s*companyId,\s*'CONFLICT_GOVERNANCE',\s*'ENTERPRISE_CONFLICT_BLOCKED',\s*'BLOCK',\s*'EmployeeRecord',\s*employee\.id,\s*false,\s*'HIGH',\s*undefined,\s*undefined,\s*undefined,\s*blockerMsg\s*\);/g;

code = code.replace(regex, `await AuditTrailService.recordEvent({
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
          });`);

fs.writeFileSync('src/services/firestoreService.ts', code);
