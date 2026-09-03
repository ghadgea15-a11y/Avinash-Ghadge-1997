const fs = require('fs');
let content = fs.readFileSync('firestore.rules', 'utf8');

const additionalRules = `
      match /bpm_instances/{instanceId} {
        allow read: if sameCompany(cId);
        allow write: if sameCompany(cId);
      }
`;

content = content.replace("match /purchase_orders/{itemId} {", additionalRules + "\n      match /purchase_orders/{itemId} {");

fs.writeFileSync('firestore.rules', content);
