const fs = require('fs');
const rules = fs.readFileSync('firestore.rules', 'utf8');

const tablesInCode = fs.readFileSync('tables.txt', 'utf8').split('\n').filter(Boolean);

const missing = [];
for (const table of tablesInCode) {
  if (!rules.includes(`match /${table}/{`)) {
    missing.push(table);
  }
}

console.log(missing.join(', '));
