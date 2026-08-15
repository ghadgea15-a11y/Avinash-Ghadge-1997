const fs = require('fs');
let code = fs.readFileSync('src/services/firebaseAuthService.ts', 'utf8');

code = code.replace(
  `const { createUserWithEmailAndPassword } = require('firebase/auth');
                  userCredential = await createUserWithEmailAndPassword(auth, cleanInputLower, passwordOrPin);`,
  `userCredential = await createUserWithEmailAndPassword(auth, cleanInputLower, passwordOrPin);`
);

fs.writeFileSync('src/services/firebaseAuthService.ts', code);
