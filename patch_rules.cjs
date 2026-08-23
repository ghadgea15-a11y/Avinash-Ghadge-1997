const fs = require('fs');
const file = 'firestore.rules';
let code = fs.readFileSync(file, 'utf8');

const target = `    match /users/{uid} {`;
const replacement = `    match /users/{uid}/private/{docId} {
      allow read, write: if isSelf(uid) || isSuperAdmin();
    }
    
    match /users/{uid} {`;

if(code.includes(target)) {
  code = code.replace(target, replacement);
  fs.writeFileSync(file, code);
  console.log('Patched firestore.rules for private subcollection');
} else {
  console.log('Target not found');
}
