import * as fs from 'fs';
const file = 'storage.rules';
let content = fs.readFileSync(file, 'utf8');

const newRule = `
    match /companies/{cid}/certifications/{allPaths=**} {
      allow read: if companyMatch(cid);
      allow write: if companyMatch(cid) && validDoc();
    }
`;

content = content.replace("match /companies/{cid}/candidates/{candId}/{allPaths=**} {", newRule + "    match /companies/{cid}/candidates/{candId}/{allPaths=**} {");
fs.writeFileSync(file, content);
