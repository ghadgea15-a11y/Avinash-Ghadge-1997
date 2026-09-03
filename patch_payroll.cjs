const fs = require('fs');
let code = fs.readFileSync('src/services/payrollEngine.ts', 'utf8');

code = code.replace(
/if \(att\.status === 'ABSENT' && \(!leave \|\| leave\.status !== 'APPROVED'\)\) \{\n\s*lopDays \+= 1;\n\s*\} else if \(att\.status === 'HALFDAY' && \(!leave \|\| leave\.status !== 'APPROVED'\)\) \{\n\s*lopDays \+= 0\.5;\n\s*\}/g,
`if (att.status === 'ABSENT') {
           if (!leave || leave.status !== 'APPROVED' || leave.leaveType === 'UNPAID' || leave.leaveType === 'LWP') {
             lopDays += 1;
           }
         } else if (att.status === 'HALFDAY') {
           if (!leave || leave.status !== 'APPROVED' || leave.leaveType === 'UNPAID' || leave.leaveType === 'LWP') {
             lopDays += 0.5;
           }
         }`
);

fs.writeFileSync('src/services/payrollEngine.ts', code);
