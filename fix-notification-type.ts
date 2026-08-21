import * as fs from 'fs';
const file = 'src/services/learningManagementService.ts';
let content = fs.readFileSync(file, 'utf8');
content = content.replace("type: resultStatus === 'PASSED' ? 'SUCCESS' : 'ERROR'", "type: resultStatus === 'PASSED' ? 'SUCCESS' : 'ALERT'");
fs.writeFileSync(file, content);
