const fs = require('fs');

let content = fs.readFileSync('src/components/screens/SuperAdminAdminsScreen.tsx', 'utf8');
content = content.replace(/a\.createdAt\? \?/g, "a.createdAt ?");
content = content.replace(/a\.lastLoginAt\? \?/g, "a.lastLoginAt ?");
fs.writeFileSync('src/components/screens/SuperAdminAdminsScreen.tsx', content);

