const fs = require('fs');
let file = fs.readFileSync('src/components/screens/LoginScreen.tsx', 'utf8');

// Replace email type to allow single word username
file = file.replace(/type="email"/g, 'type="text"');

// Update testRoles
const oldTestRoles = `    const testRoles: Record<string, import('../../types').UserRole> = {
      'guard': 'GUARD',
      'field_officer': 'FIELD_OFFICER',
      'ops_manager': 'OPS_MANAGER',
      'hr_admin': 'HR_ADMIN',
      'company_admin': 'COMPANY_ADMIN',
      'super_admin': 'SUPER_ADMIN'
    };`;

const newTestRoles = `    const testRoles: Record<string, import('../../types').UserRole> = {
      'guard': 'GUARD',
      'officer': 'FIELD_OFFICER',
      'manager': 'OPS_MANAGER',
      'hr': 'HR_ADMIN',
      'company': 'COMPANY_ADMIN',
      'super': 'SUPER_ADMIN'
    };`;

file = file.replace(oldTestRoles, newTestRoles);

fs.writeFileSync('src/components/screens/LoginScreen.tsx', file);
console.log('Updated usernames and input type to text');
