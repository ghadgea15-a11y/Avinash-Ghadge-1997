const fs = require('fs');
let code = fs.readFileSync('src/components/screens/EmployeeModuleScreen.tsx', 'utf8');

code = code.replace(
  "bankDetailsRef: emp.bankDetailsRef || '',",
  "bankDetailsRef: emp.bankDetailsRef || '',\n      bankName: emp.bankName || '',\n      bankAccountNumber: emp.bankAccountNumber || '',\n      bankIfsc: emp.bankIfsc || '',\n      uanNumber: emp.uanNumber || '',\n      pfNumber: emp.pfNumber || '',\n      esicNumber: emp.esicNumber || '',"
);

fs.writeFileSync('src/components/screens/EmployeeModuleScreen.tsx', code);
console.log('patched');
