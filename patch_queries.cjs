const fs = require('fs');
let code = fs.readFileSync('src/services/firestoreService.ts', 'utf8');

const map = {
  'employees': 'EMPLOYEES',
  'attendance': 'ATTENDANCE',
  'safety_checksheets': 'SITE_OPERATIONS',
  'incidents': 'INCIDENTS',
  'patrol_tours': 'SITE_OPERATIONS',
  'patrol_checkpoints': 'SITE_OPERATIONS',
  'visitor_logs': 'VISITORS',
  'work_orders': 'SITE_OPERATIONS',
  'sites': 'SITE_OPERATIONS',
  'branches': 'SITE_OPERATIONS',
  'regions': 'SITE_OPERATIONS',
  'assets': 'ASSETS',
  'maintenance_records': 'ASSETS',
  'inventory': 'ASSETS',
  'inventory_items': 'ASSETS',
  'leaves': 'LEAVES',
  'tasks': 'TASKS',
  'announcements': 'ANNOUNCEMENTS',
  'documents': 'DOCUMENTS',
  'clients': 'CLIENTS',
  'deployments': 'DEPLOYMENTS',
  'shifts': 'null' // we don't scope master company-wide data like shifts
};

// 1. Replacements for simple `const colRef = collection(db, 'companies', companyId, 'XXXX');` followed by `const snap = await getDocs(colRef);`
for (const [col, type] of Object.entries(map)) {
  if (type === 'null') continue;
  // Regex to find: const colRef = collection(db, 'companies', companyId, 'col'); \n const snap = await getDocs(colRef);
  const re = new RegExp(`const\\s+colRef\\s*=\\s*collection\\(\\s*db\\s*,\\s*'companies'\\s*,\\s*(?:companyId|currentCompanyId)\\s*,\\s*'${col}'\\s*\\);\\s*const\\s+snap\\s*=\\s*await\\s+getDocs\\(colRef\\);`, 'g');
  
  code = code.replace(re, (match) => {
    return `const colRef = collection(db, 'companies', companyId, '${col}');\n      const sess = SessionManager.getUserSession();\n      const q = sess ? query(colRef, ...QueryScopeEngine.buildScope(sess as any, '${type}')) : query(colRef);\n      const snap = await getDocs(q);`;
  });
  
  // also find things like: await getDocs(collection(db, 'companies', companyId, 'col'))
  const re2 = new RegExp(`getDocs\\(\\s*collection\\(\\s*db\\s*,\\s*'companies'\\s*,\\s*(?:companyId|currentCompanyId)\\s*,\\s*'${col}'\\s*\\)\\s*\\)`, 'g');
  code = code.replace(re2, (match) => {
    return `getDocs(SessionManager.getUserSession() ? query(collection(db, 'companies', companyId, '${col}'), ...QueryScopeEngine.buildScope(SessionManager.getUserSession() as any, '${type}')) : query(collection(db, 'companies', companyId, '${col}')))`;
  });
  
  // also find things like: const q = query(collection(db, 'companies', companyId, 'col'), where(...));
  // if it's already a query, we need to inject the buildScope array into the arguments.
  const re3 = new RegExp(`query\\(\\s*(collection\\(\\s*db\\s*,\\s*'companies'\\s*,\\s*companyId\\s*,\\s*'${col}'\\s*\\))\\s*,([^)]+)\\)`, 'g');
  code = code.replace(re3, (match, collectionPart, argsPart) => {
     if (match.includes('QueryScopeEngine.buildScope')) return match; // skip if already patched
     return `query(${collectionPart}, ${argsPart}, ...(SessionManager.getUserSession() ? QueryScopeEngine.buildScope(SessionManager.getUserSession() as any, '${type}') : []))`;
  });
}

// Write back
fs.writeFileSync('src/services/firestoreService.ts', code);
