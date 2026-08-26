const fs = require('fs');
let code = fs.readFileSync('src/services/firebaseAuthService.ts', 'utf8');

const replacement = `
      // Check if custom RFC 6238 TOTP resolver was used
      if (resolver?.isCustomTotp && resolver?.secret) {
        const verifyResult = await TotpService.verifyCode(verificationCode, resolver.secret);
        if (!verifyResult.isValid) {
          throw new Error(verifyResult.error || 'Invalid 6-digit MFA code. Please check your authenticator app.');
        }

        const session = resolver.tempSession as UserSession;
        if (!session) {
          throw new Error('Session state expired. Please log in again.');
        }

        // Anti-Replay Protection
        try {
          const privateMfaRef = doc(db, 'users', session.userId, 'private', 'mfa');
          const privateMfaSnap = await getDoc(privateMfaRef);
          if (privateMfaSnap.exists()) {
            const data = privateMfaSnap.data();
            if (data.lastUsedToken === verificationCode) {
              throw new Error('This TOTP code was just used. Please wait for a new code.');
            }
            await setDoc(privateMfaRef, { lastUsedToken: verificationCode, lastUsedAt: Date.now() }, { merge: true });
          }
        } catch (replayErr: any) {
           if (replayErr.message.includes('just used')) throw replayErr;
           console.warn('Replay protection check failed:', replayErr);
        }

`;

code = code.replace(
  "      // Check if custom RFC 6238 TOTP resolver was used\n      if (resolver?.isCustomTotp && resolver?.secret) {\n        const verifyResult = await TotpService.verifyCode(verificationCode, resolver.secret);\n        if (!verifyResult.isValid) {\n          throw new Error(verifyResult.error || 'Invalid 6-digit MFA code. Please check your authenticator app.');\n        }\n\n        const session = resolver.tempSession as UserSession;\n        if (!session) {\n          throw new Error('Session state expired. Please log in again.');\n        }",
  replacement
);

fs.writeFileSync('src/services/firebaseAuthService.ts', code);
console.log('FirebaseAuthService replay protection patched.');
