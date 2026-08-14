const fs = require('fs');
let file = fs.readFileSync('src/services/firebaseAuthService.ts', 'utf8');

const mockAuthFallback = `
    // 2. PIN / Employee ID Mode - Query Firestore employees collection
    try {
      // Offline/Mock fallback for TATA users
      if (companyId === 'TATA' && cleanInput.startsWith('tata') && passwordOrPin === '1234') {
        const idNum = parseInt(cleanInput.replace('tata', ''), 10);
        let role = 'GUARD';
        let fullName = 'Tata Employee ' + idNum;
        if (idNum === 1) { role = 'COMPANY_ADMIN'; fullName = 'Tata Admin'; }
        else if (idNum < 10) { role = 'OPS_MANAGER'; fullName = 'Tata Manager ' + idNum; }
        else if (idNum < 30) { role = 'FIELD_OFFICER'; fullName = 'Tata Supervisor ' + idNum; }
        
        return {
            userId: 'mock-tata-' + idNum,
            employeeId: cleanInput.toUpperCase(),
            fullName: fullName,
            email: cleanInput.toLowerCase() + '@tatamotors.com',
            role: role,
            companyId: 'TATA',
            branchId: 'MAIN_BRANCH',
            token: 'mock-token',
            tokenExpiresAt: Date.now() + 86400000,
            isBiometricEnabled: true,
            lastActiveAt: Date.now(),
            loginMode: 'PIN',
            accountStatus: 'ACTIVE',
            emailVerified: true
        };
      }

      const empColRef = collection(db, 'companies', companyId, 'employees');
`;

file = file.replace(
  "// 2. PIN / Employee ID Mode - Query Firestore employees collection\n    try {\n      const empColRef = collection(db, 'companies', companyId, 'employees');",
  mockAuthFallback
);

fs.writeFileSync('src/services/firebaseAuthService.ts', file);
console.log("Patched FirebaseAuthService for mock TATA users.");
