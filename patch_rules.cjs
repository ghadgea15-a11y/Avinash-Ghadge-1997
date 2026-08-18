const fs = require('fs');
let content = fs.readFileSync('firestore.rules', 'utf8');
const billingRules = `
      // 9.6 CRM: Billing Rate Matrices
      match /billing_rate_matrices/{rateId} {
        allow read: if isSuperAdmin() || sameCompany(companyId);
        allow write: if isSuperAdmin() || sameCompany(companyId);
      }
`;
content = content.replace('      match /regions/{regionId} {', billingRules + '      match /regions/{regionId} {');
fs.writeFileSync('firestore.rules', content);
