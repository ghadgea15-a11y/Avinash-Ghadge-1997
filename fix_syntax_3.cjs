const fs = require('fs');
let file = 'src/components/wfm/OvertimeDashboard.tsx';
let content = fs.readFileSync(file, 'utf8');
content = content.replace(/setPolicies\(pol: any\);/g, 'setPolicies(pol);');
fs.writeFileSync(file, content);
