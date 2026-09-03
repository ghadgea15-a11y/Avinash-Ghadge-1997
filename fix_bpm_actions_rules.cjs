const fs = require('fs');
let content = fs.readFileSync('firestore.rules', 'utf8');

const additionalRules = `
      match /bpm_actions/{actionId} {
        allow read: if sameCompany(cId);
        allow write: if sameCompany(cId);
      }
`;

content = content.replace("match /bpm_instances/{instanceId} {", additionalRules + "\n      match /bpm_instances/{instanceId} {");

fs.writeFileSync('firestore.rules', content);
