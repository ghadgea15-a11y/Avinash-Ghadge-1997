const fs = require('fs');
let code = fs.readFileSync('src/components/screens/LoginScreen.tsx', 'utf8');

// For MFA_ENROLL input
code = code.replace(
  "setMfaCode(e.target.value.replace(/[^0-9]/g, ''));",
  "setMfaCode(e.target.value.replace(/[^0-9A-Z]/gi, '').toUpperCase());"
);

// We need to replace it again since there are two MFA steps now (ENROLL and VERIFY)
code = code.replace(
  "setMfaCode(e.target.value.replace(/[^0-9]/g, ''));",
  "setMfaCode(e.target.value.replace(/[^0-9A-Z]/gi, '').toUpperCase());"
);

// We also need to change maxLength={6} to maxLength={8}
code = code.replace(
  "maxLength={6}",
  "maxLength={8}"
);

code = code.replace(
  "maxLength={6}",
  "maxLength={8}"
);

// also length checks
code = code.replace(
  "mfaCode.length < 6",
  "mfaCode.length < 6"
);

fs.writeFileSync('src/components/screens/LoginScreen.tsx', code);
console.log('LoginScreen validation patched.');
