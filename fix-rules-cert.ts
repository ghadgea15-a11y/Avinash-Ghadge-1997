import * as fs from 'fs';
const file = 'firestore.rules';
let content = fs.readFileSync(file, 'utf8');

const newRule = `
      match /employeeCertifications/{docId} {
        allow read: if isSuperAdmin() || sameCompany(companyId);
        allow create, update: if isSuperAdmin() || sameCompany(companyId);
        allow delete: if isSuperAdmin() || isCompanyAdmin(companyId);
      }
`;

content = content.replace("match /trainingPrograms/{docId} {", newRule + "      match /trainingPrograms/{docId} {");
fs.writeFileSync(file, content);
