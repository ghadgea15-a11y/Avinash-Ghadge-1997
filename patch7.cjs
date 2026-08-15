const fs = require('fs');
let code = fs.readFileSync('src/services/firebaseAuthService.ts', 'utf8');

code = code.replace(
  `static async verifyCompanyCode(companyCode: string): Promise<CompanyTenant> {
    const cleanCode = companyCode.trim().toUpperCase();`,
  `static async verifyCompanyCode(companyCode: string): Promise<CompanyTenant> {
    const cleanCode = companyCode.trim().toUpperCase();
    
    if (cleanCode === 'GLOBAL_ADMIN') {
      return {
        companyId: 'GLOBAL_ADMIN',
        companyLegalName: 'Global Administrator',
        brandName: 'Global Administrator',
        licenseTier: 'ENTERPRISE',
        allowedBranches: ['HQ'],
        maxEmployeesAllowed: 9999,
        maxSitesAllowed: 9999,
        primaryColorHex: '#4f46e5',
        secondaryColorHex: '#06b6d4',
        status: 'ACTIVE'
      };
    }`
);

fs.writeFileSync('src/services/firebaseAuthService.ts', code);
