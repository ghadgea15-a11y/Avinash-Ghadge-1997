const fs = require('fs');
let text = fs.readFileSync('src/components/screens/SuperAdminSubscriptionsScreen.tsx', 'utf8');

const regex = /      \}\n        \}\),/g;
const replacement = `        }),`;

text = text.replace(regex, replacement);

fs.writeFileSync('src/components/screens/SuperAdminSubscriptionsScreen.tsx', text);
