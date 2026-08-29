const fs = require('fs');

let file = 'src/components/wfm/OvertimeDashboard.tsx';
let content = fs.readFileSync(file, 'utf8');
content = content.replace(/\(pol: any\)/g, '(pol)'); // this fixes the onClick
content = content.replace(/pol =>/g, '(pol: any) =>');
// Let's make sure `(pol)` wasn't `(pol: any)` where it was meant to be parameter.
// The lint error was at line 153: `Parameter 'pol' implicitly has an 'any' type.`
// If I use `pol: any =>` it's wrong, it should be `(pol: any) =>`
content = content.replace(/\(pol\)/g, '(pol: any)'); // this replaces back to `(pol: any)` for everything
// wait, `onClick={() => setEditingPolicy((pol: any))}` would still be an error!
// Let's just fix it by matching the exact line.
content = content.replace(/setEditingPolicy\(\(pol: any\)\)/g, 'setEditingPolicy(pol)');
content = content.replace(/setEditingPolicy\(pol: any\)/g, 'setEditingPolicy(pol)');
fs.writeFileSync(file, content);

file = 'src/components/wfm/MusterRegister.tsx';
content = fs.readFileSync(file, 'utf8');
content = content.replace(/setLocalData\(\(data: any\[\]\)\)/g, 'setLocalData(data)');
content = content.replace(/setLocalData\(data: any\[\]\)/g, 'setLocalData(data)');
content = content.replace(/\(\(data: any\[\]\)\)/g, '(data: any[])');
fs.writeFileSync(file, content);

file = 'src/components/screens/dashboards/official/DepartmentGenericDashboard.tsx';
content = fs.readFileSync(file, 'utf8');
content = content.replace(/\(\(allTasks: any\[\]\)\)/g, '(allTasks: any[])');
content = content.replace(/\(\(allDocs: any\[\]\)\)/g, '(allDocs: any[])');
fs.writeFileSync(file, content);
