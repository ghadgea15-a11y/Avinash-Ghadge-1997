const fs = require('fs');
let lines = fs.readFileSync('src/services/firestoreService.ts', 'utf8').split('\n');

for (let i = 5675; i < 5690; i++) {
  if (lines[i] === '  }') {
    if (lines[i-1] === '  }') {
      console.log(`Found duplicate brace at line ${i}, removing it.`);
      lines.splice(i, 1);
      break;
    }
  }
}

fs.writeFileSync('src/services/firestoreService.ts', lines.join('\n'));
