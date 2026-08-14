const fs = require('fs');

const DEFAULT_SCREEN = 'EMPLOYEES';

// 1. App.tsx
let app = fs.readFileSync('src/App.tsx', 'utf8');
app = app.replace(/'ROLE_DASHBOARD'/g, `'${DEFAULT_SCREEN}'`);

const roleDashboardStart = app.indexOf("{currentScreen === 'EMPLOYEES' && userSession && (");
const roleDashboardBlockStart = app.lastIndexOf("{currentScreen === 'EMPLOYEES' && userSession && (", roleDashboardStart - 1);
// Actually, just remove RoleDashboardScreen usage
app = app.replace(/\{currentScreen === 'EMPLOYEES' && userSession && \(\s*<RoleDashboardScreen[\s\S]*?\/\>\s*\)\}/, '');
fs.writeFileSync('src/App.tsx', app);

// 2. SplashScreen.tsx
let splash = fs.readFileSync('src/components/screens/SplashScreen.tsx', 'utf8');
splash = splash.replace(/'ROLE_DASHBOARD'/g, `'${DEFAULT_SCREEN}'`);
fs.writeFileSync('src/components/screens/SplashScreen.tsx', splash);

// 3. Header.tsx
let hdr = fs.readFileSync('src/components/common/Header.tsx', 'utf8');
hdr = hdr.replace(/'ROLE_DASHBOARD'/g, `'${DEFAULT_SCREEN}'`);
fs.writeFileSync('src/components/common/Header.tsx', hdr);

// 4. BottomNavigationBar.tsx
let botNav = fs.readFileSync('src/components/common/BottomNavigationBar.tsx', 'utf8');
botNav = botNav.replace(/\s*\{\s*screen:\s*'ROLE_DASHBOARD'[^}]+\},/, '');
fs.writeFileSync('src/components/common/BottomNavigationBar.tsx', botNav);

// 5. TabletNavigationRail.tsx
let tabNav = fs.readFileSync('src/components/common/TabletNavigationRail.tsx', 'utf8');
tabNav = tabNav.replace(/\s*\{\s*screen:\s*'ROLE_DASHBOARD'[^}]+\},/, '');
fs.writeFileSync('src/components/common/TabletNavigationRail.tsx', tabNav);

// 6. NavigationDrawer.tsx
let navDraw = fs.readFileSync('src/components/common/NavigationDrawer.tsx', 'utf8');
// It might still use ROLE_DASHBOARD or Dashboard
const navDrawStart = navDraw.indexOf("<button");
// wait, I can just use regex for the button that navigates to ROLE_DASHBOARD
navDraw = navDraw.replace(/<button\s+type="button"\s+onClick=\{\(\) => \{ onNavigate\('ROLE_DASHBOARD'\); onClose\(\); \}\}[\s\S]*?<\/button>/, '');
fs.writeFileSync('src/components/common/NavigationDrawer.tsx', navDraw);

console.log('Removed ROLE_DASHBOARD');
