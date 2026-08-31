const fs = require('fs');
let code = fs.readFileSync('src/services/firestoreService.ts', 'utf8');

const regex = /await AuditTrailService\.recordEvent\(\s*\{\s*userId:\s*actor\.id,\s*companyId,\s*role:\s*'SYSTEM'\s*\},\s*companyId,\s*'([^']*)',\s*'([^']*)',\s*'([^']*)',\s*'([^']*)',\s*([^,]+),\s*(true|false),\s*'([^']*)',\s*undefined,\s*undefined,\s*undefined,\s*([^)\n]*)\s*\);/g;

code = code.replace(regex, (match, p1, p2, p3, p4, p5, p6, p7, p8) => {
  return `await AuditTrailService.recordEvent({
            session: { userId: actor.id, companyId, role: 'SYSTEM' },
            companyId,
            module: '${p1}',
            action: '${p2}',
            method: '${p3}',
            entity: '${p4}',
            entityId: ${p5},
            success: ${p6},
            severity: '${p7}',
            reason: ${p8}
          });`;
});

fs.writeFileSync('src/services/firestoreService.ts', code);
