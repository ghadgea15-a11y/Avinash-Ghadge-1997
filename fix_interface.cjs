const fs = require('fs');
let code = fs.readFileSync('src/components/screens/LoginScreen.tsx', 'utf8');

code = code.replace(/  onChangeCompany: \(\) => void;\n/, '');

fs.writeFileSync('src/components/screens/LoginScreen.tsx', code);
console.log('Fixed interface');
