const fs = require('fs');
let code = fs.readFileSync('src/components/bi/EnterpriseIntelligenceDashboard.tsx', 'utf-8');

code = code.replace("CheckCircle, CheckCircle", "CheckCircle");
code = code.replace("import { import", "import");

fs.writeFileSync('src/components/bi/EnterpriseIntelligenceDashboard.tsx', code);
