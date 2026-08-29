const fs = require('fs');
let file = 'src/components/wfm/MusterRegister.tsx';
let content = fs.readFileSync(file, 'utf8');
content = content.replace(/setSites\(data: any\[\]\);/g, 'setSites(data);');
fs.writeFileSync(file, content);

file = 'src/components/wfm/OvertimeDashboard.tsx';
content = fs.readFileSync(file, 'utf8');
content = content.replace(/setPolicies\(data: any\[\]\);/g, 'setPolicies(data);');
// Let's check what line 154 is
