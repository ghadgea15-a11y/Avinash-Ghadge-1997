const fs = require('fs');
let code = fs.readFileSync('src/services/firestoreService.ts', 'utf8');

code = code.replace(
  "  static async updateEmployeeStatus(\n    companyId: string,\n    employeeId: string,\n    status: string,\n    actor?: any\n  ): Promise<boolean> {\n    try {\n      const empRef = doc(db, 'companies', companyId, 'employees', employeeId);\n      await updateDoc(empRef, {\n        status,\n        updatedAt: new Date().toISOString(),\n        updatedBy: actor?.userId || actor?.uid || 'SYSTEM'\n      });\n      return true;\n    } catch (err) {\n      console.error('[FirestoreService] updateEmployeeStatus error:', err);\n      return false;\n    }\n  }",
  `  static async updateEmployeeStatus(
    companyId: string,
    employeeId: string,
    status: string,
    actor?: any
  ): Promise<boolean> {
    try {
      // Always update local firestore for optimistic/offline behavior
      const empRef = doc(db, 'companies', companyId, 'employees', employeeId);
      await updateDoc(empRef, {
        status,
        updatedAt: new Date().toISOString(),
        updatedBy: actor?.userId || actor?.uid || 'SYSTEM'
      });
      
      // Attempt to hit the backend API to enforce Firebase Auth suspension
      try {
        const token = await (getAuth().currentUser?.getIdToken() || '');
        if (token) {
          fetch('/api/admin/update-employee-status', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': \`Bearer \${token}\`
            },
            body: JSON.stringify({ companyId, employeeId, status })
          }).catch(err => console.warn('Background sync for auth suspension failed:', err));
        }
      } catch (e) {
        // Ignore network errors for the background call
      }
      
      return true;
    } catch (err) {
      console.error('[FirestoreService] updateEmployeeStatus error:', err);
      return false;
    }
  }`
);

fs.writeFileSync('src/services/firestoreService.ts', code);
console.log('patched updateEmployeeStatus');
