const fs = require('fs');
let content = fs.readFileSync('src/services/contractExpiryEngine.ts', 'utf8');

content = content.replace("import { db } from '../firebase';\n", "");

fs.writeFileSync('src/services/contractExpiryEngine.ts', content);
