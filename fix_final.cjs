const fs = require('fs');

let nav = fs.readFileSync('src/components/common/NavigationDrawer.tsx', 'utf8');
nav = nav.replace('onRoleSwitch?: () => void;', 'onRoleSwitch?: (newRole: any) => void;');
fs.writeFileSync('src/components/common/NavigationDrawer.tsx', nav);

let dms = fs.readFileSync('src/components/screens/DeploymentManagementScreen.tsx', 'utf8');
dms = dms.replace(/emp\?\.fullName/g, 'emp ? (emp.firstName + " " + emp.lastName) : ""');
fs.writeFileSync('src/components/screens/DeploymentManagementScreen.tsx', dms);

let srs = fs.readFileSync('src/components/screens/ShiftRosterScreen.tsx', 'utf8');
srs = srs.replace(/emp\?\.fullName/g, 'emp ? (emp.firstName + " " + emp.lastName) : ""');
fs.writeFileSync('src/components/screens/ShiftRosterScreen.tsx', srs);
