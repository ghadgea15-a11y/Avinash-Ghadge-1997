import * as fs from 'fs';
const file = 'src/App.tsx';
let content = fs.readFileSync(file, 'utf8');

if (!content.includes("import { RfqManagementScreen }")) {
  content = content.replace(
    "import { VendorDirectoryScreen } from './components/screens/VendorDirectoryScreen';",
    "import { VendorDirectoryScreen } from './components/screens/VendorDirectoryScreen';\nimport { RfqManagementScreen } from './components/screens/RfqManagementScreen';"
  );
}

if (!content.includes("currentScreen === 'RFQ_MANAGEMENT'")) {
  const replacement = `                    {currentScreen === 'RFQ_MANAGEMENT' && (
                      <RfqManagementScreen
                        userSession={userSession}
                        activeCompany={activeCompany}
                        onNavigate={setCurrentScreen}
                      />
                    )}
                    {currentScreen === 'PROCUREMENT_SRM' && (`;
  
  content = content.replace("{currentScreen === 'PROCUREMENT_SRM' && (", replacement);
}

fs.writeFileSync(file, content);
console.log('Updated App.tsx');
