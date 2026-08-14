const fs = require('fs');
let code = fs.readFileSync('src/components/screens/LoginScreen.tsx', 'utf8');

code = code.replace(/onLoginSuccess\(updatedSession\);/, `const company = SessionManager.getActiveCompany();
      if (company) {
        onLoginSuccess(updatedSession, company);
      }`);

fs.writeFileSync('src/components/screens/LoginScreen.tsx', code);
console.log('Fixed biometric onLoginSuccess');
