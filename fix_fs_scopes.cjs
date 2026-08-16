const fs = require('fs');

let code = fs.readFileSync('src/services/firestoreService.ts', 'utf8');

// fix incidents
code = code.replace(/const colRef = collection\(db, 'companies', companyId, 'incident_reports'\);\s*return onSnapshot\(colRef, \(snap\)/g,
`const colRef = collection(db, 'companies', companyId, 'incident_reports');
      const q = query(colRef, ...QueryScopeEngine.buildScope(session, 'INCIDENTS'));
      return onSnapshot(q, (snap)`);

// fix visitors
code = code.replace(/const colRef = collection\(db, 'companies', companyId, 'visitor_logs'\);\s*return onSnapshot\(colRef, \(snap\)/g,
`const colRef = collection(db, 'companies', companyId, 'visitor_logs');
      const q = query(colRef, ...QueryScopeEngine.buildScope(session, 'VISITORS'));
      return onSnapshot(q, (snap)`);

// fix site logs
code = code.replace(/const colRef = collection\(db, 'companies', companyId, 'daily_site_logs'\);\s*return onSnapshot\(colRef, \(snap\)/g,
`const colRef = collection(db, 'companies', companyId, 'daily_site_logs');
      const q = query(colRef, ...QueryScopeEngine.buildScope(session, 'LOGS'));
      return onSnapshot(q, (snap)`);

fs.writeFileSync('src/services/firestoreService.ts', code);
