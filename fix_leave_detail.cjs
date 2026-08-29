const fs = require('fs');
const file = 'src/types/index.ts';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(/leaveCode: string;/g, 'leaveCode?: string;');
content = content.replace(/leaveName: string;/g, 'leaveName?: string;');
content = content.replace(/accrued: number;/g, 'accrued?: number;');
content = content.replace(/availableBalance: number;/g, 'availableBalance?: number;');

fs.writeFileSync(file, content);
