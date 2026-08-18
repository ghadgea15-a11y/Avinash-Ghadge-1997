const fs = require('fs');
let code = fs.readFileSync('firestore.rules', 'utf8');

const newRules = `
      match /stock_locations/{locId} {
        allow read: if isSuperAdmin() || sameCompany(companyId);
        allow write: if isSuperAdmin() || isManager(companyId) || isCompanyAdmin(companyId);
      }
      match /stock_balances/{balId} {
        allow read: if isSuperAdmin() || sameCompany(companyId);
        allow write: if isSuperAdmin() || sameCompany(companyId); // Backend logic handles validation
      }
      match /stock_ledger/{ledgerId} {
        allow read: if isSuperAdmin() || sameCompany(companyId);
        allow write: if isSuperAdmin() || sameCompany(companyId);
      }
      match /gate_passes/{passId} {
        allow read: if isSuperAdmin() || sameCompany(companyId);
        allow write: if isSuperAdmin() || sameCompany(companyId);
      }
`;

code = code.replace(
  "      match /inventory_items/{itemId} {\n        allow read: if isSuperAdmin() || sameCompany(companyId);\n        allow write: if isSuperAdmin() || isManager(companyId);\n      }",
  "      match /inventory_items/{itemId} {\n        allow read: if isSuperAdmin() || sameCompany(companyId);\n        allow write: if isSuperAdmin() || sameCompany(companyId);\n      }" + newRules
);

fs.writeFileSync('firestore.rules', code);
