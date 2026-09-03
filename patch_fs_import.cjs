const fs = require('fs');
let content = fs.readFileSync('src/services/firestoreService.ts', 'utf8');

if (!content.includes("import { GrcIntegrationEngine }")) {
  content = `import { GrcIntegrationEngine } from './grcIntegrationEngine';\n` + content;
  fs.writeFileSync('src/services/firestoreService.ts', content);
  console.log("Added import to firestoreService.ts");
}
