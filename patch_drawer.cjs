const fs = require('fs');
let file = fs.readFileSync('src/components/common/NavigationDrawer.tsx', 'utf8');

const regex = /\<button\s*onClick=\{\(\) \=\> \{ onNavigate\('ROLE_DASHBOARD'\); onClose\(\); \}\}.*?<\/button>/s;
file = file.replace(regex, '');

fs.writeFileSync('src/components/common/NavigationDrawer.tsx', file);
