import * as fs from 'fs';
const file = 'firestore.rules';
let content = fs.readFileSync(file, 'utf8');

const rfqRules = `
      // ==========================================
      // MODULE 14.2: RFQ MANAGEMENT SYSTEM
      // ==========================================
      match /rfq_requests/{rfqId} {
        allow read: if isSuperAdmin() || sameCompany(companyId);
        allow create, update: if isSuperAdmin() || isCompanyAdmin(companyId) || isManager(companyId);
        allow delete: if isSuperAdmin() || isCompanyAdmin(companyId);
      }
      match /rfq_bids/{bidId} {
        allow read: if isSuperAdmin() || sameCompany(companyId);
        allow create, update: if isSuperAdmin() || isCompanyAdmin(companyId) || isManager(companyId);
        allow delete: if isSuperAdmin() || isCompanyAdmin(companyId);
      }
      match /rfq_evaluation_logs/{logId} {
        allow read: if isSuperAdmin() || sameCompany(companyId);
        allow write: if isSuperAdmin() || isCompanyAdmin(companyId) || isManager(companyId);
      }
`;

if (!content.includes('rfq_requests')) {
  content = content.replace(
    '// ==========================================\n      // MODULE 14.1',
    rfqRules + '\n      // ==========================================\n      // MODULE 14.1'
  );
  fs.writeFileSync(file, content);
  console.log('Added RFQ Rules');
} else {
  console.log('RFQ Rules already exist');
}
