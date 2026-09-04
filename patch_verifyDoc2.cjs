const fs = require('fs');
let code = fs.readFileSync('src/services/firestoreService.ts', 'utf8');

code = code.replace(
  "  static async verifyEmployeeDocument(companyId: string, employeeId: string, documentId: string, status: string, actor?: any): Promise<boolean> {\n    try {\n      const empRef = doc(db, 'companies', companyId, 'employees', employeeId);\n      const snap = await getDoc(empRef);\n      if (!snap.exists()) return false;\n      const data = snap.data();\n      let docs = data.documents || [];\n      docs = docs.map((d: any) => {\n        if (d.id === documentId) {\n          return { ...d, status, verificationStatus: status, verifiedBy: actor?.userId || actor?.uid || 'SYSTEM', verifiedAt: new Date().toISOString() };\n        }\n        return d;\n      });\n      await updateDoc(empRef, { documents: docs, updatedAt: new Date().toISOString() });\n      return true;\n    } catch (err) {\n      console.error('[FirestoreService] verifyEmployeeDocument error:', err);\n      return false;\n    }\n  }",
  `  static async verifyEmployeeDocument(companyId: string, employeeId: string, updatedDocs: any[], actor?: any): Promise<boolean> {
    try {
      const empRef = doc(db, 'companies', companyId, 'employees', employeeId);
      await updateDoc(empRef, { documents: updatedDocs, updatedAt: new Date().toISOString() });
      return true;
    } catch (err) {
      console.error('[FirestoreService] verifyEmployeeDocument error:', err);
      return false;
    }
  }`
);

fs.writeFileSync('src/services/firestoreService.ts', code);
console.log('patched verifyEmployeeDocument 2');
