const fs = require('fs');
let code = fs.readFileSync('src/components/screens/SuperAdminReportsScreen.tsx', 'utf8');

code = code.replace(/<\/div>\s*<\/div>\s*<\/div>\s*\);\s*};$/, '</div></div></div></>)}</div>);};');
fs.writeFileSync('src/components/screens/SuperAdminReportsScreen.tsx', code);
console.log('Fixed using regex');
