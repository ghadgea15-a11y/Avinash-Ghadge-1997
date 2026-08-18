const fs = require('fs');

let f1 = fs.readFileSync('src/components/screens/ServiceDeskScreen.tsx', 'utf8');
f1 = f1.replace(/selectedClient\?\.primaryContactName/g, "''"); // just removing it as it's not valid
fs.writeFileSync('src/components/screens/ServiceDeskScreen.tsx', f1);

