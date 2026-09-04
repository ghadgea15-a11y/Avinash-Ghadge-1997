const fs = require('fs');
let f = fs.readFileSync('src/components/screens/LeaveManagementScreen.tsx', 'utf8');

f = f.replace(/{activeTab === 'POLICIES'&& \(\s*<AbsenceRegularization/g, "{activeTab === 'ABSENCE' && (\n                <AbsenceRegularization");
f = f.replace(/{activeTab === 'POLICIES'&& \(\s*<div className="space-y-6">\s*<div className="flex items-center justify-between">\s*<div>\s*<h3 className="text-xl font-black text-black dark:text-white">Approval Workflows<\/h3>/g, 
`{activeTab === 'APPROVALS' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xl font-black text-black dark:text-white">Approval Workflows</h3>`);

f = f.replace(/{activeTab === 'POLICIES'&& \(\s*<div className="space-y-6">\s*<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">\s*<div>\s*<h3 className="text-xl font-black text-black dark:text-white flex items-center gap-2">\s*<FileSpreadsheet/g,
`{activeTab === 'LEDGER' && (
                <div className="space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h3 className="text-xl font-black text-black dark:text-white flex items-center gap-2">
                        <FileSpreadsheet`);

fs.writeFileSync('src/components/screens/LeaveManagementScreen.tsx', f);
