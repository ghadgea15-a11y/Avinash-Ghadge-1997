const fs = require('fs');

function fix(file) {
  let code = fs.readFileSync(file, 'utf8');

  code = code.replace(/<div className="mt-4 flex gap-2">[\s\S]*?\{punchedInToday\?\.checkOutTime && \([\s\S]*?<\/div>\s*\)\}\s*<\/div>/g, 
  `<div className="mt-4 flex gap-2">
            <button onClick={() => onNavigate('ATTENDANCE_SHIFTS')} className="w-full py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow text-sm">
              Open Attendance Panel
            </button>
          </div>`);
  
  fs.writeFileSync(file, code);
}

['src/components/screens/dashboards/SemiSkilledDashboard.tsx',
 'src/components/screens/dashboards/SupportStaffDashboard.tsx'].forEach(fix);
