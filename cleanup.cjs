const fs = require('fs');
let content = fs.readFileSync('src/services/firestoreService.ts', 'utf8');
const lines = content.split('\n');
const toDelete = [];
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('updateLead error:')) {
    // This is the console.error line
    // We want to delete 6 lines above it, and 3 lines below it (inclusive)
    // ONLY IF it's not the actual updateLead function
    if (i > 4700) { // Since the real one is at 4665
      for (let j = i - 6; j <= i + 2; j++) {
        toDelete.push(j);
      }
    }
  }
}
const newLines = lines.filter((_, idx) => !toDelete.includes(idx));
fs.writeFileSync('src/services/firestoreService.ts', newLines.join('\n'));
