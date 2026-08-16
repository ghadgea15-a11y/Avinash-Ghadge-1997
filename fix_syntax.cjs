const fs = require('fs');
let code = fs.readFileSync('src/components/screens/SiteOperationsScreen.tsx', 'utf8');

// Fix Patrol Checkpoint render (around line 802-810)
const patrolRegex = /<div className="flex items-center justify-between">\s*<div className="flex gap-2">/g;
code = code.replace(patrolRegex, '<div className="flex items-center justify-between">');

// We also replaced the Incident list render. Let's find exactly what happened.
// I will output the surrounding code of the first error: 922:17 JSX expressions must have one parent element.
fs.writeFileSync('src/components/screens/SiteOperationsScreen.tsx', code);
