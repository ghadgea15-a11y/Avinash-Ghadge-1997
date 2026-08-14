const fs = require('fs');
let file = fs.readFileSync('src/services/firebaseAuthService.ts', 'utf8');

const timeoutWrap = `
      // Add timeout to prevent hanging when offline
      const querySnap = await Promise.race([
        getDocs(empQuery),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Network Timeout: Unable to reach database')), 5000))
      ]);
`;

file = file.replace(
  "const querySnap = await getDocs(empQuery);",
  timeoutWrap
);

fs.writeFileSync('src/services/firebaseAuthService.ts', file);
console.log("Patched FirebaseAuthService for timeout.");
