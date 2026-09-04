const fs = require('fs');
let code = fs.readFileSync('src/components/screens/EmployeeModuleScreen.tsx', 'utf8');

code = code.replace(
  "bankDetailsRef: formData.bankDetailsRef.trim() || undefined,",
  "bankDetailsRef: formData.bankDetailsRef.trim() || undefined,\n      bankName: formData.bankName.trim() || undefined,\n      bankAccountNumber: formData.bankAccountNumber.trim() || undefined,\n      bankIfsc: formData.bankIfsc.trim() || undefined,\n      uanNumber: formData.uanNumber.trim() || undefined,\n      pfNumber: formData.pfNumber.trim() || undefined,\n      esicNumber: formData.esicNumber.trim() || undefined,"
);

code = code.replace(
  "bankDetailsRef: '',\n      weeklyOff: [0]",
  "bankDetailsRef: '',\n      bankName: '',\n      bankAccountNumber: '',\n      bankIfsc: '',\n      uanNumber: '',\n      pfNumber: '',\n      esicNumber: '',\n      weeklyOff: [0]"
);

fs.writeFileSync('src/components/screens/EmployeeModuleScreen.tsx', code);
console.log('patched');
