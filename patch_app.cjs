const fs = require('fs');

let content = fs.readFileSync('src/App.tsx', 'utf8');

if (!content.includes("SetupAuditScreen")) {
  content = content.replace(
    "import { SettingsScreen } from './components/screens/SettingsScreen';",
    "import { SettingsScreen } from './components/screens/SettingsScreen';\nimport { SetupAuditScreen } from './components/screens/SetupAuditScreen';"
  );

  const newScreen = `
                {currentScreen === 'SETUP_AUDIT' && (
                  <SetupAuditScreen
                    userSession={userSession!}
                    activeCompany={activeCompany as any}
                    onClose={() => setCurrentScreen('ENTERPRISE_DASHBOARD')}
                  />
                )}
  `;

  content = content.replace(
    "{currentScreen === 'SETTINGS' && (",
    newScreen.trim() + "\n                {currentScreen === 'SETTINGS' && ("
  );

  fs.writeFileSync('src/App.tsx', content);
  console.log("Patched App.tsx");
} else {
  console.log("Already patched");
}
