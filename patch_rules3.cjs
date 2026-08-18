const fs = require('fs');
let code = fs.readFileSync('firestore.rules', 'utf8');

code = code.replace(
  "match /inventory_alerts/{alertId} {\n        allow read: if isSuperAdmin() || sameCompany(companyId);\n        allow write: if isSuperAdmin() || sameCompany(companyId);\n      }",
  "match /inventory_alerts/{alertId} {\n        allow read: if isSuperAdmin() || sameCompany(companyId);\n        allow write: if isSuperAdmin() || sameCompany(companyId);\n      }\n      match /transfer_orders/{trId} {\n        allow read: if isSuperAdmin() || sameCompany(companyId);\n        allow write: if isSuperAdmin() || sameCompany(companyId);\n      }"
);

fs.writeFileSync('firestore.rules', code);
