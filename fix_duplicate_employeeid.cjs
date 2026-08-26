const fs = require('fs');
const file = 'src/services/firebaseAuthService.ts';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
`      employeeId: finalEmployeeId,
      employeeId: finalEmployeeId,`,
`      employeeId: finalEmployeeId,`
);

fs.writeFileSync(file, code);
