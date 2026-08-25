const fs = require('fs');
const lines = fs.readFileSync('src/services/firestoreService.ts', 'utf8').split('\n');
let count = 0;
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  const matches = line.match(/`/g);
  if (matches) {
    count += matches.length;
  }
  if (count % 2 !== 0) {
    console.log(`Unclosed backtick starting at line ${i + 1}: ${line}`);
    break;
  }
}
