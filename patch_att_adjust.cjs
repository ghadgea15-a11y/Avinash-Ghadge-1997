const fs = require('fs');
let code = fs.readFileSync('src/components/wfm/AttendanceAdjustmentWorkflow.tsx', 'utf8');

code = code.replace(
  "{att.exceptions?.join(', ') || 'Requires Review'}",
  "{att.regularizationReason ? `Reason: ${att.regularizationReason}` : (att.exceptions?.join(', ') || 'Requires Review')}"
);

fs.writeFileSync('src/components/wfm/AttendanceAdjustmentWorkflow.tsx', code);
console.log('patched AttendanceAdjustmentWorkflow');
