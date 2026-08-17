import * as fs from 'fs';

let content = fs.readFileSync('src/services/firestoreService_transformed.ts', 'utf-8');

fs.writeFileSync('src/services/firestoreService.ts', content);
console.log('Restored from transformed (which should be the original before my changes)');
