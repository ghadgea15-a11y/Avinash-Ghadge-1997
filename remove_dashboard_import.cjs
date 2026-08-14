const fs = require('fs');
let app = fs.readFileSync('src/App.tsx', 'utf8');
app = app.replace(/import \{ RoleDashboardScreen \} from '\.\/components\/screens\/RoleDashboardScreen';\n/, '');
fs.writeFileSync('src/App.tsx', app);
console.log('Removed import');
