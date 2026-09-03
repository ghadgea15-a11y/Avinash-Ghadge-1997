const fs = require('fs');

let content = fs.readFileSync('src/components/screens/EmployeeModuleScreen.tsx', 'utf8');

if (!content.includes("OrgSetupWizardScreen")) {
  content = content.replace(
    "import { EmployeeOffboardingScreen } from './EmployeeOffboardingScreen';",
    "import { EmployeeOffboardingScreen } from './EmployeeOffboardingScreen';\nimport { OrgSetupWizardScreen } from './OrgSetupWizardScreen';"
  );

  content = content.replace(
    "const [editingEmployeeId, setEditingEmployeeId] = useState<string | null>(null);",
    "const [editingEmployeeId, setEditingEmployeeId] = useState<string | null>(null);\n  const [showOrgSetupWizard, setShowOrgSetupWizard] = useState(false);"
  );

  const wizardBtn = `
          {isCompanyAdmin && (
            <button 
              onClick={() => setShowOrgSetupWizard(true)}
              className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg flex items-center gap-2 text-sm font-medium transition-colors border border-indigo-400"
            >
              <Building className="w-4 h-4" />
              Organization Setup Wizard
            </button>
          )}
          `;

  // Insert before the '+ Add Employee' button equivalent
  content = content.replace(
    "{canManageEmployees && (",
    wizardBtn + "\n          {canManageEmployees && ("
  );

  // Insert the screen overlay
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
    "return (",
    "return (\n    <>\n" + screenOverlay
  );

  // Close the <>
  const lastIndex = content.lastIndexOf("</div>");
  if (lastIndex !== -1) {
      content = content.slice(0, lastIndex + 6) + "\n    </>" + content.slice(lastIndex + 6);
  }

  fs.writeFileSync('src/components/screens/EmployeeModuleScreen.tsx', content);
  console.log("Patched EmployeeModuleScreen.tsx");
} else {
  console.log("Already patched");
}
