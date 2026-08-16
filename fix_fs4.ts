import * as fs from 'fs';

let content = fs.readFileSync('src/services/firestoreService.ts', 'utf-8');
content = content.replace("  static subscribeToTasks(", "  }\n\n  static subscribeToTasks(");
fs.writeFileSync('src/services/firestoreService.ts', content);
