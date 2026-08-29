const fs = require('fs');
const file = 'src/components/screens/AttendanceShiftsScreen.tsx';
let content = fs.readFileSync(file, 'utf8');
content = content.replace(
  /<div className="p-8 text-center text-slate-500">[\s\S]*?<\/div>/,
  '<AttendanceRules userSession={userSession} activeCompany={activeCompany} />'
);
fs.writeFileSync(file, content);
