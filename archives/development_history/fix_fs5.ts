import * as fs from 'fs';

let content = fs.readFileSync('src/services/firestoreService.ts', 'utf-8');
content = content.replace("  }\n}\n\n// Indian Rupee", "  }\n\n// Indian Rupee");
fs.writeFileSync('src/services/firestoreService.ts', content);
