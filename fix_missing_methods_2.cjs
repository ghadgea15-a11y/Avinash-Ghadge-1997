const fs = require('fs');
const file = 'src/services/firestoreService.ts';
let content = fs.readFileSync(file, 'utf8');

// replace the ANY typed methods with strongly typed ones or at least any-compatible generics
// We'll just define the methods with proper types as per their previous signatures or use `any`.
// Wait, if I just use `subscribeToTasks(session: any, companyId: string, onData: (data: any) => void)`
// Then the callback `onData` receives `any`. So `allTasks` is `any`. TS might complain if `noImplicitAny` is true and it doesn't infer `any` from `any`? No, if `onData` takes `any`, `allTasks` is inferred as `any`. But if `noImplicitAny` is strict, maybe it complains? Let's just fix the files that complain.

const newMethods = `
  static async updateLeaveRequestStatus(companyId: string, requestId: string, status: string, updates: any): Promise<boolean> {
    try {
      const { doc, updateDoc } = await import('firebase/firestore');
      const ref = doc(db, 'companies', companyId, 'leaveRequests', requestId);
      await updateDoc(ref, { status, ...updates, updatedAt: new Date().toISOString() });
      return true;
    } catch { return false; }
  }
`;

if (content.includes('// Indian Rupee Words Helper Function')) {
  const match = content.match(/}(\s*\/\/\s*Indian Rupee Words Helper Function)/);
  if (match) {
    content = content.replace(match[0], newMethods + '\n' + match[0]);
  }
}

fs.writeFileSync(file, content);
