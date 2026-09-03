const fs = require('fs');

const appContent = fs.readFileSync('src/App.tsx', 'utf8');

const navContent = fs.readFileSync('src/config/navigationArchitecture.ts', 'utf8');
const navScreens = [...navContent.matchAll(/screen:\s*'([^']+)'/g)].map(m => m[1]);

console.log("Checking screens...\n");
let hasErrors = false;

navScreens.forEach(screen => {
  // Check if App.tsx handles it
  if (!appContent.includes(`currentScreen === '${screen}'`)) {
    console.log(`[MISSING IN APP.TSX] ${screen}`);
    hasErrors = true;
  }
});

// Also let's check what components are actually loaded
console.log("Done checking");
