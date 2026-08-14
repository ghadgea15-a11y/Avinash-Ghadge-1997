const fs = require('fs');

// UpdateCheckerScreen.tsx
let ucs = fs.readFileSync('src/components/screens/UpdateCheckerScreen.tsx', 'utf8');
ucs = ucs.replace(/'COMPANY_CODE'/g, "'LOGIN'");
fs.writeFileSync('src/components/screens/UpdateCheckerScreen.tsx', ucs);

// Header.tsx
let hdr = fs.readFileSync('src/components/common/Header.tsx', 'utf8');
hdr = hdr.replace(/'COMPANY_CODE'/g, "'LOGIN'");
fs.writeFileSync('src/components/common/Header.tsx', hdr);

// App.tsx
let app = fs.readFileSync('src/App.tsx', 'utf8');
app = app.replace(/'COMPANY_CODE'/g, "'LOGIN'");
fs.writeFileSync('src/App.tsx', app);

console.log('Fixed COMPANY_CODE routes');
