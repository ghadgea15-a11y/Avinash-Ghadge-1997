const fs = require('fs');

// Patch PayrollWorkflowService.ts
let pCode = fs.readFileSync('src/services/payrollWorkflowService.ts', 'utf8');
pCode = pCode.replace(/requestedCheckIn/g, 'requestedCheckInTime');
pCode = pCode.replace(/requestedCheckOut/g, 'requestedCheckOutTime');
pCode = pCode.replace(/att\.checkIn/g, 'att.checkInTime');
pCode = pCode.replace(/att\.checkOut/g, 'att.checkOutTime');
pCode = pCode.replace(/updates\.checkIn/g, 'updates.checkInTime');
pCode = pCode.replace(/updates\.checkOut/g, 'updates.checkOutTime');
pCode = pCode.replace(/beforeState\.checkIn/g, 'beforeState.checkInTime');
pCode = pCode.replace(/beforeState\.checkOut/g, 'beforeState.checkOutTime');
fs.writeFileSync('src/services/payrollWorkflowService.ts', pCode);

// Patch AttendanceAdjustmentWorkflow.tsx
let aCode = fs.readFileSync('src/components/wfm/AttendanceAdjustmentWorkflow.tsx', 'utf8');
aCode = aCode.replace(/att\.checkIn\?/g, 'att.checkInTime?');
aCode = aCode.replace(/att\.checkIn\./g, 'att.checkInTime.');
aCode = aCode.replace(/att\.checkOut\?/g, 'att.checkOutTime?');
aCode = aCode.replace(/att\.checkOut\./g, 'att.checkOutTime.');
aCode = aCode.replace(/requestedCheckIn:/g, 'requestedCheckInTime:');
aCode = aCode.replace(/requestedCheckOut:/g, 'requestedCheckOutTime:');
aCode = aCode.replace(/newCheckIn \? \`\$\{selectedAtt\.attendanceDate/g, 'newCheckIn ? \`\$\{selectedAtt.date || selectedAtt.attendanceDate');
aCode = aCode.replace(/newCheckOut \? \`\$\{selectedAtt\.attendanceDate/g, 'newCheckOut ? \`\$\{selectedAtt.date || selectedAtt.attendanceDate');
aCode = aCode.replace(/att\.attendanceDate/g, '(att.date || att.attendanceDate)');
fs.writeFileSync('src/components/wfm/AttendanceAdjustmentWorkflow.tsx', aCode);

console.log('patched workflow checkInTime fields');
