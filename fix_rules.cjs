const fs = require('fs');
let code = fs.readFileSync('firestore.rules', 'utf8');

// The original ones were around line 300, and they allowed write by CompanyAdmin.
// We want to replace those old ones with nothing (delete them) since we added the new ones near the top.
// Or we can just delete the new ones I just added, and modify the original ones.

// Let's just rewrite the whole match /companies/{companyId} section carefully.
// Actually, it's easier to remove the old ones.
code = code.replace(
  /match \/invoices\/\{invoiceId\} \{\s*allow read: if isSuperAdmin\(\) \|\| isCompanyAdmin\(companyId\);\s*allow write: if isSuperAdmin\(\) \|\| isCompanyAdmin\(companyId\);\s*\}/g,
  ""
);

code = code.replace(
  /match \/payments\/\{paymentId\} \{\s*allow read: if isSuperAdmin\(\) \|\| isCompanyAdmin\(companyId\);\s*allow write: if isSuperAdmin\(\) \|\| isCompanyAdmin\(companyId\);\s*\}/g,
  ""
);

fs.writeFileSync('firestore.rules', code);
