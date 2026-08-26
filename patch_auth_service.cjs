const fs = require('fs');
let code = fs.readFileSync('src/services/firebaseAuthService.ts', 'utf8');

// Find where mfaEnabled is checked
// It looks like:
//         // Check if user has TOTP MFA enabled
//         if (uData?.mfaEnabled) {
// ...
//         }

code = code.replace(
  "        // Check if user has TOTP MFA enabled\n        if (uData?.mfaEnabled) {",
  "        // Enforce TOTP MFA Enrollment for all users if not already enrolled\n        if (!uData?.mfaEnabled) {\n          throw Object.assign(new Error('MFA_ENROLLMENT_REQUIRED'), { \n            resolver: {\n              tempSession: session\n            },\n            emailOrId: cleanInput,\n            companyId: userCompanyId\n          });\n        }\n\n        // Check if user has TOTP MFA enabled\n        if (uData?.mfaEnabled) {"
);

fs.writeFileSync('src/services/firebaseAuthService.ts', code);
console.log('FirebaseAuthService patched.');
