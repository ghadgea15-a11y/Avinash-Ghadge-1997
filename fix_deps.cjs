const fs = require('fs');
let content = fs.readFileSync('src/services/firestoreService.ts', 'utf8');

const regex = /\/\/ Default fallback company departments[\s\S]*?\];/m;
const replacement = `// Default fallback company departments
    return [
      { companyId: '', id: 'DEPT-HR', name: 'HR', code: 'HR', description: 'Human Resources', status: 'ACTIVE', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { companyId: '', id: 'DEPT-ADMIN', name: 'Administration', code: 'ADMIN', description: 'General Administration', status: 'ACTIVE', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { companyId: '', id: 'DEPT-SEC', name: 'Security', code: 'SEC', description: 'Physical & Field Security', status: 'ACTIVE', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { companyId: '', id: 'DEPT-OPS', name: 'Operations', code: 'OPS', description: 'Site Operations', status: 'ACTIVE', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { companyId: '', id: 'DEPT-FIN', name: 'Finance', code: 'FIN', description: 'Finance & Accounts', status: 'ACTIVE', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { companyId: '', id: 'DEPT-ACCTS', name: 'Accounts', code: 'ACCTS', description: 'Accounting & Payroll', status: 'ACTIVE', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { companyId: '', id: 'DEPT-IT', name: 'IT', code: 'IT', description: 'Information Technology', status: 'ACTIVE', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
    ];`;

content = content.replace(regex, replacement);
fs.writeFileSync('src/services/firestoreService.ts', content);
