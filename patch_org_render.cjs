const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

if (!content.includes("currentScreen === 'ORG_CONTROL'")) {
  content = content.replace(
    /\{currentScreen === 'COMPANY_MANAGEMENT'[\s\S]*?\)\}/m,
    `$&
                    {currentScreen === 'ORG_CONTROL' && activeCompany && (
                      <OrgControlScreen
                        userSession={userSession}
                        activeCompany={activeCompany as any}
                        onNavigate={(screen: any) => setCurrentScreen(screen)}
                      />
                    )}`
  );
  fs.writeFileSync('src/App.tsx', content);
  console.log("Patched rendering of OrgControlScreen");
} else {
  console.log("Already rendering");
}
