const fs = require('fs');

let navDraw = fs.readFileSync('src/components/common/NavigationDrawer.tsx', 'utf8');
const regex = /<button\s+onClick=\{\(\) => \{ onNavigate\('EMPLOYEES'\); onClose\(\); \}\}[\s\S]*?LayoutDashboard className="w-4 h-4" \/>\s*<span>Dashboard<\/span>[\s\S]*?<\/button>/;
navDraw = navDraw.replace(regex, '');

fs.writeFileSync('src/components/common/NavigationDrawer.tsx', navDraw);
console.log('Fixed drawer');
