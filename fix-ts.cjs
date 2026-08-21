const fs = require('fs');
let c = fs.readFileSync('src/types/index.ts', 'utf8');
c = c.replace(/}\[export type/g, "}\n\nexport type");
fs.writeFileSync('src/types/index.ts', c);
