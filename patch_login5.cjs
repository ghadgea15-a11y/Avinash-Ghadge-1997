const fs = require('fs');
let code = fs.readFileSync('src/components/screens/LoginScreen.tsx', 'utf8');

code = code.replace(
  "        totpSecret: mfaSetupData.secret,\n        lastUsedToken: mfaCode,",
  "        totpSecret: mfaSetupData.secret,\n        backupCodes: mfaSetupData.backupCodes,\n        lastUsedToken: mfaCode,"
);

fs.writeFileSync('src/components/screens/LoginScreen.tsx', code);
console.log('LoginScreen backup codes saved.');
