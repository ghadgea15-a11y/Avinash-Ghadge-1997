const fs = require('fs');

let content = fs.readFileSync('src/components/screens/EmployeeModuleScreen.tsx', 'utf8');

if (!content.includes("OrgSetupWizardScreen")) {
  content = content.replace(
    "import { EmployeeOffboardingScreen } from './EmployeeOffboardingScreen';",
    "import { EmployeeOffboardingScreen } from './EmployeeOffboardingScreen';\nimport { OrgSetupWizardScreen } from './OrgSetupWizardScreen';"
  );

  const screenOverlay = `
      {showOrgSetupWizard && activeCompany && (
        <OrgSetupWizardScreen 
          userSession={userSession}
          activeCompany={activeCompany}
          onClose={() => setShowOrgSetupWizard(false)}
        />
      )}
  `;

  content = content.replace(
    "{/* Alert / Feedback Notification Banner */}",
    screenOverlay + "\n      {/* Alert / Feedback Notification Banner */}"
  );

  fs.writeFileSync('src/components/screens/EmployeeModuleScreen.tsx', content);
  console.log("Patched EmployeeModuleScreen.tsx");
} else {
  console.log("Already patched");
}
