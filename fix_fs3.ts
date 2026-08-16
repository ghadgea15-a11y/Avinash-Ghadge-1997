import * as fs from 'fs';

let content = fs.readFileSync('src/services/firestoreService.ts', 'utf-8');
const search = "      return () => {};\n    }\n  static subscribeToTasks";
const rep = "      return () => {};\n    }\n  }\n\n  static subscribeToTasks";
if(content.includes(search)) {
  content = content.replace(search, rep);
  fs.writeFileSync('src/services/firestoreService.ts', content);
  console.log('Fixed');
} else {
  console.log('Not found!');
}
