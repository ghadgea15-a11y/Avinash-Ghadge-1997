const fs = require('fs');
const file = 'src/services/firebaseAuthService.ts';
let code = fs.readFileSync(file, 'utf8');

const target1 = `        // Check if user has TOTP MFA enabled
        if (uData?.mfaEnabled && uData?.totpSecret) {
          throw Object.assign(new Error('MFA_REQUIRED'), { 
            resolver: {
              isCustomTotp: true,
              secret: uData.totpSecret,
              tempSession: session,
              hints: [{ uid: fbUser.uid }]
            },
            emailOrId: cleanInput,
            companyId: userCompanyId
          });
        }`;

const replacement1 = `        // Check if user has TOTP MFA enabled
        if (uData?.mfaEnabled) {
          let secretToUse = uData.totpSecret; // Fallback for backwards compatibility if any
          if (!secretToUse) {
            try {
              const privateMfaSnap = await getDoc(doc(db, 'users', fbUser.uid, 'private', 'mfa'));
              if (privateMfaSnap.exists()) {
                secretToUse = privateMfaSnap.data().totpSecret;
              }
            } catch (e) {
              console.warn('Failed to load private MFA document:', e);
            }
          }
          if (secretToUse) {
            throw Object.assign(new Error('MFA_REQUIRED'), { 
              resolver: {
                isCustomTotp: true,
                secret: secretToUse,
                tempSession: session,
                hints: [{ uid: fbUser.uid }]
              },
              emailOrId: cleanInput,
              companyId: userCompanyId
            });
          }
        }`;

if(code.includes(target1)) {
  code = code.replace(target1, replacement1);
  fs.writeFileSync(file, code);
  console.log('Patched FirebaseAuthService MFA');
} else {
  console.log('Target1 not found');
}
