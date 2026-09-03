const fs = require('fs');
let content = fs.readFileSync('firestore.rules', 'utf8');

// We already added a top level match /bpm_actions/{actionId}. Let's remove it and add it as a subcollection.
content = content.replace(/      match \/bpm_actions\/\{actionId\} \{\n        allow read: if sameCompany\(cId\);\n        allow write: if sameCompany\(cId\);\n      \}\n/g, "");

const nestedBpm = `
      match /bpm_instances/{instanceId} {
        allow read: if sameCompany(cId);
        allow write: if sameCompany(cId);
        match /bpm_actions/{actionId} {
          allow read: if sameCompany(cId);
          allow write: if sameCompany(cId);
        }
      }
`;

content = content.replace(/      match \/bpm_instances\/\{instanceId\} \{\n        allow read: if sameCompany\(cId\);\n        allow write: if sameCompany\(cId\);\n      \}/g, nestedBpm);

fs.writeFileSync('firestore.rules', content);
