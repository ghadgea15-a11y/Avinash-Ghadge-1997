const fs = require('fs');
let code = fs.readFileSync('src/components/wfm/AttendanceAdjustmentWorkflow.tsx', 'utf8');

code = code.replace(
  /const unsub = onSnapshot\(q, \(snap\) => \{[\s\S]*?const records = snap.docs.map\(d => d.data\(\) as AttendanceRecord\);/,
  `const unsub = onSnapshot(q, (snap) => {
      let records = snap.docs.map(d => d.data() as AttendanceRecord);
      
      if (userSession.role === 'SUPERVISOR' || (userSession.roles && userSession.roles.includes('SUPERVISOR'))) {
        records = records.filter(r => r.siteId === userSession.branchId || r.siteId === userSession.assignedSiteId);
      }`
);

fs.writeFileSync('src/components/wfm/AttendanceAdjustmentWorkflow.tsx', code);
console.log('patched AttendanceAdjustmentWorkflow filtering');
