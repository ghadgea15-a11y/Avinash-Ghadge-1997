const fs = require('fs');
let file = fs.readFileSync('src/services/firebaseAuthService.ts', 'utf8');

file = file.replace(/const { signInWithPopup, auth } = await import\('\.\.\/firebase'\);\n/g, "");
file = file.replace(/const { doc, getDoc, collection, query, where, getDocs, db } = await import\('\.\.\/firebase'\);\n/g, "");
file = file.replace(/hrApproval: uData.hrApproval \|\| 'PENDING'\n      \};/g, `hrApproval: uData.hrApproval || 'PENDING',
        loginMode: 'SSO',
        tokenExpiresAt: new Date(Date.now() + 3600000).toISOString(),
        isBiometricEnabled: false,
        lastActiveAt: new Date().toISOString()
      };`);

fs.writeFileSync('src/services/firebaseAuthService.ts', file);
console.log('Fixed SSO imports and types');
