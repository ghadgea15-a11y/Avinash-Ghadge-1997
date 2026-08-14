const fs = require('fs');
let code = fs.readFileSync('src/components/screens/LoginScreen.tsx', 'utf8');

code = code.replace(/if \(existingSession && existingSession\.companyId === activeCompany\.companyId\) \{/, `const currentCompanyId = SessionManager.getActiveCompany()?.companyId || companyCode.trim().toUpperCase();
    if (existingSession && existingSession.companyId === currentCompanyId) {`);

fs.writeFileSync('src/components/screens/LoginScreen.tsx', code);
console.log('Fixed biometric check.');
