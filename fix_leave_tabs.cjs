const fs = require('fs');

let f1 = fs.readFileSync('src/components/screens/LeaveManagementScreen.tsx', 'utf8');

f1 = f1.replace(/'DASHBOARD' | 'ABSENCE' | 'APPROVALS' | 'LEDGER' | 'POLICIES'/g, "'DASHBOARD' | 'ABSENCE' | 'APPROVALS' | 'LEDGER' | 'POLICIES' | 'HOLIDAYS'");

f1 = f1.replace(/<button\s+onClick=\{\(\) => setActiveTab\('POLICIES'\)\}[^>]+>[\s\S]*?<\/button>/g, (match) => {
    return match + `
          {isAdmin && (
            <button
              onClick={() => setActiveTab('HOLIDAYS')}
              className={\`flex items-center gap-2 pb-4 border-b-2 font-bold text-sm transition-colors whitespace-nowrap \${
                activeTab === 'HOLIDAYS'
                  ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                  : 'border-transparent text-slate-500 hover:text-black dark:hover:text-white'
              }\`}
            >
              <Calendar className="w-4 h-4" />
              Holiday Calendar
            </button>
          )}`;
});

f1 = f1.replace(/\{activeTab === 'POLICIES' && isAdmin && \([\s\S]*?\}\)/g, (match) => {
    return match + `
              {activeTab === 'HOLIDAYS' && isAdmin && (
                <HolidayCalendarMaster 
                  companyId={companyId}
                  holidays={holidays}
                  onHolidaysChange={async () => {
                     const hols = await FirestoreService.getHolidays(companyId, new Date().getFullYear());
                     setHolidays(hols);
                  }}
                />
              )}`;
});

f1 = f1.replace(/import \{ .* \} from 'lucide-react';/, (match) => {
    if (!match.includes('Calendar')) {
        return match.replace("}", ", Calendar }");
    }
    return match;
});

// also import HolidayCalendarMaster
f1 = f1.replace(/import \{ LeavePolicyMaster \} from '\.\.\/hrms\/LeavePolicyMaster';/, "import { LeavePolicyMaster } from '../hrms/LeavePolicyMaster';\nimport { HolidayCalendarMaster } from '../hrms/HolidayCalendarMaster';");

fs.writeFileSync('src/components/screens/LeaveManagementScreen.tsx', f1);
