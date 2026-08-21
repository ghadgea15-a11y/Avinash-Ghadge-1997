import * as fs from 'fs';
const file = 'firestore.rules';
let content = fs.readFileSync(file, 'utf8');

const poRules = `
      // ==========================================
      // MODULE 14.3: PURCHASE ORDERS
      // ==========================================
      match /purchase_orders/{poId} {
        allow read: if isSuperAdmin() || sameCompany(companyId);
        allow create, update: if isSuperAdmin() || isCompanyAdmin(companyId) || isManager(companyId);
        allow delete: if isSuperAdmin() || isCompanyAdmin(companyId);
      }
      match /po_amendments/{amendmentId} {
        allow read: if isSuperAdmin() || sameCompany(companyId);
        allow write: if isSuperAdmin() || isCompanyAdmin(companyId) || isManager(companyId);
      }
`;

if (!content.includes('match /purchase_orders/{')) {
  content = content.replace(
    '// ==========================================\n      // MODULE 14.1',
    poRules + '\n      // ==========================================\n      // MODULE 14.1'
  );
  fs.writeFileSync(file, content);
  console.log('Added PO Rules');
}
