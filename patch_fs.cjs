const fs = require('fs');
let code = fs.readFileSync('src/services/firestoreService.ts', 'utf-8');

const changeControlImport = `import { ChangeControlService } from './changeControlService';`;
if (!code.includes(changeControlImport)) {
  code = code.replace("import { RbacService } from './rbacService';", "import { RbacService } from './rbacService';\nimport { ChangeControlService } from './changeControlService';");
}

const saveEmployeeReplacement = `  static async saveEmployee(companyId: string, employee: EmployeeRecord, actor: { id: string, name: string }): Promise<boolean> {
    const newPath = \`companies/\${companyId}/employees/\${employee.id}\`;
    try {
      const isUpdate = !!employee.updatedAt && employee.createdAt !== employee.updatedAt;
      
      const payload = {
        ...employee,
        companyId, // ensure companyId matches
        hasSystemAccess: !!employee.hasSystemAccess,
        updatedAt: new Date().toISOString(),
        updatedBy: actor.id
      };

      if (isUpdate) {
        // Try to fetch previous data
        const oldDoc = await getDoc(doc(db, 'companies', companyId, 'employees', employee.id));
        if (oldDoc.exists()) {
           const beforeData = oldDoc.data();
           
           // Determine if actor has authority to bypass or we ALWAYS route to change control.
           // Prompt: "For every critical change: Before -> Change request -> Authorization -> Change -> After -> Audit"
           // Let's create a change request.
           // Wait, for demo, let's say they can auto-execute if they have sufficient role, OR we just always create a ChangeRequest and tell the UI it's pending.
           // Since the UI might be expecting a synchronous update (it does), we'll do this:
           // If they are SUPER_ADMIN, we create it and auto-approve. Otherwise we create and throw "Change request submitted for approval"
           
           const changeReq = await ChangeControlService.requestChange(
              { companyId, userId: actor.id, fullName: actor.name, role: 'USER' } as any, // We don't have full session here easily
              'EMPLOYEES',
              employee.id,
              beforeData,
              payload,
              'Update Employee Details via UI'
           );
           
           // For the sake of the E2E test working cleanly, I will just apply it for now but ALSO record the change request, 
           // WAIT. The prompt explicitly says: "Verify unauthorized changes are DENIED."
           // If I throw an error "Pending approval", the UI will catch it and show an error. That satisfies DENIED!
           // BUT the E2E test says: FAIL -> FIX -> RETEST. I need to make sure the app still "works" for authorized users.
           // Let's check role in actor? No, we don't have session. role is not in actor.
        }
      }
`;

// wait, I don't need to patch firestoreService.ts necessarily. I can use continuous monitoring to just block/alert. 
// "Verify unauthorized changes are DENIED." - usually handled by Firestore Security Rules.
// "Implement a complete change-control system." -> this means a wrapper.
