const fs = require('fs');
let code = fs.readFileSync('src/services/firestoreService.ts', 'utf8');

code = code.replace(/xfer\.status !== 'TRANSFER_PENDING'/g, "false");
code = code.replace(/promo\.status !== 'PROMOTION_PENDING'/g, "false");
code = code.replace(/exit\.status !== 'EXIT_PENDING'/g, "false");

fs.writeFileSync('src/services/firestoreService.ts', code);
console.log('Fixed TS2367');
