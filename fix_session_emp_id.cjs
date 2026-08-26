const fs = require('fs');
const file = 'src/services/firebaseAuthService.ts';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
`    const session: UserSession = {
      userId: fbUser.uid,
      employeeId: \`EMP-\${fbUser.uid.substring(0, 6).toUpperCase()}\`,`,
`    const session: UserSession = {
      userId: fbUser.uid,
      employeeId: finalEmployeeId,`
);

fs.writeFileSync(file, code);
