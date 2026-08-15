const fs = require('fs');
let code = fs.readFileSync('src/services/firebaseAuthService.ts', 'utf8');

code = code.replace(
  `      try {
        const userCredential = await signInWithEmailAndPassword(auth, cleanInputLower, passwordOrPin);
        const fbUser = userCredential.user;`,
  `      try {
        let userCredential;
        try {
          userCredential = await signInWithEmailAndPassword(auth, cleanInputLower, passwordOrPin);
        } catch (authErr: any) {
          if (authErr.code === 'auth/user-not-found' || authErr.code === 'auth/invalid-credential') {
             // If it's a reserved super admin, auto-create the account
             if (RESERVED_SUPER_ADMIN_EMAILS.includes(cleanInputLower)) {
                try {
                  const { createUserWithEmailAndPassword } = require('firebase/auth');
                  userCredential = await createUserWithEmailAndPassword(auth, cleanInputLower, passwordOrPin);
                } catch (createErr: any) {
                  throw authErr;
                }
             } else {
               throw authErr;
             }
          } else {
            throw authErr;
          }
        }
        const fbUser = userCredential.user;`
);

fs.writeFileSync('src/services/firebaseAuthService.ts', code);
