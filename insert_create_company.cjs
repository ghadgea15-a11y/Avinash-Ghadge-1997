const fs = require('fs');
const file = 'src/services/firestoreService.ts';
let lines = fs.readFileSync(file, 'utf8').split('\n');

const insertContent = `
  static async createCompanyWithAdmin(params: {
    company: CompanyTenant;
    adminInfo: { fullName: string; email: string; mobileNumber?: string; password?: string };
    enabledModules: string[];
    createdByUid: string;
    createdByName: string;
  }): Promise<{ success: boolean; message: string; companyId: string }> {
    try {
      const { getFunctions, httpsCallable } = require('firebase/functions');
      const functions = getFunctions();
      const provisionTenant = httpsCallable(functions, 'provisionTenant');
      
      const result = await provisionTenant(params) as any;
      if (result.data && result.data.success) {
        return { 
          success: true, 
          message: \`Company "\${params.company.brandName}" (\${result.data.companyId}) created successfully.\`,
          companyId: result.data.companyId 
        };
      } else {
        return { success: false, message: 'Failed to create company.', companyId: '' };
      }
    } catch (err: any) {
      console.error('[FirestoreService] createCompanyWithAdmin error:', err);
      return { success: false, message: err.message || 'Failed to create company.', companyId: '' };
    }
  }
`;

lines.splice(3722, 0, insertContent);
fs.writeFileSync(file, lines.join('\n'));
console.log('Inserted createCompanyWithAdmin');
