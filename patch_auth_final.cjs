const fs = require('fs');
let file = fs.readFileSync('src/services/firebaseAuthService.ts', 'utf8');

file = file.replace(/await import\('\.\.\/config\/firebase'\)/g, "await import('../../src/firebase')");
file = file.replace(/mfaEnabled: !!uData\.mfaEnabled,/g, "");

fs.writeFileSync('src/services/firebaseAuthService.ts', file);
console.log('Patched final');
