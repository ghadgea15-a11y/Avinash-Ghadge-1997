const fs = require('fs');
let code = fs.readFileSync('src/components/common/NavigationDrawer.tsx', 'utf8');

if (!code.includes('ATTENDANCE_SHIFTS')) {
  code = code.replace(
    /<NavItem icon=\{MapPin\} label="Deployment Management" screen="DEPLOYMENT_MANAGEMENT" \/>/,
    `<NavItem icon={MapPin} label="Deployment Management" screen="DEPLOYMENT_MANAGEMENT" />
          <NavItem icon={Calendar} label="Attendance & Roster" screen="ATTENDANCE_SHIFTS" />`
  );
  fs.writeFileSync('src/components/common/NavigationDrawer.tsx', code);
}
