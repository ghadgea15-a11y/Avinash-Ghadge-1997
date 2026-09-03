const fs = require('fs');
let file = 'firestore.rules';
let code = fs.readFileSync(file, 'utf8');

// Fix root notifications rule
code = code.replace(
  /match \/notifications\/\{notificationId\} \{\n      allow read: if signedIn\(\) && \(isSuperAdmin\(\) \|\| \(resource\.data\.companyId == companyId\(\)\) \|\| \(resource\.data\.recipientId == request\.auth\.uid\)\);/,
  `match /notifications/{notificationId} {\n      allow read: if signedIn() && (isSuperAdmin() || resource.data.recipientId == request.auth.uid || resource.data.recipientUid == request.auth.uid || (resource.data.companyId == companyId() && (isOwnerOrExecutive() || isOfficialStaff())));`
);

// Fix companies/{cId}/notifications rule
code = code.replace(
  /match \/notifications\/\{notificationId\} \{\n        allow read: if sameCompany\(cId\) && \(isOwnerOrExecutive\(\) \|\| isOfficialStaff\(\) \|\| resource\.data\.recipientUid == request\.auth\.uid \|\| resource\.data\.recipientId == request\.auth\.uid\);/,
  `match /notifications/{notificationId} {\n        allow read: if sameCompany(cId) && (isOwnerOrExecutive() || isOfficialStaff() || resource.data.recipientUid == request.auth.uid || resource.data.recipientId == request.auth.uid || (resource.data.roleScope != null && authorityLevel() in resource.data.roleScope) || (resource.data.recipientUid == null && resource.data.recipientId == null && (resource.data.roleScope == null || resource.data.roleScope.size() == 0)));`
);

fs.writeFileSync(file, code);
