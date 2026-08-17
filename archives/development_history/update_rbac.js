const fs = require('fs');
let code = fs.readFileSync('src/services/rbacService.ts', 'utf8');

code = code.replace("case 'EMPLOYEES':", "case 'COMPANY_MANAGEMENT':\n      case 'APPROVAL_MANAGEMENT':\n      case 'EMPLOYEES':");
code = code.replace("case 'BILLING':", "case 'BILLING':\n      case 'COMPANY_BILLING':");
code = code.replace("case 'GUARD_PATROL':", "case 'GUARD_PATROL':\n      case 'SITE_OPERATIONS':");

fs.writeFileSync('src/services/rbacService.ts', code);
