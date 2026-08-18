const fs = require('fs');
let code = fs.readFileSync('storage.rules', 'utf8');

code = code.replace(
  "    match /companies/{cid}/inventory/{iid}/images/{file} {\n      allow write: if companyMatch(cid) && opsTier() && validImage();\n    }",
  "    match /companies/{cid}/inventory/{iid}/images/{file} {\n      allow write: if companyMatch(cid) && opsTier() && validImage();\n    }\n    match /companies/{cid}/gate_passes/{gpid}/{allPaths=**} {\n      allow write: if companyMatch(cid) && validDoc();\n    }"
);

fs.writeFileSync('storage.rules', code);
