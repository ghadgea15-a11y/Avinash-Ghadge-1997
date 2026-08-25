const fs = require('fs');
const code = fs.readFileSync('src/services/firestoreService.ts', 'utf8');
const openCount = (code.match(/\/\*/g) || []).length;
const closeCount = (code.match(/\*\//g) || []).length;
console.log(`Open: ${openCount}, Close: ${closeCount}`);
