const fs = require('fs');
let text = fs.readFileSync('src/App.tsx', 'utf8');

if (!text.includes('SUPER_ADMIN_MANAGEMENT')) {
  text = text.replace(
    /    'SUPER_ADMIN_SUBSCRIPTIONS',/,
    "    'SUPER_ADMIN_SUBSCRIPTIONS',\n    'SUPER_ADMIN_MANAGEMENT',"
  );
  
  const importRegex = /import \{ SuperAdminSubscriptionsScreen \} from '\.\/components\/screens\/SuperAdminSubscriptionsScreen';/;
  const newImport = `import { SuperAdminSubscriptionsScreen } from './components/screens/SuperAdminSubscriptionsScreen';
import { SuperAdminManagementScreen } from './components/screens/SuperAdminManagementScreen';`;
  text = text.replace(importRegex, newImport);

  const routeRegex = /    \{currentScreen === 'SUPER_ADMIN_SUBSCRIPTIONS' && \([\s\S]*?\)\}/;
  const newRoute = `    {currentScreen === 'SUPER_ADMIN_SUBSCRIPTIONS' && (
      <SuperAdminSubscriptionsScreen
        currentSession={userSession!}
        onNavigate={setCurrentScreen}
      />
    )}
    {currentScreen === 'SUPER_ADMIN_MANAGEMENT' && (
      <SuperAdminManagementScreen
        currentSession={userSession!}
        onNavigate={setCurrentScreen}
      />
    )}`;
  text = text.replace(routeRegex, newRoute);
  
  fs.writeFileSync('src/App.tsx', text);
}
