const fs = require('fs');
let code = fs.readFileSync('src/services/firestoreService.ts', 'utf8');

const dummiesToReplace = [
  "static async saveRoster(...args: any[]): Promise<boolean> { return true; }",
  "static async deleteRoster(...args: any[]): Promise<boolean> { return true; }",
  "static async bulkSaveRosters(...args: any[]): Promise<boolean> { return true; }",
  "static async saveShift(...args: any[]): Promise<boolean> { return true; }",
  "static async deleteShift(...args: any[]): Promise<boolean> { return true; }",
  "static async getRostersByDate(...args: any[]): Promise<any> { return []; }",
  "static subscribeToShifts(...args: any[]): () => void { const cb = args[args.length-1]; if (typeof cb === 'function') cb([]); return () => {}; }",
  "static subscribeToRosters(...args: any[]): () => void { const cb = args[args.length-1]; if (typeof cb === 'function') cb([]); return () => {}; }",
  "static async getShifts(...args: any[]): Promise<any> { return []; }"
];

const newMethods = `
  static subscribeToShifts(userSession: any, companyId: string, cb: (data: any[]) => void): () => void {
    if (!companyId) return () => {};
    const q = query(collection(db, 'companies', companyId, 'shifts'), where('status', '==', 'ACTIVE'));
    return onSnapshot(q, (snap) => {
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      cb(docs);
    });
  }

  static subscribeToRosters(userSession: any, companyId: string, cb: (data: any[]) => void): () => void {
    if (!companyId) return () => {};
    // Depending on role, we might filter by site. For now, let's fetch all or limit if necessary
    let q = query(collection(db, 'companies', companyId, 'rosters'));
    if (userSession.role === 'SUPERVISOR') {
      // Just an example, ideally filtering by siteId
      q = query(collection(db, 'companies', companyId, 'rosters'), where('siteId', 'in', [userSession.branchId, userSession.assignedSiteId].filter(Boolean)));
    }
    return onSnapshot(q, (snap) => {
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      cb(docs);
    });
  }

  static async getShifts(companyId: string): Promise<any> {
    const q = query(collection(db, 'companies', companyId, 'shifts'), where('status', '==', 'ACTIVE'));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  }

  static async saveShift(companyId: string, shift: any, actor?: any): Promise<boolean> {
    try {
      const shiftRef = doc(db, 'companies', companyId, 'shifts', shift.id);
      await setDoc(shiftRef, { ...shift, updatedAt: new Date().toISOString() }, { merge: true });
      return true;
    } catch(err) { console.error(err); return false; }
  }

  static async deleteShift(companyId: string, shiftId: string, actor?: any): Promise<boolean> {
    try {
      await updateDoc(doc(db, 'companies', companyId, 'shifts', shiftId), { status: 'INACTIVE', updatedAt: new Date().toISOString() });
      return true;
    } catch(err) { console.error(err); return false; }
  }

  static async saveRoster(companyId: string, roster: any): Promise<boolean> {
    try {
      await setDoc(doc(db, 'companies', companyId, 'rosters', roster.id), { ...roster, updatedAt: new Date().toISOString() }, { merge: true });
      return true;
    } catch(err) { console.error(err); throw err; }
  }

  static async deleteRoster(companyId: string, rosterId: string, actor?: any): Promise<boolean> {
    try {
      await deleteDoc(doc(db, 'companies', companyId, 'rosters', rosterId));
      return true;
    } catch(err) { console.error(err); throw err; }
  }

  static async bulkSaveRosters(companyId: string, rosters: any[], actor?: any): Promise<boolean> {
    try {
      const batch = writeBatch(db);
      rosters.forEach(r => {
        const ref = doc(db, 'companies', companyId, 'rosters', r.id);
        batch.set(ref, { ...r, updatedAt: new Date().toISOString() }, { merge: true });
      });
      await batch.commit();
      return true;
    } catch(err) { console.error(err); throw err; }
  }

  static async getRostersByDate(companyId: string, dateStr: string): Promise<any> {
    try {
      const q = query(collection(db, 'companies', companyId, 'rosters'), where('date', '==', dateStr));
      const snap = await getDocs(q);
      return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch(err) { console.error(err); return []; }
  }
`;

for (const dummy of dummiesToReplace) {
  code = code.replace(dummy, "");
}

code = code.replace(
  /static subscribeToAttendance\(/,
  newMethods + "\n  static subscribeToAttendance("
);

fs.writeFileSync('src/services/firestoreService.ts', code);
console.log('patched wfm firestore methods');
