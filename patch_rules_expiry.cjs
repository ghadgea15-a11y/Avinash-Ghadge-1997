const fs = require('fs');
let content = fs.readFileSync('firestore.rules', 'utf8');
const expiryRules = `
      // 9.7 CRM: Contract Expiry Events
      match /contract_expiry_events/{eventId} {
        allow read: if isSuperAdmin() || sameCompany(companyId);
        allow write: if isSuperAdmin() || sameCompany(companyId);
      }
`;
content = content.replace('      match /regions/{regionId} {', expiryRules + '      match /regions/{regionId} {');
fs.writeFileSync('firestore.rules', content);
