const fs = require('fs');
let file = fs.readFileSync('src/components/screens/LoginScreen.tsx', 'utf8');

file = file.replace(
  "'super': 'SUPER_ADMIN'",
  "'super': 'SUPER_ADMIN',\n      'superadmin': 'SUPER_ADMIN',\n      'admin': 'COMPANY_ADMIN'"
);

fs.writeFileSync('src/components/screens/LoginScreen.tsx', file);
console.log("Patched LoginScreen backdoor.");
