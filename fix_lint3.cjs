const fs = require('fs');
let code = fs.readFileSync('src/components/screens/CompanyManagementScreen.tsx', 'utf8');

code = code.replace(
  /const desRecord: DesignationRecord = \{\n\s*id: editingDesig.id \|\| `DESIG-\$\{Date.now\(\).toString\(36\)\}`,/,
  'const desRecord: DesignationRecord = {\n      companyId: companyId, id: editingDesig.id || `DESIG-${Date.now().toString(36)}`,'
);

fs.writeFileSync('src/components/screens/CompanyManagementScreen.tsx', code);


let fsCode = fs.readFileSync('src/services/firestoreService.ts', 'utf8');
fsCode = fsCode.replace(
  /\{ id: 'DEPT-/g,
  "{ companyId: '', id: 'DEPT-"
);
fs.writeFileSync('src/services/firestoreService.ts', fsCode);
