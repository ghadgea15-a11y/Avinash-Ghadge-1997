const fs = require('fs');
let code = fs.readFileSync('src/components/screens/AttendanceShiftsScreen.tsx', 'utf8');

code = code.replace(
  /\{activeTab === 'REGULARIZATION' && \([\s\S]*?<AttendanceAdjustmentWorkflow userSession=\{userSession\} companyId=\{activeCompany.companyId\} \/>[\s\S]*?\)\}/,
  `{activeTab === 'REGULARIZATION' && (isSupervisor || isAdminOrHR) && (
            <AttendanceAdjustmentWorkflow userSession={userSession} companyId={activeCompany.companyId} />
          )}`
);

fs.writeFileSync('src/components/screens/AttendanceShiftsScreen.tsx', code);
console.log('patched content in AttendanceShiftsScreen properly');
