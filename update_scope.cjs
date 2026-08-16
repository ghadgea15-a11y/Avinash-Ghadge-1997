const fs = require('fs');
let code = fs.readFileSync('src/services/queryScopeEngine.ts', 'utf8');

code = code.replace(
  `      } else if (['ATTENDANCE', 'INCIDENTS', 'VISITORS', 'MATERIALS', 'LEAVES', 'ASSETS', 'TASKS', 'ANNOUNCEMENTS', 'DOCUMENTS', 'LOGS', 'DEPLOYMENTS', 'SHIFT_ROSTERS'].includes(collectionType)) {`,
  `      } else if (['ATTENDANCE', 'INCIDENTS', 'VISITORS', 'MATERIALS', 'LEAVES', 'ASSETS', 'TASKS', 'ANNOUNCEMENTS', 'DOCUMENTS', 'LOGS', 'DEPLOYMENTS', 'SHIFT_ROSTERS', 'CLIENTS'].includes(collectionType)) {`
);

code = code.replace(
  `      } else if (['EMPLOYEES', 'ATTENDANCE', 'LEAVES', 'PAYROLL'].includes(collectionType)) {`,
  `      } else if (['EMPLOYEES', 'ATTENDANCE', 'LEAVES', 'PAYROLL', 'DEPLOYMENTS', 'SHIFT_ROSTERS'].includes(collectionType)) {`
);

code = code.replace(
  `      } else {
        // Fallback lock
        constraints.push(where('employeeId', '==', session.employeeId));
      }`,
  `      } else if (collectionType === 'CLIENTS') {
        // Ground staff do not need full client records usually, but if needed, we can restrict to their assignedSiteId? 
        // For now, no access to CLIENTS collection directly for A7-A9
        constraints.push(where('employeeId', '==', session.employeeId || 'UNAUTHORIZED'));
      } else {
        // Fallback lock
        constraints.push(where('employeeId', '==', session.employeeId));
      }`
);

fs.writeFileSync('src/services/queryScopeEngine.ts', code);
