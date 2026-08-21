const fs = require('fs');
let file = 'src/services/firestoreService.ts';
let code = fs.readFileSync(file, 'utf8');
code = code.replace("const { getFunctions, httpsCallable } = require('firebase/functions');", "/* imported at top if possible */");
code = "import { getFunctions, httpsCallable } from 'firebase/functions';\n" + code;
fs.writeFileSync(file, code);
