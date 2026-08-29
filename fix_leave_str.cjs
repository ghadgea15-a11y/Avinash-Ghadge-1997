const fs = require('fs');
const file = 'src/services/firestoreService.ts';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(/QueryScopeEngine\.buildScope\(session, 'LEAVE'\)/g, "QueryScopeEngine.buildScope(session, 'LEAVES')");

fs.writeFileSync(file, content);
