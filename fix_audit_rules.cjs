const fs = require('fs');
let content = fs.readFileSync('firestore.rules', 'utf8');

const additionalRules = `
    match /audit_trails/{auditId} {
      allow read: if isSuperAdmin();
      allow create: if signedIn();
      allow update, delete: if false; // STRICT IMMUTABLE AUDIT TRAIL - WRITE-ONCE ONLY
    }
`;

content = content.replace("match /platform_audit_logs/{logId} {", additionalRules + "\n    match /platform_audit_logs/{logId} {");

fs.writeFileSync('firestore.rules', content);
