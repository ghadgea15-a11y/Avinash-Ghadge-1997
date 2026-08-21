const fs = require('fs');
let c = fs.readFileSync('src/services/firestoreService.ts', 'utf8');
const search = "static async saveEmployee(companyId: string, employee: EmployeeRecord, actor: { id: string, name: string }): Promise<boolean> {";
const index = c.indexOf(search);
if (index === -1) throw new Error("Could not find saveEmployee");

const replace = `  static async inviteEmployeeUser(companyId: string, employeeId: string): Promise<{ success: boolean; resetLink?: string }> {
    try {
      const { getFunctions, httpsCallable } = await import('firebase/functions');
      const functions = getFunctions();
      const inviteEmployee = httpsCallable(functions, 'inviteEmployee');
      const result = await inviteEmployee({ companyId, employeeId }) as any;
      if (result.data && result.data.success) {
        return { success: true, resetLink: result.data.resetLink };
      }
      return { success: false };
    } catch (err) {
      console.error('[FirestoreService] inviteEmployee error:', err);
      return { success: false };
    }
  }

  static async saveEmployee(companyId: string, employee: EmployeeRecord, actor: { id: string, name: string }): Promise<boolean> {`;

c = c.substring(0, index) + replace + c.substring(index + search.length);
fs.writeFileSync('src/services/firestoreService.ts', c);
console.log("Done");
