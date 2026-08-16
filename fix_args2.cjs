const fs = require('fs');
function fixArgs(filePath) {
  let text = fs.readFileSync(filePath, 'utf8');
  text = text.replace(/subscribeToEmployees\(activeCompany\.companyId,/g, 'subscribeToEmployees(userSession, activeCompany.companyId,');
  fs.writeFileSync(filePath, text);
}
fixArgs('src/components/screens/DeploymentManagementScreen.tsx');
fixArgs('src/components/screens/ShiftRosterScreen.tsx');

// Fix NavigationDrawer
let nav = fs.readFileSync('src/components/common/NavigationDrawer.tsx', 'utf8');
nav = nav.replace('onNavigate: (screen: string) => void;', 'onNavigate: (screen: any) => void;\n  onRoleSwitch?: () => void;\n  onLockSession?: () => void;\n  onLogout?: () => void;\n  isOnline?: boolean;');
nav = nav.replace('unreadNotifCount = 0', 'unreadNotifCount = 0,\n  onRoleSwitch,\n  onLockSession,\n  onLogout,\n  isOnline');
fs.writeFileSync('src/components/common/NavigationDrawer.tsx', nav);
