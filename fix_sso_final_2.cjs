const fs = require('fs');
let file = fs.readFileSync('src/services/firebaseAuthService.ts', 'utf8');

const targetStr = `        tokenExpiresAt: Date.now() + 3600000,
        isBiometricEnabled: false,
        lastActiveAt: Date.now()
      };`;

const replacement = `        tokenExpiresAt: Date.now() + 3600000,
        isBiometricEnabled: false,
        lastActiveAt: Date.now(),
        accountStatus: sessionRes.accountStatus || 'ACTIVE',
        emailVerified: fbUser.emailVerified || false
      };`;

// Use replace but only for the first occurrence in the sign-in flow
let parts = file.split('loginMode: \'SSO\',');
if (parts.length > 1) {
  parts[1] = parts[1].replace(targetStr, replacement);
  file = parts.join('loginMode: \'SSO\',');
}

fs.writeFileSync('src/services/firebaseAuthService.ts', file);
console.log('Fixed SSO mapping correctly');
