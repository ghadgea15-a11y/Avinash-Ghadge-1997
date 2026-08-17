const fs = require('fs');

function revertDashboard(file) {
  let code = fs.readFileSync(file, 'utf8');

  // Remove handlePunchIn / Out blocks
  code = code.replace(/const handlePunchIn = \(\) => \{[\s\S]*?const handlePunchOut = \(\) => \{[\s\S]*?\}\s*;\s*/g, '');

  // Change the buttons to a single "Open Attendance Panel"
  code = code.replace(/<div className="mt-4 flex gap-2">[\s\S]*?<\/div>\s*<\/div>\s*\{\/\* Assigned/g, 
  `<div className="mt-4 flex gap-2">
            <button onClick={() => onNavigate('ATTENDANCE_SHIFTS')} className="w-full py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow text-sm">
              Open Attendance Panel
            </button>
          </div>
        </div>
        {/* Assigned`);

  fs.writeFileSync(file, code);
}

['src/components/screens/dashboards/SkilledStaffDashboard.tsx',
 'src/components/screens/dashboards/SemiSkilledDashboard.tsx',
 'src/components/screens/dashboards/SupportStaffDashboard.tsx'].forEach(revertDashboard);
