const fs = require('fs');
let code = fs.readFileSync('src/services/firebaseAuthService.ts', 'utf8');

// 1. Remove RESERVED_SUPER_ADMIN_EMAIL
code = code.replace(/export const RESERVED_SUPER_ADMIN_EMAIL = 'ghadgea15@gmail\.com';\n/g, '');

// I need to replace the logic inside signInWithEmailAndPassword, signUpWithEmailPassword, and signInWithPopup.
// Since it's huge, I'll use regex or string replacement carefully.
