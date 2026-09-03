const fs = require('fs');
let file = fs.readFileSync('src/components/screens/LoginScreen.tsx', 'utf8');

file = file.replace(/SessionManager\.saveSession\(res\.userSession\);/g, "SessionManager.setUserSession(res.userSession);");
file = file.replace(/onLoginSuccess\(res\.userSession\);/g, "onLoginSuccess(res.userSession, validatedCompany);");

fs.writeFileSync('src/components/screens/LoginScreen.tsx', file);
console.log('Patched login2');
