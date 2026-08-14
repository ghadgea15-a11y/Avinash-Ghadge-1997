const fs = require('fs');
let code = fs.readFileSync('src/components/screens/LoginScreen.tsx', 'utf8');

code = code.replace(/const \[emailOrId, setEmailOrId\] = useState\(''\);/, `const [companyCode, setCompanyCode] = useState('');
  const [emailOrId, setEmailOrId] = useState('');`);

fs.writeFileSync('src/components/screens/LoginScreen.tsx', code);
console.log('State updated.');
