import * as fs from 'fs';
const file = 'firestore.rules';
let content = fs.readFileSync(file, 'utf8');

const matchRules = `
      // ==========================================
      // MODULE 14.4: 3-WAY MATCHING
      // ==========================================
      match /vendor_invoices/{invoiceId} {
        allow read: if isSuperAdmin() || sameCompany(companyId);
        allow create, update: if isSuperAdmin() || isCompanyAdmin(companyId) || isManager(companyId) || hasRole(companyId, 'A3_SUPERVISOR_MANAGER');
      }
      match /three_way_match_records/{matchId} {
        allow read: if isSuperAdmin() || sameCompany(companyId);
        allow write: if false; // System only (Cloud Functions)
      }
`;

if (!content.includes('match /vendor_invoices/')) {
  content = content.replace(
    '// ==========================================\n      // MODULE 14.1',
    matchRules + '\n      // ==========================================\n      // MODULE 14.1'
  );
  fs.writeFileSync(file, content);
  console.log('Added 3-Way Match Rules');
}
