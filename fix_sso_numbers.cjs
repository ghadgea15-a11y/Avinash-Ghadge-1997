const fs = require('fs');
let file = fs.readFileSync('src/services/firebaseAuthService.ts', 'utf8');

file = file.replace(/tokenExpiresAt: new Date\\(Date\\.now\\(\\) \\+ 3600000\\)\\.toISOString\\(\\),/g, "tokenExpiresAt: Date.now() + 3600000,");
file = file.replace(/lastActiveAt: new Date\\(\\)\\.toISOString\\(\\)/g, "lastActiveAt: Date.now()");

fs.writeFileSync('src/services/firebaseAuthService.ts', file);
console.log('Fixed numbers');
