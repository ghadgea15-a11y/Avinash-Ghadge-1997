const fs = require('fs');
let content = fs.readFileSync('firestore.rules', 'utf8');
const slaRules = `
      // 9.5 CRM: SLA Scorecards
      match /sla_definitions/{slaId} {
        allow read: if isSuperAdmin() || sameCompany(companyId);
        allow write: if isSuperAdmin() || sameCompany(companyId);
      }
      match /sla_breaches/{breachId} {
        allow read: if isSuperAdmin() || sameCompany(companyId);
        allow write: if isSuperAdmin() || sameCompany(companyId);
      }
      match /sla_scorecards/{scorecardId} {
        allow read: if isSuperAdmin() || sameCompany(companyId);
        allow write: if isSuperAdmin() || sameCompany(companyId);
      }
`;
content = content.replace('      match /regions/{regionId} {', slaRules + '      match /regions/{regionId} {');
fs.writeFileSync('firestore.rules', content);
