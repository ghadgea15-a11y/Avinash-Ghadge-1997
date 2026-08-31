const fs = require('fs');

let content = fs.readFileSync('src/components/screens/SuperAdminManagementScreen.tsx', 'utf8');
content = content.replace(/onChange=\{e => const noop = \(e\.target\.value\)\}/g, "onChange={e => {}}");
fs.writeFileSync('src/components/screens/SuperAdminManagementScreen.tsx', content);
