import * as fs from 'fs';

let fsData = fs.readFileSync('src/services/firestoreService.ts', 'utf-8');

// I can just replace the implementation of the second one with an empty string, or simply remove the duplicate logic.
// The easiest way is to split the file by 'static subscribeToDailySiteLogs' and then put it together carefully.
const lines = fsData.split('\n');
let newLines = [];
let skip = false;

for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('static subscribeToDailySiteLogs(userSession: UserSession')) {
    // start skipping
    skip = true;
  }
  
  if (skip) {
    if (lines[i].includes('static subscribeToTasks')) {
      skip = false;
      newLines.push(lines[i]);
    }
  } else {
    newLines.push(lines[i]);
  }
}

fs.writeFileSync('src/services/firestoreService.ts', newLines.join('\n'));
