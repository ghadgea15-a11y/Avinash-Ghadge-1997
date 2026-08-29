const fs = require('fs');
const file = 'src/components/wfm/AttendanceLogs.tsx';
let content = fs.readFileSync(file, 'utf8');
content = content.replace('exportDataToCSV(filtered, `Attendance_Logs_${activeCompany.companyId}.csv`);', `const csvContent = "data:text/csv;charset=utf-8,Timestamp,Employee,Action,Location\\n" + filtered.map(e => \`\${new Date(e.timestamp).toISOString()},\${e.userName},\${e.action},"\${e.locationDetails || ''}"\`).join("\\n"); const encodedUri = encodeURI(csvContent); const link = document.createElement("a"); link.setAttribute("href", encodedUri); link.setAttribute("download", \`Attendance_Logs_\${activeCompany.companyId}.csv\`); document.body.appendChild(link); link.click(); link.remove();`);
fs.writeFileSync(file, content);
