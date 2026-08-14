const fs = require('fs');

let file = fs.readFileSync('src/components/common/BottomNavigationBar.tsx', 'utf8');
file = file.replace(/interface BottomNavigationBarProps {/, `import { UserSession } from '../../types';\n\ninterface BottomNavigationBarProps {\n  userSession: UserSession;`);
file = file.replace(/export const BottomNavigationBar: React.FC<BottomNavigationBarProps> = \({/, `export const BottomNavigationBar: React.FC<BottomNavigationBarProps> = ({\n  userSession,`);

const navItemsReplacement = `
  const navItems = [];
  
  if (userSession.role === 'SUPER_ADMIN' || userSession.role === 'COMPANY_ADMIN' || userSession.role === 'HR_ADMIN') {
    navItems.push({ screen: 'EMPLOYEES' as PhaseAScreen, label: 'Staff', icon: Users });
  }
  
  navItems.push({ screen: 'ATTENDANCE_SHIFTS' as PhaseAScreen, label: 'Shifts', icon: Users }); // Using Users icon as placeholder, wait, I need to import Clock and Shield
  navItems.push({ screen: 'SITE_OPERATIONS' as PhaseAScreen, label: 'Operations', icon: Users });
  
  navItems.push({ screen: 'NOTIFICATIONS' as PhaseAScreen, label: 'Alerts', icon: Bell, badge: unreadNotifCount });
  navItems.push({ screen: 'PROFILE' as PhaseAScreen, label: 'Profile', icon: User });
`;

// wait, let's just do it with standard text replacement since we want imports too.
