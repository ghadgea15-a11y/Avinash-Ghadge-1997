const fs = require('fs');
let code = fs.readFileSync('src/components/screens/dashboards/OwnerDashboard.tsx', 'utf-8');

if (!code.includes('EnterpriseIntelligenceDashboard')) {
  code = code.replace(
    'import { ExecutiveBiDashboard } from "../../bi/ExecutiveBiDashboard";',
    'import { ExecutiveBiDashboard } from "../../bi/ExecutiveBiDashboard";\nimport { EnterpriseIntelligenceDashboard } from "../../bi/EnterpriseIntelligenceDashboard";'
  );
  
  code = code.replace(
    '<ExecutiveBiDashboard session={userSession} company={company} />',
    `<EnterpriseIntelligenceDashboard 
        session={userSession} 
        company={company} 
        onDrillDown={(mod, data) => console.log('DrillDown', mod, data)} 
      />\n      <ExecutiveBiDashboard session={userSession} company={company} />`
  );
  fs.writeFileSync('src/components/screens/dashboards/OwnerDashboard.tsx', code);
}
