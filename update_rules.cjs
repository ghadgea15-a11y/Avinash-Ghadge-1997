const fs = require('fs');
const file = 'firestore.rules';
let code = fs.readFileSync(file, 'utf8');

const candidateRules = `      match /candidates/{docId} {
        allow read: if isSuperAdmin() || sameCompany(companyId);
        allow create, update: if isSuperAdmin() || sameCompany(companyId);
        allow delete: if isSuperAdmin() || isCompanyAdmin(companyId);
      }`;

const newCandidateRules = `      match /candidates/{docId} {
        allow read: if isSuperAdmin() || sameCompany(companyId);
        // Only HR and Admins should update aadhaarNumber or verification statuses
        allow update: if (isSuperAdmin() || sameCompany(companyId)) && 
                         (!request.resource.data.diff(resource.data).affectedKeys().hasAny(['aadhaarNumber', 'aadhaarVerificationStatus', 'policeVerificationStatus']) || 
                          hasRole(companyId, 'HR') || hasRole(companyId, 'ADMIN') || isCompanyAdmin(companyId));
        allow create: if isSuperAdmin() || sameCompany(companyId);
        allow delete: if isSuperAdmin() || isCompanyAdmin(companyId);
      }`;

const bgvRules = `      match /backgroundVerifications/{docId} {
        allow read: if isSuperAdmin() || sameCompany(companyId);
        allow create, update: if isSuperAdmin() || sameCompany(companyId);
        allow delete: if isSuperAdmin() || isCompanyAdmin(companyId);
      }`;

const newBgvRules = `      match /backgroundVerifications/{docId} {
        allow read: if isSuperAdmin() || (sameCompany(companyId) && (hasRole(companyId, 'HR') || hasRole(companyId, 'ADMIN') || hasRole(companyId, 'MANAGER') || isCompanyAdmin(companyId)));
        allow create: if isSuperAdmin() || (sameCompany(companyId) && (hasRole(companyId, 'HR') || hasRole(companyId, 'ADMIN') || isCompanyAdmin(companyId)));
        allow update: if isSuperAdmin() || (sameCompany(companyId) && (hasRole(companyId, 'HR') || hasRole(companyId, 'ADMIN') || isCompanyAdmin(companyId)));
        allow delete: if isSuperAdmin() || isCompanyAdmin(companyId);
      }`;

code = code.replace(candidateRules, newCandidateRules);
code = code.replace(bgvRules, newBgvRules);

fs.writeFileSync(file, code);
