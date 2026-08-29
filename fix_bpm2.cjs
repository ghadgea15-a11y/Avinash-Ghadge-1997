const fs = require('fs');
let content = fs.readFileSync('src/services/bpmService.ts', 'utf8');
content = content.replace(/asProxy:/g, '// asProxy:');
content = content.replace(/delegatorId:/g, '// delegatorId:');
content = content.replace(/delegatorName:/g, '// delegatorName:');
content = content.replace(/delegationId:/g, '// delegationId:');
fs.writeFileSync('src/services/bpmService.ts', content);
