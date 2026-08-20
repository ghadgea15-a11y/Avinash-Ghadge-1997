const fs = require('fs');
const content = fs.readFileSync('src/components/screens/ServiceDeskScreen.tsx', 'utf8');
const lines = content.split('\n');
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('<button')) {
    console.log(`Line ${i + 1}: ${lines[i].trim()}`);
  }
}
