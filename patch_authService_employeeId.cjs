const fs = require('fs');
const file = 'src/services/firebaseAuthService.ts';
let code = fs.readFileSync(file, 'utf8');

// move finalEmployeeId definition up
code = code.replace(
`    const assignedStatus = (isCompanyAdmin || autoApprove) ? 'ACTIVE' : 'PENDING_APPROVAL';`,
`    const assignedStatus = (isCompanyAdmin || autoApprove) ? 'ACTIVE' : 'PENDING_APPROVAL';
    const finalEmployeeId = existingEmpId || \`EMP-\${fbUser.uid.substring(0, 6).toUpperCase()}\`;`
);

code = code.replace(
`    const finalEmployeeId = existingEmpId || \`EMP-\${fbUser.uid.substring(0, 6).toUpperCase()}\`;\n\n    if (!autoApprove && !isCompanyAdmin) {`,
`    if (!autoApprove && !isCompanyAdmin) {`
);

// We did this twice so it should replace in both functions. Let's make sure.

fs.writeFileSync(file, code);
