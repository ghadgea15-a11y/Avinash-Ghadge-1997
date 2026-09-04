const fs = require('fs');
let code = fs.readFileSync('src/services/firestoreService.ts', 'utf8');

code = code.replace(
  "static subscribeToAttendance(...args: any[]): () => void { const cb = args[args.length-1]; if (typeof cb === 'function') cb([]); return () => {}; }",
  `static subscribeToAttendance(userSession: any, companyId: string, cb: (data: any[]) => void): () => void {
    if (!companyId) return () => {};
    let q = query(collection(db, 'companies', companyId, 'attendance'), limit(100)); // basic query
    
    // If not admin, restrict to self or site
    if (userSession.roles && !userSession.roles.includes('COMPANY_ADMIN') && !userSession.roles.includes('SUPER_ADMIN')) {
      if (!userSession.roles.includes('SUPERVISOR')) {
        q = query(collection(db, 'companies', companyId, 'attendance'), where('employeeId', '==', userSession.employeeId || userSession.userId), limit(100));
      }
    }
    
    return onSnapshot(q, (snap) => {
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      cb(docs);
    }, (error) => {
      console.error(error);
      cb([]);
    });
  }`
);

fs.writeFileSync('src/services/firestoreService.ts', code);
console.log('patched subscribeToAttendance');
