const fs = require('fs');

let code = fs.readFileSync('src/services/firestoreService.ts', 'utf8');

code = code.replace(
  /const colRef = collection\(db, 'companies', companyId, 'attendance_logs'\);\s*return onSnapshot\(colRef, \(snap\) => \{/g,
  `const colRef = collection(db, 'companies', companyId, 'attendance_logs');
      const q = query(colRef, ...QueryScopeEngine.buildScope(session, 'ATTENDANCE'));
      return onSnapshot(q, (snap) => {`
);

fs.writeFileSync('src/services/firestoreService.ts', code);
