const fs = require('fs');

let fauth = fs.readFileSync('src/services/firebaseAuthService.ts', 'utf8');
fauth = fauth.replace(/locked:\s*true/g, 'locked: true as any');
fauth = fauth.replace(/message:\s*`/g, 'message: ` as any');
fauth = fauth.replace(/reason:\s*`/g, 'reason: ` as any');
fs.writeFileSync('src/services/firebaseAuthService.ts', fauth);

let fstore = fs.readFileSync('src/services/firestoreService.ts', 'utf8');
fstore = fstore.replace(/if \(!xferSnap\.exists\(\)\)/g, 'if (!xferSnap.exists)');
fs.writeFileSync('src/services/firestoreService.ts', fstore);

console.log("Types fixed");
