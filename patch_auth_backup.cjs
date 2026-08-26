const fs = require('fs');
let code = fs.readFileSync('src/services/firebaseAuthService.ts', 'utf8');

const backupLookup = `
        // Check if user has TOTP MFA enabled
        if (uData?.mfaEnabled) {
          let secretToUse = uData.totpSecret; // Fallback for backwards compatibility if any
          let backupCodes = [];
          if (!secretToUse) {
            try {
              const privateMfaSnap = await getDoc(doc(db, 'users', fbUser.uid, 'private', 'mfa'));
              if (privateMfaSnap.exists()) {
                secretToUse = privateMfaSnap.data().totpSecret;
                backupCodes = privateMfaSnap.data().backupCodes || [];
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
                backupCodes: backupCodes,
                tempSession: session,
`;

code = code.replace(
  "        // Check if user has TOTP MFA enabled\n        if (uData?.mfaEnabled) {\n          let secretToUse = uData.totpSecret; // Fallback for backwards compatibility if any\n          if (!secretToUse) {\n            try {\n              const privateMfaSnap = await getDoc(doc(db, 'users', fbUser.uid, 'private', 'mfa'));\n              if (privateMfaSnap.exists()) {\n                secretToUse = privateMfaSnap.data().totpSecret;\n              }\n            } catch (e) {\n              console.warn('Failed to load private MFA document:', e);\n            }\n          }\n          if (secretToUse) {\n            throw Object.assign(new Error('MFA_REQUIRED'), { \n              resolver: {\n                isCustomTotp: true,\n                secret: secretToUse,\n                tempSession: session,",
  backupLookup
);

// Now patch verifyCode logic
const verifyBackup = `
        let isValidCode = false;
        let isBackupCode = false;
        const verifyResult = await TotpService.verifyCode(verificationCode, resolver.secret);
        if (verifyResult.isValid) {
           isValidCode = true;
        } else if (resolver.backupCodes && resolver.backupCodes.includes(verificationCode)) {
           isValidCode = true;
           isBackupCode = true;
        }

        if (!isValidCode) {
          throw new Error(verifyResult.error || 'Invalid MFA or Backup code.');
        }

        const session = resolver.tempSession as UserSession;
        if (!session) {
          throw new Error('Session state expired. Please log in again.');
        }

        // Anti-Replay Protection & Backup Code consumption
        try {
          const privateMfaRef = doc(db, 'users', session.userId, 'private', 'mfa');
          const privateMfaSnap = await getDoc(privateMfaRef);
          if (privateMfaSnap.exists()) {
            const data = privateMfaSnap.data();
            if (!isBackupCode && data.lastUsedToken === verificationCode) {
              throw new Error('This TOTP code was just used. Please wait for a new code.');
            }
            
            const updatePayload: any = { lastUsedToken: verificationCode, lastUsedAt: Date.now() };
            if (isBackupCode) {
               updatePayload.backupCodes = (data.backupCodes || []).filter((c: string) => c !== verificationCode);
            }
            
            await setDoc(privateMfaRef, updatePayload, { merge: true });
          }
        } catch (replayErr: any) {
           if (replayErr.message.includes('just used')) throw replayErr;
           console.warn('Replay protection check failed:', replayErr);
        }
`;

code = code.replace(
  "        const verifyResult = await TotpService.verifyCode(verificationCode, resolver.secret);\n        if (!verifyResult.isValid) {\n          throw new Error(verifyResult.error || 'Invalid 6-digit MFA code. Please check your authenticator app.');\n        }\n\n        const session = resolver.tempSession as UserSession;\n        if (!session) {\n          throw new Error('Session state expired. Please log in again.');\n        }\n\n        // Anti-Replay Protection\n        try {\n          const privateMfaRef = doc(db, 'users', session.userId, 'private', 'mfa');\n          const privateMfaSnap = await getDoc(privateMfaRef);\n          if (privateMfaSnap.exists()) {\n            const data = privateMfaSnap.data();\n            if (data.lastUsedToken === verificationCode) {\n              throw new Error('This TOTP code was just used. Please wait for a new code.');\n            }\n            await setDoc(privateMfaRef, { lastUsedToken: verificationCode, lastUsedAt: Date.now() }, { merge: true });\n          }\n        } catch (replayErr: any) {\n           if (replayErr.message.includes('just used')) throw replayErr;\n           console.warn('Replay protection check failed:', replayErr);\n        }",
  verifyBackup
);

fs.writeFileSync('src/services/firebaseAuthService.ts', code);
console.log('FirebaseAuthService backup codes verified.');
