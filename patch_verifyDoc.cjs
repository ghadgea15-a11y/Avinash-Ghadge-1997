const fs = require('fs');
let code = fs.readFileSync('src/services/firestoreService.ts', 'utf8');

code = code.replace(
  "  static async verifyEmployeeDocument(...args: any[]): Promise<boolean> { return true; }",
  `  static async verifyEmployeeDocument(companyId: string, employeeId: string, documentId: string, status: string, actor?: any): Promise<boolean> {
    try {
      const empRef = doc(db, 'companies', companyId, 'employees', employeeId);
      const snap = await getDoc(empRef);
      if (!snap.exists()) return false;
      const data = snap.data();
      let docs = data.documents || [];
      docs = docs.map((d: any) => {
        if (d.id === documentId) {
          return { ...d, status, verificationStatus: status, verifiedBy: actor?.userId || actor?.uid || 'SYSTEM', verifiedAt: new Date().toISOString() };
        }
        return d;
      });
      await updateDoc(empRef, { documents: docs, updatedAt: new Date().toISOString() });
      return true;
    } catch (err) {
      console.error('[FirestoreService] verifyEmployeeDocument error:', err);
      return false;
    }
  }`
);

fs.writeFileSync('src/services/firestoreService.ts', code);
console.log('patched verifyEmployeeDocument');
