const fs = require('fs');
let code = fs.readFileSync('src/components/screens/SiteOperationsScreen.tsx', 'utf8');

// Find all missing pagination definitions
console.log("Found checkpoints?", code.includes('const filteredCheckpoints ='));
