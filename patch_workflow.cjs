const fs = require('fs');
let code = fs.readFileSync('.github/workflows/main.yml', 'utf8');

code = code.replace(/gradle-version: '9\.3\.1'/g, "gradle-version: '8.7'");

fs.writeFileSync('.github/workflows/main.yml', code);
console.log('Workflow Patched');
