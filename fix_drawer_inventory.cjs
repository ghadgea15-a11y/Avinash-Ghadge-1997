const fs = require('fs');

let code = fs.readFileSync('src/components/common/NavigationDrawer.tsx', 'utf8');

code = code.replace(
  /<NavItem icon=\{LayoutDashboard\} label="Asset Tracking" screen="ASSET_TRACKING" \/>/,
  `<NavItem icon={LayoutDashboard} label="Asset Tracking" screen="ASSET_TRACKING" />
          <NavItem icon={LayoutDashboard} label="Inventory & Stock" screen="INVENTORY_STOCK" />`
);

fs.writeFileSync('src/components/common/NavigationDrawer.tsx', code);
