const fs = require('fs');

// offlineConflictResolutionEngine
let f1 = fs.readFileSync('src/services/offlineConflictResolutionEngine.ts', 'utf8');
f1 = f1.replace(/status === 'DISBURSED'/g, 'status === "PAID"');
fs.writeFileSync('src/services/offlineConflictResolutionEngine.ts', f1);

