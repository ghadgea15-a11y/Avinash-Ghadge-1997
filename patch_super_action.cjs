const fs = require('fs');
let code = fs.readFileSync('src/components/wfm/SupervisorRollCall.tsx', 'utf8');

code = code.replace(
  /action: status === 'PRESENT' \? 'PUNCH_IN' : \(status === 'ABSENT' \? 'ABSENT' : 'HALFDAY'\),/g,
  `action: (status === 'PRESENT' || status === 'LATE' || status === 'OVERTIME') ? 'PUNCH_IN' : status,`
);

fs.writeFileSync('src/components/wfm/SupervisorRollCall.tsx', code);
console.log('patched SupervisorRollCall action logic');
