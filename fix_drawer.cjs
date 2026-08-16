const fs = require('fs');

let code = fs.readFileSync('src/components/common/NavigationDrawer.tsx', 'utf8');

code = code.replace(
  /<NavItem icon=\{Calendar\} label="Shift Roster" screen="SHIFT_ROSTER" \/>/,
  `<NavItem icon={Calendar} label="Shift Roster" screen="SHIFT_ROSTER" />
          <NavItem icon={LayoutDashboard} label="Site Operations (Material/Patrol)" screen="SITE_OPERATIONS" />
          <NavItem icon={LayoutDashboard} label="Asset Tracking" screen="ASSET_TRACKING" />`
);

fs.writeFileSync('src/components/common/NavigationDrawer.tsx', code);
