const fs = require('fs');
let lines = fs.readFileSync('src/services/firestoreService.ts', 'utf8').split('\n');

for (let i = 6480; i < 6490; i++) {
  if (lines[i] === '  }') {
    // If the previous line is also `  }`, we have a duplicate!
    if (lines[i-1] === '  }') {
      console.log(`Found duplicate brace at line ${i}, removing it.`);
      lines.splice(i, 1);
      break;
    }
  }
}

fs.writeFileSync('src/services/firestoreService.ts', lines.join('\n'));
