const fs = require('fs');
let content = fs.readFileSync('firestore.rules', 'utf8');

const additionalRules = `
      match /purchase_orders/{itemId} {
        allow read: if sameCompany(cId);
        allow write: if sameCompany(cId) && (isOwnerOrExecutive() || isOfficialStaffDept("FINANCE") || isOfficialStaffDept("OPERATIONS"));
      }
`;

content = content.replace("match /inventory_transactions/{txId} {", additionalRules + "\n      match /inventory_transactions/{txId} {");

fs.writeFileSync('firestore.rules', content);
