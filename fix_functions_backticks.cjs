const fs = require('fs');
const file = 'functions/src/index.ts';
let code = fs.readFileSync(file, 'utf8');

// Replace \` with `
code = code.replace(/\\`/g, '`');
// Fix some possible escaped dollars \$ with $
code = code.replace(/\\\$/g, '$');

fs.writeFileSync(file, code);
console.log('Fixed backticks.');
