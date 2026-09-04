const fs = require('fs');
let code = fs.readFileSync('src/components/screens/AttendanceShiftsScreen.tsx', 'utf8');

code = code.replace(
  /<button[\s\S]*?onClick=\{\(\) => setActiveTab\('REGULARIZATION'\)\}[\s\S]*?Attendance Adjustments[\s\S]*?<\/button>/,
  `{(isSupervisor || isAdminOrHR) && (<button
            onClick={() => setActiveTab('REGULARIZATION')}
            className={\`flex items-center gap-2 py-4 text-sm font-bold border-b-2 whitespace-nowrap transition-all \${
              activeTab === 'REGULARIZATION'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-black dark:hover:text-slate-300'
            }\`}
          >
            <ShieldAlert className="w-4 h-4" />
            Attendance Adjustments
          </button>)}`
);

fs.writeFileSync('src/components/screens/AttendanceShiftsScreen.tsx', code);
console.log('patched tabs in AttendanceShiftsScreen');
