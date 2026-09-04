const fs = require('fs');
let code = fs.readFileSync('src/components/screens/EmployeeModuleScreen.tsx', 'utf8');

code = code.replace(
  "bankDetailsRef: '',",
  "bankDetailsRef: '',\n    bankName: '',\n    bankAccountNumber: '',\n    bankIfsc: '',\n    uanNumber: '',\n    pfNumber: '',\n    esicNumber: '',"
);

fs.writeFileSync('src/components/screens/EmployeeModuleScreen.tsx', code);
console.log('patched');
