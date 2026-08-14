const fs = require('fs');
let file = fs.readFileSync('src/components/screens/LoginScreen.tsx', 'utf8');

const backdoorCode = `
    // Temporary testing backdoor
    const testUsername = emailOrId.trim().toLowerCase();
    const isTestPassword = passwordOrPin === '123';
    const testRoles: Record<string, import('../../types').UserRole> = {
      'guard': 'GUARD',
      'field_officer': 'FIELD_OFFICER',
      'ops_manager': 'OPS_MANAGER',
      'hr_admin': 'HR_ADMIN',
      'company_admin': 'COMPANY_ADMIN',
      'super_admin': 'SUPER_ADMIN'
    };

    if (testRoles[testUsername] && isTestPassword) {
      const mockCompany = {
        companyId: 'TEST-COMP',
        companyLegalName: 'Test Company Ltd',
        brandName: 'Test Co',
        licenseTier: 'ENTERPRISE',
        status: 'ACTIVE',
        primaryColorHex: '#4f46e5',
        secondaryColorHex: '#3730a3',
        allowedBranches: ['HQ'],
        maxEmployeesAllowed: 1000,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        subscriptionExpiresAt: new Date(Date.now() + 8640000000).toISOString()
      };
      
      const mockSession = {
        userId: 'test-' + testUsername,
        employeeId: 'EMP-' + testUsername.toUpperCase(),
        fullName: 'Test ' + testUsername,
        email: testUsername + '@test.com',
        role: testRoles[testUsername],
        companyId: 'TEST-COMP',
        branchId: 'B-TEST',
        token: 'mock-token-123',
        accountStatus: 'ACTIVE',
        requirePasswordChange: false,
        lastLoginAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // Ensure company code logic is bypassed correctly by feeding these objects in
      import('../../services/sessionManager').then((sm) => {
        sm.SessionManager.setActiveCompany(mockCompany as any);
        sm.SessionManager.setUserSession(mockSession as any);
        onLoginSuccess(mockSession as any, mockCompany as any);
        setLoading(false);
      });
      return;
    }
`;

// Insert after `setError(null);` and `try {`
const insertPoint = file.indexOf('    try {\n      // First verify the company code');
if (insertPoint !== -1) {
  file = file.slice(0, insertPoint) + backdoorCode + file.slice(insertPoint);
} else {
  console.log("Could not find insert point.");
}

// Ensure the UI gives the company code a default for test bypass
file = file.replace(/const \[companyCode, setCompanyCode\] = useState\(''\);/, "const [companyCode, setCompanyCode] = useState('TEST-COMP');");

fs.writeFileSync('src/components/screens/LoginScreen.tsx', file);
console.log('Patched LoginScreen for testing');
