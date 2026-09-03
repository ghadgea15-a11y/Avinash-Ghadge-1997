const fs = require('fs');
let content = fs.readFileSync('src/types/index.ts', 'utf8');

content = content.replace(/'PENDING' \| 'PENDING_APPROVAL' \| 'APPROVED' \| 'REJECTED' \| 'CANCELLED' \| 'WITHDRAWN'/g, "'PENDING' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'CANCELLED' | 'WITHDRAWN' | 'ACCEPTED'");

fs.writeFileSync('src/types/index.ts', content);
