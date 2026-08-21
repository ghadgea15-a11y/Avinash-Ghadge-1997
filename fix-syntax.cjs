const fs = require('fs');
const file = 'src/types/index.ts';
let content = fs.readFileSync(file, 'utf8');

// I need to properly define ThreeWayMatchRecord
content = content.replace(
  /\];\s*passedAt\?\: string;\s*reviewedBy\?\: string;\s*\}/,
  ""
);

fs.writeFileSync(file, content);
