const fs = require('fs');
let file = fs.readFileSync('src/services/firebaseAuthService.ts', 'utf8');

const replacement = `
        lastActiveAt: Date.now(),
        accountStatus: sessionRes.accountStatus,
        emailVerified: sessionRes.emailVerified || fbUser.emailVerified || false
      };`;

file = file.replace(/lastActiveAt: Date\.now\(\)\n      \};/g, replacement.trim());
fs.writeFileSync('src/services/firebaseAuthService.ts', file);
console.log('Fixed SSO session');
