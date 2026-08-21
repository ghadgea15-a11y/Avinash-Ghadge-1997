import * as fs from 'fs';

const file = 'src/services/learningManagementService.ts';
let content = fs.readFileSync(file, 'utf8');

// Replace all \` with `
content = content.replace(/\\\`/g, '`');
// Also replace \$ with $
content = content.replace(/\\\$/g, '$');

fs.writeFileSync(file, content);
