const fs = require('fs');

// 1. Update LoginScreen.tsx
let ls = fs.readFileSync('src/components/screens/LoginScreen.tsx', 'utf8');
ls = ls.replace(/onLoginSuccess: \(session: UserSession\) => void;/, 'onLoginSuccess: (session: UserSession, company: CompanyTenant) => void;');
ls = ls.replace(/onLoginSuccess\(session\);/, 'onLoginSuccess(session, company);');
fs.writeFileSync('src/components/screens/LoginScreen.tsx', ls);

// 2. Update App.tsx
let app = fs.readFileSync('src/App.tsx', 'utf8');
app = app.replace(/onLoginSuccess=\{\(session\) => \{/, 'onLoginSuccess={(session, company) => {\n                          setActiveCompany(company);');
fs.writeFileSync('src/App.tsx', app);

console.log('Fixed onLoginSuccess signature');
