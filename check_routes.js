const fs = require('fs');

const navContent = fs.readFileSync('src/config/navigationArchitecture.ts', 'utf8');
const appContent = fs.readFileSync('src/App.tsx', 'utf8');

const navScreens = [...navContent.matchAll(/screen:\s*'([^']+)'/g)].map(m => m[1]);
const appScreens = [...appContent.matchAll(/currentScreen ===\s*'([^']+)'/g)].map(m => m[1]);

const missing = navScreens.filter(s => !appScreens.includes(s));
console.log("Missing in App.tsx:");
console.log(missing.join('\n'));
