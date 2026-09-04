const fs = require('fs');
let code = fs.readFileSync('src/components/wfm/SupervisorRollCall.tsx', 'utf8');

code = code.replace(
  "const logId = `ATT-${emp.id}-${Date.now()}`;",
  "const todayStr = new Date().toISOString().split('T')[0];\n      const logId = `ATT-${emp.id}-${todayStr}`;"
);

code = code.replace(
  "        timestamp: new Date().toISOString(),",
  "        date: todayStr,\n        attendanceDate: todayStr,\n        checkInTime: status === 'PRESENT' || status === 'LATE' || status === 'OVERTIME' ? new Date().toISOString() : undefined,\n        timestamp: new Date().toISOString(),"
);

fs.writeFileSync('src/components/wfm/SupervisorRollCall.tsx', code);
console.log('patched SupervisorRollCall ID generation');
