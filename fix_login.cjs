const fs = require('fs');
let file = fs.readFileSync('src/components/screens/LoginScreen.tsx', 'utf8');

file = file.replace(/import\('\.\.\/\.\.\/services\/sessionManager'\)\.then\(\(sm\) => \{\n\s*sm\.SessionManager\.setActiveCompany\(mockCompany as any\);\n\s*sm\.SessionManager\.setUserSession\(mockSession as any\);\n\s*onLoginSuccess\(mockSession as any, mockCompany as any\);\n\s*setLoading\(false\);\n\s*\}\);/,
`      SessionManager.setActiveCompany(mockCompany as any);
      SessionManager.setUserSession(mockSession as any);
      onLoginSuccess(mockSession as any, mockCompany as any);
      setLoading(false);`
);

fs.writeFileSync('src/components/screens/LoginScreen.tsx', file);
console.log('Fixed dynamic import');
