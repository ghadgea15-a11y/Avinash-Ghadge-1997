import * as fs from 'fs';

let drawer = fs.readFileSync('src/components/common/NavigationDrawer.tsx', 'utf-8');
drawer = drawer.replace(
  "RbacService.hasModuleAccess(userSession, 'ATTENDANCE_SHIFTS')",
  "RbacService.hasModuleAccess(userSession, 'SHIFTS')"
);
fs.writeFileSync('src/components/common/NavigationDrawer.tsx', drawer);

let rail = fs.readFileSync('src/components/common/TabletNavigationRail.tsx', 'utf-8');
rail = rail.replace(
  "RbacService.hasModuleAccess(userSession, 'ATTENDANCE_SHIFTS')",
  "RbacService.hasModuleAccess(userSession, 'SHIFTS')"
);
fs.writeFileSync('src/components/common/TabletNavigationRail.tsx', rail);

