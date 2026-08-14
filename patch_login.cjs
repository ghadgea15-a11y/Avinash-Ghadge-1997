const fs = require('fs');
let file = fs.readFileSync('src/components/screens/LoginScreen.tsx', 'utf8');

file = file.replace(
  "isPinMode: false",
  "isPinMode: !emailOrId.includes('@')"
);

fs.writeFileSync('src/components/screens/LoginScreen.tsx', file);
console.log("Patched LoginScreen for PIN mode.");
