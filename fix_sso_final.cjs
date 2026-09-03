const fs = require('fs');
let file = fs.readFileSync('src/services/firebaseAuthService.ts', 'utf8');

file = file.replace(/lastActiveAt: Date.now\(\),\n        accountStatus: sessionRes.accountStatus,\n        emailVerified: sessionRes.emailVerified \|\| fbUser.emailVerified \|\| false/g, "lastActiveAt: Date.now()");

fs.writeFileSync('src/services/firebaseAuthService.ts', file);
console.log('Cleaned up duplicate injection');
