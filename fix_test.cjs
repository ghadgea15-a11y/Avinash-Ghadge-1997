const fs = require('fs');
let code = fs.readFileSync('src/services/enterpriseConflictTestRunner.ts', 'utf8');
code = code.replace(/name: 'Alpha Tech Park',\n\s*name: 'Alpha Tech Park',\n\s*branchId: 'BRANCH-01',\n\s*clientName: 'Alpha Global Corp',/g, "name: 'Alpha Tech Park',\n        branchId: 'BRANCH-01',");
code = code.replace(/name: 'Omega Logistics Hub',\n\s*name: 'Omega Logistics Hub',\n\s*branchId: 'BRANCH-01',\n\s*clientName: 'Omega Cargo Ltd',/g, "name: 'Omega Logistics Hub',\n        branchId: 'BRANCH-01',");
fs.writeFileSync('src/services/enterpriseConflictTestRunner.ts', code);
