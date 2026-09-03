const fs = require('fs');
const content = fs.readFileSync('src/App.tsx', 'utf8');

if (!content.includes("import { OrgControlScreen }")) {
  // We need to add the import and the render block.
  // Add import near other screen imports
  let newContent = content.replace(
    "import { CompanyManagementScreen } from './components/screens/CompanyManagementScreen';",
    "import { CompanyManagementScreen } from './components/screens/CompanyManagementScreen';\nimport { OrgControlScreen } from './components/screens/OrgControlScreen';"
  );
  
  // Add render block near COMPANY_MANAGEMENT
  newContent = newContent.replace(
    /\{currentScreen === 'COMPANY_MANAGEMENT' && \([\s\S]*?\)\}/m,
    `{currentScreen === 'COMPANY_MANAGEMENT' && activeCompany && (
                      <CompanyManagementScreen
                        userSession={userSession}
                        activeCompany={activeCompany as any}
                        isOnline={isOnline}
                      />
                    )}
                    {currentScreen === 'ORG_CONTROL' && activeCompany && (
                      <OrgControlScreen
                        userSession={userSession}
                        activeCompany={activeCompany as any}
                        onNavigate={(screen: any) => setCurrentScreen(screen)}
                      />
                    )}`
  );
  
  fs.writeFileSync('src/App.tsx', newContent);
  console.log("Patched App.tsx with OrgControlScreen");
} else {
  console.log("Already patched");
}
