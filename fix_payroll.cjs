const fs = require('fs');
let content = fs.readFileSync('src/services/payrollEngine.ts', 'utf8');

// Change `if (leave && leave.status === 'APPROVED') {` to `if (leave && (leave.status === 'APPROVED' || leave.status === 'ACCEPTED')) {`
content = content.replace(/if \(leave && leave\.status === 'APPROVED'\) \{/g, "if (leave && (leave.status === 'APPROVED' || leave.status === 'ACCEPTED')) {");

// Change `if (leave && leave.status === 'APPROVED' && (leave.leaveType === 'UNPAID' || leave.leaveType === 'LWP')) {`
// to `if (leave && (leave.status === 'APPROVED' || leave.status === 'ACCEPTED') && (leave.leaveType === 'UNPAID' || leave.leaveType === 'LWP')) {`
content = content.replace(/if \(leave && leave\.status === 'APPROVED' && \(leave\.leaveType === 'UNPAID' \|\| leave\.leaveType === 'LWP'\)\) \{/g, "if (leave && (leave.status === 'APPROVED' || leave.status === 'ACCEPTED') && (leave.leaveType === 'UNPAID' || leave.leaveType === 'LWP')) {");

// Also check the specific ABSENT handling:
// if (!leave || leave.status !== 'APPROVED' || leave.leaveType === 'UNPAID' || leave.leaveType === 'LWP') {
content = content.replace(/if \(!leave \|\| leave\.status !== 'APPROVED' \|\| leave\.leaveType === 'UNPAID' \|\| leave\.leaveType === 'LWP'\) \{/g, "if (!leave || (leave.status !== 'APPROVED' && leave.status !== 'ACCEPTED') || leave.leaveType === 'UNPAID' || leave.leaveType === 'LWP') {");

fs.writeFileSync('src/services/payrollEngine.ts', content);
console.log('Fixed payroll exclusions');
