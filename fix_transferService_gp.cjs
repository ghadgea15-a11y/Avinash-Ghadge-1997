const fs = require('fs');
let code = fs.readFileSync('src/services/transferService.ts', 'utf8');

code = code.replace(
  "        createdAt: new Date().toISOString(),\n        updatedAt: new Date().toISOString()",
  "        createdAt: new Date().toISOString()"
);

fs.writeFileSync('src/services/transferService.ts', code);
