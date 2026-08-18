const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(
  "import { ClientManagementScreen } from './components/screens/ClientManagementScreen';",
  "import { CrmModule } from './components/crm/CrmModule';"
);

code = code.replace(
  "                      <ClientManagementScreen\n                        userSession={userSession}\n                        activeCompany={activeCompany}\n                      />",
  "                      <CrmModule\n                        session={userSession}\n                        company={activeCompany}\n                      />"
);

fs.writeFileSync('src/App.tsx', code);
