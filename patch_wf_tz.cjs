const fs = require('fs');
let code = fs.readFileSync('src/components/wfm/AttendanceAdjustmentWorkflow.tsx', 'utf8');

code = code.replace(
  /requestedCheckInTime: newCheckIn \? \`\$\{selectedAtt.date \|\| selectedAtt.attendanceDate\}T\$\{newCheckIn\}:00Z\` : undefined,/g,
  `requestedCheckInTime: newCheckIn ? new Date(\`\${selectedAtt.date || selectedAtt.attendanceDate}T\${newCheckIn}:00\`).toISOString() : undefined,`
);

code = code.replace(
  /requestedCheckOutTime: newCheckOut \? \`\$\{selectedAtt.date \|\| selectedAtt.attendanceDate\}T\$\{newCheckOut\}:00Z\` : undefined,/g,
  `requestedCheckOutTime: newCheckOut ? new Date(\`\${selectedAtt.date || selectedAtt.attendanceDate}T\${newCheckOut}:00\`).toISOString() : undefined,`
);

fs.writeFileSync('src/components/wfm/AttendanceAdjustmentWorkflow.tsx', code);
console.log('patched Adjustment Workflow timezone');
