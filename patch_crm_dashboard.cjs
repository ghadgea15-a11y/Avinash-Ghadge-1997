const fs = require('fs');
let content = fs.readFileSync('src/components/crm/CrmDashboardTab.tsx', 'utf8');

content = content.replace(
  "import { Building2, FileText, AlertCircle, Clock, CheckCircle } from 'lucide-react';",
  "import { Building2, FileText, AlertCircle, Clock, CheckCircle } from 'lucide-react';\nimport { CrmExpiryAlerts } from './CrmExpiryAlerts';"
);

// We want to add CrmExpiryAlerts in the layout
const layoutAdd = `
      </div>
      
      <div className="mt-8">
        <CrmExpiryAlerts session={session} company={company} contracts={contracts} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
`;

content = content.replace(
  "      </div>\n      <div className=\"grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8\">",
  layoutAdd
);

fs.writeFileSync('src/components/crm/CrmDashboardTab.tsx', content);
