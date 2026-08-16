const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// Add imports
const imports = `
import { ClientManagementScreen } from './components/screens/ClientManagementScreen';
import { DeploymentManagementScreen } from './components/screens/DeploymentManagementScreen';
import { ShiftRosterScreen } from './components/screens/ShiftRosterScreen';
`;
code = code.replace("import { CompanyManagementScreen } from './components/screens/CompanyManagementScreen';", imports + "\nimport { CompanyManagementScreen } from './components/screens/CompanyManagementScreen';");

// Add routes inside the main switch statement
const routes = `
                    {currentScreen === 'CLIENT_MANAGEMENT' && activeCompany && (
                      <ClientManagementScreen
                        userSession={userSession}
                        activeCompany={activeCompany}
                      />
                    )}
                    {currentScreen === 'DEPLOYMENT_MANAGEMENT' && activeCompany && (
                      <DeploymentManagementScreen
                        userSession={userSession}
                        activeCompany={activeCompany}
                      />
                    )}
                    {currentScreen === 'SHIFT_ROSTER' && activeCompany && (
                      <ShiftRosterScreen
                        userSession={userSession}
                        activeCompany={activeCompany}
                      />
                    )}
`;
code = code.replace("{currentScreen === 'EMPLOYEES' && (", routes + "\n                    {currentScreen === 'EMPLOYEES' && (");

fs.writeFileSync('src/App.tsx', code);
