const fs = require('fs');

let code = fs.readFileSync('src/services/firestoreService.ts', 'utf8');

// Asset Scope
code = code.replace(
  /const colRef = collection\(db, 'companies', companyId, 'assets'\);\s*return onSnapshot\(colRef, \(snap\) => \{/g,
  `const colRef = collection(db, 'companies', companyId, 'assets');
      const q = query(colRef, ...QueryScopeEngine.buildScope(session, 'ASSETS'));
      return onSnapshot(q, (snap) => {`
);

// Material Scope
code = code.replace(
  /const colRef = collection\(db, 'companies', companyId, 'material_movement_logs'\);\s*return onSnapshot\(colRef, \(snap\) => \{/g,
  `const colRef = collection(db, 'companies', companyId, 'material_movement_logs');
      const q = query(colRef, ...QueryScopeEngine.buildScope(session, 'MATERIALS'));
      return onSnapshot(q, (snap) => {`
);

fs.writeFileSync('src/services/firestoreService.ts', code);
