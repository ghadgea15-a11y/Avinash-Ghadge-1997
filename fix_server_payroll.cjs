const fs = require('fs');
let content = fs.readFileSync('src/server/payrollApi.ts', 'utf8');

content = content.replace(/if \(leave && leave\.status === 'APPROVED'\) \{/g, "if (leave && (leave.status === 'APPROVED' || leave.status === 'ACCEPTED')) {");
content = content.replace(/if \(leave && leave\.status === 'APPROVED' && \(leave\.leaveType === 'UNPAID' \|\| leave\.leaveType === 'LWP'\)\) \{/g, "if (leave && (leave.status === 'APPROVED' || leave.status === 'ACCEPTED') && (leave.leaveType === 'UNPAID' || leave.leaveType === 'LWP')) {");
content = content.replace(/if \(!leave \|\| leave\.status !== 'APPROVED' \|\| leave\.leaveType === 'UNPAID' \|\| leave\.leaveType === 'LWP'\) \{/g, "if (!leave || (leave.status !== 'APPROVED' && leave.status !== 'ACCEPTED') || leave.leaveType === 'UNPAID' || leave.leaveType === 'LWP') {");

fs.writeFileSync('src/server/payrollApi.ts', content);
