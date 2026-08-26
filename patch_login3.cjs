const fs = require('fs');
let code = fs.readFileSync('src/components/screens/LoginScreen.tsx', 'utf8');

code = code.replace(
  "      await setDoc(doc(db, 'users', uid, 'private', 'mfa'), {\n        totpSecret: mfaSetupData.secret,\n        updatedAt: new Date().toISOString()\n      }, { merge: true });",
  "      await setDoc(doc(db, 'users', uid, 'private', 'mfa'), {\n        totpSecret: mfaSetupData.secret,\n        lastUsedToken: mfaCode,\n        lastUsedAt: Date.now(),\n        updatedAt: new Date().toISOString()\n      }, { merge: true });"
);

fs.writeFileSync('src/components/screens/LoginScreen.tsx', code);
console.log('LoginScreen enrollment patched.');
