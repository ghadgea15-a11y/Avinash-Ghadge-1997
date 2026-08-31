const fs = require('fs');
let code = fs.readFileSync('src/services/firestoreService.ts', 'utf8');
code = code.split("const compId = companyId || session.companyId || '';").join("");
fs.writeFileSync('src/services/firestoreService.ts', code);
